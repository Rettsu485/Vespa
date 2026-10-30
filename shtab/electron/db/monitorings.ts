// Репозитории: справочник типов задач и мониторинги (с вычислением красных флагов и статуса дублёра).
import type { Db } from './database';
import type { Monitoring, MonitoringView, TaskType } from '../../shared/types';
import type { MonitoringInput, MonitoringListOpts } from '../../shared/ipc';
import { todayIso } from './dateUtils';

interface TaskTypeRow {
  id: number;
  name: string;
  sort_order: number;
  active: number;
}

interface MonitoringRow {
  id: number;
  name: string;
  type_id: number;
  employee_id: number;
  deadline: string | null;
  note: string;
  status: Monitoring['status'];
  deputy_employee_id: number | null;
  deputy_from: string | null;
  deputy_to: string | null;
  created_at: string;
  updated_at: string;
  type_name: string;
  employee_name: string;
  deputy_name: string | null;
  employee_absent_today: number;
}

function nowStamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export class TaskTypeRepo {
  constructor(private db: Db) {}

  list(): TaskType[] {
    const rows = this.db.prepare('SELECT * FROM task_types ORDER BY sort_order ASC, id ASC').all() as TaskTypeRow[];
    return rows.map((r) => ({ id: r.id, name: r.name, sort_order: r.sort_order, active: r.active === 1 }));
  }

  create(name: string): TaskType {
    const max = this.db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM task_types').get() as {
      next: number;
    };
    const info = this.db.prepare('INSERT INTO task_types (name, sort_order, active) VALUES (?, ?, 1)').run(name, max.next);
    return { id: Number(info.lastInsertRowid), name, sort_order: max.next, active: true };
  }

  update(id: number, input: Partial<Pick<TaskType, 'name' | 'active'>>): TaskType {
    const row = this.db.prepare('SELECT * FROM task_types WHERE id=?').get(id) as TaskTypeRow | undefined;
    if (!row) throw new Error(`Тип задачи ${id} не найден`);
    const merged = { ...row, ...input };
    this.db
      .prepare('UPDATE task_types SET name=?, active=? WHERE id=?')
      .run(merged.name, merged.active ? 1 : 0, id);
    return { id, name: merged.name, sort_order: merged.sort_order, active: Boolean(merged.active) };
  }

  /** Удаление блокируется, если тип используется в мониторингах. */
  remove(id: number): void {
    const used = this.db.prepare('SELECT COUNT(*) AS c FROM monitorings WHERE type_id=?').get(id) as { c: number };
    if (used.c > 0) {
      throw new Error('Тип используется в мониторингах — удаление заблокировано');
    }
    this.db.prepare('DELETE FROM task_types WHERE id=?').run(id);
  }

  reorder(orderedIds: number[]): void {
    const stmt = this.db.prepare('UPDATE task_types SET sort_order=? WHERE id=?');
    this.db.transaction(() => {
      orderedIds.forEach((id, idx) => stmt.run(idx + 1, id));
    })();
  }
}

export class MonitoringRepo {
  constructor(private db: Db) {}

  private baseSql(): string {
    // employee_absent_today: есть ли у исполнителя отсутствие, покрывающее сегодня.
    return `
      SELECT m.*, t.name AS type_name, e.full_name AS employee_name, dep.full_name AS deputy_name,
        (SELECT COUNT(*) FROM absences a
          WHERE a.employee_id = m.employee_id AND a.date_from <= @today AND a.date_to >= @today) AS employee_absent_today
      FROM monitorings m
      JOIN task_types t ON t.id = m.type_id
      JOIN employees e ON e.id = m.employee_id
      LEFT JOIN employees dep ON dep.id = m.deputy_employee_id
    `;
  }

