"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/electron/db/database.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_node_path = __toESM(require("node:path"));
var import_node_fs = __toESM(require("node:fs"));

// src/electron/db/migrations.ts
var m1 = `
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
  absence_type TEXT NOT NULL CHECK (absence_type IN ('\u043E\u0442\u043F\u0443\u0441\u043A','\u043A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043A\u0430','\u0431\u043E\u043B\u044C\u043D\u0438\u0447\u043D\u044B\u0439','\u0438\u043D\u043E\u0435')),
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
  status TEXT NOT NULL DEFAULT '\u0432 \u0440\u0430\u0431\u043E\u0442\u0435' CHECK (status IN ('\u0432 \u0440\u0430\u0431\u043E\u0442\u0435','\u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E','\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E','\u0430\u0440\u0445\u0438\u0432')),
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
  approval_status TEXT NOT NULL DEFAULT '' CHECK (approval_status IN ('','\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438','\u043D\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u0438','\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D')),
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
  priority TEXT NOT NULL DEFAULT '\u043E\u0431\u044B\u0447\u043D\u044B\u0439' CHECK (priority IN ('\u0441\u0440\u043E\u0447\u043D\u043E','\u0432\u044B\u0441\u043E\u043A\u0438\u0439','\u043E\u0431\u044B\u0447\u043D\u044B\u0439','\u043D\u0438\u0437\u043A\u0438\u0439')),
  deadline TEXT,
  status TEXT NOT NULL DEFAULT '\u0432\u0445\u043E\u0434\u044F\u0449\u0430\u044F' CHECK (status IN ('\u0432\u0445\u043E\u0434\u044F\u0449\u0430\u044F','\u0432 \u0440\u0430\u0431\u043E\u0442\u0435','\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435','\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435','\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E','\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E')),
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
var m2 = `
-- \u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u0442\u0438\u043F\u043E\u0432 \u0437\u0430\u0434\u0430\u0447 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E.
INSERT INTO task_types (name, sort_order, active) VALUES
  ('\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433', 1, 1),
  ('\u041F\u0438\u0441\u044C\u043C\u043E', 2, 1),
  ('\u0422\u0430\u0431\u043B\u0438\u0446\u0430', 3, 1);
