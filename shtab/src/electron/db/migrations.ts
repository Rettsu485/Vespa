// Миграции схемы: простые SQL-скрипты, выполняемые по версии схемы (user_version).

export interface Migration {
  version: number;
  sql: string;
}

const m1 = `
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES departments(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  position TEXT NOT NULL DEFAULT '',
  internal_phone TEXT NOT NULL DEFAULT '',
  mobile_phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  birthday TEXT,
  functions TEXT NOT NULL DEFAULT '',
  is_fired INTEGER NOT NULL DEFAULT 0,
  fired_date TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE absences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  absence_type TEXT NOT NULL CHECK (absence_type IN ('отпуск','командировка','больничный','иное')),
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_absences_employee ON absences(employee_id);
CREATE INDEX idx_absences_dates ON absences(date_from, date_to);

CREATE TABLE task_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE monitorings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type_id INTEGER NOT NULL REFERENCES task_types(id),
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  deadline TEXT,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'в работе' CHECK (status IN ('в работе','приостановлено','выполнено','архив')),
  deputy_employee_id INTEGER REFERENCES employees(id),
  deputy_from TEXT,
  deputy_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_monitorings_employee ON monitorings(employee_id);

CREATE TABLE edo_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_number TEXT NOT NULL,
  doc_url TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  instruction TEXT NOT NULL DEFAULT '',
  responsible_id INTEGER REFERENCES employees(id),
  participants TEXT NOT NULL DEFAULT '',
  control_type TEXT NOT NULL DEFAULT 'green' CHECK (control_type IN ('red','green')),
  deadline TEXT,
  off_control INTEGER NOT NULL DEFAULT 0,
  off_control_date TEXT,
  sub_resolution TEXT NOT NULL DEFAULT '',
  approval_number TEXT NOT NULL DEFAULT '',
  approval_url TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT '' CHECK (approval_status IN ('','на согласовании','на подписи','подписан')),
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE work_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('edo','task')),
  entity_id INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_worklog_entity ON work_log(entity_type, entity_id);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'обычный' CHECK (priority IN ('срочно','высокий','обычный','низкий')),
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'входящая' CHECK (status IN ('входящая','в работе','ожидание','на проверке','выполнено','отменено')),
  wait_until TEXT,
  next_action TEXT NOT NULL DEFAULT '',
  participants TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE task_check_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_checkitems_task ON task_check_items(task_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const m2 = `
-- Справочник типов задач мониторинга по умолчанию.
INSERT INTO task_types (name, sort_order, active) VALUES
  ('Мониторинг', 1, 1),
  ('Письмо', 2, 1),
  ('Таблица', 3, 1);
`;

export const migrations: Migration[] = [
  { version: 1, sql: m1 },
  { version: 2, sql: m2 },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;
