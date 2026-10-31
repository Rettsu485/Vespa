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

export type ApiMethodName = keyof typeof apiMethodsList;

/** Перечень методов — единый источник правды для main и preload. */
export const apiMethodsList = {
  // Настройки
  settingsGet: () => undefined,
  settingsSet: (_patch: Partial<AppSettings>) => undefined,

  // Команда
  departmentList: () => undefined,
  departmentTree: () => undefined,
  departmentCreate: (_input: DepartmentInput) => undefined,
  departmentUpdate: (_id: number, _input: DepartmentInput) => undefined,
  departmentDelete: (_id: number) => undefined,
  employeeList: (_opts: { includeArchived: boolean }) => undefined,
  employeeGet: (_id: number) => undefined,
  employeeCreate: (_input: EmployeeInput) => undefined,
  employeeUpdate: (_id: number, _input: EmployeeInput) => undefined,
  employeeArchive: (_id: number, _archived: boolean) => undefined,
  absenceListByEmployee: (_employeeId: number) => undefined,
  absenceCreate: (_input: AbsenceInput) => undefined,
  absenceUpdate: (_id: number, _input: AbsenceInput) => undefined,
  absenceDelete: (_id: number) => undefined,
  absenceTimeline: (_daysAhead: number) => undefined,

  // Мониторинги
  taskTypeList: (_opts?: { includeInactive?: boolean }) => undefined,
  taskTypeCreate: (_input: TaskTypeInput) => undefined,
  taskTypeUpdate: (_id: number, _input: TaskTypeInput) => undefined,
  taskTypeDelete: (_id: number) => undefined,
  taskTypeReorder: (_orderedIds: number[]) => undefined,
  monitoringList: (_opts: { typeId?: number | null; employeeId?: number | null; status?: string | null; includeArchived?: boolean }) => undefined,
  monitoringGet: (_id: number) => undefined,
  monitoringCreate: (_input: MonitoringInput) => undefined,
  monitoringUpdate: (_id: number, _input: MonitoringInput) => undefined,
  monitoringArchive: (_id: number) => undefined,

  // ЭДО
  edoList: (_opts: {
    controlType?: string | null;
    offControl?: 'all' | 'on' | 'off';
    responsibleId?: number | null;
    approvalStatus?: string | null;
    burning?: boolean;
    includeArchived?: boolean;
  }) => undefined,
  edoGet: (_id: number) => undefined,
  edoCreate: (_input: EdoDocumentInput) => undefined,
  edoUpdate: (_id: number, _input: EdoDocumentInput) => undefined,
  edoSetOffControl: (_id: number, _off: boolean) => undefined,
  edoArchive: (_id: number) => undefined,

  // Журнал проделанной работы
  workLogList: (_entityType: 'edo' | 'task', _entityId: number) => undefined,
  workLogAdd: (_input: WorkLogInput) => undefined,
  workLogDelete: (_id: number) => undefined,

  // Задачи
  taskList: (_opts: { includeArchived?: boolean; status?: string | null }) => undefined,
  taskGet: (_id: number) => undefined,
  taskCreate: (_input: TaskInput) => undefined,
  taskUpdate: (_id: number, _input: TaskInput) => undefined,
  taskSetStatus: (_id: number, _status: string) => undefined,
  taskArchive: (_id: number) => undefined,
  checkItemList: (_taskId: number) => undefined,
  checkItemCreate: (_input: CheckItemInput) => undefined,
  checkItemUpdate: (_id: number, _patch: Partial<CheckItemInput>) => undefined,
  checkItemDelete: (_id: number) => undefined,

  // Дашборд / поиск / обслуживание
  dashboardGet: () => undefined,
  searchGlobal: (_query: string) => undefined,
  backupNow: () => undefined,
  demoLoad: () => undefined,
  wipeAll: () => undefined,
} satisfies Record<string, (...args: never[]) => never>;

/** Типы возвращаемых значений методов (для строгой типизации клиента). */
export interface ApiReturnTypes {
  settingsGet: AppSettings;
  settingsSet: AppSettings;

  departmentList: Department[];
  departmentTree: DepartmentNode[];
  departmentCreate: Department;
  departmentUpdate: Department;
  departmentDelete: void;
  employeeList: EmployeeView[];
  employeeGet: EmployeeView | null;
  employeeCreate: EmployeeView;
  employeeUpdate: EmployeeView;
  employeeArchive: EmployeeView;
  absenceListByEmployee: Absence[];
  absenceCreate: Absence;
  absenceUpdate: Absence;
  absenceDelete: void;
  absenceTimeline: AbsenceTimelineItem[];

  taskTypeList: TaskType[];
  taskTypeCreate: TaskType;
  taskTypeUpdate: TaskType;
  taskTypeDelete: void;
  taskTypeReorder: void;
  monitoringList: MonitoringView[];
  monitoringGet: MonitoringView | null;
  monitoringCreate: MonitoringView;
  monitoringUpdate: MonitoringView;
  monitoringArchive: MonitoringView;

  edoList: EdoDocumentView[];
  edoGet: EdoDocumentView | null;
  edoCreate: EdoDocumentView;
  edoUpdate: EdoDocumentView;
  edoSetOffControl: EdoDocumentView;
  edoArchive: EdoDocumentView;

  workLogList: WorkLogEntry[];
  workLogAdd: WorkLogEntry;
  workLogDelete: void;

  taskList: TaskView[];
  taskGet: TaskView | null;
  taskCreate: TaskView;
  taskUpdate: TaskView;
  taskSetStatus: TaskView;
  taskArchive: TaskView;
  checkItemList: TaskCheckItem[];
  checkItemCreate: TaskCheckItem;
  checkItemUpdate: TaskCheckItem;
  checkItemDelete: void;

  dashboardGet: DashboardData;
  searchGlobal: SearchResults;
  backupNow: string;
  demoLoad: void;
  wipeAll: void;
}

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
