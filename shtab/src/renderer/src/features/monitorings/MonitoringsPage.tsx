// Раздел «Мониторинги»: главный смысл — видеть, КТО ЧТО делает (ТЗ п.5.2).
// Три вида: по сотрудникам (группировка), плоский список, матрица «сотрудники × типы».

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, Pencil, Plus } from 'lucide-react';
import type { MonitoringView } from '@/shared/types';
import { MONITORING_STATUSES } from '@/shared/types';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore, type OpenCardEvent, type StoreCtx } from '@/renderer/src/lib/store';
import { useLoad } from '@/renderer/src/lib/useLoad';
import { fmtDate } from '@/renderer/src/lib/dates';
import { Badge, Button, Card, EmptyState, Spinner } from '@/renderer/src/ui/primitives';
import { Sheet, ConfirmDialog } from '@/renderer/src/ui/dialog';
import { FilterRow, RedFlag, Segmented, StatusDot } from '@/renderer/src/ui/display';
import { Select } from '@/renderer/src/ui/radix';
import { DialogContent, DialogRoot } from '@/renderer/src/ui/dialog';
import { MonitoringForm, emptyMonitoring, toMonitoringInput } from './MonitoringForm';

type View = 'byEmployee' | 'flat' | 'matrix';

function statusTone(s: string): 'blue' | 'gray' | 'green' | 'neutral' | 'yellow' {
  if (s === 'в работе') return 'blue';
  if (s === 'выполнено') return 'green';
  if (s === 'приостановлено') return 'yellow';
  return 'gray';
}

function MonitoringRow({ m, onOpen }: { m: MonitoringView; onOpen: (id: number) => void }) {
  const store = useStore();
  const emp = store.employeeById.get(m.employee_id);
  return (
    <tr
      className={`cursor-pointer border-b last:border-0 transition-theme hover:bg-accent/60 ${m.deputy_active ? 'bg-violet-500/5' : ''} ${m.red_flag ? 'bg-red-500/10' : ''}`}
      onClick={() => onOpen(m.id)}
    >
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {m.red_flag && <RedFlag />}
          <span className="font-medium">{m.name}</span>
        </div>
      </td>
      <td className="px-3 py-2"><Badge tone="neutral">{m.type_name}</Badge></td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1.5">
          {emp && <StatusDot status={emp.status} />}
          {m.employee_name}
        </span>
      </td>
      <td className="px-3 py-2">{m.deadline ? fmtDate(m.deadline) : '—'}</td>
      <td className="px-3 py-2"><Badge tone={statusTone(m.status)}>{m.status}</Badge></td>
      <td className="px-3 py-2">
        {m.deputy_name && (
          <Badge tone={m.deputy_active ? 'purple' : 'gray'} title={m.deputy_from ? `${fmtDate(m.deputy_from)} — ${fmtDate(m.deputy_to)}` : undefined}>
            дублёр: {m.deputy_name}
          </Badge>
        )}
      </td>
    </tr>
  );
}

