import { type ReactNode } from 'react';
import type { AppSettings } from '@shared/types';
interface ThemeCtx {
    theme: AppSettings['theme'];
    setTheme: (t: AppSettings['theme']) => void;
}
export declare function ThemeProvider({ initial, onPersist, children }: {
    initial: AppSettings['theme'];
    onPersist: (t: AppSettings['theme']) => void;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useTheme(): ThemeCtx;
export {};
