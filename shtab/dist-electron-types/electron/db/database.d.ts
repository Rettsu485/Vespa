import Database from 'better-sqlite3';
export type Db = Database.Database;
/** Простые SQL-миграции, выполняемые по версии схемы (user_version). */
export declare function runMigrations(db: Db): void;
export declare function openDatabase(dbPath: string): Db;
