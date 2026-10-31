// Настройки: пара ключ–значение (JSON) в таблице settings.

import { typed, type TypedDb } from '../db/database';
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/types';

const SETTINGS_KEY = 'app';

export class SettingsService {
  constructor(private db: TypedDb) {}

  get(): AppSettings {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(SETTINGS_KEY);
    if (!row) return { ...DEFAULT_SETTINGS };
    try {
      const parsed: unknown = JSON.parse(row.value);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_SETTINGS, ...(parsed as Partial<AppSettings>) };
      }
    } catch {
      /* повреждённое значение — возвращаем дефолт */
    }
    return { ...DEFAULT_SETTINGS };
  }

  set(patch: Partial<AppSettings>): AppSettings {
    const next: AppSettings = { ...this.get(), ...patch };
    this.db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }
}
