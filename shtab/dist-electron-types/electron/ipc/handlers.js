// IPC-слой: регистрация типизированных handlers в main-процессе.
// Renderer не имеет прямого доступа к БД — только через эти каналы.
import { ipcMain } from 'electron';
import { EmployeeRepo } from '../db/employees';
import { MonitoringRepo, TaskTypeRepo } from '../db/monitorings';
import { EdoRepo, TaskRepo, WorkLogRepo, applyDocLink } from '../db/documents_tasks';
import { getSettings, updateSettings, backupNow } from '../db/settings';
import { buildDashboard, globalSearch } from '../db/dashboard';
import { loadDemoData, clearAllData } from '../db/demo';
import { IPC } from '../../shared/ipc';
export function registerIpc(db, dbPath, userDataDir) {
    const employees = new EmployeeRepo(db);
    const taskTypes = new TaskTypeRepo(db);
    const monitorings = new MonitoringRepo(db);
    const edo = new EdoRepo(db);
    const workLog = new WorkLogRepo(db);
    const tasks = new TaskRepo(db);
    const handle = (channel, fn) => {
        ipcMain.handle(channel, (_event, ...args) => fn(...args));
    };
    // ---- Подразделения ----
    handle(IPC.departmentsList, () => employees.listDepartments());
    handle(IPC.departmentsCreate, (input) => employees.createDepartment(input));
    handle(IPC.departmentsUpdate, (id, input) => employees.updateDepartment(id, input));
    handle(IPC.departmentsDelete, (id) => employees.deleteDepartment(id));
    // ---- Сотрудники ----
    handle(IPC.employeesList, (opts) => employees.list(Boolean(opts.includeArchived)));
    handle(IPC.employeesGet, (id) => employees.get(id));
    handle(IPC.employeesCreate, (input) => employees.create(input));
    handle(IPC.employeesUpdate, (id, input) => employees.update(id, input));
    handle(IPC.employeesArchive, (id, archived) => employees.setArchived(id, archived));
    // ---- Отсутствия ----
    handle(IPC.absencesList, (opts) => employees.listAbsences(opts));
    handle(IPC.absencesCreate, (input) => employees.createAbsence(input));
    handle(IPC.absencesUpdate, (id, input) => employees.updateAbsence(id, input));
    handle(IPC.absencesDelete, (id) => employees.deleteAbsence(id));
    // ---- Справочник типов задач мониторинга ----
    handle(IPC.taskTypesList, () => taskTypes.list());
    handle(IPC.taskTypesCreate, (name) => taskTypes.create(name));
    handle(IPC.taskTypesUpdate, (id, input) => taskTypes.update(id, input));
    handle(IPC.taskTypesDelete, (id) => taskTypes.remove(id));
    handle(IPC.taskTypesReorder, (orderedIds) => taskTypes.reorder(orderedIds));
    // ---- Мониторинги ----
    handle(IPC.monitoringsList, (opts) => monitorings.list(opts));
    handle(IPC.monitoringsGet, (id) => monitorings.get(id));
    handle(IPC.monitoringsCreate, (input) => monitorings.create(input));
    handle(IPC.monitoringsUpdate, (id, input) => monitorings.update(id, input));
    handle(IPC.monitoringsArchive, (id) => monitorings.archive(id));
    // ---- ЭДО ----
    const settingsForDocs = () => getSettings(db);
    const withLink = (v) => v.map((d) => applyDocLink(d, settingsForDocs().edoLinkTemplate));
    handle(IPC.edoList, (opts) => withLink(edo.list(opts)));
    handle(IPC.edoGet, (id) => {
        const v = edo.get(id);
        return v ? applyDocLink(v, settingsForDocs().edoLinkTemplate) : null;
    });
    handle(IPC.edoCreate, (input) => edo.create(input));
    handle(IPC.edoUpdate, (id, input) => edo.update(id, input));
    handle(IPC.edoOffControl, (id) => edo.setOffControl(id, true));
    handle(IPC.edoOnControl, (id) => edo.setOffControl(id, false));
    handle(IPC.edoArchive, (id) => edo.archive(id));
    // ---- Журнал проделанной работы ----
    handle(IPC.workLogList, (entityType, entityId) => workLog.list(entityType, entityId));
    handle(IPC.workLogCreate, (input) => workLog.create(input));
    handle(IPC.workLogUpdate, (id, input) => workLog.update(id, input));
    handle(IPC.workLogDelete, (id) => workLog.remove(id));
    // ---- Задачи + чек-листы ----
    handle(IPC.tasksList, (opts) => {
        tasks.wakeUpExpired();
        return tasks.list(opts);
    });
    handle(IPC.tasksGet, (id) => {
        tasks.wakeUpExpired();
        return tasks.get(id);
    });
    handle(IPC.tasksCreate, (input) => tasks.create(input));
    handle(IPC.tasksUpdate, (id, input) => tasks.update(id, input));
    handle(IPC.tasksArchive, (id) => tasks.archive(id));
    handle(IPC.checkItemsList, (taskId) => tasks.listCheckItems(taskId));
    handle(IPC.checkItemsCreate, (taskId, title) => tasks.createCheckItem(taskId, title));
    handle(IPC.checkItemsUpdate, (id, input) => tasks.updateCheckItem(id, input));
    handle(IPC.checkItemsDelete, (id) => tasks.removeCheckItem(id));
    // ---- Настройки ----
    handle(IPC.settingsGet, () => getSettings(db));
    handle(IPC.settingsUpdate, (patch) => updateSettings(db, patch));
    // ---- Дашборд и поиск ----
    handle(IPC.dashboardGet, () => {
        tasks.wakeUpExpired();
        return buildDashboard(db);
    });
    handle(IPC.searchGlobal, (query) => globalSearch(db, query));
    // ---- Обслуживание ----
    handle(IPC.backupNow, () => backupNow(dbPath, `${userDataDir}/backups`));
    handle(IPC.loadDemo, () => loadDemoData(db));
    handle(IPC.clearAll, () => clearAllData(db));
}
