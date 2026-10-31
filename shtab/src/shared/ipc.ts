// Контракт типизированного IPC между main и renderer.

import type {
  Absence,
  AbsenceType,
  AppSettings,
  DashboardData,
  Department,
  DepartmentNode,
  EdoDocument,
  EdoDocumentView,
  Employee,
  EmployeeView,
  Monitoring,
  MonitoringView,
  SearchResults,
  Task,
  TaskCheckItem,
  TaskType,
  TaskView,
  WorkLogEntry,
} from './types';

export const IPC_CHANNEL = 'shtab:api';

export interface IpcRequest {
  callId: string;
  method: ApiMethodName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
}

export interface IpcResponseOk {
  callId: string;
  ok: true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
}

export interface IpcResponseErr {
  callId: string;
  ok: false;
  error: string;
}

export type IpcResponse = IpcResponseOk | IpcResponseErr;

/** DTO для создания/обновления (id и служебные поля исключены). */
export type EmployeeInput = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;
export type DepartmentInput = Omit<Department, 'id'>;
export type AbsenceInput = Omit<Absence, 'id'>;
export type TaskTypeInput = Omit<TaskType, 'id'>;
export type MonitoringInput = Omit<Monitoring, 'id' | 'created_at' | 'updated_at'>;
export type EdoDocumentInput = Omit<EdoDocument, 'id' | 'created_at' | 'updated_at'>;
export type WorkLogInput = Omit<WorkLogEntry, 'id' | 'created_at'>;
export type TaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at'>;
export type CheckItemInput = Omit<TaskCheckItem, 'id'>;

export interface AbsenceTimelineItem {
  employee_id: number;
  employee_name: string;
  absence_type: AbsenceType;
  date_from: string;
  date_to: string;
  note: string;
}

export type ApiMethodName = keyof ApiMethods;

/** Перечень методов — единый источник правды для main и preload. */
export interface ApiMethods {
  // Настройки
  settingsGet: () => AppSettings;
  settingsSet: (patch: Partial<AppSettings>) => AppSettings;

  // Команда
  departmentList: () => Department[];
  departmentTree: () => DepartmentNode[];
  departmentCreate: (input: DepartmentInput) => Department;
  departmentUpdate: (id: number, input: DepartmentInput) => Department;
  departmentDelete: (id: number) => void;
  employeeList: (opts: { includeArchived: boolean }) => EmployeeView[];
  employeeGet: (id: number) => EmployeeView | null;
  employeeCreate: (input: EmployeeInput) => EmployeeView;
  employeeUpdate: (id: number, input: EmployeeInput) => EmployeeView;
  employeeArchive: (id: number, archived: boolean) => EmployeeView;
  absenceListByEmployee: (employeeId: number) => Absence[];
  absenceCreate: (input: AbsenceInput) => Absence;
  absenceUpdate: (id: number, input: AbsenceInput) => Absence;
  absenceDelete: (id: number) => void;
  absenceTimeline: (daysAhead: number) => AbsenceTimelineItem[];

  // Мониторинги
  taskTypeList: (opts?: { includeInactive?: boolean }) => TaskType[];
  taskTypeCreate: (input: TaskTypeInput) => TaskType;
  taskTypeUpdate: (id: number, input: TaskTypeInput) => TaskType;
  taskTypeDelete: (id: number) => void;
  taskTypeReorder: (orderedIds: number[]) => void;
  monitoringList: (opts: { typeId?: number | null; employeeId?: number | null; status?: string | null; includeArchived?: boolean }) => MonitoringView[];
  monitoringGet: (id: number) => MonitoringView | null;
  monitoringCreate: (input: MonitoringInput) => MonitoringView;
  monitoringUpdate: (id: number, input: MonitoringInput) => MonitoringView;
  monitoringArchive: (id: number) => MonitoringView;

  // ЭДО
  edoList: (opts: {
    controlType?: string | null;
    offControl?: 'all' | 'on' | 'off';
    responsibleId?: number | null;
    approvalStatus?: string | null;
    burning?: boolean;
    includeArchived?: boolean;
  }) => EdoDocumentView[];
  edoGet: (id: number) => EdoDocumentView | null;
  edoCreate: (input: EdoDocumentInput) => EdoDocumentView;
  edoUpdate: (id: number, input: EdoDocumentInput) => EdoDocumentView;
  edoSetOffControl: (id: number, off: boolean) => EdoDocumentView;
  edoArchive: (id: number) => EdoDocumentView;

  // Журнал проделанной работы
  workLogList: (entityType: 'edo' | 'task', entityId: number) => WorkLogEntry[];
  workLogAdd: (input: WorkLogInput) => WorkLogEntry;
  workLogDelete: (id: number) => void;

  // Задачи
  taskList: (opts: { includeArchived?: boolean; status?: string | null }) => TaskView[];
  taskGet: (id: number) => TaskView | null;
  taskCreate: (input: TaskInput) => TaskView;
  taskUpdate: (id: number, input: TaskInput) => TaskView;
  taskSetStatus: (id: number, status: string) => TaskView;
  taskArchive: (id: number) => TaskView;
  checkItemList: (taskId: number) => TaskCheckItem[];
  checkItemCreate: (input: CheckItemInput) => TaskCheckItem;
  checkItemUpdate: (id: number, patch: Partial<CheckItemInput>) => TaskCheckItem;
  checkItemDelete: (id: number) => void;

