import { differenceInCalendarDays, parseISO } from 'date-fns';

/** Сегодня как yyyy-MM-dd (локальная дата). */
export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Разница в календарных днях: a − b. */
export function daysBetween(aIso: string, bIso: string): number {
  return differenceInCalendarDays(parseISO(aIso), parseISO(bIso));
}

/** Дней до ближайшего дня рождения (0 — сегодня). Сравниваются месяц и день. */
export function daysToBirthday(birthdayIso: string | null, today = todayIso()): number | null {
  if (!birthdayIso) return null;
  try {
    const b = parseISO(birthdayIso);
    const t = parseISO(today);
    let candidate = new Date(t.getFullYear(), b.getMonth(), b.getDate());
    if (differenceInCalendarDays(candidate, t) < 0) {
      candidate = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
    }
    return differenceInCalendarDays(candidate, t);
  } catch {
    return null;
  }
}

export function nowSqlTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