`;
var migrations = [
  { version: 1, sql: m1 },
  { version: 2, sql: m2 }
];
var LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;

// src/electron/db/database.ts
function typed(db2) {
  return db2;
}
var dbInstance = null;
var dbFilePath = "";
function initDatabase(userDataDir) {
  if (dbInstance) return dbInstance;
  import_node_fs.default.mkdirSync(userDataDir, { recursive: true });
  dbFilePath = import_node_path.default.join(userDataDir, "shtab.sqlite");
  dbInstance = new import_better_sqlite3.default(dbFilePath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");
  runMigrations(dbInstance);
  return dbInstance;
}
function runMigrations(db2) {
  const current = db2.pragma("user_version", { simple: true });
  for (const m of migrations) {
    if (m.version > current) {
      db2.transaction(() => {
        db2.exec(m.sql);
        db2.pragma(`user_version = ${m.version}`);
      })();
    }
  }
}

// node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var millisecondsInDay = 864e5;
var millisecondsInMinute = 6e4;
var millisecondsInHour = 36e5;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = /* @__PURE__ */ Symbol.for("constructDateFrom");

// node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function") return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date) return new date.constructor(value);
  return new Date(value);
}

// node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}

// node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds.js
function getTimezoneOffsetInMilliseconds(date) {
  const _date = toDate(date);
  const utcDate = new Date(
    Date.UTC(
      _date.getFullYear(),
      _date.getMonth(),
      _date.getDate(),
      _date.getHours(),
      _date.getMinutes(),
      _date.getSeconds(),
      _date.getMilliseconds()
    )
  );
  utcDate.setUTCFullYear(_date.getFullYear());
  return +date - +utcDate;
}

// node_modules/date-fns/_lib/normalizeDates.js
function normalizeDates(context, ...dates) {
  const normalize = constructFrom.bind(
    null,
    context || dates.find((date) => typeof date === "object")
  );
  return dates.map(normalize);
}

// node_modules/date-fns/startOfDay.js
function startOfDay(date, options) {
  const _date = toDate(date, options?.in);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/differenceInCalendarDays.js
function differenceInCalendarDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  const laterStartOfDay = startOfDay(laterDate_);
  const earlierStartOfDay = startOfDay(earlierDate_);
  const laterTimestamp = +laterStartOfDay - getTimezoneOffsetInMilliseconds(laterStartOfDay);
  const earlierTimestamp = +earlierStartOfDay - getTimezoneOffsetInMilliseconds(earlierStartOfDay);
  return Math.round((laterTimestamp - earlierTimestamp) / millisecondsInDay);
}

// node_modules/date-fns/parseISO.js
function parseISO(argument, options) {
  const invalidDate = () => constructFrom(options?.in, NaN);
  const additionalDigits = options?.additionalDigits ?? 2;
  const dateStrings = splitDateString(argument);
  let date;
  if (dateStrings.date) {
    const parseYearResult = parseYear(dateStrings.date, additionalDigits);
    date = parseDate(parseYearResult.restDateString, parseYearResult.year);
  }
  if (!date || isNaN(+date)) return invalidDate();
  const timestamp = +date;
  let time = 0;
  let offset;
  if (dateStrings.time) {
    time = parseTime(dateStrings.time);
    if (isNaN(time)) return invalidDate();
  }
  if (dateStrings.timezone) {
    offset = parseTimezone(dateStrings.timezone);
    if (isNaN(offset)) return invalidDate();
  } else {
    const tmpDate = new Date(timestamp + time);
    const result = toDate(0, options?.in);
    result.setFullYear(
      tmpDate.getUTCFullYear(),
      tmpDate.getUTCMonth(),
      tmpDate.getUTCDate()
    );
    result.setHours(
      tmpDate.getUTCHours(),
      tmpDate.getUTCMinutes(),
      tmpDate.getUTCSeconds(),
      tmpDate.getUTCMilliseconds()
    );
    return result;
  }
  return toDate(timestamp + time + offset, options?.in);
}
var patterns = {
  dateTimeDelimiter: /[T ]/,
  timeZoneDelimiter: /[Z ]/i,
  timezone: /([Z+-].*)$/
};
var dateRegex = /^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/;
var timeRegex = /^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/;
var timezoneRegex = /^([+-])(\d{2})(?::?(\d{2}))?$/;
function splitDateString(dateString) {
  const dateStrings = {};
  const array = dateString.split(patterns.dateTimeDelimiter);
  let timeString;
  if (array.length > 2) {
    return dateStrings;
  }
  if (/:/.test(array[0])) {
    timeString = array[0];
  } else {
    dateStrings.date = array[0];
    timeString = array[1];
    if (patterns.timeZoneDelimiter.test(dateStrings.date)) {
      dateStrings.date = dateString.split(patterns.timeZoneDelimiter)[0];
      timeString = dateString.substr(
        dateStrings.date.length,
        dateString.length
      );
    }
  }
  if (timeString) {
    const token = patterns.timezone.exec(timeString);
    if (token) {
      dateStrings.time = timeString.replace(token[1], "");
      dateStrings.timezone = token[1];
    } else {
      dateStrings.time = timeString;
    }
  }
  return dateStrings;
}
function parseYear(dateString, additionalDigits) {
  const regex = new RegExp(
    "^(?:(\\d{4}|[+-]\\d{" + (4 + additionalDigits) + "})|(\\d{2}|[+-]\\d{" + (2 + additionalDigits) + "})$)"
  );
  const captures = dateString.match(regex);
  if (!captures) return { year: NaN, restDateString: "" };
  const year = captures[1] ? parseInt(captures[1]) : null;
  const century = captures[2] ? parseInt(captures[2]) : null;
  return {
    year: century === null ? year : century * 100,
    restDateString: dateString.slice((captures[1] || captures[2]).length)
  };
}
function parseDate(dateString, year) {
  if (year === null) return /* @__PURE__ */ new Date(NaN);
  const captures = dateString.match(dateRegex);
  if (!captures) return /* @__PURE__ */ new Date(NaN);
  const isWeekDate = !!captures[4];
  const dayOfYear = parseDateUnit(captures[1]);
  const month = parseDateUnit(captures[2]) - 1;
  const day = parseDateUnit(captures[3]);
  const week = parseDateUnit(captures[4]);
  const dayOfWeek = parseDateUnit(captures[5]) - 1;
  if (isWeekDate) {
    if (!validateWeekDate(year, week, dayOfWeek)) {
      return /* @__PURE__ */ new Date(NaN);
    }
    return dayOfISOWeekYear(year, week, dayOfWeek);
  } else {
    const date = /* @__PURE__ */ new Date(0);
    if (!validateDate(year, month, day) || !validateDayOfYearDate(year, dayOfYear)) {
      return /* @__PURE__ */ new Date(NaN);
    }
    date.setUTCFullYear(year, month, Math.max(dayOfYear, day));
    return date;
  }
}
function parseDateUnit(value) {
  return value ? parseInt(value) : 1;
}
function parseTime(timeString) {
  const captures = timeString.match(timeRegex);
  if (!captures) return NaN;
  const hours = parseTimeUnit(captures[1]);
  const minutes = parseTimeUnit(captures[2]);
  const seconds = parseTimeUnit(captures[3]);
  if (!validateTime(hours, minutes, seconds)) {
    return NaN;
  }
  return hours * millisecondsInHour + minutes * millisecondsInMinute + seconds * 1e3;
}
function parseTimeUnit(value) {
  return value && parseFloat(value.replace(",", ".")) || 0;
}
function parseTimezone(timezoneString) {
  if (timezoneString === "Z") return 0;
  const captures = timezoneString.match(timezoneRegex);
  if (!captures) return 0;
  const sign = captures[1] === "+" ? -1 : 1;
  const hours = parseInt(captures[2]);
  const minutes = captures[3] && parseInt(captures[3]) || 0;
  if (!validateTimezone(hours, minutes)) {
    return NaN;
  }
  return sign * (hours * millisecondsInHour + minutes * millisecondsInMinute);
}
function dayOfISOWeekYear(isoWeekYear, week, day) {
  const date = /* @__PURE__ */ new Date(0);
  date.setUTCFullYear(isoWeekYear, 0, 4);
  const fourthOfJanuaryDay = date.getUTCDay() || 7;
  const diff = (week - 1) * 7 + day + 1 - fourthOfJanuaryDay;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}
var daysInMonths = [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function isLeapYearIndex(year) {
  return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
}
function validateDate(year, month, date) {
  return month >= 0 && month <= 11 && date >= 1 && date <= (daysInMonths[month] || (isLeapYearIndex(year) ? 29 : 28));
}
function validateDayOfYearDate(year, dayOfYear) {
  return dayOfYear >= 1 && dayOfYear <= (isLeapYearIndex(year) ? 366 : 365);
}
function validateWeekDate(_year, week, day) {
  return week >= 1 && week <= 53 && day >= 0 && day <= 6;
}
function validateTime(hours, minutes, seconds) {
  if (hours === 24) {
    return minutes === 0 && seconds === 0;
  }
  return seconds >= 0 && seconds < 60 && minutes >= 0 && minutes < 60 && hours >= 0 && hours < 25;
}
function validateTimezone(_hours, minutes) {
  return minutes >= 0 && minutes <= 59;
}

// src/electron/db/dates.ts
function todayIso() {
  const d = /* @__PURE__ */ new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysBetween(aIso, bIso) {
  return differenceInCalendarDays(parseISO(aIso), parseISO(bIso));
}
function daysToBirthday(birthdayIso, today = todayIso()) {
  if (!birthdayIso) return null;
  try {
    const b = parseISO(birthdayIso);
    const t = parseISO(today);
    let candidate = new Date(t.getFullYear(), b.getMonth(), b.getDate());
    if (differenceInCalendarDays(candidate, t) < 0) {
      candidate = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
    }
    return differenceInCalendarDays(candidate, t);
  } catch {
    return null;
  }
}
function nowSqlTimestamp() {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// src/electron/repositories/teamRepo.ts
var ABSENCE_LABELS = {
  \u043E\u0442\u043F\u0443\u0441\u043A: { label: "\u0412 \u043E\u0442\u043F\u0443\u0441\u043A\u0435", kind: "vacation" },
  \u043A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043A\u0430: { label: "\u0412 \u043A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043A\u0435", kind: "business_trip" },
  \u0431\u043E\u043B\u044C\u043D\u0438\u0447\u043D\u044B\u0439: { label: "\u041D\u0430 \u0431\u043E\u043B\u044C\u043D\u0438\u0447\u043D\u043E\u043C", kind: "sick" },
  \u0438\u043D\u043E\u0435: { label: "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442", kind: "other" }
};
var TeamRepository = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  // ── Отделы ────────────────────────────────────────────────
  listDepartments() {
    return this.db.prepare(`SELECT id, name, parent_id, sort_order FROM departments ORDER BY sort_order, name`).all();
  }
  departmentTree() {
    const flat = this.listDepartments();
    const byId = /* @__PURE__ */ new Map();
    for (const d of flat) byId.set(d.id, { ...d, children: [] });
    const roots = [];
    for (const node of byId.values()) {
      const parent = node.parent_id != null ? byId.get(node.parent_id) : void 0;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }
  createDepartment(input) {
    const res = this.db.prepare("INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)").run(input.name, input.parent_id, input.sort_order);
    return this.getDepartment(Number(res.lastInsertRowid));
  }
  updateDepartment(id, input) {
    if (input.parent_id === id) throw new Error("\u041E\u0442\u0434\u0435\u043B \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0441\u0430\u043C \u0441\u0435\u0431\u0435 \u0440\u043E\u0434\u0438\u0442\u0435\u043B\u0435\u043C");
    let cur = input.parent_id;
    while (cur != null) {
      if (cur === id) throw new Error("\u041D\u0435\u043B\u044C\u0437\u044F \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0446\u0438\u043A\u043B \u0432 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0435 \u043E\u0442\u0434\u0435\u043B\u043E\u0432");
      const parent = this.db.prepare("SELECT parent_id FROM departments WHERE id = ?").get(cur);
      cur = parent?.parent_id ?? null;
    }
    this.db.prepare("UPDATE departments SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?").run(input.name, input.parent_id, input.sort_order, id);
    return this.getDepartment(id);
  }
  deleteDepartment(id) {
    const empCount2 = this.db.prepare("SELECT COUNT(*) AS c FROM employees WHERE department_id = ?").get(id).c;
    if (empCount2 > 0) throw new Error("\u0412 \u043E\u0442\u0434\u0435\u043B\u0435 \u0435\u0441\u0442\u044C \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0438 \u2014 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u0435 \u0438\u0445");
    const childCount = this.db.prepare("SELECT COUNT(*) AS c FROM departments WHERE parent_id = ?").get(id).c;
    if (childCount > 0) throw new Error("\u0423 \u043E\u0442\u0434\u0435\u043B\u0430 \u0435\u0441\u0442\u044C \u043F\u043E\u0434\u0440\u0430\u0437\u0434\u0435\u043B\u0435\u043D\u0438\u044F \u2014 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0443\u0434\u0430\u043B\u0438\u0442\u0435 \u0438\u0445");
    this.db.prepare("DELETE FROM departments WHERE id = ?").run(id);
  }
  getDepartment(id) {
    const row = this.db.prepare("SELECT id, name, parent_id, sort_order FROM departments WHERE id = ?").get(id);
    if (!row) throw new Error("\u041E\u0442\u0434\u0435\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return row;
  }
  // ── Отсутствия ────────────────────────────────────────────
  listAbsencesByEmployee(employeeId) {
    return this.db.prepare("SELECT * FROM absences WHERE employee_id = ? ORDER BY date_from DESC").all(employeeId);
  }
  createAbsence(input) {
    if (input.date_to < input.date_from) throw new Error("\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0440\u0430\u043D\u044C\u0448\u0435 \u043D\u0430\u0447\u0430\u043B\u0430");
    const res = this.db.prepare("INSERT INTO absences (employee_id, absence_type, date_from, date_to, note) VALUES (?, ?, ?, ?, ?)").run(input.employee_id, input.absence_type, input.date_from, input.date_to, input.note);
    return this.getAbsence(Number(res.lastInsertRowid));
  }
  updateAbsence(id, input) {
    if (input.date_to < input.date_from) throw new Error("\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0440\u0430\u043D\u044C\u0448\u0435 \u043D\u0430\u0447\u0430\u043B\u0430");
    this.db.prepare("UPDATE absences SET employee_id = ?, absence_type = ?, date_from = ?, date_to = ?, note = ? WHERE id = ?").run(input.employee_id, input.absence_type, input.date_from, input.date_to, input.note, id);
    return this.getAbsence(id);
  }
  deleteAbsence(id) {
    this.db.prepare("DELETE FROM absences WHERE id = ?").run(id);
  }
  getAbsence(id) {
    const row = this.db.prepare("SELECT * FROM absences WHERE id = ?").get(id);
    if (!row) throw new Error("\u0417\u0430\u043F\u0438\u0441\u044C \u043E\u0431 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return row;
  }
  /** Таймлайн отсутствий на ближайшие N дней (начиная с вчера, чтобы текущие были видны). */
  absenceTimeline(daysAhead) {
    const today = todayIso();
    const end = shiftIso(today, daysAhead);
    return this.db.prepare(
      `SELECT a.employee_id, e.full_name AS employee_name, a.absence_type, a.date_from, a.date_to, a.note
         FROM absences a JOIN employees e ON e.id = a.employee_id
         WHERE a.date_from <= ? AND a.date_to >= ? AND e.archived = 0 AND e.is_fired = 0
         ORDER BY a.date_from`
    ).all(end, shiftIso(today, -1));
  }
  // ── Сотрудники ────────────────────────────────────────────
  listEmployees(opts) {
    const today = todayIso();
    const rows = this.db.prepare(
      `SELECT e.*, d.name AS department_name
         FROM employees e LEFT JOIN departments d ON d.id = e.department_id
         ${opts.includeArchived ? "" : "WHERE e.archived = 0"}
         ORDER BY e.full_name`
    ).all();
    const activeAbsences = this.db.prepare(
      `SELECT *, 1 AS rank FROM absences WHERE date_from <= ? AND date_to >= ?`
    ).all(today, today);
    const upcomingAbsences = this.db.prepare(
      `SELECT * FROM absences WHERE date_from > ? ORDER BY date_from ASC`
    ).all(today);
    const currentByEmp = /* @__PURE__ */ new Map();
    for (const a of activeAbsences) if (!currentByEmp.has(a.employee_id)) currentByEmp.set(a.employee_id, a);
    const upcomingByEmp = /* @__PURE__ */ new Map();
    for (const a of upcomingAbsences) if (!upcomingByEmp.has(a.employee_id)) upcomingByEmp.set(a.employee_id, a);
    return rows.map((r) => {
      const status = computeStatus(r, currentByEmp.get(r.id) ?? null, today);
      const nextAbsence = currentByEmp.get(r.id) ?? upcomingByEmp.get(r.id) ?? null;
      return {
        id: r.id,
        full_name: r.full_name,
        department_id: r.department_id,
        position: r.position,
        internal_phone: r.internal_phone,
        mobile_phone: r.mobile_phone,
        email: r.email,
        birthday: r.birthday,
        functions: r.functions,
        is_fired: r.is_fired === 1,
        fired_date: r.fired_date,
        archived: r.archived === 1,
        created_at: r.created_at,
        updated_at: r.updated_at,
        department_name: r.department_name,
        status,
        days_to_birthday: daysToBirthday(r.birthday, today),
        next_absence: nextAbsence ? stripRank(nextAbsence) : null
      };
    });
  }
  getEmployee(id) {
    return this.listEmployees({ includeArchived: true }).find((e) => e.id === id) ?? null;
  }
  createEmployee(input) {
    const ts = nowSqlTimestamp();
    const res = this.db.prepare(
      `INSERT INTO employees (full_name, department_id, position, internal_phone, mobile_phone, email, birthday, functions, is_fired, fired_date, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.full_name,
      input.department_id,
      input.position,
      input.internal_phone,
      input.mobile_phone,
      input.email,
      input.birthday,
      input.functions,
      input.is_fired ? 1 : 0,
      input.fired_date,
      input.archived ? 1 : 0,
      ts,
      ts
    );
    return this.requireEmployee(Number(res.lastInsertRowid));
  }
  updateEmployee(id, input) {
    this.db.prepare(
      `UPDATE employees SET full_name=?, department_id=?, position=?, internal_phone=?, mobile_phone=?, email=?, birthday=?, functions=?, is_fired=?, fired_date=?, archived=?, updated_at=?
         WHERE id = ?`
    ).run(
      input.full_name,
      input.department_id,
      input.position,
      input.internal_phone,
      input.mobile_phone,
      input.email,
      input.birthday,
      input.functions,
      input.is_fired ? 1 : 0,
      input.fired_date,
      input.archived ? 1 : 0,
      nowSqlTimestamp(),
      id
    );
    return this.requireEmployee(id);
  }
  setArchived(id, archived) {
    this.db.prepare("UPDATE employees SET archived = ?, updated_at = ? WHERE id = ?").run(archived ? 1 : 0, nowSqlTimestamp(), id);
    return this.requireEmployee(id);
  }
  requireEmployee(id) {
    const v = this.getEmployee(id);
    if (!v) throw new Error("\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return v;
  }
};
function stripRank(a) {
  return { id: a.id, employee_id: a.employee_id, absence_type: a.absence_type, date_from: a.date_from, date_to: a.date_to, note: a.note };
}
function computeStatus(row, currentAbsence, today) {
  if (row.is_fired === 1) return { kind: "fired", label: "\u0423\u0432\u043E\u043B\u0435\u043D" };
  if (currentAbsence) {
    const info = ABSENCE_LABELS[currentAbsence.absence_type];
    return { kind: info.kind, label: info.label, absenceFrom: currentAbsence.date_from, absenceTo: currentAbsence.date_to };
  }
  void today;
  return { kind: "work", label: "\u041D\u0430 \u0440\u0430\u0431\u043E\u0442\u0435" };
}
function shiftIso(iso, days) {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// src/electron/repositories/monitoringRepo.ts
var MonitoringRepository = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  // ── Справочник типов задач ───────────────────────────────
  listTaskTypes(opts) {
    const where = opts?.includeInactive ? "" : "WHERE active = 1";
    const rows = this.db.prepare(`SELECT * FROM task_types ${where} ORDER BY sort_order, name`).all();
    return rows.map((r) => ({ id: r.id, name: r.name, sort_order: r.sort_order, active: r.active === 1 }));
  }
  createTaskType(input) {
    const res = this.db.prepare("INSERT INTO task_types (name, sort_order, active) VALUES (?, ?, ?)").run(input.name, input.sort_order, input.active ? 1 : 0);
    return this.getTaskType(Number(res.lastInsertRowid));
  }
  updateTaskType(id, input) {
    this.db.prepare("UPDATE task_types SET name = ?, sort_order = ?, active = ? WHERE id = ?").run(input.name, input.sort_order, input.active ? 1 : 0, id);
    return this.getTaskType(id);
  }
  deleteTaskType(id) {
    const used = this.db.prepare("SELECT COUNT(*) AS c FROM monitorings WHERE type_id = ?").get(id).c;
    if (used > 0) throw new Error("\u0422\u0438\u043F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0432 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430\u0445 \u2014 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043E");
    this.db.prepare("DELETE FROM task_types WHERE id = ?").run(id);
  }
  reorderTaskTypes(orderedIds) {
    const stmt = this.db.prepare("UPDATE task_types SET sort_order = ? WHERE id = ?");
    this.db.transaction(() => {
      orderedIds.forEach((id, idx) => stmt.run(idx + 1, id));
    })();
  }
  getTaskType(id) {
    const r = this.db.prepare("SELECT * FROM task_types WHERE id = ?").get(id);
    if (!r) throw new Error("\u0422\u0438\u043F \u0437\u0430\u0434\u0430\u0447\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return { id: r.id, name: r.name, sort_order: r.sort_order, active: r.active === 1 };
  }
  // ── Мониторинги ──────────────────────────────────────────
  listMonitorings(opts) {
    const conds = [];
    const params = [];
    if (!opts.includeArchived) conds.push("m.status != '\u0430\u0440\u0445\u0438\u0432'");
    if (opts.typeId) {
      conds.push("m.type_id = ?");
      params.push(opts.typeId);
    }
    if (opts.employeeId) {
      conds.push("(m.employee_id = ? OR m.deputy_employee_id = ?)");
      params.push(opts.employeeId, opts.employeeId);
    }
    if (opts.status) {
      conds.push("m.status = ?");
      params.push(opts.status);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = this.db.prepare(
      `SELECT m.* FROM monitorings m ${where} ORDER BY m.deadline IS NULL, m.deadline, m.name`
    ).all(...params);
    const absentIds = this.currentlyAbsentEmployeeIds();
    return rows.map((m) => this.toView(m, absentIds));
  }
  getMonitoring(id) {
    const row = this.db.prepare("SELECT * FROM monitorings WHERE id = ?").get(id);
    if (!row) return null;
    return this.toView(row, this.currentlyAbsentEmployeeIds());
  }
  createMonitoring(input) {
    const ts = nowSqlTimestamp();
    const res = this.db.prepare(
      `INSERT INTO monitorings (name, type_id, employee_id, deadline, note, status, deputy_employee_id, deputy_from, deputy_to, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(input.name, input.type_id, input.employee_id, input.deadline, input.note, input.status, input.deputy_employee_id, input.deputy_from, input.deputy_to, ts, ts);
    return this.requireMonitoring(Number(res.lastInsertRowid));
  }
  updateMonitoring(id, input) {
    this.db.prepare(
      `UPDATE monitorings SET name=?, type_id=?, employee_id=?, deadline=?, note=?, status=?, deputy_employee_id=?, deputy_from=?, deputy_to=?, updated_at=? WHERE id=?`
    ).run(input.name, input.type_id, input.employee_id, input.deadline, input.note, input.status, input.deputy_employee_id, input.deputy_from, input.deputy_to, nowSqlTimestamp(), id);
    return this.requireMonitoring(id);
  }
  archiveMonitoring(id) {
    this.db.prepare(`UPDATE monitorings SET status = '\u0430\u0440\u0445\u0438\u0432', updated_at = ? WHERE id = ?`).run(nowSqlTimestamp(), id);
    return this.requireMonitoring(id);
  }
  /** ids сотрудников, отсутствующих сегодня (не уволенных, не архивных). */
  currentlyAbsentEmployeeIds() {
    const today = todayIso();
    const rows = this.db.prepare(
      `SELECT DISTINCT a.employee_id FROM absences a JOIN employees e ON e.id = a.employee_id
         WHERE a.date_from <= ? AND a.date_to >= ? AND e.is_fired = 0 AND e.archived = 0`
    ).all(today, today);
    return new Set(rows.map((r) => r.employee_id));
  }
  requireMonitoring(id) {
    const v = this.getMonitoring(id);
    if (!v) throw new Error("\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return v;
  }
  toView(m, absentIds) {
    const type = this.db.prepare("SELECT name FROM task_types WHERE id = ?").get(m.type_id);
    const emp = this.db.prepare("SELECT full_name FROM employees WHERE id = ?").get(m.employee_id);
    const deputy = m.deputy_employee_id ? this.db.prepare("SELECT full_name FROM employees WHERE id = ?").get(m.deputy_employee_id) : null;
    const today = todayIso();
    const deputyActive = m.deputy_employee_id != null && (m.deputy_from == null || m.deputy_from <= today) && (m.deputy_to == null || m.deputy_to >= today);
    const hasDeputy = m.deputy_employee_id != null;
    return {
      id: m.id,
      name: m.name,
      type_id: m.type_id,
      employee_id: m.employee_id,
      deadline: m.deadline,
      note: m.note,
      status: m.status,
      deputy_employee_id: m.deputy_employee_id,
      deputy_from: m.deputy_from,
      deputy_to: m.deputy_to,
      created_at: m.created_at,
      updated_at: m.updated_at,
      type_name: type?.name ?? "",
      employee_name: emp?.full_name ?? "",
      deputy_name: deputy?.full_name ?? null,
      red_flag: absentIds.has(m.employee_id) && !hasDeputy && m.status !== "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" && m.status !== "\u0430\u0440\u0445\u0438\u0432",
      deputy_active: deputyActive
    };
  }
};

// src/electron/repositories/edoRepo.ts
function buildDocUrl(settings2, doc) {
  const template = settings2.edoLinkTemplate.trim();
  if (template.includes("{\u043D\u043E\u043C\u0435\u0440}")) {
    return template.replaceAll("{\u043D\u043E\u043C\u0435\u0440}", encodeURIComponent(doc.doc_number));
  }
  if (doc.doc_url.trim()) return doc.doc_url.trim();
  return null;
}
var EdoRepository = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  list(opts, settings2) {
    const conds = [];
    const params = [];
    if (!opts.includeArchived) conds.push("d.archived = 0");
    if (opts.controlType) {
      conds.push("d.control_type = ?");
      params.push(opts.controlType);
    }
    if (opts.offControl === "on") conds.push("d.off_control = 1");
    if (opts.offControl === "off") conds.push("d.off_control = 0");
    if (opts.responsibleId) {
      conds.push("d.responsible_id = ?");
      params.push(opts.responsibleId);
    }
    if (opts.approvalStatus) {
      conds.push("d.approval_status = ?");
      params.push(opts.approvalStatus);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = this.db.prepare(`SELECT d.* FROM edo_documents d ${where}`).all(...params);
    let views = rows.map((r) => this.toView(r, settings2));
    if (opts.burning) {
      views = views.filter((v) => !v.off_control && v.days_left != null && v.days_left <= 3);
    }
    views.sort((a, b) => {
      if (a.off_control !== b.off_control) return a.off_control ? 1 : -1;
      const da = a.deadline ?? "9999-12-31";
      const dbb = b.deadline ?? "9999-12-31";
      if (da !== dbb) return da < dbb ? -1 : 1;
      return a.doc_number.localeCompare(b.doc_number, "ru");
    });
    return views;
  }
  get(id, settings2) {
    const row = this.db.prepare("SELECT * FROM edo_documents WHERE id = ?").get(id);
    return row ? this.toView(row, settings2) : null;
  }
  create(input, settings2) {
    const ts = nowSqlTimestamp();
    const res = this.db.prepare(
      `INSERT INTO edo_documents (doc_number, doc_url, summary, instruction, responsible_id, participants, control_type, deadline, off_control, off_control_date, sub_resolution, approval_number, approval_url, approval_status, archived, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      input.doc_number,
      input.doc_url,
      input.summary,
      input.instruction,
      input.responsible_id,
      input.participants,
      input.control_type,
      input.deadline,
      input.off_control ? 1 : 0,
      input.off_control_date,
      input.sub_resolution,
      input.approval_number,
      input.approval_url,
      input.approval_status,
      input.archived ? 1 : 0,
      ts,
      ts
    );
    return this.require(Number(res.lastInsertRowid), settings2);
  }
  update(id, input, settings2) {
    this.db.prepare(
      `UPDATE edo_documents SET doc_number=?, doc_url=?, summary=?, instruction=?, responsible_id=?, participants=?, control_type=?, deadline=?, off_control=?, off_control_date=?, sub_resolution=?, approval_number=?, approval_url=?, approval_status=?, archived=?, updated_at=? WHERE id=?`
    ).run(
      input.doc_number,
      input.doc_url,
      input.summary,
      input.instruction,
      input.responsible_id,
      input.participants,
      input.control_type,
      input.deadline,
      input.off_control ? 1 : 0,
      input.off_control_date,
      input.sub_resolution,
      input.approval_number,
      input.approval_url,
      input.approval_status,
      input.archived ? 1 : 0,
      nowSqlTimestamp(),
      id
    );
    return this.require(id, settings2);
  }
  setOffControl(id, off, settings2) {
    const date = off ? todayIso() : null;
    this.db.prepare("UPDATE edo_documents SET off_control = ?, off_control_date = ?, updated_at = ? WHERE id = ?").run(off ? 1 : 0, date, nowSqlTimestamp(), id);
    return this.require(id, settings2);
  }
  archive(id, settings2) {
    this.db.prepare("UPDATE edo_documents SET archived = 1, updated_at = ? WHERE id = ?").run(nowSqlTimestamp(), id);
    return this.require(id, settings2);
  }
  require(id, settings2) {
    const v = this.get(id, settings2);
    if (!v) throw new Error("\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return v;
  }
  toView(r, settings2) {
    const responsible = r.responsible_id ? this.db.prepare("SELECT full_name FROM employees WHERE id = ?").get(r.responsible_id) : null;
    const today = todayIso();
    const daysLeft = r.deadline && !r.off_control ? daysBetween(r.deadline, today) : null;
    return {
      id: r.id,
      doc_number: r.doc_number,
      doc_url: r.doc_url,
      summary: r.summary,
      instruction: r.instruction,
      responsible_id: r.responsible_id,
      participants: r.participants,
      control_type: r.control_type,
      deadline: r.deadline,
      off_control: r.off_control === 1,
      off_control_date: r.off_control_date,
      sub_resolution: r.sub_resolution,
      approval_number: r.approval_number,
      approval_url: r.approval_url,
      approval_status: r.approval_status,
      archived: r.archived === 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
      responsible_name: responsible?.full_name ?? null,
      days_left: daysLeft,
      resolved_url: buildDocUrl(settings2, r)
    };
  }
};
var WorkLogRepository = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  list(entityType, entityId) {
    return this.db.prepare("SELECT * FROM work_log WHERE entity_type = ? AND entity_id = ? ORDER BY log_date DESC, id DESC").all(entityType, entityId);
  }
  add(input) {
    const res = this.db.prepare("INSERT INTO work_log (entity_type, entity_id, log_date, text, created_at) VALUES (?, ?, ?, ?, ?)").run(input.entity_type, input.entity_id, input.log_date, input.text, nowSqlTimestamp());
    const row = this.db.prepare("SELECT * FROM work_log WHERE id = ?").get(Number(res.lastInsertRowid));
    if (!row) throw new Error("\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0430");
    return row;
  }
  delete(id) {
    this.db.prepare("DELETE FROM work_log WHERE id = ?").run(id);
  }
};

// src/electron/repositories/taskRepo.ts
var TaskRepository = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  /**
  * Задачи в «ожидании», у которых дата возврата наступила, автоматически переходят в «в работе».
  * Возвращает id разбуженных задач (для подсветки на дашборде). Разбужденные задачи помечаются
  * записью в work_log с префиксом «Автопробуждение» — по ней определяется «вернулась сегодня».
  */
  wakeUpExpired() {
    const dueToday = this.findWaitingDueToday();
    if (dueToday.length === 0) return [];
    this.db.prepare(`UPDATE tasks SET status = '\u0432 \u0440\u0430\u0431\u043E\u0442\u0435', wait_until = NULL, updated_at = ? WHERE status = '\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435' AND wait_until IS NOT NULL AND wait_until <= ?`).run(nowSqlTimestamp(), todayIso());
    this.markWoken(dueToday);
    return dueToday;
  }
  list(opts) {
    const wokenIds = new Set(this.wakeUpExpired());
    const conds = [];
    const params = [];
    if (!opts.includeArchived) {
      conds.push("archived = 0 AND status NOT IN ('\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E','\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E')");
    }
    if (opts.status) {
      conds.push("status = ?");
      params.push(opts.status);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = this.db.prepare(`SELECT * FROM tasks ${where} ORDER BY updated_at DESC, id DESC`).all(...params);
    return rows.map((r) => ({ ...this.toView(r), returned_today: wokenIds.has(r.id) }));
  }
  get(id) {
    const wokenIds = new Set(this.wakeUpExpired());
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    return row ? { ...this.toView(row), returned_today: wokenIds.has(row.id) } : null;
  }
  create(input) {
    const ts = nowSqlTimestamp();
    const res = this.db.prepare(
      `INSERT INTO tasks (theme, title, priority, deadline, status, wait_until, next_action, participants, note, archived, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(input.theme, input.title, input.priority, input.deadline, input.status, input.wait_until, input.next_action, input.participants, input.note, input.archived ? 1 : 0, ts, ts);
    return this.require(Number(res.lastInsertRowid));
  }
  update(id, input) {
    this.db.prepare(
      `UPDATE tasks SET theme=?, title=?, priority=?, deadline=?, status=?, wait_until=?, next_action=?, participants=?, note=?, archived=?, updated_at=? WHERE id=?`
    ).run(input.theme, input.title, input.priority, input.deadline, input.status, input.wait_until, input.next_action, input.participants, input.note, input.archived ? 1 : 0, nowSqlTimestamp(), id);
    return this.require(id);
  }
  setStatus(id, status) {
    this.db.prepare("UPDATE tasks SET status = ?, updated_at = ?, wait_until = NULL WHERE id = ?").run(status, nowSqlTimestamp(), id);
    return this.require(id);
  }
  archive(id) {
    this.db.prepare(`UPDATE tasks SET archived = 1, status = '\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E', updated_at = ? WHERE id = ?`).run(nowSqlTimestamp(), id);
    return this.require(id);
  }
  // ── Чек-лист ─────────────────────────────────────────────
  listItems(taskId) {
    const rows = this.db.prepare(
      "SELECT id, task_id, title, done, sort_order FROM task_check_items WHERE task_id = ? ORDER BY sort_order, id"
    ).all(taskId);
    return rows.map((r) => ({ id: r.id, task_id: r.task_id, title: r.title, done: r.done === 1, sort_order: r.sort_order }));
  }
  createItem(input) {
    const res = this.db.prepare("INSERT INTO task_check_items (task_id, title, done, sort_order) VALUES (?, ?, ?, ?)").run(input.task_id, input.title, input.done ? 1 : 0, input.sort_order);
    this.touchTask(input.task_id);
    return this.getItem(Number(res.lastInsertRowid));
  }
  updateItem(id, patch) {
    const cur = this.getItemOrNull(id);
    if (!cur) throw new Error("\u041F\u0443\u043D\u043A\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    const next = { ...cur, ...patch };
    this.db.prepare("UPDATE task_check_items SET title = ?, done = ?, sort_order = ? WHERE id = ?").run(next.title, next.done ? 1 : 0, next.sort_order, id);
    this.touchTask(cur.task_id);
    return this.getItem(id);
  }
  deleteItem(id) {
    const cur = this.getItemOrNull(id);
    if (!cur) return;
    this.db.prepare("DELETE FROM task_check_items WHERE id = ?").run(id);
    this.touchTask(cur.task_id);
  }
  getItem(id) {
    const r = this.getItemOrNull(id);
    if (!r) throw new Error("\u041F\u0443\u043D\u043A\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return r;
  }
  getItemOrNull(id) {
    const r = this.db.prepare("SELECT * FROM task_check_items WHERE id = ?").get(id);
    if (!r) return null;
    return { id: r.id, task_id: r.task_id, title: r.title, done: r.done === 1, sort_order: r.sort_order };
  }
  touchTask(taskId) {
    this.db.prepare("UPDATE tasks SET updated_at = ? WHERE id = ?").run(nowSqlTimestamp(), taskId);
  }
  require(id) {
    const v = this.get(id);
    if (!v) throw new Error("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return v;
  }
  toView(r) {
    const today = todayIso();
    const items = this.db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(done),0) AS done FROM task_check_items WHERE task_id = ?").get(r.id);
    const lastLog = this.db.prepare("SELECT MAX(log_date) AS d FROM work_log WHERE entity_type = ? AND entity_id = ?").get("task", r.id);
    const lastActivity = [r.updated_at.slice(0, 10), lastLog?.d ?? null].filter(Boolean).sort().reverse()[0] ?? r.created_at.slice(0, 10);
    const daysSinceUpdate = daysBetween(today, lastActivity);
    const isActive = !r.archived && r.status !== "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" && r.status !== "\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E";
    const daysLeft = r.deadline ? daysBetween(r.deadline, today) : null;
    return {
      id: r.id,
      theme: r.theme,
      title: r.title,
      priority: r.priority,
      deadline: r.deadline,
      status: r.status,
      wait_until: r.wait_until,
      next_action: r.next_action,
      participants: r.participants,
      note: r.note,
      archived: r.archived === 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
      items_total: items.total,
      items_done: items.done,
      progress: items.total > 0 ? items.done / items.total : 0,
      days_left: daysLeft,
      days_since_update: daysSinceUpdate,
      stale: isActive && daysSinceUpdate >= 9,
      returned_today: false
      // вычисляется на уровне сервиса до автопробуждения (см. dashboardService)
    };
  }
  /** ids задач, которые сегодня вернулись из ожидания (по служебной записи автопробуждения). */
  returnedFromWaitToday() {
    const today = todayIso();
    const rows = this.db.prepare(
      `SELECT DISTINCT entity_id AS id FROM work_log WHERE entity_type = 'task' AND log_date = ? AND text LIKE '\u0410\u0432\u0442\u043E\u043F\u0440\u043E\u0431\u0443\u0436\u0434\u0435\u043D\u0438\u0435%'`
    ).all(today);
    return rows.map((r) => r.id);
  }
  /** Помечает задачи, разбуженные сегодня, служебной записью в work_log (для дашборда). */
  markWoken(ids) {
    const today = todayIso();
    const stmt = this.db.prepare("INSERT INTO work_log (entity_type, entity_id, log_date, text, created_at) VALUES (?, ?, ?, ?, ?)");
    for (const id of ids) stmt.run("task", id, today, "\u0410\u0432\u0442\u043E\u043F\u0440\u043E\u0431\u0443\u0436\u0434\u0435\u043D\u0438\u0435: \u0441\u0440\u043E\u043A \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F \u0438\u0441\u0442\u0451\u043A, \u0437\u0430\u0434\u0430\u0447\u0430 \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0435\u043D\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443", nowSqlTimestamp());
  }
  findWaitingDueToday() {
    const today = todayIso();
    const rows = this.db.prepare(`SELECT id FROM tasks WHERE status = '\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435' AND wait_until IS NOT NULL AND wait_until <= ?`).all(today);
    return rows.map((r) => r.id);
  }
};

// src/shared/types.ts
var DEFAULT_SETTINGS = {
  theme: "system",
  tableDensity: "normal",
  controlRedName: "\u041A\u0440\u0430\u0441\u043D\u044B\u0439",
  controlGreenName: "\u0417\u0435\u043B\u0451\u043D\u044B\u0439",
  edoLinkTemplate: "https://sed.example.ru/doc/{\u043D\u043E\u043C\u0435\u0440}"
};

// src/electron/services/settingsService.ts
var SETTINGS_KEY = "app";
var SettingsService = class {
  constructor(db2) {
    this.db = db2;
  }
  db;
  get() {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(SETTINGS_KEY);
    if (!row) return { ...DEFAULT_SETTINGS };
    try {
      const parsed = JSON.parse(row.value);
      if (typeof parsed === "object" && parsed !== null) {
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
    }
    return { ...DEFAULT_SETTINGS };
  }
  set(patch) {
    const next = { ...this.get(), ...patch };
    this.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }
};

// src/electron/services/demoService.ts
function insert(db2, table, row) {
  const keys = Object.keys(row);
  const stmt = db2.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`);
  const res = stmt.run(...keys.map((k) => row[k]));
  return Number(res.lastInsertRowid);
}
function loadDemoData(db2) {
  const today = todayIso();
  const d = (offset) => shiftIso(today, offset);
  const ts = nowSqlTimestamp();
  db2.transaction(() => {
    const dirId = insert(db2, "departments", { name: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0421\u041C\u041F \u0438 \u0427\u0421", parent_id: null, sort_order: 1 });
    const o1 = insert(db2, "departments", { name: "\u041E\u0442\u0434\u0435\u043B \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430 \u0438 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F", parent_id: dirId, sort_order: 1 });
    const o2 = insert(db2, "departments", { name: "\u041E\u0442\u0434\u0435\u043B \u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u0440\u0435\u0430\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F", parent_id: dirId, sort_order: 2 });
    const o3 = insert(db2, "departments", { name: "\u0421\u0435\u043A\u0442\u043E\u0440 \u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0435\u043D\u0438\u044F \u0438 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u043E\u0431\u043E\u0440\u043E\u0442\u0430", parent_id: dirId, sort_order: 3 });
    const emps = [
      { name: "\u0421\u043E\u043A\u043E\u043B\u043E\u0432 \u0418\u0433\u043E\u0440\u044C \u041F\u0435\u0442\u0440\u043E\u0432\u0438\u0447", dep: dirId, pos: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", ext: "4101", mob: "+7 900 111-01-01", mail: "sokolov@smch.example.ru", bd: "03-14", fn: "\u041E\u0431\u0449\u0435\u0435 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E, \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0435 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0445 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432" },
      { name: "\u0412\u0435\u0442\u0440\u043E\u0432\u0430 \u0410\u043D\u043D\u0430 \u0421\u0435\u0440\u0433\u0435\u0435\u0432\u043D\u0430", dep: o1, pos: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A \u043E\u0442\u0434\u0435\u043B\u0430", ext: "4110", mob: "+7 900 111-02-01", mail: "vetrova@smch.example.ru", bd: "11-02", fn: "\u041F\u0440\u043E\u0433\u043D\u043E\u0437 \u0427\u0421, \u0441\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u043E\u0431\u043B\u0430\u0441\u0442\u0438, \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0441 \u0415\u0414\u0414\u0421" },
      { name: "\u0413\u0440\u043E\u043C\u043E\u0432 \u041F\u0430\u0432\u0435\u043B \u0410\u043D\u0434\u0440\u0435\u0435\u0432\u0438\u0447", dep: o1, pos: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4112", mob: "+7 900 111-02-02", mail: "gromov@smch.example.ru", bd: "11-01", fn: "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0433\u0438\u0434\u0440\u043E\u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438, \u0442\u0430\u0431\u043B\u0438\u0446\u044B \u043E\u0441\u0430\u0434\u043A\u043E\u0432" },
      { name: "\u041B\u0438\u0442\u0432\u0438\u043D\u043E\u0432\u0430 \u041C\u0430\u0440\u0438\u044F \u041E\u043B\u0435\u0433\u043E\u0432\u043D\u0430", dep: o1, pos: "\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4113", mob: "", mail: "litvinova@smch.example.ru", bd: "05-23", fn: "\u041B\u0435\u0441\u043E\u043F\u043E\u0436\u0430\u0440\u043D\u0430\u044F \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430, \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0413\u0418\u041C\u0421" },
      { name: "\u041A\u0430\u0431\u0430\u043D\u043E\u0432 \u0414\u043C\u0438\u0442\u0440\u0438\u0439 \u042E\u0440\u044C\u0435\u0432\u0438\u0447", dep: o2, pos: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A \u043E\u0442\u0434\u0435\u043B\u0430", ext: "4120", mob: "+7 900 111-03-01", mail: "kabanov@smch.example.ru", bd: "08-19", fn: "\u041E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0435 \u0434\u0435\u0436\u0443\u0440\u0441\u0442\u0432\u043E, \u0440\u0435\u0430\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435, \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0446\u0438\u044F \u043F\u043E\u0434\u0440\u0430\u0437\u0434\u0435\u043B\u0435\u043D\u0438\u0439" },
      { name: "\u041E\u0432\u0447\u0438\u043D\u043D\u0438\u043A\u043E\u0432\u0430 \u0415\u043B\u0435\u043D\u0430 \u0412\u0438\u043A\u0442\u043E\u0440\u043E\u0432\u043D\u0430", dep: o2, pos: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4122", mob: "", mail: "ovchinnikova@smch.example.ru", bd: "12-05", fn: "\u0423\u0447\u0451\u0442 \u043F\u043E\u0441\u0442\u0440\u0430\u0434\u0430\u0432\u0448\u0438\u0445 \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432, \u0434\u043E\u043A\u043B\u0430\u0434\u044B \u0432 \u0440\u0435\u0433\u0438\u043E\u043D" },
      { name: "\u0422\u0438\u043C\u043E\u0444\u0435\u0435\u0432 \u041D\u0438\u043A\u0438\u0442\u0430 \u0420\u043E\u043C\u0430\u043D\u043E\u0432\u0438\u0447", dep: o2, pos: "\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4123", mob: "+7 900 111-03-02", mail: "timofeev@smch.example.ru", bd: "02-27", fn: "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0434\u043E\u0440\u043E\u0436\u043D\u043E\u0439 \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438, \u0437\u0438\u043C\u043D\u0435\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0442\u0440\u0430\u0441\u0441" },
      { name: "\u0417\u0430\u0441\u0443\u0445\u0438\u043D\u0430 \u041E\u043B\u044C\u0433\u0430 \u041D\u0438\u043A\u043E\u043B\u0430\u0435\u0432\u043D\u0430", dep: o3, pos: "\u0421\u0435\u043A\u0440\u0435\u0442\u0430\u0440\u044C-\u0434\u0435\u043B\u043E\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C", ext: "4130", mob: "", mail: "zasukhina@smch.example.ru", bd: "11-04", fn: "\u0412\u0445\u043E\u0434\u044F\u0449\u0430\u044F/\u0438\u0441\u0445\u043E\u0434\u044F\u0449\u0430\u044F \u043A\u043E\u0440\u0440\u0435\u0441\u043F\u043E\u043D\u0434\u0435\u043D\u0446\u0438\u044F, \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u042D\u0414\u041E" },
      { name: "\u0420\u0435\u043C\u0438\u0437\u043E\u0432 \u0410\u0440\u0442\u0451\u043C \u0412\u043B\u0430\u0434\u0438\u0441\u043B\u0430\u0432\u043E\u0432\u0438\u0447", dep: o3, pos: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4132", mob: "+7 900 111-04-01", mail: "remizov@smch.example.ru", bd: "07-08", fn: "\u0417\u0430\u043A\u0443\u043F\u043A\u0438, \u0445\u043E\u0437\u044F\u0439\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0435\u043D\u0438\u0435" },
      { name: "\u041F\u0430\u043D\u043E\u0432\u0430 \u0421\u0432\u0435\u0442\u043B\u0430\u043D\u0430 \u0418\u0433\u043E\u0440\u0435\u0432\u043D\u0430", dep: o3, pos: "\u041A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u043D\u0442", ext: "4133", mob: "", mail: "panova@smch.example.ru", bd: "09-30", fn: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043E\u0442\u0447\u0451\u0442\u043E\u0432, \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u043E\u0431\u043E\u0440\u043E\u0442\u0430" },
      { name: "\u0414\u044E\u0436\u0435\u0432 \u041A\u043E\u043D\u0441\u0442\u0430\u043D\u0442\u0438\u043D \u041C\u0438\u0445\u0430\u0439\u043B\u043E\u0432\u0438\u0447", dep: o1, pos: "\u0418\u043D\u0436\u0435\u043D\u0435\u0440", ext: "4114", mob: "", mail: "dyuzhev@smch.example.ru", bd: "04-17", fn: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0410\u041F\u041A \xAB\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u0433\u043E\u0440\u043E\u0434\xBB, \u0442\u0435\u0445\u043D\u0438\u043A\u0430 \u043E\u0442\u0434\u0435\u043B\u0430" },
      { name: "\u0421\u0435\u043B\u0435\u0437\u043D\u0451\u0432\u0430 \u0422\u0430\u0442\u044C\u044F\u043D\u0430 \u0410\u0440\u043A\u0430\u0434\u044C\u0435\u0432\u043D\u0430", dep: o2, pos: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 (\u0443\u0432\u043E\u043B\u044C\u043D\u044F\u0435\u0442\u0441\u044F)", ext: "4124", mob: "", mail: "selezneva@smch.example.ru", bd: "01-11", fn: "\u0410\u0440\u0445\u0438\u0432 \u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0445 \u0434\u043E\u043A\u043B\u0430\u0434\u043D\u044B\u0445" }
    ];
    const empIds = [];
    for (const e of emps) {
      let birthday = null;
      if (e.bd) {
        const year = Number(today.slice(0, 4)) - 35;
        birthday = `${year}-${e.bd}`;
      }
      empIds.push(
        insert(db2, "employees", {
          full_name: e.name,
          department_id: e.dep,
          position: e.pos,
          internal_phone: e.ext,
          mobile_phone: e.mob,
          email: e.mail,
          birthday,
          functions: e.fn,
          is_fired: 0,
          fired_date: null,
          archived: 0,
          created_at: ts,
          updated_at: ts
        })
      );
    }
    const [dir2, vetrova, gromov, litvinova, kabanov, ovchinnikova, timofeev, zasukhina, remizov, panova, dyuzhev, selezneva] = empIds;
    insert(db2, "absences", { employee_id: litvinova, absence_type: "\u043E\u0442\u043F\u0443\u0441\u043A", date_from: d(-4), date_to: d(6), note: "\u0415\u0436\u0435\u0433\u043E\u0434\u043D\u044B\u0439 \u043E\u0442\u043F\u0443\u0441\u043A" });
    insert(db2, "absences", { employee_id: gromov, absence_type: "\u043A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043A\u0430", date_from: d(1), date_to: d(5), note: "\u041E\u0431\u043B\u0430\u0441\u0442\u043D\u043E\u0439 \u0441\u0435\u043C\u0438\u043D\u0430\u0440, \u0433. \u0421\u0430\u0440\u0430\u0442\u043E\u0432" });
    insert(db2, "absences", { employee_id: dyuzhev, absence_type: "\u0431\u043E\u043B\u044C\u043D\u0438\u0447\u043D\u044B\u0439", date_from: d(-2), date_to: d(3), note: "" });
    insert(db2, "absences", { employee_id: ovchinnikova, absence_type: "\u043E\u0442\u043F\u0443\u0441\u043A", date_from: d(10), date_to: d(16), note: "\u0415\u0436\u0435\u0433\u043E\u0434\u043D\u044B\u0439 \u043E\u0442\u043F\u0443\u0441\u043A \u2014 \u0432\u0435\u0440\u043D\u0451\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 16 \u0434\u043D\u0435\u0439" });
    insert(db2, "absences", { employee_id: panova, absence_type: "\u043E\u0442\u043F\u0443\u0441\u043A", date_from: d(4), date_to: d(6), note: "\u041A\u0440\u0430\u0442\u043A\u043E\u0441\u0440\u043E\u0447\u043D\u044B\u0439" });
    const typeId = { mon: 1, letter: 2, table: 3 };
    const mons = [
      { name: "\u0413\u0438\u0434\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043D\u0430 \u0440\u0435\u043A\u0430\u0445 \u043E\u0431\u043B\u0430\u0441\u0442\u0438", t: typeId.mon, emp: gromov, dl: d(2), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435" },
      { name: "\u041E\u0441\u0430\u0434\u043A\u0438 \u043F\u043E \u043C\u0435\u0442\u0435\u043E\u0441\u0442\u0430\u043D\u0446\u0438\u044F\u043C (\u0441\u0443\u0442\u043E\u0447\u043D\u0430\u044F \u0442\u0430\u0431\u043B\u0438\u0446\u0430)", t: typeId.table, emp: gromov, dl: d(0), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435" },
      { name: "\u041B\u0435\u0441\u043E\u043F\u043E\u0436\u0430\u0440\u043D\u0430\u044F \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 (\u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0439 \u0434\u043E\u043A\u043B\u0430\u0434)", t: typeId.mon, emp: litvinova, dl: d(0), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435" },
      // исполнитель в отпуске, дублёра нет → красный флаг
      { name: "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0433\u0438\u0431\u0435\u043B\u0438 \u043B\u044E\u0434\u0435\u0439 \u043D\u0430 \u0432\u043E\u0434\u0435 (\u0413\u0418\u041C\u0421)", t: typeId.mon, emp: litvinova, dl: d(5), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435", deputy: dyuzhev, dFrom: d(-4), dTo: d(6) },
      // есть дублёр
      { name: "\u0414\u043E\u0440\u043E\u0436\u043D\u0430\u044F \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043D\u0430 \u0444\u0435\u0434\u0435\u0440\u0430\u043B\u044C\u043D\u044B\u0445 \u0442\u0440\u0430\u0441\u0441\u0430\u0445", t: typeId.mon, emp: timofeev, dl: d(1), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435" },
      { name: "\u0420\u0430\u0431\u043E\u0442\u0430 \u0415\u0414\u0414\u0421: \u0437\u0430\u044F\u0432\u043A\u0438 \u0437\u0430 \u0441\u0443\u0442\u043A\u0438", t: typeId.table, emp: kabanov, dl: null, st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435" },
      { name: "\u041F\u0438\u0441\u044C\u043C\u043E \u041C\u0438\u043D\u0438\u0441\u0442\u0440\u0443: \u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u0438\u043B \u0438 \u0441\u0440\u0435\u0434\u0441\u0442\u0432", t: typeId.letter, emp: ovchinnikova, dl: d(7), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435" },
      { name: "\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u0427\u0421 \u0440\u0435\u0433\u0438\u043E\u043D\u0430 (\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F)", t: typeId.table, emp: vetrova, dl: d(0), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435" },
      { name: "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u043B\u0435\u0434\u043E\u0432\u043E\u0439 \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438", t: typeId.mon, emp: litvinova, dl: d(3), st: "\u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E", deputy: gromov, dFrom: d(-4), dTo: d(6) },
      // дублёр, но приостановлен
      { name: "\u0423\u0447\u0451\u0442 \u043F\u0443\u043D\u043A\u0442\u043E\u0432 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0440\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u044F", t: typeId.mon, emp: timofeev, dl: null, st: "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" }
    ];
    const monIds = [];
    for (const m of mons) {
      monIds.push(
        insert(db2, "monitorings", {
          name: m.name,
          type_id: m.t,
          employee_id: m.emp,
          deadline: m.dl,
          note: "",
          status: m.st,
          deputy_employee_id: m.deputy ?? null,
          deputy_from: m.dFrom ?? null,
          deputy_to: m.dTo ?? null,
          created_at: ts,
          updated_at: ts
        })
      );
    }
    const edos = [
      { num: "\u0418\u0421\u0425-145", sum: "\u041E \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0435 \u043A \u043F\u0430\u0432\u043E\u0434\u043A\u043E\u043E\u043F\u0430\u0441\u043D\u043E\u043C\u0443 \u043F\u0435\u0440\u0438\u043E\u0434\u0443", instr: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0440\u0430\u0441\u0447\u0451\u0442 \u0441\u0438\u043B \u0438 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u0434\u043E\u043A\u043B\u0430\u0434\u0430, \u043D\u0430\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432 \u0413\u0423", resp: vetrova, ct: "red", dl: d(-3), appr: "\u043D\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u0438", work: [[-5, "\u0417\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u044B \u0440\u0430\u0441\u0447\u0451\u0442\u044B \u0443 \u043E\u0442\u0434\u0435\u043B\u043E\u0432"], [-2, "\u0421\u0432\u043E\u0434 \u0440\u0430\u0441\u0447\u0451\u0442\u043E\u0432 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0443 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F"]] },
      { num: "\u0412\u0425-2031", sum: "\u041F\u0438\u0441\u044C\u043C\u043E \u041C\u0427\u0421 \u0420\u043E\u0441\u0441\u0438\u0438: \u0444\u043E\u0440\u043C\u0430 \u0424\u0421-9", instr: "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0444\u043E\u0440\u043C\u0443 \u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0434\u043E \u0441\u0440\u043E\u043A\u0430", resp: panova, ct: "red", dl: d(1), appr: "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", sub: "\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C \u2014 \u0420\u0435\u043C\u0438\u0437\u043E\u0432 \u0410.\u0412.", work: [[-1, "\u0424\u043E\u0440\u043C\u0430 \u043F\u0440\u0435\u0434\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0430, \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u0430 \u043D\u0430 \u0441\u0432\u0435\u0440\u043A\u0443"]] },
      { num: "\u0418\u0421\u0425-148", sum: "\u0414\u043E\u043A\u043B\u0430\u0434 \u0432 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044E \u043E\u0431\u043B\u0430\u0441\u0442\u0438", instr: "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0441 \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u043E\u043C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", resp: kabanov, ct: "green", dl: d(0), appr: "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", work: [[0, "\u0422\u0435\u043A\u0441\u0442 \u0434\u043E\u043A\u043B\u0430\u0434\u0430 \u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438 \u0443 \u0421.\u0418. \u0421\u043E\u043A\u043E\u043B\u043E\u0432\u0430"]] },
      { num: "\u0412\u0425-2044", sum: "\u0423\u0442\u043E\u0447\u043D\u0451\u043D\u043D\u044B\u0439 \u043F\u043B\u0430\u043D \u043C\u0435\u0440\u043E\u043F\u0440\u0438\u044F\u0442\u0438\u0439 \u041A\u0427\u0421", instr: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u043E\u0442\u0434\u0435\u043B\u0430, \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u044F \u2014 \u043F\u0438\u0441\u044C\u043C\u043E\u043C", resp: gromov, ct: "green", dl: d(4), appr: "", work: [[-1, "\u041F\u043E\u0437\u0438\u0446\u0438\u0438 \u043E\u0442\u0434\u0435\u043B\u0430 \u0441\u0432\u0435\u0440\u0435\u043D\u044B, \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0439 \u043D\u0435\u0442"]] },
      { num: "\u0418\u0421\u0425-151", sum: "\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435 \u0433\u0440\u0430\u0436\u0434\u0430\u043D\u0438\u043D\u0430", instr: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442 \u0432 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u0441\u0440\u043E\u043A", resp: zasukhina, ct: "green", dl: d(2), appr: "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D", work: [[0, "\u041E\u0442\u0432\u0435\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D, \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u0437\u0430\u044F\u0432\u0438\u0442\u0435\u043B\u044E"]] },
      { num: "\u0412\u0425-2050", sum: "\u0417\u0430\u043F\u0440\u043E\u0441 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044C\u043D\u044B\u043C \u0440\u0435\u0437\u0435\u0440\u0432\u0430\u043C", instr: "\u041F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0432\u044B\u043F\u0438\u0441\u043A\u0443 \u0438\u0437 \u0440\u0435\u0435\u0441\u0442\u0440\u0430", resp: remizov, ct: "red", dl: d(-1), appr: "", work: [[-2, "\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u043B\u0438 \u0432\u044B\u043F\u0438\u0441\u043A\u0443 \u0432 \u0441\u0435\u043A\u0442\u043E\u0440\u0435 \u041C\u0422\u041E"]] },
      { num: "\u0418\u0421\u0425-153", sum: "\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043F\u0440\u043E\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0438 \u041E\u0414 \u043D\u0430 \u043D\u0435\u0434\u0435\u043B\u0435", instr: "\u0415\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u0434\u0435\u0436\u0443\u0440\u0441\u0442\u0432\u0443", resp: timofeev, ct: "green", dl: d(3), appr: "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", work: [[1, "\u0421\u0432\u043E\u0434\u043A\u0430 \u0441\u043E\u0431\u0440\u0430\u043D\u0430, \u0436\u0434\u0451\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0438\u044F"]] },
      { num: "\u0412\u0425-2057", sum: "\u041C\u0435\u0442\u043E\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u0443\u0447\u0451\u0442\u0443", instr: "\u041E\u0437\u043D\u0430\u043A\u043E\u043C\u0438\u0442\u044C \u043B\u0438\u0447\u043D\u044B\u0439 \u0441\u043E\u0441\u0442\u0430\u0432", resp: ovchinnikova, ct: "green", dl: null, appr: "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D", work: [[-6, "\u0420\u0430\u0437\u043E\u0441\u043B\u0430\u043D\u043E \u043F\u043E \u043F\u043E\u0434\u0440\u0430\u0437\u0434\u0435\u043B\u0435\u043D\u0438\u044F\u043C"]] },
      { num: "\u0418\u0421\u0425-155", sum: "\u0421\u0432\u0435\u0434\u0435\u043D\u0438\u044F \u043E \u043F\u0440\u0438\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0438 \u0442\u0435\u0445\u043D\u0438\u043A\u0438", instr: "\u0421\u0432\u0435\u0441\u0442\u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u043F\u043E\u0434\u0440\u0430\u0437\u0434\u0435\u043B\u0435\u043D\u0438\u044F\u043C", resp: dyuzhev, ct: "green", dl: d(6), off: true, appr: "", work: [[-3, "\u0421\u0432\u0435\u0434\u0435\u043D\u044B, \u0441\u043D\u044F\u0442 \u0441 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F \u043A\u0430\u043A \u043D\u0435\u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439"]] },
      { num: "\u0412\u0425-2061", sum: "\u041F\u043B\u0430\u043D \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0441\u0438\u0441\u0442\u0435\u043C \u043E\u043F\u043E\u0432\u0435\u0449\u0435\u043D\u0438\u044F", instr: "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u0442\u044C \u0434\u0430\u0442\u044B \u0441 \u0433\u043B\u0430\u0432\u0430\u043C\u0438 \u043C\u0443\u043D\u0438\u0446\u0438\u043F\u0430\u043B\u0438\u0442\u0435\u0442\u043E\u0432", resp: vetrova, ct: "red", dl: d(0), appr: "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", work: [[-1, "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0433\u0440\u0430\u0444\u0438\u043A\u0430 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0435"]] },
      { num: "\u0418\u0421\u0425-158", sum: "\u0425\u043E\u0434\u0430\u0442\u0430\u0439\u0441\u0442\u0432\u043E \u043E \u043F\u043E\u043E\u0449\u0440\u0435\u043D\u0438\u0438 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432", instr: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u0438 \u043A \u043D\u0430\u0433\u0440\u0430\u0436\u0434\u0435\u043D\u0438\u044E", resp: zasukhina, ct: "green", dl: d(10), appr: "", work: [[2, "\u0421\u043F\u0438\u0441\u043A\u0438 \u0441\u043E\u0431\u0440\u0430\u043D\u044B, \u0433\u043E\u0442\u043E\u0432\u044F\u0442\u0441\u044F \u043F\u0440\u043E\u0435\u043A\u0442\u044B \u043F\u0440\u0438\u043A\u0430\u0437\u043E\u0432"]] }
    ];
    for (const doc of edos) {
      const id = insert(db2, "edo_documents", {
        doc_number: doc.num,
        doc_url: "",
        summary: doc.sum,
        instruction: doc.instr,
        responsible_id: doc.resp,
        participants: "",
        control_type: doc.ct,
        deadline: doc.dl,
        off_control: doc.off ? 1 : 0,
        off_control_date: doc.off ? d(-1) : null,
        sub_resolution: doc.sub ?? "",
        approval_number: doc.appr ? `\u041B\u0421-${Math.floor(Math.random() * 900 + 100)}` : "",
        approval_url: "",
        approval_status: doc.appr ?? "",
        archived: 0,
        created_at: ts,
        updated_at: ts
      });
      for (const [off, text] of doc.work) {
        insert(db2, "work_log", { entity_type: "edo", entity_id: id, log_date: d(off), text, created_at: ts });
      }
    }
    const tasks2 = [
      { theme: "\u041F\u0430\u0432\u043E\u0434\u043E\u043A", title: "\u0421\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0445\u0435\u043C\u0443 \u044D\u0432\u0430\u043A\u0443\u0430\u0446\u0438\u0438 \u043C\u043A\u0440. \u0417\u0430\u0440\u0435\u0447\u043D\u044B\u0439", pr: "\u0441\u0440\u043E\u0447\u043D\u043E", dl: d(1), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435", next: "\u041F\u043E\u0437\u0432\u043E\u043D\u0438\u0442\u044C \u0432 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044E, \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u044C \u0447\u0438\u0441\u043B\u043E \u0436\u0438\u0442\u0435\u043B\u0435\u0439", parts: "\u0412\u0435\u0442\u0440\u043E\u0432\u0430 \u0410.\u0421., \u0413\u0440\u043E\u043C\u043E\u0432 \u041F.\u0410.", items: [["\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043D\u0430\u0441\u0435\u043B\u0435\u043D\u0438\u044F", true], ["\u0421\u0432\u0435\u0440\u0438\u0442\u044C \u0442\u043E\u0447\u043A\u0438 \u0441\u0431\u043E\u0440\u0430", false], ["\u041E\u0442\u0440\u0438\u0441\u043E\u0432\u0430\u0442\u044C \u0441\u0445\u0435\u043C\u0443", false]], logs: [[-1, "\u0414\u0430\u043D\u043D\u044B\u0435 \u043D\u0430\u0441\u0435\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B, \u0441\u0445\u0435\u043C\u044B \u043F\u0440\u0430\u0432\u043B\u044E"]], updDaysAgo: 1 },
      { theme: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u043E\u0431\u043E\u0440\u043E\u0442", title: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u043E\u0442\u0447\u0451\u0442 \u043F\u043E \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044E \u0437\u0430 \u043E\u043A\u0442\u044F\u0431\u0440\u044C", pr: "\u0432\u044B\u0441\u043E\u043A\u0438\u0439", dl: d(3), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435", next: "\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u043E\u0441\u0442\u0430\u0442\u043A\u0438 \u0443 \u0441\u0435\u043A\u0442\u043E\u0440\u043E\u0432", items: [["\u0412\u044B\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0440\u0435\u0435\u0441\u0442\u0440", true], ["\u041F\u043E\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438", true], ["\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u044C \u0442\u0438\u0442\u0443\u043B\u044C\u043D\u044B\u0439 \u043B\u0438\u0441\u0442", false]], logs: [[-2, "\u0420\u0435\u0435\u0441\u0442\u0440 \u0432\u044B\u0433\u0440\u0443\u0436\u0435\u043D"]], updDaysAgo: 12 },
      // давно без обновлений → оранжевая метка
      { theme: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044C\u043D\u043E\u0435 \u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0435\u043D\u0438\u0435", title: "\u0417\u0430\u043A\u0430\u0437 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u043E\u0432 \u0421\u0418\u0417 \u043D\u0430 \u0437\u0438\u043C\u0443", pr: "\u043E\u0431\u044B\u0447\u043D\u044B\u0439", dl: d(9), st: "\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435", wait: d(0), items: [["\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0438 \u043F\u043E\u0434\u0440\u0430\u0437\u0434\u0435\u043B\u0435\u043D\u0438\u0439", true], ["\u0421\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044E", false]], logs: [] },
      { theme: "\u0423\u0447\u0435\u043D\u0438\u044F", title: "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u041A\u0428\u0423 \u043F\u043E \u043B\u0438\u043A\u0432\u0438\u0434\u0430\u0446\u0438\u0438 \u0443\u0441\u043B\u043E\u0432\u043D\u043E\u0433\u043E \u0427\u0421", pr: "\u0432\u044B\u0441\u043E\u043A\u0438\u0439", dl: d(14), st: "\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435", wait: d(12), next: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043A\u0438 \u0412\u0435\u0442\u0440\u043E\u0432\u043E\u0439", items: [["\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043B\u0435\u0433\u0435\u043D\u0434\u044B", true], ["\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0439 \u043F\u043B\u0430\u043D", false]], logs: [[-4, "\u041B\u0435\u0433\u0435\u043D\u0434\u0430 \u043D\u0430\u0431\u0440\u043E\u0441\u0430\u043D\u0430"]] },
      { theme: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0438", title: "\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u043F\u0440\u0435\u0434\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u043A\u0443\u0440\u0430\u0442\u0443\u0440\u044B", pr: "\u0441\u0440\u043E\u0447\u043D\u043E", dl: d(-2), st: "\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435", next: "\u041F\u0435\u0440\u0435\u0434\u0430\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0439 \u043F\u0430\u043A\u0435\u0442 \u0432 \u043A\u0430\u043D\u0446\u0435\u043B\u044F\u0440\u0438\u044E", items: [["\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u044F", true], ["\u041F\u0440\u0438\u043B\u043E\u0436\u0438\u0442\u044C \u043F\u0440\u0438\u043A\u0430\u0437\u044B", true], ["\u0420\u0430\u0441\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u0442\u044C", true]], logs: [[-1, "\u041F\u0430\u043A\u0435\u0442 \u043D\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 \u0443 \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A\u0430 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F"]] },
      { theme: "\u0410\u0432\u0442\u043E\u0442\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442", title: "\u0417\u0430\u043C\u0435\u043D\u0430 \u0448\u0438\u043D \u0441\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0445 \u043C\u0430\u0448\u0438\u043D", pr: "\u043D\u0438\u0437\u043A\u0438\u0439", dl: null, st: "\u0432\u0445\u043E\u0434\u044F\u0449\u0430\u044F", items: [], logs: [] },
      { theme: "\u041E\u0431\u0443\u0447\u0435\u043D\u0438\u0435", title: "\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u0436\u0438\u0440\u043E\u0432\u043A\u0443 \u043C\u043E\u043B\u043E\u0434\u044B\u0445 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u0432", pr: "\u043E\u0431\u044B\u0447\u043D\u044B\u0439", dl: d(20), st: "\u0432\u0445\u043E\u0434\u044F\u0449\u0430\u044F", parts: "\u041A\u0430\u0431\u0430\u043D\u043E\u0432 \u0414.\u042E., \u0422\u0438\u043C\u043E\u0444\u0435\u0435\u0432 \u041D.\u0420.", items: [["\u0421\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0436\u0435\u043B\u0430\u044E\u0449\u0438\u0445", false], ["\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u0442\u044C \u043D\u0430\u0441\u0442\u0430\u0432\u043D\u0438\u043A\u043E\u0432", false]], logs: [] },
      { theme: "\u041E\u0442\u0447\u0451\u0442\u043D\u043E\u0441\u0442\u044C", title: "\u0424\u043E\u0440\u043C\u0430 1-\u0427\u0421 \u0437\u0430 \u043A\u0432\u0430\u0440\u0442\u0430\u043B", pr: "\u0432\u044B\u0441\u043E\u043A\u0438\u0439", dl: d(-6), st: "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E", items: [["\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C", true], ["\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C", true]], logs: [[-8, "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430 \u0432 \u0440\u0435\u0433\u0438\u043E\u043D"], [-7, "\u041F\u0440\u0438\u043D\u044F\u0442\u0430 \u0431\u0435\u0437 \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0439"]] },
      { theme: "\u0425\u043E\u0437\u0432\u043E\u043F\u0440\u043E\u0441\u044B", title: "\u0420\u0435\u043C\u043E\u043D\u0442 \u043A\u043E\u043D\u0434\u0438\u0446\u0438\u043E\u043D\u0435\u0440\u0430 \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0435 \u041E\u041F", pr: "\u043D\u0438\u0437\u043A\u0438\u0439", dl: null, st: "\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E", items: [], logs: [[-10, "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430: \u0432\u044B\u0434\u0435\u043B\u0435\u043D \u0431\u044E\u0434\u0436\u0435\u0442 \u043D\u0430 \u0437\u0430\u043C\u0435\u043D\u0443 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F"]] },
      { theme: "\u0421\u0432\u044F\u0437\u044C", title: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u044B\u0445 \u043A\u0430\u043D\u0430\u043B\u043E\u0432 \u0441\u0432\u044F\u0437\u0438", pr: "\u043E\u0431\u044B\u0447\u043D\u044B\u0439", dl: d(5), st: "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435", next: "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u0442\u044C \u0432\u0440\u0435\u043C\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0441 \u0443\u0437\u043B\u043E\u043C \u0441\u0432\u044F\u0437\u0438", items: [["\u0413\u0440\u0430\u0444\u0438\u043A \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438", true], ["\u041F\u0440\u043E\u0433\u043E\u043D \u0441\u043F\u0443\u0442\u043D\u0438\u043A\u043E\u0432\u043E\u0433\u043E \u043A\u0430\u043D\u0430\u043B\u0430", false], ["\u041F\u0440\u043E\u0433\u043E\u043D \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0432\u043E\u043B\u043D\u043E\u0432\u043E\u0433\u043E", false]], logs: [[-3, "\u0413\u0440\u0430\u0444\u0438\u043A \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D"]], updDaysAgo: 3 }
    ];
    for (const t of tasks2) {
      const created = d(t.logs.length ? Math.min(...t.logs.map((l) => l[0])) : -4);
      const upd = t.updDaysAgo != null ? shiftIso(today, -t.updDaysAgo) + " 09:00:00" : ts;
      const id = insert(db2, "tasks", {
        theme: t.theme,
        title: t.title,
        priority: t.pr,
        deadline: t.dl,
        status: t.st,
        wait_until: t.wait ?? null,
        next_action: t.next ?? "",
        participants: t.parts ?? "",
        note: "",
        archived: t.st === "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" || t.st === "\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E" ? 1 : 0,
        created_at: created + " 09:00:00",
        updated_at: upd
      });
      t.items.forEach(([title, done], idx) => {
        insert(db2, "task_check_items", { task_id: id, title, done: done ? 1 : 0, sort_order: idx + 1 });
      });
      for (const [off, text] of t.logs) {
        insert(db2, "work_log", { entity_type: "task", entity_id: id, log_date: d(off), text, created_at: ts });
      }
    }
    insert(db2, "employees", {
      full_name: "\u041A\u0440\u0430\u043F\u0438\u0432\u0438\u043D \u0421\u0435\u0440\u0433\u0435\u0439 \u041B\u044C\u0432\u043E\u0432\u0438\u0447",
      department_id: o2,
      position: "\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442",
      internal_phone: "4125",
      mobile_phone: "",
      email: "",
      birthday: "1980-06-02",
      functions: "\u041D\u0430\u0440\u0443\u0436\u043D\u043E\u0435 \u043D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435",
      is_fired: 1,
      fired_date: d(-30),
      archived: 0,
      created_at: ts,
      updated_at: ts
    });
    void dir2;
    void vetrova;
    void gromov;
    void litvinova;
    void kabanov;
    void ovchinnikova;
    void timofeev;
    void zasukhina;
    void remizov;
    void panova;
    void dyuzhev;
    void selezneva;
    void monIds;
  })();
}

// src/electron/services/dashboardService.ts
function buildDashboard(s) {
  const today = todayIso();
  const appSettings = s.settings.get();
  const returnedIds = new Set(s.tasks.returnedFromWaitToday());
  const edoAll = s.edo.list({ offControl: "off" }, appSettings);
  const burning = edoAll.filter((d) => d.days_left != null && d.days_left <= 3);
  const overdue = edoAll.filter((d) => d.days_left != null && d.days_left < 0);
  const dueToday = edoAll.filter((d) => d.days_left === 0);
  const next3 = edoAll.filter((d) => d.days_left != null && d.days_left >= 1 && d.days_left <= 3);
  const monitoringRedFlags = s.monitorings.listMonitorings({}).filter((m) => m.red_flag);
  const employees = s.team.listEmployees({ includeArchived: false });
  const birthdaysSoon = employees.filter((e) => e.days_to_birthday != null && e.days_to_birthday <= 3).sort((a, b) => (a.days_to_birthday ?? 0) - (b.days_to_birthday ?? 0));
  const timeline = s.team.absenceTimeline(7);
  const returningSoon = timeline.filter((t) => {
    const daysTo = daysBetween(t.date_to, today);
    return daysTo >= 0 && daysTo <= 7;
  }).map((t) => {
    const emp = employees.find((e) => e.id === t.employee_id);
    if (!emp) return null;
    return { employee: emp, absence: { id: 0, employee_id: t.employee_id, absence_type: t.absence_type, date_from: t.date_from, date_to: t.date_to, note: t.note } };
  }).filter((x) => x !== null);
  const allTasks = s.tasks.list({});
  const returnedTasks = allTasks.filter((t) => returnedIds.has(t.id) || t.returned_today);
  return {
    counters: {
      overdue: overdue.length,
      today: dueToday.length,
      next3: next3.length,
      returnedToday: returnedTasks.length
    },
    edoHot: burning,
    monitoringRedFlags,
    birthdaysSoon,
    returningSoon,
    returnedTasks
  };
}
function globalSearch(s, query) {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return { employees: [], monitorings: [], edo: [], tasks: [] };
  }
  const like = `%${q}%`;
  const limit = 8;
  const employees = s.db.prepare(
    `SELECT id, full_name, position FROM employees WHERE archived = 0 AND (lower(full_name) LIKE ? OR lower(position) LIKE ?) LIMIT ${limit}`
  ).all(like, like);
  const monitorings2 = s.db.prepare(
    `SELECT m.id, m.name, tt.name AS type_name, e.full_name AS employee_name
       FROM monitorings m JOIN task_types tt ON tt.id = m.type_id JOIN employees e ON e.id = m.employee_id
       WHERE m.status != '\u0430\u0440\u0445\u0438\u0432' AND lower(m.name) LIKE ? LIMIT ${limit}`
  ).all(like);
  const edo2 = s.db.prepare(
    `SELECT id, doc_number, summary FROM edo_documents WHERE archived = 0 AND (lower(doc_number) LIKE ? OR lower(summary) LIKE ?) LIMIT ${limit}`
  ).all(like, like);
  const tasks2 = s.db.prepare(
    `SELECT id, title, theme, status FROM tasks WHERE archived = 0 AND status NOT IN ('\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E','\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E') AND (lower(title) LIKE ? OR lower(theme) LIKE ?) LIMIT ${limit}`
  ).all(like, like);
  return {
    employees: employees.map((e) => ({ entity: "employee", id: e.id, title: e.full_name, subtitle: e.position || "\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A" })),
    monitorings: monitorings2.map((m) => ({ entity: "monitoring", id: m.id, title: m.name, subtitle: `${m.type_name} \xB7 ${m.employee_name}` })),
    edo: edo2.map((d) => ({ entity: "edo", id: d.id, title: d.doc_number, subtitle: d.summary || "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u042D\u0414\u041E" })),
    tasks: tasks2.map((t) => ({ entity: "task", id: t.id, title: t.title, subtitle: [t.theme, t.status].filter(Boolean).join(" \xB7 ") }))
  };
}

// scripts/smoke-entry.ts
var dir = process.argv[2];
var raw = initDatabase(dir);
var db = typed(raw);
var settings = new SettingsService(db);
var team = new TeamRepository(db);
var monitorings = new MonitoringRepository(db);
var edo = new EdoRepository(db);
var tasks = new TaskRepository(db);
var workLog = new WorkLogRepository(db);
var services = { db, settings, team, monitorings, edo, tasks, workLog };
loadDemoData(db);
var dash = buildDashboard(services);
var search = globalSearch(services, "\u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A");
var empCount = team.listEmployees({ includeArchived: false }).length;
var monCount = monitorings.listMonitorings({}).length;
var edoCount = edo.list({}, settings.get()).length;
var taskCount = tasks.list({}).length;
console.log(JSON.stringify({
  employees: empCount,
  monitorings: monCount,
  edo: edoCount,
  tasks: taskCount,
  counters: dash.counters,
  edoHot: dash.edoHot.length,
  monitoringRedFlags: dash.monitoringRedFlags.length,
  birthdaysSoon: dash.birthdaysSoon.length,
  returningSoon: dash.returningSoon.length,
  returnedTasks: dash.returnedTasks.length,
  searchEmployees: search.employees.length
}, null, 2));
