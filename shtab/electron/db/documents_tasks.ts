// Репозитории: документы ЭДО, единый журнал work_log, задачи и чек-листы.
import type { Db } from './database';
import type {
  EdoDocument,
  EdoDocumentView,
  Task,
  TaskCheckItem,
  TaskView,
  WorkLogEntity,
  WorkLogEntry,
} from '../../shared/types';
import type { EdoInput, EdoListOpts, TaskInput, TaskListOpts } from '../../shared/ipc';
import { daysBetween, todayIso } from './dateUtils';

function nowStamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Тип «сырой» строки SQLite: булевы поля интерфейсов хранятся как 0/1 (INTEGER),
 * поэтому при чтении из БД они имеют тип number.
 */
type RawRow<T> = { [K in keyof T]: T[K] extends boolean ? number : T[K] };

// ---------------- ЭДО ----------------
interface EdoRow {
  id: number;
  doc_number: string;
  doc_url: string;
  summary: string;
  instruction: string;
  responsible_id: number | null;
  participants: string;
  control_type: 'red' | 'green';
  deadline: string | null;
  off_control: number;
  off_control_date: string | null;
  sub_resolution: string;
  approval_number: string;
  approval_url: string;
  approval_status: EdoDocument['approval_status'];
  archived: number;
  created_at: string;
  updated_at: string;
  responsible_name: string | null;
}

export class EdoRepo {
  constructor(private db: Db) {}

