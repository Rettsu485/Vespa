// Radix-обёртки: Select, Tabs, Checkbox, Switch, Tooltip.

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/renderer/src/lib/cn';

// ── Select (value — строка; null передаётся как '') ───────

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
}: {
  value: string | null;
  onValueChange: (v: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Root value={value ?? ''} onValueChange={(v) => onValueChange(v === '' ? null : v)} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-theme placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder ?? 'Выберите…'} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" className="z-[70] max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <SelectPrimitive.ScrollUpButton className="flex justify-center py-1"><ChevronUp className="h-4 w-4" /></SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            <SelectPrimitive.Group>
              {options.map((o) => (
                <SelectPrimitive.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-theme hover:bg-accent data-[highlighted]:bg-accent data-[state=checked]:font-medium"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Group>
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex justify-center py-1"><ChevronDown className="h-4 w-4" /></SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/** Select с числовыми id (null = «не выбрано»). */
export function IntSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
}: {
  value: number | null;
  onValueChange: (v: number | null) => void;
  options: Array<{ id: number; label: string }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value == null ? null : String(value)}
      onValueChange={(v) => onValueChange(v == null ? null : Number(v))}
      options={options.map((o) => ({ value: String(o.id), label: o.label }))}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}

// ── Tabs ──────────────────────────────────────────────────

export const Tabs = TabsPrimitive.Root;

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', className)}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-theme focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('mt-3 outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}

// ── Checkbox / Switch ─────────────────────────────────────

export function Checkbox({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-[4px] border border-primary shadow transition-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className
      )}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3.5 w-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-theme focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

// ── Tooltip ───────────────────────────────────────────────

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={300}>{children}</TooltipPrimitive.Provider>;
}

export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          className="z-[80] rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
