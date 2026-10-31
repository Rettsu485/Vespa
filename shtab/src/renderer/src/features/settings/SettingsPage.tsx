// Раздел «Настройки» (ТЗ п.5.6 + п.2): внешний вид, справочники (отделы, типы мониторингов),
// обслуживание (путь к БД, резервные копии, демо-данные, очистка с двойным подтверждением).

import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Check, Database, Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { DepartmentNode, TaskType, ThemeMode, TableDensity } from '@/shared/types';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { Badge, Button, Card, Input, Label } from '@/renderer/src/ui/primitives';
import { ConfirmDialog } from '@/renderer/src/ui/dialog';
import { Segmented } from '@/renderer/src/ui/display';
import { Switch } from '@/renderer/src/ui/radix';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-1 text-sm font-semibold">{title}</div>
      {hint && <div className="mb-4 text-xs text-muted-foreground">{hint}</div>}
      {children}
    </Card>
  );
}

export function SettingsPage() {
  const store = useStore();
  const [redName, setRedName] = useState(store.settings.controlRedName);
  const [greenName, setGreenName] = useState(store.settings.controlGreenName);
  const [template, setTemplate] = useState(store.settings.edoLinkTemplate);
  const [savedFlash, setSavedFlash] = useState(false);

  const saveAppearance = async () => {
    try {
      await api.settingsSet({ controlRedName: redName, controlGreenName: greenName, edoLinkTemplate: template });
      void store.refreshRefs();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      toast.success('Настройки сохранены');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const backup = async () => {
    try {
      const path = await api.backupNow();
      toast.success(`Резервная копия создана: ${path}`);
    } catch (e) {
      toast.error(errText(e));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">Настройки</h1>

      {/* ── Внешний вид ─────────────────────────────── */}
      <Section title="Внешний вид" hint="Тема оформления и плотность таблиц во всех разделах.">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Тема</Label>
            <Segmented<ThemeMode>
              value={store.settings.theme}
              onChange={store.setTheme}
              options={[
                { value: 'system', label: 'Системная' },
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' },
              ]}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Плотность таблиц</Label>
            <Segmented<TableDensity>
              value={store.settings.tableDensity}
              onChange={(v) => void api.settingsSet({ tableDensity: v }).then(() => store.bump()).catch((e: unknown) => toast.error(errText(e)))}
              options={[
                { value: 'compact', label: 'Компактная' },
                { value: 'normal', label: 'Обычная' },
              ]}
            />
          </div>
        </div>
      </Section>

      {/* ── ЭДО ─────────────────────────────────────── */}
      <Section title="ЭДО" hint="Названия цветов контроля и шаблон ссылки на документ в внешнем ЭДО.">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="set-red">Название красного контроля</Label>
            <Input id="set-red" value={redName} onChange={(e) => setRedName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="set-green">Название зелёного контроля</Label>
            <Input id="set-green" value={greenName} onChange={(e) => setGreenName(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="set-template">Шаблон ссылки на документ</Label>
          <Input
            id="set-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="https://sed.example.ru/doc/{номер}"
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Подстановка <code className="rounded bg-muted px-1">{'{номер}'}</code> заменяется на номер документа. Пусто — используется ссылка из карточки.
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => void saveAppearance()}>
            {savedFlash ? <><Check className="h-4 w-4" /> Сохранено</> : 'Сохранить'}
          </Button>
        </div>
      </Section>

      {/* ── Справочники ─────────────────────────────── */}
      <DepartmentsSection tree={buildTree(store.departments)} />
      <TaskTypesSection types={store.taskTypes} onChanged={() => void store.refreshRefs()} />

      {/* ── Обслуживание ────────────────────────────── */}
      <Section title="Обслуживание" hint="Локальные данные: всё хранится в SQLite на этом компьютере.">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void backup()}>
            <Download className="h-4 w-4" /> Создать резервную копию
          </Button>
          <DemoButton />
          <WipeButton />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          Резервные копии складываются в папку backups рядом с файлом базы данных.
        </div>
      </Section>
    </div>
  );
}

function DemoButton() {
  const store = useStore();
  const [confirm, setConfirm] = useState(false);
  const load = async () => {
    try {
      await api.demoLoad();
      store.bump();
      void store.refreshRefs();
      toast.success('Демо-данные загружены');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setConfirm(false);
    }
  };
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>
        <RotateCcw className="h-4 w-4" /> Загрузить демо-данные
      </Button>
      <ConfirmDialog
        open={confirm}
        onConfirm={() => void load()}
        onCancel={() => setConfirm(false)}
        title="Загрузить демо-данные?"
        message="Будут добавлены примеры сотрудников, отделов, документов ЭДО и задач. Существующие данные не удаляются."
        confirmLabel="Загрузить"
      />
    </>
  );
}

function WipeButton() {
  const store = useStore();
  const [confirm, setConfirm] = useState(false);
  const wipe = async () => {
    try {
      await api.wipeAll();
      store.bump();
      void store.refreshRefs();
      toast.success('Все данные удалены');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setConfirm(false);
    }
  };
  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setConfirm(true)}>
        <Trash2 className="h-4 w-4" /> Очистить все данные
      </Button>
      <ConfirmDialog
        open={confirm}
        onConfirm={() => void wipe()}
        onCancel={() => setConfirm(false)}
        title="Очистить все данные?"
        message="Будут безвозвратно удалены все сотрудники, отделы, мониторинги, документы ЭДО, задачи и журнал. Действие необратимо — сначала создайте резервную копию."
        confirmLabel="Удалить всё"
        doubleConfirm
      />
    </>
  );
}

function buildTree(departments: { id: number; name: string; parent_id: number | null; sort_order: number }[]): DepartmentNode[] {
  const byId = new Map<number, DepartmentNode>();
  departments.forEach((d) => byId.set(d.id, { ...d, children: [] }));
  const roots: DepartmentNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id != null && byId.has(node.parent_id)) byId.get(node.parent_id)!.children.push(node);
    else roots.push(node);
  }
  const sortRec = (nodes: DepartmentNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ru'));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function DepartmentsSection({ tree }: { tree: DepartmentNode[] }) {
  const store = useStore();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const add = async () => {
    if (!newName.trim()) return;
    try {
      await api.departmentCreate({ name: newName.trim(), parent_id: null, sort_order: (store.departments.length ?? 0) + 1 });
      setNewName('');
      void store.refreshRefs();
      store.bump();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const rename = async () => {
    if (!editing || !editing.name.trim()) return;
    const dep = store.departments.find((d) => d.id === editing.id);
    if (!dep) return;
    try {
      await api.departmentUpdate(editing.id, { name: editing.name.trim(), parent_id: dep.parent_id, sort_order: dep.sort_order });
      setEditing(null);
      void store.refreshRefs();
      store.bump();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const remove = async (id: number) => {
    try {
      await api.departmentDelete(id);
      void store.refreshRefs();
      store.bump();
      toast.success('Отдел удалён');
    } catch (e) {
      toast.error(errText(e)); // «в отделе есть сотрудники» и т.п. — блокирует бэкенд
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const renderNodes = (nodes: DepartmentNode[], depth: number) =>
    nodes.map((n) => (
      <div key={n.id}>
        <div style={{ paddingLeft: `${depth * 20}px` }} className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-theme hover:bg-accent/60">
          {editing?.id === n.id ? (
            <>
              <Input autoFocus value={editing.name} onChange={(e) => setEditing({ id: n.id, name: e.target.value })} className="h-7 max-w-[240px]" onKeyDown={(e) => e.key === 'Enter' && void rename()} />
              <Button size="sm" variant="ghost" onClick={() => void rename()}><Check className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Отмена</Button>
            </>
          ) : (
            <>
              <span className="flex-1">{n.name}</span>
              <Badge tone="gray">{store.employees.filter((e) => e.department_id === n.id && !e.archived).length} чел.</Badge>
              <button className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground" onClick={() => setEditing({ id: n.id, name: n.name })} title="Переименовать">
                <PencilSmall />
              </button>
              <button className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDeleteId(n.id)} title="Удалить">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
        {renderNodes(n.children, depth + 1)}
      </div>
    ));

  return (
    <Section title="Справочник: подразделения" hint="Иерархия отделов. Удаление отдела с сотрудниками заблокирована.">
      <div className="mb-3 flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Новый отдел" className="max-w-[280px]" onKeyDown={(e) => e.key === 'Enter' && void add()} />
        <Button size="sm" variant="outline" onClick={() => void add()} disabled={!newName.trim()}>
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </div>
      {tree.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Отделов пока нет.</div>
      ) : (
        <div className="space-y-0.5">{renderNodes(tree, 0)}</div>
      )}
      <ConfirmDialog
        open={confirmDeleteId != null}
        onConfirm={() => confirmDeleteId != null && void remove(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        title="Удалить отдел?"
        message="Отдел будет удалён, если в нём нет сотрудников и подразделений."
      />
    </Section>
  );
}

function PencilSmall() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TaskTypesSection({ types, onChanged }: { types: TaskType[]; onChanged: () => void }) {
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      await api.taskTypeCreate({ name: newName.trim(), sort_order: types.length + 1, active: true });
      setNewName('');
      onChanged();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const toggleActive = async (t: TaskType) => {
    try {
      await api.taskTypeUpdate(t.id, { name: t.name, sort_order: t.sort_order, active: !t.active });
      onChanged();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const remove = async (t: TaskType) => {
    try {
      await api.taskTypeDelete(t.id); // бэкенд блокирует удаление используемого типа
      onChanged();
      toast.success('Тип удалён');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ordered = [...types];
    const j = index + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[index], ordered[j]] = [ordered[j], ordered[index]];
    setBusy(true);
    try {
      await api.taskTypeReorder(ordered.map((t) => t.id));
      onChanged();
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Справочник: типы мониторингов" hint="Порядок задаётся стрелками; удаление занятого типа заблокировано.">
      <div className="mb-3 flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Новый тип (напр.: Поручение губернатора)" className="max-w-[340px]" onKeyDown={(e) => e.key === 'Enter' && void create()} />
        <Button size="sm" variant="outline" onClick={() => void create()} disabled={!newName.trim()}>
          <Plus className="h-4 w-4" /> Добавить
        </Button>
      </div>
      <div className="space-y-1">
        {types.map((t, i) => (
          <div key={t.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
            <span className="w-14 shrink-0">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={busy || i === 0} onClick={() => void move(i, -1)} title="Выше">
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={busy || i === types.length - 1} onClick={() => void move(i, 1)} title="Ниже">
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </span>
            <span className={`flex-1 ${!t.active ? 'text-muted-foreground line-through' : ''}`}>{t.name}</span>
            <Switch checked={t.active} onCheckedChange={() => void toggleActive(t)} />
            <button className="text-muted-foreground hover:text-destructive" onClick={() => void remove(t)} title="Удалить тип">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {types.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">Типов пока нет.</div>}
      </div>
    </Section>
  );
}
