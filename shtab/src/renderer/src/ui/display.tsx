// Общие «представленческие» компоненты: статусная точка сотрудника, бейдж срока, прогресс, строка фильтров.

import { AlertTriangle, Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EmployeeStatusInfo } from '@/shared/types';
import { relativeDays } from '@/renderer/src/lib/dates';
import { cn } from '@/renderer/src/lib/cn';
import { Badge, Input } from './primitives';

export function statusDotClass(status: EmployeeStatusInfo): string {
  switch (status.kind) {
    case 'work': return 'bg-emerald-500';
    case 'vacation': return 'bg-sky-500';
    case 'business_trip': return 'bg-violet-500';
    case 'sick': return 'bg-rose-400';
    case 'other': return 'bg-amber-500';
    case 'fired': return 'bg-zinc-400';
  }
}

export function StatusDot({ status }: { status: EmployeeStatusInfo }) {
  return <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', statusDotClass(status))} title={status.label} />;
}

export function StatusBadge({ status }: { status: EmployeeStatusInfo }) {
  const tone =
    status.kind === 'work' ? 'green'
      : status.kind === 'fired' ? 'gray'
        : status.kind === 'vacation' ? 'blue'
          : status.kind === 'business_trip' ? 'purple'
            : status.kind === 'sick' ? 'red'
              : 'yellow';
  return <Badge tone={tone}>{status.label}</Badge>;
}

/** Бейдж «осталось дней»: просрочено — красный, ≤3 — оранжевый, иначе нейтральный; снят — серый. */
export function DeadlineBadge({ daysLeft, offControl }: { daysLeft: number | null; offControl?: boolean }) {
  if (offControl) return <Badge tone="gray">Снят с контроля</Badge>;
  if (daysLeft == null) return <span className="text-muted-foreground">—</span>;
  const label = relativeDays(daysLeft);
  if (daysLeft < 0) return <Badge tone="red">{label}</Badge>;
  if (daysLeft <= 3) return <Badge tone="orange">{label}</Badge>;
  return <Badge tone="neutral">{label}</Badge>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RedFlag() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400" title="Исполнитель отсутствует, дублёр не назначен">
      <AlertTriangle className="h-3.5 w-3.5" />
      нет дублёра
    </span>
  );
}

/** Строка поиска/фильтрации списка (ТЗ п.4: фильтр-строка у всех списков). */
export function FilterRow({ query, onQuery, placeholder, children }: { query: string; onQuery: (v: string) => void; placeholder: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1 basis-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} className="pl-8 pr-8" />
        {query && (
          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => onQuery('')} aria-label="Очистить">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** Переключатель вида (сегментированный контрол). */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-theme',
            value === o.value ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
