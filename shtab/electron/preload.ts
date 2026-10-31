// Preload: единственный мост renderer → main. Никакого прямого доступа к БД из окна.
import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type IpcApi } from '../shared/ipc';

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>;

const api: IpcApi = {
  departments: {
    list: () => invoke(IPC.departmentsList),
    create: (input) => invoke(IPC.departmentsCreate, input),
    update: (id, input) => invoke(IPC.departmentsUpdate, id, input),
    remove: (id) => invoke(IPC.departmentsDelete, id),
  },
  employees: {
    list: (opts) => invoke(IPC.employeesList, opts),
    get: (id) => invoke(IPC.employeesGet, id),
    create: (input) => invoke(IPC.employeesCreate, input),
    update: (id, input) => invoke(IPC.employeesUpdate, id, input),
    archive: (id, archived) => invoke(IPC.employeesArchive, id, archived),
  },
  absences: {
    list: (opts) => invoke(IPC.absencesList, opts),
    create: (input) => invoke(IPC.absencesCreate, input),
    update: (id, input) => invoke(IPC.absencesUpdate, id, input),
    remove: (id) => invoke(IPC.absencesDelete, id),
  },
  taskTypes: {
    list: () => invoke(IPC.taskTypesList),
    create: (name) => invoke(IPC.taskTypesCreate, name),
    update: (id, input) => invoke(IPC.taskTypesUpdate, id, input),
    remove: (id) => invoke(IPC.taskTypesDelete, id),
    reorder: (orderedIds) => invoke(IPC.taskTypesReorder, orderedIds),
  },
  monitorings: {
    list: (opts) => invoke(IPC.monitoringsList, opts),
    get: (id) => invoke(IPC.monitoringsGet, id),
    create: (input) => invoke(IPC.monitoringsCreate, input),
    update: (id, input) => invoke(IPC.monitoringsUpdate, id, input),
    archive: (id) => invoke(IPC.monitoringsArchive, id),
  },
  edo: {
    list: (opts) => invoke(IPC.edoList, opts),
    get: (id) => invoke(IPC.edoGet, id),
    create: (input) => invoke(IPC.edoCreate, input),
    update: (id, input) => invoke(IPC.edoUpdate, id, input),
    offControl: (id) => invoke(IPC.edoOffControl, id),
    onControl: (id) => invoke(IPC.edoOnControl, id),
    archive: (id) => invoke(IPC.edoArchive, id),
  },
  workLog: {
    list: (entityType, entityId) => invoke(IPC.workLogList, entityType, entityId),
    create: (input) => invoke(IPC.workLogCreate, input),
    update: (id, input) => invoke(IPC.workLogUpdate, id, input),
    remove: (id) => invoke(IPC.workLogDelete, id),
  },
  tasks: {
    list: (opts) => invoke(IPC.tasksList, opts),
    get: (id) => invoke(IPC.tasksGet, id),
    create: (input) => invoke(IPC.tasksCreate, input),
    update: (id, input) => invoke(IPC.tasksUpdate, id, input),
    archive: (id) => invoke(IPC.tasksArchive, id),
    unarchive: (id) => invoke(IPC.tasksUnarchive, id),
  },
  checkItems: {
    list: (taskId) => invoke(IPC.checkItemsList, taskId),
    create: (taskId, title) => invoke(IPC.checkItemsCreate, taskId, title),
    update: (id, input) => invoke(IPC.checkItemsUpdate, id, input),
    remove: (id) => invoke(IPC.checkItemsDelete, id),
  },
  settings: {
    get: () => invoke(IPC.settingsGet),
    update: (patch) => invoke(IPC.settingsUpdate, patch),
  },
  dashboard: {
    get: () => invoke(IPC.dashboardGet),
  },
  search: {
    global: (query) => invoke(IPC.searchGlobal, query),
  },
  maintenance: {
    backupNow: () => invoke(IPC.backupNow),
    loadDemo: () => invoke(IPC.loadDemo),
    clearAll: () => invoke(IPC.clearAll),
  },
};

contextBridge.exposeInMainWorld('api', api);
