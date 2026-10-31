// Резервные копии SQLite-файла в userData/backups с ротацией (хранится последние 30).

import fs from 'node:fs';
import path from 'node:path';
import type { Db } from '../db/database';

const KEEP_BACKUPS = 30;

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Одна копия через backup API better-sqlite3. Возвращает путь к файлу. */
export function runBackup(db: Db, backupsDir: string): string {
  fs.mkdirSync(backupsDir, { recursive: true });
  const target = path.join(backupsDir, `shtab-${stamp()}.sqlite`);
  db.backup(target);
  rotate(backupsDir);
  return target;
}

/** Ротация: оставляем только N последних файлов по времени модификации. */
function rotate(backupsDir: string): void {
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith('shtab-') && f.endsWith('.sqlite'))
    .map((f) => ({ f, t: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const old of files.slice(KEEP_BACKUPS)) {
    try {
      fs.unlinkSync(path.join(backupsDir, old.f));
    } catch {
      /* файл мог быть уже удалён — не критично */
    }
  }
}
