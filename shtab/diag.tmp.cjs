const Database = require('better-sqlite3');
const fs = require('fs');
// найти smoke базу
const cand = ['.smoke/test.db'];
let p = cand.find((c) => fs.existsSync(c));
if (!p) { console.log(fs.readdirSync('.smoke')); process.exit(1); }
const db = new Database(p, { readonly: true });
console.log('file:', p);
console.log('total tasks:', db.prepare('SELECT COUNT(*) c FROM tasks').get().c);
for (const r of db.prepare('SELECT id, theme, status, archived, wait_until, updated_at FROM tasks ORDER BY id').all()) {
  console.log(r.id, JSON.stringify(r.status), 'archived=' + r.archived, 'wait=' + r.wait_until, r.updated_at.slice(0,10));
}
