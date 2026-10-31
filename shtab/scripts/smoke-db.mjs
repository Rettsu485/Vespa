// Смоук-тест слоя БД без Electron: миграции + демо-данные + дашборд + поиск.
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const tmpDir = path.join(root, '.smoke');
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
fs.cpSync(path.join(root, 'electron/migrations'), path.join(tmpDir, 'migrations'), { recursive: true });

await build({
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['better-sqlite3'],
  outfile: path.join(tmpDir, 'smoke.cjs'),
  stdin: {
    contents: `
      export { openDatabase } from '${root}/electron/db/database';
      export { loadDemoData } from '${root}/electron/db/demo';
      export { buildDashboard, globalSearch } from '${root}/electron/db/dashboard';
      export { backupNow } from '${root}/electron/db/settings';
      export * as Emp from '${root}/electron/db/employees';
      export * as Mon from '${root}/electron/db/monitorings';
      export * as Docs from '${root}/electron/db/documents_tasks';
    `,
    resolveDir: root,
    loader: 'ts',
  },
});

const require = createRequire(import.meta.url);
const m = require(path.join(tmpDir, 'smoke.cjs'));

const dbPath = path.join(tmpDir, 'test.db');
const db = m.openDatabase(dbPath);
console.log('OK: migrations applied, user_version =', db.pragma('user_version', { simple: true }));

m.loadDemoData(db);
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
for (const t of ['departments','employees','absences','task_types','monitorings','edo_documents','work_log','tasks','task_check_items']) {
  const c = count(t);
  console.log(`table ${t}: ${c} rows`);
  if (c === 0) throw new Error(`demo data empty for ${t}`);
}

const dash = m.buildDashboard(db);
console.log('dashboard counters:', JSON.stringify(dash.counters));
console.log('overdue_edo:', dash.overdue_edo.length, '| due_today:', dash.due_today_edo.length,
  '| due_next3:', dash.due_next3_edo.length, '| red_flags:', dash.monitoring_red_flags.length,
  '| birthdays:', dash.upcoming_birthdays.length, '| returning:', dash.returning_from_absence.length,
  '| returned_tasks:', dash.returned_tasks.length);

const sr = m.globalSearch(db, 'а');
console.log('search "а":', sr.employees.length, sr.monitorings.length, sr.documents.length, sr.tasks.length);

const emps = new m.Emp.EmployeeRepo(db).list({ showArchived: false });
console.log('employees list:', emps.length, '| first status:', JSON.stringify(emps[0].status), '| days_to_birthday:', emps[0].days_to_birthday);

const docs = new m.Docs.EdoRepo(db).list({});
console.log('edo list:', docs.length, '| first days_left:', docs[0].days_left, '| link:', docs[0].doc_link ?? '(none)');

const tasks = new m.Docs.TaskRepo(db).list({});
const allTasks = new m.Docs.TaskRepo(db).list({ includeArchived: true, includeDone: true });
console.log('tasks visible:', tasks.length, '| statuses:', [...new Set(tasks.map((t) => t.status))].join(', '));
console.log('tasks archived total (soft-delete + выполнено/отменено):', allTasks.length);
if (!(tasks.length >= 8 && tasks.length <= 9)) throw new Error(`Ожидались 8–9 видимых задач, получено ${tasks.length}`);
if (allTasks.length !== 10) throw new Error(`Ожидались 10 задач всего, получено ${allTasks.length}`);

const mon = new m.Mon.MonitoringRepo(db).list({});
console.log('monitorings:', mon.length, '| with deputy:', mon.filter((x) => x.deputy_employee_id).length, '| red flags:', mon.filter((x) => x.red_flag).length);

const backupFile = await m.backupNow(dbPath, path.join(tmpDir, 'backups'));
console.log('backup created:', path.basename(backupFile), '| exists on disk:', fs.existsSync(backupFile));
console.log('SMOKE OK');
db.close();
