// Дашборд «Сегодня» и глобальный поиск. Все вычисления — на стороне main-процесса.
import type { Db } from './database';
import { EmployeeRepo } from './employees';
import { MonitoringRepo } from './monitorings';
import { EdoRepo, TaskRepo, applyDocLink } from './documents_tasks';
import { getSettings } from './settings';
import { todayIso } from './dateUtils';
import type { DashboardData, SearchResult } from '../../shared/types';

export function buildDashboard(db: Db): DashboardData {
  const employees = new EmployeeRepo(db);
  const monitorings = new MonitoringRepo(db);
  const edo = new EdoRepo(db);
  const tasks = new TaskRepo(db);
  const settings = getSettings(db);
  const today = todayIso();

  const withLink = (v: ReturnType<EdoRepo['list']>) => v.map((d) => applyDocLink(d, settings.edoLinkTemplate));

  const allDocs = withLink(edo.list({}));
  const burning = allDocs.filter((d) => d.days_left !== null && d.days_left <= 3);
  const overdue = burning.filter((d) => (d.days_left ?? 0) < 0);
  const dueToday = burning.filter((d) => d.days_left === 0);
  const next3 = burning.filter((d) => d.days_left !== null && d.days_left > 0 && d.days_left <= 3);

  const redFlags = monitorings.list({}).filter((m) => m.red_flag);

  const emps = employees.list(false);
  const upcomingBirthdays = emps
    .filter((e) => e.days_to_birthday !== null && e.days_to_birthday <= 3)
    .sort((a, b) => (a.days_to_birthday ?? 0) - (b.days_to_birthday ?? 0));

  // Кто скоро возвращается из отпуска (в течение 7 дней).
  const horizonEnd = addDays(today, 7);
  const returningAbsences = employees.listAbsences({ fromDate: today, toDate: horizonEnd });
  const returning = returningAbsences
    .filter((a) => a.date_from > today && a.date_to >= today && a.date_to <= horizonEnd)
    .map((a) => {
      const emp = emps.find((e) => e.id === a.employee_id);
      return emp ? { employee: emp, absence: a } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.absence.date_to.localeCompare(b.absence.date_to));

  // Задачи, вернувшиеся из ожидания сегодня: wakeUpExpired переводит их в «в работе»
  // с updated_at = сегодня (простое решение, зафиксировано в комментарии к wakeUpExpired).
  const returnedTasks = tasks.list({}).filter((t) => t.updated_at.slice(0, 10) === today && t.status === 'в работе');

  return {
    overdue_edo: overdue,
    due_today_edo: dueToday,
    due_next3_edo: next3,
    returned_tasks: returnedTasks,
    monitoring_red_flags: redFlags,
    upcoming_birthdays: upcomingBirthdays,
    returning_from_absence: returning,
    counters: {
      overdue: overdue.length,
      today: dueToday.length,
      next3: next3.length,
      returned: returnedTasks.length,
    },
  };
}

export function globalSearch(db: Db, query: string): SearchResult {
  const q = query.trim().toLowerCase();
  if (!q) return { employees: [], monitorings: [], documents: [], tasks: [] };
  const employees = new EmployeeRepo(db);
  const monitorings = new MonitoringRepo(db);
  const edo = new EdoRepo(db);
  const tasks = new TaskRepo(db);
  const settings = getSettings(db);
  const match = (s: string) => s.toLowerCase().includes(q);

  return {
    employees: employees.list(false).filter((e) => match(e.full_name) || match(e.position) || match(e.functions)).slice(0, 20),
    monitorings: monitorings.list({}).filter((m) => match(m.name) || match(m.employee_name) || match(m.type_name)).slice(0, 20),
    documents: edo
      .list({})
      .map((d) => applyDocLink(d, settings.edoLinkTemplate))
      .filter((d) => match(d.doc_number) || match(d.summary) || match(d.instruction))
      .slice(0, 20),
    tasks: tasks
      .list({ includeArchived: true })
      .filter((t) => match(t.title) || match(t.theme) || match(t.next_action))
      .slice(0, 20),
  };
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
