// IPC-слой: регистрация типизированных handlers в main-процессе.
// Renderer не имеет прямого доступа к БД — только через эти каналы.
import { ipcMain } from 'electron';
import path from 'node:path';
import type { Db } from '../db/database';
import { EmployeeRepo } from '../db/employees';
import { MonitoringRepo, TaskTypeRepo } from '../db/monitorings';
import { EdoRepo, TaskRepo, WorkLogRepo, applyDocLink } from '../db/documents_tasks';
import { getSettings, updateSettings, backupNow } from '../db/settings';
import { buildDashboard, globalSearch } from '../db/dashboard';
import { loadDemoData, clearAllData } from '../db/demo';
import { IPC, type EdoInput, type EdoListOpts, type EmployeeInput, type MonitoringInput, type MonitoringListOpts, type TaskInput, type TaskListOpts } from '../../shared/ipc';
import type { Absence, AppSettings, WorkLogEntry } from '../../shared/types';

type Handler = (...args: unknown[]) => unknown;

export function registerIpc(db: Db, dbPath: string, userDataDir: string): void {
  const employees = new EmployeeRepo(db);
  const taskTypes = new TaskTypeRepo(db);
  const monitorings = new MonitoringRepo(db);
  const edo = new EdoRepo(db);
  const workLog = new WorkLogRepo(db);
  const tasks = new TaskRepo(db);

  const handle = (channel: string, fn: Handler): void => {
    ipcMain.handle(channel, (_event, ...args) => fn(...args));
  };

  // ---- Подразделения ----
  handle(IPC.departmentsList, () => employees.listDepartments());
  handle(IPC.departmentsCreate, (input) => employees.createDepartment(input as { name: string; parent_id: number | null; sort_order: number }));
  handle(IPC.departmentsUpdate, (id, input) => employees.updateDepartment(id as number, input as Partial<{ name: string; parent_id: number | null; sort_order: number }>));
  handle(IPC.departmentsDelete, (id) => employees.deleteDepartment(id as number));

  // ---- Сотрудники ----
  handle(IPC.employeesList, (opts) => employees.list(Boolean((opts as { includeArchived?: boolean }).includeArchived)));
  handle(IPC.employeesGet, (id) => employees.get(id as number));
  handle(IPC.employeesCreate, (input) => employees.create(input as EmployeeInput));
  handle(IPC.employeesUpdate, (id, input) => employees.update(id as number, input as Partial<EmployeeInput>));
  handle(IPC.employeesArchive, (id, archived) => employees.setArchived(id as number, archived as boolean));

  // ---- Отсутствия ----
  handle(IPC.absencesList, (opts) => employees.listAbsences(opts as { employeeId?: number; fromDate?: string; toDate?: string }));
  handle(IPC.absencesCreate, (input) => employees.createAbsence(input as Omit<Absence, 'id'>));
  handle(IPC.absencesUpdate, (id, input) => employees.updateAbsence(id as number, input as Partial<Omit<Absence, 'id'>>));
  handle(IPC.absencesDelete, (id) => employees.deleteAbsence(id as number));

  // ---- Справочник типов задач мониторинга ----
  handle(IPC.taskTypesList, () => taskTypes.list());
  handle(IPC.taskTypesCreate, (name) => taskTypes.create(name as string));
  handle(IPC.taskTypesUpdate, (id, input) => taskTypes.update(id as number, input as Partial<{ name: string; active: boolean }>));
  handle(IPC.taskTypesDelete, (id) => taskTypes.remove(id as number));
  handle(IPC.taskTypesReorder, (orderedIds) => taskTypes.reorder(orderedIds as number[]));

  // ---- Мониторинги ----
  handle(IPC.monitoringsList, (opts) => monitorings.list(opts as MonitoringListOpts));
  handle(IPC.monitoringsGet, (id) => monitorings.get(id as number));
  handle(IPC.monitoringsCreate, (input) => monitorings.create(input as MonitoringInput));
  handle(IPC.monitoringsUpdate, (id, input) => monitorings.update(id as number, input as Partial<MonitoringInput>));
  handle(IPC.monitoringsArchive, (id) => monitorings.archive(id as number));

  // ---- ЭДО ----
  const settingsForDocs = (): AppSettings => getSettings(db);
  const withLink = (v: ReturnType<EdoRepo['list']>) => v.map((d) => applyDocLink(d, settingsForDocs().edoLinkTemplate));
  handle(IPC.edoList, (opts) => withLink(edo.list(opts as EdoListOpts)));
  handle(IPC.edoGet, (id) => {
    const v = edo.get(id as number);
    return v ? applyDocLink(v, settingsForDocs().edoLinkTemplate) : null;
  });
  handle(IPC.edoCreate, (input) => edo.create(input as EdoInput));
  handle(IPC.edoUpdate, (id, input) => edo.update(id as number, input as Partial<EdoInput>));
  handle(IPC.edoOffControl, (id) => edo.setOffControl(id as number, true));
  handle(IPC.edoOnControl, (id) => edo.setOffControl(id as number, false));
  handle(IPC.edoArchive, (id) => edo.archive(id as number));

  // ---- Журнал проделанной работы ----
  handle(IPC.workLogList, (entityType, entityId) => workLog.list(entityType as 'edo' | 'task', entityId as number));
  handle(IPC.workLogCreate, (input) => workLog.create(input as Omit<WorkLogEntry, 'id' | 'created_at'>));
  handle(IPC.workLogUpdate, (id, input) => workLog.update(id as number, input as { log_date?: string; text?: string }));
  handle(IPC.workLogDelete, (id) => workLog.remove(id as number));

  // ---- Задачи + чек-листы ----
  handle(IPC.tasksList, (opts) => {
    tasks.wakeUpExpired();
    return tasks.list(opts as TaskListOpts);
  });
  handle(IPC.tasksGet, (id) => {
    tasks.wakeUpExpired();
    return tasks.get(id as number);
  });
  handle(IPC.tasksCreate, (input) => tasks.create(input as TaskInput));
  handle(IPC.tasksUpdate, (id, input) => tasks.update(id as number, input as Partial<TaskInput>));
  handle(IPC.tasksArchive, (id) => tasks.archive(id as number));
  handle(IPC.tasksUnarchive, (id) => tasks.unarchive(id as number));

  handle(IPC.checkItemsList, (taskId) => tasks.listCheckItems(taskId as number));
  handle(IPC.checkItemsCreate, (taskId, title) => tasks.createCheckItem(taskId as number, title as string));
  handle(IPC.checkItemsUpdate, (id, input) => tasks.updateCheckItem(id as number, input as Partial<{ title: string; done: boolean }>));
  handle(IPC.checkItemsDelete, (id) => tasks.removeCheckItem(id as number));

  // ---- Настройки ----
  handle(IPC.settingsGet, () => getSettings(db));
  handle(IPC.settingsUpdate, (patch) => updateSettings(db, patch as Partial<AppSettings>));

  // ---- Дашборд и поиск ----
  handle(IPC.dashboardGet, () => {
    tasks.wakeUpExpired();
    return buildDashboard(db);
  });
  handle(IPC.searchGlobal, (query) => globalSearch(db, query as string));

  // ---- Обслуживание ----
  // backupNow возвращает Promise (см. исправление бага) — ipcMain.handle сам егоAwait-ит на стороне renderer.
  handle(IPC.backupNow, () => backupNow(dbPath, path.join(userDataDir, 'backups')));
  handle(IPC.loadDemo, () => loadDemoData(db));
  handle(IPC.clearAll, () => clearAllData(db));
}
