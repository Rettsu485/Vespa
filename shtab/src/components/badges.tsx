// Общие статусные бейджи и точки (используются во всех модулях).
import { Badge, type BadgeTone } from '@/components/ui';
import { relativeDeadlineLabel } from '@/lib/dates';
import type { EmployeeComputedStatus, MonitoringStatus, TaskPriority, TaskStatus, ApprovalStatus } from '@shared/types';

export function StatusDot({ status }: { status: EmployeeComputedStatus }) {
  const color =
    status.kind === 'fired'
      ? 'bg-gray-400'
      : status.kind === 'at_work'
        ? 'bg-emerald-500'
        : status.absence_type === 'отпуск'
          ? 'bg-blue-500'
          : status.absence_type === 'командировка'
            ? 'bg-violet-500'
            : status.absence_type === 'больничный'
              ? 'bg-orange-500'
              : 'bg-yellow-500';
  const title =
    status.kind === 'fired' ? 'Уволен' : status.kind === 'at_work' ? 'На работе' : `Не на месте: ${status.absence_type}`;
  return <span title={title} className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />;
}

export function employeeStatusLabel(status: EmployeeComputedStatus): string {
  if (status.kind === 'fired') return 'Уволен';
  if (status.kind === 'at_work') return 'На работе';
  switch (status.absence_type) {
    case 'отпуск':
      return 'В отпуске';
    case 'командировка':
      return 'В командировке';
    case 'больничный':
      return 'На больничном';
    default:
      return 'Отсутствует';
  }
}

export function DeadlineBadge({ daysLeft, offControl }: { daysLeft: number | null; offControl?: boolean }) {
  if (offControl) return <Badge tone="gray">Снят с контроля</Badge>;
  if (daysLeft === null) return <span className="text-xs text-muted-foreground">без срока</span>;
  const tone: BadgeTone = daysLeft < 0 ? 'red' : daysLeft <= 3 ? 'orange' : 'neutral';
  return <Badge tone={tone}>{relativeDeadlineLabel(daysLeft)}</Badge>;
}

export function monitoringStatusTone(s: MonitoringStatus): BadgeTone {
  switch (s) {
    case 'в работе':
      return 'blue';
    case 'приостановлено':
      return 'orange';
    case 'выполнено':
      return 'green';
    default:
      return 'gray';
  }
}

export function taskPriorityTone(p: TaskPriority): BadgeTone {
  switch (p) {
    case 'срочно':
      return 'red';
    case 'высокий':
      return 'orange';
    case 'обычный':
      return 'blue';
    default:
      return 'gray';
  }
}

export function taskStatusTone(s: TaskStatus): BadgeTone {
  switch (s) {
    case 'входящая':
      return 'neutral';
    case 'в работе':
      return 'blue';
    case 'ожидание':
      return 'violet';
    case 'на проверке':
      return 'orange';
    case 'выполнено':
      return 'green';
    default:
      return 'gray';
  }
}

export function approvalStatusTone(s: ApprovalStatus | ''): BadgeTone {
  switch (s) {
    case 'на согласовании':
      return 'orange';
    case 'на подписи':
      return 'blue';
    case 'подписан':
      return 'green';
    default:
      return 'gray';
  }
}
