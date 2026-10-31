// Модуль «Мониторинги»: группировка по сотрудникам (основной вид), плоский список, матрица сотрудники×типы.
// Фильтры по типу/исполнителю/статусу; подсветка дублёров и красных флагов; карточка в выдвижной панели.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { MonitoringView } from '@shared/types';
import { MONITORING_STATUSES } from '@shared/types';
import { Badge, Button, Card, EmptyState, Field, Input, SegmentedControl, Select, Sheet, Spinner, Textarea, useToast } from '@/components/ui';
import { DeadlineBadge, monitoringStatusTone } from '@/components/badges';
import { DateField } from '@/components/DateField';
import { toDisplay } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Flag, Pencil, Plus, Archive, Users } from 'lucide-react';

type ViewMode = 'grouped' | 'flat' | 'matrix';

export function MonitoringsPage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('grouped');
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [empFilter, setEmpFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [formId, setFormId] = useState<number | 'new' | null>(null);

  const cardId = Number(params.get('monitoring')) || null;

  const { data: monitorings, loading, reload } = useAsync(
    () => api.monitorings.list({ typeId: typeFilter, employeeId: empFilter, status: (statusFilter as never) ?? null, includeArchived: showArchived }),
    [typeFilter, empFilter, statusFilter, showArchived],
  );
  const { data: employees } = useAsync(() => api.employees.list({ includeArchived: false }), []);
  const { data: taskTypes } = useAsync(() => api.taskTypes.list(), []);

  const filtered = useMemo(() => {
    const list = monitorings ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((m) => m.name.toLowerCase().includes(q) || m.type_name.toLowerCase().includes(q) || m.employee_name.toLowerCase().includes(q));
  }, [monitorings, query]);

  const byEmployee = useMemo(() => {
    const map = new Map<number, MonitoringView[]>();
    filtered.forEach((m) => {
      const arr = map.get(m.employee_id) ?? [];
      arr.push(m);
      map.set(m.employee_id, arr);
    });
    return [...map.entries()].sort((a, b) => a[1][0].employee_name.localeCompare(b[1][0].employee_name, 'ru'));
  }, [filtered]);

  const openCard = (id: number | null) => {
    const p = new URLSearchParams(params);
    if (id === null) p.delete('monitoring');
    else p.set('monitoring', String(id));
    setParams(p);
  };

  const card = (monitorings ?? []).find((m) => m.id === cardId) ?? null;

  const archive = async (id: number) => {
    try {
      await api.monitorings.archive(id);
      reload();
      openCard(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Мониторинги</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={[
              { value: 'grouped', label: 'По сотрудникам' },
              { value: 'flat', label: 'Список' },
              { value: 'matrix', label: 'Матрица' },
            ]}
            value={view}
            onChange={setView}
          />
          <Select value={typeFilter ?? 0} onChange={(e) => setTypeFilter(Number(e.target.value) || null)} className="w-36">
            <option value={0}>Все типы</option>
            {(taskTypes ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <Select value={empFilter ?? 0} onChange={(e) => setEmpFilter(Number(e.target.value) || null)} className="w-44">
            <option value={0}>Все исполнители</option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </Select>
          <Select value={statusFilter ?? ''} onChange={(e) => setStatusFilter(e.target.value || null)} className="w-36">
            <option value="">Все статусы</option>
            {MONITORING_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Фильтр…" className="w-40" />
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Архив
          </label>
          <Button onClick={() => setFormId('new')}>
            <Plus className="h-4 w-4" /> Мониторинг
          </Button>
        </div>
      </div>

      {loading ? <Spinner /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="Пока пусто — добавьте мониторинги." hint="Главный смысл раздела: видеть, КТО ЧТО делает." />
      ) : null}

      {!loading && filtered.length > 0 && view === 'grouped' ? (
        <div className="grid gap-3">
          {byEmployee.map(([empId, list]) => (
            <Card key={empId} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" />
                {list[0].employee_name}
                <span className="text-xs font-normal text-muted-foreground">({list.length})</span>
              </div>
              <div className="divide-y">
                {list.map((m) => (
                  <MonitoringRow key={m.id} m={m} onOpen={() => openCard(m.id)} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && filtered.length > 0 && view === 'flat' ? (
        <Card className="divide-y overflow-hidden">
          {filtered.map((m) => (
            <MonitoringRow key={m.id} m={m} onOpen={() => openCard(m.id)} showEmployee />
          ))}
        </Card>
      ) : null}

      {!loading && filtered.length > 0 && view === 'matrix' ? (
        <MatrixView monitorings={filtered} types={taskTypes ?? []} employees={employees ?? []} onOpen={openCard} />
      ) : null}

      {/* Карточка мониторинга */}
      <Sheet open={card !== null} onClose={() => openCard(null)} title={card?.name ?? ''} wide>
        {card ? (
          <div className="grid gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{card.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge tone="neutral">{card.type_name}</Badge>
                  <Badge tone={monitoringStatusTone(card.status)}>{card.status}</Badge>
                  {card.red_flag ? <Badge tone="red"><Flag className="h-3 w-3" /> нет дублёра при отсутствии</Badge> : null}
                  {card.deputy_name ? <Badge tone={card.deputy_active ? 'violet' : 'gray'}>дублёр: {card.deputy_name}</Badge> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setFormId(card.id)}>
                  <Pencil className="h-4 w-4" /> Изменить
                </Button>
                {card.status !== 'архив' ? (
                  <Button variant="destructive" size="sm" onClick={() => void archive(card.id)}>
                    <Archive className="h-4 w-4" /> В архив
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Info label="Исполнитель" value={card.employee_name} />
              <Info label="Срок" value={card.deadline ? toDisplay(card.deadline) : ''} />
              <Info label="Дублёр" value={card.deputy_name ? `${card.deputy_name}${card.deputy_from ? ` · ${toDisplay(card.deputy_from)}—${card.deputy_to ? toDisplay(card.deputy_to) : ''}` : ''}` : ''} />
              <div>
                <div className="text-xs text-muted-foreground">Осталось дней</div>
                <DeadlineBadge daysLeft={card.deadline ? daysLeftLocal(card.deadline) : null} />
              </div>
            </div>
            <Field label="Примечание">
              <div className="min-h-[60px] whitespace-pre-line rounded-md border bg-background p-3 text-sm">
                {card.note || <span className="text-muted-foreground">Пусто</span>}
              </div>
            </Field>
          </div>
        ) : null}
      </Sheet>

      {/* Форма создания/редактирования */}
      <MonitoringForm
        open={formId !== null}
        monitoringId={typeof formId === 'number' ? formId : null}
        onClose={() => setFormId(null)}
        onSaved={() => {
          setFormId(null);
          reload();
        }}
      />
    </div>
  );
}

function daysLeftLocal(deadlineIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${deadlineIso}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-sm', !value && 'text-muted-foreground/60')}>{value || '—'}</div>
    </div>
  );
}

function MonitoringRow({ m, onOpen, showEmployee }: { m: MonitoringView; onOpen: () => void; showEmployee?: boolean }) {
  return (
    <button
      className={cn(
        'row flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-fast hover:bg-accent/50',
        m.deputy_active && 'bg-violet-500/5',
        m.red_flag && 'bg-red-500/10',
        m.status === 'архив' && 'opacity-50',
      )}
      onClick={onOpen}
    >
      {m.red_flag ? <Flag className="h-4 w-4 shrink-0 text-red-500" /> : <span className="w-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
      {showEmployee ? <span className="hidden w-40 shrink-0 truncate text-xs text-muted-foreground lg:block">{m.employee_name}</span> : null}
      <Badge tone="neutral" className="shrink-0">{m.type_name}</Badge>
      {m.deadline ? <span className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">{toDisplay(m.deadline)}</span> : null}
      {m.deputy_name ? <Badge tone={m.deputy_active ? 'violet' : 'gray'} className="shrink-0">дублёр: {m.deputy_name}</Badge> : null}
      <Badge tone={monitoringStatusTone(m.status)} className="shrink-0">{m.status}</Badge>
    </button>
  );
}

function MatrixView({
  monitorings,
  types,
  employees,
  onOpen,
}: {
  monitorings: MonitoringView[];
  types: { id: number; name: string }[];
  employees: { id: number; full_name: string }[];
  onOpen: (id: number) => void;
}) {
  const activeTypes = types.filter((t) => monitorings.some((m) => m.type_id === t.id));
  const emps = employees.filter((e) => monitorings.some((m) => m.employee_id === e.id));
  return (
    <Card className="overflow-x-auto p-3">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card p-2 text-left text-xs font-semibold text-muted-foreground">Сотрудник \ Тип</th>
            {activeTypes.map((t) => (
              <th key={t.id} className="p-2 text-left text-xs font-semibold text-muted-foreground">{t.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {emps.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="sticky left-0 bg-card p-2 text-sm font-medium whitespace-nowrap">{e.full_name}</td>
              {activeTypes.map((t) => {
                const cells = monitorings.filter((m) => m.employee_id === e.id && m.type_id === t.id);
                return (
                  <td key={t.id} className="p-1 align-top">
                    <div className="flex flex-wrap gap-1">
                      {cells.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => onOpen(m.id)}
                          title={m.name}
                          className={cn(
                            'max-w-[180px] truncate rounded-full border px-2 py-0.5 text-xs transition-colors duration-fast hover:bg-accent',
                            m.red_flag ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400' : 'border-border bg-secondary text-secondary-foreground',
                          )}
                        >
                          {m.red_flag ? '⚑ ' : ''}{m.name}
                        </button>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

const monitoringSchema = z.object({
  name: z.string().trim().min(2, 'Укажите название'),
});

export function MonitoringForm({
  open,
  monitoringId,
  onClose,
  onSaved,
}: {
  open: boolean;
  monitoringId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: employees } = useAsync(() => api.employees.list({ includeArchived: false }), []);
  const { data: taskTypes } = useAsync(() => api.taskTypes.list(), []);
  const { data: existing } = useAsync(
    () => (monitoringId !== null ? api.monitorings.get(monitoringId) : Promise.resolve(null)),
    [monitoringId],
  );

  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState(0);
  const [employeeId, setEmployeeId] = useState(0);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('в работе');
  const [note, setNote] = useState('');
  const [deputyId, setDeputyId] = useState(0);
  const [deputyFrom, setDeputyFrom] = useState<string | null>(null);
  const [deputyTo, setDeputyTo] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const currentKey = `${open ? 'o' : 'c'}:${monitoringId ?? 'new'}:${existing?.id ?? 0}`;
  const [lastKey, setLastKey] = useState('');
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    if (open && existing) {
      setName(existing.name);
      setTypeId(existing.type_id);
      setEmployeeId(existing.employee_id);
      setDeadline(existing.deadline);
      setStatus(existing.status);
      setNote(existing.note);
      setDeputyId(existing.deputy_employee_id ?? 0);
      setDeputyFrom(existing.deputy_from);
      setDeputyTo(existing.deputy_to);
    } else if (open) {
      setName('');
      setTypeId(taskTypes?.[0]?.id ?? 0);
      setEmployeeId(employees?.[0]?.id ?? 0);
      setDeadline(null);
      setStatus('в работе');
      setNote('');
      setDeputyId(0);
      setDeputyFrom(null);
      setDeputyTo(null);
    }
  }

  const save = async () => {
    const parsed = monitoringSchema.safeParse({ name });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? 'Ошибка');
      return;
    }
    if (!typeId || !employeeId) {
      setErr('Выберите тип и исполнителя');
      return;
    }
    const payload = {
      name: name.trim(),
      type_id: typeId,
      employee_id: employeeId,
      deadline,
      note,
      status: status as never,
      deputy_employee_id: deputyId || null,
      deputy_from: deputyId ? deputyFrom : null,
      deputy_to: deputyId ? deputyTo : null,
    };
    try {
      if (monitoringId !== null) await api.monitorings.update(monitoringId, payload);
      else await api.monitorings.create(payload);
      toast('success', 'Сохранено');
      onSaved();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={monitoringId !== null ? 'Редактировать мониторинг' : 'Новый мониторинг'}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Название *" error={err}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Например: Мониторинг паводковой обстановки" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Тип задачи *">
            <Select value={typeId} onChange={(e) => setTypeId(Number(e.target.value))}>
              <option value={0}>Выберите…</option>
              {(taskTypes ?? []).filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Исполнитель *">
            <Select value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value))}>
              <option value={0}>Выберите…</option>
              {(employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Срок">
            <DateField value={deadline} onChange={setDeadline} />
          </Field>
          <Field label="Статус">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {MONITORING_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Примечание">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 text-sm font-medium">Дублирование</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Дублёр">
              <Select value={deputyId} onChange={(e) => setDeputyId(Number(e.target.value))}>
                <option value={0}>Не назначен</option>
                {(employees ?? []).filter((e) => e.id !== employeeId).map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Период с">
              <DateField value={deputyFrom} onChange={setDeputyFrom} />
            </Field>
            <Field label="Период по">
              <DateField value={deputyTo} onChange={setDeputyTo} />
            </Field>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Если исполнитель отсутствует, а дублёр не назначен — строка подсвечивается красным флагом.
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit">Сохранить</Button>
        </div>
      </form>
    </Sheet>
  );
}
