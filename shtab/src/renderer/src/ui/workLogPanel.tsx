// Единый журнал «Проведённая работа» (work_log) — переиспользуется в карточках ЭДО и задач (ТЗ п.3, 5.3, 5.4).

import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import type { LogEntityType, WorkLogEntry } from '@/shared/types';
import { workLogSchema, fieldErrorsFromIssue } from '@/shared/schemas';
import { api, errText } from '@/renderer/src/lib/api';
import { fmtDate, todayIsoLocal } from '@/renderer/src/lib/dates';
import { Button, Textarea } from './primitives';
import { DatePicker } from './datePicker';

export function DayHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function WorkLogPanel({ entityType, entityId }: { entityType: LogEntityType; entityId: number }) {
  const [entries, setEntries] = useState<WorkLogEntry[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState<string | null>(todayIsoLocal());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reload = async () => {
    try {
      setEntries(await api.workLogList(entityType, entityId));
    } catch (e) {
      toast.error(errText(e));
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const add = async () => {
    const parsed = workLogSchema.safeParse({ entity_type: entityType, entity_id: entityId, log_date: date ?? '', text });
    if (!parsed.success) {
      setErrors(fieldErrorsFromIssue(parsed.error));
      return;
    }
    setErrors({});
    try {
      await api.workLogAdd({ entity_type: entityType, entity_id: entityId, log_date: date ?? todayIsoLocal(), text: text.trim() });
      setText('');
      await reload();
      toast.success('Запись добавлена');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const remove = async (id: number) => {
    try {
      await api.workLogDelete(id);
      await reload();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  // Группировка по дням, новые сверху.
  const byDay = new Map<string, WorkLogEntry[]>();
  for (const en of entries) {
    const arr = byDay.get(en.log_date) ?? [];
    arr.push(en);
    byDay.set(en.log_date, arr);
  }
  const days = [...byDay.keys()].sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="flex items-start gap-2"
      >
        <DatePicker value={date} onChange={setDate} clearable={false} placeholder="Дата" />
        <div className="flex-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={errors.text ? errors.text : 'Что сделано…'}
            className="min-h-[40px]"
            rows={1}
          />
        </div>
        <Button type="submit" size="sm" className="mt-0.5">
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </form>

      {days.length === 0 ? (
        <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          Пока пусто — добавьте первую запись о проделанной работе.
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day}>
              <DayHeader>{fmtDate(day)}</DayHeader>
              <ul className="space-y-1 pl-1">
                {(byDay.get(day) ?? []).map((en) => (
                  <li key={en.id} className="group flex items-start gap-2 rounded-md px-2 py-1 text-sm transition-theme hover:bg-accent/60">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span className="flex-1 whitespace-pre-wrap">{en.text}</span>
                    <button
                      className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => void remove(en.id)}
                      title="Удалить запись"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