  list(opts: EdoListOpts): EdoDocumentView[] {
    const today = todayIso();
    const conds: string[] = [];
    const params: Record<string, unknown> = {};
    if (!opts.includeArchived) conds.push('ed.archived = 0');
    if (opts.controlType) {
      conds.push('ed.control_type = @controlType');
      params.controlType = opts.controlType;
    }
    if (opts.offControl === 'on') conds.push('ed.off_control = 0');
    if (opts.offControl === 'off') conds.push('ed.off_control = 1');
    if (opts.responsibleId) {
      conds.push('ed.responsible_id = @responsibleId');
      params.responsibleId = opts.responsibleId;
    }
    if (opts.approvalStatus) {
      conds.push('ed.approval_status = @approvalStatus');
      params.approvalStatus = opts.approvalStatus;
    }
    // «Горящие»: срок задан, не снят с контроля, просрочено или ≤3 дней.
    if (opts.burningOnly) {
      conds.push('ed.deadline IS NOT NULL AND ed.off_control = 0 AND julianday(ed.deadline) >= julianday(@todayMinusInf)');
      params.todayMinusInf = '1970-01-01';
      conds.push("julianday(ed.deadline) <= julianday(@todayPlus3)");
      params.todayPlus3 = addDays(today, 3);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    // Сортировка по умолчанию: срок по возрастанию; снятые с контроля — в конец.
    const rows = this.db
      .prepare(
        `SELECT ed.*, e.full_name AS responsible_name FROM edo_documents ed
         LEFT JOIN employees e ON e.id = ed.responsible_id
         ${where}
         ORDER BY ed.off_control ASC, ed.deadline IS NULL, ed.deadline ASC, ed.doc_number COLLATE NOCASE`,
      )
      .all(params) as EdoRow[];
    return rows.map((r) => this.toView(r, today));
  }

  get(id: number): EdoDocumentView | null {
    const today = todayIso();
    const row = this.db
      .prepare(
        `SELECT ed.*, e.full_name AS responsible_name FROM edo_documents ed
         LEFT JOIN employees e ON e.id = ed.responsible_id WHERE ed.id=?`,
      )
      .get(id) as EdoRow | undefined;
    return row ? this.toView(row, today) : null;
  }

  private toView(r: EdoRow, today: string): EdoDocumentView {
    const offControl = r.off_control === 1;
    const daysLeft = r.deadline && !offControl ? daysBetween(today, r.deadline) : null;
    return {
      id: r.id,
      doc_number: r.doc_number,
      doc_url: r.doc_url,
      summary: r.summary,
      instruction: r.instruction,
      responsible_id: r.responsible_id,
      participants: r.participants,
      control_type: r.control_type,
      deadline: r.deadline,
      off_control: offControl,
      off_control_date: r.off_control_date,
      sub_resolution: r.sub_resolution,
      approval_number: r.approval_number,
      approval_url: r.approval_url,
      approval_status: r.approval_status,
      archived: r.archived === 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
      responsible_name: r.responsible_name,
      days_left: daysLeft,
      link: null, // достраивается в IPC-слое через applyDocLink (шаблон из настроек)
    };
  }

  create(input: EdoInput): EdoDocument {
    const stamp = nowStamp();
    const info = this.db
      .prepare(
        `INSERT INTO edo_documents (doc_number, doc_url, summary, instruction, responsible_id, participants,
          control_type, deadline, off_control, off_control_date, sub_resolution, approval_number, approval_url,
          approval_status, archived, created_at, updated_at)
         VALUES (@doc_number, @doc_url, @summary, @instruction, @responsible_id, @participants,
          @control_type, @deadline, 0, NULL, @sub_resolution, @approval_number, @approval_url,
          @approval_status, 0, @created_at, @updated_at)`,
      )
      .run({ ...input, created_at: stamp, updated_at: stamp });
    return this.byId(Number(info.lastInsertRowid));
  }

  update(id: number, input: Partial<EdoInput>): EdoDocument {
    const current = this.byId(id);
    const merged: EdoInput = { ...toEdoInput(current), ...input };
    this.db
      .prepare(
        `UPDATE edo_documents SET doc_number=@doc_number, doc_url=@doc_url, summary=@summary,
          instruction=@instruction, responsible_id=@responsible_id, participants=@participants,
          control_type=@control_type, deadline=@deadline, sub_resolution=@sub_resolution,
          approval_number=@approval_number, approval_url=@approval_url, approval_status=@approval_status,
          updated_at=@updated_at WHERE id=@id`,
      )
      .run({ ...merged, id, updated_at: nowStamp() });
    return this.byId(id);
  }

  /** Снятие с контроля: off_control + дата автоматически. */
  setOffControl(id: number, off: boolean): void {
    this.db
      .prepare('UPDATE edo_documents SET off_control=?, off_control_date=?, updated_at=? WHERE id=?')
      .run(off ? 1 : 0, off ? todayIso() : null, nowStamp(), id);
  }

  archive(id: number): void {
    this.db.prepare('UPDATE edo_documents SET archived=1, updated_at=? WHERE id=?').run(nowStamp(), id);
  }

  private byId(id: number): EdoDocument {
    const row = this.db
      .prepare(
        `SELECT id, doc_number, doc_url, summary, instruction, responsible_id, participants, control_type,
         deadline, off_control, off_control_date, sub_resolution, approval_number, approval_url, approval_status,
         archived, created_at, updated_at FROM edo_documents WHERE id=?`,
      )
      .get(id) as RawRow<EdoDocument> | undefined;
    if (!row) throw new Error(`Документ ${id} не найден`);
    return {
      ...row,
      control_type: row.control_type,
      approval_status: row.approval_status,
      off_control: row.off_control === 1,
      archived: row.archived === 1,
    };
  }
}

/**
 * Достройка ссылки на документ: если в настройках задан шаблон с плейсхолдером {номер} —
 * ссылка строится из номера автоматически; иначе используется doc_url.
 * Вызывается на уровне IPC, куда передаётся актуальный шаблон из настроек.
 */
export function applyDocLink(view: EdoDocumentView, template: string): EdoDocumentView {
  const link = template.includes('{номер}')
    ? template.replace('{номер}', view.doc_number)
    : view.doc_url || null;
  return { ...view, link };
}

function toEdoInput(d: EdoDocument): EdoInput {
  return {
    doc_number: d.doc_number,
    doc_url: d.doc_url,
    summary: d.summary,
    instruction: d.instruction,
    responsible_id: d.responsible_id,
    participants: d.participants,
    control_type: d.control_type,
    deadline: d.deadline,
    sub_resolution: d.sub_resolution,
    approval_number: d.approval_number,
    approval_url: d.approval_url,
    approval_status: d.approval_status,
  };
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

// ---------------- Журнал проделанной работы ----------------
export class WorkLogRepo {
  constructor(private db: Db) {}

  list(entityType: WorkLogEntity, entityId: number): WorkLogEntry[] {
    return this.db
      .prepare(
        `SELECT * FROM work_log WHERE entity_type=? AND entity_id=? ORDER BY log_date DESC, id DESC`,
      )
      .all(entityType, entityId) as WorkLogEntry[];
  }

  create(input: Omit<WorkLogEntry, 'id' | 'created_at'>): WorkLogEntry {
    const stamp = nowStamp();
    const info = this.db
      .prepare(
        `INSERT INTO work_log (entity_type, entity_id, log_date, text, created_at)
         VALUES (@entity_type, @entity_id, @log_date, @text, @created_at)`,
      )
      .run({ ...input, created_at: stamp });
    return { id: Number(info.lastInsertRowid), ...input, created_at: stamp };
  }

  update(id: number, input: { log_date?: string; text?: string }): WorkLogEntry {
    const current = this.db.prepare('SELECT * FROM work_log WHERE id=?').get(id) as WorkLogEntry | undefined;
    if (!current) throw new Error(`Запись журнала ${id} не найдена`);
    const merged = { ...current, ...input };
    this.db.prepare('UPDATE work_log SET log_date=?, text=? WHERE id=?').run(merged.log_date, merged.text, id);
    return { ...merged };
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM work_log WHERE id=?').run(id);
  }

  lastActivity(entityType: WorkLogEntity, entityId: number): string | null {
    const row = this.db
      .prepare('SELECT MAX(log_date) AS last FROM work_log WHERE entity_type=? AND entity_id=?')
      .get(entityType, entityId) as { last: string | null };
    return row?.last ?? null;
  }
}

// ---------------- Задачи + чек-листы ----------------
interface TaskRow {
  id: number;
  theme: string;
  title: string;
  priority: Task['priority'];
  deadline: string | null;
  status: Task['status'];
  wait_until: string | null;
  next_action: string;
  participants: string;
  note: string;
  archived: number;
  created_at: string;
  updated_at: string;
  check_total: number;
  check_done: number;
  last_check_change: string | null;
}

export class TaskRepo {
  constructor(private db: Db) {}

  /** Автопробуждение: задачи «ожидание» с wait_until <= сегодня переводим в «в работе». */
  wakeUpExpired(): void {
    const today = todayIso();
    this.db
      .prepare(
        `UPDATE tasks SET status='в работе', wait_until=NULL, updated_at=?
         WHERE status='ожидание' AND wait_until IS NOT NULL AND wait_until <= ? AND archived=0`,
      )
      .run(nowStamp(), today);
  }

  list(opts: TaskListOpts): TaskView[] {
    this.wakeUpExpired();
    const today = todayIso();
    const conds: string[] = [];
    const params: Record<string, unknown> = {};
    if (!opts.includeArchived) {
      conds.push("archived = 0");
    }
    if (opts.status) {
      conds.push('status = @status');
      params.status = opts.status;
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = this.db
      .prepare(
        `SELECT t.*,
          (SELECT COUNT(*) FROM task_check_items c WHERE c.task_id=t.id) AS check_total,
          (SELECT COUNT(*) FROM task_check_items c WHERE c.task_id=t.id AND c.done=1) AS check_done,
          (SELECT MAX(created_at) FROM task_check_items c WHERE c.task_id=t.id) AS last_check_change
         FROM tasks t ${where}
         ORDER BY CASE t.priority WHEN 'срочно' THEN 0 WHEN 'высокий' THEN 1 WHEN 'обычный' THEN 2 ELSE 3 END,
                  t.deadline IS NULL, t.deadline ASC, t.updated_at DESC`,
      )
      .all(params) as TaskRow[];

    return rows.map((r) => {
      const daysLeft = r.deadline ? daysBetween(today, r.deadline) : null;
      const sleeping = r.status === 'ожидание' && r.wait_until !== null && r.wait_until > today;
      const lastLog = this.db
        .prepare("SELECT MAX(log_date) AS last FROM work_log WHERE entity_type='task' AND entity_id=?")
        .get(r.id) as { last: string | null };
      const activityCandidates = [r.updated_at.slice(0, 10), lastLog?.last ?? null, r.last_check_change?.slice(0, 10) ?? null].filter(
        (v): v is string => Boolean(v),
      );
      const lastActivity = activityCandidates.sort().at(-1) ?? r.created_at.slice(0, 10);
      const stale =
        !sleeping && r.status !== 'выполнено' && r.status !== 'отменено' && daysBetween(lastActivity, today) >= 9;
      return {
        id: r.id,
        theme: r.theme,
        title: r.title,
        priority: r.priority,
        deadline: r.deadline,
        status: r.status,
        wait_until: r.wait_until,
        next_action: r.next_action,
        participants: r.participants,
        note: r.note,
        archived: r.archived === 1,
        created_at: r.created_at,
        updated_at: r.updated_at,
        days_left: daysLeft,
        check_total: r.check_total,
        check_done: r.check_done,
        progress: r.check_total === 0 ? 0 : r.check_done / r.check_total,
        sleeping,
        stale,
      };
    });
  }

  get(id: number): TaskView | null {
    return this.list({ includeArchived: true }).find((t) => t.id === id) ?? null;
  }

  create(input: TaskInput): Task {
    const stamp = nowStamp();
    const info = this.db
      .prepare(
        `INSERT INTO tasks (theme, title, priority, deadline, status, wait_until, next_action, participants,
          note, archived, created_at, updated_at)
         VALUES (@theme, @title, @priority, @deadline, @status, @wait_until, @next_action, @participants,
          @note, 0, @created_at, @updated_at)`,
      )
      .run({ ...input, created_at: stamp, updated_at: stamp });
    return this.byId(Number(info.lastInsertRowid));
  }

  update(id: number, input: Partial<TaskInput>): Task {
    const current = this.byId(id);
    const merged: TaskInput = { ...toTaskInput(current), ...input };
    this.db
      .prepare(
        `UPDATE tasks SET theme=@theme, title=@title, priority=@priority, deadline=@deadline, status=@status,
          wait_until=@wait_until, next_action=@next_action, participants=@participants, note=@note, updated_at=@updated_at
         WHERE id=@id`,
      )
      .run({ ...merged, id, updated_at: nowStamp() });
    return this.byId(id);
  }

  archive(id: number): void {
    this.db
      .prepare("UPDATE tasks SET status='отменено', archived=1, updated_at=? WHERE id=?")
      .run(nowStamp(), id);
  }

  private byId(id: number): Task {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id) as RawRow<Task> | undefined;
    if (!row) throw new Error(`Задача ${id} не найдена`);
    return { ...row, archived: row.archived === 1 };
  }

  // ---- Чек-листы ----
  listCheckItems(taskId: number): TaskCheckItem[] {
    return this.db
      .prepare('SELECT * FROM task_check_items WHERE task_id=? ORDER BY sort_order ASC, id ASC')
      .all(taskId)
      .map((r) => {
        const row = r as RawRow<TaskCheckItem>;
        return { ...row, done: row.done === 1 };
      });
  }

  createCheckItem(taskId: number, title: string): TaskCheckItem {
    const max = this.db
      .prepare('SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM task_check_items WHERE task_id=?')
      .get(taskId) as { next: number };
    const info = this.db
      .prepare('INSERT INTO task_check_items (task_id, title, done, sort_order) VALUES (?, ?, 0, ?)')
      .run(taskId, title, max.next);
    return { id: Number(info.lastInsertRowid), task_id: taskId, title, done: false, sort_order: max.next };
  }

  updateCheckItem(id: number, input: Partial<Pick<TaskCheckItem, 'title' | 'done'>>): TaskCheckItem {
    const row = this.db.prepare('SELECT * FROM task_check_items WHERE id=?').get(id) as
      | RawRow<TaskCheckItem>
      | undefined;
    if (!row) throw new Error(`Пункт чек-листа ${id} не найден`);
    const merged = { ...row, ...input };
    this.db
      .prepare('UPDATE task_check_items SET title=?, done=? WHERE id=?')
      .run(merged.title, merged.done ? 1 : 0, id);
    return { ...merged, done: Boolean(merged.done) };
  }

  removeCheckItem(id: number): void {
    this.db.prepare('DELETE FROM task_check_items WHERE id=?').run(id);
  }
}

function toTaskInput(t: Task): TaskInput {
  return {
    theme: t.theme,
    title: t.title,
    priority: t.priority,
    deadline: t.deadline,
    status: t.status,
    wait_until: t.wait_until,
    next_action: t.next_action,
    participants: t.participants,
    note: t.note,
  };
}
