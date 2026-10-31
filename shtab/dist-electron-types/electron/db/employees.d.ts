import type { Db } from './database';
import type { Absence, AbsenceType, AbsenceView, Department, DepartmentWithCount, Employee, EmployeeComputedStatus, EmployeeView } from '../../shared/types';
import type { EmployeeInput } from '../../shared/ipc';
interface AbsenceRow {
    id: number;
    employee_id: number;
    absence_type: AbsenceType;
    date_from: string;
    date_to: string;
    note: string;
    employee_name?: string;
}
export declare class EmployeeRepo {
    private db;
    constructor(db: Db);
    /** Статус: уволен → отсутствует сегодня (по absences) → на работе. */
    computeStatus(emp: Employee, absences: AbsenceRow[], today: string): EmployeeComputedStatus;
    private allAbsences;
    list(includeArchived: boolean): EmployeeView[];
    get(id: number): EmployeeView | null;
    create(input: EmployeeInput): Employee;
    update(id: number, input: Partial<EmployeeInput>): Employee;
    setArchived(id: number, archived: boolean): void;
    byId(id: number): Employee;
    listAbsences(opts: {
        employeeId?: number;
        fromDate?: string;
        toDate?: string;
    }): AbsenceView[];
    createAbsence(input: Omit<Absence, 'id'>): Absence;
    updateAbsence(id: number, input: Partial<Omit<Absence, 'id'>>): Absence;
    deleteAbsence(id: number): void;
    listDepartments(): DepartmentWithCount[];
    createDepartment(input: {
        name: string;
        parent_id: number | null;
        sort_order: number;
    }): Department;
    updateDepartment(id: number, input: Partial<Pick<Department, 'name' | 'parent_id' | 'sort_order'>>): Department;
    deleteDepartment(id: number): void;
}
export {};
