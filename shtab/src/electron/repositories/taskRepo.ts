// Репозиторий личных задач с чек-листами. Автопробуждение из «ожидания» — при каждом списке/получении.

import type { TypedDb } from '../db/database';

interface CheckItemRow {
  id: number;
  task_id: number;
  title: string;
  done: number;
  sort_order: number;
}
import { daysBetween, nowSqlTimestamp, todayIso } from '../db/dates';
import type { Task, TaskCheckItem, TaskView } from '../../shared/types';

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
}

export class TaskRepository {
  constructor(private db: TypedDb) {}

  /**
  * Задачи в «ожидании», у которых дата возврата наступила, автоматически переходят в «в работе».
  * Возвращает id разбуженных задач (для подсветки на дашборде). Разбужденные задачи помечаются
  * записью в work_log с префиксом «Автопробуждение» — по ней определяется «вернулась сегодня».
  */
  wakeUpExpired(): number[] {
    const dueToday = this.findWaitingDueToday();
    if (dueToday.length === 0) return [];
    this.db
      .prepare(`UPDATE tasks SET status = 'в работе', wait_until = NULL, updated_at = ? WHERE status = 'ожидание' AND wait_until IS NOT NULL AND wait_until <= ?`)
      .run(nowSqlTimestamp(), todayIso());
    this.markWoken(dueToday);
    return dueToday;
  }

