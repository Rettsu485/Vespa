// Форма мониторинга (создание/редактирование), включая назначение дублёра с периодом.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Monitoring, MonitoringView } from '@/shared/types';
import { MONITORING_STATUSES } from '@/shared/types';
import type { MonitoringInput } from '@/shared/ipc';
import { fieldErrorsFromIssue, monitoringSchema } from '@/shared/schemas';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { Button, Input, Label, Textarea } from '@/renderer/src/ui/primitives';
import { IntSelect, Select } from '@/renderer/src/ui/radix';
import { DatePicker, DateRangeField } from '@/renderer/src/ui/datePicker';

export function emptyMonitoring(): MonitoringInput {
  return {
    name: '', type_id: 0, employee_id: 0, deadline: null, note: '', status: 'в работе',
    deputy_employee_id: null, deputy_from: null, deputy_to: null,
  };
}

export function toMonitoringInput(m: Monitoring): MonitoringInput {
  return {
    name: m.name,
    type_id: m.type_id,
    employee_id: m.employee_id,
    deadline: m.deadline,
    note: m.note,
    status: m.status,
    deputy_employee_id: m.deputy_employee_id,
    deputy_from: m.deputy_from,
    deputy_to: m.deputy_to,
  };
}

export function MonitoringForm({
  monitoringId = null,
  initial,
  onSaved,
  onCancel,
}: {
  monitoringId?: number | null;
  initial: MonitoringInput;
  onSaved: (v: MonitoringView) => void;
  onCancel: () => void;
}) {
  const store = useStore();
  const [form, setForm] = useState<MonitoringInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
    setErrors({});
  }, [initial]);

  const set = <K extends keyof MonitoringInput>(k: K, v: MonitoringInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const parsed = monitoringSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrorsFromIssue(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const result = monitoringId != null ? await api.monitoringUpdate(monitoringId, form) : await api.monitoringCreate(form);
      onSaved(result);
      toast.success('Сохранено');
      store.bump();
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setSaving(false);
    }
  };

  const activeEmployees = store.employees.filter((e) => !e.archived && !e.is_fired);
  const typeOptions = store.taskTypes.filter((t) => t.active).map((t) => ({ id: t.id, label: t.name }));
  const empOptions = activeEmployees.map((e) => ({ id: e.id, label: e.full_name }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-4"
    >
      <div>
        <Label>{errors.name ?? 'Название'}</Label>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder='Например: «Мониторинг ЧС на территории района»' autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{errors.type_id ?? 'Тип задачи'}</Label>
          <IntSelect value={form.type_id || null} onValueChange={(v) => set('type_id', v ?? 0)} options={typeOptions} placeholder="Выберите тип" />
        </div>
        <div>
          <Label>{errors.status ?? 'Статус'}</Label>
          <Select
            value={form.status}
            onValueChange={(v) => v && set('status', v as MonitoringInput['status'])}
            options={MONITORING_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>
      <div>
        <Label>{errors.employee_id ?? 'Исполнитель'}</Label>
        <IntSelect value={form.employee_id || null} onValueChange={(v) => set('employee_id', v ?? 0)} options={empOptions} placeholder="Выберите сотрудника" />
      </div>
      <div>
        <Label>{errors.deadline ?? 'Срок'}</Label>
        <DatePicker value={form.deadline} onChange={(v) => set('deadline', v)} />
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Дублирование</div>
        <div className="space-y-3">
          <div>
            <Label>Дублёр</Label>
            <IntSelect
              value={form.deputy_employee_id}
              onValueChange={(v) => set('deputy_employee_id', v)}
              options={empOptions.filter((o) => o.id !== form.employee_id)}
              placeholder="Не назначен"
            />
          </div>
          {form.deputy_employee_id != null && (
            <div>
              <Label>Период дублирования (с … по …)</Label>
              <DateRangeField from={form.deputy_from} to={form.deputy_to} onChange={(from, to) => setForm((f) => ({ ...f, deputy_from: from, deputy_to: to }))} />
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Примечание</Label>
        <Textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
      </div>
    </form>
  );
}
