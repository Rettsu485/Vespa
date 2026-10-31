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

// electron/main.ts
var import_electron2 = require("electron");
var import_node_path4 = __toESM(require("node:path"));

// electron/db/database.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var MIGRATIONS_DIR = import_node_path.default.join(__dirname, "migrations");
function runMigrations(db) {
  const version = db.pragma("user_version", { simple: true });
  const files = import_node_fs.default.readdirSync(MIGRATIONS_DIR).filter((f) => /^v\d+.*\.sql$/.test(f)).sort();
  files.forEach((file, idx) => {
    const targetVersion = idx + 1;
    if (version >= targetVersion) return;
    const sql = import_node_fs.default.readFileSync(import_node_path.default.join(MIGRATIONS_DIR, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${targetVersion}`);
    })();
  });
}
function openDatabase(dbPath) {
  const db = new import_better_sqlite3.default(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

// electron/db/settings.ts
var import_better_sqlite32 = __toESM(require("better-sqlite3"));
var import_node_fs2 = __toESM(require("node:fs"));
var import_node_path2 = __toESM(require("node:path"));

// shared/types.ts
var DEFAULT_SETTINGS = {
  theme: "system",
  density: "normal",
  controlRedName: "\u041A\u0440\u0430\u0441\u043D\u044B\u0439",
  controlGreenName: "\u0417\u0435\u043B\u0451\u043D\u044B\u0439",
  edoLinkTemplate: "https://sed.example.ru/doc/{\u043D\u043E\u043C\u0435\u0440}"
};

// electron/db/settings.ts
var SETTINGS_KEY = "app";
function getSettings(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key=?").get(SETTINGS_KEY);
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_SETTINGS, ...isRecord(parsed) ? parsed : {} };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function updateSettings(db, patch) {
  const merged = { ...getSettings(db), ...patch };
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`
  ).run(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}
function isRecord(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
var BACKUP_KEEP = 30;
async function backupNow(dbPath, backupsDir) {
  import_node_fs2.default.mkdirSync(backupsDir, { recursive: true });
  const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const target = import_node_path2.default.join(backupsDir, `shtab-${stamp}.db`);
  const source = new import_better_sqlite32.default(dbPath, { readonly: true });
  try {
    await source.backup(target);
  } finally {
    source.close();
  }
  rotateBackups(backupsDir, BACKUP_KEEP);
  return target;
}
function rotateBackups(dir, keep) {
  const files = import_node_fs2.default.readdirSync(dir).filter((f) => f.startsWith("shtab-") && f.endsWith(".db")).map((f) => ({ f, mtime: import_node_fs2.default.statSync(import_node_path2.default.join(dir, f)).mtimeMs })).sort((a, b) => b.mtime - a.mtime);
  files.slice(keep).forEach((x) => import_node_fs2.default.unlinkSync(import_node_path2.default.join(dir, x.f)));
}

// electron/ipc/handlers.ts
var import_electron = require("electron");
var import_node_path3 = __toESM(require("node:path"));

// node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var millisecondsInWeek = 6048e5;
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

// node_modules/date-fns/addDays.js
function addDays(date, amount, options) {
  const _date = toDate(date, options?.in);
  if (isNaN(amount)) return constructFrom(options?.in || date, NaN);
  if (!amount) return _date;
  _date.setDate(_date.getDate() + amount);
  return _date;
}

// node_modules/date-fns/_lib/defaultOptions.js
var defaultOptions = {};
function getDefaultOptions() {
  return defaultOptions;
}

// node_modules/date-fns/startOfWeek.js
function startOfWeek(date, options) {
  const defaultOptions2 = getDefaultOptions();
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions2.weekStartsOn ?? defaultOptions2.locale?.options?.weekStartsOn ?? 0;
  const _date = toDate(date, options?.in);
  const day = _date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  _date.setDate(_date.getDate() - diff);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/startOfISOWeek.js
function startOfISOWeek(date, options) {
  return startOfWeek(date, { ...options, weekStartsOn: 1 });
}

// node_modules/date-fns/getISOWeekYear.js
function getISOWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const fourthOfJanuaryOfNextYear = constructFrom(_date, 0);
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4);
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear);
  const fourthOfJanuaryOfThisYear = constructFrom(_date, 0);
  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4);
  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear);
  if (_date.getTime() >= startOfNextYear.getTime()) {
    return year + 1;
  } else if (_date.getTime() >= startOfThisYear.getTime()) {
    return year;
  } else {
    return year - 1;
  }
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

// node_modules/date-fns/startOfISOWeekYear.js
function startOfISOWeekYear(date, options) {
  const year = getISOWeekYear(date, options);
  const fourthOfJanuary = constructFrom(options?.in || date, 0);
  fourthOfJanuary.setFullYear(year, 0, 4);
  fourthOfJanuary.setHours(0, 0, 0, 0);
  return startOfISOWeek(fourthOfJanuary);
}

// node_modules/date-fns/isDate.js
function isDate(value) {
  return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
}

// node_modules/date-fns/isValid.js
function isValid(date) {
  return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
}

// node_modules/date-fns/startOfYear.js
function startOfYear(date, options) {
  const date_ = toDate(date, options?.in);
  date_.setFullYear(date_.getFullYear(), 0, 1);
  date_.setHours(0, 0, 0, 0);
  return date_;
}

// node_modules/date-fns/locale/en-US/_lib/formatDistance.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "less than a second",
    other: "less than {{count}} seconds"
  },
  xSeconds: {
    one: "1 second",
    other: "{{count}} seconds"
  },
  halfAMinute: "half a minute",
  lessThanXMinutes: {
    one: "less than a minute",
    other: "less than {{count}} minutes"
  },
  xMinutes: {
    one: "1 minute",
    other: "{{count}} minutes"
  },
  aboutXHours: {
    one: "about 1 hour",
    other: "about {{count}} hours"
  },
  xHours: {
    one: "1 hour",
    other: "{{count}} hours"
  },
  xDays: {
    one: "1 day",
    other: "{{count}} days"
  },
  aboutXWeeks: {
    one: "about 1 week",
    other: "about {{count}} weeks"
  },
  xWeeks: {
    one: "1 week",
    other: "{{count}} weeks"
  },
  aboutXMonths: {
    one: "about 1 month",
    other: "about {{count}} months"
  },
  xMonths: {
    one: "1 month",
    other: "{{count}} months"
  },
  aboutXYears: {
    one: "about 1 year",
    other: "about {{count}} years"
  },
  xYears: {
    one: "1 year",
    other: "{{count}} years"
  },
  overXYears: {
    one: "over 1 year",
    other: "over {{count}} years"
  },
  almostXYears: {
    one: "almost 1 year",
    other: "almost {{count}} years"
  }
};
var formatDistance = (token, count, options) => {
  let result;
  const tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options?.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "in " + result;
    } else {
      return result + " ago";
    }
  }
  return result;
};

// node_modules/date-fns/locale/_lib/buildFormatLongFn.js
function buildFormatLongFn(args) {
  return (options = {}) => {
    const width = options.width ? String(options.width) : args.defaultWidth;
    const format2 = args.formats[width] || args.formats[args.defaultWidth];
    return format2;
  };
}

// node_modules/date-fns/locale/en-US/_lib/formatLong.js
var dateFormats = {
  full: "EEEE, MMMM do, y",
  long: "MMMM do, y",
  medium: "MMM d, y",
  short: "MM/dd/yyyy"
};
var timeFormats = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats = {
  full: "{{date}} 'at' {{time}}",
  long: "{{date}} 'at' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};

// node_modules/date-fns/locale/en-US/_lib/formatRelative.js
var formatRelativeLocale = {
  lastWeek: "'last' eeee 'at' p",
  yesterday: "'yesterday at' p",
  today: "'today at' p",
  tomorrow: "'tomorrow at' p",
  nextWeek: "eeee 'at' p",
  other: "P"
};
var formatRelative = (token, _date, _baseDate, _options) => formatRelativeLocale[token];

// node_modules/date-fns/locale/_lib/buildLocalizeFn.js
function buildLocalizeFn(args) {
  return (value, options) => {
    const context = options?.context ? String(options.context) : "standalone";
    let valuesArray;
    if (context === "formatting" && args.formattingValues) {
      const defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
      const width = options?.width ? String(options.width) : defaultWidth;
      valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
    } else {
      const defaultWidth = args.defaultWidth;
      const width = options?.width ? String(options.width) : args.defaultWidth;
      valuesArray = args.values[width] || args.values[defaultWidth];
    }
    const index = args.argumentCallback ? args.argumentCallback(value) : value;
    return valuesArray[index];
  };
}

// node_modules/date-fns/locale/en-US/_lib/localize.js
var eraValues = {
  narrow: ["B", "A"],
  abbreviated: ["BC", "AD"],
  wide: ["Before Christ", "Anno Domini"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["Q1", "Q2", "Q3", "Q4"],
  wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
};
var monthValues = {
  narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  abbreviated: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ],
  wide: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]
};
var dayValues = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  wide: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ]
};
var dayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  }
};
var ordinalNumber = (dirtyNumber, _options) => {
  const number = Number(dirtyNumber);
  const rem100 = number % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + "st";
      case 2:
        return number + "nd";
      case 3:
        return number + "rd";
    }
  }
  return number + "th";
};
var localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: (quarter) => quarter - 1
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};

// node_modules/date-fns/locale/_lib/buildMatchFn.js
function buildMatchFn(args) {
  return (string, options = {}) => {
    const width = options.width;
    const matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
    const matchResult = string.match(matchPattern);
    if (!matchResult) {
      return null;
    }
    const matchedString = matchResult[0];
    const parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
    const key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, (pattern) => pattern.test(matchedString)) : (
      // [TODO] -- I challenge you to fix the type
      findKey(parsePatterns, (pattern) => pattern.test(matchedString))
    );
    let value;
    value = args.valueCallback ? args.valueCallback(key) : key;
    value = options.valueCallback ? (
      // [TODO] -- I challenge you to fix the type
      options.valueCallback(value)
    ) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}
function findKey(object, predicate) {
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key) && predicate(object[key])) {
      return key;
    }
  }
  return void 0;
}
function findIndex(array, predicate) {
  for (let key = 0; key < array.length; key++) {
    if (predicate(array[key])) {
      return key;
    }
  }
  return void 0;
}

// node_modules/date-fns/locale/_lib/buildMatchPatternFn.js
function buildMatchPatternFn(args) {
  return (string, options = {}) => {
    const matchResult = string.match(args.matchPattern);
    if (!matchResult) return null;
    const matchedString = matchResult[0];
    const parseResult = string.match(args.parsePattern);
    if (!parseResult) return null;
    let value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
    value = options.valueCallback ? options.valueCallback(value) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}

// node_modules/date-fns/locale/en-US/_lib/match.js
var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
};
var parseMonthPatterns = {
  narrow: [
    /^j/i,
    /^f/i,
    /^m/i,
    /^a/i,
    /^m/i,
    /^j/i,
    /^j/i,
    /^a/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ],
  any: [
    /^ja/i,
    /^f/i,
    /^mar/i,
    /^ap/i,
    /^may/i,
    /^jun/i,
    /^jul/i,
    /^au/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ]
};
var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};
var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: (value) => parseInt(value, 10)
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: (index) => index + 1
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};

// node_modules/date-fns/locale/en-US.js
var enUS = {
  code: "en-US",
  formatDistance,
  formatLong,
  formatRelative,
  localize,
  match,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};

// node_modules/date-fns/getDayOfYear.js
function getDayOfYear(date, options) {
  const _date = toDate(date, options?.in);
  const diff = differenceInCalendarDays(_date, startOfYear(_date));
  const dayOfYear = diff + 1;
  return dayOfYear;
}

// node_modules/date-fns/getISOWeek.js
function getISOWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfISOWeek(_date) - +startOfISOWeekYear(_date);
  return Math.round(diff / millisecondsInWeek) + 1;
}

// node_modules/date-fns/getWeekYear.js
function getWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const defaultOptions2 = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const firstWeekOfNextYear = constructFrom(options?.in || date, 0);
  firstWeekOfNextYear.setFullYear(year + 1, 0, firstWeekContainsDate);
  firstWeekOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfWeek(firstWeekOfNextYear, options);
  const firstWeekOfThisYear = constructFrom(options?.in || date, 0);
  firstWeekOfThisYear.setFullYear(year, 0, firstWeekContainsDate);
  firstWeekOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfWeek(firstWeekOfThisYear, options);
  if (+_date >= +startOfNextYear) {
    return year + 1;
  } else if (+_date >= +startOfThisYear) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/startOfWeekYear.js
function startOfWeekYear(date, options) {
  const defaultOptions2 = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const year = getWeekYear(date, options);
  const firstWeek = constructFrom(options?.in || date, 0);
  firstWeek.setFullYear(year, 0, firstWeekContainsDate);
  firstWeek.setHours(0, 0, 0, 0);
  const _date = startOfWeek(firstWeek, options);
  return _date;
}

// node_modules/date-fns/getWeek.js
function getWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfWeek(_date, options) - +startOfWeekYear(_date, options);
  return Math.round(diff / millisecondsInWeek) + 1;
}

// node_modules/date-fns/_lib/addLeadingZeros.js
function addLeadingZeros(number, targetLength) {
  const sign = number < 0 ? "-" : "";
  const output = Math.abs(number).toString().padStart(targetLength, "0");
  return sign + output;
}

