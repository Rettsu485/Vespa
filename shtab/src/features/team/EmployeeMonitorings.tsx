// Раскрывающийся блок «Мониторинги и задачи» в карточке сотрудника (по ТЗ 5.1):
// мониторинг-карточки, где сотрудник — исполнитель или дублёр, + задачи, где он упомянут в участниках.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { Badge, Spinner } from '@/components/ui';
import { DeadlineBadge, monitoringStatusTone, taskPriorityTone } from '@/components/badges';
import { ChevronDown, ChevronRight, Flag } from 'lucide-react';

export function MonitoringMiniList({ employeeId }: { employeeId: number }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { data: monitorings, loading } = useAsync(() => api.monitorings.list({ employeeId, includeArchived: false }), [employeeId]);
  const { data: employee } = useAsync(() => api.employees.get(employeeId), [employeeId]);
  // Задачи ведутся с текстовым списком участников — ищем упоминание ФИО подстрокой (простое решение по ТЗ).
  const { data: tasks } = useAsync(() => api.tasks.list({ includeArchived: false }), []);

  const relatedTasks = (tasks ?? []).filter((t) => {
    const name = employee?.full_name ?? '';
    if (!name) return false;
    const surname = name.split(' ')[0];
    return t.participants.toLowerCase().includes(name.toLowerCase()) || (!!surname && t.participants.toLowerCase().includes(surname.toLowerCase()));
  });

  const total = (monitorings ?? []).length + relatedTasks.length;

  return (
    <div className="rounded-lg border">
      <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-accent/50" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        Мониторинги и задачи
        <span className="text-xs text-muted-foreground">({total})</span>
      </button>
      {open ? (
        <div className="border-t px-4 py-3">
          {loading ? <Spinner /> : null}
          {!loading && total === 0 ? <div className="text-sm text-muted-foreground">Мониторингов и задач нет.</div> : null}
          <div className="grid gap-1.5">
            {(monitorings ?? []).map((m) => (
              <button
                key={`m${m.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-fast hover:bg-accent/60"
                onClick={() => navigate(`/monitorings?monitoring=${m.id}`)}
              >
                {m.red_flag ? <Flag className="h-3.5 w-3.5 shrink-0 text-red-500" /> : null}
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <Badge tone="neutral">{m.type_name}</Badge>
                <Badge tone={monitoringStatusTone(m.status)}>{m.status}</Badge>
                <DeadlineBadge daysLeft={m.deadline ? deadlineDays(m.deadline) : null} />
                {m.deputy_name ? <Badge tone="violet">дублёр: {m.deputy_name}</Badge> : null}
              </button>
            ))}
            {relatedTasks.map((t) => (
              <button
                key={`t${t.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-fast hover:bg-accent/60"
                onClick={() => navigate(`/tasks?task=${t.id}`)}
              >
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <Badge tone={taskPriorityTone(t.priority)}>{t.priority}</Badge>
                <DeadlineBadge daysLeft={t.days_left} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Вычисление «осталось дней» на клиенте для мини-списка (в MonitoringView этого поля нет —
// простое решение: считаем из deadline локально).
function deadlineDays(deadlineIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${deadlineIso}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
