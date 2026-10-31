// Модуль «Задачи»: Список (по умолчанию) и Канбан; чек-листы, ожидание с датой возврата,
// журнал проделанной работы, индикатор заброшенности. Архив = выполнено/отменено.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { TaskView } from '@shared/types';
import { TASK_PRIORITIES, TASK_STATUSES } from '@shared/types';
import { Badge, Button, Card, EmptyState, Field, Input, SegmentedControl, Select, Sheet, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, useToast } from '@/components/ui';
import { DeadlineBadge, taskPriorityTone, taskStatusTone } from '@/components/badges';
import { DateField } from '@/components/DateField';
import { toDisplay } from '@/lib/dates';
import { WorkLogPanel } from '@/components/worklog';
import { cn } from '@/lib/utils';
import { Archive, Check, Plus, RotateCcw, Trash2, Pencil } from 'lucide-react';

const BOARD_STATUSES = TASK_STATUSES.filter((s) => s !== 'выполнено' && s !== 'отменено');

export function TasksPage() {
  const [params, setParams] = useSearchParams();
  const taskId = Number(params.get('task')) || null;

  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [formId, setFormId] = useState<number | 'new' | null>(null);

  const { data: tasks, loading, reload } = useAsync(
    () => api.tasks.list({ status: (statusFilter as never) || null, includeArchived: showArchived }),
    [statusFilter, showArchived],
  );

  const filtered = useMemo(() => {
    const list = tasks ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((t) => t.title.toLowerCase().includes(q) || t.theme.toLowerCase().includes(q));
  }, [tasks, query]);

  const openTask = (id: number | null) => {
    const p = new URLSearchParams(params);
    if (id === null) p.delete('task');
    else p.set('task', String(id));
    setParams(p);
  };

  const card = (tasks ?? []).find((t) => t.id === taskId) ?? null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Задачи</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={[
              { value: 'list', label: 'Список' },
              { value: 'kanban', label: 'Канбан' },
            ]}
            value={view}
            onChange={setView}
          />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
            <option value="">Все статусы</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Фильтр…" className="w-40" />
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Архив
          </label>
          <Button onClick={() => setFormId('new')}>
            <Plus className="h-4 w-4" /> Задача
          </Button>
        </div>
      </div>

      {loading ? <Spinner /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="Пока пусто — добавьте задачи." hint="Личный трекер: список или канбан по статусам." />
      ) : null}

      {!loading && filtered.length > 0 && view === 'list' ? (
        <Card className="divide-y overflow-hidden">
          {filtered.map((t) => (
            <TaskRow key={t.id} t={t} onOpen={() => openTask(t.id)} />
          ))}
        </Card>
      ) : null}

      {!loading && filtered.length > 0 && view === 'kanban' ? (
        <div className="grid grid-cols-4 gap-3">
          {BOARD_STATUSES.map((st) => {
            const col = filtered.filter((t) => t.status === st);
            return (
              <Card key={st} className="flex min-h-[200px] flex-col p-2">
                <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{st}</span>
                  <span>{col.length}</span>
                </div>
                <div className="grid gap-2">
                  {col.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTask(t.id)}
                      className={cn(
                        'rounded-md border bg-background p-2.5 text-left shadow-sm transition-colors duration-fast hover:bg-accent/50',
                        t.sleeping && 'opacity-50',
                      )}
                    >
                      <div className="truncate text-sm font-medium">{t.title}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{t.theme}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <Badge tone={taskPriorityTone(t.priority)}>{t.priority}</Badge>
                        {t.deadline ? <DeadlineBadge daysLeft={t.days_left} /> : null}
                        {t.stale ? <Badge tone="orange">давно без обновлений</Badge> : null}
                      </div>
                      {t.sleeping && t.wait_until ? (
                        <div className="mt-1 text-xs text-violet-500">вернётся {toDisplay(t.wait_until).slice(0, 5)}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Карточка задачи */}
      <Sheet open={card !== null} onClose={() => openTask(null)} title={card?.title ?? ''} wide>
        {card ? (
          <TaskSheet
            task={card}
            onEdit={() => setFormId(card.id)}
            onChanged={reload}
            onArchive={async () => {
              await api.tasks.archive(card.id);
              openTask(null);
              reload();
            }}
          />
        ) : null}
      </Sheet>

      <TaskForm
        open={formId !== null}
        taskId={typeof formId === 'number' ? formId : null}
        onClose={() => setFormId(null)}
        onSaved={() => {
          setFormId(null);
          reload();
        }}
      />
    </div>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-base', pct === 100 ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{total === 0 ? '—' : `${done}/${total}`}</span>
    </div>
  );
}

function TaskRow({ t, onOpen }: { t: TaskView; onOpen: () => void }) {
  return (
    <button
      className={cn(
        'row flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast hover:bg-accent/50',
        t.sleeping && 'opacity-50',
        t.archived && 'opacity-40',
      )}
      onClick={onOpen}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{t.title}</span>
          {t.stale ? <Badge tone="orange">давно без обновлений</Badge> : null}
          {t.archived ? <Badge tone="gray">архив</Badge> : null}
        </div>
        <div className="truncate text-xs text-muted-foreground">{t.theme}</div>
        {t.next_action ? <div className="mt-0.5 truncate text-xs italic text-muted-foreground/80">→ {t.next_action}</div> : null}
        {t.sleeping && t.wait_until ? (
          <div className="mt-0.5 text-xs text-violet-500">ждёт до {toDisplay(t.wait_until)}</div>
        ) : null}
      </div>
      <Badge tone={taskPriorityTone(t.priority)} className="shrink-0">{t.priority}</Badge>
      <span className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">
        {t.deadline ? toDisplay(t.deadline) : '—'}
      </span>
      <span className="w-32 shrink-0 text-right"><DeadlineBadge daysLeft={t.days_left} /></span>
      <Badge tone={taskStatusTone(t.status)} className="w-24 shrink-0 justify-center">{t.status}</Badge>
      <span className="w-24 shrink-0"><ProgressBar done={t.check_done} total={t.check_total} /></span>
    </button>
  );
}

function TaskSheet({ task, onEdit, onChanged, onArchive }: { task: TaskView; onEdit: () => void; onChanged: () => void; onArchive: () => void }) {
  const [tab, setTab] = useState('summary');
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{task.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge tone={taskPriorityTone(task.priority)}>{task.priority}</Badge>
            <Badge tone={taskStatusTone(task.status)}>{task.status}</Badge>
            <DeadlineBadge daysLeft={task.days_left} />
            {task.stale ? <Badge tone="orange">давно без обновлений</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Изменить
          </Button>
          {!task.archived ? (
            <Button variant="destructive" size="sm" onClick={onArchive}>
              <Archive className="h-4 w-4" /> В архив
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={tab} onChange={setTab}>
        <TabsList>
          <TabsTrigger value="summary">Сводка</TabsTrigger>
          <TabsTrigger value="checklist">Чек-лист</TabsTrigger>
          <TabsTrigger value="work">Проделанная работа</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Info label="Тема" value={task.theme} />
              <Info label="Срок" value={task.deadline ? toDisplay(task.deadline) : ''} />
              <Info label="Участники" value={task.participants} />
              <Info label="Ждёт до" value={task.wait_until ? toDisplay(task.wait_until) : ''} />
            </div>
            <Info label="Следующее действие" value={task.next_action} multiline />
            <Info label="Примечание" value={task.note} multiline />
          </div>
        </TabsContent>
        <TabsContent value="checklist">
          <ChecklistPanel taskId={task.id} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="work">
          <WorkLogPanel entityType="task" entityId={task.id} />
        </TabsContent>
        <TabsContent value="history">
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div>Создана: {toDisplay(task.created_at.slice(0, 10))}</div>
            <div>Обновлена: {toDisplay(task.updated_at.slice(0, 10))}</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn(multiline && 'whitespace-pre-line rounded-md border bg-background p-2', !value && 'text-muted-foreground/60')}>
        {value || '—'}
      </div>
    </div>
  );
}

function ChecklistPanel({ taskId, onChanged }: { taskId: number; onChanged: () => void }) {
  const { toast } = useToast();
  const { data: items, reload } = useAsync(() => api.checkItems.list(taskId), [taskId]);
  const [title, setTitle] = useState('');

  const add = async () => {
    if (!title.trim()) return;
    try {
      await api.checkItems.create(taskId, title.trim());
      setTitle('');
      reload();
      onChanged();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const toggle = async (id: number, done: boolean) => {
    try {
      await api.checkItems.update(id, { done: !done });
      reload();
      onChanged();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const remove = async (id: number) => {
    try {
      await api.checkItems.remove(id);
      reload();
      onChanged();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const total = (items ?? []).length;
  const done = (items ?? []).filter((i) => i.done).length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <ProgressBar done={done} total={total} />
        <span className="text-xs text-muted-foreground">{total === 0 ? 'чек-лист пуст' : `прогресс ${Math.round((done / total) * 100)}%`}</span>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Новый пункт чек-листа" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add(); } }} />
        <Button type="submit" size="sm"><Plus className="h-4 w-4" /></Button>
      </form>
      {total === 0 ? <div className="text-sm text-muted-foreground">Пока пусто — добавьте пункты.</div> : null}
      <div className="grid gap-1">
        {(items ?? []).map((it) => (
          <div key={it.id} className="group flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
            <button
              className={cn(
                'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors duration-fast',
                it.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-input hover:border-primary',
              )}
              onClick={() => void toggle(it.id, it.done)}
              aria-label={it.done ? 'Снять отметку' : 'Отметить'}
            >
              {it.done ? <Check className="h-3 w-3" /> : null}
            </button>
            <span className={cn('flex-1', it.done && 'text-muted-foreground line-through')}>{it.title}</span>
            <button className="opacity-0 transition-opacity duration-fast group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => void remove(it.id)} aria-label="Удалить пункт">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const taskSchema = z.object({
  title: z.string().trim().min(2, 'Укажите название задачи'),
});

export function TaskForm({
  open,
  taskId,
  onClose,
  onSaved,
}: {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: existing } = useAsync(() => (taskId !== null ? api.tasks.get(taskId) : Promise.resolve(null)), [taskId]);

  const [f, setF] = useState({
    theme: '',
    title: '',
    priority: 'обычный' as string,
    deadline: null as string | null,
    status: 'входящая' as string,
    wait_until: null as string | null,
    next_action: '',
    participants: '',
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentKey = `${open ? 'o' : 'c'}:${taskId ?? 'new'}:${existing?.id ?? 0}`;
  const [lastKey, setLastKey] = useState('');
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    if (open && existing) {
      setF({
        theme: existing.theme,
        title: existing.title,
        priority: existing.priority,
        deadline: existing.deadline,
        status: existing.status,
        wait_until: existing.wait_until,
        next_action: existing.next_action,
        participants: existing.participants,
        note: existing.note,
      });
    } else if (open) {
      setF({ theme: '', title: '', priority: 'обычный', deadline: null, status: 'входящая', wait_until: null, next_action: '', participants: '', note: '' });
    }
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const parsed = taskSchema.safeParse(f);
    if (!parsed.success) {
      setErrors({ title: parsed.error.issues[0]?.message ?? 'Ошибка' });
      return;
    }
    if (f.status === 'ожидание' && !f.wait_until) {
      setErrors({ wait_until: 'Для статуса «ожидание» укажите дату возврата' });
      return;
    }
    setErrors({});
    const payload = { ...f, priority: f.priority as never, status: f.status as never };
    try {
      if (taskId !== null) await api.tasks.update(taskId, payload);
      else await api.tasks.create(payload);
      toast('success', 'Сохранено');
      onSaved();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={taskId !== null ? 'Редактировать задачу' : 'Новая задача'}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Тема">
          <Input value={f.theme} onChange={(e) => set('theme', e.target.value)} placeholder="Например: Паводок-2026" />
        </Field>
        <Field label="Название *" error={errors.title}>
          <Input value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus placeholder="Что нужно сделать" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Приоритет">
            <Select value={f.priority} onChange={(e) => set('priority', e.target.value)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Статус">
            <Select value={f.status} onChange={(e) => set('status', e.target.value)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Срок">
            <DateField value={f.deadline} onChange={(v) => set('deadline', v)} />
          </Field>
          <Field label="Ожидать до (для статуса «ожидание»)" error={errors.wait_until}>
            <DateField value={f.wait_until} onChange={(v) => set('wait_until', v)} />
          </Field>
        </div>
        <Field label="Следующее действие">
          <Input value={f.next_action} onChange={(e) => set('next_action', e.target.value)} placeholder="Позвонить в …" />
        </Field>
        <Field label="Участники (текстом)">
          <Input value={f.participants} onChange={(e) => set('participants', e.target.value)} />
        </Field>
        <Field label="Примечание">
          <Textarea value={f.note} onChange={(e) => set('note', e.target.value)} rows={2} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit">Сохранить</Button>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3" /> При наступлении даты возврата задача автоматически перейдёт в «в работе».
        </div>
      </form>
    </Sheet>
  );
}
