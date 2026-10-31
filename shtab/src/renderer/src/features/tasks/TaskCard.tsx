// Карточка задачи в выдвижной панели с вкладками: Сводка | Чек-лист | Проделанная работа | История (ТЗ п.5.4).

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, ListChecks, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import type { TaskCheckItem, TaskView } from '@/shared/types';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { fmtDate, fmtDateTime, relativeDays, shortDate } from '@/renderer/src/lib/dates';
import { Badge, Button, Input, Spinner } from '@/renderer/src/ui/primitives';
import { Sheet } from '@/renderer/src/ui/dialog';
import { Checkbox, Tabs, TabsContent, TabsList, TabsTrigger } from '@/renderer/src/ui/radix';
import { ProgressBar } from '@/renderer/src/ui/display';
import { WorkLogPanel } from '@/renderer/src/ui/workLogPanel';

export function priorityTone(p: string): 'red' | 'orange' | 'blue' | 'gray' {
  if (p === 'срочно') return 'red';
  if (p === 'высокий') return 'orange';
  if (p === 'обычный') return 'blue';
  return 'gray';
}

export function statusTone(s: string): 'neutral' | 'blue' | 'yellow' | 'purple' | 'green' | 'gray' {
  switch (s) {
    case 'входящая': return 'neutral';
    case 'в работе': return 'blue';
    case 'ожидание': return 'yellow';
    case 'на проверке': return 'purple';
    case 'выполнено': return 'green';
    case 'отменено': return 'gray';
    default: return 'neutral';
  }
}

export function TaskCard({
  taskId,
  onClose,
  onEdit,
  onStatusChange,
}: {
  taskId: number | null;
  onClose: () => void;
  onEdit: (t: TaskView) => void;
  onStatusChange: (id: number, status: string) => Promise<void>;
}) {
  const store = useStore();
  const [task, setTask] = useState<TaskView | null>(null);
  const [items, setItems] = useState<TaskCheckItem[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (taskId == null) {
      setTask(null);
      setItems([]);
      return;
    }
    let alive = true;
    Promise.all([api.taskGet(taskId), api.checkItemList(taskId)])
      .then(([t, list]) => {
        if (!alive) return;
        setTask(t);
        setItems(list);
      })
      .catch((e: unknown) => toast.error(errText(e)));
    return () => {
      alive = false;
    };
  }, [taskId, store.version]);

  const reloadItems = async () => {
    if (taskId == null) return;
    try {
      setItems(await api.checkItemList(taskId));
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const addItem = async () => {
    if (taskId == null || !newItem.trim()) return;
    try {
      await api.checkItemCreate({ task_id: taskId, title: newItem.trim(), done: false, sort_order: items.length });
      setNewItem('');
      await reloadItems();
      store.bump();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const toggleItem = async (it: TaskCheckItem) => {
    try {
      await api.checkItemUpdate(it.id, { done: !it.done });
      await reloadItems();
      store.bump();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const removeItem = async (id: number) => {
    try {
      await api.checkItemDelete(id);
      await reloadItems();
      store.bump();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const doneCount = items.filter((i) => i.done).length;

  return (
    <Sheet
      open={taskId != null}
      onClose={onClose}
      title={task?.title ?? 'Задача'}
      headerExtra={
        task && (
          <>
            <Button size="sm" variant="outline" onClick={() => onEdit(task)}>
              <Pencil className="h-4 w-4" /> Изменить
            </Button>
            {task.status !== 'выполнено' ? (
              <Button size="sm" variant="ghost" onClick={() => void onStatusChange(task.id, 'выполнено')} title="Отметить выполненной">
                <Check className="h-4 w-4" /> Выполнено
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => void onStatusChange(task.id, 'в работе')} title="Вернуть в работу">
                <Undo2 className="h-4 w-4" /> В работу
              </Button>
            )}
          </>
        )
      }
    >
      {taskId != null && task == null ? (
        <Spinner />
      ) : task ? (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Сводка</TabsTrigger>
            <TabsTrigger value="checklist">Чек-лист</TabsTrigger>
            <TabsTrigger value="work">Проделанная работа</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                <Badge tone={statusTone(task.status)}>{task.status}</Badge>
                {task.stale && <Badge tone="orange">давно без обновлений</Badge>}
                {task.returned_today && <Badge tone="green">вернулась из ожидания</Badge>}
              </div>
              <dl className="grid grid-cols-[160px_1fr] gap-y-2">
                <dt className="text-muted-foreground">Тема</dt>
                <dd>{task.theme || '—'}</dd>
                <dt className="text-muted-foreground">Срок</dt>
                <dd>
                  {task.deadline ? `${fmtDate(task.deadline)}` : 'не задан'}
                  {task.days_left != null && !['выполнено', 'отменено'].includes(task.status) && (
                    <span className="ml-2 text-xs text-muted-foreground">({relativeDays(task.days_left)})</span>
                  )}
                </dd>
                {task.status === 'ожидание' && task.wait_until && (
                  <>
                    <dt className="text-muted-foreground">Вернётся</dt>
                    <dd>
                      <Badge tone="yellow">{shortDate(task.wait_until)}</Badge>
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">Следующее действие</dt>
                <dd>{task.next_action || '—'}</dd>
                <dt className="text-muted-foreground">Участники</dt>
                <dd>{task.participants || '—'}</dd>
                <dt className="text-muted-foreground">Примечание</dt>
                <dd className="whitespace-pre-wrap">{task.note || '—'}</dd>
                <dt className="text-muted-foreground">Прогресс</dt>
                <dd className="flex items-center gap-2">
                  <ProgressBar value={task.progress} className="w-40" />
                  <span className="text-xs text-muted-foreground">{Math.round(task.progress * 100)}%</span>
                </dd>
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="checklist">
            <div className="space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void addItem();
                }}
                className="flex gap-2"
              >
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Новый пункт чек-листа…" />
                <Button type="submit" size="sm" disabled={!newItem.trim()}>
                  <Plus className="h-4 w-4" /> Добавить
                </Button>
              </form>
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                  Пока пусто — добавьте пункты, по которым виден прогресс задачи.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ListChecks className="h-4 w-4" />
                    Выполнено {doneCount} из {items.length}
                  </div>
                  <ProgressBar value={items.length ? doneCount / items.length : 0} />
                  <ul className="space-y-1">
                    {items.map((it) => (
                      <li key={it.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-theme hover:bg-accent/60">
                        <Checkbox checked={it.done} onCheckedChange={() => void toggleItem(it)} />
                        <span className={it.done ? 'flex-1 text-muted-foreground line-through' : 'flex-1'}>{it.title}</span>
                        <button
                          className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => void removeItem(it.id)}
                          title="Удалить пункт"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="work">
            <WorkLogPanel entityType="task" entityId={task.id} />
          </TabsContent>

          <TabsContent value="history">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Создана: {fmtDateTime(task.created_at)}</li>
              <li>Изменена: {fmtDateTime(task.updated_at)}</li>
              {task.days_since_update != null && <li>Без обновлений: {task.days_since_update} дн.</li>}
            </ul>
          </TabsContent>
        </Tabs>
      ) : (
        <div />
      )}
    </Sheet>
  );
}
