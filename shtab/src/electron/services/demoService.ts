// Загрузка демо-данных (кнопка в Настройках). Данные «приземлены» к текущей дате,
// чтобы на дашборде были просрочки, горящие сроки, дни рождения и красные флаги.

import type { TypedDb } from '../db/database';
import { nowSqlTimestamp } from '../db/dates';
import { shiftIso } from '../repositories/teamRepo';
import { todayIso } from '../db/dates';

type Row = Record<string, string | number | null>;

function insert(db: TypedDb, table: string, row: Row): number {
  const keys = Object.keys(row);
  const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`);
  const res = stmt.run(...keys.map((k) => row[k]));
  return Number(res.lastInsertRowid);
}

export function loadDemoData(db: TypedDb): void {
  const today = todayIso();
  const d = (offset: number) => shiftIso(today, offset);
  const ts = nowSqlTimestamp();

  db.transaction(() => {
    // ── Отделы (вложенная структура) ───────────────────────
    const dirId = insert(db, 'departments', { name: 'Управление СМП и ЧС', parent_id: null, sort_order: 1 });
    const o1 = insert(db, 'departments', { name: 'Отдел мониторинга и прогнозирования', parent_id: dirId, sort_order: 1 });
    const o2 = insert(db, 'departments', { name: 'Отдел оперативного реагирования', parent_id: dirId, sort_order: 2 });
    const o3 = insert(db, 'departments', { name: 'Сектор обеспечения и документооборота', parent_id: dirId, sort_order: 3 });

    // ── Сотрудники ─────────────────────────────────────────
    interface EmpSeed {
      name: string;
      dep: number;
      pos: string;
      ext: string;
      mob: string;
      mail: string;
      bd: string | null; // MM-DD — год подставляется ближайший прошлый
      fn: string;
    }
    const emps: EmpSeed[] = [
      { name: 'Соколов Игорь Петрович', dep: dirId, pos: 'Начальник управления', ext: '4101', mob: '+7 900 111-01-01', mail: 'sokolov@smch.example.ru', bd: '03-14', fn: 'Общее руководство, согласование ключевых документов' },
      { name: 'Ветрова Анна Сергеевна', dep: o1, pos: 'Начальник отдела', ext: '4110', mob: '+7 900 111-02-01', mail: 'vetrova@smch.example.ru', bd: '11-02', fn: 'Прогноз ЧС, сводка по области, взаимодействие с ЕДДС' },
      { name: 'Громов Павел Андреевич', dep: o1, pos: 'Главный специалист', ext: '4112', mob: '+7 900 111-02-02', mail: 'gromov@smch.example.ru', bd: '11-01', fn: 'Мониторинг гидрообстановки, таблицы осадков' },
      { name: 'Литвинова Мария Олеговна', dep: o1, pos: 'Ведущий специалист', ext: '4113', mob: '', mail: 'litvinova@smch.example.ru', bd: '05-23', fn: 'Лесопожарная обстановка, мониторинг ГИМС' },
      { name: 'Кабанов Дмитрий Юрьевич', dep: o2, pos: 'Начальник отдела', ext: '4120', mob: '+7 900 111-03-01', mail: 'kabanov@smch.example.ru', bd: '08-19', fn: 'Оперативное дежурство, реагирование, координация подразделений' },
      { name: 'Овчинникова Елена Викторовна', dep: o2, pos: 'Главный специалист', ext: '4122', mob: '', mail: 'ovchinnikova@smch.example.ru', bd: '12-05', fn: 'Учёт пострадавших объектов, доклады в регион' },
      { name: 'Тимофеев Никита Романович', dep: o2, pos: 'Ведущий специалист', ext: '4123', mob: '+7 900 111-03-02', mail: 'timofeev@smch.example.ru', bd: '02-27', fn: 'Мониторинг дорожной обстановки, зимнее содержание трасс' },
      { name: 'Засухина Ольга Николаевна', dep: o3, pos: 'Секретарь-делопроизводитель', ext: '4130', mob: '', mail: 'zasukhina@smch.example.ru', bd: '11-04', fn: 'Входящая/исходящая корреспонденция, регистрация ЭДО' },
      { name: 'Ремизов Артём Владиславович', dep: o3, pos: 'Главный специалист', ext: '4132', mob: '+7 900 111-04-01', mail: 'remizov@smch.example.ru', bd: '07-08', fn: 'Закупки, хозяйственное обеспечение' },
      { name: 'Панова Светлана Игоревна', dep: o3, pos: 'Консультант', ext: '4133', mob: '', mail: 'panova@smch.example.ru', bd: '09-30', fn: 'Подготовка отчётов, аналитика документооборота' },
      { name: 'Дюжев Константин Михайлович', dep: o1, pos: 'Инженер', ext: '4114', mob: '', mail: 'dyuzhev@smch.example.ru', bd: '04-17', fn: 'Настройка АПК «Безопасный город», техника отдела' },
      { name: 'Селезнёва Татьяна Аркадьевна', dep: o2, pos: 'Главный специалист (увольняется)', ext: '4124', mob: '', mail: 'selezneva@smch.example.ru', bd: '01-11', fn: 'Архив оперативных докладных' },
    ];
    const empIds: number[] = [];
    for (const e of emps) {
      let birthday: string | null = null;
      if (e.bd) {
        const year = Number(today.slice(0, 4)) - 35;
        birthday = `${year}-${e.bd}`;
      }
      empIds.push(
        insert(db, 'employees', {
          full_name: e.name, department_id: e.dep, position: e.pos, internal_phone: e.ext, mobile_phone: e.mob,
          email: e.mail, birthday, functions: e.fn, is_fired: 0, fired_date: null, archived: 0, created_at: ts, updated_at: ts,
        })
      );
    }
    const [dir, vetrova, gromov, litvinova, kabanov, ovchinnikova, timofeev, zasukhina, remizov, panova, dyuzhev, selezneva] = empIds;

    // ── Отсутствия ─────────────────────────────────────────
    insert(db, 'absences', { employee_id: litvinova, absence_type: 'отпуск', date_from: d(-4), date_to: d(6), note: 'Ежегодный отпуск' }); // красные флаги по её мониторингам
    insert(db, 'absences', { employee_id: gromov, absence_type: 'командировка', date_from: d(1), date_to: d(5), note: 'Областной семинар, г. Саратов' });
    insert(db, 'absences', { employee_id: dyuzhev, absence_type: 'больничный', date_from: d(-2), date_to: d(3), note: '' });
    insert(db, 'absences', { employee_id: ovchinnikova, absence_type: 'отпуск', date_from: d(10), date_to: d(16), note: 'Ежегодный отпуск — вернётся через 16 дней' });
    insert(db, 'absences', { employee_id: panova, absence_type: 'отпуск', date_from: d(4), date_to: d(6), note: 'Краткосрочный' }); // скоро возвращается

    // ── Мониторинги ────────────────────────────────────────
    const typeId = { mon: 1, letter: 2, table: 3 };
    interface MonSeed { name: string; t: number; emp: number; dl: string | null; st: string; deputy?: number; dFrom?: string; dTo?: string }
    const mons: MonSeed[] = [
      { name: 'Гидрологическая обстановка на реках области', t: typeId.mon, emp: gromov, dl: d(2), st: 'в работе' },
      { name: 'Осадки по метеостанциям (суточная таблица)', t: typeId.table, emp: gromov, dl: d(0), st: 'в работе' },
      { name: 'Лесопожарная обстановка (ежедневный доклад)', t: typeId.mon, emp: litvinova, dl: d(0), st: 'в работе' }, // исполнитель в отпуске, дублёра нет → красный флаг
      { name: 'Мониторинг гибели людей на воде (ГИМС)', t: typeId.mon, emp: litvinova, dl: d(5), st: 'в работе', deputy: dyuzhev, dFrom: d(-4), dTo: d(6) }, // есть дублёр
      { name: 'Дорожная обстановка на федеральных трассах', t: typeId.mon, emp: timofeev, dl: d(1), st: 'в работе' },
      { name: 'Работа ЕДДС: заявки за сутки', t: typeId.table, emp: kabanov, dl: null, st: 'в работе' },
      { name: 'Письмо Министру: готовление сил и средств', t: typeId.letter, emp: ovchinnikova, dl: d(7), st: 'в работе' },
      { name: 'Сводка по ЧС региона (утренняя)', t: typeId.table, emp: vetrova, dl: d(0), st: 'в работе' },
      { name: 'Мониторинг ледовой обстановки', t: typeId.mon, emp: litvinova, dl: d(3), st: 'приостановлено', deputy: gromov, dFrom: d(-4), dTo: d(6) }, // дублёр, но приостановлен
      { name: 'Учёт пунктов временной размещения', t: typeId.mon, emp: timofeev, dl: null, st: 'выполнено' },
    ];
    const monIds: number[] = [];
    for (const m of mons) {
      monIds.push(
        insert(db, 'monitorings', {
          name: m.name, type_id: m.t, employee_id: m.emp, deadline: m.dl, note: '', status: m.st,
          deputy_employee_id: m.deputy ?? null, deputy_from: m.dFrom ?? null, deputy_to: m.dTo ?? null, created_at: ts, updated_at: ts,
        })
      );
    }

    // ── Документы ЭДО ──────────────────────────────────────
    interface EdoSeed {
      num: string; sum: string; instr: string; resp: number; ct: 'red' | 'green'; dl: string | null;
      off?: boolean; appr?: '' | 'на согласовании' | 'на подписи' | 'подписан'; sub?: string; work: Array<[number, string]>;
    }
    const edos: EdoSeed[] = [
      { num: 'ИСХ-145', sum: 'О подготовке к паводкоопасному периоду', instr: 'Подготовить расчёт сил и средств доклада, направить в ГУ', resp: vetrova, ct: 'red', dl: d(-3), appr: 'на подписи', work: [[-5, 'Запрошены расчёты у отделов'], [-2, 'Свод расчётов направлен начальнику управления']] },
      { num: 'ВХ-2031', sum: 'Письмо МЧС России: форма ФС-9', instr: 'Заполнить форму и вернуть до срока', resp: panova, ct: 'red', dl: d(1), appr: 'на согласовании', sub: 'Исполнитель — Ремизов А.В.', work: [[-1, 'Форма предзаполнена, передана на сверку']] },
      { num: 'ИСХ-148', sum: 'Доклад в администрацию области', instr: 'Согласовать текст с начальником управления', resp: kabanov, ct: 'green', dl: d(0), appr: 'на согласовании', work: [[0, 'Текст доклада на согласовании у С.И. Соколова']] },
      { num: 'ВХ-2044', sum: 'Уточнённый план мероприятий КЧС', instr: 'Проверить позиции отдела, замечания — письмом', resp: gromov, ct: 'green', dl: d(4), appr: '', work: [[-1, 'Позиции отдела сверены, замечаний нет']] },
      { num: 'ИСХ-151', sum: 'Ответ на обращение гражданина', instr: 'Подготовить ответ в установленный срок', resp: zasukhina, ct: 'green', dl: d(2), appr: 'подписан', work: [[0, 'Ответ подписан, направлен заявителю']] },
      { num: 'ВХ-2050', sum: 'Запрос данных по материальным резервам', instr: 'Предоставить выписку из реестра', resp: remizov, ct: 'red', dl: d(-1), appr: '', work: [[-2, 'Запросили выписку в секторе МТО']] },
      { num: 'ИСХ-153', sum: 'Информация о прохождении ОД на неделе', instr: 'Еженедельная сводка по дежурству', resp: timofeev, ct: 'green', dl: d(3), appr: 'на согласовании', work: [[1, 'Сводка собрана, ждёт подписания']] },
      { num: 'ВХ-2057', sum: 'Методические рекомендации по учёту', instr: 'Ознакомить личный состав', resp: ovchinnikova, ct: 'green', dl: null, appr: 'подписан', work: [[-6, 'Разослано по подразделениям']] },
      { num: 'ИСХ-155', sum: 'Сведения о привлечении техники', instr: 'Свести данные по подразделениям', resp: dyuzhev, ct: 'green', dl: d(6), off: true, appr: '', work: [[-3, 'Сведены, снят с контроля как неактуальный']] },
      { num: 'ВХ-2061', sum: 'План проверки систем оповещения', instr: 'Согласовать даты с главами муниципалитетов', resp: vetrova, ct: 'red', dl: d(0), appr: 'на согласовании', work: [[-1, 'Черновик графика направлен на согласование']] },
      { num: 'ИСХ-158', sum: 'Ходатайство о поощрении сотрудников', instr: 'Подготовить списки к награждению', resp: zasukhina, ct: 'green', dl: d(10), appr: '', work: [[2, 'Списки собраны, готовятся проекты приказов']] },
    ];
    for (const doc of edos) {
      const id = insert(db, 'edo_documents', {
        doc_number: doc.num, doc_url: '', summary: doc.sum, instruction: doc.instr, responsible_id: doc.resp,
        participants: '', control_type: doc.ct, deadline: doc.dl, off_control: doc.off ? 1 : 0,
        off_control_date: doc.off ? d(-1) : null, sub_resolution: doc.sub ?? '', approval_number: doc.appr ? `ЛС-${Math.floor(Math.random() * 900 + 100)}` : '',
        approval_url: '', approval_status: doc.appr ?? '', archived: 0, created_at: ts, updated_at: ts,
      });
      for (const [off, text] of doc.work) {
        insert(db, 'work_log', { entity_type: 'edo', entity_id: id, log_date: d(off), text, created_at: ts });
      }
    }

    // ── Задачи ─────────────────────────────────────────────
    interface TaskSeed {
      theme: string; title: string; pr: 'срочно' | 'высокий' | 'обычный' | 'низкий'; dl: string | null;
      st: 'входящая' | 'в работе' | 'ожидание' | 'на проверке' | 'выполнено' | 'отменено'; wait?: string;
      next?: string; parts?: string; items: Array<[string, boolean]>; logs: Array<[number, string]>; updDaysAgo?: number;
    }
    const tasks: TaskSeed[] = [
      { theme: 'Паводок', title: 'Скорректировать схему эвакуации мкр. Заречный', pr: 'срочно', dl: d(1), st: 'в работе', next: 'Позвонить в администрацию, уточнить число жителей', parts: 'Ветрова А.С., Громов П.А.', items: [['Запросить актуальные данные населения', true], ['Сверить точки сбора', false], ['Отрисовать схему', false]], logs: [[-1, 'Данные населения получены, схемы правлю']], updDaysAgo: 1 },
      { theme: 'Документооборот', title: 'Подготовить отчёт по исполнению за октябрь', pr: 'высокий', dl: d(3), st: 'в работе', next: 'Собрать остатки у секторов', items: [['Выгрузить реестр', true], ['Посчитать показатели', true], ['Оформить титульный лист', false]], logs: [[-2, 'Реестр выгружен']], updDaysAgo: 12 }, // давно без обновлений → оранжевая метка
      { theme: 'Материальное обеспечение', title: 'Заказ комплектов СИЗ на зиму', pr: 'обычный', dl: d(9), st: 'ожидание', wait: d(0), items: [['Собрать заявки подразделений', true], ['Сформировать спецификацию', false]], logs: [] },
      { theme: 'Учения', title: 'Сценарий КШУ по ликвидации условного ЧС', pr: 'высокий', dl: d(14), st: 'ожидание', wait: d(12), next: 'Вернуться после командировки Ветровой', items: [['Черновик легенды', true], ['Календарный план', false]], logs: [[-4, 'Легенда набросана']] },
      { theme: 'Проверки', title: 'Ответ на предписание прокуратуры', pr: 'срочно', dl: d(-2), st: 'на проверке', next: 'Передать подписанный пакет в канцелярию', items: [['Подготовить пояснения', true], ['Приложить приказы', true], ['Распечатать и подписать', true]], logs: [[-1, 'Пакет на подписи у начальника управления']] },
      { theme: 'Автотранспорт', title: 'Замена шин служебных машин', pr: 'низкий', dl: null, st: 'входящая', items: [], logs: [] },
      { theme: 'Обучение', title: 'Организовать стажировку молодых специалистов', pr: 'обычный', dl: d(20), st: 'входящая', parts: 'Кабанов Д.Ю., Тимофеев Н.Р.', items: [['Списать список желающих', false], ['Согласовать наставников', false]], logs: [] },
      { theme: 'Отчётность', title: 'Форма 1-ЧС за квартал', pr: 'высокий', dl: d(-6), st: 'выполнено', items: [['Заполнить', true], ['Проверить', true]], logs: [[-8, 'Отправлена в регион'], [-7, 'Принята без замечаний']] },
      { theme: 'Хозвопросы', title: 'Ремонт кондиционера в комнате ОП', pr: 'низкий', dl: null, st: 'отменено', items: [], logs: [[-10, 'Отменена: выделен бюджет на замену оборудования']] },
      { theme: 'Связь', title: 'Проверка резервных каналов связи', pr: 'обычный', dl: d(5), st: 'в работе', next: 'Согласовать время проверки с узлом связи', items: [['График проверки', true], ['Прогон спутникового канала', false], ['Прогон коротковолнового', false]], logs: [[-3, 'График утверждён']], updDaysAgo: 3 },
    ];
    for (const t of tasks) {
      const created = d(t.logs.length ? Math.min(...t.logs.map((l) => l[0])) : -4);
      const upd = t.updDaysAgo != null ? shiftIso(today, -t.updDaysAgo) + ' 09:00:00' : ts;
      const id = insert(db, 'tasks', {
        theme: t.theme, title: t.title, priority: t.pr, deadline: t.dl, status: t.st, wait_until: t.wait ?? null,
        next_action: t.next ?? '', participants: t.parts ?? '', note: '', archived: t.st === 'выполнено' || t.st === 'отменено' ? 1 : 0,
        created_at: created + ' 09:00:00', updated_at: upd,
      });
      t.items.forEach(([title, done], idx) => {
        insert(db, 'task_check_items', { task_id: id, title, done: done ? 1 : 0, sort_order: idx + 1 });
      });
      for (const [off, text] of t.logs) {
        insert(db, 'work_log', { entity_type: 'task', entity_id: id, log_date: d(off), text, created_at: ts });
      }
    }

    // ── Уволенный сотрудник (для демонстрации статуса) ────
    insert(db, 'employees', {
      full_name: 'Крапивин Сергей Львович', department_id: o2, position: 'Ведущий специалист', internal_phone: '4125',
      mobile_phone: '', email: '', birthday: '1980-06-02', functions: 'Наружное наблюдение', is_fired: 1, fired_date: d(-30),
      archived: 0, created_at: ts, updated_at: ts,
    });
    void dir; void vetrova; void gromov; void litvinova; void kabanov; void ovchinnikova; void timofeev; void zasukhina; void remizov; void panova; void dyuzhev; void selezneva;
    void monIds;
  })();
}
