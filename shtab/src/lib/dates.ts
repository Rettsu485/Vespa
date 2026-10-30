// Утилита дат. Решение по ТЗ: все даты храним в БД в ISO (YYYY-MM-DD),
// отображаем в формате ДД.ММ.ГГГГ. «Сегодня» считаем по локальному часовому поясу.
import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function toDisplay(iso: string | null | undefined): string {
  if (!iso || !ISO_DATE.test(iso)) return '';
  return format(parseISO(iso), 'dd.MM.yyyy', { locale: ru });
}

export function daysBetween(fromIso: string, toIso: string): number {
  return differenceInCalendarDays(parseISO(toIso), parseISO(fromIso));
}

/** Относительная подпись для дедлайна: сегодня/завтра/через N дней/просрочено на N дней. */
export function relativeDeadlineLabel(daysLeft: number | null): string {
  if (daysLeft === null) return '';
  if (daysLeft < 0) return `просрочено на ${Math.abs(daysLeft)} ${plural(Math.abs(daysLeft), 'день', 'дня', 'дней')}`;
  if (daysLeft === 0) return 'сегодня';
  if (daysLeft === 1) return 'завтра';
  if (daysLeft <= 4) return `через ${daysLeft} ${plural(daysLeft, 'день', 'дня', 'дней')}`;
  return `через ${daysLeft} ${plural(daysLeft, 'день', 'дня', 'дней')}`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** Приблизительный возраст строки («N дней назад») по ISO datetime. */
export function daysSince(createdOrUpdated: string): number {
  const isoDate = createdOrUpdated.slice(0, 10);
  if (!ISO_DATE.test(isoDate)) return 0;
  return differenceInCalendarDays(parseISO(todayIso()), parseISO(isoDate));
}

export function addDaysIso(iso: string, n: number): string {
  return format(addDays(parseISO(iso), n), 'yyyy-MM-dd');
}
