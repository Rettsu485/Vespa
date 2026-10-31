// Форма создания/редактирования сотрудника. Валидация — zod (по ТЗ).
// Enter сохраняет, Esc закрывает (общие горячие клавиши форм).
import { useState } from 'react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import type { EmployeeView } from '@shared/types';
import { Button, Field, Input, Select, Sheet, Textarea, useToast } from '@/components/ui';
import { DateField } from '@/components/DateField';

const employeeSchema = z.object({
  full_name: z.string().trim().min(2, 'Укажите ФИО'),
  position: z.string().trim(),
  internal_phone: z.string().trim(),
  mobile_phone: z.string().trim(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Некорректная почта'),
  functions: z.string(),
});

interface DraftState {
  full_name: string;
  department_id: number | null;
  position: string;
  internal_phone: string;
  mobile_phone: string;
  email: string;
  birthday: string | null;
  functions: string;
  is_fired: boolean;
  fired_date: string | null;
}

const EMPTY: DraftState = {
  full_name: '',
  department_id: null,
  position: '',
  internal_phone: '',
  mobile_phone: '',
  email: '',
  birthday: null,
  functions: '',
  is_fired: false,
  fired_date: null,
};

export function EmployeeForm({
  open,
  employee,
  onClose,
  onSaved,
}: {
  open: boolean;
  employee: EmployeeView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: departments } = useAsync(() => api.departments.list(), []);
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Инициализация при открытии (простое решение — по ключу без useEffect-зависимостей от объекта).
  const currentKey = `${open ? 'o' : 'c'}:${employee?.id ?? 'new'}`;
  const [lastKey, setLastKey] = useState('');
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    setErrors({});
    setDraft(
      employee
        ? {
            full_name: employee.full_name,
            department_id: employee.department_id,
            position: employee.position,
            internal_phone: employee.internal_phone,
            mobile_phone: employee.mobile_phone,
            email: employee.email,
            birthday: employee.birthday,
            functions: employee.functions,
            is_fired: employee.is_fired,
            fired_date: employee.fired_date,
          }
        : EMPTY,
    );
  }

  const set = <K extends keyof DraftState>(k: K, v: DraftState[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    const parsed = employeeSchema.safeParse(draft);
    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const issue of parsed.error.issues) flat[String(issue.path[0] ?? 'form')] = issue.message;
      setErrors(flat);
      return;
    }
    if (draft.is_fired && !draft.fired_date) {
      setErrors({ fired_date: 'Укажите дату увольнения' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        full_name: draft.full_name.trim(),
        department_id: draft.department_id,
        position: draft.position.trim(),
        internal_phone: draft.internal_phone.trim(),
        mobile_phone: draft.mobile_phone.trim(),
        email: (draft.email ?? '').trim(),
        birthday: draft.birthday,
        functions: draft.functions,
        is_fired: draft.is_fired,
        fired_date: draft.is_fired ? draft.fired_date : null,
      };
      if (employee) await api.employees.update(employee.id, payload);
      else await api.employees.create(payload);
      toast('success', employee ? 'Сотрудник обновлён' : 'Сотрудник добавлен');
      onSaved();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={employee ? 'Редактировать сотрудника' : 'Новый сотрудник'}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="ФИО *" error={errors.full_name}>
          <Input value={draft.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Иванов Иван Иванович" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Отдел">
            <Select
              value={draft.department_id ?? 0}
              onChange={(e) => set('department_id', Number(e.target.value) === 0 ? null : Number(e.target.value))}
            >
              <option value={0}>Без отдела</option>
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Должность" error={errors.position}>
            <Input value={draft.position} onChange={(e) => set('position', e.target.value)} placeholder="Ведущий специалист" />
          </Field>
          <Field label="Внутренний телефон" error={errors.internal_phone}>
            <Input value={draft.internal_phone} onChange={(e) => set('internal_phone', e.target.value)} placeholder="1234" />
          </Field>
          <Field label="Мобильный телефон" error={errors.mobile_phone}>
            <Input value={draft.mobile_phone} onChange={(e) => set('mobile_phone', e.target.value)} placeholder="+7 …" />
          </Field>
        </div>
        <Field label="Почта" error={errors.email}>
          <Input value={draft.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.ru" />
        </Field>
        <Field label="День рождения">
          <DateField value={draft.birthday} onChange={(v) => set('birthday', v)} />
        </Field>
        <Field label="Функционал (какими задачами занимается)" error={errors.functions}>
          <Textarea value={draft.functions} onChange={(e) => set('functions', e.target.value)} rows={3} placeholder="Например: мониторинг ОЯТ, приём звонков КТСМ" />
        </Field>
        <div className="flex items-center gap-6 rounded-md border bg-muted/30 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_fired} onChange={(e) => set('is_fired', e.target.checked)} />
            Уволен
          </label>
          {draft.is_fired ? (
            <div className="flex-1">
              <Field label="Дата увольнения" error={errors.fired_date}>
                <DateField value={draft.fired_date} onChange={(v) => set('fired_date', v)} />
              </Field>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">Enter — сохранить, Esc — закрыть.</div>
      </form>
    </Sheet>
  );
}
