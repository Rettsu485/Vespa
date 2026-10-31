// Репозиторий сотрудников, отделов и отсутствий. Вычисление статусов — здесь.

import type { TypedDb } from '../db/database';
import { daysToBirthday, nowSqlTimestamp, todayIso } from '../db/dates';
import type {
  Absence,
  AbsenceType,
  Department,
  DepartmentNode,
  Employee,
  EmployeeStatusInfo,
  EmployeeView,
} from '../../shared/types';
import type { AbsenceTimelineItem } from '../../shared/ipc';

interface AbsenceRow {
  id: number;
  employee_id: number;
  absence_type: AbsenceType;
  date_from: string;
  date_to: string;
  note: string;
}

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

const ABSENCE_LABELS: Record<AbsenceType, { label: string; kind: EmployeeStatusInfo['kind'] }> = {
  отпуск: { label: 'В отпуске', kind: 'vacation' },
  командировка: { label: 'В командировке', kind: 'business_trip' },
  больничный: { label: 'На больничном', kind: 'sick' },
  иное: { label: 'Отсутствует', kind: 'other' },
};

export class TeamRepository {
  constructor(private db: TypedDb) {}

  // ── Отделы ────────────────────────────────────────────────

  listDepartments(): Department[] {
    return this.db
      .prepare<Department>(`SELECT id, name, parent_id, sort_order FROM departments ORDER BY sort_order, name`)
      .all();
  }

