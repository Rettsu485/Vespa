import type { Db } from './database';
import type { EdoDocument, EdoDocumentView, Task, TaskCheckItem, TaskView, WorkLogEntity, WorkLogEntry } from '../../shared/types';
import type { EdoInput, EdoListOpts, TaskInput, TaskListOpts } from '../../shared/ipc';
export declare class EdoRepo {
    private db;
    constructor(db: Db);
    list(opts: EdoListOpts): EdoDocumentView[];
    get(id: number): EdoDocumentView | null;
    private toView;
    create(input: EdoInput): EdoDocument;
    update(id: number, input: Partial<EdoInput>): EdoDocument;
    /** Снятие с контроля: off_control + дата автоматически. */
    setOffControl(id: number, off: boolean): void;
    archive(id: number): void;
    private byId;
}
/**
 * Достройка ссылки на документ: если в настройках задан шаблон с плейсхолдером {номер} —
 * ссылка строится из номера автоматически; иначе используется doc_url.
 * Вызывается на уровне IPC, куда передаётся актуальный шаблон из настроек.
 */
export declare function applyDocLink(view: EdoDocumentView, template: string): EdoDocumentView;
export declare class WorkLogRepo {
    private db;
    constructor(db: Db);
    list(entityType: WorkLogEntity, entityId: number): WorkLogEntry[];
    create(input: Omit<WorkLogEntry, 'id' | 'created_at'>): WorkLogEntry;
    update(id: number, input: {
        log_date?: string;
        text?: string;
    }): WorkLogEntry;
    remove(id: number): void;
    lastActivity(entityType: WorkLogEntity, entityId: number): string | null;
}
export declare class TaskRepo {
    private db;
    constructor(db: Db);
    /** Автопробуждение: задачи «ожидание» с wait_until <= сегодня переводим в «в работе». */
    wakeUpExpired(): void;
    list(opts: TaskListOpts): TaskView[];
    get(id: number): TaskView | null;
    create(input: TaskInput): Task;
    update(id: number, input: Partial<TaskInput>): Task;
    archive(id: number): void;
    /** Возврат из мягкого архива (архивные видны только с флагом «Показывать архив»). */
    unarchive(id: number): void;
    private byId;
    listCheckItems(taskId: number): TaskCheckItem[];
    createCheckItem(taskId: number, title: string): TaskCheckItem;
    updateCheckItem(id: number, input: Partial<Pick<TaskCheckItem, 'title' | 'done'>>): TaskCheckItem;
    removeCheckItem(id: number): void;
}
