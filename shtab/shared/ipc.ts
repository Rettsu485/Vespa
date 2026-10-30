// Типизированный контракт IPC: каналы и сигнатуры методов api, доступного renderer-процессу.
import type {
  Absence,
  AbsenceView,
  AppSettings,
  DashboardData,
  Department,
  DepartmentWithCount,
  EdoDocument,
  EdoDocumentView,
  Employee,
  EmployeeView,
  Monitoring,
  MonitoringView,
  SearchResult,
  Task,
  TaskCheckItem,
  TaskType,
  WorkLogEntry,
} from './types';

export const IPC = {
  departmentsList: 'departments:list',
  departmentsCreate: 'departments:create',
  departmentsUpdate: 'departments:update',
  departmentsDelete: 'departments:delete',

  employeesList: 'employees:list',
  employeesGet: 'employees:get',
  employeesCreate: 'employees:create',
  employeesUpdate: 'employees:update',
  employeesArchive: 'employees:archive',

  absencesList: 'absences:list',
  absencesCreate: 'absences:create',
  absencesUpdate: 'absences:update',
  absencesDelete: 'absences:delete',

  taskTypesList: 'task-types:list',
  taskTypesCreate: 'task-types:create',
  taskTypesUpdate: 'task-types:update',
  taskTypesDelete: 'task-types:delete',
  taskTypesReorder: 'task-types:reorder',

  monitoringsList: 'monitorings:list',
  monitoringsGet: 'monitorings:get',
  monitoringsCreate: 'monitorings:create',
  monitoringsUpdate: 'monitorings:update',
  monitoringsArchive: 'monitorings:archive',

  edoList: 'edo:list',
  edoGet: 'edo:get',
  edoCreate: 'edo:create',
  edoUpdate: 'edo:update',
  edoOffControl: 'edo:off-control',
  edoOnControl: 'edo:on-control',
  edoArchive: 'edo:archive',

  workLogList: 'work-log:list',
  workLogCreate: 'work-log:create',
  workLogUpdate: 'work-log:update',
  workLogDelete: 'work-log:delete',

  tasksList: 'tasks:list',
  tasksGet: 'tasks:get',
  tasksCreate: 'tasks:create',
  tasksUpdate: 'tasks:update',
  tasksArchive: 'tasks:archive',

  checkItemsList: 'check-items:list',
  checkItemsCreate: 'check-items:create',
  checkItemsUpdate: 'check-items:update',
  checkItemsDelete: 'check-items:delete',

  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',

  dashboardGet: 'dashboard:get',
  searchGlobal: 'search:global',

  backupNow: 'backup:now',
  loadDemo: 'demo:load',
  clearAll: 'data:clear',
} as const;