  list(opts: MonitoringListOpts): MonitoringView[] {
    const today = todayIso();
    const params: Record<string, unknown> = { today };
    const conds: string[] = [];
    if (!opts.includeArchived) conds.push("m.status != 'архив'");
    if (opts.typeId) {
      conds.push('m.type_id = @typeId');
      params.typeId = opts.typeId;
    }
    if (opts.employeeId) {
      conds.push('m.employee_id = @employeeId');
      params.employeeId = opts.employeeId;
    }
    if (opts.status) {
      conds.push('m.status = @status');
      params.status = opts.status;
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const sql = `${this.baseSql()} ${where} ORDER BY m.deadline IS NULL, m.deadline ASC, m.name COLLATE NOCASE`;
    const rows = this.db.prepare(sql).all(params) as MonitoringRow[];
    return rows.map((r) => this.toView(r, today));
  }

  get(id: number): MonitoringView | null {
    const today = todayIso();
    const row = this.db.prepare(`${this.baseSql()} WHERE m.id = @id`).get({ today, id }) as MonitoringRow | undefined;
    return row ? this.toView(row, today) : null;
  }

  /** Для карточки сотрудника: все мониторинги, где он исполнитель или дублёр. */
  byEmployee(employeeId: number): MonitoringView[] {
    const today = todayIso();
    const rows = this.db
      .prepare(`${this.baseSql()} WHERE (m.employee_id = @emp OR m.deputy_employee_id = @emp) AND m.status != 'архив'`)
      .all({ today, emp: employeeId }) as MonitoringRow[];
    return rows.map((r) => this.toView(r, today));
  }

  private toView(r: MonitoringRow, today: string): MonitoringView {
    const deputyActive =
      r.deputy_employee_id !== null &&
      (r.deputy_from === null || r.deputy_from <= today) &&
      (r.deputy_to === null || r.deputy_to >= today);
    const redFlag = r.employee_absent_today > 0 && r.deputy_employee_id === null && r.status !== 'архив' && r.status !== 'выполнено';
    return {
      id: r.id,
      name: r.name,
      type_id: r.type_id,
      employee_id: r.employee_id,
      deadline: r.deadline,
      note: r.note,
      status: r.status,
      deputy_employee_id: r.deputy_employee_id,
      deputy_from: r.deputy_from,
      deputy_to: r.deputy_to,
      created_at: r.created_at,
      updated_at: r.updated_at,
      type_name: r.type_name,
      employee_name: r.employee_name,
      deputy_name: r.deputy_name,
      red_flag: redFlag,
      deputy_active: deputyActive,
    };
  }

  create(input: MonitoringInput): Monitoring {
    const stamp = nowStamp();
    const info = this.db
      .prepare(
        `INSERT INTO monitorings (name, type_id, employee_id, deadline, note, status,
          deputy_employee_id, deputy_from, deputy_to, created_at, updated_at)
         VALUES (@name, @type_id, @employee_id, @deadline, @note, @status,
          @deputy_employee_id, @deputy_from, @deputy_to, @created_at, @updated_at)`,
      )
      .run({ ...input, created_at: stamp, updated_at: stamp });
    return this.byId(Number(info.lastInsertRowid));
  }

  update(id: number, input: Partial<MonitoringInput>): Monitoring {
    const current = this.byId(id);
    const merged: MonitoringInput = { ...toInput(current), ...input };
    this.db
      .prepare(
        `UPDATE monitorings SET name=@name, type_id=@type_id, employee_id=@employee_id, deadline=@deadline,
          note=@note, status=@status, deputy_employee_id=@deputy_employee_id, deputy_from=@deputy_from,
          deputy_to=@deputy_to, updated_at=@updated_at WHERE id=@id`,
      )
      .run({ ...merged, id, updated_at: nowStamp() });
    return this.byId(id);
  }

  archive(id: number): void {
    this.db.prepare("UPDATE monitorings SET status='архив', updated_at=? WHERE id=?").run(nowStamp(), id);
  }

  private byId(id: number): Monitoring {
    const row = this.db
      .prepare(
        `SELECT id, name, type_id, employee_id, deadline, note, status, deputy_employee_id, deputy_from, deputy_to,
         created_at, updated_at FROM monitorings WHERE id=?`,
      )
      .get(id) as Monitoring | undefined;
    if (!row) throw new Error(`Мониторинг ${id} не найден`);
    return row;
  }
}

function toInput(m: Monitoring): MonitoringInput {
  return {
    name: m.name,
    type_id: m.type_id,
    employee_id: m.employee_id,
    deadline: m.deadline,
    note: m.note,
    status: m.status,
    deputy_employee_id: m.deputy_employee_id,
    deputy_from: m.deputy_from,
    deputy_to: m.deputy_to,
  };
}
