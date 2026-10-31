// Каркас приложения: сайдбар + шапка с глобальным поиском + роутинг модулей.
import { useEffect, useMemo, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Radar,
  FileText,
  ListTodo,
  Settings as SettingsIcon,
  Search,
  Moon,
  Sun,
  MonitorSmartphone,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AppSettings } from '@shared/types';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { Button, Spinner, ToastProvider } from '@/components/ui';
import { cn } from '@/lib/utils';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TeamPage } from '@/features/team/TeamPage';
import { MonitoringsPage } from '@/features/monitorings/MonitoringsPage';
import { EdoPage } from '@/features/edo/EdoPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { CommandPalette } from '@/features/search/CommandPalette';

const NAV = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/team', label: 'Команда', icon: Users },
  { to: '/monitorings', label: 'Мониторинги', icon: Radar },
  { to: '/edo', label: 'ЭДО', icon: FileText },
  { to: '/tasks', label: 'Задачи', icon: ListTodo },
  { to: '/settings', label: 'Настройки', icon: SettingsIcon },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = (): AppSettings['theme'] => (theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : MonitorSmartphone;
  const label = theme === 'light' ? 'Светлая' : theme === 'dark' ? 'Тёмная' : 'Системная';
  return (
    <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={() => setTheme(next())}>
      <Icon className="h-4 w-4" /> Тема: {label}
    </Button>
  );
}

function Shell({ settings }: { settings: AppSettings }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  // Горячая клавиша Ctrl+K — глобальный поиск (по ТЗ).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const densityClass = settings.density === 'compact' ? '[&_.row]:py-1 [&_.row]:text-xs' : '';

  return (
    <div className="flex h-full">
      {/* Сайдбар */}
      <aside className="flex w-52 shrink-0 flex-col border-r bg-card">
        <div className="px-4 py-5 text-lg font-bold tracking-wide">Штаб</div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-2">
          <ThemeToggle />
        </div>
      </aside>

      {/* Основная область */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-6">
          <button
            className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-fast hover:bg-muted"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            Поиск…
            <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px]">Ctrl+K</kbd>
          </button>
        </header>
        <main className={cn('min-w-0 flex-1 overflow-y-auto p-6', densityClass)}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/monitorings" element={<MonitoringsPage />} />
            <Route path="/edo" element={<EdoPage settings={settings} />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/settings" element={<SettingsPage initial={settings} />} />
          </Routes>
        </main>
      </div>

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenEmployee={(id) => navigate(`/team?employee=${id}`)}
        onOpenMonitoring={(id) => navigate(`/monitorings?monitoring=${id}`)}
        onOpenDoc={(id) => navigate(`/edo?doc=${id}`)}
        onOpenTask={(id) => navigate(`/tasks?task=${id}`)}
      />
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    api.settings.get().then(setSettings).catch(console.error);
  }, []);

  const persistTheme = useMemo(
    () => async (t: AppSettings['theme']) => {
      await api.settings.update({ theme: t });
      setSettings((s) => (s ? { ...s, theme: t } : s));
    },
    [],
  );

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <ToastProvider>
      <ThemeProvider initial={settings.theme} onPersist={(t) => void persistTheme(t)}>
        <HashRouter>
          <Shell settings={settings} />
        </HashRouter>
      </ThemeProvider>
    </ToastProvider>
  );
}
