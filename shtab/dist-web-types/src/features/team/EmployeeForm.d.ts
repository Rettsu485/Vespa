import type { EmployeeView } from '@shared/types';
export declare function EmployeeForm({ open, employee, onClose, onSaved, }: {
    open: boolean;
    employee: EmployeeView | null;
    onClose: () => void;
    onSaved: () => void;
}): import("react").JSX.Element;
