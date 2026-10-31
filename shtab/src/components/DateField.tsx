// Календарный виджет ввода даты (все даты вводятся только через него, по ТЗ).
// Простое решение: нативный input[type=date] + текстовый формат ДД.ММ.ГГГГ для отображения.
import { Input, Button } from '@/components/ui';
import { toDisplay } from '@/lib/dates';
import { CalendarDays, X } from 'lucide-react';

export function DateField({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        {/* Невидимый нативный date-picker поверх поля с читаемым форматом */}
        <Input readOnly value={value ? toDisplay(value) : ''} placeholder={label ?? 'не указана'} className="pr-8 cursor-pointer" />
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label="Выбор даты"
        />
        <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {value ? (
        <Button variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Очистить дату">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
