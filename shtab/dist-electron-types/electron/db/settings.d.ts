import { type AppSettings } from '../../shared/types';
import type { Db } from './database';
export declare function getSettings(db: Db): AppSettings;
export declare function updateSettings(db: Db, patch: Partial<AppSettings>): AppSettings;
export declare function backupNow(dbPath: string, backupsDir: string): string;
