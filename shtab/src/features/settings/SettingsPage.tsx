// Модуль «Настройки»: тема/плотность, названия контроля, шаблон ссылки ЭДО, справочник типов задач,
// обслуживание (бэкап / демо-данные / очистка).
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { AppSettings } from '@shared/types';
import { Badge, Button, Card, ConfirmDialog, Field, Input, SegmentedControl, Select, Spinner, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, DownloadCloud, Eraser, Plus, Trash2 } from 'lucide-react';

export function SettingsPage({ initial }: { initial: AppSettings }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(initial);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = async (patch: Partial<AppSettings>) => {
    try {
      const next = await api.settings.update(patch);
      setSettings(next);
      toast('success', 'Настройки сохранены');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const backup = async () => {
    setBusy(true);
    try {
      const p = await api.maintenance.backupNow();
      toast('success', `Резервная копия создана: ${p}`);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const loadDemo = async () => {
    setBusy(true);
    try {
      await api.maintenance.loadDemo();
      toast('success', 'Демо-данные загружены');
      window.location.reload();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-xl font-semibold">Настройки</h1>

      <Card className="grid gap-4 p-5">
        <div className="text-sm font-semibold">Внешний вид</div>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Тема">
            <SegmentedControl
              options={[
                { value: 'system', label: 'Системная' },
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' },
              ]}
              value={settings.theme}
              onChange={(v) => void update({ theme: v })}
            />
          </Field>
          <Field label="Плотность строк">
            <SegmentedControl
              options={[
                { value: 'normal', label: 'Обычная' },
                { value: 'compact', label: 'Компактная' },
              ]}
              value={settings.density}
              onChange={(v) => void update({ density: v })}
            />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-4 p-5">
        <div className="text-sm font-semibold">Контроль и ЭДО</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Название красного контроля">
            <Input defaultValue={settings.controlRedName} onBlur={(e) => e.target.value !== settings.controlRedName && void update({ controlRedName: e.target.value })} />
          </Field>
          <Field label="Название зелёного контроля">
            <Input defaultValue={settings.controlGreenName} onBlur={(e) => e.target.value !== settings.controlGreenName && void update({ controlGreenName: e.target.value })} />
          </Field>
        </div>
        <Field label="Шаблон ссылки на документ ЭДО (плейсхолдер {номер})">
          <Input defaultValue={settings.edoLinkTemplate} onBlur={(e) => e.target.value !== settings.edoLinkTemplate && void update({ edoLinkTemplate: e.target.value })} />
        </Field>
        <div className="text-xs text-muted-foreground">
          Пример: <code>https://sed.example.ru/doc/{'{номер}'}</code> → по номеру документа формируется кликабельная ссылка в таблице ЭДО.
        </div>
      </Card>

      <TaskTypesCard />

      <Card className="grid gap-3 p-5">
        <div className="text-sm font-semibold">Обслуживание данных</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void backup()} disabled={busy}>
            <DownloadCloud className="h-4 w-4" /> Сделать резервную копию сейчас
          </Button>
          <Button variant="secondary" onClick={() => void loadDemo()} disabled={busy}>
            Загрузить демо-данные
          </Button>
          <Button variant="destructive" onClick={() => setConfirmClear(true)}>
            <Eraser className="h-4 w-4" /> Очистить все данные
          </Button>
        </div>
        {busy ? <Spinner /> : null}
        <div className="text-xs text-muted-foreground">
          При каждом запуске приложения автоматически создаётся резервная копия базы (хранится 30 последних копий в папке userData/backups).
        </div>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        title="Удалить все данные?"
        description="Будут удалены сотрудники, мониторинги, документы, задачи и журналы. Действие необратимо (останутся только автобэкапы)."
        confirmLabel="Удалить всё"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false);
          try {
            await api.maintenance.clearAll();
            toast('success', 'Данные очищены');
            window.location.reload();
          } catch (e) {
            toast('error', e instanceof Error ? e.message : 'Ошибка');
          }
        }}
      />
    </div>
  );
}

function TaskTypesCard() {
  const { toast } = useToast();
  const { data: types, loading, reload } = useAsync(() => api.taskTypes.list(), []);
  const [name, setName] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api.taskTypes.create(name.trim());
      setName('');
      reload();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const rename = async (id: number, value: string) => {
    try {
      await api.taskTypes.update(id, { name: value });
      reload();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await api.taskTypes.update(id, { active });
      reload();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const remove = async (id: number) => {
    try {
      await api.taskTypes.remove(id);
      reload();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Нельзя удалить тип, по которому есть мониторинги');
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const list = [...(types ?? [])];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    try {
      await api.taskTypes.reorder(list.map((t) => t.id));
      reload();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка');
    }
  };

  return (
    <Card className="grid gap-3 p-5">
      <div className="text-sm font-semibold">Справочник типов задач мониторинга</div>
      {loading ? <Spinner /> : null}
      <div className="grid gap-1">
        {(types ?? []).map((t, i) => (
          <div key={t.id} className={cn('flex items-center gap-2 rounded-md border px-2 py-1.5', !t.active && 'opacity-50')}>
            <Input
              defaultValue={t.name}
              className="h-8 max-w-xs"
              onBlur={(e) => e.target.value !== t.name && e.target.value.trim() && void rename(t.id, e.target.value.trim())}
            />
            {!t.active ? <Badge tone="gray">выключен</Badge> : null}
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => void move(i, -1)} aria-label="Вверх"><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => void move(i, 1)} aria-label="Вниз"><ArrowDown className="h-4 w-4" /></Button>
              <Select
                value={t.active ? '1' : '0'}
                onChange={(e) => void toggleActive(t.id, e.target.value === '1')}
                className="h-8 w-28"
              >
                <option value="1">Активен</option>
                <option value="0">Выключен</option>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => void remove(t.id)} aria-label="Удалить">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новый тип (например: Мониторинг ПЛАН)" className="max-w-xs" />
        <Button type="submit" size="sm"><Plus className="h-4 w-4" /> Добавить</Button>
      </form>
    </Card>
  );
}
