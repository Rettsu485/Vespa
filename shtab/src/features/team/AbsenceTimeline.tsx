// Таймлайн отсутствий на 60 дней вперёд: сотрудник × дни, цветные полосы по типу отсутствия.
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { AbsenceView, EmployeeView } from '@shared/types';
import { ABSENCE_TYPES } from '@shared/types';
import { Button, Card, Field, Input, Select, Sheet, Spinner, ConfirmDialog, useToast, Badge } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { addDaysIso as addDays, todayIso, toDisplay } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

const DAY_COLORS: Record<string, string> = {
  отпуск: 'bg-blue-500',
  командировка: 'bg-violet-500',
  больничный: 'bg-orange-500',
  прочее: 'bg-yellow-500',
};

export function AbsenceTimeline({ employees, onChanged }: { employees: EmployeeView[]; onChanged: () => void }) {
  const horizonStart = todayIso();
  const horizonEnd = addDays(horizonStart, 59);
  const { data: absences, loading, reload } = useAsync(
    () => api.absences.list({ fromDate: horizonStart, toDate: horizonEnd }),
    [horizonStart],
  );
  const [editing, setEditing] = useState<AbsenceView | null>(null);
  const [creatingFor, setCreatingFor] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const { toast } = useToast();

  const days = useMemo(() => Array.from({ length: 60 }, (_, i) => addDays(horizonStart, i)), [horizonStart]);
  const activeEmps = employees.filter((e) => !e.is_fired && !e.archived);

  const removeAbsence = async (id: number) => {
    try {
      await api.absences.remove(id);
      reload();
      onChanged();
      toast('success', 'Отсутствие удалено');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-muted-foreground">
          Отсутствия · горизонт {toDisplay(horizonStart)} — {toDisplay(horizonEnd)}
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          {ABSENCE_TYPES.map((t) => (
            <span key={t} className="inline-flex items-center gap-1">
              <span className={cn('h-2.5 w-2.5 rounded-sm', DAY_COLORS[t])} /> {t}
            </span>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : null}

      {!loading && activeEmps.length === 0 ? (
        <div className="text-sm text-muted-foreground">Нет активных сотрудников.</div>
      ) : null}

      {!loading && activeEmps.length > 0 ? (
        <Card className="overflow-x-auto p-3">
          <div className="min-w-[900px]">
            {/* шкала недель */}
            <div className="mb-1 flex">
              <div className="w-44 shrink-0 text-xs font-medium text-muted-foreground">Сотрудник</div>
              <div className="relative flex-1">
                {days.map((d, i) =>
                  i % 7 === 0 ? (
                    <div key={d} className="absolute top-0 text-[10px] text-muted-foreground" style={{ left: `${(i / 60) * 100}%` }}>
                      {d.slice(8, 10)}.{d.slice(5, 7)}
                    </div>
                  ) : null,
                )}
                <div className="h-4" />
              </div>
            </div>
            {activeEmps.map((emp) => {
              const empAbs = (absences ?? []).filter((a) => a.employee_id === emp.id);
              return (
                <div key={emp.id} className="flex items-center border-t py-1">
                  <div className="w-44 shrink-0 truncate pr-2 text-sm">{emp.full_name}</div>
                  <div className="relative h-5 flex-1 rounded bg-muted/40">
                    {empAbs.map((a) => {
                      const fromIdx = Math.max(0, days.indexOf(a.date_from));
                      const rawTo = a.date_to > horizonEnd ? horizonEnd : a.date_to;
                      const toIdx = Math.min(59, days.indexOf(rawTo) >= 0 ? days.indexOf(rawTo) : dateIndexInRange(days, rawTo));
                      const startPct = (fromIdx / 60) * 100;
                      const widthPct = ((Math.max(toIdx, fromIdx) - fromIdx + 1) / 60) * 100;
                      return (
                        <button
                          key={a.id}
                          title={`${a.absence_type}: ${toDisplay(a.date_from)} — ${toDisplay(a.date_to)}${a.note ? ` (${a.note})` : ''}`}
                          className={cn('absolute top-0.5 h-4 rounded-sm opacity-90 hover:opacity-100', DAY_COLORS[a.absence_type])}
                          style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                          onClick={() => setEditing(a)}
                        />
                      );
                    })}
                    <button
                      className="absolute right-0 top-0 h-full w-5 rounded-r bg-transparent text-muted-foreground opacity-0 hover:bg-accent hover:opacity-100"
                      title="Добавить отсутствие"
                      onClick={() => setCreatingFor(emp.id)}
                    >
                      <Plus className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <AbsenceFormSheet
        open={editing !== null || creatingFor !== null}
        absence={editing}
        presetEmployeeId={creatingFor}
        employees={activeEmps}
        onClose={() => {
          setEditing(null);
          setCreatingFor(null);
        }}
        onSaved={() => {
          setEditing(null);
          setCreatingFor(null);
          reload();
          onChanged();
        }}
        onDelete={(id) => setConfirmDelete(id)}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Удалить запись об отсутствии?"
        danger
        confirmLabel="Удалить"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete !== null) void removeAbsence(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

function dateIndexInRange(days: string[], iso: string): number {
  // ближайший день в окне (если дата вне точного совпадения)
  for (let i = 0; i < days.length; i++) if (days[i] >= iso) return i;
  return days.length - 1;
}

function AbsenceFormSheet({
  open,
  absence,
  presetEmployeeId,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean;
  absence: AbsenceView | null;
  presetEmployeeId: number | null;
  employees: EmployeeView[];
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: number) => void;
}) {
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [type, setType] = useState<string>('отпуск');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [key, setKey] = useState('');

  // Инициализация формы при открытии (по простому ключу).
  const currentKey = `${open ? 'o' : 'c'}:${absence?.id ?? 'new'}:${presetEmployeeId ?? 0}`;
  if (open && currentKey !== key) {
    setKey(currentKey);
    setEmployeeId(absence?.employee_id ?? presetEmployeeId ?? employees[0]?.id ?? 0);
    setType(absence?.absence_type ?? 'отпуск');
    setFrom(absence?.date_from ?? todayIso());
    setTo(absence?.date_to ?? todayIso());
    setNote(absence?.note ?? '');
  }

  const save = async () => {
    if (!from || !to) {
      toast('error', 'Укажите даты начала и окончания');
      return;
    }
    if (to < from) {
      toast('error', 'Дата окончания раньше даты начала');
      return;
    }
    const payload = { employee_id: employeeId, absence_type: type as never, date_from: from, date_to: to, note };
    try {
      if (absence) await api.absences.update(absence.id, payload);
      else await api.absences.create(payload);
      onSaved();
      toast('success', 'Сохранено');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={absence ? 'Отсутствие' : 'Новое отсутствие'}>
      <div className="grid gap-4">
        <Field label="Сотрудник">
          <Select value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value))}>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Тип">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {ABSENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="С">
            <DateField value={from} onChange={setFrom} />
          </Field>
          <Field label="По">
            <DateField value={to} onChange={setTo} />
          </Field>
        </div>
        <Field label="Примечание">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: отпуск без содержания" />
        </Field>
        <div className="flex justify-between">
          {absence ? (
            <Button variant="destructive" onClick={() => onDelete(absence.id)}>
              <X className="h-4 w-4" /> Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={() => void save()}>Сохранить</Button>
          </div>
        </div>
        <Badge tone="gray">Подсказка: «прочее» скрывает сотрудника из строки «на рабочем месте», но не влияет на задачи.</Badge>
      </div>
    </Sheet>
  );
}
