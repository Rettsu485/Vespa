// Раздел «ЭДО» (ТЗ п.5.3): плотная таблица журнала документов с цветной полосой контроля,
// разворачиванием строки, двойным кликом → карточка в выдвижной панели, снятием с контроля.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { EdoDocumentView, WorkLogEntry } from '@/shared/types';
import { APPROVAL_STATUSES, CONTROL_TYPES } from '@/shared/types';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore, type OpenCardEvent } from '@/renderer/src/lib/store';
import { useLoad } from '@/renderer/src/lib/useLoad';
import { fmtDate } from '@/renderer/src/lib/dates';
import { Badge, Button, Card, EmptyState, Spinner } from '@/renderer/src/ui/primitives';
import { ConfirmDialog, DialogRoot, DialogContent } from '@/renderer/src/ui/dialog';
import { DeadlineBadge, FilterRow } from '@/renderer/src/ui/display';
import { Select } from '@/renderer/src/ui/radix';
import { DayHeader } from '@/renderer/src/ui/workLogPanel';
import { EdoCard } from './EdoCard';
import { EdoForm, emptyEdo, toEdoInput } from './EdoForm';

/** Сортировка по умолчанию: срок по возрастанию; снятые с контроля — в конец (ТЗ п.5.3). */
function defaultSort(list: EdoDocumentView[]): EdoDocumentView[] {
  return [...list].sort((a, b) => {
    if (a.off_control !== b.off_control) return a.off_control ? 1 : -1;
    const da = a.deadline ?? '9999-12-31';
    const db = b.deadline ?? '9999-12-31';
    if (da !== db) return da < db ? -1 : 1;
    return a.doc_number.localeCompare(b.doc_number, 'ru');
  });
}

type SortKey = 'doc_number' | 'summary' | 'responsible' | 'control' | 'deadline' | 'days_left' | 'approval';

function sortList(list: EdoDocumentView[], key: SortKey, dir: 1 | -1): EdoDocumentView[] {
  const val = (d: EdoDocumentView): string | number => {
    switch (key) {
      case 'doc_number': return d.doc_number;
      case 'summary': return d.summary;
      case 'responsible': return d.responsible_name ?? '';
      case 'control': return d.control_type;
      case 'deadline': return d.deadline ?? '9999-12-31';
      case 'days_left': return d.days_left ?? 99999;
      case 'approval': return d.approval_status;
    }
  };
  return [...list].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'ru') * dir;
  });
}

