const Database = require('better-sqlite3');
const db = new Database('.smoke/test.db', { readonly: true });
const sqlBase = `SELECT t.*,
  (SELECT COUNT(*) FROM task_check_items c WHERE c.task_id=t.id) AS check_total,
  (SELECT COUNT(*) FROM task_check_items c WHERE c.task_id=t.id AND c.done=1) AS check_done,
  (SELECT MAX(created_at) FROM task_check_items c WHERE c.task_id=t.id) AS last_check_change
 FROM tasks t`;
const where = "WHERE archived = 0 AND status NOT IN ('выполнено', 'отменено')";
const order = `ORDER BY CASE t.priority WHEN 'срочно' THEN 0 WHEN 'высокий' THEN 1 WHEN 'обычный' THEN 2 ELSE 3 END, t.deadline IS NULL, t.deadline ASC, t.updated_at DESC`;
console.log('no-arg:', db.prepare(sqlBase + ' ' + where + ' ' + order).all().length);
console.log('empty obj:', db.prepare(sqlBase + ' ' + where + ' ' + order).all({}).length);
// wakeUpExpired имитация
console.log('wake match count:', db.prepare(`SELECT COUNT(*) c FROM tasks WHERE status='ожидание' AND wait_until IS NOT NULL AND wait_until <= ? AND archived=0`).get('2026-11-01').c);
