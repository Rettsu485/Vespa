// Раздел «Задачи» (ТЗ п.5.4): два вида — Список (по умолчанию) и Канбан по статусам.
// Архив = выполнено/отменено, скрыты по умолчанию. Ожидание с датой возврата — приглушение + подпись.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { TaskView } from '@/shared/types';
import { TASK_STATUSES } from '@/shared/types';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore, type OpenCardEvent } from '@/renderer/src/lib/store';
import { useLoad } from '@/renderer/src/lib/useLoad';
import { fmtDate, relativeDays, shortDate } from '@/renderer/src/lib/dates';
import { Badge, Button, Card, EmptyState, Spinner } from '@/renderer/src/ui/primitives';
import { DialogContent, DialogRoot } from '@/renderer/src/ui/dialog';
import { DeadlineBadge, FilterRow, ProgressBar, Segmented } from '@/renderer/src/ui/display';
import { Select } from '@/renderer/src/ui/radix';
import { TaskCard, priorityTone, statusTone } from './TaskCard';
import { TaskForm, emptyTask, toTaskInput } from './TaskForm';

type View = 'list' | 'kanban';

/** Статусы канбана: без архивных (выполнено/отменено — это архив, ТЗ п.5.4). */
const KANBAN_COLUMNS = TASK_STATUSES.filter((s) => s !== 'выполнено' && s !== 'отменено');

