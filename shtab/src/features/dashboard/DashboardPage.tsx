// Дашборд «Сегодня»: счётчики + блоки списков, каждый пункт кликабелен и открывает карточку.
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { Card, EmptyState, Spinner } from '@/components/ui';
import { DeadlineBadge, Badge } from '@/components/badges';
import { toDisplay, plural } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { AlertTriangle, CalendarClock, Flag, FileText, ListTodo, Users } from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => api.dashboard.get(), []);

  if (loading) return <Spinner />;
  if (error) return <EmptyState title="Не удалось загрузить дашборд" hint={error} />;
  if (!data) return null;

  const c = data.counters;
  const cards = [
    { label: 'Просрочено', value: c.overdue, tone: 'text-red-600 dark:text-red-400', icon: AlertTriangle },
    { label: 'Сегодня', value: c.today, tone: 'text-orange-600 dark:text-orange-400', icon: CalendarClock },
    { label: 'Ближайшие 3 дня', value: c.next3, tone: 'text-blue-600 dark:text-blue-400', icon: CalendarClock },
    { label: 'Вернулось из ожидания', value: c.returned, tone: 'text-violet-600 dark:text-violet-400', icon: ListTodo },
  ];

  const hasAnything =
    data.overdue_edo.length + data.due_today_edo.length + data.due_next3_edo.length +
    data.monitoring_red_flags.length + data.upcoming_birthdays.length +
    data.returning_from_absence.length + data.returned_tasks.length >
    0;

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Сегодня · {toDisplay(new Date().toISOString().slice(0, 10))}</h1>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <s.icon className={cn('h-5 w-5 shrink-0', s.tone)} />
            <div className="min-w-0">
              <div className={cn('text-2xl font-bold tabular-nums', s.tone)}>{s.value}</div>
              <div className="truncate text-xs text-muted-foreground">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {!hasAnything ? (
        <EmptyState
          title="Пока пусто — добавьте данные"
          hint="Загрузите демо-данные в Настройках или начните с раздела «Команда»."
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Section title="Горит по ЭДО" icon={<FileText className="h-4 w-4" />}>
          {[...data.overdue_edo, ...data.due_today_edo, ...data.due_next3_edo].length === 0 ? (
            <Quiet text="Ничего не горит 🎉" />
          ) : null}
          {data.overdue_edo.map((d) => (
            <Row key={`o${d.id}`} onClick={() => navigate(`/edo?doc=${d.id}`)} main={`${d.doc_number} — ${d.summary}`} right={<DeadlineBadge daysLeft={d.days_left} />} danger />
          ))}
          {data.due_today_edo.map((d) => (
            <Row key={`t${d.id}`} onClick={() => navigate(`/edo?doc=${d.id}`)} main={`${d.doc_number} — ${d.summary}`} right={<DeadlineBadge daysLeft={d.days_left} />} />
          ))}
          {data.due_next3_edo.map((d) => (
            <Row key={`n${d.id}`} onClick={() => navigate(`/edo?doc=${d.id}`)} main={`${d.doc_number} — ${d.summary}`} right={<DeadlineBadge daysLeft={d.days_left} />} />
          ))}
        </Section>

        <Section title="Мониторинги без дублёра при отсутствующем исполнителе" icon={<Flag className="h-4 w-4 text-red-500" />}>
          {data.monitoring_red_flags.length === 0 ? <Quiet text="Красных флагов нет" /> : null}
          {data.monitoring_red_flags.map((m) => (
            <Row
              key={m.id}
              onClick={() => navigate(`/monitorings?monitoring=${m.id}`)}
              main={m.name}
              sub={`${m.employee_name} отсутствует, дублёр не назначен`}
              right={<Badge tone="red">флаг</Badge>}
              danger
            />
          ))}
        </Section>

        <Section title="Ближайшие дни рождения" icon={<Users className="h-4 w-4" />}>
          {data.upcoming_birthdays.length === 0 ? <Quiet text="В ближайшие 3 дней нет" /> : null}
          {data.upcoming_birthdays.map((e) => (
            <Row
              key={e.id}
              onClick={() => navigate(`/team?employee=${e.id}`)}
              main={e.full_name}
              sub={toDisplay(e.birthday)}
              right={
                <Badge tone="orange">
                  🎂 {e.days_to_birthday === 0 ? 'сегодня' : `через ${e.days_to_birthday} ${plural(e.days_to_birthday ?? 1, 'день', 'дня', 'дней')}`}
                </Badge>
              }
            />
          ))}
        </Section>

        <Section title="Кто скоро возвращается из отпуска" icon={<CalendarClock className="h-4 w-4" />}>
          {data.returning_from_absence.length === 0 ? <Quiet text="Никто не возвращается в ближайшие 7 дней" /> : null}
          {data.returning_from_absence.map(({ employee, absence }) => (
            <Row
              key={`${employee.id}-${absence.id}`}
              onClick={() => navigate(`/team?employee=${employee.id}`)}
              main={employee.full_name}
              sub={`${absence.absence_type} до ${toDisplay(absence.date_to)}`}
              right={<Badge tone="blue">{absence.date_to === new Date().toISOString().slice(0, 10) ? 'сегодня' : `завтра`}</Badge>}
            />
          ))}
        </Section>
      </div>

      <Section title="Задачи, которые вернулись из ожидания сегодня" icon={<ListTodo className="h-4 w-4" />}>
        {data.returned_tasks.length === 0 ? <Quiet text="Сегодня возвратов нет" /> : null}
        <div className="grid grid-cols-2 gap-1">
          {data.returned_tasks.map((t) => (
            <Row key={t.id} onClick={() => navigate(`/tasks?task=${t.id}`)} main={t.title} sub={t.theme} right={<Badge tone="violet">вернулась</Badge>} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </div>
      <div className="grid gap-1">{children}</div>
    </Card>
  );
}

function Quiet({ text }: { text: string }) {
  return <div className="py-2 text-sm text-muted-foreground">{text}</div>;
}

function Row({ main, sub, right, onClick, danger }: { main: string; sub?: string; right?: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-fast hover:bg-accent/60',
        danger && 'bg-red-500/5',
      )}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{main}</div>
        {sub ? <div className="truncate text-xs text-muted-foreground">{sub}</div> : null}
      </div>
      {right}
    </button>
  );
}