  // Дашборд / поиск / обслуживание
  dashboardGet: () => DashboardData;
  searchGlobal: (query: string) => SearchResults;
  backupNow: () => string;
  demoLoad: () => void;
  wipeAll: () => void;
}

/** Список имён методов (runtime-данные для preload; порядок = порядок объявления). */
export const METHOD_NAMES: ApiMethodName[] = [
  'settingsGet', 'settingsSet',
  'departmentList', 'departmentTree', 'departmentCreate', 'departmentUpdate', 'departmentDelete',
  'employeeList', 'employeeGet', 'employeeCreate', 'employeeUpdate', 'employeeArchive',
  'absenceListByEmployee', 'absenceCreate', 'absenceUpdate', 'absenceDelete', 'absenceTimeline',
  'taskTypeList', 'taskTypeCreate', 'taskTypeUpdate', 'taskTypeDelete', 'taskTypeReorder',
  'monitoringList', 'monitoringGet', 'monitoringCreate', 'monitoringUpdate', 'monitoringArchive',
  'edoList', 'edoGet', 'edoCreate', 'edoUpdate', 'edoSetOffControl', 'edoArchive',
  'workLogList', 'workLogAdd', 'workLogDelete',
  'taskList', 'taskGet', 'taskCreate', 'taskUpdate', 'taskSetStatus', 'taskArchive',
  'checkItemList', 'checkItemCreate', 'checkItemUpdate', 'checkItemDelete',
  'dashboardGet', 'searchGlobal', 'backupNow', 'demoLoad', 'wipeAll',
];

/** Клиентский API (window.api в renderer). */
export interface ShtabApi {
  settingsGet(): Promise<AppSettings>;
  settingsSet(patch: Partial<AppSettings>): Promise<AppSettings>;

  departmentList(): Promise<Department[]>;
  departmentTree(): Promise<DepartmentNode[]>;
  departmentCreate(input: DepartmentInput): Promise<Department>;
  departmentUpdate(id: number, input: DepartmentInput): Promise<Department>;
  departmentDelete(id: number): Promise<void>;
  employeeList(opts: { includeArchived: boolean }): Promise<EmployeeView[]>;
  employeeGet(id: number): Promise<EmployeeView | null>;
  employeeCreate(input: EmployeeInput): Promise<EmployeeView>;
  employeeUpdate(id: number, input: EmployeeInput): Promise<EmployeeView>;
  employeeArchive(id: number, archived: boolean): Promise<EmployeeView>;
  absenceListByEmployee(employeeId: number): Promise<Absence[]>;
  absenceCreate(input: AbsenceInput): Promise<Absence>;
  absenceUpdate(id: number, input: AbsenceInput): Promise<Absence>;
  absenceDelete(id: number): Promise<void>;
  absenceTimeline(daysAhead: number): Promise<AbsenceTimelineItem[]>;

  taskTypeList(opts?: { includeInactive?: boolean }): Promise<TaskType[]>;
  taskTypeCreate(input: TaskTypeInput): Promise<TaskType>;
  taskTypeUpdate(id: number, input: TaskTypeInput): Promise<TaskType>;
  taskTypeDelete(id: number): Promise<void>;
  taskTypeReorder(orderedIds: number[]): Promise<void>;
  monitoringList(opts: { typeId?: number | null; employeeId?: number | null; status?: string | null; includeArchived?: boolean }): Promise<MonitoringView[]>;
  monitoringGet(id: number): Promise<MonitoringView | null>;
  monitoringCreate(input: MonitoringInput): Promise<MonitoringView>;
  monitoringUpdate(id: number, input: MonitoringInput): Promise<MonitoringView>;
  monitoringArchive(id: number): Promise<MonitoringView>;

  edoList(opts: {
    controlType?: string | null;
    offControl?: 'all' | 'on' | 'off';
    responsibleId?: number | null;
    approvalStatus?: string | null;
    burning?: boolean;
    includeArchived?: boolean;
  }): Promise<EdoDocumentView[]>;
  edoGet(id: number): Promise<EdoDocumentView | null>;
  edoCreate(input: EdoDocumentInput): Promise<EdoDocumentView>;
  edoUpdate(id: number, input: EdoDocumentInput): Promise<EdoDocumentView>;
  edoSetOffControl(id: number, off: boolean): Promise<EdoDocumentView>;
  edoArchive(id: number): Promise<EdoDocumentView>;

  workLogList(entityType: 'edo' | 'task', entityId: number): Promise<WorkLogEntry[]>;
  workLogAdd(input: WorkLogInput): Promise<WorkLogEntry>;
  workLogDelete(id: number): Promise<void>;

  taskList(opts: { includeArchived?: boolean; status?: string | null }): Promise<TaskView[]>;
  taskGet(id: number): Promise<TaskView | null>;
  taskCreate(input: TaskInput): Promise<TaskView>;
  taskUpdate(id: number, input: TaskInput): Promise<TaskView>;
  taskSetStatus(id: number, status: string): Promise<TaskView>;
  taskArchive(id: number): Promise<TaskView>;
  checkItemList(taskId: number): Promise<TaskCheckItem[]>;
  checkItemCreate(input: CheckItemInput): Promise<TaskCheckItem>;
  checkItemUpdate(id: number, patch: Partial<CheckItemInput>): Promise<TaskCheckItem>;
  checkItemDelete(id: number): Promise<void>;

  dashboardGet(): Promise<DashboardData>;
  searchGlobal(query: string): Promise<SearchResults>;
  backupNow(): Promise<string>;
  demoLoad(): Promise<void>;
  wipeAll(): Promise<void>;
}
