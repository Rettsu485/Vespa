import { type BadgeTone } from '@/components/ui';
import type { EmployeeComputedStatus, MonitoringStatus, TaskPriority, TaskStatus, ApprovalStatus } from '@shared/types';
export declare function StatusDot({ status }: {
    status: EmployeeComputedStatus;
}): import("react").JSX.Element;
export declare function employeeStatusLabel(status: EmployeeComputedStatus): string;
export declare function DeadlineBadge({ daysLeft, offControl }: {
    daysLeft: number | null;
    offControl?: boolean;
}): import("react").JSX.Element;
export declare function monitoringStatusTone(s: MonitoringStatus): BadgeTone;
export declare function taskPriorityTone(p: TaskPriority): BadgeTone;
export declare function taskStatusTone(s: TaskStatus): BadgeTone;
export declare function approvalStatusTone(s: ApprovalStatus | ''): BadgeTone;
