// Календарный виджет выбора даты (ТЗ п.6: все даты вводятся через календарь).

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { fmtDate } from '@/renderer/src/lib/dates';
import { cn } from '@/renderer/src/lib/cn';
import { Button, Input } from './primitives';

const calendarClassnames = {
  root: 'p-3',
  months: 'flex flex-col sm:flex-row gap-4',
  month: 'flex flex-col gap-4',
  month_caption: 'flex justify-center pt-1 relative items-center h-8',
  caption_label: 'text-sm font-medium capitalize',
  nav: 'flex gap-1 absolute right-0',
  button_previous: 'inline-flex h-7 w-7 items-center justify-center rounded-md opacity-60 hover:opacity-100 hover:bg-accent',
  button_next: 'inline-flex h-7 w-7 items-center justify-center rounded-md opacity-60 hover:opacity-100 hover:bg-accent',
  week_header: 'flex w-full pt-2',
  weekday: 'flex-1 text-[0.65rem] uppercase text-muted-foreground font-normal text-center',
  weeks: 'flex flex-col gap-1',
  week: 'flex w-full',
  day: 'relative p-0 text-center text-sm flex-1',
  day_button: 'inline-flex h-8 w-8 items-center justify-center rounded-md transition-theme hover:bg-accent aria-selected:bg-primary aria-selected:text-primary-foreground aria-disabled:opacity-30 aria-disabled:hover:bg-transparent',
};

export function DatePicker({
  value,
  onChange,
  placeholder = 'Не указана',
  clearable = true,
  disabled,
}: {
  /** yyyy-MM-dd или null */
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <Button variant="outline" className={cn('justify-start font-normal', !value && 'text-muted-foreground')}>
          <CalendarDays className="h-4 w-4 opacity-60" />
          {value ? fmtDate(value) : placeholder}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="start" className="z-[70] rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none">
          <DayPicker
            mode="single"
            locale={ru}
            selected={selected}
            captionLayout="dropdown-buttons"
            defaultMonth={selected}
            startMonth={new Date(2000, 0)}
            endMonth={new Date(new Date().getFullYear() + 15, 11)}
            onSelect={(d) => {
              if (d) {
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                onChange(iso);
              } else if (clearable) {
                onChange(null);
              }
              setOpen(false);
            }}
            classNames={calendarClassnames}
          />
          {clearable && (
            <div className="border-t px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Очистить дату
              </Button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** Пара дат «с … по …» для периодов (отпуск, дублёр). */
export function DateRangeField({
  from,
  to,
  onChange,
}: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const range: DateRange | undefined =
    from || to
      ? { from: from ? new Date(from + 'T00:00:00') : undefined, to: to ? new Date(to + 'T00:00:00') : undefined }
      : undefined;

  const iso = (d: Date | undefined): string | null =>
    d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Input
          readOnly
          value={from || to ? `${fmtDate(from)} — ${fmtDate(to)}` : 'Период не указан'}
          className={cn('cursor-pointer', !from && !to && 'text-muted-foreground')}
          placeholder="Период не указан"
        />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="start" className="z-[70] rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none">
          <DayPicker
            mode="range"
            locale={ru}
            selected={range}
            captionLayout="dropdown-buttons"
            defaultMonth={range?.from}
            startMonth={new Date(2000, 0)}
            endMonth={new Date(new Date().getFullYear() + 15, 11)}
            numberOfMonths={2}
            onSelect={(r) => {
              if (r?.from && r?.to) {
                onChange(iso(r.from), iso(r.to));
                setOpen(false);
              }
            }}
            classNames={calendarClassnames}
          />
          <div className="border-t px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(null, null);
                setOpen(false);
              }}
            >
              Очистить период
            </Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