  departmentTree(): DepartmentNode[] {
    const flat = this.listDepartments();
    const byId = new Map<number, DepartmentNode>();
    for (const d of flat) byId.set(d.id, { ...d, children: [] });
    const roots: DepartmentNode[] = [];
    for (const node of byId.values()) {
      const parent = node.parent_id != null ? byId.get(node.parent_id) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  createDepartment(input: Omit<Department, 'id'>): Department {
    const res = this.db
      .prepare('INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)')
      .run(input.name, input.parent_id, input.sort_order);
    return this.getDepartment(Number(res.lastInsertRowid));
  }

  updateDepartment(id: number, input: Omit<Department, 'id'>): Department {
    if (input.parent_id === id) throw new Error('Отдел не может быть сам себе родителем');
    // Защита от циклов: поднимаемся от proposed parent.
    let cur: number | null = input.parent_id;
    while (cur != null) {
      if (cur === id) throw new Error('Нельзя создать цикл в структуре отделов');
      const parent = this.db.prepare<{ parent_id: number | null }>('SELECT parent_id FROM departments WHERE id = ?').get(cur);
      cur = parent?.parent_id ?? null;
    }
    this.db.prepare('UPDATE departments SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?').run(input.name, input.parent_id, input.sort_order, id);
    return this.getDepartment(id);
  }

  deleteDepartment(id: number): void {
    const empCount = this.db.prepare<{ c: number }>('SELECT COUNT(*) AS c FROM employees WHERE department_id = ?').get(id)!.c;
    if (empCount > 0) throw new Error('В отделе есть сотрудники — сначала переместите их');
    const childCount = this.db.prepare<{ c: number }>('SELECT COUNT(*) AS c FROM departments WHERE parent_id = ?').get(id)!.c;
    if (childCount > 0) throw new Error('У отдела есть подразделения — сначала удалите их');
    this.db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  }

  private getDepartment(id: number): Department {
    const row = this.db.prepare<Department>('SELECT id, name, parent_id, sort_order FROM departments WHERE id = ?').get(id);
    if (!row) throw new Error('Отдел не найден');
    return row;
  }

  // ── Отсутствия ────────────────────────────────────────────

  listAbsencesByEmployee(employeeId: number): Absence[] {
    return this.db
      .prepare<AbsenceRow>('SELECT * FROM absences WHERE employee_id = ? ORDER BY date_from DESC')
      .all(employeeId);
  }

  createAbsence(input: Omit<Absence, 'id'>): Absence {
    if (input.date_to < input.date_from) throw new Error('Дата окончания раньше начала');
    const res = this.db
      .prepare('INSERT INTO absences (employee_id, absence_type, date_from, date_to, note) VALUES (?, ?, ?, ?, ?)')
      .run(input.employee_id, input.absence_type, input.date_from, input.date_to, input.note);
    return this.getAbsence(Number(res.lastInsertRowid));
  }

  updateAbsence(id: number, input: Omit<Absence, 'id'>): Absence {
    if (input.date_to < input.date_from) throw new Error('Дата окончания раньше начала');
    this.db
      .prepare('UPDATE absences SET employee_id = ?, absence_type = ?, date_from = ?, date_to = ?, note = ? WHERE id = ?')
      .run(input.employee_id, input.absence_type, input.date_from, input.date_to, input.note, id);
    return this.getAbsence(id);
  }

  deleteAbsence(id: number): void {
    this.db.prepare('DELETE FROM absences WHERE id = ?').run(id);
  }

  private getAbsence(id: number): Absence {
    const row = this.db.prepare<AbsenceRow>('SELECT * FROM absences WHERE id = ?').get(id);
    if (!row) throw new Error('Запись об отсутствии не найдена');
    return row;
  }

  /** Таймлайн отсутствий на ближайшие N дней (начиная с вчера, чтобы текущие были видны). */
  absenceTimeline(daysAhead: number): AbsenceTimelineItem[] {
    const today = todayIso();
    const end = shiftIso(today, daysAhead);
    return this.db
      .prepare<AbsenceTimelineItem>(
        `SELECT a.employee_id, e.full_name AS employee_name, a.absence_type, a.date_from, a.date_to, a.note
         FROM absences a JOIN employees e ON e.id = a.employee_id
         WHERE a.date_from <= ? AND a.date_to >= ? AND e.archived = 0 AND e.is_fired = 0
         ORDER BY a.date_from`
      )
      .all(end, shiftIso(today, -1));
  }

  // ── Сотрудники ────────────────────────────────────────────

  listEmployees(opts: { includeArchived: boolean }): EmployeeView[] {
    const today = todayIso();
    const rows = this.db
      .prepare(
        `SELECT e.*, d.name AS department_name
         FROM employees e LEFT JOIN departments d ON d.id = e.department_id
         ${opts.includeArchived ? '' : 'WHERE e.archived = 0'}
         ORDER BY e.full_name`
      )
      .all() as EmployeeRow[];
    const activeAbsences = this.db
      .prepare<AbsenceRow & { rank: number }>(
        `SELECT *, 1 AS rank FROM absences WHERE date_from <= ? AND date_to >= ?`
      )
      .all(today, today);
    const upcomingAbsences = this.db
      .prepare<AbsenceRow>(
        `SELECT * FROM absences WHERE date_from > ? ORDER BY date_from ASC`
      )
      .all(today);

    const currentByEmp = new Map<number, AbsenceRow>();
    for (const a of activeAbsences) if (!currentByEmp.has(a.employee_id)) currentByEmp.set(a.employee_id, a);
    const upcomingByEmp = new Map<number, AbsenceRow>();
    for (const a of upcomingAbsences) if (!upcomingByEmp.has(a.employee_id)) upcomingByEmp.set(a.employee_id, a);

    return rows.map((r) => {
      const status = computeStatus(r, currentByEmp.get(r.id) ?? null, today);
      const nextAbsence = currentByEmp.get(r.id) ?? upcomingByEmp.get(r.id) ?? null;
      return {
        id: r.id,
        full_name: r.full_name,
        department_id: r.department_id,
        position: r.position,
        internal_phone: r.internal_phone,
        mobile_phone: r.mobile_phone,
        email: r.email,
        birthday: r.birthday,
        functions: r.functions,
        is_fired: r.is_fired === 1,
        fired_date: r.fired_date,
        archived: r.archived === 1,
        created_at: r.created_at,
        updated_at: r.updated_at,
        department_name: r.department_name,
        status,
        days_to_birthday: daysToBirthday(r.birthday, today),
        next_absence: nextAbsence ? stripRank(nextAbsence) : null,
      };
    });
  }

  getEmployee(id: number): EmployeeView | null {
    return this.listEmployees({ includeArchived: true }).find((e) => e.id === id) ?? null;
  }

  createEmployee(input: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): EmployeeView {
    const ts = nowSqlTimestamp();
    const res = this.db
      .prepare(
        `INSERT INTO employees (full_name, department_id, position, internal_phone, mobile_phone, email, birthday, functions, is_fired, fired_date, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.full_name,
        input.department_id,
        input.position,
        input.internal_phone,
        input.mobile_phone,
        input.email,
        input.birthday,
        input.functions,
        input.is_fired ? 1 : 0,
        input.fired_date,
        input.archived ? 1 : 0,
        ts,
        ts
      );
    return this.requireEmployee(Number(res.lastInsertRowid));
  }

  updateEmployee(id: number, input: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): EmployeeView {
    this.db
      .prepare(
        `UPDATE employees SET full_name=?, department_id=?, position=?, internal_phone=?, mobile_phone=?, email=?, birthday=?, functions=?, is_fired=?, fired_date=?, archived=?, updated_at=?
         WHERE id = ?`
      )
      .run(
        input.full_name,
        input.department_id,
        input.position,
        input.internal_phone,
        input.mobile_phone,
        input.email,
        input.birthday,
        input.functions,
        input.is_fired ? 1 : 0,
        input.fired_date,
        input.archived ? 1 : 0,
        nowSqlTimestamp(),
        id
      );
    return this.requireEmployee(id);
  }

  setArchived(id: number, archived: boolean): EmployeeView {
    this.db.prepare('UPDATE employees SET archived = ?, updated_at = ? WHERE id = ?').run(archived ? 1 : 0, nowSqlTimestamp(), id);
    return this.requireEmployee(id);
  }

  private requireEmployee(id: number): EmployeeView {
    const v = this.getEmployee(id);
    if (!v) throw new Error('Сотрудник не найден');
    return v;
  }
}

function stripRank(a: AbsenceRow & { rank?: number }): Absence {
  return { id: a.id, employee_id: a.employee_id, absence_type: a.absence_type, date_from: a.date_from, date_to: a.date_to, note: a.note };
}

function computeStatus(row: EmployeeRow, currentAbsence: AbsenceRow | null, today: string): EmployeeStatusInfo {
  if (row.is_fired === 1) return { kind: 'fired', label: 'Уволен' };
  if (currentAbsence) {
    const info = ABSENCE_LABELS[currentAbsence.absence_type];
    return { kind: info.kind, label: info.label, absenceFrom: currentAbsence.date_from, absenceTo: currentAbsence.date_to };
  }
  void today;
  return { kind: 'work', label: 'На работе' };
}

/** Сдвиг yyyy-MM-dd на N дней (без date-fns tz-проблем). */
export function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
