// Подключение к SQLite (better-sqlite3), WAL-режим, миграции по версии схемы.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type Db = Database.Database;

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/** Простые SQL-миграции, выполняемые по версии схемы (user_version). */
export function runMigrations(db: Db): void {
  const version = db.pragma('user_version', { simple: true }) as number;
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^v\d+.*\.sql$/.test(f))
    .sort();

  files.forEach((file, idx) => {
    const targetVersion = idx + 1;
    if (version >= targetVersion) return;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${targetVersion}`);
    })();
  });
}

export function openDatabase(dbPath: string): Db {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}
