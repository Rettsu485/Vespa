// Форма документа ЭДО (создание/редактирование). Валидация — zod, Enter — сохранение, Esc — закрытие.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { EdoDocumentView } from '@/shared/types';
import { APPROVAL_STATUSES, CONTROL_TYPES } from '@/shared/types';
import type { EdoDocumentInput } from '@/shared/ipc';
import { edoDocumentSchema, fieldErrorsFromIssue } from '@/shared/schemas';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { Button, Input, Label, Textarea } from '@/renderer/src/ui/primitives';
import { IntSelect, Select } from '@/renderer/src/ui/radix';
import { DatePicker } from '@/renderer/src/ui/datePicker';

export function emptyEdo(): EdoDocumentInput {
  return {
    doc_number: '', doc_url: '', summary: '', instruction: '', responsible_id: null, participants: '',
    control_type: 'red', deadline: null, off_control: false, off_control_date: null, sub_resolution: '',
    approval_number: '', approval_url: '', approval_status: '', archived: false,
  };
}

export function toEdoInput(d: EdoDocumentView): EdoDocumentInput {
  return {
    doc_number: d.doc_number, doc_url: d.doc_url, summary: d.summary, instruction: d.instruction,
    responsible_id: d.responsible_id, participants: d.participants, control_type: d.control_type,
    deadline: d.deadline, off_control: d.off_control, off_control_date: d.off_control_date,
    sub_resolution: d.sub_resolution, approval_number: d.approval_number, approval_url: d.approval_url,
    approval_status: d.approval_status, archived: d.archived,
  };
}

export function EdoForm({
  documentId = null,
  initial,
  onSaved,
  onCancel,
}: {
  documentId?: number | null;
  initial: EdoDocumentInput;
  onSaved: (v: EdoDocumentView) => void;
  onCancel: () => void;
}) {
  const store = useStore();
  const [form, setForm] = useState<EdoDocumentInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
    setErrors({});
  }, [initial]);

  const set = <K extends keyof EdoDocumentInput>(k: K, v: EdoDocumentInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const parsed = edoDocumentSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrorsFromIssue(parsed.error));
      return;
    }
    setSaving(true);
    try {
      // При установке «снят с контроля» дату проставляет main (edoSetOffControl), здесь синхронизируем поле.
      const input: EdoDocumentInput = {
        ...form,
        off_control_date: form.off_control ? form.off_control_date ?? new Date().toISOString().slice(0, 10) : null,
      };
      const view = documentId == null ? await api.edoCreate(input) : await api.edoUpdate(documentId, input);
      toast.success(documentId == null ? 'Документ добавлен' : 'Изменения сохранены');
      store.bump();
      onSaved(view);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setSaving(false);
    }
  };

  const employeeOptions = store.employees.filter((e) => !e.archived).map((e) => ({ id: e.id, label: e.full_name }));
  const controlLabels: Record<(typeof CONTROL_TYPES)[number], string> = {
    red: store.settings.controlRedName,
    green: store.settings.controlGreenName,
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edo-number">Номер документа *</Label>
          <Input id="edo-number" value={form.doc_number} onChange={(e) => set('doc_number', e.target.value)} placeholder={errors.doc_number ?? 'Исх. № 123'} autoFocus />
        </div>
        <div>
          <Label>Тип контроля</Label>
          <Select
            value={form.control_type}
            onValueChange={(v) => set('control_type', (v ?? 'red') as EdoDocumentInput['control_type'])}
            options={CONTROL_TYPES.map((t) => ({ value: t, label: controlLabels[t] }))}
          />
        </div>
      </div>
      {errors.control_type && <div className="text-xs text-destructive">{errors.control_type}</div>}

      <div>
        <Label htmlFor="edo-summary">Краткое содержание</Label>
        <Input id="edo-summary" value={form.summary} onChange={(e) => set('summary', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Срок</Label>
          <DatePicker value={form.deadline} onChange={(v) => set('deadline', v)} />
        </div>
        <div>
          <Label>Ответственный</Label>
          <IntSelect value={form.responsible_id} onValueChange={(v) => set('responsible_id', v)} options={employeeOptions} placeholder="Не выбран" />
        </div>
      </div>

      <div>
        <Label htmlFor="edo-instruction">Поручение</Label>
        <Textarea id="edo-instruction" value={form.instruction} onChange={(e) => set('instruction', e.target.value)} rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edo-participants">Участники</Label>
          <Input id="edo-participants" value={form.participants} onChange={(e) => set('participants', e.target.value)} placeholder="Иванов И.И., Петров П.П." />
        </div>
        <div>
          <Label htmlFor="edo-subres">Подрезолюция (кому перенаправлен)</Label>
          <Input id="edo-subres" value={form.sub_resolution} onChange={(e) => set('sub_resolution', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edo-url">Ссылка на документ (если шаблон не задан)</Label>
          <Input id="edo-url" value={form.doc_url} onChange={(e) => set('doc_url', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label>Статус листа согласования</Label>
          <Select
            value={form.approval_status === '' ? '__none' : form.approval_status}
            onValueChange={(v) => set('approval_status', (v === '__none' ? '' : v) as EdoDocumentInput['approval_status'])}
            options={[{ value: '__none', label: '— нет —' }, ...APPROVAL_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edo-appr-num">№ листа согласования</Label>
          <Input id="edo-appr-num" value={form.approval_number} onChange={(e) => set('approval_number', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edo-appr-url">Ссылка на лист согласования</Label>
          <Input id="edo-appr-url" value={form.approval_url} onChange={(e) => set('approval_url', e.target.value)} placeholder="https://…" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.off_control} onChange={(e) => set('off_control', e.target.checked)} className="h-4 w-4 accent-current" />
        Снят с контроля
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
      </div>
    </form>
  );
}
