// Хранилище настроек (ключ-значение, JSON) + сервис бэкапов SQLite с ротацией.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/types';
import type { Db } from './database';

const SETTINGS_KEY = 'app';

export function getSettings(db: Db): AppSettings {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(SETTINGS_KEY) as
    | { value: string }
    | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    const parsed: unknown = JSON.parse(row.value);
    return { ...DEFAULT_SETTINGS, ...(isRecord(parsed) ? parsed : {}) } as AppSettings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function updateSettings(db: Db, patch: Partial<AppSettings>): AppSettings {
  const merged = { ...getSettings(db), ...patch };
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
  ).run(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Ротация: храним последние N резервных копий. */
const BACKUP_KEEP = 30;

export function backupNow(dbPath: string, backupsDir: string): string {
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(backupsDir, `shtab-${stamp}.db`);
  // «холодная» консистентная копия через backup API better-sqlite3.
  const source = new Database(dbPath, { readonly: true });
  try {
    source.backup(target).then(() => undefined, (e) => console.error('backup failed:', e));
  } finally {
    source.close();
  }
  rotateBackups(backupsDir, BACKUP_KEEP);
  return target;
}

function rotateBackups(dir: string, keep: number): void {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('shtab-') && f.endsWith('.db'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  files.slice(keep).forEach((x) => fs.unlinkSync(path.join(dir, x.f)));
}
