// Смоук-сборка: репозитории + демо-данные + дашборд + поиск без Electron.
import { initDatabase, typed } from '../src/electron/db/database';
import { TeamRepository } from '../src/electron/repositories/teamRepo';
import { MonitoringRepository } from '../src/electron/repositories/monitoringRepo';
import { EdoRepository, WorkLogRepository } from '../src/electron/repositories/edoRepo';
import { TaskRepository } from '../src/electron/repositories/taskRepo';
import { SettingsService } from '../src/electron/services/settingsService';
import { loadDemoData } from '../src/electron/services/demoService';
import { buildDashboard, globalSearch } from '../src/electron/services/dashboardService';

const dir = process.argv[2];
const raw = initDatabase(dir);
const db = typed(raw);
const settings = new SettingsService(db);
const team = new TeamRepository(db);
const monitorings = new MonitoringRepository(db);
const edo = new EdoRepository(db);
const tasks = new TaskRepository(db);
const workLog = new WorkLogRepository(db);
const services = { db, settings, team, monitorings, edo, tasks, workLog };

loadDemoData(db);
const dash = buildDashboard(services);
const search = globalSearch(services, 'сотрудник');
const empCount = team.listEmployees({ includeArchived: false }).length;
const monCount = monitorings.listMonitorings({}).length;
const edoCount = edo.list({}, settings.get()).length;
const taskCount = tasks.list({}).length;
console.log(JSON.stringify({
  employees: empCount, monitorings: monCount, edo: edoCount, tasks: taskCount,
  counters: dash.counters, edoHot: dash.edoHot.length,
  monitoringRedFlags: dash.monitoringRedFlags.length, birthdaysSoon: dash.birthdaysSoon.length,
  returningSoon: dash.returningSoon.length, returnedTasks: dash.returnedTasks.length,
  searchEmployees: search.employees.length,
}, null, 2));