export type IpcApi = {
  departments: {
    list(): Promise<DepartmentWithCount[]>;
    create(input: { name: string; parent_id: number | null; sort_order: number }): Promise<Department>;
    update(id: number, input: Partial<Pick<Department, 'name' | 'parent_id' | 'sort_order'>>): Promise<Department>;
    remove(id: number): Promise<void>;
  };
  employees: {
    list(opts: { includeArchived?: boolean }): Promise<EmployeeView[]>;
    get(id: number): Promise<EmployeeView | null>;
    create(input: EmployeeInput): Promise<Employee>;
    update(id: number, input: Partial<EmployeeInput>): Promise<Employee>;
    archive(id: number, archived: boolean): Promise<void>;
  };
  absences: {
    list(opts: { employeeId?: number; fromDate?: string; toDate?: string }): Promise<AbsenceView[]>;
    create(input: Omit<Absence, 'id'>): Promise<Absence>;
    update(id: number, input: Partial<Omit<Absence, 'id'>>): Promise<Absence>;
    remove(id: number): Promise<void>;
  };
  taskTypes: {
    list(): Promise<TaskType[]>;
    create(name: string): Promise<TaskType>;
    update(id: number, input: Partial<Pick<TaskType, 'name' | 'active'>>): Promise<TaskType>;
    remove(id: number): Promise<void>;
    reorder(orderedIds: number[]): Promise<void>;
  };
  monitorings: {
    list(opts: MonitoringListOpts): Promise<MonitoringView[]>;
    get(id: number): Promise<MonitoringView | null>;
    create(input: MonitoringInput): Promise<Monitoring>;
    update(id: number, input: Partial<MonitoringInput>): Promise<Monitoring>;
    archive(id: number): Promise<void>;
  };
  edo: {
    list(opts: EdoListOpts): Promise<EdoDocumentView[]>;
    get(id: number): Promise<EdoDocumentView | null>;
    create(input: EdoInput): Promise<EdoDocument>;
    update(id: number, input: Partial<EdoInput>): Promise<EdoDocument>;
    offControl(id: number): Promise<void>;
    onControl(id: number): Promise<void>;
    archive(id: number): Promise<void>;
  };
  workLog: {
    list(entityType: 'edo' | 'task', entityId: number): Promise<WorkLogEntry[]>;
    create(input: Omit<WorkLogEntry, 'id' | 'created_at'>): Promise<WorkLogEntry>;
    update(id: number, input: { log_date?: string; text?: string }): Promise<WorkLogEntry>;
    remove(id: number): Promise<void>;
  };
  tasks: {
    list(opts: TaskListOpts): Promise<TaskView[]>;
    get(id: number): Promise<TaskView | null>;
    create(input: TaskInput): Promise<Task>;
    update(id: number, input: Partial<TaskInput>): Promise<Task>;
    archive(id: number): Promise<void>;
  };
  checkItems: {
    list(taskId: number): Promise<TaskCheckItem[]>;
    create(taskId: number, title: string): Promise<TaskCheckItem>;
    update(id: number, input: Partial<Pick<TaskCheckItem, 'title' | 'done'>>): Promise<TaskCheckItem>;
    remove(id: number): Promise<void>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  dashboard: {
    get(): Promise<DashboardData>;
  };
  search: {
    global(query: string): Promise<SearchResult>;
  };
  maintenance: {
    backupNow(): Promise<string>;
    loadDemo(): Promise<void>;
    clearAll(): Promise<void>;
  };
};

export interface EmployeeInput {
  full_name: string;
  department_id: number | null;
  position: string;
  internal_phone: string;
  mobile_phone: string;
  email: string;
  birthday: string | null;
  functions: string;
  is_fired: boolean;
  fired_date: string | null;
}

export interface MonitoringInput {
  name: string;
  type_id: number;
  employee_id: number;
  deadline: string | null;
  note: string;
  status: Monitoring['status'];
  deputy_employee_id: number | null;
  deputy_from: string | null;
  deputy_to: string | null;
}

export interface MonitoringListOpts {
  typeId?: number | null;
  employeeId?: number | null;
  status?: Monitoring['status'] | null;
  includeArchived?: boolean;
}

export interface EdoListOpts {
  controlType?: 'red' | 'green' | null;
  offControl?: 'all' | 'on' | 'off';
  responsibleId?: number | null;
  approvalStatus?: string | null;
  burningOnly?: boolean;
  includeArchived?: boolean;
}

export interface EdoInput {
  doc_number: string;
  doc_url: string;
  summary: string;
  instruction: string;
  responsible_id: number | null;
  participants: string;
  control_type: 'red' | 'green';
  deadline: string | null;
  sub_resolution: string;
  approval_number: string;
  approval_url: string;
  approval_status: '' | 'на согласовании' | 'на подписи' | 'подписан';
}

export interface TaskInput {
  theme: string;
  title: string;
  priority: Task['priority'];
  deadline: string | null;
  status: Task['status'];
  wait_until: string | null;
  next_action: string;
  participants: string;
  note: string;
}

export interface TaskListOpts {
  status?: Task['status'] | null;
  includeArchived?: boolean;
}