export function MonitoringsPage() {
  const store = useStore();
  const [view, setView] = useState<View>('byEmployee');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [empFilter, setEmpFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [card, setCard] = useState<MonitoringView | null>(null);
  const [formInSheet, setFormInSheet] = useState<{ id: number | null; initial: ReturnType<typeof emptyMonitoring> } | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);

  // Открытие карточки из поиска/дашборда.
  useEffect(() => {
    return store.subscribeOpenCard((e: OpenCardEvent) => {
      if (e.kind === 'monitoring') setOpenId(e.id);
    });
  }, [store]);

  useEffect(() => {
    if (openId == null) {
      setCard(null);
      return;
    }
    api.monitoringGet(openId)
      .then(setCard)
      .catch((e: unknown) => toast.error(errText(e)));
  }, [openId, store.version]);

  const loaded = useLoadMonitorings(includeArchived, typeFilter, empFilter, statusFilter);

  const list = useMemo(() => {
    let l = loaded;
    const q = query.trim().toLowerCase();
    if (q) l = l.filter((m) => [m.name, m.type_name, m.employee_name, m.deputy_name ?? '', m.note].some((f) => f.toLowerCase().includes(q)));
    return l;
  }, [loaded, query]);

  const grouped = useMemo(() => {
    const map = new Map<number, MonitoringView[]>();
    for (const m of list) {
      const arr = map.get(m.employee_id) ?? [];
      arr.push(m);
      map.set(m.employee_id, arr);
    }
    return [...map.entries()].sort((a, b) => {
      const na = store.employeeById.get(a[0])?.full_name ?? '';
      const nb = store.employeeById.get(b[0])?.full_name ?? '';
      return na.localeCompare(nb, 'ru');
    });
  }, [list, store.employeeById]);

  const archive = async (id: number) => {
    try {
      await api.monitoringArchive(id);
      store.bump();
      toast.success('Мониторинг перемещён в архив');
      setOpenId(null);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setConfirmArchiveId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Мониторинги</h1>
        <div className="flex items-center gap-2">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'byEmployee', label: 'По сотрудникам' },
              { value: 'flat', label: 'Список' },
              { value: 'matrix', label: 'Матрица' },
            ]}
          />
          <Button size="sm" onClick={() => setFormInSheet({ id: null, initial: emptyMonitoring() })}>
            <Plus className="h-4 w-4" /> Мониторинг
          </Button>
        </div>
      </div>

      <FilterRow query={query} onQuery={setQuery} placeholder="Фильтр по названию, исполнителю, примечанию…">
        <Select
          value={typeFilter}
          onValueChange={setTypeFilter}
          options={[{ value: '__all', label: 'Все типы' }, ...store.taskTypes.map((t) => ({ value: String(t.id), label: t.name }))]}
          className="w-40"
          placeholder="Все типы"
        />
        <Select
          value={empFilter}
          onValueChange={setEmpFilter}
          options={[{ value: '__all', label: 'Все исполнители' }, ...store.employees.filter((e) => !e.archived).map((e) => ({ value: String(e.id), label: e.full_name }))]}
          className="w-48"
          placeholder="Все исполнители"
        />
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[{ value: '__all', label: 'Любой статус' }, ...MONITORING_STATUSES.map((s) => ({ value: s, label: s }))]}
          className="w-40"
          placeholder="Любой статус"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} className="h-4 w-4 accent-current" />
          Архив
        </label>
      </FilterRow>

      {list.length === 0 ? (
        <EmptyState
          title="Пока пусто — добавьте первый мониторинг"
          hint="Мониторинг — это задача наблюдения, закреплённая за сотрудником. Здесь видно, кто что ведёт и кого дублируют."
          action={<Button onClick={() => setFormInSheet({ id: null, initial: emptyMonitoring() })}><Plus className="h-4 w-4" /> Добавить мониторинг</Button>}
        />
      ) : view === 'byEmployee' ? (
        <div className="space-y-4">
          {grouped.map(([empId, mons]) => {
            const emp = store.employeeById.get(empId);
            return (
              <Card key={empId} className="overflow-hidden">
                <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                  {emp && <StatusDot status={emp.status} />}
                  <span className="text-sm font-semibold">{emp?.full_name ?? 'Неизвестный сотрудник'}</span>
                  <span className="text-xs text-muted-foreground">{emp?.position || emp?.department_name || ''}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{mons.length} шт.</span>
                </div>
                <table className="shtab-table w-full text-sm">
                  <tbody>
                    {mons.map((m) => (
                      <MonitoringRow key={m.id} m={m} onOpen={setOpenId} />
                    ))}
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>
      ) : view === 'flat' ? (
        <Card className="overflow-hidden">
          <table className="shtab-table w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Название</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Исполнитель</th>
                <th className="px-3 py-2 font-medium">Срок</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Дублёр</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <MonitoringRow key={m.id} m={m} onOpen={setOpenId} />
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <MatrixView list={list} store={store} onOpen={setOpenId} />
      )}

      {/* Карточка мониторинга — выдвижная панель */}
      <Sheet
        open={openId != null && card != null}
        onClose={() => setOpenId(null)}
        title={card?.name ?? 'Мониторинг'}
        headerExtra={
          card && (
            <>
              <Button size="sm" variant="outline" onClick={() => setFormInSheet({ id: card.id, initial: toMonitoringInput(card) })}>
                <Pencil className="h-4 w-4" /> Изменить
              </Button>
              {card.status !== 'архив' && (
                <Button size="sm" variant="ghost" onClick={() => setConfirmArchiveId(card.id)}>
                  <Archive className="h-4 w-4" /> В архив
                </Button>
              )}
            </>
          )
        }
      >
        {card == null ? (
          <Spinner />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{card.type_name}</Badge>
              <Badge tone={statusTone(card.status)}>{card.status}</Badge>
              {card.red_flag && <RedFlag />}
            </div>
            <dl className="grid grid-cols-[140px_1fr] gap-y-2">
              <dt className="text-muted-foreground">Исполнитель</dt>
              <dd>{card.employee_name}</dd>
              <dt className="text-muted-foreground">Срок</dt>
              <dd>{card.deadline ? fmtDate(card.deadline) : 'не задан'}</dd>
              <dt className="text-muted-foreground">Дублёр</dt>
              <dd>
                {card.deputy_name ? (
                  <span className="inline-flex items-center gap-2">
                    <Badge tone={card.deputy_active ? 'purple' : 'gray'}>{card.deputy_name}</Badge>
                    {card.deputy_from && <span className="text-xs text-muted-foreground">{fmtDate(card.deputy_from)} — {fmtDate(card.deputy_to)}</span>}
                  </span>
                ) : (
                  'не назначен'
                )}
              </dd>
              <dt className="text-muted-foreground">Примечание</dt>
              <dd className="whitespace-pre-wrap">{card.note || '—'}</dd>
            </dl>
            {card.red_flag && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs">
                Исполнитель сейчас отсутствует, а дублёр не назначен. Назначьте дублёра кнопкой «Изменить».
              </div>
            )}
          </div>
        )}
      </Sheet>

      {/* Форма создания/редактирования — модальное окно */}
      <DialogRoot open={formInSheet != null}>
        <DialogContent title={formInSheet?.id != null ? 'Редактировать мониторинг' : 'Новый мониторинг'}>
          {formInSheet && (
            <MonitoringForm
              monitoringId={formInSheet.id}
              initial={formInSheet.initial}
              onSaved={() => {
                setFormInSheet(null);
                void store.refreshRefs();
              }}
              onCancel={() => setFormInSheet(null)}
            />
          )}
        </DialogContent>
      </DialogRoot>

      <ConfirmDialog
        open={confirmArchiveId != null}
        onConfirm={() => confirmArchiveId != null && void archive(confirmArchiveId)}
        onCancel={() => setConfirmArchiveId(null)}
        title="Переместить в архив?"
        message="Мониторинг будет скрыт из списков (мягкое удаление, данные сохранятся)."
        confirmLabel="В архив"
      />
    </div>
  );
}

/** Матрица «сотрудники × типы задач» с чипами в ячейках. */
function MatrixView({ list, store, onOpen }: { list: MonitoringView[]; store: StoreCtx; onOpen: (id: number) => void }) {
  const types = store.taskTypes.filter((t) => t.active);
  const employeeIds = useMemo(() => [...new Set(list.map((m) => m.employee_id))], [list]);
  const employees = employeeIds
    .map((id) => store.employeeById.get(id))
    .filter((e): e is NonNullable<typeof e> => e != null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'));

  if (employees.length === 0) return <EmptyState title="Нет данных для матрицы" />;

  return (
    <Card className="overflow-x-auto">
      <table className="shtab-table w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Сотрудник</th>
            {types.map((t) => (
              <th key={t.id} className="px-3 py-2 font-medium">{t.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} className="border-b last:border-0">
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <StatusDot status={emp.status} />
                  {emp.full_name}
                </span>
              </td>
              {types.map((t) => {
                const cells = list.filter((m) => m.employee_id === emp.id && m.type_id === t.id);
                return (
                  <td key={t.id} className="px-3 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {cells.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => onOpen(m.id)}
                          className={`max-w-[180px] truncate rounded-full border px-2 py-0.5 text-xs transition-theme hover:shadow ${m.red_flag ? 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400' : m.deputy_active ? 'border-violet-500/40 bg-violet-500/10' : 'bg-secondary'}`}
                          title={m.name}
                        >
                          {m.name}
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

// Хук загрузки списка мониторингов.
function useLoadMonitorings(includeArchived: boolean, typeFilter: string | null, empFilter: string | null, statusFilter: string | null): MonitoringView[] {
  const store = useStore();
  const { data } = useLoad<MonitoringView[]>(
    () =>
      api.monitoringList({
        includeArchived,
        typeId: typeFilter && typeFilter !== '__all' ? Number(typeFilter) : null,
        employeeId: empFilter && empFilter !== '__all' ? Number(empFilter) : null,
        status: statusFilter && statusFilter !== '__all' ? statusFilter : null,
      }),
    [includeArchived, typeFilter, empFilter, statusFilter, store.version]
  );
  return data ?? [];
}
