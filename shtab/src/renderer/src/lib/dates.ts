// Утилиты отображения дат: ДД.ММ.ГГГГ + относительные подписи (ТЗ п.2).

import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: ru });
  } catch {
    return iso;
  }
}

export function fmtDateTime(sqlTs: string | null | undefined): string {
  if (!sqlTs) return '—';
  // better-sqlite3 отдаёт 'YYYY-MM-DD HH:mm:ss' — парсим через Date.
  const d = new Date(sqlTs.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return sqlTs;
  return format(d, 'dd.MM.yyyy HH:mm', { locale: ru });
}

/** Относительная подпись по количеству дней: сегодня/завтра/через N дней/просрочено на N дней. */
export function relativeDays(daysLeft: number | null | undefined): string | null {
  if (daysLeft == null) return null;
  if (daysLeft === 0) return 'сегодня';
  if (daysLeft === 1) return 'завтра';
  if (daysLeft > 1 && daysLeft <= 4) return `через ${daysLeft} дня`;
  if (daysLeft > 1) return `через ${daysLeft} дней`;
  if (daysLeft === -1) return 'просрочено на 1 день';
  if (daysLeft >= -4) return `просрочено на ${-daysLeft} дня`;
  return `просрочено на ${-daysLeft} дней`;
}

/** «вернётся 12.11» — короткая форма даты для подписей. */
export function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM', { locale: ru });
  } catch {
    return iso;
  }
}

export function todayIsoLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
