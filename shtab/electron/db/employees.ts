// Репозиторий сотрудников + отсутствий. Статус сотрудника вычисляется здесь и не хранится в БД.
import type { Db } from './database';
import type {
  Absence,
  AbsenceType,
  AbsenceView,
  Department,
  DepartmentWithCount,
  Employee,
  EmployeeComputedStatus,
  EmployeeView,
} from '../../shared/types';
import type { EmployeeInput } from '../../shared/ipc';
import { daysToBirthday, todayIso } from './dateUtils';

interface EmployeeRow {
  id: number;
  full_name: string;
  department_id: number | null;
  position: string;
  internal_phone: string;
  mobile_phone: string;
  email: string;
  birthday: string | null;
  functions: string;
  is_fired: number;
  fired_date: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
  department_name: string | null;
}

interface AbsenceRow {
  id: number;
  employee_id: number;
  absence_type: AbsenceType;
  date_from: string;
  date_to: string;
  note: string;
  employee_name?: string;
}

function nowStamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    full_name: row.full_name,
    department_id: row.department_id,
    position: row.position,
    internal_phone: row.internal_phone,
    mobile_phone: row.mobile_phone,
    email: row.email,
    birthday: row.birthday,
    functions: row.functions,
    is_fired: row.is_fired === 1,
    fired_date: row.fired_date,
    archived: row.archived === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class EmployeeRepo {
  constructor(private db: Db) {}

  /** Статус: уволен → отсутствует сегодня (по absences) → на работе. */
  computeStatus(emp: Employee, absences: AbsenceRow[], today: string): EmployeeComputedStatus {
    if (emp.is_fired) return { kind: 'fired' };
    const active = absences.find(
      (a) => a.employee_id === emp.id && a.date_from <= today && a.date_to >= today,
    );
    if (active) {
      return { kind: 'absent', absence_type: active.absence_type, date_from: active.date_from, date_to: active.date_to };
    }
    return { kind: 'at_work' };
  }

  private allAbsences(): AbsenceRow[] {
    return this.db.prepare('SELECT * FROM absences').all() as AbsenceRow[];
  }

  list(includeArchived: boolean): EmployeeView[] {
    const today = todayIso();
    const absences = this.allAbsences();
    const rows = this.db
      .prepare(
        `SELECT e.*, d.name AS department_name FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         ${includeArchived ? '' : 'WHERE e.archived = 0'}
         ORDER BY e.archived ASC, e.full_name COLLATE NOCASE`,
      )
      .all() as EmployeeRow[];
    return rows.map((row) => {
      const emp = mapEmployee(row);
      const upcoming = absences
        .filter((a) => a.employee_id === emp.id && a.absence_type === 'отпуск' && a.date_from > today)
        .sort((a, b) => a.date_from.localeCompare(b.date_from))[0];
      return {
        ...emp,
        department_name: row.department_name,
        status: this.computeStatus(emp, absences, today),
        days_to_birthday: daysToBirthday(emp.birthday, today),
        next_vacation: upcoming
          ? { date_from: upcoming.date_from, date_to: upcoming.date_to, note: upcoming.note }
          : null,
      };
    });
  }

  get(id: number): EmployeeView | null {
    return this.list(true).find((e) => e.id === id) ?? null;
  }

  create(input: EmployeeInput): Employee {
    const stamp = nowStamp();
    const info = this.db
      .prepare(
        `INSERT INTO employees (full_name, department_id, position, internal_phone, mobile_phone, email,
          birthday, functions, is_fired, fired_date, archived, created_at, updated_at)
         VALUES (@full_name, @department_id, @position, @internal_phone, @mobile_phone, @email,
          @birthday, @functions, @is_fired, @fired_date, 0, @created_at, @updated_at)`,
      )
      .run({
        full_name: input.full_name,
        department_id: input.department_id,
        position: input.position,
        internal_phone: input.internal_phone,
        mobile_phone: input.mobile_phone,
        email: input.email,
        birthday: input.birthday,
        functions: input.functions,
        is_fired: input.is_fired ? 1 : 0,
        fired_date: input.fired_date,
        created_at: stamp,
        updated_at: stamp,
      });
    return this.byId(Number(info.lastInsertRowid));
  }

  update(id: number, input: Partial<EmployeeInput>): Employee {
    const current = this.byId(id);
    const merged: EmployeeInput = { ...toInput(current), ...input };
    this.db
      .prepare(
        `UPDATE employees SET full_name=@full_name, department_id=@department_id, position=@position,
          internal_phone=@internal_phone, mobile_phone=@mobile_phone, email=@email, birthday=@birthday,
          functions=@functions, is_fired=@is_fired, fired_date=@fired_date, updated_at=@updated_at
         WHERE id=@id`,
      )
      .run({
        id,
        full_name: merged.full_name,
        department_id: merged.department_id,
        position: merged.position,
        internal_phone: merged.internal_phone,
        mobile_phone: merged.mobile_phone,
        email: merged.email,
        birthday: merged.birthday,
        functions: merged.functions,
        is_fired: merged.is_fired ? 1 : 0,
        fired_date: merged.fired_date,
        updated_at: nowStamp(),
      });
    return this.byId(id);
  }

  setArchived(id: number, archived: boolean): void {
    this.db.prepare('UPDATE employees SET archived=@a, updated_at=@t WHERE id=@id').run({
      id,
      a: archived ? 1 : 0,
      t: nowStamp(),
    });
  }

  byId(id: number): Employee {
    const row = this.db
      .prepare('SELECT *, NULL AS department_name FROM employees WHERE id=?')
      .get(id) as EmployeeRow | undefined;
    if (!row) throw new Error(`Сотрудник ${id} не найден`);
    return mapEmployee(row);
  }

  // ---- Отсутствия ----
  listAbsences(opts: { employeeId?: number; fromDate?: string; toDate?: string }): AbsenceView[] {
    const conds: string[] = [];
    const params: Record<string, unknown> = {};
    if (opts.employeeId !== undefined) {
      conds.push('a.employee_id = @employeeId');
      params.employeeId = opts.employeeId;
    }
    if (opts.fromDate !== undefined && opts.toDate !== undefined) {
      conds.push('(a.date_to >= @fromDate AND a.date_from <= @toDate)');
      params.fromDate = opts.fromDate;
      params.toDate = opts.toDate;
    } else if (opts.fromDate !== undefined) {
      conds.push('a.date_to >= @fromDate');
      params.fromDate = opts.fromDate;
    } else if (opts.toDate !== undefined) {
      conds.push('a.date_from <= @toDate');
      params.toDate = opts.toDate;
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    // Фикс бага привязки better-sqlite3: пустой {} параметров искажает запрос без плейсхолдеров.
    const stmt = this.db.prepare(
      `SELECT a.*, e.full_name AS employee_name FROM absences a
       JOIN employees e ON e.id = a.employee_id ${where}
       ORDER BY a.date_from ASC`,
    );
    const rows = (Object.keys(params).length === 0 ? stmt.all() : stmt.all(params)) as AbsenceRow[];
    return rows.map((r) => ({
      id: r.id,
      employee_id: r.employee_id,
      absence_type: r.absence_type,
      date_from: r.date_from,
      date_to: r.date_to,
      note: r.note,
      employee_name: r.employee_name ?? '',
    }));
  }

  createAbsence(input: Omit<Absence, 'id'>): Absence {
    const info = this.db
      .prepare(
        `INSERT INTO absences (employee_id, absence_type, date_from, date_to, note)
         VALUES (@employee_id, @absence_type, @date_from, @date_to, @note)`,
      )
      .run(input);
    return { id: Number(info.lastInsertRowid), ...input };
  }

  updateAbsence(id: number, input: Partial<Omit<Absence, 'id'>>): Absence {
    const current = this.db.prepare('SELECT * FROM absences WHERE id=?').get(id) as AbsenceRow | undefined;
    if (!current) throw new Error(`Отсутствие ${id} не найдено`);
    const merged: Omit<Absence, 'id'> = {
      employee_id: current.employee_id,
      absence_type: current.absence_type,
      date_from: current.date_from,
      date_to: current.date_to,
      note: current.note,
      ...input,
    };
    this.db
      .prepare(
        `UPDATE absences SET employee_id=@employee_id, absence_type=@absence_type, date_from=@date_from,
         date_to=@date_to, note=@note WHERE id=@id`,
      )
      .run({ ...merged, id });
    return { id, ...merged };
  }

  deleteAbsence(id: number): void {
    this.db.prepare('DELETE FROM absences WHERE id=?').run(id);
  }

  // ---- Отделы ----
  listDepartments(): DepartmentWithCount[] {
    const rows = this.db
      .prepare(
        `SELECT d.*, (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.archived = 0) AS employee_count
         FROM departments d ORDER BY d.sort_order ASC, d.name COLLATE NOCASE`,
      )
      .all() as (Department & { employee_count: number })[];
    return rows;
  }

  createDepartment(input: { name: string; parent_id: number | null; sort_order: number }): Department {
    const info = this.db
      .prepare('INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)')
      .run(input.name, input.parent_id, input.sort_order);
    return { id: Number(info.lastInsertRowid), ...input };
  }

  updateDepartment(id: number, input: Partial<Pick<Department, 'name' | 'parent_id' | 'sort_order'>>): Department {
    const row = this.db.prepare('SELECT * FROM departments WHERE id=?').get(id) as Department | undefined;
    if (!row) throw new Error(`Отдел ${id} не найден`);
    const merged = { ...row, ...input };
    this.db
      .prepare('UPDATE departments SET name=?, parent_id=?, sort_order=? WHERE id=?')
      .run(merged.name, merged.parent_id, merged.sort_order, id);
    return merged;
  }

  deleteDepartment(id: number): void {
    this.db.prepare('DELETE FROM departments WHERE id=?').run(id);
  }
}

function toInput(e: Employee): EmployeeInput {
  return {
    full_name: e.full_name,
    department_id: e.department_id,
    position: e.position,
    internal_phone: e.internal_phone,
    mobile_phone: e.mobile_phone,
    email: e.email,
    birthday: e.birthday,
    functions: e.functions,
    is_fired: e.is_fired,
    fired_date: e.fired_date,
  };
}
