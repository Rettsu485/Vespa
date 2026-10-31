// Карточка сотрудника: данные, отсутствия, мониторинги человека.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import type { Absence, AbsenceType, EmployeeView, MonitoringView } from '@/shared/types';
import { ABSENCE_TYPES } from '@/shared/types';
import type { AbsenceInput } from '@/shared/ipc';
import { absenceSchema, fieldErrorsFromIssue } from '@/shared/schemas';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { fmtDate, shortDate, todayIsoLocal } from '@/renderer/src/lib/dates';
import { Badge, Button, Input, Label } from '@/renderer/src/ui/primitives';
import { Select, IntSelect } from '@/renderer/src/ui/radix';
import { DateRangeField } from '@/renderer/src/ui/datePicker';
import { Sheet } from '@/renderer/src/ui/dialog';
import { StatusBadge } from '@/renderer/src/ui/display';
import { EmployeeForm, emptyEmployee } from './EmployeeForm';

const ABSENCE_TYPE_OPTIONS = ABSENCE_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));

function toAbsenceType(v: string | null): AbsenceType {
  return (ABSENCE_TYPES as readonly string[]).includes(v ?? '') ? (v as AbsenceType) : 'отпуск';
}

export function EmployeeCard({ employeeId, onClose }: { employeeId: number | null; onClose: () => void }) {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [mons, setMons] = useState<MonitoringView[]>([]);
  const emp = employeeId != null ? store.employeeById.get(employeeId) ?? null : null;

  const reload = async () => {
    if (employeeId == null) return;
    try {
      await store.refreshRefs();
      const [a, m] = await Promise.all([api.absenceListByEmployee(employeeId), api.monitoringList({ employeeId, includeArchived: true })]);
      setAbsences(a);
      setMons(m.filter((x) => x.status !== 'архив'));
    } catch (e) {
      toast.error(errText(e));
    }
  };

  useEffect(() => {
    setEditing(false);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, store.version]);

  if (!emp) return null;

  return (
    <Sheet open={employeeId != null} onClose={onClose} title={emp.full_name}>
      {!editing ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={emp.status} />
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Редактировать
            </Button>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Отдел">{emp.department_name ?? '—'}</Field>
            <Field label="Должность">{emp.position || '—'}</Field>
            <Field label="Внутренний телефон">{emp.internal_phone || '—'}</Field>
            <Field label="Мобильный телефон">{emp.mobile_phone || '—'}</Field>
            <Field label="Почта">{emp.email || '—'}</Field>
            <Field label="День рождения">{emp.birthday ? `${fmtDate(emp.birthday)}${emp.days_to_birthday != null ? ` · ${birthdayHint(emp.days_to_birthday)}` : ''}` : '—'}</Field>
          </dl>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Функционал</div>
            <p className="whitespace-pre-wrap text-sm">{emp.functions || 'Не указан'}</p>
          </div>

          <AbsenceSection empId={emp.id} absences={absences} onChanged={() => void reload()} />

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Мониторинги сотрудника</div>
            {mons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет активных мониторингов.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {mons.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                    <span className="truncate">{m.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {m.employee_id === emp.id ? m.type_name : `дублёр · ${m.type_name}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {emp.archived && <Badge tone="gray">Архивная запись</Badge>}
        </div>
      ) : (
        <EmployeeForm
          employeeId={emp.id}
          initial={{ ...emptyEmployee(), ...pickEmp(emp) }}
          onSaved={() => {
            setEditing(false);
            void reload();
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </Sheet>
  );
}

function birthdayHint(days: number): string {
  if (days === 0) return 'сегодня!';
  if (days === 1) return 'завтра';
  return `через ${days} дн.`;
}

function pickEmp(e: EmployeeView) {
  return {
    full_name: e.full_name, department_id: e.department_id, position: e.position, internal_phone: e.internal_phone,
    mobile_phone: e.mobile_phone, email: e.email, birthday: e.birthday, functions: e.functions,
    is_fired: e.is_fired, fired_date: e.fired_date, archived: e.archived,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function AbsenceSection({ empId, absences, onChanged }: { empId: number; absences: Absence[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AbsenceInput>({ employee_id: empId, absence_type: 'отпуск', date_from: todayIsoLocal(), date_to: todayIsoLocal(), note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = async () => {
    const parsed = absenceSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrorsFromIssue(parsed.error));
      return;
    }
    try {
      await api.absenceCreate(parsed.data);
      setAdding(false);
      setErrors({});
      onChanged();
      toast.success('Отсутствие добавлено');
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const remove = async (id: number) => {
    try {
      await api.absenceDelete(id);
      onChanged();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Отсутствия</div>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>Добавить</Button>
        )}
      </div>
      {adding && (
        <div className="mb-3 space-y-3 rounded-lg border bg-muted/40 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Тип</Label>
              <Select value={form.absence_type} onValueChange={(v) => setForm((f) => ({ ...f, absence_type: toAbsenceType(v) }))} options={ABSENCE_TYPE_OPTIONS} />
            </div>
            <div>
              <Label>Период *</Label>
              <DateRangeField from={form.date_from} to={form.date_to} onChange={(from, to) => setForm((f) => ({ ...f, date_from: from ?? todayIsoLocal(), date_to: to ?? f.date_to }))} />
              {errors.date_from && <p className="mt-1 text-xs text-red-500">{errors.date_from}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor={`abs-note-${empId}`}>Примечание</Label>
            <Input id={`abs-note-${empId}`} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Например: ежегодный отпуск" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Отмена</Button>
            <Button size="sm" onClick={() => void save()}>Сохранить</Button>
          </div>
        </div>
      )}
      {absences.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">Пока пусто — добавьте отсутствие, если сотрудник в отпуске, командировке или на больничном.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {absences.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
              <span>
                <span className="font-medium capitalize">{a.absence_type}</span>{' '}
                <span className="text-muted-foreground">{shortDate(a.date_from)}–{shortDate(a.date_to)}</span>
                {a.note && <span className="ml-2 text-xs text-muted-foreground">{a.note}</span>}
              </span>
              <button className="text-xs text-muted-foreground hover:text-red-500" onClick={() => void remove(a.id)}>Удалить</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

void IntSelect;