export function TasksPage() {
  const store = useStore();
  const [view, setView] = useState<View>('list');
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState<{ id: number | null; initial: ReturnType<typeof emptyTask> } | null>(null);

  useEffect(() => {
    return store.subscribeOpenCard((e: OpenCardEvent) => {
      if (e.kind === 'task') setOpenId(e.id);
    });
  }, [store]);

  const loaded = useLoad<TaskView[]>(
    () => api.taskList({ includeArchived }),
    [includeArchived, store.version]
  );

  const list = useMemo(() => {
    let l = loaded ?? [];
    if (!includeArchived) l = l.filter((t) => !t.archived);
    const q = query.trim().toLowerCase();
    if (q) {
      l = l.filter((t) => [t.theme, t.title, t.next_action, t.participants, t.note].some((f) => f.toLowerCase().includes(q)));
    }
    if (priorityFilter && priorityFilter !== '__all') l = l.filter((t) => t.priority === priorityFilter);
    // Активные сверху, срочные раньше, по сроку.
    return [...l].sort((a, b) => {
      const aa = a.archived ? 1 : 0;
      const bb = b.archived ? 1 : 0;
      if (aa !== bb) return aa - bb;
      const da = a.deadline ?? '9999-12-31';
      const db = b.deadline ?? '9999-12-31';
      if (da !== db) return da < db ? -1 : 1;
      return a.title.localeCompare(b.title, 'ru');
    });
  }, [loaded, query, priorityFilter, includeArchived]);

  const setStatus = async (id: number, status: string) => {
    try {
      await api.taskSetStatus(id, status);
      store.bump();
      const archiving = status === 'выполнено' || status === 'отменено';
      toast.success(archiving ? 'Задача перемещена в архив' : 'Статус обновлён');
      if (archiving) setOpenId(null);
    } catch (e) {
      toast.error(errText(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Задачи</h1>
        <div className="flex items-center gap-2">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'Список' },
              { value: 'kanban', label: 'Канбан' },
            ]}
          />
          <Button size="sm" onClick={() => setForm({ id: null, initial: emptyTask() })}>
            <Plus className="h-4 w-4" /> Задача
          </Button>
        </div>
      </div>

      <FilterRow query={query} onQuery={setQuery} placeholder="Фильтр по теме, названию, следующему действию…">
        <Select
          value={priorityFilter}
          onValueChange={setPriorityFilter}
          options={[{ value: '__all', label: 'Любой приоритет' }, ...['срочно', 'высокий', 'обычный', 'низкий'].map((p) => ({ value: p, label: p }))]}
          className="w-40"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} className="h-4 w-4 accent-current" />
          Показывать архив
        </label>
      </FilterRow>

      {loaded == null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState
          title="Пока пусто — добавьте первую задачу"
          hint="Личный трекер: задачи с чек-листами, сроком и режимом ожидания («спит» до даты)."
          action={<Button onClick={() => setForm({ id: null, initial: emptyTask() })}><Plus className="h-4 w-4" /> Добавить задачу</Button>}
        />
      ) : view === 'list' ? (
        <Card className="overflow-hidden">
          <table className="shtab-table w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Тема</th>
                <th className="px-3 py-2 font-medium">Название</th>
                <th className="px-3 py-2 font-medium">Приоритет</th>
                <th className="px-3 py-2 font-medium">Срок</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="w-32 px-3 py-2 font-medium">Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <TaskRow key={t.id} t={t} onOpen={() => setOpenId(t.id)} />
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {KANBAN_COLUMNS.map((col) => {
            const cards = list.filter((t) => t.status === col);
            return (
              <div key={col} className="flex min-h-[200px] flex-col rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold">
                  {col}
                  <span className="text-xs text-muted-foreground">{cards.length}</span>
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {cards.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setOpenId(t.id)}
                      className={`w-full rounded-md border bg-card p-2.5 text-left shadow-sm transition-theme hover:shadow ${t.status === 'ожидание' && t.wait_until ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-snug">{t.title}</span>
                        <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                      </div>
                      {t.theme && <div className="mt-0.5 text-xs text-muted-foreground">{t.theme}</div>}
                      {t.status === 'ожидание' && t.wait_until && (
                        <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">вернётся {shortDate(t.wait_until)}</div>
                      )}
                      {t.next_action && <div className="mt-1 truncate text-xs text-muted-foreground">→ {t.next_action}</div>}
                      <div className="mt-2 flex items-center gap-2">
                        <ProgressBar value={t.progress} className="w-full" />
                        <span className="shrink-0 text-[10px] text-muted-foreground">{Math.round(t.progress * 100)}%</span>
                      </div>
                      {t.stale && <div className="mt-1 text-[10px] text-orange-600 dark:text-orange-400">давно без обновлений</div>}
                    </button>
                  ))}
                  {cards.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">Пусто</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskCard
        taskId={openId}
        onClose={() => setOpenId(null)}
        onEdit={(t) => {
          setOpenId(null);
          setForm({ id: t.id, initial: toTaskInput(t) });
        }}
        onStatusChange={setStatus}
      />

      <DialogRoot open={form != null}>
        <DialogContent title={form?.id != null ? 'Редактировать задачу' : 'Новая задача'}>
          {form && (
            <TaskForm
              taskId={form.id}
              initial={form.initial}
              onSaved={() => setForm(null)}
              onCancel={() => setForm(null)}
            />
          )}
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

function TaskRow({ t, onOpen }: { t: TaskView; onOpen: () => void }) {
  const sleeping = t.status === 'ожидание' && t.wait_until != null;
  return (
    <tr
      className={`cursor-pointer border-b last:border-0 transition-theme hover:bg-accent/60 ${sleeping ? 'opacity-60' : ''} ${t.returned_today ? 'bg-emerald-500/10' : ''}`}
      onClick={onOpen}
    >
      <td className="px-3 py-2 text-muted-foreground">{t.theme || '—'}</td>
      <td className="px-3 py-2">
        <div className="font-medium">{t.title}</div>
        {t.next_action && <div className="text-xs text-muted-foreground">→ {t.next_action}</div>}
        {sleeping && t.wait_until && <div className="text-xs text-amber-600 dark:text-amber-400">вернётся {shortDate(t.wait_until)}</div>}
        {t.stale && <div className="text-xs text-orange-600 dark:text-orange-400">давно без обновлений</div>}
        {t.returned_today && <div className="text-xs text-emerald-600 dark:text-emerald-400">вернулась из ожидания сегодня</div>}
      </td>
      <td className="px-3 py-2"><Badge tone={priorityTone(t.priority)}>{t.priority}</Badge></td>
      <td className="px-3 py-2">
        {t.deadline ? (
          <div className="flex flex-col gap-0.5">
            <span>{fmtDate(t.deadline)}</span>
            {!['выполнено', 'отменено'].includes(t.status) && <DeadlineBadge daysLeft={t.days_left} />}
          </div>
        ) : (
          '—'
        )}
      </td>
      <td className="px-3 py-2"><Badge tone={statusTone(t.status)}>{t.status}</Badge></td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <ProgressBar value={t.progress} />
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {t.items_done}/{t.items_total}
          </span>
        </div>
      </td>
    </tr>
  );
}

/** Подпись срока для тултипов (используется в строках списка). */
export function deadlineLabel(daysLeft: number | null): string | undefined {
  return daysLeft == null ? undefined : relativeDays(daysLeft) ?? undefined;
}
