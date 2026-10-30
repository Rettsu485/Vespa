// Компонент «Проведённая работа» (work_log) — единый журнал для карточек ЭДО и задач.
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { Button, Input, Field, useToast } from '@/components/ui';
import { toDisplay, todayIso } from '@/lib/dates';
import type { WorkLogEntity } from '@shared/types';
import { Trash2, Plus } from 'lucide-react';

export function WorkLogPanel({ entityType, entityId }: { entityType: WorkLogEntity; entityId: number }) {
  const { toast } = useToast();
  const { data: entries, reload } = useAsync(() => api.workLog.list(entityType, entityId), [entityType, entityId]);
  const [text, setText] = useState('');
  const [date, setDate] = useState(todayIso());

  const add = async () => {
    if (!text.trim()) return;
    try {
      await api.workLog.create({ entity_type: entityType, entity_id: entityId, log_date: date, text: text.trim() });
      setText('');
      reload();
      toast('success', 'Запись добавлена');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const remove = async (id: number) => {
    try {
      await api.workLog.remove(id);
      reload();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  // Группировка по дням (лента с разбивкой по датам, по ТЗ).
  const byDate = new Map<string, NonNullable<typeof entries>>();
  (entries ?? []).forEach((en) => {
    const list = byDate.get(en.log_date) ?? [];
    list.push(en);
    byDate.set(en.log_date, list);
  });
  const days = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="grid gap-4">
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Field label="Дата">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[150px]" />
        </Field>
        <Field label="Что сделано" error={undefined}>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Например: запрошены материалы из района"
            className="min-w-[260px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void add();
              }
            }}
          />
        </Field>
        <Button type="submit" size="sm">
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </form>

      {days.length === 0 ? (
        <div className="text-sm text-muted-foreground">Пока пусто — добавьте первую запись о проделанной работе.</div>
      ) : (
        <div className="grid gap-3">
          {days.map(([d, list]) => (
            <div key={d}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{toDisplay(d)}</div>
              <div className="grid gap-1">
                {list.map((en) => (
                  <div key={en.id} className="group flex items-start justify-between rounded-md border bg-background px-3 py-2 text-sm">
                    <span>{en.text}</span>
                    <button
                      className="opacity-0 transition-opacity duration-fast group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => void remove(en.id)}
                      aria-label="Удалить запись"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
