export type MonitoringStatus = 'в работе' | 'приостановлено' | 'выполнено' | 'архив';
export declare const MONITORING_STATUSES: readonly MonitoringStatus[];
export type AbsenceType = 'отпуск' | 'командировка' | 'больничный' | 'иное';
export declare const ABSENCE_TYPES: readonly AbsenceType[];
export type ControlType = 'red' | 'green';
export type ApprovalStatus = 'на согласовании' | 'на подписи' | 'подписан';
export declare const APPROVAL_STATUSES: readonly ApprovalStatus[];
export type TaskPriority = 'срочно' | 'высокий' | 'обычный' | 'низкий';
export declare const TASK_PRIORITIES: readonly TaskPriority[];
export type TaskStatus = 'входящая' | 'в работе' | 'ожидание' | 'на проверке' | 'выполнено' | 'отменено';
export declare const TASK_STATUSES: readonly TaskStatus[];
/** Статус сотрудника — вычисляется на бэкенде, не хранится в БД. */
export type EmployeeComputedStatus = {
    kind: 'fired';
} | {
    kind: 'at_work';
} | {
    kind: 'absent';
    absence_type: AbsenceType;
    date_from: string;
    date_to: string;
};
export interface Department {
    id: number;
    name: string;
    parent_id: number | null;
    sort_order: number;
}
export interface DepartmentWithCount extends Department {
    employee_count: number;
}
export interface Employee {
    id: number;
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
    archived: boolean;
    created_at: string;
    updated_at: string;
}
/** Сотрудник + вычисленные поля для UI. */
export interface EmployeeView extends Employee {
    department_name: string | null;
    status: EmployeeComputedStatus;
    days_to_birthday: number | null;
    next_vacation: {
        date_from: string;
        date_to: string;
        note: string;
    } | null;
}
export interface Absence {
    id: number;
    employee_id: number;
    absence_type: AbsenceType;
    date_from: string;
    date_to: string;
    note: string;
}
export interface AbsenceView extends Absence {
    employee_name: string;
}
export interface TaskType {
    id: number;
    name: string;
    sort_order: number;
    active: boolean;
}
export interface Monitoring {
    id: number;
    name: string;
    type_id: number;
    employee_id: number;
    deadline: string | null;
    note: string;
    status: MonitoringStatus;
    deputy_employee_id: number | null;
    deputy_from: string | null;
    deputy_to: string | null;
    created_at: string;
    updated_at: string;
}
export interface MonitoringView extends Monitoring {
    type_name: string;
    employee_name: string;
    deputy_name: string | null;
    /** true, если исполнитель сейчас отсутствует, а дублёр не назначен. */
    red_flag: boolean;
    /** true, если дублёр назначен и период дублирования активен сегодня. */
    deputy_active: boolean;
}
export interface EdoDocument {
    id: number;
    doc_number: string;
    doc_url: string;
    summary: string;
    instruction: string;
    responsible_id: number | null;
    participants: string;
    control_type: ControlType;
    deadline: string | null;
    off_control: boolean;
    off_control_date: string | null;
    sub_resolution: string;
    approval_number: string;
    approval_url: string;
    approval_status: ApprovalStatus | '';
    archived: boolean;
    created_at: string;
    updated_at: string;
}
export interface EdoDocumentView extends EdoDocument {
    responsible_name: string | null;
    /** Осталось дней (deadline − сегодня); null, если срок не задан или снят с контроля. */
    days_left: number | null;
    /** Готовая ссылка: из шаблона настроек по номеру, иначе doc_url. */
    link: string | null;
}
export type WorkLogEntity = 'edo' | 'task';
export interface WorkLogEntry {
    id: number;
    entity_type: WorkLogEntity;
    entity_id: number;
    log_date: string;
    text: string;
    created_at: string;
}
export interface TaskCheckItem {
    id: number;
    task_id: number;
    title: string;
    done: boolean;
    sort_order: number;
}
export interface Task {
    id: number;
    theme: string;
    title: string;
    priority: TaskPriority;
    deadline: string | null;
    status: TaskStatus;
    wait_until: string | null;
    next_action: string;
    participants: string;
    note: string;
    archived: boolean;
    created_at: string;
    updated_at: string;
}
export interface TaskView extends Task {
    days_left: number | null;
    check_total: number;
    check_done: number;
    progress: number;
    /** Задача «спит» до wait_until (статус ожидание, дата в будущем). */
    sleeping: boolean;
    /** Активная задача без обновлений work_log/чек-листа 9+ дней. */
    stale: boolean;
}
export interface AppSettings {
    theme: 'system' | 'light' | 'dark';
    density: 'compact' | 'normal';
    controlRedName: string;
    controlGreenName: string;
    edoLinkTemplate: string;
}
export declare const DEFAULT_SETTINGS: AppSettings;
export interface DashboardData {
    overdue_edo: EdoDocumentView[];
    due_today_edo: EdoDocumentView[];
    due_next3_edo: EdoDocumentView[];
    returned_tasks: TaskView[];
    monitoring_red_flags: MonitoringView[];
    upcoming_birthdays: EmployeeView[];
    returning_from_absence: {
        employee: EmployeeView;
        absence: AbsenceView;
    }[];
    counters: {
        overdue: number;
        today: number;
        next3: number;
        returned: number;
    };
}
export interface SearchResult {
    employees: EmployeeView[];
    monitorings: MonitoringView[];
    documents: EdoDocumentView[];
    tasks: TaskView[];
}
