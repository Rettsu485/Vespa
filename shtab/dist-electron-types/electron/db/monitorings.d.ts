import type { Db } from './database';
import type { Monitoring, MonitoringView, TaskType } from '../../shared/types';
import type { MonitoringInput, MonitoringListOpts } from '../../shared/ipc';
export declare class TaskTypeRepo {
    private db;
    constructor(db: Db);
    list(): TaskType[];
    create(name: string): TaskType;
    update(id: number, input: Partial<Pick<TaskType, 'name' | 'active'>>): TaskType;
    /** Удаление блокируется, если тип используется в мониторингах. */
    remove(id: number): void;
    reorder(orderedIds: number[]): void;
}
export declare class MonitoringRepo {
    private db;
    constructor(db: Db);
    private baseSql;
    list(opts: MonitoringListOpts): MonitoringView[];
    get(id: number): MonitoringView | null;
    /** Для карточки сотрудника: все мониторинги, где он исполнитель или дублёр. */
    byEmployee(employeeId: number): MonitoringView[];
    private toView;
    create(input: MonitoringInput): Monitoring;
    update(id: number, input: Partial<MonitoringInput>): Monitoring;
    archive(id: number): void;
    private byId;
}
