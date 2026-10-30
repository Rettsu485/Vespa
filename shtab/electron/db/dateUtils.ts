// Утилиты main-процесса для вычислений по датам (без зависимостей от renderer).
import { format, parseISO, differenceInCalendarDays } from 'date-fns';

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function daysBetween(fromIso: string, toIso: string): number {
  return differenceInCalendarDays(parseISO(toIso), parseISO(fromIso));
}

/** Дней до ближайшего дня рождения (сегодня → 0; если в этом году прошёл → со следующего года). */
export function daysToBirthday(birthdayIso: string | null, today: string): number | null {
  if (!birthdayIso) return null;
  const [, m, d] = birthdayIso.split('-').map(Number);
  if (!m || !d) return null;
  const year = Number(today.slice(0, 4));
  let candidate = `${today.slice(0, 4)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (daysBetween(today, candidate) < 0) {
    candidate = `${year + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return daysBetween(today, candidate);
}
