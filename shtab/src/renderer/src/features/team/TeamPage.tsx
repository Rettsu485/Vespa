// Раздел «Команда»: список сотрудников с цветовой индикацией, панель структуры отделов, таймлайн отсутствий.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Plus } from 'lucide-react';
import type { DepartmentNode } from '@/shared/types';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore, type OpenCardEvent } from '@/renderer/src/lib/store';
import { fmtDate, shortDate } from '@/renderer/src/lib/dates';
import { Button, Card, EmptyState, Input, Label } from '@/renderer/src/ui/primitives';
import { DialogContent, DialogRoot, Sheet } from '@/renderer/src/ui/dialog';
import { FilterRow, Segmented, StatusDot } from '@/renderer/src/ui/display';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeForm, emptyEmployee } from './EmployeeForm';

type View = 'list' | 'structure' | 'timeline';

export function TeamPage() {
  const store = useStore();
  const [view, setView] = useState<View>('list');
  const [query, setQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  // Открытие карточки из глобального поиска.
  useEffect(() => {
    return store.subscribeOpenCard((e: OpenCardEvent) => {
      if (e.kind === 'employee') setOpenId(e.id);
    });
  }, [store]);

  const employees = useMemo(() => {
    let list = store.employees;
    if (!includeArchived) list = list.filter((e) => !e.archived);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        [e.full_name, e.position, e.department_name ?? '', e.functions, e.internal_phone, e.mobile_phone, e.email]
          .some((f) => f.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'));
  }, [store.employees, query, includeArchived]);

  const archive = async (id: number, archived: boolean) => {
    try {
      await api.employeeArchive(id, archived);
      store.bump();
      void store.refreshRefs();
      toast.success(archived ? 'Сотрудник перемещён в архив' : 'Возвращён из архива');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Команда</h1>
        <div className="flex items-center gap-2">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'Список' },
              { value: 'structure', label: 'Структура' },
              { value: 'timeline', label: 'Отсутствия' },
            ]}
          />
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Сотрудник
          </Button>
        </div>
      </div>

      {view === 'list' && (
        <>
          <FilterRow query={query} onQuery={setQuery} placeholder="Фильтр по ФИО, должности, функционалу, телефону…">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} className="h-4 w-4 accent-current" />
              Показывать архивных
            </label>
          </FilterRow>
          {employees.length === 0 ? (
            <EmptyState title="Сотрудники не найдены" hint="Измените фильтр или добавьте первого сотрудника." action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Добавить сотрудника</Button>} />
          ) : (
            <Card className="overflow-hidden">
              <table className="shtab-table w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Статус</th>
                    <th className="px-2 py-2 font-medium">ФИО</th>
                    <th className="px-2 py-2 font-medium">Отдел</th>
                    <th className="px-2 py-2 font-medium">Должность</th>
                    <th className="px-2 py-2 font-medium">Телефон</th>
                    <th className="px-2 py-2 font-medium">Ближайшее отсутствие</th>
                    <th className="px-2 py-2 font-medium">ДР</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr
                      key={e.id}
                      className="cursor-pointer border-b last:border-0 transition-theme hover:bg-accent/60"
                      onClick={() => setOpenId(e.id)}
                    >
                      <td className="px-4 py-2"><StatusDot status={e.status} /></td>
                      <td className="px-2 py-2 font-medium">
                        {e.full_name}
                        {e.archived && <span className="ml-2 text-xs text-muted-foreground">(архив)</span>}
                      </td>
                      <td className="px-2 py-2">{e.department_name ?? '—'}</td>
                      <td className="px-2 py-2">{e.position || '—'}</td>
                      <td className="px-2 py-2">{e.internal_phone || e.mobile_phone || '—'}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {e.next_absence ? `${shortDate(e.next_absence.date_from)}–${shortDate(e.next_absence.date_to)} · ${e.next_absence.absence_type}` : '—'}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {e.days_to_birthday != null ? (e.days_to_birthday <= 7 ? `${fmtBirthdayHint(e)}` : '') : ''}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          title={e.archived ? 'Вернуть из архива' : 'В архив'}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            void archive(e.id, !e.archived);
                          }}
                        >
                          {e.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {view === 'structure' && <DepartmentStructure />}
      {view === 'timeline' && <AbsenceTimeline />}

      <EmployeeCard employeeId={openId} onClose={() => setOpenId(null)} />

      <DialogRoot open={adding}>
        <DialogContent title="Новый сотрудник" wide>
          <EmployeeForm
            initial={emptyEmployee()}
            onSaved={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

function fmtBirthdayHint(e: { birthday: string | null; days_to_birthday: number | null }): string {
  if (e.days_to_birthday == null) return '';
  if (e.days_to_birthday === 0) return `🎂 сегодня`;
  if (e.days_to_birthday === 1) return '🎂 завтра';
  return `🎂 через ${e.days_to_birthday} дн.`;
}

// ── Структура отделов (два режима: дерево и плоский список) ─────────────

function DepartmentStructure() {
  const store = useStore();
  const [tree, setTree] = useState<DepartmentNode[] | null>(null);
  const [mode, setMode] = useState<'tree' | 'flat'>('tree');
  const [editDept, setEditDept] = useState<{ id: number | null; name: string; parent_id: number | null } | null>(null);

  const reload = () => {
    api.departmentTree().then(setTree).catch((e: unknown) => toast.error(errText(e)));
  };
  useEffect(reload, [store.version]);

  const flat = useMemo(() => {
    const out: Array<DepartmentNode & { depth: number }> = [];
    const walk = (nodes: DepartmentNode[], depth: number) => {
      for (const n of nodes) {
        out.push({ ...n, depth });
        walk(n.children, depth + 1);
      }
    };
    if (tree) walk(tree, 0);
    return out;
  }, [tree]);

  const save = async () => {
    if (!editDept) return;
    const input = { name: editDept.name.trim(), parent_id: editDept.parent_id, sort_order: 0 };
    if (!input.name) {
      toast.error('Укажите название отдела');
      return;
    }
    try {
      if (editDept.id == null) await api.departmentCreate(input);
      else await api.departmentUpdate(editDept.id, input);
      setEditDept(null);
      reload();
      store.bump();
      void store.refreshRefs();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const remove = async (id: number) => {
    try {
      await api.departmentDelete(id);
      reload();
      store.bump();
      void store.refreshRefs();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const empCount = (depId: number) => store.employees.filter((e) => e.department_id === depId && !e.archived).length;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <Segmented value={mode} onChange={setMode} options={[{ value: 'tree', label: 'Иерархия' }, { value: 'flat', label: 'Список' }]} />
        <Button size="sm" variant="outline" onClick={() => setEditDept({ id: null, name: '', parent_id: null })}>
          <Plus className="h-4 w-4" /> Отдел
        </Button>
      </div>
      {flat.length === 0 ? (
        <EmptyState title="Отделов пока нет" hint="Создайте структуру управления — отделы можно вложенными." />
      ) : (
        <ul className="space-y-1 text-sm">
          {flat.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
              <span style={{ paddingLeft: mode === 'tree' ? d.depth * 20 : 0 }}>
                <span className="font-medium">{d.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{empCount(d.id)} чел.</span>
              </span>
              <span className="flex items-center gap-2">
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditDept({ id: d.id, name: d.name, parent_id: d.parent_id })}>
                  Изменить
                </button>
                <button className="text-xs text-muted-foreground hover:text-red-500" onClick={() => void remove(d.id)}>
                  Удалить
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {editDept && (
        <Sheet open onClose={() => setEditDept(null)} title={editDept.id == null ? 'Новый отдел' : 'Редактирование отдела'} width="max-w-md">
          <div className="space-y-4">
            <div>
              <Label htmlFor="dept-name">Название *</Label>
              <Input id="dept-name" autoFocus value={editDept.name} onChange={(e) => setEditDept({ ...editDept, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && void save()} />
            </div>
            <div>
              <Label>Родительский отдел</Label>
              <DepartmentPicker value={editDept.parent_id} excludeId={editDept.id} onChange={(v) => setEditDept({ ...editDept, parent_id: v })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDept(null)}>Отмена</Button>
              <Button onClick={() => void save()}>Сохранить</Button>
            </div>
          </div>
        </Sheet>
      )}
    </Card>
  );
}

function DepartmentPicker({ value, excludeId, onChange }: { value: number | null; excludeId: number | null; onChange: (v: number | null) => void }) {
  const store = useStore();
  const opts = store.departments.filter((d) => d.id !== excludeId).map((d) => ({ id: d.id, label: d.name }));
  return (
    <select
      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    >
      <option value="">Верхний уровень</option>
      {opts.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Таймлайн отсутствий на месяц вперёд ────────────────────────────────

function AbsenceTimeline() {
  const store = useStore();
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.absenceTimeline>>>([]);

  useEffect(() => {
    api.absenceTimeline(31).then(setItems).catch((e: unknown) => toast.error(errText(e)));
  }, [store.version]);

  const today = new Date();
  const days: string[] = [];
  for (let i = 0; i < 31; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  const inRange = (from: string, to: string, day: string) => from <= day && day <= to;

  return (
    <Card className="overflow-x-auto p-4">
      <div className="mb-2 text-sm font-medium">Отсутствия на ближайший месяц</div>
      {items.length === 0 ? (
        <EmptyState title="Нет запланированных отсутствий" />
      ) : (
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-card px-2 py-1 text-left font-medium">Сотрудник</th>
              {days.map((d, i) => (
                <th key={d} className="min-w-[18px] px-0 py-1 text-center font-normal text-muted-foreground">
                  {i % 5 === 0 ? shortDate(d) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={`${it.employee_id}-${it.date_from}-${idx}`}>
                <td className="sticky left-0 whitespace-nowrap bg-card px-2 py-1 font-medium">{it.employee_name}</td>
                {days.map((d) => {
                  const active = inRange(it.date_from, it.date_to, d);
                  const color =
                    it.absence_type === 'отпуск' ? 'bg-sky-400'
                      : it.absence_type === 'командировка' ? 'bg-violet-400'
                        : it.absence_type === 'больничный' ? 'bg-rose-400'
                          : 'bg-amber-400';
                  return <td key={d} className="p-0"><div className={`h-5 ${active ? color : ''}`} title={active ? `${it.absence_type}: ${fmtDate(it.date_from)} — ${fmtDate(it.date_to)}` : undefined} /></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Legend color="bg-sky-400" label="отпуск" />
        <Legend color="bg-violet-400" label="командировка" />
        <Legend color="bg-rose-400" label="больничный" />
        <Legend color="bg-amber-400" label="иное" />
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${color}`} />
      {label}
    </span>
  );
}
