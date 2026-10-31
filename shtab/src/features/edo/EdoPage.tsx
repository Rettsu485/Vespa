// Модуль «ЭДО»: плотная таблица документов с цветной полосой контроля, разворотом строки,
// выдвижной карточкой (Сводка | Проведённая работа | История), снятием с контроля и фильтрами.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { AppSettings, EdoDocumentView } from '@shared/types';
import { APPROVAL_STATUSES } from '@shared/types';
import { Badge, Button, Card, EmptyState, Field, Input, Select, Sheet, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, useToast } from '@/components/ui';
import { DeadlineBadge, approvalStatusTone } from '@/components/badges';
import { DateField } from '@/components/DateField';
import { toDisplay } from '@/lib/dates';
import { WorkLogPanel } from '@/components/worklog';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, ExternalLink, Pencil, Plus, Archive, ShieldOff, ShieldCheck } from 'lucide-react';

export function EdoPage({ settings }: { settings: AppSettings }) {
  const [params, setParams] = useSearchParams();
  const docId = Number(params.get('doc')) || null;

  const [controlFilter, setControlFilter] = useState<string>('');
  const [offFilter, setOffFilter] = useState<'all' | 'on' | 'off'>('all');
  const [respFilter, setRespFilter] = useState<number | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [burningOnly, setBurningOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formId, setFormId] = useState<number | 'new' | null>(null);

  const { data: docs, loading, reload } = useAsync(
    () =>
      api.edo.list({
        controlType: (controlFilter as 'red' | 'green') || null,
        offControl: offFilter,
        responsibleId: respFilter,
        approvalStatus: approvalFilter || null,
        burningOnly,
        includeArchived: showArchived,
      }),
    [controlFilter, offFilter, respFilter, approvalFilter, burningOnly, showArchived],
  );
  const { data: employees } = useAsync(() => api.employees.list({ includeArchived: false }), []);

  const filtered = useMemo(() => {
    const list = docs ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((d) => d.doc_number.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q));
  }, [docs, query]);

  const openDoc = (id: number | null) => {
    const p = new URLSearchParams(params);
    if (id === null) p.delete('doc');
    else p.set('doc', String(id));
    setParams(p);
  };

  const card = (docs ?? []).find((d) => d.id === docId) ?? null;
  const redName = settings.controlRedName;
  const greenName = settings.controlGreenName;

  const toggleOffControl = async (d: EdoDocumentView) => {
    try {
      if (d.off_control) await api.edo.onControl(d.id);
      else await api.edo.offControl(d.id);
      reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">ЭДО</h1>
        <Button onClick={() => setFormId('new')}>
          <Plus className="h-4 w-4" /> Документ
        </Button>
      </div>

      {/* Фильтр-строка */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Select value={controlFilter} onChange={(e) => setControlFilter(e.target.value)} className="w-32">
          <option value="">Контроль: все</option>
          <option value="red">{redName}</option>
          <option value="green">{greenName}</option>
        </Select>
        <Select value={offFilter} onChange={(e) => setOffFilter(e.target.value as 'all' | 'on' | 'off')} className="w-36">
          <option value="all">На контроле и снятые</option>
          <option value="on">Только на контроле</option>
          <option value="off">Только снятые</option>
        </Select>
        <Select value={respFilter ?? 0} onChange={(e) => setRespFilter(Number(e.target.value) || null)} className="w-44">
          <option value={0}>Все ответственные</option>
          {(employees ?? []).map((e) => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </Select>
        <Select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="w-40">
          <option value="">Лист согласования: любой</option>
          {APPROVAL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <input type="checkbox" checked={burningOnly} onChange={(e) => setBurningOnly(e.target.checked)} /> 🔥 Горящие
        </label>
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Архив
        </label>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Фильтр…" className="w-44" />
      </div>

      {loading ? <Spinner /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState title="Пока пусто — добавьте документы ЭДО." hint="Это ваш личный журнал сопровождаемых документов." />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <Card className="overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="w-8 px-2 py-2"></th>
                <th className="w-40 px-2 py-2">№ документа</th>
                <th className="px-2 py-2">Краткое содержание</th>
                <th className="w-40 px-2 py-2">Ответственный</th>
                <th className="w-24 px-2 py-2">Контроль</th>
                <th className="w-24 px-2 py-2">Срок</th>
                <th className="w-36 px-2 py-2">Осталось дней</th>
                <th className="w-32 px-2 py-2">Лист согл.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <DocRows
                  key={d.id}
                  doc={d}
                  expanded={expandedId === d.id}
                  onToggleExpand={() => setExpandedId(expandedId === d.id ? null : d.id)}
                  onOpenCard={() => openDoc(d.id)}
                  redName={redName}
                  greenName={greenName}
                />
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {/* Полная карточка документа */}
      <Sheet open={card !== null} onClose={() => openDoc(null)} title={card ? `Документ ${card.doc_number}` : ''} wide>
        {card ? (
          <DocSheet
            doc={card}
            redName={redName}
            greenName={greenName}
            onEdit={() => setFormId(card.id)}
            onToggleOffControl={() => void toggleOffControl(card)}
            onArchive={async () => {
              await api.edo.archive(card.id);
              openDoc(null);
              reload();
            }}
          />
        ) : null}
      </Sheet>

      <EdoForm
        open={formId !== null}
        docId={typeof formId === 'number' ? formId : null}
        onClose={() => setFormId(null)}
        onSaved={() => {
          setFormId(null);
          reload();
        }}
      />
    </div>
  );
}

function DocRows({
  doc,
  expanded,
  onToggleExpand,
  onOpenCard,
  redName,
  greenName,
}: {
  doc: EdoDocumentView;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenCard: () => void;
  redName: string;
  greenName: string;
}) {
  const { toast } = useToast();
  const stripeColor = doc.control_type === 'red' ? 'bg-red-500' : 'bg-emerald-500';

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const openLink = () => {
    if (doc.link) window.open(doc.link, '_blank');
    else toast('error', 'Ссылка не настроена (см. Настройки → шаблон ссылки)');
  };

  return (
    <>
      <tr
        className={cn(
          'row cursor-pointer border-b transition-colors duration-fast hover:bg-accent/40',
          doc.off_control && 'opacity-50',
          doc.archived && 'opacity-40',
        )}
        onDoubleClick={onOpenCard}
        onClick={onToggleExpand}
      >
        <td className="relative w-8 px-2 py-1.5">
          {/* Цветная полоса типа контроля слева в строке (по ТЗ) */}
          <span className={cn('absolute left-0 top-0 h-full w-1', stripeColor)} />
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </td>
        <td className="px-2 py-1.5">
          <button
            className="inline-flex items-center gap-1 truncate text-primary underline-offset-2 hover:underline"
            onClick={(e) => {
              stop(e);
              openLink();
            }}
            title={doc.link ?? 'Ссылка не задана'}
          >
            {doc.doc_number}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </button>
        </td>
        <td className="truncate px-2 py-1.5">{doc.summary}</td>
        <td className="truncate px-2 py-1.5 text-muted-foreground">{doc.responsible_name ?? '—'}</td>
        <td className="px-2 py-1.5">
          <Badge tone={doc.control_type === 'red' ? 'red' : 'green'}>{doc.control_type === 'red' ? redName : greenName}</Badge>
        </td>
        <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{doc.deadline ? toDisplay(doc.deadline) : '—'}</td>
        <td className="px-2 py-1.5">
          <DeadlineBadge daysLeft={doc.days_left} offControl={doc.off_control} />
        </td>
        <td className="px-2 py-1.5">
          {doc.approval_status ? <Badge tone={approvalStatusTone(doc.approval_status)}>{doc.approval_status}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b bg-muted/20">
          <td colSpan={8} className="px-10 py-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Detail label="Поручение" value={doc.instruction} />
              <Detail label="Участники" value={doc.participants} />
              <Detail label="Подрезолюция" value={doc.sub_resolution} />
              <Detail
                label="Лист согласования"
                value={doc.approval_number}
                link={doc.approval_url || null}
              />
              {doc.off_control ? <Detail label="Снят с контроля" value={toDisplay(doc.off_control_date)} /> : null}
            </div>
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Проведённая работа</div>
              <WorkLogPanel entityType="edo" entityId={doc.id} />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Detail({ label, value, link }: { label: string; value: string; link?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="whitespace-pre-line">
        {value ? (
          link ? (
            <a href={link} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
              {value} <ExternalLink className="inline h-3 w-3" />
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </div>
    </div>
  );
}

function DocSheet({
  doc,
  redName,
  greenName,
  onEdit,
  onToggleOffControl,
  onArchive,
}: {
  doc: EdoDocumentView;
  redName: string;
  greenName: string;
  onEdit: () => void;
  onToggleOffControl: () => void;
  onArchive: () => void;
}) {
  const [tab, setTab] = useState('summary');
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{doc.doc_number}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge tone={doc.control_type === 'red' ? 'red' : 'green'}>{doc.control_type === 'red' ? redName : greenName}</Badge>
            <DeadlineBadge daysLeft={doc.days_left} offControl={doc.off_control} />
            {doc.approval_status ? <Badge tone={approvalStatusTone(doc.approval_status)}>{doc.approval_status}</Badge> : null}
            {doc.archived ? <Badge tone="gray">архив</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Изменить
          </Button>
          <Button variant={doc.off_control ? 'outline' : 'secondary'} size="sm" onClick={onToggleOffControl}>
            {doc.off_control ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
            {doc.off_control ? 'Вернуть на контроль' : 'Снять с контроля'}
          </Button>
          {!doc.archived ? (
            <Button variant="destructive" size="sm" onClick={onArchive}>
              <Archive className="h-4 w-4" /> В архив
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={tab} onChange={setTab}>
        <TabsList>
          <TabsTrigger value="summary">Сводка</TabsTrigger>
          <TabsTrigger value="work">Проведённая работа</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Info label="Краткое содержание" value={doc.summary} />
              <Info label="Ответственный" value={doc.responsible_name ?? ''} />
              <Info label="Срок" value={doc.deadline ? toDisplay(doc.deadline) : ''} />
              <Info label="Снят с контроля" value={doc.off_control ? toDisplay(doc.off_control_date) : ''} />
            </div>
            <Info label="Поручение" value={doc.instruction} multiline />
            <Info label="Участники" value={doc.participants} multiline />
            <Info label="Подрезолюция" value={doc.sub_resolution} multiline />
            <div>
              <div className="text-xs text-muted-foreground">Лист согласования</div>
              <div className="text-sm">
                {doc.approval_number ? (
                  doc.approval_url ? (
                    <a href={doc.approval_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                      {doc.approval_number} <ExternalLink className="inline h-3 w-3" />
                    </a>
                  ) : (
                    doc.approval_number
                  )
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </div>
            </div>
            {doc.link ? (
              <a href={doc.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Открыть документ <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="work">
          <WorkLogPanel entityType="edo" entityId={doc.id} />
        </TabsContent>
        <TabsContent value="history">
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div>Создан: {toDisplay(doc.created_at.slice(0, 10))}</div>
            <div>Обновлён: {toDisplay(doc.updated_at.slice(0, 10))}</div>
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

const edoSchema = z.object({
  doc_number: z.string().trim().min(1, 'Укажите номер документа'),
  summary: z.string().trim().min(2, 'Укажите краткое содержание'),
});

export function EdoForm({
  open,
  docId,
  onClose,
  onSaved,
}: {
  open: boolean;
  docId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: employees } = useAsync(() => api.employees.list({ includeArchived: false }), []);
  const { data: existing } = useAsync(() => (docId !== null ? api.edo.get(docId) : Promise.resolve(null)), [docId]);

  const [f, setF] = useState({
    doc_number: '',
    doc_url: '',
    summary: '',
    instruction: '',
    responsible_id: 0,
    participants: '',
    control_type: 'red' as 'red' | 'green',
    deadline: null as string | null,
    sub_resolution: '',
    approval_number: '',
    approval_url: '',
    approval_status: '' as '' | 'на согласовании' | 'на подписи' | 'подписан',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentKey = `${open ? 'o' : 'c'}:${docId ?? 'new'}:${existing?.id ?? 0}`;
  const [lastKey, setLastKey] = useState('');
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    if (open && existing) {
      setF({
        doc_number: existing.doc_number,
        doc_url: existing.doc_url,
        summary: existing.summary,
        instruction: existing.instruction,
        responsible_id: existing.responsible_id ?? 0,
        participants: existing.participants,
        control_type: existing.control_type,
        deadline: existing.deadline,
        sub_resolution: existing.sub_resolution,
        approval_number: existing.approval_number,
        approval_url: existing.approval_url,
        approval_status: existing.approval_status,
      });
    } else if (open) {
      setF((prev) => ({ ...prev, doc_number: '', doc_url: '', summary: '', instruction: '', participants: '', sub_resolution: '', approval_number: '', approval_url: '', approval_status: '', deadline: null, control_type: 'red', responsible_id: 0 }));
    }
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const parsed = edoSchema.safeParse(f);
    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const issue of parsed.error.issues) flat[String(issue.path[0] ?? 'form')] = issue.message;
      setErrors(flat);
      return;
    }
    setErrors({});
    const payload = { ...f, responsible_id: f.responsible_id || null };
    try {
      if (docId !== null) await api.edo.update(docId, payload);
      else await api.edo.create(payload);
      toast('success', 'Сохранено');
      onSaved();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={docId !== null ? 'Редактировать документ' : 'Новый документ ЭДО'} wide>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="№ документа *" error={errors.doc_number}>
            <Input value={f.doc_number} onChange={(e) => set('doc_number', e.target.value)} autoFocus placeholder="исх. № 123/АМ от …" />
          </Field>
          <Field label="Тип контроля">
            <Select value={f.control_type} onChange={(e) => set('control_type', e.target.value as 'red' | 'green')}>
              <option value="red">Красный</option>
              <option value="green">Зелёный</option>
            </Select>
          </Field>
        </div>
        <Field label="Краткое содержание *" error={errors.summary}>
          <Input value={f.summary} onChange={(e) => set('summary', e.target.value)} placeholder="О чём документ" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ответственный">
            <Select value={f.responsible_id} onChange={(e) => set('responsible_id', Number(e.target.value))}>
              <option value={0}>Не указан</option>
              {(employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Срок">
            <DateField value={f.deadline} onChange={(v) => set('deadline', v)} />
          </Field>
        </div>
        <Field label="Поручение">
          <Textarea value={f.instruction} onChange={(e) => set('instruction', e.target.value)} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Участники (текстом)">
            <Input value={f.participants} onChange={(e) => set('participants', e.target.value)} />
          </Field>
          <Field label="Подрезолюция (кому перенаправлен)">
            <Input value={f.sub_resolution} onChange={(e) => set('sub_resolution', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="№ листа согласования">
            <Input value={f.approval_number} onChange={(e) => set('approval_number', e.target.value)} />
          </Field>
          <Field label="Ссылка на лист">
            <Input value={f.approval_url} onChange={(e) => set('approval_url', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Статус листа">
            <Select value={f.approval_status} onChange={(e) => set('approval_status', e.target.value as never)}>
              <option value="">Не запущен</option>
              {APPROVAL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Ссылка на документ (если шаблон в настройках не задан)">
          <Input value={f.doc_url} onChange={(e) => set('doc_url', e.target.value)} placeholder="https://…" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit">Сохранить</Button>
        </div>
      </form>
    </Sheet>
  );
}
