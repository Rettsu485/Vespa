// Репозиторий мониторингов и справочника типов задач.

import { typed, type TypedDb } from '../db/database';
import { nowSqlTimestamp, todayIso } from '../db/dates';
import type { Monitoring, MonitoringView, TaskType } from '../../shared/types';

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
}

export class MonitoringRepository {
  constructor(private db: TypedDb) {}

  // ── Справочник типов задач ───────────────────────────────

  listTaskTypes(opts?: { includeInactive?: boolean }): TaskType[] {
    const where = opts?.includeInactive ? '' : 'WHERE active = 1';
    const rows = this.db.prepare(`SELECT * FROM task_types ${where} ORDER BY sort_order, name`).all() as TaskTypeRow[];
    return rows.map((r) => ({ id: r.id, name: r.name, sort_order: r.sort_order, active: r.active === 1 }));
  }

  createTaskType(input: Omit<TaskType, 'id'>): TaskType {
    const res = this.db.prepare('INSERT INTO task_types (name, sort_order, active) VALUES (?, ?, ?)').run(input.name, input.sort_order, input.active ? 1 : 0);
    return this.getTaskType(Number(res.lastInsertRowid));
  }

  updateTaskType(id: number, input: Omit<TaskType, 'id'>): TaskType {
    this.db.prepare('UPDATE task_types SET name = ?, sort_order = ?, active = ? WHERE id = ?').run(input.name, input.sort_order, input.active ? 1 : 0, id);
    return this.getTaskType(id);
  }

  deleteTaskType(id: number): void {
    const used = this.db.prepare('SELECT COUNT(*) AS c FROM monitorings WHERE type_id = ?').get(id)!.c;
    if (used > 0) throw new Error('Тип используется в мониторингах — удаление заблокировано');
    this.db.prepare('DELETE FROM task_types WHERE id = ?').run(id);
  }

  reorderTaskTypes(orderedIds: number[]): void {
    const stmt = this.db.prepare('UPDATE task_types SET sort_order = ? WHERE id = ?');
    this.db.transaction(() => {
      orderedIds.forEach((id, idx) => stmt.run(idx + 1, id));
    })();
  }

  private getTaskType(id: number): TaskType {
    const r = this.db.prepare('SELECT * FROM task_types WHERE id = ?').get(id);
    if (!r) throw new Error('Тип задачи не найден');
    return { id: r.id, name: r.name, sort_order: r.sort_order, active: r.active === 1 };
  }

  // ── Мониторинги ──────────────────────────────────────────

  listMonitorings(opts: { typeId?: number | null; employeeId?: number | null; status?: string | null; includeArchived?: boolean }): MonitoringView[] {
    const conds: string[] = [];
    const params: (number | string)[] = [];
    if (!opts.includeArchived) conds.push("m.status != 'архив'");
    if (opts.typeId) {
      conds.push('m.type_id = ?');
      params.push(opts.typeId);
    }
    if (opts.employeeId) {
      conds.push('(m.employee_id = ? OR m.deputy_employee_id = ?)');
      params.push(opts.employeeId, opts.employeeId);
    }
    if (opts.status) {
      conds.push('m.status = ?');
      params.push(opts.status);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = this.db
      .prepare(
        `SELECT m.* FROM monitorings m ${where} ORDER BY m.deadline IS NULL, m.deadline, m.name`
      )
      .all(...params) as MonitoringRow[];

    const absentIds = this.currentlyAbsentEmployeeIds();
    return rows.map((m) => this.toView(m, absentIds));
  }

  getMonitoring(id: number): MonitoringView | null {
    const row = this.db.prepare('SELECT * FROM monitorings WHERE id = ?').get(id);
    if (!row) return null;
    return this.toView(row, this.currentlyAbsentEmployeeIds());
  }

  createMonitoring(input: Omit<Monitoring, 'id' | 'created_at' | 'updated_at'>): MonitoringView {
    const ts = nowSqlTimestamp();
    const res = this.db
      .prepare(
        `INSERT INTO monitorings (name, type_id, employee_id, deadline, note, status, deputy_employee_id, deputy_from, deputy_to, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(input.name, input.type_id, input.employee_id, input.deadline, input.note, input.status, input.deputy_employee_id, input.deputy_from, input.deputy_to, ts, ts);
    return this.requireMonitoring(Number(res.lastInsertRowid));
  }

  updateMonitoring(id: number, input: Omit<Monitoring, 'id' | 'created_at' | 'updated_at'>): MonitoringView {
    this.db
      .prepare(
        `UPDATE monitorings SET name=?, type_id=?, employee_id=?, deadline=?, note=?, status=?, deputy_employee_id=?, deputy_from=?, deputy_to=?, updated_at=? WHERE id=?`
      )
      .run(input.name, input.type_id, input.employee_id, input.deadline, input.note, input.status, input.deputy_employee_id, input.deputy_from, input.deputy_to, nowSqlTimestamp(), id);
    return this.requireMonitoring(id);
  }

  archiveMonitoring(id: number): MonitoringView {
    this.db.prepare(`UPDATE monitorings SET status = 'архив', updated_at = ? WHERE id = ?`).run(nowSqlTimestamp(), id);
    return this.requireMonitoring(id);
  }

  /** ids сотрудников, отсутствующих сегодня (не уволенных, не архивных). */
  currentlyAbsentEmployeeIds(): Set<number> {
    const today = todayIso();
    const rows = this.db
      .prepare(
        `SELECT DISTINCT a.employee_id FROM absences a JOIN employees e ON e.id = a.employee_id
         WHERE a.date_from <= ? AND a.date_to >= ? AND e.is_fired = 0 AND e.archived = 0`
      )
      .all(today, today);
    return new Set(rows.map((r) => r.employee_id));
  }

  private requireMonitoring(id: number): MonitoringView {
    const v = this.getMonitoring(id);
    if (!v) throw new Error('Мониторинг не найден');
    return v;
  }

  private toView(m: MonitoringRow, absentIds: Set<number>): MonitoringView {
    const type = this.db.prepare('SELECT name FROM task_types WHERE id = ?').get(m.type_id);
    const emp = this.db.prepare('SELECT full_name FROM employees WHERE id = ?').get(m.employee_id);
    const deputy = m.deputy_employee_id
      ? this.db.prepare('SELECT full_name FROM employees WHERE id = ?').get(m.deputy_employee_id)
      : null;
    const today = todayIso();
    const deputyActive =
      m.deputy_employee_id != null &&
      (m.deputy_from == null || m.deputy_from <= today) &&
      (m.deputy_to == null || m.deputy_to >= today);
    const hasDeputy = m.deputy_employee_id != null;
    return {
      id: m.id,
      name: m.name,
      type_id: m.type_id,
      employee_id: m.employee_id,
      deadline: m.deadline,
      note: m.note,
      status: m.status,
      deputy_employee_id: m.deputy_employee_id,
      deputy_from: m.deputy_from,
      deputy_to: m.deputy_to,
      created_at: m.created_at,
      updated_at: m.updated_at,
      type_name: type?.name ?? '',
      employee_name: emp?.full_name ?? '',
      deputy_name: deputy?.full_name ?? null,
      red_flag: absentIds.has(m.employee_id) && !hasDeputy && m.status !== 'выполнено' && m.status !== 'архив',
      deputy_active: deputyActive,
    };
  }
}
