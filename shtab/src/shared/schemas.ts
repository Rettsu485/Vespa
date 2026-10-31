import { z } from 'zod';

// Общие схемы валидации (используются и в renderer, и при сохранении через IPC).

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты');
const optionalIsoDate = isoDate.nullable().or(z.literal('')).transform((v) => (v === '' ? null : v));

export const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название отдела'),
  parent_id: z.number().int().nullable(),
  sort_order: z.number().int(),
});

export const employeeSchema = z.object({
  full_name: z.string().trim().min(1, 'Укажите ФИО'),
  department_id: z.number().int().nullable(),
  position: z.string().trim(),
  internal_phone: z.string().trim(),
  mobile_phone: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Некорректная почта'),
  birthday: optionalIsoDate,
  functions: z.string(),
  is_fired: z.boolean(),
  fired_date: optionalIsoDate,
  archived: z.boolean(),
});

export const absenceSchema = z.object({
  employee_id: z.number().int().positive('Выберите сотрудника'),
  absence_type: z.enum(['отпуск', 'командировка', 'больничный', 'иное']),
  date_from: isoDate,
  date_to: isoDate,
  note: z.string(),
});

export const taskTypeSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название типа'),
  sort_order: z.number().int(),
  active: z.boolean(),
});

export const monitoringSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название'),
  type_id: z.number().int().positive('Выберите тип'),
  employee_id: z.number().int().positive('Выберите исполнителя'),
  deadline: optionalIsoDate,
  note: z.string(),
  status: z.enum(['в работе', 'приостановлено', 'выполнено', 'архив']),
  deputy_employee_id: z.number().int().nullable(),
  deputy_from: optionalIsoDate,
  deputy_to: optionalIsoDate,
});

export const edoDocumentSchema = z.object({
  doc_number: z.string().trim().min(1, 'Укажите номер документа'),
  doc_url: z.string().trim(),
  summary: z.string().trim(),
  instruction: z.string(),
  responsible_id: z.number().int().nullable(),
  participants: z.string(),
  control_type: z.enum(['red', 'green']),
  deadline: optionalIsoDate,
  off_control: z.boolean(),
  off_control_date: optionalIsoDate,
  sub_resolution: z.string(),
  approval_number: z.string().trim(),
  approval_url: z.string().trim(),
  approval_status: z.enum(['', 'на согласовании', 'на подписи', 'подписан']),
  archived: z.boolean(),
});

export const workLogSchema = z.object({
  entity_type: z.enum(['edo', 'task']),
  entity_id: z.number().int().positive(),
  log_date: isoDate,
  text: z.string().trim().min(1, 'Введите текст записи'),
});

export const taskSchema = z.object({
  theme: z.string().trim(),
  title: z.string().trim().min(1, 'Укажите название задачи'),
  priority: z.enum(['срочно', 'высокий', 'обычный', 'низкий']),
  deadline: optionalIsoDate,
  status: z.enum(['входящая', 'в работе', 'ожидание', 'на проверке', 'выполнено', 'отменено']),
  wait_until: optionalIsoDate,
  next_action: z.string(),
  participants: z.string(),
  note: z.string(),
  archived: z.boolean(),
});

export const checkItemSchema = z.object({
  task_id: z.number().int().positive(),
  title: z.string().trim().min(1, 'Введите пункт'),
  done: z.boolean(),
  sort_order: z.number().int(),
});

export const settingsPatchSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  tableDensity: z.enum(['compact', 'normal']).optional(),
  controlRedName: z.string().trim().min(1).optional(),
  controlGreenName: z.string().trim().min(1).optional(),
  edoLinkTemplate: z.string().optional(),
});

/** Проверка формы zod → сообщения об ошибках по полям. */
export function fieldErrorsFromIssue(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
