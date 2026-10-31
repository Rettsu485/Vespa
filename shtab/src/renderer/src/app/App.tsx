// Каркас приложения: сайдбар + шапка (поиск Ctrl+K) + роутинг + темы + тосты.

import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Keyboard } from 'lucide-react';
import { StoreProvider, useStore } from '@/renderer/src/lib/store';
import { ThemeProvider } from '@/renderer/src/lib/theme';
import { TooltipProvider } from '@/renderer/src/ui/radix';
import { Sidebar } from './Sidebar';
import { GlobalSearch } from './GlobalSearch';
import { DashboardPage } from '@/renderer/src/features/dashboard/DashboardPage';
import { TeamPage } from '@/renderer/src/features/team/TeamPage';
import { MonitoringsPage } from '@/renderer/src/features/monitorings/MonitoringsPage';
import { EdoPage } from '@/renderer/src/features/edo/EdoPage';
import { TasksPage } from '@/renderer/src/features/tasks/TasksPage';
import { SettingsPage } from '@/renderer/src/features/settings/SettingsPage';

function Shell() {
  const store = useStore();
  const [searchOpen, setSearchOpen] = useState(false);

  // Горячая клавиша Ctrl+K — глобальный поиск (ТЗ п.6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Плотность таблиц — класс на контейнере (ТЗ п.4).
  const densityClass = store.settings.tableDensity === 'compact' ? 'density-compact' : '';

  return (
    <div className="flex h-screen min-w-[1100px] overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-6">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex w-96 items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-theme hover:bg-accent hover:text-foreground"
          >
            <Keyboard className="h-4 w-4" />
            Поиск… <span className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Ctrl+K</span>
          </button>
          <div className="text-xs text-muted-foreground">Локальное рабочее пространство · данные хранятся на этом компьютере</div>
        </header>
        <main className={`min-h-0 flex-1 overflow-y-auto p-6 ${densityClass}`}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/monitorings" element={<MonitoringsPage />} />
            <Route path="/edo" element={<EdoPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

function Boot() {
  const store = useStore();
  return (
    <ThemeProvider initialMode={store.settings.theme} onModeChange={store.setTheme}>
      <TooltipProvider>
        <Shell />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Boot />
    </StoreProvider>
  );
}
