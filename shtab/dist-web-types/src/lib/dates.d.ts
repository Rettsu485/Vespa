export declare const ISO_DATE: RegExp;
export declare function todayIso(): string;
export declare function toDisplay(iso: string | null | undefined): string;
export declare function daysBetween(fromIso: string, toIso: string): number;
/** Относительная подпись для дедлайна: сегодня/завтра/через N дней/просрочено на N дней. */
export declare function relativeDeadlineLabel(daysLeft: number | null): string;
export declare function plural(n: number, one: string, few: string, many: string): string;
/** Приблизительный возраст строки («N дней назад») по ISO datetime. */
export declare function daysSince(createdOrUpdated: string): number;
export declare function addDaysIso(iso: string, n: number): string;