// node_modules/date-fns/_lib/format/lightFormatters.js
var lightFormatters = {
  // Year
  y(date, token) {
    const signedYear = date.getFullYear();
    const year = signedYear > 0 ? signedYear : 1 - signedYear;
    return addLeadingZeros(token === "yy" ? year % 100 : year, token.length);
  },
  // Month
  M(date, token) {
    const month = date.getMonth();
    return token === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
  },
  // Day of the month
  d(date, token) {
    return addLeadingZeros(date.getDate(), token.length);
  },
  // AM or PM
  a(date, token) {
    const dayPeriodEnumValue = date.getHours() / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return dayPeriodEnumValue.toUpperCase();
      case "aaa":
        return dayPeriodEnumValue;
      case "aaaaa":
        return dayPeriodEnumValue[0];
      case "aaaa":
      default:
        return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
    }
  },
  // Hour [1-12]
  h(date, token) {
    return addLeadingZeros(date.getHours() % 12 || 12, token.length);
  },
  // Hour [0-23]
  H(date, token) {
    return addLeadingZeros(date.getHours(), token.length);
  },
  // Minute
  m(date, token) {
    return addLeadingZeros(date.getMinutes(), token.length);
  },
  // Second
  s(date, token) {
    return addLeadingZeros(date.getSeconds(), token.length);
  },
  // Fraction of second
  S(date, token) {
    const numberOfDigits = token.length;
    const milliseconds = date.getMilliseconds();
    const fractionalSeconds = Math.trunc(
      milliseconds * Math.pow(10, numberOfDigits - 3)
    );
    return addLeadingZeros(fractionalSeconds, token.length);
  }
};