export function EdoPage() {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [controlFilter, setControlFilter] = useState<string | null>(null);
  const [offFilter, setOffFilter] = useState<'all' | 'on' | 'off'>('all');
  const [respFilter, setRespFilter] = useState<string | null>(null);
  const [apprFilter, setApprFilter] = useState<string | null>(null);
  const [burningOnly, setBurningOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState<{ id: number | null; initial: ReturnType<typeof emptyEdo> } | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);

  // Открытие карточки из поиска/дашборда.
  useEffect(() => {
    return store.subscribeOpenCard((e: OpenCardEvent) => {
      if (e.kind === 'edo') setOpenId(e.id);
    });
  }, [store]);

  const loaded = useLoad<EdoDocumentView[]>(
    () =>
      api.edoList({
        controlType: controlFilter && controlFilter !== '__all' ? controlFilter : null,
        offControl: offFilter,
        responsibleId: respFilter && respFilter !== '__all' ? Number(respFilter) : null,
        approvalStatus: apprFilter && apprFilter !== '__all' ? apprFilter : null,
        burning: burningOnly,
        includeArchived,
      }),
    [controlFilter, offFilter, respFilter, apprFilter, burningOnly, includeArchived, store.version]
  );

  const list = useMemo(() => {
    let l = loaded ?? [];
    const q = query.trim().toLowerCase();
    if (q) {
      l = l.filter((d) =>
        [d.doc_number, d.summary, d.instruction, d.participants, d.sub_resolution, d.responsible_name ?? ''].some((f) =>
          f.toLowerCase().includes(q)
        )
      );
    }
    if (sortKey === 'deadline' && sortDir === 1) return defaultSort(l);
    return sortList(l, sortKey, sortDir);
  }, [loaded, query, sortKey, sortDir]);

  const th = (key: SortKey, label: string, className = '') => (
    <th
      className={`cursor-pointer select-none px-3 py-2 font-medium transition-theme hover:text-foreground ${className}`}
      onClick={() => {
        if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
        else {
          setSortKey(key);
          setSortDir(1);
        }
      }}
    >
      {label}
      {sortKey === key && <span className="ml-1 text-[10px]">{sortDir === 1 ? '▲' : '▼'}</span>}
    </th>
  );

  const setOffControl = async (id: number, off: boolean) => {
    try {
      await api.edoSetOffControl(id, off);
      store.bump();
      toast.success(off ? 'Документ снят с контроля' : 'Документ возвращён на контроль');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const archive = async (id: number) => {
    try {
      await api.edoArchive(id);
      store.bump();
      setOpenId(null);
      toast.success('Документ перемещён в архив');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setConfirmArchiveId(null);
    }
  };

  const controlLabels: Record<(typeof CONTROL_TYPES)[number], string> = {
    red: store.settings.controlRedName,
    green: store.settings.controlGreenName,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">ЭДО</h1>
        <Button size="sm" onClick={() => setForm({ id: null, initial: emptyEdo() })}>
          <Plus className="h-4 w-4" /> Документ
        </Button>
      </div>

      <FilterRow query={query} onQuery={setQuery} placeholder="Фильтр по номеру, содержанию, поручению, участникам…">
        <Select
          value={controlFilter}
          onValueChange={setControlFilter}
          options={[{ value: '__all', label: 'Любой контроль' }, ...CONTROL_TYPES.map((t) => ({ value: t, label: controlLabels[t] }))]}
          className="w-36"
        />
        <Select
          value={offFilter}
          onValueChange={(v) => setOffFilter((v ?? 'all') as typeof offFilter)}
          options={[
            { value: 'all', label: 'На контроле и снятые' },
            { value: 'on', label: 'На контроле' },
            { value: 'off', label: 'Снятые с контроля' },
          ]}
          className="w-44"
        />
        <Select
          value={respFilter}
          onValueChange={setRespFilter}
          options={[
            { value: '__all', label: 'Все ответственные' },
            ...store.employees.filter((e) => !e.archived).map((e) => ({ value: String(e.id), label: e.full_name })),
          ]}
          className="w-44"
        />
        <Select
          value={apprFilter}
          onValueChange={setApprFilter}
          options={[{ value: '__all', label: 'Любой лист' }, ...APPROVAL_STATUSES.map((s) => ({ value: s, label: s }))]}
          className="w-40"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={burningOnly} onChange={(e) => setBurningOnly(e.target.checked)} className="h-4 w-4 accent-current" />
          Горящие
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} className="h-4 w-4 accent-current" />
          Архив
        </label>
      </FilterRow>

      {loaded == null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState
          title="Пока пусто — добавьте первый документ"
          hint="Здесь ведётся личный журнал документов ЭДО, которые вы сопровождаете."
          action={<Button onClick={() => setForm({ id: null, initial: emptyEdo() })}><Plus className="h-4 w-4" /> Добавить документ</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="shtab-table w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {th('doc_number', '№ документа')}
                {th('summary', 'Краткое содержание')}
                {th('responsible', 'Ответственный')}
                {th('control', 'Контроль')}
                {th('deadline', 'Срок')}
                {th('days_left', 'Осталось дней')}
                {th('approval', 'Лист согласования')}
                <th className="px-3 py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <EdoRow
                  key={d.id}
                  d={d}
                  expanded={expandedId === d.id}
                  onToggleExpand={() => setExpandedId((cur) => (cur === d.id ? null : d.id))}
                  onOpen={() => setOpenId(d.id)}
                  onOffControl={() => void setOffControl(d.id, !d.off_control)}
                  controlLabel={controlLabels[d.control_type]}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Карточка — выдвижная панель (двойной клик по строке или кнопка «Открыть») */}
      <EdoCard
        documentId={openId}
        onClose={() => setOpenId(null)}
        onEdit={(doc) => {
          setOpenId(null);
          setForm({ id: doc.id, initial: toEdoInput(doc) });
        }}
        onArchive={(id) => setConfirmArchiveId(id)}
      />

      {/* Форма создания/редактирования */}
      <DialogRoot open={form != null}>
        <DialogContent title={form?.id != null ? 'Редактировать документ' : 'Новый документ ЭДО'} wide>
          {form && (
            <EdoForm
              documentId={form.id}
              initial={form.initial}
              onSaved={() => {
                setForm(null);
                store.bump();
              }}
              onCancel={() => setForm(null)}
            />
          )}
        </DialogContent>
      </DialogRoot>

      <ConfirmDialog
        open={confirmArchiveId != null}
        onConfirm={() => confirmArchiveId != null && void archive(confirmArchiveId)}
        onCancel={() => setConfirmArchiveId(null)}
        title="Переместить в архив?"
        message="Документ будет скрыт из журналов (мягкое удаление, данные сохранятся)."
        confirmLabel="В архив"
      />
    </div>
  );
}

function EdoRow({
  d,
  expanded,
  onToggleExpand,
  onOpen,
  onOffControl,
  controlLabel,
}: {
  d: EdoDocumentView;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpen: () => void;
  onOffControl: () => void;
  controlLabel: string;
}) {
  const [log, setLog] = useState<WorkLogEntry[] | null>(null);
  const store = useStore();

  // Лень: загрузка журнала только при разворачивании строки.
  useEffect(() => {
    if (!expanded) {
      setLog(null);
      return;
    }
    let alive = true;
    api.workLogList('edo', d.id).then((entries) => {
      if (alive) setLog(entries);
    });
    return () => {
      alive = false;
    };
  }, [expanded, d.id]);

  const dim = d.off_control || d.archived ? 'opacity-60' : '';

  return (
    <>
      <tr
        className={`group cursor-pointer border-b last:border-0 transition-theme hover:bg-accent/50 ${dim}`}
        onDoubleClick={onOpen}
        onClick={onToggleExpand}
        title="Клик — развернуть подробности, двойной клик — карточка"
      >
        <td className="relative px-3 py-2 pl-5">
          <span className={`absolute left-0 top-0 h-full w-1 ${d.control_type === 'red' ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <span className="inline-flex items-center gap-1">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />}
            {d.resolved_url ? (
              <a
                href={d.resolved_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {d.doc_number}
              </a>
            ) : (
              <span className="font-medium">{d.doc_number}</span>
            )}
          </span>
        </td>
        <td className="max-w-[320px] truncate px-3 py-2" title={d.summary}>{d.summary || '—'}</td>
        <td className="px-3 py-2">{d.responsible_name ?? '—'}</td>
        <td className="px-3 py-2"><Badge tone={d.control_type === 'red' ? 'red' : 'green'}>{controlLabel}</Badge></td>
        <td className="px-3 py-2">{d.deadline ? fmtDate(d.deadline) : '—'}</td>
        <td className="px-3 py-2"><DeadlineBadge daysLeft={d.days_left} offControl={d.off_control} /></td>
        <td className="px-3 py-2">
          {d.approval_status ? <Badge tone="blue">{d.approval_status}</Badge> : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {!d.off_control && !d.archived && (
              <Button size="sm" variant="ghost" onClick={onOffControl} title="Снять с контроля">
                Снять
              </Button>
            )}
            {d.off_control && (
              <Button size="sm" variant="ghost" onClick={onOffControl} title="Вернуть на контроль">
                Вернуть
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onOpen} title="Открыть карточку">
              Открыть
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/20">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="text-muted-foreground">Поручение:</span> {d.instruction || '—'}</div>
              <div><span className="text-muted-foreground">Участники:</span> {d.participants || '—'}</div>
              <div><span className="text-muted-foreground">Подрезолюция:</span> {d.sub_resolution || '—'}</div>
              <div>
                <span className="text-muted-foreground">Лист согласования:</span>{' '}
                {d.approval_number ? (
                  d.approval_url ? (
                    <a href={d.approval_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                      {d.approval_number}
                    </a>
                  ) : (
                    d.approval_number
                  )
                ) : (
                  '—'
                )}
                {d.approval_status && ` (${d.approval_status})`}
              </div>
              {d.off_control_date && <div><span className="text-muted-foreground">Снят с контроля:</span> {fmtDate(d.off_control_date)}</div>}
              <div>
                <span className="text-muted-foreground">Ответственный:</span> {d.responsible_name ?? '—'}
                {d.responsible_id != null && (
                  <button
                    className="ml-2 text-xs text-primary underline-offset-4 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.emitOpenCard({ kind: 'employee', id: d.responsible_id as number });
                    }}
                  >
                    к сотруднику
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <DayHeader>Проведённая работа</DayHeader>
              {log == null ? (
                <div className="text-xs text-muted-foreground">Загрузка…</div>
              ) : log.length === 0 ? (
                <div className="text-xs text-muted-foreground">Записей пока нет — добавьте их в карточке (двойной клик по строке).</div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {log.map((en) => (
                    <li key={en.id} className="flex gap-2">
                      <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(en.log_date)}</span>
                      <span className="whitespace-pre-wrap">{en.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
