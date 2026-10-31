export declare function todayIso(): string;
/** ISO-дата + n дней. */
export declare function addDays(iso: string, n: number): string;
export declare function daysBetween(fromIso: string, toIso: string): number;
/** Дней до ближайшего дня рождения (сегодня → 0; если в этом году прошёл → со следующего года). */
export declare function daysToBirthday(birthdayIso: string | null, today: string): number | null;
