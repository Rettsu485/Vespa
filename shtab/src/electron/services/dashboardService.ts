// Дашборд «Сегодня» и глобальный поиск (Ctrl+K).

import type { TypedDb } from '../db/database';
import { daysBetween, todayIso } from '../db/dates';
import { EdoRepository, WorkLogRepository } from '../repositories/edoRepo';
import { MonitoringRepository } from '../repositories/monitoringRepo';
import { TaskRepository } from '../repositories/taskRepo';
import { TeamRepository } from '../repositories/teamRepo';
import type { SettingsService } from './settingsService';
import type { DashboardData, SearchResults } from '../../shared/types';

export interface DashboardServices {
  db: TypedDb;
  settings: SettingsService;
  team: TeamRepository;
  monitorings: MonitoringRepository;
  edo: EdoRepository;
  tasks: TaskRepository;
  workLog: WorkLogRepository;
}

export function buildDashboard(s: DashboardServices): DashboardData {
  const today = todayIso();
  const appSettings = s.settings.get();

  // Служебные записи автопробуждения создаются внутри taskRepo.wakeUpExpired().
  const returnedIds = new Set(s.tasks.returnedFromWaitToday());

  const edoAll = s.edo.list({ offControl: 'off' }, appSettings);
  const burning = edoAll.filter((d) => d.days_left != null && d.days_left <= 3);
  const overdue = edoAll.filter((d) => d.days_left != null && d.days_left < 0);
  const dueToday = edoAll.filter((d) => d.days_left === 0);
  const next3 = edoAll.filter((d) => d.days_left != null && d.days_left >= 1 && d.days_left <= 3);

  const monitoringRedFlags = s.monitorings.listMonitorings({}).filter((m) => m.red_flag);

  const employees = s.team.listEmployees({ includeArchived: false });
  const birthdaysSoon = employees
    .filter((e) => e.days_to_birthday != null && e.days_to_birthday <= 3)
    .sort((a, b) => (a.days_to_birthday ?? 0) - (b.days_to_birthday ?? 0));

  // Возвращающиеся из отсутствия в ближайшие 7 дней (не те, кто уже отсутствует — их не «ждём», они уже вернутся позже).
  const timeline = s.team.absenceTimeline(7);
  const returningSoon = timeline
    .filter((t) => {
      const daysTo = daysBetween(t.date_to, today);
      return daysTo >= 0 && daysTo <= 7;
    })
    .map((t) => {
      const emp = employees.find((e) => e.id === t.employee_id);
      if (!emp) return null;
      return { employee: emp, absence: { id: 0, employee_id: t.employee_id, absence_type: t.absence_type, date_from: t.date_from, date_to: t.date_to, note: t.note } };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const allTasks = s.tasks.list({});
  const returnedTasks = allTasks.filter((t) => returnedIds.has(t.id) || t.returned_today);

  return {
    counters: {
      overdue: overdue.length,
      today: dueToday.length,
      next3: next3.length,
      returnedToday: returnedTasks.length,
    },
    edoHot: burning,
    monitoringRedFlags,
    birthdaysSoon,
    returningSoon,
    returnedTasks,
  };
}

/** Глобальный поиск по сотрудникам, мониторингам, документам ЭДО и задачам. */
export function globalSearch(s: DashboardServices, query: string): SearchResults {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return { employees: [], monitorings: [], edo: [], tasks: [] };
  }
  const like = `%${q}%`;
  const limit = 8;

  const employees = s.db
    .prepare<{ id: number; full_name: string; position: string }>(
      `SELECT id, full_name, position FROM employees WHERE archived = 0 AND (lower(full_name) LIKE ? OR lower(position) LIKE ?) LIMIT ${limit}`
    )
    .all(like, like);

  const monitorings = s.db
    .prepare<{ id: number; name: string; type_name: string; employee_name: string }>(
      `SELECT m.id, m.name, tt.name AS type_name, e.full_name AS employee_name
       FROM monitorings m JOIN task_types tt ON tt.id = m.type_id JOIN employees e ON e.id = m.employee_id
       WHERE m.status != 'архив' AND lower(m.name) LIKE ? LIMIT ${limit}`
    )
    .all(like);

  const edo = s.db
    .prepare<{ id: number; doc_number: string; summary: string }>(
      `SELECT id, doc_number, summary FROM edo_documents WHERE archived = 0 AND (lower(doc_number) LIKE ? OR lower(summary) LIKE ?) LIMIT ${limit}`
    )
    .all(like, like);

  const tasks = s.db
    .prepare<{ id: number; title: string; theme: string; status: string }>(
      `SELECT id, title, theme, status FROM tasks WHERE archived = 0 AND status NOT IN ('выполнено','отменено') AND (lower(title) LIKE ? OR lower(theme) LIKE ?) LIMIT ${limit}`
    )
    .all(like, like);

  return {
    employees: employees.map((e) => ({ entity: 'employee', id: e.id, title: e.full_name, subtitle: e.position || 'Сотрудник' })),
    monitorings: monitorings.map((m) => ({ entity: 'monitoring', id: m.id, title: m.name, subtitle: `${m.type_name} · ${m.employee_name}` })),
    edo: edo.map((d) => ({ entity: 'edo', id: d.id, title: d.doc_number, subtitle: d.summary || 'Документ ЭДО' })),
    tasks: tasks.map((t) => ({ entity: 'task', id: t.id, title: t.title, subtitle: [t.theme, t.status].filter(Boolean).join(' · ') })),
  };
}
