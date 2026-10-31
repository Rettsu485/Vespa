// electron/preload.ts
var import_electron = require("electron");

// shared/ipc.ts
var IPC = {
  departmentsList: "departments:list",
  departmentsCreate: "departments:create",
  departmentsUpdate: "departments:update",
  departmentsDelete: "departments:delete",
  employeesList: "employees:list",
  employeesGet: "employees:get",
  employeesCreate: "employees:create",
  employeesUpdate: "employees:update",
  employeesArchive: "employees:archive",
  absencesList: "absences:list",
  absencesCreate: "absences:create",
  absencesUpdate: "absences:update",
  absencesDelete: "absences:delete",
  taskTypesList: "task-types:list",
  taskTypesCreate: "task-types:create",
  taskTypesUpdate: "task-types:update",
  taskTypesDelete: "task-types:delete",
  taskTypesReorder: "task-types:reorder",
  monitoringsList: "monitorings:list",
  monitoringsGet: "monitorings:get",
  monitoringsCreate: "monitorings:create",
  monitoringsUpdate: "monitorings:update",
  monitoringsArchive: "monitorings:archive",
  edoList: "edo:list",
  edoGet: "edo:get",
  edoCreate: "edo:create",
  edoUpdate: "edo:update",
  edoOffControl: "edo:off-control",
  edoOnControl: "edo:on-control",
  edoArchive: "edo:archive",
  workLogList: "work-log:list",
  workLogCreate: "work-log:create",
  workLogUpdate: "work-log:update",
  workLogDelete: "work-log:delete",
  tasksList: "tasks:list",
  tasksGet: "tasks:get",
  tasksCreate: "tasks:create",
  tasksUpdate: "tasks:update",
  tasksArchive: "tasks:archive",
  tasksUnarchive: "tasks:unarchive",
  checkItemsList: "check-items:list",
  checkItemsCreate: "check-items:create",
  checkItemsUpdate: "check-items:update",
  checkItemsDelete: "check-items:delete",
  settingsGet: "settings:get",
  settingsUpdate: "settings:update",
  dashboardGet: "dashboard:get",
  searchGlobal: "search:global",
  backupNow: "backup:now",
  loadDemo: "demo:load",
  clearAll: "data:clear"
};

// electron/preload.ts
var invoke = (channel, ...args) => import_electron.ipcRenderer.invoke(channel, ...args);
var api = {
  departments: {
    list: () => invoke(IPC.departmentsList),
    create: (input) => invoke(IPC.departmentsCreate, input),
    update: (id, input) => invoke(IPC.departmentsUpdate, id, input),
    remove: (id) => invoke(IPC.departmentsDelete, id)
  },
  employees: {
    list: (opts) => invoke(IPC.employeesList, opts),
    get: (id) => invoke(IPC.employeesGet, id),
    create: (input) => invoke(IPC.employeesCreate, input),
    update: (id, input) => invoke(IPC.employeesUpdate, id, input),
    archive: (id, archived) => invoke(IPC.employeesArchive, id, archived)
  },
  absences: {
    list: (opts) => invoke(IPC.absencesList, opts),
    create: (input) => invoke(IPC.absencesCreate, input),
    update: (id, input) => invoke(IPC.absencesUpdate, id, input),
    remove: (id) => invoke(IPC.absencesDelete, id)
  },
  taskTypes: {
    list: () => invoke(IPC.taskTypesList),
    create: (name) => invoke(IPC.taskTypesCreate, name),
    update: (id, input) => invoke(IPC.taskTypesUpdate, id, input),
    remove: (id) => invoke(IPC.taskTypesDelete, id),
    reorder: (orderedIds) => invoke(IPC.taskTypesReorder, orderedIds)
  },
  monitorings: {
    list: (opts) => invoke(IPC.monitoringsList, opts),
    get: (id) => invoke(IPC.monitoringsGet, id),
    create: (input) => invoke(IPC.monitoringsCreate, input),
    update: (id, input) => invoke(IPC.monitoringsUpdate, id, input),
    archive: (id) => invoke(IPC.monitoringsArchive, id)
  },
  edo: {
    list: (opts) => invoke(IPC.edoList, opts),
    get: (id) => invoke(IPC.edoGet, id),
    create: (input) => invoke(IPC.edoCreate, input),
    update: (id, input) => invoke(IPC.edoUpdate, id, input),
    offControl: (id) => invoke(IPC.edoOffControl, id),
    onControl: (id) => invoke(IPC.edoOnControl, id),
    archive: (id) => invoke(IPC.edoArchive, id)
  },
  workLog: {
    list: (entityType, entityId) => invoke(IPC.workLogList, entityType, entityId),
    create: (input) => invoke(IPC.workLogCreate, input),
    update: (id, input) => invoke(IPC.workLogUpdate, id, input),
    remove: (id) => invoke(IPC.workLogDelete, id)
  },
  tasks: {
    list: (opts) => invoke(IPC.tasksList, opts),
    get: (id) => invoke(IPC.tasksGet, id),
    create: (input) => invoke(IPC.tasksCreate, input),
    update: (id, input) => invoke(IPC.tasksUpdate, id, input),
    archive: (id) => invoke(IPC.tasksArchive, id),
    unarchive: (id) => invoke(IPC.tasksUnarchive, id)
  },
  checkItems: {
    list: (taskId) => invoke(IPC.checkItemsList, taskId),
    create: (taskId, title) => invoke(IPC.checkItemsCreate, taskId, title),
    update: (id, input) => invoke(IPC.checkItemsUpdate, id, input),
    remove: (id) => invoke(IPC.checkItemsDelete, id)
  },
  settings: {
    get: () => invoke(IPC.settingsGet),
    update: (patch) => invoke(IPC.settingsUpdate, patch)
  },
  dashboard: {
    get: () => invoke(IPC.dashboardGet)
  },
  search: {
    global: (query) => invoke(IPC.searchGlobal, query)
  },
  maintenance: {
    backupNow: () => invoke(IPC.backupNow),
    loadDemo: () => invoke(IPC.loadDemo),
    clearAll: () => invoke(IPC.clearAll)
  }
};
import_electron.contextBridge.exposeInMainWorld("api", api);