// node_modules/date-fns/_lib/format/formatters.js
var dayPeriodEnum = {
  am: "am",
  pm: "pm",
  midnight: "midnight",
  noon: "noon",
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night"
};
var formatters = {
  // Era
  G: function(date, token, localize2) {
    const era = date.getFullYear() > 0 ? 1 : 0;
    switch (token) {
      // AD, BC
      case "G":
      case "GG":
      case "GGG":
        return localize2.era(era, { width: "abbreviated" });
      // A, B
      case "GGGGG":
        return localize2.era(era, { width: "narrow" });
      // Anno Domini, Before Christ
      case "GGGG":
      default:
        return localize2.era(era, { width: "wide" });
    }
  },
  // Year
  y: function(date, token, localize2) {
    if (token === "yo") {
      const signedYear = date.getFullYear();
      const year = signedYear > 0 ? signedYear : 1 - signedYear;
      return localize2.ordinalNumber(year, { unit: "year" });
    }
    return lightFormatters.y(date, token);
  },
  // Local week-numbering year
  Y: function(date, token, localize2, options) {
    const signedWeekYear = getWeekYear(date, options);
    const weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
    if (token === "YY") {
      const twoDigitYear = weekYear % 100;
      return addLeadingZeros(twoDigitYear, 2);
    }
    if (token === "Yo") {
      return localize2.ordinalNumber(weekYear, { unit: "year" });
    }
    return addLeadingZeros(weekYear, token.length);
  },
  // ISO week-numbering year
  R: function(date, token) {
    const isoWeekYear = getISOWeekYear(date);
    return addLeadingZeros(isoWeekYear, token.length);
  },
  // Extended year. This is a single number designating the year of this calendar system.
  // The main difference between `y` and `u` localizers are B.C. years:
  // | Year | `y` | `u` |
  // |------|-----|-----|
  // | AC 1 |   1 |   1 |
  // | BC 1 |   1 |   0 |
  // | BC 2 |   2 |  -1 |
  // Also `yy` always returns the last two digits of a year,
  // while `uu` pads single digit years to 2 characters and returns other years unchanged.
  u: function(date, token) {
    const year = date.getFullYear();
    return addLeadingZeros(year, token.length);
  },
  // Quarter
  Q: function(date, token, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      // 1, 2, 3, 4
      case "Q":
        return String(quarter);
      // 01, 02, 03, 04
      case "QQ":
        return addLeadingZeros(quarter, 2);
      // 1st, 2nd, 3rd, 4th
      case "Qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      // Q1, Q2, Q3, Q4
      case "QQQ":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "formatting"
        });
      // 1, 2, 3, 4 (narrow quarter; could be not numerical)
      case "QQQQQ":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "formatting"
        });
      // 1st quarter, 2nd quarter, ...
      case "QQQQ":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone quarter
  q: function(date, token, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      // 1, 2, 3, 4
      case "q":
        return String(quarter);
      // 01, 02, 03, 04
      case "qq":
        return addLeadingZeros(quarter, 2);
      // 1st, 2nd, 3rd, 4th
      case "qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      // Q1, Q2, Q3, Q4
      case "qqq":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "standalone"
        });
      // 1, 2, 3, 4 (narrow quarter; could be not numerical)
      case "qqqqq":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "standalone"
        });
      // 1st quarter, 2nd quarter, ...
      case "qqqq":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // Month
  M: function(date, token, localize2) {
    const month = date.getMonth();
    switch (token) {
      case "M":
      case "MM":
        return lightFormatters.M(date, token);
      // 1st, 2nd, ..., 12th
      case "Mo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      // Jan, Feb, ..., Dec
      case "MMM":
        return localize2.month(month, {
          width: "abbreviated",
          context: "formatting"
        });
      // J, F, ..., D
      case "MMMMM":
        return localize2.month(month, {
          width: "narrow",
          context: "formatting"
        });
      // January, February, ..., December
      case "MMMM":
      default:
        return localize2.month(month, { width: "wide", context: "formatting" });
    }
  },
  // Stand-alone month
  L: function(date, token, localize2) {
    const month = date.getMonth();
    switch (token) {
      // 1, 2, ..., 12
      case "L":
        return String(month + 1);
      // 01, 02, ..., 12
      case "LL":
        return addLeadingZeros(month + 1, 2);
      // 1st, 2nd, ..., 12th
      case "Lo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      // Jan, Feb, ..., Dec
      case "LLL":
        return localize2.month(month, {
          width: "abbreviated",
          context: "standalone"
        });
      // J, F, ..., D
      case "LLLLL":
        return localize2.month(month, {
          width: "narrow",
          context: "standalone"
        });
      // January, February, ..., December
      case "LLLL":
      default:
        return localize2.month(month, { width: "wide", context: "standalone" });
    }
  },
  // Local week of year
  w: function(date, token, localize2, options) {
    const week = getWeek(date, options);
    if (token === "wo") {
      return localize2.ordinalNumber(week, { unit: "week" });
    }
    return addLeadingZeros(week, token.length);
  },
  // ISO week of year
  I: function(date, token, localize2) {
    const isoWeek = getISOWeek(date);
    if (token === "Io") {
      return localize2.ordinalNumber(isoWeek, { unit: "week" });
    }
    return addLeadingZeros(isoWeek, token.length);
  },
  // Day of the month
  d: function(date, token, localize2) {
    if (token === "do") {
      return localize2.ordinalNumber(date.getDate(), { unit: "date" });
    }
    return lightFormatters.d(date, token);
  },
  // Day of year
  D: function(date, token, localize2) {
    const dayOfYear = getDayOfYear(date);
    if (token === "Do") {
      return localize2.ordinalNumber(dayOfYear, { unit: "dayOfYear" });
    }
    return addLeadingZeros(dayOfYear, token.length);
  },
  // Day of week
  E: function(date, token, localize2) {
    const dayOfWeek = date.getDay();
    switch (token) {
      // Tue
      case "E":
      case "EE":
      case "EEE":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "EEEEE":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "EEEEEE":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "EEEE":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Local day of week
  e: function(date, token, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      // Numerical value (Nth day of week with current locale or weekStartsOn)
      case "e":
        return String(localDayOfWeek);
      // Padded numerical value
      case "ee":
        return addLeadingZeros(localDayOfWeek, 2);
      // 1st, 2nd, ..., 7th
      case "eo":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "eee":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "eeeee":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "eeeeee":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "eeee":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone local day of week
  c: function(date, token, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      // Numerical value (same as in `e`)
      case "c":
        return String(localDayOfWeek);
      // Padded numerical value
      case "cc":
        return addLeadingZeros(localDayOfWeek, token.length);
      // 1st, 2nd, ..., 7th
      case "co":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "ccc":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "standalone"
        });
      // T
      case "ccccc":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "standalone"
        });
      // Tu
      case "cccccc":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "standalone"
        });
      // Tuesday
      case "cccc":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // ISO day of week
  i: function(date, token, localize2) {
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    switch (token) {
      // 2
      case "i":
        return String(isoDayOfWeek);
      // 02
      case "ii":
        return addLeadingZeros(isoDayOfWeek, token.length);
      // 2nd
      case "io":
        return localize2.ordinalNumber(isoDayOfWeek, { unit: "day" });
      // Tue
      case "iii":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "iiiii":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "iiiiii":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "iiii":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM or PM
  a: function(date, token, localize2) {
    const hours = date.getHours();
    const dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "aaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "aaaaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "aaaa":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM, PM, midnight, noon
  b: function(date, token, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours === 12) {
      dayPeriodEnumValue = dayPeriodEnum.noon;
    } else if (hours === 0) {
      dayPeriodEnumValue = dayPeriodEnum.midnight;
    } else {
      dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    }
    switch (token) {
      case "b":
      case "bb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "bbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "bbbbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "bbbb":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // in the morning, in the afternoon, in the evening, at night
  B: function(date, token, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours >= 17) {
      dayPeriodEnumValue = dayPeriodEnum.evening;
    } else if (hours >= 12) {
      dayPeriodEnumValue = dayPeriodEnum.afternoon;
    } else if (hours >= 4) {
      dayPeriodEnumValue = dayPeriodEnum.morning;
    } else {
      dayPeriodEnumValue = dayPeriodEnum.night;
    }
    switch (token) {
      case "B":
      case "BB":
      case "BBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "BBBBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "BBBB":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Hour [1-12]
  h: function(date, token, localize2) {
    if (token === "ho") {
      let hours = date.getHours() % 12;
      if (hours === 0) hours = 12;
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return lightFormatters.h(date, token);
  },
  // Hour [0-23]
  H: function(date, token, localize2) {
    if (token === "Ho") {
      return localize2.ordinalNumber(date.getHours(), { unit: "hour" });
    }
    return lightFormatters.H(date, token);
  },
  // Hour [0-11]
  K: function(date, token, localize2) {
    const hours = date.getHours() % 12;
    if (token === "Ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Hour [1-24]
  k: function(date, token, localize2) {
    let hours = date.getHours();
    if (hours === 0) hours = 24;
    if (token === "ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Minute
  m: function(date, token, localize2) {
    if (token === "mo") {
      return localize2.ordinalNumber(date.getMinutes(), { unit: "minute" });
    }
    return lightFormatters.m(date, token);
  },
  // Second
  s: function(date, token, localize2) {
    if (token === "so") {
      return localize2.ordinalNumber(date.getSeconds(), { unit: "second" });
    }
    return lightFormatters.s(date, token);
  },
  // Fraction of second
  S: function(date, token) {
    return lightFormatters.S(date, token);
  },
  // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
  X: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    if (timezoneOffset === 0) {
      return "Z";
    }
    switch (token) {
      // Hours and optional minutes
      case "X":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      // Hours, minutes and optional seconds without `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `XX`
      case "XXXX":
      case "XX":
        return formatTimezone(timezoneOffset);
      // Hours, minutes and optional seconds with `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `XXX`
      case "XXXXX":
      case "XXX":
      // Hours and minutes with `:` delimiter
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
  x: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      // Hours and optional minutes
      case "x":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      // Hours, minutes and optional seconds without `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `xx`
      case "xxxx":
      case "xx":
        return formatTimezone(timezoneOffset);
      // Hours, minutes and optional seconds with `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `xxx`
      case "xxxxx":
      case "xxx":
      // Hours and minutes with `:` delimiter
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (GMT)
  O: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      // Short
      case "O":
      case "OO":
      case "OOO":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      // Long
      case "OOOO":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (specific non-location)
  z: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      // Short
      case "z":
      case "zz":
      case "zzz":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      // Long
      case "zzzz":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Seconds timestamp
  t: function(date, token, _localize) {
    const timestamp = Math.trunc(+date / 1e3);
    return addLeadingZeros(timestamp, token.length);
  },
  // Milliseconds timestamp
  T: function(date, token, _localize) {
    return addLeadingZeros(+date, token.length);
  }
};
function formatTimezoneShort(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = Math.trunc(absOffset / 60);
  const minutes = absOffset % 60;
  if (minutes === 0) {
    return sign + String(hours);
  }
  return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
}
function formatTimezoneWithOptionalMinutes(offset, delimiter) {
  if (offset % 60 === 0) {
    const sign = offset > 0 ? "-" : "+";
    return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
  }
  return formatTimezone(offset, delimiter);
}
function formatTimezone(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = addLeadingZeros(Math.trunc(absOffset / 60), 2);
  const minutes = addLeadingZeros(absOffset % 60, 2);
  return sign + hours + delimiter + minutes;
}

// node_modules/date-fns/_lib/format/longFormatters.js
var dateLongFormatter = (pattern, formatLong2) => {
  switch (pattern) {
    case "P":
      return formatLong2.date({ width: "short" });
    case "PP":
      return formatLong2.date({ width: "medium" });
    case "PPP":
      return formatLong2.date({ width: "long" });
    case "PPPP":
    default:
      return formatLong2.date({ width: "full" });
  }
};
var timeLongFormatter = (pattern, formatLong2) => {
  switch (pattern) {
    case "p":
      return formatLong2.time({ width: "short" });
    case "pp":
      return formatLong2.time({ width: "medium" });
    case "ppp":
      return formatLong2.time({ width: "long" });
    case "pppp":
    default:
      return formatLong2.time({ width: "full" });
  }
};
var dateTimeLongFormatter = (pattern, formatLong2) => {
  const matchResult = pattern.match(/(P+)(p+)?/) || [];
  const datePattern = matchResult[1];
  const timePattern = matchResult[2];
  if (!timePattern) {
    return dateLongFormatter(pattern, formatLong2);
  }
  let dateTimeFormat;
  switch (datePattern) {
    case "P":
      dateTimeFormat = formatLong2.dateTime({ width: "short" });
      break;
    case "PP":
      dateTimeFormat = formatLong2.dateTime({ width: "medium" });
      break;
    case "PPP":
      dateTimeFormat = formatLong2.dateTime({ width: "long" });
      break;
    case "PPPP":
    default:
      dateTimeFormat = formatLong2.dateTime({ width: "full" });
      break;
  }
  return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong2)).replace("{{time}}", timeLongFormatter(timePattern, formatLong2));
};
var longFormatters = {
  p: timeLongFormatter,
  P: dateTimeLongFormatter
};

// node_modules/date-fns/_lib/protectedTokens.js
var dayOfYearTokenRE = /^D+$/;
var weekYearTokenRE = /^Y+$/;
var throwTokens = ["D", "DD", "YY", "YYYY"];
function isProtectedDayOfYearToken(token) {
  return dayOfYearTokenRE.test(token);
}
function isProtectedWeekYearToken(token) {
  return weekYearTokenRE.test(token);
}
function warnOrThrowProtectedError(token, format2, input) {
  const _message = message(token, format2, input);
  console.warn(_message);
  if (throwTokens.includes(token)) throw new RangeError(_message);
}
function message(token, format2, input) {
  const subject = token[0] === "Y" ? "years" : "days of the month";
  return `Use \`${token.toLowerCase()}\` instead of \`${token}\` (in \`${format2}\`) for formatting ${subject} to the input \`${input}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`;
}

// node_modules/date-fns/format.js
var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
var escapedStringRegExp = /^'([^]*?)'?$/;
var doubleQuoteRegExp = /''/g;
var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
function format(date, formatStr, options) {
  const defaultOptions2 = getDefaultOptions();
  const locale = options?.locale ?? defaultOptions2.locale ?? enUS;
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions2.weekStartsOn ?? defaultOptions2.locale?.options?.weekStartsOn ?? 0;
  const originalDate = toDate(date, options?.in);
  if (!isValid(originalDate)) {
    throw new RangeError("Invalid time value");
  }
  let parts = formatStr.match(longFormattingTokensRegExp).map((substring) => {
    const firstCharacter = substring[0];
    if (firstCharacter === "p" || firstCharacter === "P") {
      const longFormatter = longFormatters[firstCharacter];
      return longFormatter(substring, locale.formatLong);
    }
    return substring;
  }).join("").match(formattingTokensRegExp).map((substring) => {
    if (substring === "''") {
      return { isToken: false, value: "'" };
    }
    const firstCharacter = substring[0];
    if (firstCharacter === "'") {
      return { isToken: false, value: cleanEscapedString(substring) };
    }
    if (formatters[firstCharacter]) {
      return { isToken: true, value: substring };
    }
    if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
      throw new RangeError(
        "Format string contains an unescaped latin alphabet character `" + firstCharacter + "`"
      );
    }
    return { isToken: false, value: substring };
  });
  if (locale.localize.preprocessor) {
    parts = locale.localize.preprocessor(originalDate, parts);
  }
  const formatterOptions = {
    firstWeekContainsDate,
    weekStartsOn,
    locale
  };
  return parts.map((part) => {
    if (!part.isToken) return part.value;
    const token = part.value;
    if (!options?.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token) || !options?.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token)) {
      warnOrThrowProtectedError(token, formatStr, String(date));
    }
    const formatter = formatters[token[0]];
    return formatter(originalDate, token, locale.localize, formatterOptions);
  }).join("");
}
function cleanEscapedString(input) {
  const matched = input.match(escapedStringRegExp);
  if (!matched) {
    return input;
  }
  return matched[1].replace(doubleQuoteRegExp, "'");
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

// electron/db/dateUtils.ts
function todayIso() {
  return format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
}
function addDays2(iso, n) {
  return format(addDays(parseISO(iso), n), "yyyy-MM-dd");
}
function daysBetween(fromIso, toIso) {
  return differenceInCalendarDays(parseISO(toIso), parseISO(fromIso));
}
function daysToBirthday(birthdayIso, today) {
  if (!birthdayIso) return null;
  const [, m, d] = birthdayIso.split("-").map(Number);
  if (!m || !d) return null;
  const year = Number(today.slice(0, 4));
  let candidate = `${today.slice(0, 4)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (daysBetween(today, candidate) < 0) {
    candidate = `${year + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return daysBetween(today, candidate);
}

// electron/db/employees.ts
function nowStamp() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
}
function mapEmployee(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    department_id: row.department_id,
    position: row.position,
    internal_phone: row.internal_phone,
    mobile_phone: row.mobile_phone,
    email: row.email,
    birthday: row.birthday,
    functions: row.functions,
    is_fired: row.is_fired === 1,
    fired_date: row.fired_date,
    archived: row.archived === 1,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
var EmployeeRepo = class {
  constructor(db) {
    this.db = db;
  }
  db;
  /** Статус: уволен → отсутствует сегодня (по absences) → на работе. */
  computeStatus(emp, absences, today) {
    if (emp.is_fired) return { kind: "fired" };
    const active = absences.find(
      (a) => a.employee_id === emp.id && a.date_from <= today && a.date_to >= today
    );
    if (active) {
      return { kind: "absent", absence_type: active.absence_type, date_from: active.date_from, date_to: active.date_to };
    }
    return { kind: "at_work" };
  }
  allAbsences() {
    return this.db.prepare("SELECT * FROM absences").all();
  }
  list(includeArchived) {
    const today = todayIso();
    const absences = this.allAbsences();
    const rows = this.db.prepare(
      `SELECT e.*, d.name AS department_name FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         ${includeArchived ? "" : "WHERE e.archived = 0"}
         ORDER BY e.archived ASC, e.full_name COLLATE NOCASE`
    ).all();
    return rows.map((row) => {
      const emp = mapEmployee(row);
      const upcoming = absences.filter((a) => a.employee_id === emp.id && a.absence_type === "\u043E\u0442\u043F\u0443\u0441\u043A" && a.date_from > today).sort((a, b) => a.date_from.localeCompare(b.date_from))[0];
      return {
        ...emp,
        department_name: row.department_name,
        status: this.computeStatus(emp, absences, today),
        days_to_birthday: daysToBirthday(emp.birthday, today),
        next_vacation: upcoming ? { date_from: upcoming.date_from, date_to: upcoming.date_to, note: upcoming.note } : null
      };
    });
  }
  get(id) {
    return this.list(true).find((e) => e.id === id) ?? null;
  }
  create(input) {
    const stamp = nowStamp();
    const info = this.db.prepare(
      `INSERT INTO employees (full_name, department_id, position, internal_phone, mobile_phone, email,
          birthday, functions, is_fired, fired_date, archived, created_at, updated_at)
         VALUES (@full_name, @department_id, @position, @internal_phone, @mobile_phone, @email,
          @birthday, @functions, @is_fired, @fired_date, 0, @created_at, @updated_at)`
    ).run({
      full_name: input.full_name,
      department_id: input.department_id,
      position: input.position,
      internal_phone: input.internal_phone,
      mobile_phone: input.mobile_phone,
      email: input.email,
      birthday: input.birthday,
      functions: input.functions,
      is_fired: input.is_fired ? 1 : 0,
      fired_date: input.fired_date,
      created_at: stamp,
      updated_at: stamp
    });
    return this.byId(Number(info.lastInsertRowid));
  }
  update(id, input) {
    const current = this.byId(id);
    const merged = { ...toInput(current), ...input };
    this.db.prepare(
      `UPDATE employees SET full_name=@full_name, department_id=@department_id, position=@position,
          internal_phone=@internal_phone, mobile_phone=@mobile_phone, email=@email, birthday=@birthday,
          functions=@functions, is_fired=@is_fired, fired_date=@fired_date, updated_at=@updated_at
         WHERE id=@id`
    ).run({
      id,
      full_name: merged.full_name,
      department_id: merged.department_id,
      position: merged.position,
      internal_phone: merged.internal_phone,
      mobile_phone: merged.mobile_phone,
      email: merged.email,
      birthday: merged.birthday,
      functions: merged.functions,
      is_fired: merged.is_fired ? 1 : 0,
      fired_date: merged.fired_date,
      updated_at: nowStamp()
    });
    return this.byId(id);
  }
  setArchived(id, archived) {
    this.db.prepare("UPDATE employees SET archived=@a, updated_at=@t WHERE id=@id").run({
      id,
      a: archived ? 1 : 0,
      t: nowStamp()
    });
  }
  byId(id) {
    const row = this.db.prepare("SELECT *, NULL AS department_name FROM employees WHERE id=?").get(id);
    if (!row) throw new Error(`\u0421\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    return mapEmployee(row);
  }
  // ---- Отсутствия ----
  listAbsences(opts) {
    const conds = [];
    const params = {};
    if (opts.employeeId !== void 0) {
      conds.push("a.employee_id = @employeeId");
      params.employeeId = opts.employeeId;
    }
    if (opts.fromDate !== void 0 && opts.toDate !== void 0) {
      conds.push("(a.date_to >= @fromDate AND a.date_from <= @toDate)");
      params.fromDate = opts.fromDate;
      params.toDate = opts.toDate;
    } else if (opts.fromDate !== void 0) {
      conds.push("a.date_to >= @fromDate");
      params.fromDate = opts.fromDate;
    } else if (opts.toDate !== void 0) {
      conds.push("a.date_from <= @toDate");
      params.toDate = opts.toDate;
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const stmt = this.db.prepare(
      `SELECT a.*, e.full_name AS employee_name FROM absences a
       JOIN employees e ON e.id = a.employee_id ${where}
       ORDER BY a.date_from ASC`
    );
    const rows = Object.keys(params).length === 0 ? stmt.all() : stmt.all(params);
    return rows.map((r) => ({
      id: r.id,
      employee_id: r.employee_id,
      absence_type: r.absence_type,
      date_from: r.date_from,
      date_to: r.date_to,
      note: r.note,
      employee_name: r.employee_name ?? ""
    }));
  }
  createAbsence(input) {
    const info = this.db.prepare(
      `INSERT INTO absences (employee_id, absence_type, date_from, date_to, note)
         VALUES (@employee_id, @absence_type, @date_from, @date_to, @note)`
    ).run(input);
    return { id: Number(info.lastInsertRowid), ...input };
  }
  updateAbsence(id, input) {
    const current = this.db.prepare("SELECT * FROM absences WHERE id=?").get(id);
    if (!current) throw new Error(`\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E`);
    const merged = {
      employee_id: current.employee_id,
      absence_type: current.absence_type,
      date_from: current.date_from,
      date_to: current.date_to,
      note: current.note,
      ...input
    };
    this.db.prepare(
      `UPDATE absences SET employee_id=@employee_id, absence_type=@absence_type, date_from=@date_from,
         date_to=@date_to, note=@note WHERE id=@id`
    ).run({ ...merged, id });
    return { id, ...merged };
  }
  deleteAbsence(id) {
    this.db.prepare("DELETE FROM absences WHERE id=?").run(id);
  }
  // ---- Отделы ----
  listDepartments() {
    const rows = this.db.prepare(
      `SELECT d.*, (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.archived = 0) AS employee_count
         FROM departments d ORDER BY d.sort_order ASC, d.name COLLATE NOCASE`
    ).all();
    return rows;
  }
  createDepartment(input) {
    const info = this.db.prepare("INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)").run(input.name, input.parent_id, input.sort_order);
    return { id: Number(info.lastInsertRowid), ...input };
  }
  updateDepartment(id, input) {
    const row = this.db.prepare("SELECT * FROM departments WHERE id=?").get(id);
    if (!row) throw new Error(`\u041E\u0442\u0434\u0435\u043B ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    const merged = { ...row, ...input };
    this.db.prepare("UPDATE departments SET name=?, parent_id=?, sort_order=? WHERE id=?").run(merged.name, merged.parent_id, merged.sort_order, id);
    return merged;
  }
  deleteDepartment(id) {
    this.db.prepare("DELETE FROM departments WHERE id=?").run(id);
  }
};
function toInput(e) {
  return {
    full_name: e.full_name,
    department_id: e.department_id,
    position: e.position,
    internal_phone: e.internal_phone,
    mobile_phone: e.mobile_phone,
    email: e.email,
    birthday: e.birthday,
    functions: e.functions,
    is_fired: e.is_fired,
    fired_date: e.fired_date
  };
}

// electron/db/monitorings.ts
function nowStamp2() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
}
var TaskTypeRepo = class {
  constructor(db) {
    this.db = db;
  }
  db;
  list() {
    const rows = this.db.prepare("SELECT * FROM task_types ORDER BY sort_order ASC, id ASC").all();
    return rows.map((r) => ({ id: r.id, name: r.name, sort_order: r.sort_order, active: r.active === 1 }));
  }
  create(name) {
    const max = this.db.prepare("SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM task_types").get();
    const info = this.db.prepare("INSERT INTO task_types (name, sort_order, active) VALUES (?, ?, 1)").run(name, max.next);
    return { id: Number(info.lastInsertRowid), name, sort_order: max.next, active: true };
  }
  update(id, input) {
    const row = this.db.prepare("SELECT * FROM task_types WHERE id=?").get(id);
    if (!row) throw new Error(`\u0422\u0438\u043F \u0437\u0430\u0434\u0430\u0447\u0438 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    const merged = { ...row, ...input };
    this.db.prepare("UPDATE task_types SET name=?, active=? WHERE id=?").run(merged.name, merged.active ? 1 : 0, id);
    return { id, name: merged.name, sort_order: merged.sort_order, active: Boolean(merged.active) };
  }
  /** Удаление блокируется, если тип используется в мониторингах. */
  remove(id) {
    const used = this.db.prepare("SELECT COUNT(*) AS c FROM monitorings WHERE type_id=?").get(id);
    if (used.c > 0) {
      throw new Error("\u0422\u0438\u043F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0432 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430\u0445 \u2014 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043E");
    }
    this.db.prepare("DELETE FROM task_types WHERE id=?").run(id);
  }
  reorder(orderedIds) {
    const stmt = this.db.prepare("UPDATE task_types SET sort_order=? WHERE id=?");
    this.db.transaction(() => {
      orderedIds.forEach((id, idx) => stmt.run(idx + 1, id));
    })();
  }
};
var MonitoringRepo = class {
  constructor(db) {
    this.db = db;
  }
  db;
  baseSql() {
    return `
      SELECT m.*, t.name AS type_name, e.full_name AS employee_name, dep.full_name AS deputy_name,
        (SELECT COUNT(*) FROM absences a
          WHERE a.employee_id = m.employee_id AND a.date_from <= @today AND a.date_to >= @today) AS employee_absent_today
      FROM monitorings m
      JOIN task_types t ON t.id = m.type_id
      JOIN employees e ON e.id = m.employee_id
      LEFT JOIN employees dep ON dep.id = m.deputy_employee_id
    `;
  }
  list(opts) {
    const today = todayIso();
    const params = { today };
    const conds = [];
    if (!opts.includeArchived) conds.push("m.status != '\u0430\u0440\u0445\u0438\u0432'");
    if (opts.typeId) {
      conds.push("m.type_id = @typeId");
      params.typeId = opts.typeId;
    }
    if (opts.employeeId) {
      conds.push("m.employee_id = @employeeId");
      params.employeeId = opts.employeeId;
    }
    if (opts.status) {
      conds.push("m.status = @status");
      params.status = opts.status;
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const sql = `${this.baseSql()} ${where} ORDER BY m.deadline IS NULL, m.deadline ASC, m.name COLLATE NOCASE`;
    const stmt = this.db.prepare(sql);
    const rows = Object.keys(params).length === 0 ? stmt.all() : stmt.all(params);
    return rows.map((r) => this.toView(r, today));
  }
  get(id) {
    const today = todayIso();
    const row = this.db.prepare(`${this.baseSql()} WHERE m.id = @id`).get({ today, id });
    return row ? this.toView(row, today) : null;
  }
  /** Для карточки сотрудника: все мониторинги, где он исполнитель или дублёр. */
  byEmployee(employeeId) {
    const today = todayIso();
    const rows = this.db.prepare(`${this.baseSql()} WHERE (m.employee_id = @emp OR m.deputy_employee_id = @emp) AND m.status != '\u0430\u0440\u0445\u0438\u0432'`).all({ today, emp: employeeId });
    return rows.map((r) => this.toView(r, today));
  }
  toView(r, today) {
    const deputyActive = r.deputy_employee_id !== null && (r.deputy_from === null || r.deputy_from <= today) && (r.deputy_to === null || r.deputy_to >= today);
    const redFlag = r.employee_absent_today > 0 && r.deputy_employee_id === null && r.status !== "\u0430\u0440\u0445\u0438\u0432" && r.status !== "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E";
    return {
      id: r.id,
      name: r.name,
      type_id: r.type_id,
      employee_id: r.employee_id,
      deadline: r.deadline,
      note: r.note,
      status: r.status,
      deputy_employee_id: r.deputy_employee_id,
      deputy_from: r.deputy_from,
      deputy_to: r.deputy_to,
      created_at: r.created_at,
      updated_at: r.updated_at,
      type_name: r.type_name,
      employee_name: r.employee_name,
      deputy_name: r.deputy_name,
      red_flag: redFlag,
      deputy_active: deputyActive
    };
  }
  create(input) {
    const stamp = nowStamp2();
    const info = this.db.prepare(
      `INSERT INTO monitorings (name, type_id, employee_id, deadline, note, status,
          deputy_employee_id, deputy_from, deputy_to, created_at, updated_at)
         VALUES (@name, @type_id, @employee_id, @deadline, @note, @status,
          @deputy_employee_id, @deputy_from, @deputy_to, @created_at, @updated_at)`
    ).run({ ...input, created_at: stamp, updated_at: stamp });
    return this.byId(Number(info.lastInsertRowid));
  }
  update(id, input) {
    const current = this.byId(id);
    const merged = { ...toInput2(current), ...input };
    this.db.prepare(
      `UPDATE monitorings SET name=@name, type_id=@type_id, employee_id=@employee_id, deadline=@deadline,
          note=@note, status=@status, deputy_employee_id=@deputy_employee_id, deputy_from=@deputy_from,
          deputy_to=@deputy_to, updated_at=@updated_at WHERE id=@id`
    ).run({ ...merged, id, updated_at: nowStamp2() });
    return this.byId(id);
  }
  archive(id) {
    this.db.prepare("UPDATE monitorings SET status='\u0430\u0440\u0445\u0438\u0432', updated_at=? WHERE id=?").run(nowStamp2(), id);
  }
  byId(id) {
    const row = this.db.prepare(
      `SELECT id, name, type_id, employee_id, deadline, note, status, deputy_employee_id, deputy_from, deputy_to,
         created_at, updated_at FROM monitorings WHERE id=?`
    ).get(id);
    if (!row) throw new Error(`\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    return row;
  }
};
function toInput2(m) {
  return {
    name: m.name,
    type_id: m.type_id,
    employee_id: m.employee_id,
    deadline: m.deadline,
    note: m.note,
    status: m.status,
    deputy_employee_id: m.deputy_employee_id,
    deputy_from: m.deputy_from,
    deputy_to: m.deputy_to
  };
}

// electron/db/documents_tasks.ts
function nowStamp3() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
}
var EdoRepo = class {
  constructor(db) {
    this.db = db;
  }
  db;
  list(opts) {
    const today = todayIso();
    const conds = [];
    const params = {};
    if (!opts.includeArchived) conds.push("ed.archived = 0");
    if (opts.controlType) {
      conds.push("ed.control_type = @controlType");
      params.controlType = opts.controlType;
    }
    if (opts.offControl === "on") conds.push("ed.off_control = 0");
    if (opts.offControl === "off") conds.push("ed.off_control = 1");
    if (opts.responsibleId) {
      conds.push("ed.responsible_id = @responsibleId");
      params.responsibleId = opts.responsibleId;
    }
    if (opts.approvalStatus) {
      conds.push("ed.approval_status = @approvalStatus");
      params.approvalStatus = opts.approvalStatus;
    }
    if (opts.burningOnly) {
      conds.push("ed.deadline IS NOT NULL AND ed.off_control = 0 AND julianday(ed.deadline) >= julianday(@todayMinusInf)");
      params.todayMinusInf = "1970-01-01";
      conds.push("julianday(ed.deadline) <= julianday(@todayPlus3)");
      params.todayPlus3 = addDays3(today, 3);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const stmt = this.db.prepare(
      `SELECT ed.*, e.full_name AS responsible_name FROM edo_documents ed
       LEFT JOIN employees e ON e.id = ed.responsible_id
       ${where}
       ORDER BY ed.off_control ASC, ed.deadline IS NULL, ed.deadline ASC, ed.doc_number COLLATE NOCASE`
    );
    const rows = Object.keys(params).length === 0 ? stmt.all() : stmt.all(params);
    return rows.map((r) => this.toView(r, today));
  }
  get(id) {
    const today = todayIso();
    const row = this.db.prepare(
      `SELECT ed.*, e.full_name AS responsible_name FROM edo_documents ed
         LEFT JOIN employees e ON e.id = ed.responsible_id WHERE ed.id=?`
    ).get(id);
    return row ? this.toView(row, today) : null;
  }
  toView(r, today) {
    const offControl = r.off_control === 1;
    const daysLeft = r.deadline && !offControl ? daysBetween(today, r.deadline) : null;
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
      off_control: offControl,
      off_control_date: r.off_control_date,
      sub_resolution: r.sub_resolution,
      approval_number: r.approval_number,
      approval_url: r.approval_url,
      approval_status: r.approval_status,
      archived: r.archived === 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
      responsible_name: r.responsible_name,
      days_left: daysLeft,
      link: null
      // достраивается в IPC-слое через applyDocLink (шаблон из настроек)
    };
  }
  create(input) {
    const stamp = nowStamp3();
    const info = this.db.prepare(
      `INSERT INTO edo_documents (doc_number, doc_url, summary, instruction, responsible_id, participants,
          control_type, deadline, off_control, off_control_date, sub_resolution, approval_number, approval_url,
          approval_status, archived, created_at, updated_at)
         VALUES (@doc_number, @doc_url, @summary, @instruction, @responsible_id, @participants,
          @control_type, @deadline, 0, NULL, @sub_resolution, @approval_number, @approval_url,
          @approval_status, 0, @created_at, @updated_at)`
    ).run({ ...input, created_at: stamp, updated_at: stamp });
    return this.byId(Number(info.lastInsertRowid));
  }
  update(id, input) {
    const current = this.byId(id);
    const merged = { ...toEdoInput(current), ...input };
    this.db.prepare(
      `UPDATE edo_documents SET doc_number=@doc_number, doc_url=@doc_url, summary=@summary,
          instruction=@instruction, responsible_id=@responsible_id, participants=@participants,
          control_type=@control_type, deadline=@deadline, sub_resolution=@sub_resolution,
          approval_number=@approval_number, approval_url=@approval_url, approval_status=@approval_status,
          updated_at=@updated_at WHERE id=@id`
    ).run({ ...merged, id, updated_at: nowStamp3() });
    return this.byId(id);
  }
  /** Снятие с контроля: off_control + дата автоматически. */
  setOffControl(id, off) {
    this.db.prepare("UPDATE edo_documents SET off_control=?, off_control_date=?, updated_at=? WHERE id=?").run(off ? 1 : 0, off ? todayIso() : null, nowStamp3(), id);
  }
  archive(id) {
    this.db.prepare("UPDATE edo_documents SET archived=1, updated_at=? WHERE id=?").run(nowStamp3(), id);
  }
  byId(id) {
    const row = this.db.prepare(
      `SELECT id, doc_number, doc_url, summary, instruction, responsible_id, participants, control_type,
         deadline, off_control, off_control_date, sub_resolution, approval_number, approval_url, approval_status,
         archived, created_at, updated_at FROM edo_documents WHERE id=?`
    ).get(id);
    if (!row) throw new Error(`\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    return {
      ...row,
      control_type: row.control_type,
      approval_status: row.approval_status,
      off_control: row.off_control === 1,
      archived: row.archived === 1
    };
  }
};
function applyDocLink(view, template) {
  const link = template.includes("{\u043D\u043E\u043C\u0435\u0440}") ? template.replace("{\u043D\u043E\u043C\u0435\u0440}", view.doc_number) : view.doc_url || null;
  return { ...view, link };
}
function toEdoInput(d) {
  return {
    doc_number: d.doc_number,
    doc_url: d.doc_url,
    summary: d.summary,
    instruction: d.instruction,
    responsible_id: d.responsible_id,
    participants: d.participants,
    control_type: d.control_type,
    deadline: d.deadline,
    sub_resolution: d.sub_resolution,
    approval_number: d.approval_number,
    approval_url: d.approval_url,
    approval_status: d.approval_status
  };
}
function addDays3(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
var WorkLogRepo = class {
  constructor(db) {
    this.db = db;
  }
  db;
  list(entityType, entityId) {
    return this.db.prepare(
      `SELECT * FROM work_log WHERE entity_type=? AND entity_id=? ORDER BY log_date DESC, id DESC`
    ).all(entityType, entityId);
  }
  create(input) {
    const stamp = nowStamp3();
    const info = this.db.prepare(
      `INSERT INTO work_log (entity_type, entity_id, log_date, text, created_at)
         VALUES (@entity_type, @entity_id, @log_date, @text, @created_at)`
    ).run({ ...input, created_at: stamp });
    return { id: Number(info.lastInsertRowid), ...input, created_at: stamp };
  }
  update(id, input) {
    const current = this.db.prepare("SELECT * FROM work_log WHERE id=?").get(id);
    if (!current) throw new Error(`\u0417\u0430\u043F\u0438\u0441\u044C \u0436\u0443\u0440\u043D\u0430\u043B\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    const merged = { ...current, ...input };
    this.db.prepare("UPDATE work_log SET log_date=?, text=? WHERE id=?").run(merged.log_date, merged.text, id);
    return { ...merged };
  }
  remove(id) {
    this.db.prepare("DELETE FROM work_log WHERE id=?").run(id);
  }
  lastActivity(entityType, entityId) {
    const row = this.db.prepare("SELECT MAX(log_date) AS last FROM work_log WHERE entity_type=? AND entity_id=?").get(entityType, entityId);
    return row?.last ?? null;
  }
};
var TaskRepo = class {
  constructor(db) {
    this.db = db;
  }
  db;
  /** Автопробуждение: задачи «ожидание» с wait_until <= сегодня переводим в «в работе». */
  wakeUpExpired() {
    const today = todayIso();
    this.db.prepare(
      `UPDATE tasks SET status='\u0432 \u0440\u0430\u0431\u043E\u0442\u0435', wait_until=NULL, updated_at=?
         WHERE status='\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435' AND wait_until IS NOT NULL AND wait_until <= ? AND archived=0`
    ).run(nowStamp3(), today);
  }
  list(opts) {
    this.wakeUpExpired();
    const today = todayIso();
    const conds = [];
    const params = {};
    if (!opts.includeArchived) {
      conds.push("archived = 0");
    }
    if (!opts.includeDone) {
      conds.push("status NOT IN ('\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E', '\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E')");
    }
    if (opts.status) {
      conds.push("status = @status");
      params.status = opts.status;
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const sql = `SELECT t.id, t.theme, t.title, t.priority, t.deadline, t.status, t.wait_until,
            t.next_action, t.participants, t.note, t.archived, t.created_at, t.updated_at,
          (SELECT COUNT(*) FROM task_check_items c WHERE c.task_id=t.id) AS check_total,
          (SELECT COUNT(*) FROM task_check_items c WHERE c.task_id=t.id AND c.done=1) AS check_done,
          (SELECT MAX(created_at) FROM task_check_items c WHERE c.task_id=t.id) AS last_check_change
         FROM tasks t ${where}
         ORDER BY CASE t.priority WHEN '\u0441\u0440\u043E\u0447\u043D\u043E' THEN 0 WHEN '\u0432\u044B\u0441\u043E\u043A\u0438\u0439' THEN 1 WHEN '\u043E\u0431\u044B\u0447\u043D\u044B\u0439' THEN 2 ELSE 3 END,
                  t.deadline IS NULL, t.deadline ASC, t.updated_at DESC`;
    const stmt = this.db.prepare(sql);
    const rows = Object.keys(params).length === 0 ? stmt.all() : stmt.all(params);
    return rows.map((r) => {
      const daysLeft = r.deadline ? daysBetween(today, r.deadline) : null;
      const sleeping = r.status === "\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435" && r.wait_until !== null && r.wait_until > today;
      const lastLog = this.db.prepare("SELECT MAX(log_date) AS last FROM work_log WHERE entity_type='task' AND entity_id=?").get(r.id);
      const activityCandidates = [r.updated_at.slice(0, 10), lastLog?.last ?? null, r.last_check_change?.slice(0, 10) ?? null].filter(
        (v) => Boolean(v)
      );
      const lastActivity = activityCandidates.sort().at(-1) ?? r.created_at.slice(0, 10);
      const stale = !sleeping && r.status !== "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" && r.status !== "\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E" && daysBetween(lastActivity, today) >= 9;
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
        days_left: daysLeft,
        check_total: r.check_total,
        check_done: r.check_done,
        progress: r.check_total === 0 ? 0 : r.check_done / r.check_total,
        sleeping,
        stale
      };
    });
  }
  get(id) {
    return this.list({ includeArchived: true }).find((t) => t.id === id) ?? null;
  }
  create(input) {
    const stamp = nowStamp3();
    const info = this.db.prepare(
      `INSERT INTO tasks (theme, title, priority, deadline, status, wait_until, next_action, participants,
          note, archived, created_at, updated_at)
         VALUES (@theme, @title, @priority, @deadline, @status, @wait_until, @next_action, @participants,
          @note, 0, @created_at, @updated_at)`
    ).run({ ...input, created_at: stamp, updated_at: stamp });
    return this.byId(Number(info.lastInsertRowid));
  }
  update(id, input) {
    const current = this.byId(id);
    const merged = { ...toTaskInput(current), ...input };
    this.db.prepare(
      `UPDATE tasks SET theme=@theme, title=@title, priority=@priority, deadline=@deadline, status=@status,
          wait_until=@wait_until, next_action=@next_action, participants=@participants, note=@note, updated_at=@updated_at
         WHERE id=@id`
    ).run({ ...merged, id, updated_at: nowStamp3() });
    return this.byId(id);
  }
  archive(id) {
    this.db.prepare("UPDATE tasks SET status='\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E', archived=1, updated_at=? WHERE id=?").run(nowStamp3(), id);
  }
  /** Возврат из мягкого архива (архивные видны только с флагом «Показывать архив»). */
  unarchive(id) {
    this.db.prepare("UPDATE tasks SET archived=0, updated_at=? WHERE id=?").run(nowStamp3(), id);
  }
  byId(id) {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
    if (!row) throw new Error(`\u0417\u0430\u0434\u0430\u0447\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430`);
    return { ...row, archived: row.archived === 1 };
  }
  // ---- Чек-листы ----
  listCheckItems(taskId) {
    return this.db.prepare("SELECT * FROM task_check_items WHERE task_id=? ORDER BY sort_order ASC, id ASC").all(taskId).map((r) => {
      const row = r;
      return { ...row, done: row.done === 1 };
    });
  }
  createCheckItem(taskId, title) {
    const max = this.db.prepare("SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM task_check_items WHERE task_id=?").get(taskId);
    const info = this.db.prepare("INSERT INTO task_check_items (task_id, title, done, sort_order) VALUES (?, ?, 0, ?)").run(taskId, title, max.next);
    return { id: Number(info.lastInsertRowid), task_id: taskId, title, done: false, sort_order: max.next };
  }
  updateCheckItem(id, input) {
    const row = this.db.prepare("SELECT * FROM task_check_items WHERE id=?").get(id);
    if (!row) throw new Error(`\u041F\u0443\u043D\u043A\u0442 \u0447\u0435\u043A-\u043B\u0438\u0441\u0442\u0430 ${id} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D`);
    const merged = { ...row, ...input };
    this.db.prepare("UPDATE task_check_items SET title=?, done=? WHERE id=?").run(merged.title, merged.done ? 1 : 0, id);
    return { ...merged, done: Boolean(merged.done) };
  }
  removeCheckItem(id) {
    this.db.prepare("DELETE FROM task_check_items WHERE id=?").run(id);
  }
};
function toTaskInput(t) {
  return {
    theme: t.theme,
    title: t.title,
    priority: t.priority,
    deadline: t.deadline,
    status: t.status,
    wait_until: t.wait_until,
    next_action: t.next_action,
    participants: t.participants,
    note: t.note
  };
}

// electron/db/dashboard.ts
function buildDashboard(db) {
  const employees = new EmployeeRepo(db);
  const monitorings = new MonitoringRepo(db);
  const edo = new EdoRepo(db);
  const tasks = new TaskRepo(db);
  const settings = getSettings(db);
  const today = todayIso();
  const withLink = (v) => v.map((d) => applyDocLink(d, settings.edoLinkTemplate));
  const allDocs = withLink(edo.list({}));
  const burning = allDocs.filter((d) => d.days_left !== null && d.days_left <= 3);
  const overdue = burning.filter((d) => (d.days_left ?? 0) < 0);
  const dueToday = burning.filter((d) => d.days_left === 0);
  const next3 = burning.filter((d) => d.days_left !== null && d.days_left > 0 && d.days_left <= 3);
  const redFlags = monitorings.list({}).filter((m) => m.red_flag);
  const emps = employees.list(false);
  const upcomingBirthdays = emps.filter((e) => e.days_to_birthday !== null && e.days_to_birthday <= 3).sort((a, b) => (a.days_to_birthday ?? 0) - (b.days_to_birthday ?? 0));
  const horizonEnd = addDays4(today, 7);
  const returningAbsences = employees.listAbsences({ fromDate: today, toDate: horizonEnd });
  const returning = returningAbsences.filter((a) => a.date_from > today && a.date_to >= today && a.date_to <= horizonEnd).map((a) => {
    const emp = emps.find((e) => e.id === a.employee_id);
    return emp ? { employee: emp, absence: a } : null;
  }).filter((x) => x !== null).sort((a, b) => a.absence.date_to.localeCompare(b.absence.date_to));
  const returnedTasks = tasks.list({}).filter((t) => t.updated_at.slice(0, 10) === today && t.status === "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435");
  return {
    overdue_edo: overdue,
    due_today_edo: dueToday,
    due_next3_edo: next3,
    returned_tasks: returnedTasks,
    monitoring_red_flags: redFlags,
    upcoming_birthdays: upcomingBirthdays,
    returning_from_absence: returning,
    counters: {
      overdue: overdue.length,
      today: dueToday.length,
      next3: next3.length,
      returned: returnedTasks.length
    }
  };
}
function globalSearch(db, query) {
  const q = query.trim().toLowerCase();
  if (!q) return { employees: [], monitorings: [], documents: [], tasks: [] };
  const employees = new EmployeeRepo(db);
  const monitorings = new MonitoringRepo(db);
  const edo = new EdoRepo(db);
  const tasks = new TaskRepo(db);
  const settings = getSettings(db);
  const match2 = (s) => s.toLowerCase().includes(q);
  return {
    employees: employees.list(false).filter((e) => match2(e.full_name) || match2(e.position) || match2(e.functions)).slice(0, 20),
    monitorings: monitorings.list({}).filter((m) => match2(m.name) || match2(m.employee_name) || match2(m.type_name)).slice(0, 20),
    documents: edo.list({}).map((d) => applyDocLink(d, settings.edoLinkTemplate)).filter((d) => match2(d.doc_number) || match2(d.summary) || match2(d.instruction)).slice(0, 20),
    tasks: tasks.list({ includeArchived: true }).filter((t) => match2(t.title) || match2(t.theme) || match2(t.next_action)).slice(0, 20)
  };
}
function addDays4(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// electron/db/demo.ts
var TABLES = [
  "task_check_items",
  "tasks",
  "work_log",
  "edo_documents",
  "monitorings",
  "absences",
  "employees",
  "departments"
];
function clearAllData(db) {
  db.transaction(() => {
    for (const t of TABLES) db.prepare(`DELETE FROM ${t}`).run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN (@names)").run({ names: TABLES.join(",") });
    db.prepare("DELETE FROM task_types").run();
    seedTaskTypes(db);
  })();
}
function seedTaskTypes(db) {
  ["\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433", "\u041F\u0438\u0441\u044C\u043C\u043E", "\u0422\u0430\u0431\u043B\u0438\u0446\u0430"].forEach((name, i) => {
    db.prepare("INSERT INTO task_types (name, sort_order, active) VALUES (?, ?, 1)").run(name, i + 1);
  });
}
function loadDemoData(db) {
  clearAllData(db);
  const today = todayIso();
  const now = `${today} 09:00:00`;
  const insDept = db.prepare("INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)");
  const deptMain = Number(insDept.run("\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0421\u041C\u041F \u0438 \u0427\u0421", null, 1).lastInsertRowid);
  const deptPlan = Number(insDept.run("\u041E\u0442\u0434\u0435\u043B \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430", deptMain, 2).lastInsertRowid);
  const deptOp = Number(insDept.run("\u041E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u043E\u0442\u0434\u0435\u043B", deptMain, 3).lastInsertRowid);
  const emps = [
    { name: "\u0418\u0432\u0430\u043D\u043E\u0432 \u041F\u0451\u0442\u0440 \u0421\u0435\u0440\u0433\u0435\u0435\u0432\u0438\u0447", dept: deptMain, position: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", ext: "4-101", mobile: "+7 900 111-01-01", email: "ivanov@example.ru", birthdayInDays: 2, functions: "\u041E\u0431\u0449\u0435\u0435 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u043E, \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432, \u043F\u043B\u0430\u043D\u0435\u0440\u043A\u0438" },
    { name: "\u0421\u043C\u0438\u0440\u043D\u043E\u0432\u0430 \u0410\u043D\u043D\u0430 \u0412\u0438\u043A\u0442\u043E\u0440\u043E\u0432\u043D\u0430", dept: deptPlan, position: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A \u043E\u0442\u0434\u0435\u043B\u0430", ext: "4-110", mobile: "+7 900 111-02-02", email: "smirnova@example.ru", birthdayInDays: 12, functions: "\u041F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435, \u0441\u0432\u043E\u0434\u043A\u0438 \u043F\u043E \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430\u043C, \u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u042D\u0414\u041E" },
    { name: "\u041A\u0443\u0437\u043D\u0435\u0446\u043E\u0432 \u0414\u043C\u0438\u0442\u0440\u0438\u0439 \u041E\u043B\u0435\u0433\u043E\u0432\u0438\u0447", dept: deptPlan, position: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4-112", mobile: "", email: "kuznetsov@example.ru", birthdayInDays: null, functions: "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u043F\u043E\u0433\u043E\u0434\u043D\u043E\u0439 \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438, \u0434\u043E\u0440\u043E\u0436\u043D\u0430\u044F \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430" },
    { name: "\u041F\u0435\u0442\u0440\u043E\u0432\u0430 \u041C\u0430\u0440\u0438\u044F \u041D\u0438\u043A\u043E\u043B\u0430\u0435\u0432\u043D\u0430", dept: deptPlan, position: "\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4-113", mobile: "+7 900 111-03-03", email: "petrova@example.ru", birthdayInDays: 0, functions: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u0438\u0441\u0435\u043C, \u0440\u0435\u0435\u0441\u0442\u0440 \u043F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0439, \u0442\u0430\u0431\u043B\u0438\u0446\u0430 \u0435\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u044B\u0445 \u0434\u043E\u043A\u043B\u0430\u0434\u043E\u0432" },
    { name: "\u0421\u043E\u043A\u043E\u043B\u043E\u0432 \u0410\u043D\u0434\u0440\u0435\u0439 \u0418\u0433\u043E\u0440\u0435\u0432\u0438\u0447", dept: deptOp, position: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0438\u043A \u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u043E\u0442\u0434\u0435\u043B\u0430", ext: "4-120", mobile: "", email: "sokolov@example.ru", birthdayInDays: 25, functions: "\u041E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u0430\u044F \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430, \u0434\u0435\u0436\u0443\u0440\u0441\u0442\u0432\u043E, \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0441 \u0415\u0414\u0414\u0421" },
    { name: "\u041C\u0438\u0445\u0430\u0439\u043B\u043E\u0432\u0430 \u0415\u043B\u0435\u043D\u0430 \u0414\u043C\u0438\u0442\u0440\u0438\u0435\u0432\u043D\u0430", dept: deptOp, position: "\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4-122", mobile: "+7 900 111-04-04", email: "mikhailova@example.ru", birthdayInDays: null, functions: "\u0421\u0432\u043E\u0434\u043A\u0430 \u0427\u0421, \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u043F\u043E\u0436\u0430\u0440\u043E\u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438" },
    { name: "\u0424\u0451\u0434\u043E\u0440\u043E\u0432 \u0421\u0435\u0440\u0433\u0435\u0439 \u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440\u043E\u0432\u0438\u0447", dept: deptOp, position: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4-123", mobile: "", email: "fedorov@example.ru", birthdayInDays: 5, functions: "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0416\u041A\u0425, \u044D\u043D\u0435\u0440\u0433\u0435\u0442\u0438\u043A\u0430, \u0441\u0432\u044F\u0437\u044C" },
    { name: "\u041D\u0430\u0437\u0430\u0440\u043E\u0432\u0430 \u041E\u043B\u044C\u0433\u0430 \u041F\u0435\u0442\u0440\u043E\u0432\u043D\u0430", dept: deptPlan, position: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4-114", mobile: "+7 900 111-05-05", email: "nazarova@example.ru", birthdayInDays: null, functions: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u043E\u0431\u043E\u0440\u043E\u0442, \u043B\u0438\u0441\u0442\u044B \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u044F, \u0430\u0440\u0445\u0438\u0432" },
    { name: "\u041A\u043E\u0437\u043B\u043E\u0432 \u0412\u0438\u0442\u0430\u043B\u0438\u0439 \u0420\u043E\u043C\u0430\u043D\u043E\u0432\u0438\u0447", dept: deptOp, position: "\u0412\u0435\u0434\u0443\u0449\u0438\u0439 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", ext: "4-124", mobile: "", email: "kozlov@example.ru", birthdayInDays: 40, functions: "\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442\u043D\u0430\u044F \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430, \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0413\u0418\u041C\u0421" },
    { name: "\u0415\u0433\u043E\u0440\u043E\u0432\u0430 \u0422\u0430\u0442\u044C\u044F\u043D\u0430 \u041B\u044C\u0432\u043E\u0432\u043D\u0430", dept: deptMain, position: "\u0421\u0435\u043A\u0440\u0435\u0442\u0430\u0440\u044C-\u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0442", ext: "4-105", mobile: "+7 900 111-06-06", email: "egorova@example.ru", birthdayInDays: null, functions: "\u0412\u0445\u043E\u0434\u044F\u0449\u0430\u044F \u043A\u043E\u0440\u0440\u0435\u0441\u043F\u043E\u043D\u0434\u0435\u043D\u0446\u0438\u044F, \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432" },
    { name: "\u0422\u0438\u0442\u043E\u0432 \u041D\u0438\u043A\u043E\u043B\u0430\u0439 \u0412\u0430\u0441\u0438\u043B\u044C\u0435\u0432\u0438\u0447", dept: deptPlan, position: "\u041A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u043D\u0442", ext: "4-115", mobile: "", email: "titov@example.ru", birthdayInDays: null, functions: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430, \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0441\u043F\u0440\u0430\u0432\u043E\u043A", fired: true }
  ];
  const insEmp = db.prepare(
    `INSERT INTO employees (full_name, department_id, position, internal_phone, mobile_phone, email,
      birthday, functions, is_fired, fired_date, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );
  const empId = /* @__PURE__ */ new Map();
  for (const e of emps) {
    const birthday = e.birthdayInDays === null ? null : addDays2(today, -e.birthdayInDays - 30 * 365);
    const info = insEmp.run(
      e.name,
      e.dept,
      e.position,
      e.ext,
      e.mobile,
      e.email,
      birthday,
      e.functions,
      e.fired ? 1 : 0,
      e.fired ? addDays2(today, -60) : null,
      now,
      now
    );
    empId.set(e.name, Number(info.lastInsertRowid));
  }
  const id = (n) => empId.get(n);
  const insAbs = db.prepare("INSERT INTO absences (employee_id, absence_type, date_from, date_to, note) VALUES (?, ?, ?, ?, ?)");
  insAbs.run(id("\u041A\u0443\u0437\u043D\u0435\u0446\u043E\u0432 \u0414\u043C\u0438\u0442\u0440\u0438\u0439 \u041E\u043B\u0435\u0433\u043E\u0432\u0438\u0447"), "\u043E\u0442\u043F\u0443\u0441\u043A", today, addDays2(today, 13), "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043E\u0442\u043F\u0443\u0441\u043A");
  insAbs.run(id("\u0424\u0451\u0434\u043E\u0440\u043E\u0432 \u0421\u0435\u0440\u0433\u0435\u0439 \u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440\u043E\u0432\u0438\u0447"), "\u0431\u043E\u043B\u044C\u043D\u0438\u0447\u043D\u044B\u0439", addDays2(today, -2), addDays2(today, 3), "");
  insAbs.run(id("\u041C\u0438\u0445\u0430\u0439\u043B\u043E\u0432\u0430 \u0415\u043B\u0435\u043D\u0430 \u0414\u043C\u0438\u0442\u0440\u0438\u0435\u0432\u043D\u0430"), "\u043A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043A\u0430", addDays2(today, 4), addDays2(today, 9), "\u0423\u0447\u0435\u043D\u0438\u044F, \u043F\u043E\u043B\u0438\u0433\u043E\u043D");
  insAbs.run(id("\u041F\u0435\u0442\u0440\u043E\u0432\u0430 \u041C\u0430\u0440\u0438\u044F \u041D\u0438\u043A\u043E\u043B\u0430\u0435\u0432\u043D\u0430"), "\u043E\u0442\u043F\u0443\u0441\u043A", addDays2(today, 20), addDays2(today, 33), "");
  insAbs.run(id("\u041A\u043E\u0437\u043B\u043E\u0432 \u0412\u0438\u0442\u0430\u043B\u0438\u0439 \u0420\u043E\u043C\u0430\u043D\u043E\u0432\u0438\u0447"), "\u043E\u0442\u043F\u0443\u0441\u043A", addDays2(today, 5), addDays2(today, 8), "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u043E\u0442\u043F\u0443\u0441\u043A \u2014 \u0432\u0435\u0440\u043D\u0451\u0442\u0441\u044F \u0441\u043A\u043E\u0440\u043E");
  const typeId = /* @__PURE__ */ new Map();
  db.prepare("SELECT id, name FROM task_types").all().forEach(
    (t) => typeId.set(t.id, t.name)
  );
  const types = [...typeId.entries()];
  const typeByName = new Map(types.map(([i, n]) => [n, i]));
  const insMon = db.prepare(
    `INSERT INTO monitorings (name, type_id, employee_id, deadline, note, status, deputy_employee_id,
      deputy_from, deputy_to, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const mon = (name, type, who, dlOffset, status, deputy, note = "") => {
    insMon.run(
      name,
      typeByName.get(type),
      id(who),
      dlOffset === null ? null : addDays2(today, dlOffset),
      note,
      status,
      deputy ? id(deputy.who) : null,
      deputy ? addDays2(today, deputy.from) : null,
      deputy ? addDays2(today, deputy.to) : null,
      now,
      now
    );
  };
  mon("\u041E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430 \u0416\u041A\u0425 \u0438 \u044D\u043D\u0435\u0440\u0433\u0435\u0442\u0438\u043A\u0438", "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433", "\u0424\u0451\u0434\u043E\u0440\u043E\u0432 \u0421\u0435\u0440\u0433\u0435\u0439 \u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440\u043E\u0432\u0438\u0447", 0, "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435");
  mon("\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u043F\u043E\u0433\u043E\u0434\u043D\u043E\u0439 \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438", "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433", "\u041A\u0443\u0437\u043D\u0435\u0446\u043E\u0432 \u0414\u043C\u0438\u0442\u0440\u0438\u0439 \u041E\u043B\u0435\u0433\u043E\u0432\u0438\u0447", 1, "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435", { who: "\u041F\u0435\u0442\u0440\u043E\u0432\u0430 \u041C\u0430\u0440\u0438\u044F \u041D\u0438\u043A\u043E\u043B\u0430\u0435\u0432\u043D\u0430", from: 0, to: 13 });
  mon("\u0414\u043E\u0440\u043E\u0436\u043D\u0430\u044F \u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043D\u0430 \u0444\u0435\u0434\u0435\u0440\u0430\u043B\u044C\u043D\u044B\u0445 \u0442\u0440\u0430\u0441\u0441\u0430\u0445", "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433", "\u041A\u0443\u0437\u043D\u0435\u0446\u043E\u0432 \u0414\u043C\u0438\u0442\u0440\u0438\u0439 \u041E\u043B\u0435\u0433\u043E\u0432\u0438\u0447", null, "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435", { who: "\u0421\u043E\u043A\u043E\u043B\u043E\u0432 \u0410\u043D\u0434\u0440\u0435\u0439 \u0418\u0433\u043E\u0440\u0435\u0432\u0438\u0447", from: -1, to: 14 });
  mon("\u0415\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u0442\u0430\u0431\u043B\u0438\u0446\u0430 \u0434\u043E\u043A\u043B\u0430\u0434\u043E\u0432", "\u0422\u0430\u0431\u043B\u0438\u0446\u0430", "\u041F\u0435\u0442\u0440\u043E\u0432\u0430 \u041C\u0430\u0440\u0438\u044F \u041D\u0438\u043A\u043E\u043B\u0430\u0435\u0432\u043D\u0430", 2, "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435");
  mon("\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u0438\u0441\u0435\u043C \u0432 \u0430\u043F\u043F\u0430\u0440\u0430\u0442 governor\u0430", "\u041F\u0438\u0441\u044C\u043C\u043E", "\u041F\u0435\u0442\u0440\u043E\u0432\u0430 \u041C\u0430\u0440\u0438\u044F \u041D\u0438\u043A\u043E\u043B\u0430\u0435\u0432\u043D\u0430", 3, "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435");
  mon("\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u043F\u043E\u0436\u0430\u0440\u043E\u043E\u0431\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0435", "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433", "\u041C\u0438\u0445\u0430\u0439\u043B\u043E\u0432\u0430 \u0415\u043B\u0435\u043D\u0430 \u0414\u043C\u0438\u0442\u0440\u0438\u0435\u0432\u043D\u0430", 0, "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435");
  mon("\u0412\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0441 \u0415\u0414\u0414\u0421 \u2014 \u0441\u0443\u0442\u043E\u0447\u043D\u044B\u0439 \u043E\u0431\u043C\u0435\u043D", "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433", "\u0421\u043E\u043A\u043E\u043B\u043E\u0432 \u0410\u043D\u0434\u0440\u0435\u0439 \u0418\u0433\u043E\u0440\u0435\u0432\u0438\u0447", null, "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435");
  mon("\u0420\u0435\u0435\u0441\u0442\u0440 \u043F\u043E\u0440\u0443\u0447\u0435\u043D\u0438\u0439 \u0433\u043B\u0430\u0432\u044B", "\u0422\u0430\u0431\u043B\u0438\u0446\u0430", "\u041D\u0430\u0437\u0430\u0440\u043E\u0432\u0430 \u041E\u043B\u044C\u0433\u0430 \u041F\u0435\u0442\u0440\u043E\u0432\u043D\u0430", 5, "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435");
  mon("\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0413\u0418\u041C\u0421 (\u0432\u043E\u0434\u043D\u044B\u0435 \u043E\u0431\u044A\u0435\u043A\u0442\u044B)", "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433", "\u041A\u043E\u0437\u043B\u043E\u0432 \u0412\u0438\u0442\u0430\u043B\u0438\u0439 \u0420\u043E\u043C\u0430\u043D\u043E\u0432\u0438\u0447", 7, "\u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
  mon("\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0432\u0445\u043E\u0434\u044F\u0449\u0435\u0439 \u043A\u043E\u0440\u0440\u0435\u0441\u043F\u043E\u043D\u0434\u0435\u043D\u0446\u0438\u0438", "\u041F\u0438\u0441\u044C\u043C\u043E", "\u0415\u0433\u043E\u0440\u043E\u0432\u0430 \u0422\u0430\u0442\u044C\u044F\u043D\u0430 \u041B\u044C\u0432\u043E\u0432\u043D\u0430", null, "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E");
  const insDoc = db.prepare(
    `INSERT INTO edo_documents (doc_number, doc_url, summary, instruction, responsible_id, participants,
      control_type, deadline, off_control, off_control_date, sub_resolution, approval_number, approval_url,
      approval_status, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );
  const insLog = db.prepare("INSERT INTO work_log (entity_type, entity_id, log_date, text, created_at) VALUES (?, ?, ?, ?, ?)");
  const doc = (num, summary, instruction, resp, participants, control, dlOffset, off, approval, subRes = "", logs = []) => {
    const info = insDoc.run(
      num,
      "",
      summary,
      instruction,
      resp ? id(resp) : null,
      participants,
      control,
      dlOffset === null ? null : addDays2(today, dlOffset),
      off ? 1 : 0,
      off ? addDays2(today, -2) : null,
      subRes,
      off ? "" : `\u041B\u0421-${num}`,
      "",
      approval,
      now,
      now
    );
    const docId = Number(info.lastInsertRowid);
    for (const [dOff, text] of logs) insLog.run("edo", docId, addDays2(today, dOff), text, now);
  };
  doc("1234/\u0410", "\u041E \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0438 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u0430\u0432\u043E\u0434\u043A\u043E\u0432\u044B\u0435 \u043C\u0435\u0440\u043E\u043F\u0440\u0438\u044F\u0442\u0438\u044F", "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0440\u0430\u0441\u0447\u0451\u0442 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442 \u043F\u0438\u0441\u044C\u043C\u0430 \u0434\u043E \u043A\u043E\u043D\u0446\u0430 \u043D\u0435\u0434\u0435\u043B\u0438", "\u0421\u043C\u0438\u0440\u043D\u043E\u0432\u0430 \u0410\u043D\u043D\u0430 \u0412\u0438\u043A\u0442\u043E\u0440\u043E\u0432\u043D\u0430", "\u0444\u0438\u043D\u043E\u0442\u0434\u0435\u043B, \u0413\u0423 \u0420\u0421\u0427\u0421", "red", -2, false, "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", "\u041F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u0432 \u043E\u0442\u0434\u0435\u043B \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F", [
    [-4, "\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u043B \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u043F\u0440\u043E\u0448\u043B\u043E\u043C\u0443 \u0433\u043E\u0434\u0443 \u0432 \u0413\u0423 \u0420\u0421\u0427\u0421"],
    [-1, "\u041F\u043E\u043B\u0443\u0447\u0438\u043B \u0440\u0430\u0441\u0447\u0451\u0442, \u0441\u0432\u0451\u043B \u0432 \u0442\u0430\u0431\u043B\u0438\u0446\u0443, \u043D\u0430\u043F\u0440\u0430\u0432\u0438\u043B \u043F\u043E\u0434\u0440\u0435\u0437\u043E\u043B\u044E\u0446\u0438\u044E"]
  ]);
  doc("1240/\u0410", "\u041E \u043F\u0440\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u0438 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438 \u043F\u043E \u043E\u043F\u043E\u0432\u0435\u0449\u0435\u043D\u0438\u044E", "\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u043E\u0432\u0430\u0442\u044C \u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u0441\u0438\u043B \u0438 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", "\u0421\u043E\u043A\u043E\u043B\u043E\u0432 \u0410\u043D\u0434\u0440\u0435\u0439 \u0418\u0433\u043E\u0440\u0435\u0432\u0438\u0447", "\u0415\u0414\u0414\u0421, \u043C\u0443\u043D\u0438\u0446\u0438\u043F\u0430\u043B\u0438\u0442\u0435\u0442\u044B", "red", 0, false, "\u043D\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u0438", "", [
    [-2, "\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043B \u0432\u0440\u0435\u043C\u044F \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438 \u0441 \u0415\u0414\u0414\u0421"]
  ]);
  doc("1251/\u0411", "\u041E \u0445\u043E\u0434\u0435 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0438 \u043A \u043E\u0442\u043E\u043F\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u043C\u0443 \u0441\u0435\u0437\u043E\u043D\u0443", "\u041F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E \u0434\u043B\u044F \u0434\u043E\u043A\u043B\u0430\u0434\u0430", "\u0424\u0451\u0434\u043E\u0440\u043E\u0432 \u0421\u0435\u0440\u0433\u0435\u0439 \u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440\u043E\u0432\u0438\u0447", "\u041C\u0438\u043D\u0416\u041A\u0425", "green", 1, false, "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", "", [
    [-1, "\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u043B \u0441\u043F\u0440\u0430\u0432\u043A\u0443 \u0432 \u041C\u0438\u043D\u0416\u041A\u0425"]
  ]);
  doc("1255/\u0411", "\u041E \u043D\u0430\u0433\u0440\u0430\u0436\u0434\u0435\u043D\u0438\u0438 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432", "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u0438 \u043A \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044E", "\u0415\u0433\u043E\u0440\u043E\u0432\u0430 \u0422\u0430\u0442\u044C\u044F\u043D\u0430 \u041B\u044C\u0432\u043E\u0432\u043D\u0430", "\u043A\u0430\u0434\u0440\u044B", "green", 3, false, "", "", []);
  doc("1260/\u0411", "\u041E \u043F\u043B\u0430\u043D\u0430\u0445 \u043A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043E\u043A \u043D\u0430 \u043A\u0432\u0430\u0440\u0442\u0430\u043B", "\u0421\u0432\u0435\u0441\u0442\u0438 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043E\u0442\u0434\u0435\u043B\u043E\u0432", "\u041D\u0430\u0437\u0430\u0440\u043E\u0432\u0430 \u041E\u043B\u044C\u0433\u0430 \u041F\u0435\u0442\u0440\u043E\u0432\u043D\u0430", "\u0432\u0441\u0435 \u043E\u0442\u0434\u0435\u043B\u044B", "green", 6, false, "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", "", []);
  doc("1262/\u0412", "\u041E \u0440\u0435\u0430\u0433\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438 \u043D\u0430 incidents \u043D\u0430 \u0434\u043E\u0440\u043E\u0433\u0430\u0445", "\u0414\u043E\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0442\u044C \u043E \u043A\u0430\u0436\u0434\u043E\u043C \u0441\u043B\u0443\u0447\u0430\u0435 \u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u043E", "\u041A\u0443\u0437\u043D\u0435\u0446\u043E\u0432 \u0414\u043C\u0438\u0442\u0440\u0438\u0439 \u041E\u043B\u0435\u0433\u043E\u0432\u0438\u0447", "\u0423\u0413\u0418\u0411\u0414\u0414", "red", 2, false, "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D", "", [
    [-3, "\u0418\u0437\u0443\u0447\u0438\u043B, \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u043B \u0432 \u043F\u043B\u0430\u043D \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0430"]
  ]);
  doc("1270/\u0412", "\u041E\u0431 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0438 \u0440\u0435\u0433\u043B\u0430\u043C\u0435\u043D\u0442\u0430 \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F", "\u041E\u0437\u043D\u0430\u043A\u043E\u043C\u0438\u0442\u044C\u0441\u044F \u043F\u043E\u0434 \u0440\u043E\u0441\u043F\u0438\u0441\u044C, \u0434\u043E\u0432\u0435\u0441\u0442\u0438 \u0434\u043E \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432", "\u0421\u043C\u0438\u0440\u043D\u043E\u0432\u0430 \u0410\u043D\u043D\u0430 \u0412\u0438\u043A\u0442\u043E\u0440\u043E\u0432\u043D\u0430", "\u0432\u0441\u0435 \u043E\u0442\u0434\u0435\u043B\u044B", "green", null, false, "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D", "", []);
  doc("1275/\u0412", "\u041E \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u043C \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0445", "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0438 \u0441\u0440\u043E\u043A\u0438", null, "\u0418\u0422-\u043E\u0442\u0434\u0435\u043B", "green", -5, true, "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D", "\u0421\u043D\u044F\u0442 \u043A\u0430\u043A \u043D\u0435\u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439", [
    [-8, "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u043B \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u044F, \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u043B \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E"]
  ]);
  doc("1281/\u0413", "\u041E \u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438 \u043C\u043E\u0431\u0438\u043B\u0438\u0437\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0433\u043E \u043F\u043B\u0430\u043D\u0430", "\u041F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0434\u043E \u0437\u0432\u0456\u0442\u0430", "\u041F\u0435\u0442\u0440\u043E\u0432\u0430 \u041C\u0430\u0440\u0438\u044F \u041D\u0438\u043A\u043E\u043B\u0430\u0435\u0432\u043D\u0430", "\u0448\u0442\u0430\u0431 \u043E\u043A\u0440\u0443\u0433\u0430", "red", 4, false, "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", "", []);
  doc("1288/\u0413", "\u041E \u0433\u0440\u0430\u0444\u0438\u043A\u0435 \u0434\u0435\u0436\u0443\u0440\u0441\u0442\u0432\u0430 \u043D\u0430 \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u043A\u0438", "\u0423\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0433\u0440\u0430\u0444\u0438\u043A, \u0434\u043E\u0432\u0435\u0441\u0442\u0438 \u0434\u043E \u0434\u0435\u0436\u0443\u0440\u043D\u044B\u0445 \u0441\u043C\u0435\u043D", "\u0421\u043E\u043A\u043E\u043B\u043E\u0432 \u0410\u043D\u0434\u0440\u0435\u0439 \u0418\u0433\u043E\u0440\u0435\u0432\u0438\u0447", "\u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u043E\u0442\u0434\u0435\u043B", "green", 8, false, "", "", []);
  doc("1290/\u0413", "\u041E \u0437\u0430\u043A\u0443\u043F\u043A\u0435 \u0421\u0418\u0417", "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u043E\u0431\u044A\u0451\u043C\u043E\u0432", "\u041C\u0438\u0445\u0430\u0439\u043B\u043E\u0432\u0430 \u0415\u043B\u0435\u043D\u0430 \u0414\u043C\u0438\u0442\u0440\u0438\u0435\u0432\u043D\u0430", "\u0442\u044B\u043B", "green", 0, true, "\u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D", "", []);
  doc("1295/\u0414", "\u041E \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0435 \u043A \u043F\u0430\u0432\u043E\u0434\u043A\u0443", "\u0415\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u043E \u0434\u043E\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0442\u044C \u043E \u0433\u043E\u0442\u043E\u0432\u043D\u043E\u0441\u0442\u0438 \u0441\u0438\u043B", "\u0424\u0451\u0434\u043E\u0440\u043E\u0432 \u0421\u0435\u0440\u0433\u0435\u0439 \u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440\u043E\u0432\u0438\u0447", "\u0413\u0423 \u0420\u0421\u0427\u0421, \u043C\u0443\u043D\u0438\u0446\u0438\u043F\u0430\u043B\u0438\u0442\u0435\u0442\u044B", "red", 10, false, "\u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0438", "", []);
  const insTask = db.prepare(
    `INSERT INTO tasks (theme, title, priority, deadline, status, wait_until, next_action, participants,
      note, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );
  const insCheck = db.prepare("INSERT INTO task_check_items (task_id, title, done, sort_order) VALUES (?, ?, ?, ?)");
  const task = (theme, title, priority, dlOffset, status, next, participants, waitOffset, check, logs, updatedAgoDays) => {
    const stamp = `${addDays2(today, -updatedAgoDays)} 10:00:00`;
    const info = insTask.run(
      theme,
      title,
      priority,
      dlOffset === null ? null : addDays2(today, dlOffset),
      status,
      waitOffset === null ? null : addDays2(today, waitOffset),
      next,
      participants,
      "",
      now,
      stamp
    );
    const tid = Number(info.lastInsertRowid);
    check.forEach(([t, done], idx) => insCheck.run(tid, t, done ? 1 : 0, idx + 1));
    for (const [dOff, text] of logs) insLog.run("task", tid, addDays2(today, dOff), text, now);
  };
  task(
    "\u041F\u0430\u0432\u043E\u0434\u043E\u043A",
    "\u0421\u0432\u0435\u0441\u0442\u0438 \u0440\u0430\u0441\u0447\u0451\u0442 \u0441\u0438\u043B \u0438 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u0434\u043B\u044F \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u0430\u0432\u043E\u0434\u043A\u043E\u0432\u044B\u0445 \u043C\u0435\u0440\u043E\u043F\u0440\u0438\u044F\u0442\u0438\u0439",
    "\u0441\u0440\u043E\u0447\u043D\u043E",
    -1,
    "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435",
    "\u0414\u043E\u0437\u0432\u043E\u043D\u0438\u0442\u044C\u0441\u044F \u0432 \u0413\u0423 \u0420\u0421\u0427\u0421 \u0437\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0430\u044E\u0449\u0438\u043C\u0438 \u0434\u0430\u043D\u043D\u044B\u043C\u0438",
    "\u0421\u043C\u0438\u0440\u043D\u043E\u0432\u0430 \u0410.\u0412., \u041A\u0443\u0437\u043D\u0435\u0446\u043E\u0432 \u0414.\u041E.",
    null,
    [["\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u043F\u0440\u043E\u0448\u043B\u043E\u043C\u0443 \u0433\u043E\u0434\u0443", true], ["\u0421\u0432\u0435\u0441\u0442\u0438 \u0442\u0430\u0431\u043B\u0438\u0446\u044B \u043F\u043E \u043C\u0443\u043D\u0438\u0446\u0438\u043F\u0430\u043B\u0438\u0442\u0435\u0442\u0430\u043C", true], ["\u0421\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0442\u043E\u0433\u043E\u0432\u044B\u0439 \u0440\u0430\u0441\u0447\u0451\u0442", false]],
    [[-2, "\u0421\u0432\u0451\u043B \u0442\u0430\u0431\u043B\u0438\u0446\u044B, \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u0432\u0443\u0445 \u043C\u0443\u043D\u0438\u0446\u0438\u043F\u0430\u043B\u0438\u0442\u0435\u0442\u043E\u0432"]],
    1
  );
  task(
    "\u042D\u0414\u041E",
    "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 \u043D\u0430 1234/\u0410",
    "\u0432\u044B\u0441\u043E\u043A\u0438\u0439",
    0,
    "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435",
    "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442 \u043D\u0430 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0435 \u0421\u043C\u0438\u0440\u043D\u043E\u0432\u043E\u0439",
    "\u0421\u043C\u0438\u0440\u043D\u043E\u0432\u0430 \u0410.\u0412.",
    null,
    [["\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A", true], ["\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0435", false], ["\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F", false]],
    [[-1, "\u041D\u0430\u043F\u0438\u0441\u0430\u043B \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043E\u0442\u0432\u0435\u0442\u0430"]],
    1
  );
  task(
    "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0438",
    "\u0410\u043A\u0442\u0443\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043C\u0430\u0442\u0440\u0438\u0446\u0443 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u043E\u0432 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F",
    "\u043E\u0431\u044B\u0447\u043D\u044B\u0439",
    5,
    "\u0432\u0445\u043E\u0434\u044F\u0449\u0430\u044F",
    "",
    "\u0432\u0441\u0435 \u043E\u0442\u0434\u0435\u043B\u044B",
    null,
    [],
    [],
    0
  );
  task(
    "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430",
    "\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u043E\u0432\u0430\u0442\u044C \u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u0432 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0435 \u043F\u043E \u043E\u043F\u043E\u0432\u0435\u0449\u0435\u043D\u0438\u044E",
    "\u0441\u0440\u043E\u0447\u043D\u043E",
    1,
    "\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435",
    "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u044F\u0432\u043A\u0443 \u043D\u0430 \u0441\u0431\u043E\u0440\u0435",
    "\u0421\u043E\u043A\u043E\u043B\u043E\u0432 \u0410.\u0418., \u0415\u0414\u0414\u0421",
    null,
    [["\u0421\u043F\u0438\u0441\u043E\u043A \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432", true], ["\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0441\u0432\u044F\u0437\u0438", true], ["\u042F\u0432\u043A\u0430", true]],
    [[-1, "\u0421\u043F\u0438\u0441\u043E\u043A \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D, \u043F\u0435\u0440\u0435\u0434\u0430\u043B\u0438 \u0432 \u0415\u0414\u0414\u0421"]],
    1
  );
  task(
    "\u041E\u0442\u0447\u0451\u0442\u043D\u043E\u0441\u0442\u044C",
    "\u0415\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u0442\u0430\u0431\u043B\u0438\u0446\u0430 \u0434\u043E\u043A\u043B\u0430\u0434\u043E\u0432",
    "\u043E\u0431\u044B\u0447\u043D\u044B\u0439",
    2,
    "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435",
    "\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u044B \u043E\u0442\u0434\u0435\u043B\u043E\u0432",
    "\u041F\u0435\u0442\u0440\u043E\u0432\u0430 \u041C.\u041D.",
    null,
    [["\u0428\u0430\u0431\u043B\u043E\u043D", true], ["\u0421\u0431\u043E\u0440 \u0434\u0430\u043D\u043D\u044B\u0445", false], ["\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430", false]],
    [[-3, "\u041E\u0431\u043D\u043E\u0432\u0438\u043B\u0430 \u0448\u0430\u0431\u043B\u043E\u043D \u043D\u0430 \u044D\u0442\u0443 \u043D\u0435\u0434\u0435\u043B\u044E"]],
    3
  );
  task(
    "\u041A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043A\u0438",
    "\u0421\u0432\u0435\u0441\u0442\u0438 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043F\u043E \u043A\u043E\u043C\u0430\u043D\u0434\u0438\u0440\u043E\u0432\u043A\u0430\u043C \u043D\u0430 \u043A\u0432\u0430\u0440\u0442\u0430\u043B",
    "\u043D\u0438\u0437\u043A\u0438\u0439",
    6,
    "\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435",
    "\u0416\u0434\u0443 \u043E\u0442\u0432\u0435\u0442\u044B \u043E\u0442 \u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u043E\u0442\u0434\u0435\u043B\u0430",
    "\u043E\u0442\u0434\u0435\u043B\u044B",
    3,
    [],
    [],
    12
  );
  task(
    "\u0410\u0440\u0445\u0438\u0432",
    "\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043D\u043E\u043C\u0435\u043D\u043A\u043B\u0430\u0442\u0443\u0440\u0443 \u0434\u0435\u043B \u0437\u0430 \u043F\u0440\u043E\u0448\u043B\u044B\u0439 \u0433\u043E\u0434",
    "\u043D\u0438\u0437\u043A\u0438\u0439",
    null,
    "\u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0435",
    "",
    "",
    10,
    [],
    [],
    15
  );
  task(
    "\u0421\u0418\u0417",
    "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u043E\u0431\u044A\u0451\u043C\u043E\u0432 \u0437\u0430\u043A\u0443\u043F\u043A\u0438 \u0421\u0418\u0417",
    "\u043E\u0431\u044B\u0447\u043D\u044B\u0439",
    null,
    "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E",
    "",
    "\u0442\u044B\u043B",
    null,
    [["\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443", true], ["\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043D\u043E\u0440\u043C\u044B", true]],
    [[-6, "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u043B, \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u0439 \u043D\u0435\u0442"]],
    6
  );
  task(
    "\u0414\u0435\u0436\u0443\u0440\u0441\u0442\u0432\u043E",
    "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442 \u0433\u0440\u0430\u0444\u0438\u043A\u0430 \u0434\u0435\u0436\u0443\u0440\u0441\u0442\u0432\u0430 \u043D\u0430 \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u043A\u0438",
    "\u0432\u044B\u0441\u043E\u043A\u0438\u0439",
    8,
    "\u0432\u0445\u043E\u0434\u044F\u0449\u0430\u044F",
    "\u0423\u0442\u043E\u0447\u043D\u0438\u0442\u044C \u0447\u0438\u0441\u043B\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0441\u043C\u0435\u043D",
    "\u043E\u043F\u0435\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u043E\u0442\u0434\u0435\u043B",
    null,
    [["\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0448\u0442\u0430\u0442\u043A\u0443", false], ["\u0421\u0432\u0435\u0441\u0442\u0438 \u0441\u043C\u0435\u043D\u044B", false]],
    [],
    0
  );
  task(
    "\u0417\u0430\u0431\u0440\u043E\u0448\u0435\u043D\u043D\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430",
    "\u0414\u043E\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0440\u0435\u0433\u043B\u0430\u043C\u0435\u043D\u0442 \u043E\u0431\u043C\u0435\u043D\u0430 \u0444\u0430\u0439\u043B\u0430\u043C\u0438",
    "\u043E\u0431\u044B\u0447\u043D\u044B\u0439",
    12,
    "\u0432 \u0440\u0430\u0431\u043E\u0442\u0435",
    "",
    "\u0418\u0422-\u043E\u0442\u0434\u0435\u043B",
    null,
    [["\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u0442\u044C \u0444\u043E\u0440\u043C\u0430\u0442", false]],
    [[-14, "\u0412\u044B\u0441\u043B\u0430\u043B \u0437\u0430\u043C\u0435\u0447\u0430\u043D\u0438\u044F \u0418\u0422-\u043E\u0442\u0434\u0435\u043B\u0443"]],
    14
  );
}

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

// electron/ipc/handlers.ts
function registerIpc(db, dbPath, userDataDir) {
  const employees = new EmployeeRepo(db);
  const taskTypes = new TaskTypeRepo(db);
  const monitorings = new MonitoringRepo(db);
  const edo = new EdoRepo(db);
  const workLog = new WorkLogRepo(db);
  const tasks = new TaskRepo(db);
  const handle = (channel, fn) => {
    import_electron.ipcMain.handle(channel, (_event, ...args) => fn(...args));
  };
  handle(IPC.departmentsList, () => employees.listDepartments());
  handle(IPC.departmentsCreate, (input) => employees.createDepartment(input));
  handle(IPC.departmentsUpdate, (id, input) => employees.updateDepartment(id, input));
  handle(IPC.departmentsDelete, (id) => employees.deleteDepartment(id));
  handle(IPC.employeesList, (opts) => employees.list(Boolean(opts.includeArchived)));
  handle(IPC.employeesGet, (id) => employees.get(id));
  handle(IPC.employeesCreate, (input) => employees.create(input));
  handle(IPC.employeesUpdate, (id, input) => employees.update(id, input));
  handle(IPC.employeesArchive, (id, archived) => employees.setArchived(id, archived));
  handle(IPC.absencesList, (opts) => employees.listAbsences(opts));
  handle(IPC.absencesCreate, (input) => employees.createAbsence(input));
  handle(IPC.absencesUpdate, (id, input) => employees.updateAbsence(id, input));
  handle(IPC.absencesDelete, (id) => employees.deleteAbsence(id));
  handle(IPC.taskTypesList, () => taskTypes.list());
  handle(IPC.taskTypesCreate, (name) => taskTypes.create(name));
  handle(IPC.taskTypesUpdate, (id, input) => taskTypes.update(id, input));
  handle(IPC.taskTypesDelete, (id) => taskTypes.remove(id));
  handle(IPC.taskTypesReorder, (orderedIds) => taskTypes.reorder(orderedIds));
  handle(IPC.monitoringsList, (opts) => monitorings.list(opts));
  handle(IPC.monitoringsGet, (id) => monitorings.get(id));
  handle(IPC.monitoringsCreate, (input) => monitorings.create(input));
  handle(IPC.monitoringsUpdate, (id, input) => monitorings.update(id, input));
  handle(IPC.monitoringsArchive, (id) => monitorings.archive(id));
  const settingsForDocs = () => getSettings(db);
  const withLink = (v) => v.map((d) => applyDocLink(d, settingsForDocs().edoLinkTemplate));
  handle(IPC.edoList, (opts) => withLink(edo.list(opts)));
  handle(IPC.edoGet, (id) => {
    const v = edo.get(id);
    return v ? applyDocLink(v, settingsForDocs().edoLinkTemplate) : null;
  });
  handle(IPC.edoCreate, (input) => edo.create(input));
  handle(IPC.edoUpdate, (id, input) => edo.update(id, input));
  handle(IPC.edoOffControl, (id) => edo.setOffControl(id, true));
  handle(IPC.edoOnControl, (id) => edo.setOffControl(id, false));
  handle(IPC.edoArchive, (id) => edo.archive(id));
  handle(IPC.workLogList, (entityType, entityId) => workLog.list(entityType, entityId));
  handle(IPC.workLogCreate, (input) => workLog.create(input));
  handle(IPC.workLogUpdate, (id, input) => workLog.update(id, input));
  handle(IPC.workLogDelete, (id) => workLog.remove(id));
  handle(IPC.tasksList, (opts) => {
    tasks.wakeUpExpired();
    return tasks.list(opts);
  });
  handle(IPC.tasksGet, (id) => {
    tasks.wakeUpExpired();
    return tasks.get(id);
  });
  handle(IPC.tasksCreate, (input) => tasks.create(input));
  handle(IPC.tasksUpdate, (id, input) => tasks.update(id, input));
  handle(IPC.tasksArchive, (id) => tasks.archive(id));
  handle(IPC.tasksUnarchive, (id) => tasks.unarchive(id));
  handle(IPC.checkItemsList, (taskId) => tasks.listCheckItems(taskId));
  handle(IPC.checkItemsCreate, (taskId, title) => tasks.createCheckItem(taskId, title));
  handle(IPC.checkItemsUpdate, (id, input) => tasks.updateCheckItem(id, input));
  handle(IPC.checkItemsDelete, (id) => tasks.removeCheckItem(id));
  handle(IPC.settingsGet, () => getSettings(db));
  handle(IPC.settingsUpdate, (patch) => updateSettings(db, patch));
  handle(IPC.dashboardGet, () => {
    tasks.wakeUpExpired();
    return buildDashboard(db);
  });
  handle(IPC.searchGlobal, (query) => globalSearch(db, query));
  handle(IPC.backupNow, () => backupNow(dbPath, import_node_path3.default.join(userDataDir, "backups")));
  handle(IPC.loadDemo, () => loadDemoData(db));
  handle(IPC.clearAll, () => clearAllData(db));
}

// electron/main.ts
var isDev = !!process.env.VITE_DEV_SERVER_URL;
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron2.BrowserWindow({
    title: "\u0428\u0442\u0430\u0431",
    width: 1440,
    height: 900,
    minWidth: 1100,
    // обязательная минимальная ширина по ТЗ
    show: false,
    webPreferences: {
      preload: import_node_path4.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
      // нужен для require('electron') в preload (contextBridge)
    }
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(import_node_path4.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void import_electron2.shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
var gotLock = import_electron2.app.requestSingleInstanceLock();
if (!gotLock) {
  import_electron2.app.quit();
} else {
  import_electron2.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  void import_electron2.app.whenReady().then(async () => {
    import_electron2.app.setName("\u0428\u0442\u0430\u0431");
    const userDataDir = import_electron2.app.getPath("userData");
    const dbPath = import_node_path4.default.join(userDataDir, "shtab.db");
    const db = openDatabase(dbPath);
    try {
      await backupNow(dbPath, import_node_path4.default.join(userDataDir, "backups"));
    } catch (err) {
      console.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443\u044E \u043A\u043E\u043F\u0438\u044E:", err);
    }
    registerIpc(db, dbPath, userDataDir);
    createWindow();
    import_electron2.app.on("activate", () => {
      if (import_electron2.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  import_electron2.app.on("window-all-closed", () => {
    import_electron2.app.quit();
  });
}
