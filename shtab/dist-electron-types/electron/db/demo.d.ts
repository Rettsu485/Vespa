import type { Db } from './database';
export declare function clearAllData(db: Db): void;
/** Заполняет БД реалистичными примерами. Предварительно очищает данные. */
export declare function loadDemoData(db: Db): void;
