// Базовые UI-компоненты в стиле shadcn/ui (реализованы локально, без CLI-генерации — простое решение).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- Button ---------- */
type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'icon';

export function Button({
  variant = 'default',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const variants: Record<ButtonVariant, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs rounded-md',
    md: 'h-9 px-4 py-2 text-sm',
    icon: 'h-9 w-9 p-0',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Input / Textarea / Select ---------- */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors duration-fast',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-xs font-medium text-muted-foreground', className)} {...props} />;
}

/* ---------- Badge ---------- */
type BadgeTone = 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'violet';
export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'bg-secondary text-secondary-foreground border-border',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    gray: 'bg-muted text-muted-foreground border-border',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone], className)}>
      {children}
    </span>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>{children}</div>;
}

/* ---------- Spinner / EmptyState ---------- */
export function Spinner() {
  return <div className="m-8 h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      {hint ? <div className="text-xs text-muted-foreground/80">{hint}</div> : null}
    </div>
  );
}

/* ---------- Sheet (выдвижная панель справа) ---------- */
export function Sheet({
  open,
  onClose,
  title,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  // Esc закрывает панель (горячая клавиша из ТЗ).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 animate-overlay-show" onClick={onClose} />
      <div
        className={cn(
          'absolute right-0 top-0 flex h-full flex-col border-l bg-card shadow-2xl animate-slide-in-right',
          wide ? 'w-[720px]' : 'w-[560px]',
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="text-base font-semibold">{title}</div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Dialog (подтверждения) ---------- */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  danger,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-overlay-show" onClick={onCancel} />
      <Card className="relative z-10 w-[440px] p-6 shadow-xl animate-toast-in">
        <div className="text-base font-semibold">{title}</div>
        {description ? <div className="mt-2 text-sm text-muted-foreground">{description}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant={danger ? 'destructive' : 'default'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Tabs ---------- */
interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
}
const TabsContext = createContext<TabsCtx | null>(null);

export function Tabs({ value, onChange, children, className }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (ctx) return <>{children}</>;
  return (
    <TabsContext.Provider value={{ value, setValue: onChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: ReactNode }) {
  return <div className="flex gap-1 border-b">{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext)!;
  return (
    <button
      className={cn(
        'border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-fast -mb-px',
        ctx.value === value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return <div className="pt-4">{children}</div>;
}

/* ---------- Toasts ---------- */
interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
}
const ToastContext = createContext<{ toast: (kind: ToastItem['kind'], text: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((kind: ToastItem['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'animate-toast-in rounded-lg border px-4 py-3 text-sm shadow-lg',
              t.kind === 'success' ? 'bg-card text-card-foreground' : 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): { toast: (kind: 'success' | 'error', text: string) => void } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast вне ToastProvider');
  return ctx;
}

/* ---------- Прочее ---------- */
export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors duration-fast',
            value === o.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
