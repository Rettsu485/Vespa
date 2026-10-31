// Дашборд «Сегодня» (ТЗ п.5.5): счётчики + блоки «горит», красные флаги, ДР, возвращения, задачи из ожидания.

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarHeart, Clock, ListChecks, MailWarning, RotateCcw } from 'lucide-react';
import type { DashboardData } from '@/shared/types';
import { api } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { useLoad } from '@/renderer/src/lib/useLoad';
import { fmtDate, relativeDays, shortDate } from '@/renderer/src/lib/dates';
import { Badge, Card, EmptyState, Spinner } from '@/renderer/src/ui/primitives';
import { DeadlineBadge, RedFlag, StatusDot } from '@/renderer/src/ui/display';
import { EmployeeCard } from '@/renderer/src/features/team/EmployeeCard';

function CounterCard({ label, value, tone, icon }: { label: string; value: number; tone: 'red' | 'orange' | 'blue' | 'green'; icon: ReactNode }) {
  const tones: Record<string, string> = {
    red: 'text-red-600 dark:text-red-400',
    orange: 'text-orange-600 dark:text-orange-400',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <span className={`${tones[tone]} [&_svg]:h-5 [&_svg]:w-5`}>{icon}</span>
      <div>
        <div className={`text-xl font-semibold leading-none ${value > 0 ? tones[tone] : 'text-muted-foreground'}`}>{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function Block({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/40 px-4 py-2.5 text-sm font-semibold">{title}</div>
      <div className="px-4 py-3">{children}</div>
    </Card>
  );
}

const itemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-theme hover:bg-accent/70';

export function DashboardPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [openEmployeeId, setOpenEmployeeId] = useState<number | null>(null);

  const { data, loading } = useLoad<DashboardData>(() => api.dashboardGet(), [store.version]);

  // Карточки сотрудников открываем прямо отсюда; карточки ЭДО/задач — переходом в раздел
  // (страницы подписаны на событие «открыть карточку», ТЗ п.5.5: пункт кликабелен).
  useEffect(() => {
    return store.subscribeOpenCard((e) => {
      if (e.kind === 'employee') setOpenEmployeeId(e.id);
    });
  }, [store]);

  if (loading && !data) return <Spinner />;
  if (!data) return <EmptyState title="Не удалось загрузить дашборд" />;

  const d = data;

  const openEdo = (id: number) => {
    navigate('/edo');
    store.emitOpenCard({ kind: 'edo', id });
  };
  const openTask = (id: number) => {
    navigate('/tasks');
    store.emitOpenCard({ kind: 'task', id });
  };
  const openMonitoring = (id: number) => {
    navigate('/monitorings');
    store.emitOpenCard({ kind: 'monitoring', id });
  };

  const nothing = (text: string) => <div className="py-2 text-center text-xs text-muted-foreground">{text}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Сегодня</h1>

      {/* Верхний ряд счётчиков */}
      <div className="grid grid-cols-4 gap-4">
        <CounterCard label="Просрочено по ЭДО" value={d.counters.overdue} tone="red" icon={<AlertTriangle />} />
        <CounterCard label="Срок сегодня" value={d.counters.today} tone="orange" icon={<Clock />} />
        <CounterCard label="Ближайшие 3 дня" value={d.counters.next3} tone="blue" icon={<CalendarHeart />} />
        <CounterCard label="Вернулось из ожидания сегодня" value={d.counters.returnedToday} tone="green" icon={<RotateCcw />} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Горит по ЭДО */}
        <Block title={<span className="inline-flex items-center gap-2"><MailWarning className="h-4 w-4 text-red-500" /> Горит по ЭДО</span>}>
          {d.edoHot.length === 0 ? (
            nothing('Ничего не горит — отлично.')
          ) : (
            <ul className="space-y-0.5">
              {d.edoHot.map((doc) => (
                <li key={doc.id}>
                  <button className={itemClass} onClick={() => openEdo(doc.id)}>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${doc.control_type === 'red' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{doc.doc_number}</span> · {doc.summary || 'без содержания'}
                    </span>
                    <DeadlineBadge daysLeft={doc.days_left} offControl={doc.off_control} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Мониторинги без дублёра при отсутствующем исполнителе */}
        <Block title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Мониторинги под красным флагом</span>}>
          {d.monitoringRedFlags.length === 0 ? (
            nothing('Все отсутствующие исполнители прикрыты дублёрами.')
          ) : (
            <ul className="space-y-0.5">
              {d.monitoringRedFlags.map((m) => (
                <li key={m.id}>
                  <button className={itemClass} onClick={() => openMonitoring(m.id)}>
                    <RedFlag />
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.employee_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Ближайшие дни рождения */}
        <Block title={<span className="inline-flex items-center gap-2"><CalendarHeart className="h-4 w-4 text-pink-500" /> Ближайшие дни рождения (3 дня)</span>}>
          {d.birthdaysSoon.length === 0 ? (
            nothing('В ближайшие 3 дней рождений нет.')
          ) : (
            <ul className="space-y-0.5">
              {d.birthdaysSoon.map((e) => (
                <li key={e.id}>
                  <button className={itemClass} onClick={() => setOpenEmployeeId(e.id)}>
                    <StatusDot status={e.status} />
                    <span className="min-w-0 flex-1 truncate">{e.full_name}</span>
                    <Badge tone={e.days_to_birthday === 0 ? 'yellow' : 'neutral'}>
                      {e.days_to_birthday === 0 ? 'сегодня!' : relativeDays(e.days_to_birthday)}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Кто скоро возвращается из отпуска */}
        <Block title={<span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4 text-sky-500" /> Возвращаются из отсутствия (7 дней)</span>}>
          {d.returningSoon.length === 0 ? (
            nothing('В ближайшую неделю возвращений не запланировано.')
          ) : (
            <ul className="space-y-0.5">
              {d.returningSoon.map(({ employee, absence }) => (
                <li key={`${employee.id}-${absence.id}`}>
                  <button className={itemClass} onClick={() => setOpenEmployeeId(employee.id)}>
                    <StatusDot status={employee.status} />
                    <span className="min-w-0 flex-1 truncate">{employee.full_name}</span>
                    <span className="text-xs text-muted-foreground">{absence.absence_type} до {fmtDate(absence.date_to)}</span>
                    <Badge tone="blue">{relativeDays(-differenceInCalendarDays(new Date(), parseISO(absence.date_to))) ?? 'скоро'}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>

      {/* Задачи, вернувшиеся из ожидания */}
      <Block title={<span className="inline-flex items-center gap-2"><ListChecks className="h-4 w-4 text-emerald-500" /> Задачи, вернувшиеся из ожидания сегодня</span>}>
        {d.returnedTasks.length === 0 ? (
          nothing('Сегодня никто не вернулся из ожидания.')
        ) : (
          <ul className="space-y-0.5">
            {d.returnedTasks.map((t) => (
              <li key={t.id}>
                <button className={`${itemClass} bg-emerald-500/5`} onClick={() => openTask(t.id)}>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{t.title}</span>
                    {t.theme && <span className="text-muted-foreground"> · {t.theme}</span>}
                  </span>
                  {t.deadline && <span className="text-xs text-muted-foreground">срок {shortDate(t.deadline)}</span>}
                  <Badge tone="green">вернулась из ожидания</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <EmployeeCard employeeId={openEmployeeId} onClose={() => setOpenEmployeeId(null)} />
    </div>
  );
}
