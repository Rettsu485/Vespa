// Общие типы данных приложения «Штаб» (используются в main и renderer).

export type ThemeMode = 'system' | 'light' | 'dark';
export type TableDensity = 'compact' | 'normal';

/** Статус сотрудника — вычисляется на бэкенде, не хранится в БД. */
export type EmployeeStatusKind = 'work' | 'vacation' | 'business_trip' | 'sick' | 'other' | 'fired';

export interface EmployeeStatusInfo {
  kind: EmployeeStatusKind;
  label: string;
  /** Если статус задан отсутствием — период отсутствия. */
  absenceFrom?: string | null;
  absenceTo?: string | null;
}

export interface Department {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
}

export interface Absence {
  id: number;
  employee_id: number;
  absence_type: AbsenceType;
  date_from: string; // ISO yyyy-MM-dd
  date_to: string;
  note: string;
}

export const ABSENCE_TYPES = ['отпуск', 'командировка', 'больничный', 'иное'] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export interface Employee {
  id: number;
  full_name: string;
  department_id: number | null;
  position: string;
  internal_phone: string;
  mobile_phone: string;
  email: string;
  birthday: string | null; // ISO yyyy-MM-dd (год условный)
  functions: string;
  is_fired: boolean;
  fired_date: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Сотрудник + вычисляемые поля для отображения. */
export interface EmployeeView extends Employee {
  department_name: string | null;
  status: EmployeeStatusInfo;
  /** Дней до ближайшего дня рождения (0 = сегодня). null, если ДР не указан. */
  days_to_birthday: number | null;
  /** Ближайшее (или текущее) отсутствие. */
  next_absence: Absence | null;
}

export interface TaskType {
  id: number;
  name: string;
  sort_order: number;
  active: boolean;
}

export const MONITORING_STATUSES = ['в работе', 'приостановлено', 'выполнено', 'архив'] as const;
export type MonitoringStatus = (typeof MONITORING_STATUSES)[number];

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
  /** Исполнитель отсутствует сейчас (по absences) и дублёр не назначен. */
  red_flag: boolean;
  /** Дублёр актуален сегодня (в период deputy_from..deputy_to или период не задан). */
  deputy_active: boolean;
}

export const CONTROL_TYPES = ['red', 'green'] as const;
export type ControlType = (typeof CONTROL_TYPES)[number];

export const APPROVAL_STATUSES = ['на согласовании', 'на подписи', 'подписан'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

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
  /** Осталось дней (deadline − сегодня). null, если срок не задан или снят с контроля. */
  days_left: number | null;
  resolved_url: string | null; // по шаблону из настроек либо doc_url
}

export const LOG_ENTITY_TYPES = ['edo', 'task'] as const;
export type LogEntityType = (typeof LOG_ENTITY_TYPES)[number];

export interface WorkLogEntry {
  id: number;
  entity_type: LogEntityType;
  entity_id: number;
  log_date: string;
  text: string;
  created_at: string;
}

export const TASK_PRIORITIES = ['срочно', 'высокий', 'обычный', 'низкий'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['входящая', 'в работе', 'ожидание', 'на проверке', 'выполнено', 'отменено'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

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

export interface TaskCheckItem {
  id: number;
  task_id: number;
  title: string;
  done: boolean;
  sort_order: number;
}

export interface TaskView extends Task {
  items_total: number;
  items_done: number;
  /** Доля выполненных пунктов 0..1 */
  progress: number;
  days_left: number | null;
  /** Дней с последнего обновления (work_log / чек-лист / изменении). */
  days_since_update: number | null;
  stale: boolean; // 9+ дней без обновлений у активной задачи
  /** Задача вернулась из ожидания сегодня (wait_until == сегодня). */
  returned_today: boolean;
}

export interface AppSettings {
  theme: ThemeMode;
  tableDensity: TableDensity;
  controlRedName: string;
  controlGreenName: string;
  edoLinkTemplate: string; // https://sed.example.ru/doc/{номер}
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  tableDensity: 'normal',
  controlRedName: 'Красный',
  controlGreenName: 'Зелёный',
  edoLinkTemplate: 'https://sed.example.ru/doc/{номер}',
};

/** Глобальный поиск (Ctrl+K). */
export type SearchEntity = 'employee' | 'monitoring' | 'edo' | 'task';

export interface SearchResultItem {
  entity: SearchEntity;
  id: number;
  title: string;
  subtitle: string;
}

export interface SearchResults {
  employees: SearchResultItem[];
  monitorings: SearchResultItem[];
  edo: SearchResultItem[];
  tasks: SearchResultItem[];
}

/** Дашборд «Сегодня». */
export interface DashboardData {
  counters: {
    overdue: number;
    today: number;
    next3: number;
    returnedToday: number;
  };
  edoHot: EdoDocumentView[]; // просрочено и <=3 дней, не снятые с контроля
  monitoringRedFlags: MonitoringView[];
  birthdaysSoon: EmployeeView[];
  returningSoon: Array<{ employee: EmployeeView; absence: Absence }>;
  returnedTasks: TaskView[];
}
