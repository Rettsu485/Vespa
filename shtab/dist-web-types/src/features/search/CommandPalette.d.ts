export declare function CommandPalette({ open, onClose, onOpenEmployee, onOpenMonitoring, onOpenDoc, onOpenTask, }: {
    open: boolean;
    onClose: () => void;
    onOpenEmployee: (id: number) => void;
    onOpenMonitoring: (id: number) => void;
    onOpenDoc: (id: number) => void;
    onOpenTask: (id: number) => void;
}): import("react").JSX.Element | null;
