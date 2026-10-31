// Модуль «Команда»: компактный/полный виды, Список|Дерево по отделам, карточка сотрудника,
// подсветка дней рождения (≤3 дней). Таймлайн отсутствий — отдельный таб.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { EmployeeView } from '@shared/types';
import { Button, Card, EmptyState, Input, SegmentedControl, Spinner, Sheet, Field, ConfirmDialog, useToast, Badge } from '@/components/ui';
import { StatusDot, employeeStatusLabel } from '@/components/badges';
import { toDisplay, plural } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Plus, Pencil, Archive, RotateCcw, ChevronDown, ChevronRight, Search as SearchIcon } from 'lucide-react';
import { AbsenceTimeline } from './AbsenceTimeline';
import { EmployeeForm } from './EmployeeForm';
import { MonitoringMiniList } from './EmployeeMonitorings';

export function TeamPage() {
  const [params] = useSearchParams();
  const { data: employees, loading, reload } = useAsync(() => api.employees.list({ includeArchived: true }), []);

  const [view, setView] = useState<'compact' | 'full'>('compact');
  const [structure, setStructure] = useState<'list' | 'tree'>('list');
  const [tab, setTab] = useState<'people' | 'absences'>('people');
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<EmployeeView | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [cardId, setCardId] = useState<number | null>(Number(params.get('employee')) || null);

  const filtered = useMemo(() => {
    const list = (employees ?? []).filter((e) => (showArchived ? true : !e.archived));
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        (e.department_name ?? '').toLowerCase().includes(q),
    );
  }, [employees, query, showArchived]);

  const cardEmp = (employees ?? []).find((e) => e.id === cardId) ?? null;

  const archive = async (id: number, archived: boolean) => {
    try {
      await api.employees.archive(id, archived);
      reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Команда</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={[
              { value: 'compact', label: 'Компактно' },
              { value: 'full', label: 'Полно' },
            ]}
            value={view}
            onChange={setView}
          />
          <SegmentedControl
            options={[
              { value: 'list', label: 'Список' },
              { value: 'tree', label: 'Дерево' },
            ]}
            value={structure}
            onChange={setStructure}
          />
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Фильтр…" className="w-48 pl-8" />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Архив
          </label>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Сотрудник
          </Button>
        </div>
      </div>

      <SegmentedControl
        options={[
          { value: 'people', label: 'Люди' },
          { value: 'absences', label: 'Отсутствия' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'absences' ? <AbsenceTimeline employees={filtered} onChanged={reload} /> : null}

      {tab === 'people' ? (
        <>
          {loading ? <Spinner /> : null}
          {!loading && filtered.length === 0 ? (
            <EmptyState title="Пока пусто — добавьте сотрудников команды." hint="Кнопка «Сотрудник» выше." />
          ) : null}
          {!loading && filtered.length > 0 ? (
            structure === 'list' ? (
              <Card className="divide-y overflow-hidden">
                {filtered.map((e) => (
                  <EmployeeRow key={e.id} emp={e} view={view} onOpen={() => setCardId(e.id)} />
                ))}
              </Card>
            ) : (
              <DeptTree employees={filtered} view={view} onOpen={(id) => setCardId(id)} />
            )
          ) : null}
        </>
      ) : null}

      {/* Карточка сотрудника — выдвижная панель справа */}
      <Sheet open={cardEmp !== null} onClose={() => setCardId(null)} title={cardEmp?.full_name ?? ''} wide>
        {cardEmp ? (
          <EmployeeCard
            emp={cardEmp}
            onEdit={() => {
              setEditing(cardEmp);
              setFormOpen(true);
            }}
            onArchive={async (arch) => {
              await archive(cardEmp.id, arch);
              setCardId(null);
            }}
          />
        ) : null}
      </Sheet>

      {/* Форма создания/редактирования */}
      <EmployeeForm
        open={formOpen}
        employee={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          reload();
        }}
      />
    </div>
  );
}

export function EmployeeRow({ emp, view, onOpen }: { emp: EmployeeView; view: 'compact' | 'full'; onOpen: () => void }) {
  const birthdaySoon = emp.days_to_birthday !== null && emp.days_to_birthday <= 3 && !emp.is_fired;
  return (
    <button
      className={cn(
        'row flex w-full items-center gap-3 px-4 text-left transition-colors duration-fast hover:bg-accent/50',
        view === 'compact' ? 'py-2' : 'py-3',
        emp.archived && 'opacity-50',
        birthdaySoon && 'bg-amber-400/10',
      )}
      onClick={onOpen}
    >
      <StatusDot status={emp.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{emp.full_name}</span>
          {birthdaySoon ? (
            <Badge tone="orange">
              🎂 {emp.days_to_birthday === 0 ? 'сегодня' : `через ${emp.days_to_birthday ?? 0} ${plural(emp.days_to_birthday ?? 0, 'день', 'дня', 'дней')}`}
            </Badge>
          ) : null}
          {emp.archived ? <Badge tone="gray">архив</Badge> : null}
        </div>
        {view === 'full' ? (
          <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
            <div>{emp.position}</div>
            {emp.functions ? <div className="line-clamp-2">{emp.functions}</div> : null}
            <div>{[emp.email, emp.mobile_phone].filter(Boolean).join(' · ')}</div>
          </div>
        ) : null}
      </div>
      {view === 'compact' ? <span className="hidden w-40 shrink-0 truncate text-xs text-muted-foreground md:block">{emp.department_name ?? ''}</span> : null}
      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{emp.internal_phone}</span>
      <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">{employeeStatusLabel(emp.status)}</span>
    </button>
  );
}

function DeptTree({ employees, view, onOpen }: { employees: EmployeeView[]; view: 'compact' | 'full'; onOpen: (id: number) => void }) {
  const { data: departments } = useAsync(() => api.departments.list(), []);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const roots = useMemo(() => (departments ?? []).filter((d) => d.parent_id === null), [departments]);
  const childrenOf = (parentId: number) => (departments ?? []).filter((d) => d.parent_id === parentId);
  const collectIds = (deptId: number): Set<number> => {
    const ids = new Set<number>([deptId]);
    const stack = [deptId];
    while (stack.length) {
      const cur = stack.pop()!;
      childrenOf(cur).forEach((c) => {
        ids.add(c.id);
        stack.push(c.id);
      });
    }
    return ids;
  };

  const renderDept = (deptId: number, depth: number): React.ReactNode => {
    const dept = (departments ?? []).find((d) => d.id === deptId)!;
    const kids = childrenOf(deptId);
    const emps = employees.filter((e) => e.department_id !== null && collectIds(deptId).has(e.department_id));
    const isCollapsed = collapsed.has(deptId);
    return (
      <div key={deptId} style={{ marginLeft: depth * 16 }}>
        <button
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent/60"
          onClick={() =>
            setCollapsed((prev) => {
              const n = new Set(prev);
              if (n.has(deptId)) n.delete(deptId);
              else n.add(deptId);
              return n;
            })
          }
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          {dept.name}
          <span className="text-xs text-muted-foreground">({emps.length})</span>
        </button>
        {!isCollapsed ? (
          <div className="ml-4 border-l pl-2">
            {employees
              .filter((e) => e.department_id === deptId)
              .map((e) => (
                <EmployeeRow key={e.id} emp={e} view={view} onOpen={() => onOpen(e.id)} />
              ))}
            {kids.map((k) => renderDept(k.id, 0))}
          </div>
        ) : null}
      </div>
    );
  };

  const noDept = employees.filter((e) => e.department_id === null);

  return (
    <Card className="p-2">
      {roots.map((r) => renderDept(r.id, 0))}
      {noDept.length > 0 ? (
        <div>
          <div className="px-3 py-2 text-sm font-medium text-muted-foreground">Без отдела</div>
          {noDept.map((e) => (
            <EmployeeRow key={e.id} emp={e} view={view} onOpen={() => onOpen(e.id)} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function EmployeeCard({ emp, onEdit, onArchive }: { emp: EmployeeView; onEdit: () => void; onArchive: (archived: boolean) => void }) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const { toast } = useToast();
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{emp.full_name}</div>
          <div className="text-sm text-muted-foreground">
            {emp.department_name ?? 'без отдела'} · {emp.position}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <StatusDot status={emp.status} /> {employeeStatusLabel(emp.status)}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Изменить
          </Button>
          {emp.archived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                onArchive(false);
                toast('success', 'Возвращён из архива');
              }}
            >
              <RotateCcw className="h-4 w-4" /> Из архива
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={() => setConfirmArchive(true)}>
              <Archive className="h-4 w-4" /> В архив
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="Переместить в архив?"
        description="Архивные сотрудники скрываются из списка (мягкое удаление)."
        confirmLabel="В архив"
        danger
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          onArchive(true);
        }}
      />

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <Info label="Внутренний телефон" value={emp.internal_phone} />
        <Info label="Мобильный телефон" value={emp.mobile_phone} />
        <Info label="Почта" value={emp.email} />
        <Info
          label="День рождения"
          value={
            emp.birthday
              ? `${toDisplay(emp.birthday)}${emp.days_to_birthday !== null ? ` · через ${emp.days_to_birthday} ${plural(emp.days_to_birthday, 'день', 'дня', 'дней')}` : ''}`
              : ''
          }
        />
        <Info label="Ближайший отпуск" value={emp.next_vacation ? `${toDisplay(emp.next_vacation.date_from)} — ${toDisplay(emp.next_vacation.date_to)}` : ''} />
        {emp.is_fired ? <Info label="Дата увольнения" value={toDisplay(emp.fired_date)} /> : null}
      </div>

      <Field label="Функционал">
        <div className="min-h-[60px] whitespace-pre-line rounded-md border bg-background p-3 text-sm">
          {emp.functions || <span className="text-muted-foreground">Не указан</span>}
        </div>
      </Field>

      <MonitoringMiniList employeeId={emp.id} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-sm', !value && 'text-muted-foreground/60')}>{value || '—'}</div>
    </div>
  );
}
