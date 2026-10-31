// Управление темой: system | light | dark. Системная — по умолчанию (по ТЗ).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppSettings } from '@shared/types';

interface ThemeCtx {
  theme: AppSettings['theme'];
  setTheme: (t: AppSettings['theme']) => void;
}
const Ctx = createContext<ThemeCtx | null>(null);

function applyTheme(theme: AppSettings['theme']) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function ThemeProvider({ initial, onPersist, children }: { initial: AppSettings['theme']; onPersist: (t: AppSettings['theme']) => void; children: ReactNode }) {
  const [theme, setThemeState] = useState<AppSettings['theme']>(initial);

  const setTheme = useCallback(
    (t: AppSettings['theme']) => {
      setThemeState(t);
      onPersist(t);
    },
    [onPersist],
  );

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme('system');
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme вне ThemeProvider');
  return ctx;
}
