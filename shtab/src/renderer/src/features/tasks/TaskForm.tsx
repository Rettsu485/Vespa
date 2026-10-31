// Форма задачи (создание/редактирование). Валидация — zod, Enter — сохранение, Esc — закрытие.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { TaskView } from '@/shared/types';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/shared/types';
import type { TaskInput } from '@/shared/ipc';
import { fieldErrorsFromIssue, taskSchema } from '@/shared/schemas';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { Button, Input, Label, Textarea } from '@/renderer/src/ui/primitives';
import { Select } from '@/renderer/src/ui/radix';
import { DatePicker } from '@/renderer/src/ui/datePicker';

export function emptyTask(): TaskInput {
  return {
    theme: '', title: '', priority: 'обычный', deadline: null, status: 'входящая',
    wait_until: null, next_action: '', participants: '', note: '', archived: false,
  };
}

export function toTaskInput(t: TaskView): TaskInput {
  return {
    theme: t.theme, title: t.title, priority: t.priority, deadline: t.deadline, status: t.status,
    wait_until: t.wait_until, next_action: t.next_action, participants: t.participants, note: t.note,
    archived: t.archived,
  };
}

export function TaskForm({
  taskId = null,
  initial,
  onSaved,
  onCancel,
}: {
  taskId?: number | null;
  initial: TaskInput;
  onSaved: (v: TaskView) => void;
  onCancel: () => void;
}) {
  const store = useStore();
  const [form, setForm] = useState<TaskInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
    setErrors({});
  }, [initial]);

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const parsed = taskSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrorsFromIssue(parsed.error));
      return;
    }
    setSaving(true);
    try {
      const view = taskId == null ? await api.taskCreate(form) : await api.taskUpdate(taskId, form);
      toast.success(taskId == null ? 'Задача создана' : 'Изменения сохранены');
      store.bump();
      onSaved(view);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div>
        <Label htmlFor="task-theme">Тема</Label>
        <Input id="task-theme" value={form.theme} onChange={(e) => set('theme', e.target.value)} placeholder="Напр.: Личный состав" />
      </div>
      <div>
        <Label htmlFor="task-title">Название *</Label>
        <Input id="task-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={errors.title ?? 'Что нужно сделать'} autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Приоритет</Label>
          <Select
            value={form.priority}
            onValueChange={(v) => set('priority', (v ?? 'обычный') as TaskInput['priority'])}
            options={TASK_PRIORITIES.map((p) => ({ value: p, label: p }))}
          />
        </div>
        <div>
          <Label>Статус</Label>
          <Select
            value={form.status}
            onValueChange={(v) => set('status', (v ?? 'входящая') as TaskInput['status'])}
            options={TASK_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>
      {errors.priority && <div className="text-xs text-destructive">{errors.priority}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Срок</Label>
          <DatePicker value={form.deadline} onChange={(v) => set('deadline', v)} />
        </div>
        <div>
          <Label>Ждать до (для статуса «ожидание»)</Label>
          <DatePicker value={form.wait_until} onChange={(v) => set('wait_until', v)} placeholder="Не указана" />
        </div>
      </div>

      <div>
        <Label htmlFor="task-next">Следующее действие</Label>
        <Input id="task-next" value={form.next_action} onChange={(e) => set('next_action', e.target.value)} placeholder="Позвонить Иванову…" />
      </div>

      <div>
        <Label htmlFor="task-participants">Участники</Label>
        <Input id="task-participants" value={form.participants} onChange={(e) => set('participants', e.target.value)} placeholder="Свободный текст" />
      </div>

      <div>
        <Label htmlFor="task-note">Примечание</Label>
        <Textarea id="task-note" value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
      </div>
    </form>
  );
}