  list(opts: { includeArchived?: boolean; status?: string | null }): TaskView[] {
    const wokenIds = new Set(this.wakeUpExpired());
    const conds: string[] = [];
    const params: (number | string)[] = [];
    if (!opts.includeArchived) {
      conds.push("archived = 0 AND status NOT IN ('выполнено','отменено')");
    }
    if (opts.status) {
      conds.push('status = ?');
      params.push(opts.status);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = this.db.prepare(`SELECT * FROM tasks ${where} ORDER BY updated_at DESC, id DESC`).all(...params) as TaskRow[];
    return rows.map((r) => ({ ...this.toView(r), returned_today: wokenIds.has(r.id) }));
  }

  get(id: number): TaskView | null {
    const wokenIds = new Set(this.wakeUpExpired());
    const row = this.db.prepare<TaskRow>('SELECT * FROM tasks WHERE id = ?').get(id);
    return row ? { ...this.toView(row), returned_today: wokenIds.has(row.id) } : null;
  }

  create(input: Omit<Task, 'id' | 'created_at' | 'updated_at'>): TaskView {
    const ts = nowSqlTimestamp();
    const res = this.db
      .prepare(
        `INSERT INTO tasks (theme, title, priority, deadline, status, wait_until, next_action, participants, note, archived, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(input.theme, input.title, input.priority, input.deadline, input.status, input.wait_until, input.next_action, input.participants, input.note, input.archived ? 1 : 0, ts, ts);
    return this.require(Number(res.lastInsertRowid));
  }

  update(id: number, input: Omit<Task, 'id' | 'created_at' | 'updated_at'>): TaskView {
    // При переводе в «ожидание» без даты — не разрешаем; но простое решение: сохраняем как есть.
    this.db
      .prepare(
        `UPDATE tasks SET theme=?, title=?, priority=?, deadline=?, status=?, wait_until=?, next_action=?, participants=?, note=?, archived=?, updated_at=? WHERE id=?`
      )
      .run(input.theme, input.title, input.priority, input.deadline, input.status, input.wait_until, input.next_action, input.participants, input.note, input.archived ? 1 : 0, nowSqlTimestamp(), id);
    return this.require(id);
  }

  setStatus(id: number, status: Task['status']): TaskView {
    this.db
      .prepare('UPDATE tasks SET status = ?, updated_at = ?, wait_until = NULL WHERE id = ?')
      .run(status, nowSqlTimestamp(), id);
    return this.require(id);
  }

  archive(id: number): TaskView {
    this.db.prepare(`UPDATE tasks SET archived = 1, status = 'отменено', updated_at = ? WHERE id = ?`).run(nowSqlTimestamp(), id);
    return this.require(id);
  }

  // ── Чек-лист ─────────────────────────────────────────────

  listItems(taskId: number): TaskCheckItem[] {
    const rows = this.db
      .prepare<CheckItemRow>(
        'SELECT id, task_id, title, done, sort_order FROM task_check_items WHERE task_id = ? ORDER BY sort_order, id'
      )
      .all(taskId);
    return rows.map((r) => ({ id: r.id, task_id: r.task_id, title: r.title, done: r.done === 1, sort_order: r.sort_order }));
  }

  createItem(input: Omit<TaskCheckItem, 'id'>): TaskCheckItem {
    const res = this.db.prepare('INSERT INTO task_check_items (task_id, title, done, sort_order) VALUES (?, ?, ?, ?)').run(input.task_id, input.title, input.done ? 1 : 0, input.sort_order);
    this.touchTask(input.task_id);
    return this.getItem(Number(res.lastInsertRowid));
  }

  updateItem(id: number, patch: Partial<Omit<TaskCheckItem, 'id'>>): TaskCheckItem {
    const cur = this.getItemOrNull(id);
    if (!cur) throw new Error('Пункт не найден');
    const next = { ...cur, ...patch };
    this.db.prepare('UPDATE task_check_items SET title = ?, done = ?, sort_order = ? WHERE id = ?').run(next.title, next.done ? 1 : 0, next.sort_order, id);
    this.touchTask(cur.task_id);
    return this.getItem(id);
  }

  deleteItem(id: number): void {
    const cur = this.getItemOrNull(id);
    if (!cur) return;
    this.db.prepare('DELETE FROM task_check_items WHERE id = ?').run(id);
    this.touchTask(cur.task_id);
  }

  private getItem(id: number): TaskCheckItem {
    const r = this.getItemOrNull(id);
    if (!r) throw new Error('Пункт не найден');
    return r;
  }

  private getItemOrNull(id: number): TaskCheckItem | null {
    const r = this.db
      .prepare<CheckItemRow>('SELECT * FROM task_check_items WHERE id = ?')
      .get(id);
    if (!r) return null;
    return { id: r.id, task_id: r.task_id, title: r.title, done: r.done === 1, sort_order: r.sort_order };
  }

  private touchTask(taskId: number): void {
    this.db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(nowSqlTimestamp(), taskId);
  }

  private require(id: number): TaskView {
    const v = this.get(id);
    if (!v) throw new Error('Задача не найдена');
    return v;
  }

  private toView(r: TaskRow): TaskView {
    const today = todayIso();
    const items = this.db
      .prepare<{ total: number; done: number }>('SELECT COUNT(*) AS total, COALESCE(SUM(done),0) AS done FROM task_check_items WHERE task_id = ?')
      .get(r.id)!;
    const lastLog = this.db
      .prepare<{ d: string | null }>('SELECT MAX(log_date) AS d FROM work_log WHERE entity_type = ? AND entity_id = ?')
      .get('task', r.id);
    const lastActivity = [r.updated_at.slice(0, 10), lastLog?.d ?? null].filter(Boolean).sort().reverse()[0] ?? r.created_at.slice(0, 10);
    const daysSinceUpdate = daysBetween(today, lastActivity);
    const isActive = !r.archived && r.status !== 'выполнено' && r.status !== 'отменено';
    const daysLeft = r.deadline ? daysBetween(r.deadline, today) : null;
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
      items_total: items.total,
      items_done: items.done,
      progress: items.total > 0 ? items.done / items.total : 0,
      days_left: daysLeft,
      days_since_update: daysSinceUpdate,
      stale: isActive && daysSinceUpdate >= 9,
      returned_today: false, // вычисляется на уровне сервиса до автопробуждения (см. dashboardService)
    };
  }

  /** ids задач, которые сегодня вернулись из ожидания (по служебной записи автопробуждения). */
  returnedFromWaitToday(): number[] {
    const today = todayIso();
    const rows = this.db
      .prepare<{ id: number }>(
        `SELECT DISTINCT entity_id AS id FROM work_log WHERE entity_type = 'task' AND log_date = ? AND text LIKE 'Автопробуждение%'`
      )
      .all(today);
    return rows.map((r) => r.id);
  }

  /** Помечает задачи, разбуженные сегодня, служебной записью в work_log (для дашборда). */
  markWoken(ids: number[]): void {
    const today = todayIso();
    const stmt = this.db.prepare('INSERT INTO work_log (entity_type, entity_id, log_date, text, created_at) VALUES (?, ?, ?, ?, ?)');
    for (const id of ids) stmt.run('task', id, today, 'Автопробуждение: срок ожидания истёк, задача переведена в работу', nowSqlTimestamp());
  }

  findWaitingDueToday(): number[] {
    const today = todayIso();
    const rows = this.db
      .prepare<{ id: number }>(`SELECT id FROM tasks WHERE status = 'ожидание' AND wait_until IS NOT NULL AND wait_until <= ?`)
      .all(today);
    return rows.map((r) => r.id);
  }
}
