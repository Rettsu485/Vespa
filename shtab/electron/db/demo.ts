// Демо-данные по ТЗ (раздел 7): отделы, сотрудники, отсутствия, мониторинги, ЭДО, задачи.
// Даты генерируются относительно «сегодня», чтобы карточки на дашборде были живыми.
import type { Db } from './database';
import { addDays, todayIso } from './dateUtils';

const TABLES = [
  'task_check_items',
  'tasks',
  'work_log',
  'edo_documents',
  'monitorings',
  'absences',
  'employees',
  'departments',
] as const;

export function clearAllData(db: Db): void {
  db.transaction(() => {
    for (const t of TABLES) db.prepare(`DELETE FROM ${t}`).run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN (@names)").run({ names: TABLES.join(',') });
    // Сбрасываем справочник типов к значениям по умолчанию.
    db.prepare('DELETE FROM task_types').run();
    seedTaskTypes(db);
  })();
}

function seedTaskTypes(db: Db): void {
  ['Мониторинг', 'Письмо', 'Таблица'].forEach((name, i) => {
    db.prepare('INSERT INTO task_types (name, sort_order, active) VALUES (?, ?, 1)').run(name, i + 1);
  });
}

/** Заполняет БД реалистичными примерами. Предварительно очищает данные. */
export function loadDemoData(db: Db): void {
  clearAllData(db);
  const today = todayIso();
  const now = `${today} 09:00:00`;

  // ---- Отделы: два верхнего уровня + вложенный ----
  const insDept = db.prepare('INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)');
  const deptMain = Number(insDept.run('Управление СМП и ЧС', null, 1).lastInsertRowid);
  const deptPlan = Number(insDept.run('Отдел планирования и мониторинга', deptMain, 2).lastInsertRowid);
  const deptOp = Number(insDept.run('Оперативный отдел', deptMain, 3).lastInsertRowid);

  // ---- Сотрудники ----
  interface EmpSeed {
    name: string;
    dept: number;
    position: string;
    ext: string;
    mobile: string;
    email: string;
    birthdayInDays: number | null; // день рождения через N дней от сегодня
    functions: string;
    fired?: boolean;
  }
  const emps: EmpSeed[] = [
    { name: 'Иванов Пётр Сергеевич', dept: deptMain, position: 'Начальник управления', ext: '4-101', mobile: '+7 900 111-01-01', email: 'ivanov@example.ru', birthdayInDays: 2, functions: 'Общее руководство, согласование документов, планерки' },
    { name: 'Смирнова Анна Викторовна', dept: deptPlan, position: 'Начальник отдела', ext: '4-110', mobile: '+7 900 111-02-02', email: 'smirnova@example.ru', birthdayInDays: 12, functions: 'Планирование, сводки по мониторингам, работа с ЭДО' },
    { name: 'Кузнецов Дмитрий Олегович', dept: deptPlan, position: 'Главный специалист', ext: '4-112', mobile: '', email: 'kuznetsov@example.ru', birthdayInDays: null, functions: 'Мониторинг погодной обстановки, дорожная обстановка' },
    { name: 'Петрова Мария Николаевна', dept: deptPlan, position: 'Ведущий специалист', ext: '4-113', mobile: '+7 900 111-03-03', email: 'petrova@example.ru', birthdayInDays: 0, functions: 'Подготовка писем, реестр поручений, таблица еженедельных докладов' },
    { name: 'Соколов Андрей Игоревич', dept: deptOp, position: 'Начальник оперативного отдела', ext: '4-120', mobile: '', email: 'sokolov@example.ru', birthdayInDays: 25, functions: 'Оперативная обстановка, дежурство, взаимодействие с ЕДДС' },
    { name: 'Михайлова Елена Дмитриевна', dept: deptOp, position: 'Ведущий специалист', ext: '4-122', mobile: '+7 900 111-04-04', email: 'mikhailova@example.ru', birthdayInDays: null, functions: 'Сводка ЧС, мониторинг пожарообстановки' },
    { name: 'Фёдоров Сергей Александрович', dept: deptOp, position: 'Главный специалист', ext: '4-123', mobile: '', email: 'fedorov@example.ru', birthdayInDays: 5, functions: 'Мониторинг ЖКХ, энергетика, связь' },
    { name: 'Назарова Ольга Петровна', dept: deptPlan, position: 'Главный специалист', ext: '4-114', mobile: '+7 900 111-05-05', email: 'nazarova@example.ru', birthdayInDays: null, functions: 'Документооборот, листы согласования, архив' },
    { name: 'Козлов Виталий Романович', dept: deptOp, position: 'Ведущий специалист', ext: '4-124', mobile: '', email: 'kozlov@example.ru', birthdayInDays: 40, functions: 'Транспортная обстановка, мониторинг ГИМС' },
    { name: 'Егорова Татьяна Львовна', dept: deptMain, position: 'Секретарь-референт', ext: '4-105', mobile: '+7 900 111-06-06', email: 'egorova@example.ru', birthdayInDays: null, functions: 'Входящая корреспонденция, регистрация документов' },
    { name: 'Титов Николай Васильевич', dept: deptPlan, position: 'Консультант', ext: '4-115', mobile: '', email: 'titov@example.ru', birthdayInDays: null, functions: 'Аналитика, подготовка справок', fired: true },
  ];

  const insEmp = db.prepare(
    `INSERT INTO employees (full_name, department_id, position, internal_phone, mobile_phone, email,
      birthday, functions, is_fired, fired_date, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  );
  const empId = new Map<string, number>();
  for (const e of emps) {
    const birthday = e.birthdayInDays === null ? null : addDays(today, -e.birthdayInDays - 30 * 365);
    const info = insEmp.run(
      e.name, e.dept, e.position, e.ext, e.mobile, e.email, birthday, e.functions,
      e.fired ? 1 : 0, e.fired ? addDays(today, -60) : null, now, now,
    );
    empId.set(e.name, Number(info.lastInsertRowid));
  }
  const id = (n: string) => empId.get(n)!;

  // ---- Отсутствия ----
  const insAbs = db.prepare('INSERT INTO absences (employee_id, absence_type, date_from, date_to, note) VALUES (?, ?, ?, ?, ?)');
  insAbs.run(id('Кузнецов Дмитрий Олегович'), 'отпуск', today, addDays(today, 13), 'Основной отпуск');
  insAbs.run(id('Фёдоров Сергей Александрович'), 'больничный', addDays(today, -2), addDays(today, 3), '');
  insAbs.run(id('Михайлова Елена Дмитриевна'), 'командировка', addDays(today, 4), addDays(today, 9), 'Учения, полигон');
  insAbs.run(id('Петрова Мария Николаевна'), 'отпуск', addDays(today, 20), addDays(today, 33), '');
  insAbs.run(id('Козлов Виталий Романович'), 'отпуск', addDays(today, 5), addDays(today, 8), 'Короткий отпуск — вернётся скоро');

  // ---- Мониторинги ----
  const typeId = new Map<number, string>();
  (db.prepare('SELECT id, name FROM task_types').all() as { id: number; name: string }[]).forEach((t) =>
    typeId.set(t.id, t.name),
  );
  const types = [...typeId.entries()]; // [ [1,'Мониторинг'], ... ]
  const typeByName = new Map(types.map(([i, n]) => [n, i]));
  const insMon = db.prepare(
    `INSERT INTO monitorings (name, type_id, employee_id, deadline, note, status, deputy_employee_id,
      deputy_from, deputy_to, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const mon = (
    name: string, type: string, who: string, dlOffset: number | null, status: string,
    deputy?: { who: string; from: number; to: number }, note = '',
  ) => {
    insMon.run(
      name, typeByName.get(type)!, id(who), dlOffset === null ? null : addDays(today, dlOffset), note, status,
      deputy ? id(deputy.who) : null, deputy ? addDays(today, deputy.from) : null, deputy ? addDays(today, deputy.to) : null,
      now, now,
    );
  };
  // Исполнитель отсутствует (больничный), дублёра нет → красный флаг.
  mon('Оперативная сводка ЖКХ и энергетики', 'Мониторинг', 'Фёдоров Сергей Александрович', 0, 'в работе');
  // Исполнитель в отпуске, но дублёр назначен → подсветка с бейджём дублёра.
  mon('Мониторинг погодной обстановки', 'Мониторинг', 'Кузнецов Дмитрий Олегович', 1, 'в работе', { who: 'Петрова Мария Николаевна', from: 0, to: 13 });
  mon('Дорожная обстановка на федеральных трассах', 'Мониторинг', 'Кузнецов Дмитрий Олегович', null, 'в работе', { who: 'Соколов Андрей Игоревич', from: -1, to: 14 });
  mon('Еженедельная таблица докладов', 'Таблица', 'Петрова Мария Николаевна', 2, 'в работе');
  mon('Подготовка писем в аппарат governorа', 'Письмо', 'Петрова Мария Николаевна', 3, 'в работе');
  mon('Сводка по пожарообстановке', 'Мониторинг', 'Михайлова Елена Дмитриевна', 0, 'в работе');
  mon('Взаимодействие с ЕДДС — суточный обмен', 'Мониторинг', 'Соколов Андрей Игоревич', null, 'в работе');
  mon('Реестр поручений главы', 'Таблица', 'Назарова Ольга Петровна', 5, 'в работе');
  mon('Мониторинг ГИМС (водные объекты)', 'Мониторинг', 'Козлов Виталий Романович', 7, 'приостановлено');
  mon('Регистрация входящей корреспонденции', 'Письмо', 'Егорова Татьяна Львовна', null, 'выполнено');

  // ---- Документы ЭДО ----
  const insDoc = db.prepare(
    `INSERT INTO edo_documents (doc_number, doc_url, summary, instruction, responsible_id, participants,
      control_type, deadline, off_control, off_control_date, sub_resolution, approval_number, approval_url,
      approval_status, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  );
  const insLog = db.prepare('INSERT INTO work_log (entity_type, entity_id, log_date, text, created_at) VALUES (?, ?, ?, ?, ?)');
  const doc = (
    num: string, summary: string, instruction: string, resp: string | null, participants: string,
    control: 'red' | 'green', dlOffset: number | null, off: boolean, approval: string,
    subRes = '', logs: [number, string][] = [],
  ) => {
    const info = insDoc.run(
      num, '', summary, instruction, resp ? id(resp) : null, participants, control,
      dlOffset === null ? null : addDays(today, dlOffset), off ? 1 : 0, off ? addDays(today, -2) : null,
      subRes, off ? '' : `ЛС-${num}`, '', approval, now, now,
    );
    const docId = Number(info.lastInsertRowid);
    for (const [dOff, text] of logs) insLog.run('edo', docId, addDays(today, dOff), text, now);
  };
  doc('1234/А', 'О выделении средств на противопаводковые мероприятия', 'Подготовить расчёт и проект письма до конца недели', 'Смирнова Анна Викторовна', 'финотдел, ГУ РСЧС', 'red', -2, false, 'на согласовании', 'Перенаправлен в отдел планирования', [
    [-4, 'Запросил данные по прошлому году в ГУ РСЧС'],
    [-1, 'Получил расчёт, свёл в таблицу, направил подрезолюцию'],
  ]);
  doc('1240/А', 'О проведении тренировки по оповещению', 'Организовать участие сил и средств Управления', 'Соколов Андрей Игоревич', 'ЕДДС, муниципалитеты', 'red', 0, false, 'на подписи', '', [
    [-2, 'Согласовал время тренировки с ЕДДС'],
  ]);
  doc('1251/Б', 'О ходе подготовки к отопительному сезону', 'Предоставить информацию для доклада', 'Фёдоров Сергей Александрович', 'МинЖКХ', 'green', 1, false, 'на согласовании', '', [
    [-1, 'Запросил справку в МинЖКХ'],
  ]);
  doc('1255/Б', 'О награждении сотрудников', 'Подготовить списки к представлению', 'Егорова Татьяна Львовна', 'кадры', 'green', 3, false, '', '', []);
  doc('1260/Б', 'О планах командировок на квартал', 'Свести предложения отделов', 'Назарова Ольга Петровна', 'все отделы', 'green', 6, false, 'на согласовании', '', []);
  doc('1262/В', 'О реагировании на incidents на дорогах', 'Докладывать о каждом случае оперативно', 'Кузнецов Дмитрий Олегович', 'УГИБДД', 'red', 2, false, 'подписан', '', [
    [-3, 'Изучил, поставил в план мониторинга'],
  ]);
  doc('1270/В', 'Об утверждении регламента взаимодействия', 'Ознакомиться под роспись, довести до сотрудников', 'Смирнова Анна Викторовна', 'все отделы', 'green', null, false, 'подписан', '', []);
  doc('1275/В', 'О резервном копировании данных', 'Определить ответственных и сроки', null, 'ИТ-отдел', 'green', -5, true, 'подписан', 'Снят как неактуальный', [
    [-8, 'Подготовил замечания, отправил исполнителю'],
  ]);
  doc('1281/Г', 'О формировании мобилизационного плана', 'Предоставить предложения до звіта', 'Петрова Мария Николаевна', 'штаб округа', 'red', 4, false, 'на согласовании', '', []);
  doc('1288/Г', 'О графике дежурства на праздники', 'Утвердить график, довести до дежурных смен', 'Соколов Андрей Игоревич', 'оперативный отдел', 'green', 8, false, '', '', []);
  doc('1290/Г', 'О закупке СИЗ', 'Проверить обоснование объёмов', 'Михайлова Елена Дмитриевна', 'тыл', 'green', 0, true, 'подписан', '', []);
  doc('1295/Д', 'О подготовке к паводку', 'Еженедельно докладывать о готовности сил', 'Фёдоров Сергей Александрович', 'ГУ РСЧС, муниципалитеты', 'red', 10, false, 'на согласовании', '', []);

  // ---- Задачи ----
  const insCheck = db.prepare('INSERT INTO task_check_items (task_id, title, done, sort_order) VALUES (?, ?, ?, ?)');
  const task = (
    theme: string, title: string, priority: string, dlOffset: number | null, status: string,
    next: string, participants: string, waitOffset: number | null, check: [string, boolean][],
    logs: [number, string][], updatedAgoDays: number,
  ) => {
    const stamp = `${addDays(today, -updatedAgoDays)} 10:00:00`;
    // Архив по ТЗ = статусы «выполнено»/«отменено»: синхронизируем мягкий флаг archived.
    const archivedFlag = status === 'выполнено' || status === 'отменено' ? 1 : 0;
    const info = db
      .prepare(
        `INSERT INTO tasks (theme, title, priority, deadline, status, wait_until, next_action, participants,
          note, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        theme, title, priority, dlOffset === null ? null : addDays(today, dlOffset), status,
        waitOffset === null ? null : addDays(today, waitOffset), next, participants, '', archivedFlag, now, stamp,
      );
    const tid = Number(info.lastInsertRowid);
    check.forEach(([t, done], idx) => insCheck.run(tid, t, done ? 1 : 0, idx + 1));
    for (const [dOff, text] of logs) insLog.run('task', tid, addDays(today, dOff), text, now);
  };
  task('Паводок', 'Свести расчёт сил и средств для противопаводковых мероприятий', 'срочно', -1, 'в работе',
    'Дозвониться в ГУ РСЧС за недостающими данными', 'Смирнова А.В., Кузнецов Д.О.', null,
    [['Запросить данные по прошлому году', true], ['Свести таблицы по муниципалитетам', true], ['Сформировать итоговый расчёт', false]],
    [[-2, 'Свёл таблицы, не хватает двух муниципалитетов']], 1);
  task('ЭДО', 'Подготовить проект ответа на 1234/А', 'высокий', 0, 'в работе',
    'Отправить проект на согласование Смирновой', 'Смирнова А.В.', null,
    [['Черновик', true], ['Согласование', false], ['Регистрация', false]],
    [[-1, 'Написал черновик ответа']], 1);
  task('Мониторинги', 'Актуализировать матрицу мониторингов управления', 'обычный', 5, 'входящая',
    '', 'все отделы', null, [], [], 0);
  task('Тренировка', 'Организовать участие в тренировке по оповещению', 'срочно', 1, 'на проверке',
    'Проверить явку на сборе', 'Соколов А.И., ЕДДС', null,
    [['Список участников', true], ['Проверка связи', true], ['Явка', true]],
    [[-1, 'Список утверждён, передали в ЕДДС']], 1);
  task('Отчётность', 'Еженедельная таблица докладов', 'обычный', 2, 'в работе',
    'Собрать фрагменты отделов', 'Петрова М.Н.', null,
    [['Шаблон', true], ['Сбор данных', false], ['Отправка', false]],
    [[-3, 'Обновила шаблон на эту неделю']], 3);
  task('Командировки', 'Свести предложения по командировкам на квартал', 'низкий', 6, 'ожидание',
    'Жду ответы от оперативного отдела', 'отделы', 3, [], [], 12);
  task('Архив', 'Разобрать номенклатуру дел за прошлый год', 'низкий', null, 'ожидание',
    '', '', 10, [], [], 15);
  task('СИЗ', 'Проверить обоснование объёмов закупки СИЗ', 'обычный', null, 'выполнено',
    '', 'тыл', null, [['Получить заявку', true], ['Проверить нормы', true]],
    [[-6, 'Проверил, замечаний нет']], 6);
  task('Дежурство', 'Подготовить проект графика дежурства на праздники', 'высокий', 8, 'входящая',
    'Уточнить численность смен', 'оперативный отдел', null,
    [['Получить штатку', false], ['Свести смены', false]], [], 0);
  task('Заброшенная задача', 'Доработать регламент обмена файлами', 'обычный', 12, 'в работе',
    '', 'ИТ-отдел', null, [['Согласовать формат', false]],
    [[-14, 'Выслал замечания ИТ-отделу']], 14);
}
