// Тема приложения: системная / светлая / тёмная. Класс .dark на <html>.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ThemeMode } from '@/shared/types';

interface ThemeCtx {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function applyDark(mode: ThemeMode): void {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function ThemeProvider({ initialMode, onModeChange, children }: { initialMode: ThemeMode; onModeChange: (m: ThemeMode) => void; children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      applyDark(m);
      onModeChange(m);
    },
    [onModeChange]
  );

  useEffect(() => {
    applyDark(mode);
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyDark('system');
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [mode]);

  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ThemeProvider не найден');
  return ctx;
}
