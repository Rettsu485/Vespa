import { type ReactNode } from 'react';
type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'icon';
export declare function Button({ variant, size, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
}): import("react").JSX.Element;
export declare function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>;
}): import("react").JSX.Element;
export declare function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>): import("react").JSX.Element;
export declare function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>): import("react").JSX.Element;
export declare function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>): import("react").JSX.Element;
export type BadgeTone = 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'violet';
export declare function Badge({ tone, className, children }: {
    tone?: BadgeTone;
    className?: string;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function Card({ className, children }: {
    className?: string;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function Spinner(): import("react").JSX.Element;
export declare function EmptyState({ title, hint }: {
    title: string;
    hint?: string;
}): import("react").JSX.Element;
export declare function Sheet({ open, onClose, title, wide, children, }: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    wide?: boolean;
    children: ReactNode;
}): import("react").JSX.Element | null;
export declare function ConfirmDialog({ open, title, description, confirmLabel, danger, onCancel, onConfirm, }: {
    open: boolean;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    danger?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}): import("react").JSX.Element | null;
export declare function Tabs({ value, onChange, children, className }: {
    value: string;
    onChange: (v: string) => void;
    children: ReactNode;
    className?: string;
}): import("react").JSX.Element;
export declare function TabsList({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function TabsTrigger({ value, children }: {
    value: string;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function TabsContent({ value, children }: {
    value: string;
    children: ReactNode;
}): import("react").JSX.Element | null;
export declare function ToastProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useToast(): {
    toast: (kind: 'success' | 'error', text: string) => void;
};
export declare function Field({ label, children, error }: {
    label: string;
    children: ReactNode;
    error?: string;
}): import("react").JSX.Element;
export declare function SegmentedControl<T extends string>({ options, value, onChange, }: {
    options: {
        value: T;
        label: string;
    }[];
    value: T;
    onChange: (v: T) => void;
}): import("react").JSX.Element;
export {};
