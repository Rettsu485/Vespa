import type { Absence, AbsenceView, AppSettings, DashboardData, Department, DepartmentWithCount, EdoDocument, EdoDocumentView, Employee, EmployeeView, Monitoring, MonitoringView, SearchResult, Task, TaskCheckItem, TaskType, TaskView, WorkLogEntry } from './types';
export declare const IPC: {
    readonly departmentsList: "departments:list";
    readonly departmentsCreate: "departments:create";
    readonly departmentsUpdate: "departments:update";
    readonly departmentsDelete: "departments:delete";
    readonly employeesList: "employees:list";
    readonly employeesGet: "employees:get";
    readonly employeesCreate: "employees:create";
    readonly employeesUpdate: "employees:update";
    readonly employeesArchive: "employees:archive";
    readonly absencesList: "absences:list";
    readonly absencesCreate: "absences:create";
    readonly absencesUpdate: "absences:update";
    readonly absencesDelete: "absences:delete";
    readonly taskTypesList: "task-types:list";
    readonly taskTypesCreate: "task-types:create";
    readonly taskTypesUpdate: "task-types:update";
    readonly taskTypesDelete: "task-types:delete";
    readonly taskTypesReorder: "task-types:reorder";
    readonly monitoringsList: "monitorings:list";
    readonly monitoringsGet: "monitorings:get";
    readonly monitoringsCreate: "monitorings:create";
    readonly monitoringsUpdate: "monitorings:update";
    readonly monitoringsArchive: "monitorings:archive";
    readonly edoList: "edo:list";
    readonly edoGet: "edo:get";
    readonly edoCreate: "edo:create";
    readonly edoUpdate: "edo:update";
    readonly edoOffControl: "edo:off-control";
    readonly edoOnControl: "edo:on-control";
    readonly edoArchive: "edo:archive";
    readonly workLogList: "work-log:list";
    readonly workLogCreate: "work-log:create";
    readonly workLogUpdate: "work-log:update";
    readonly workLogDelete: "work-log:delete";
    readonly tasksList: "tasks:list";
    readonly tasksGet: "tasks:get";
    readonly tasksCreate: "tasks:create";
    readonly tasksUpdate: "tasks:update";
    readonly tasksArchive: "tasks:archive";
    readonly checkItemsList: "check-items:list";
    readonly checkItemsCreate: "check-items:create";
    readonly checkItemsUpdate: "check-items:update";
    readonly checkItemsDelete: "check-items:delete";
    readonly settingsGet: "settings:get";
    readonly settingsUpdate: "settings:update";
    readonly dashboardGet: "dashboard:get";
    readonly searchGlobal: "search:global";
    readonly backupNow: "backup:now";
    readonly loadDemo: "demo:load";
    readonly clearAll: "data:clear";
};
export type IpcApi = {
    departments: {
        list(): Promise<DepartmentWithCount[]>;
        create(input: {
            name: string;
            parent_id: number | null;
            sort_order: number;
        }): Promise<Department>;
        update(id: number, input: Partial<Pick<Department, 'name' | 'parent_id' | 'sort_order'>>): Promise<Department>;
        remove(id: number): Promise<void>;
    };
    employees: {
        list(opts: {
            includeArchived?: boolean;
        }): Promise<EmployeeView[]>;
        get(id: number): Promise<EmployeeView | null>;
        create(input: EmployeeInput): Promise<Employee>;
        update(id: number, input: Partial<EmployeeInput>): Promise<Employee>;
        archive(id: number, archived: boolean): Promise<void>;
    };
    absences: {
        list(opts: {
            employeeId?: number;
            fromDate?: string;
            toDate?: string;
        }): Promise<AbsenceView[]>;
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
        update(id: number, input: {
            log_date?: string;
            text?: string;
        }): Promise<WorkLogEntry>;
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
