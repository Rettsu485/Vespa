// Форма сотрудника (создание/редактирование). Валидация — zod, сохранение по Enter.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { EmployeeView } from '@/shared/types';
import type { EmployeeInput } from '@/shared/ipc';
import { employeeSchema, fieldErrorsFromIssue } from '@/shared/schemas';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { Button, Input, Label, Textarea } from '@/renderer/src/ui/primitives';
import { IntSelect, Switch } from '@/renderer/src/ui/radix';
import { DatePicker } from '@/renderer/src/ui/datePicker';

export function emptyEmployee(): EmployeeInput {
  return {
    full_name: '', department_id: null, position: '', internal_phone: '', mobile_phone: '', email: '',
    birthday: null, functions: '', is_fired: false, fired_date: null, archived: false,
  };
}

export function EmployeeForm({ employeeId = null, initial, onSaved, onCancel }: { employeeId?: number | null; initial: EmployeeInput; onSaved: (v: EmployeeView) => void; onCancel: () => void }) {
  const store = useStore();
  const [form, setForm] = useState<EmployeeInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
    setErrors({});
  }, [initial]);

  const set = <K extends keyof EmployeeInput>(k: K, v: EmployeeInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const parsed = employeeSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrorsFromIssue(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const result = employeeId != null ? await api.employeeUpdate(employeeId, form) : await api.employeeCreate(form);
      onSaved(result);
      toast.success('Сохранено');
      store.bump();
      void store.refreshRefs();
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setSaving(false);
    }
  };

  const deptOptions = store.departments.map((d) => ({ id: d.id, label: d.name }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          void save();
        }
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="emp-name">ФИО *</Label>
        <Input id="emp-name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} autoFocus />
        {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Отдел</Label>
          <IntSelect value={form.department_id} onValueChange={(v) => set('department_id', v)} options={deptOptions} placeholder="Без отдела" />
        </div>
        <div>
          <Label htmlFor="emp-pos">Должность</Label>
          <Input id="emp-pos" value={form.position} onChange={(e) => set('position', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="emp-ext">Внутренний телефон</Label>
          <Input id="emp-ext" value={form.internal_phone} onChange={(e) => set('internal_phone', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="emp-mob">Мобильный телефон</Label>
          <Input id="emp-mob" value={form.mobile_phone} onChange={(e) => set('mobile_phone', e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="emp-mail">Почта</Label>
        <Input id="emp-mail" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.ru" />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>День рождения</Label>
          <DatePicker value={form.birthday} onChange={(v) => set('birthday', v)} placeholder="Не указан" />
        </div>
        <div className="flex items-end gap-3 pb-1">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_fired} onCheckedChange={(v) => set('is_fired', v)} />
            <span className="text-sm">Уволен</span>
          </div>
          {form.is_fired && <div className="grow"><DatePicker value={form.fired_date} onChange={(v) => set('fired_date', v)} placeholder="Дата увольнения" /></div>}
        </div>
      </div>
      <div>
        <Label htmlFor="emp-fn">Функционал (какими задачами занимается)</Label>
        <Textarea id="emp-fn" value={form.functions} onChange={(e) => set('functions', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Отмена (Esc)</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить (Enter)'}</Button>
      </div>
    </form>
  );
}
