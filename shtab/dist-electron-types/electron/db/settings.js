// Хранилище настроек (ключ-значение, JSON) + сервис бэкапов SQLite с ротацией.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS } from '../../shared/types';
const SETTINGS_KEY = 'app';
export function getSettings(db) {
    const row = db.prepare('SELECT value FROM settings WHERE key=?').get(SETTINGS_KEY);
    if (!row)
        return { ...DEFAULT_SETTINGS };
    try {
        const parsed = JSON.parse(row.value);
        return { ...DEFAULT_SETTINGS, ...(isRecord(parsed) ? parsed : {}) };
    }
    catch {
        return { ...DEFAULT_SETTINGS };
    }
}
export function updateSettings(db, patch) {
    const merged = { ...getSettings(db), ...patch };
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
}
function isRecord(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
/** Ротация: храним последние N резервных копий. */
const BACKUP_KEEP = 30;
/**
 * Резервная копия БД. Мелкий баг предыдущей версии: backup() — асинхронный,
 * а source.close() вызывался сразу же, до записи файла; ротация тоже считала
 * mtime несуществующего файла. Теперь функция возвращает Promise, который
 * резолвится после фактической записи копии; вызывающий код обязан её ждать.
 */
export async function backupNow(dbPath, backupsDir) {
    fs.mkdirSync(backupsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(backupsDir, `shtab-${stamp}.db`);
    // Консистентная «горячая» копия через backup API better-sqlite3 (WAL-safe).
    const source = new Database(dbPath, { readonly: true });
    try {
        await source.backup(target);
    }
    finally {
        source.close();
    }
    rotateBackups(backupsDir, BACKUP_KEEP);
    return target;
}
function rotateBackups(dir, keep) {
    const files = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith('shtab-') && f.endsWith('.db'))
        .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
    files.slice(keep).forEach((x) => fs.unlinkSync(path.join(dir, x.f)));
}
