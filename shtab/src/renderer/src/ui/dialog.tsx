// Диалог, выдвижная панель (Sheet), подтверждение удаления — Radix Dialog поверх shadcn-стиля.

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/renderer/src/lib/cn';
import { Button } from './primitives';

export const DialogRoot = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  children,
  className,
  title,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  title: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          'animate-dialog-in fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-xl transition-theme',
          wide ? 'max-w-3xl' : 'max-w-lg',
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-theme">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
        <DialogPrimitive.Description className="sr-only">Диалоговое окно</DialogPrimitive.Description>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Выдвижная панель справа — единый способ открыть карточку (ТЗ п.4). */
export function Sheet({
  open,
  onClose,
  title,
  children,
  width = 'max-w-2xl',
  headerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  headerExtra?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="animate-overlay-in fixed inset-0 z-40 bg-black/40" />
        <DialogPrimitive.Content
          className={cn(
            'fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l bg-card shadow-2xl outline-none',
            open ? 'animate-sheet-in' : '',
            width
          )}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
            <div className="flex items-center gap-2">
              {headerExtra}
              <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-theme">
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          <DialogPrimitive.Description className="sr-only">Карточка в выдвижной панели</DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Подтверждение опасного действия (удаление/архивация). */
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Удалить',
  doubleConfirm,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  /** Двойное подтверждение (ТЗ: «Очистить все данные»). */
  doubleConfirm?: boolean;
}) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!open) setArmed(false);
  }, [open]);

  return (
    <DialogRoot open={open}>
      <DialogContent title={title}>
        <div className="text-sm text-muted-foreground">{message}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (doubleConfirm && !armed) {
                setArmed(true);
                return;
              }
              onConfirm();
            }}
          >
            {doubleConfirm && !armed ? `Точно ${confirmLabel.toLowerCase()}?` : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
