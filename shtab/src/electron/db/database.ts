// Подключение к SQLite (better-sqlite3, WAL) + выполнение миграций по версии схемы.

import type Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { migrations } from './migrations';

// better-sqlite3 — нативный модуль, помеченный как external при сборке esbuild-ом.
// Грузим его через createRequire: это работает независимо от ESM/CJS-окружения Electron
// и не требует флага --experimental-require-module.
const requireNative = createRequire(__filename);
const SqliteDatabase = requireNative('better-sqlite3') as typeof Database;

export type Db = Database.Database;

/**
 * Типизированная обёртка над better-sqlite3: prepare<T> возвращает statements
 * с типизированными строками результата (в v12 дженерик у prepare недоступен,
 * приведение изолировано здесь — в репозиториях остаётся только .all()/.get()).
 */
export interface PreparedStmt<T> {
  all(...params: unknown[]): T[];
  get(...params: unknown[]): T | undefined;
  run(...params: unknown[]): Database.RunResult;
}

export interface TypedDb {
  prepare<T>(sql: string): PreparedStmt<T>;
  exec(sql: string): void;
  pragma(sql: string, options?: { simple?: boolean }): unknown;
  transaction<F extends (...args: never[]) => unknown>(fn: F): F;
}

export function typed(db: Db): TypedDb {
  return db as unknown as TypedDb;
}

let dbInstance: Db | null = null;
let dbFilePath = '';

export function getDbFile(): string {
  return dbFilePath;
}

export function initDatabase(userDataDir: string): Db {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(userDataDir, { recursive: true });
  dbFilePath = path.join(userDataDir, 'shtab.sqlite');
  dbInstance = new SqliteDatabase(dbFilePath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  runMigrations(dbInstance);
  return dbInstance;
}

function runMigrations(db: Db): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (const m of migrations) {
    if (m.version > current) {
      db.transaction(() => {
        db.exec(m.sql);
        db.pragma(`user_version = ${m.version}`);
      })();
    }
  }
}

/** Путь к папке резервных копий внутри userData. */
export function getBackupDir(userDataDir: string): string {
  return path.join(userDataDir, 'backups');
}
