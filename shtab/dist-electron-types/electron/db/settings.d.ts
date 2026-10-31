import { type AppSettings } from '../../shared/types';
import type { Db } from './database';
export declare function getSettings(db: Db): AppSettings;
export declare function updateSettings(db: Db, patch: Partial<AppSettings>): AppSettings;
/**
 * Резервная копия БД. Мелкий баг предыдущей версии: backup() — асинхронный,
 * а source.close() вызывался сразу же, до записи файла; ротация тоже считала
 * mtime несуществующего файла. Теперь функция возвращает Promise, который
 * резолвится после фактической записи копии; вызывающий код обязан её ждать.
 */
export declare function backupNow(dbPath: string, backupsDir: string): Promise<string>;
