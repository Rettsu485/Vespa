// Левая боковая панель: разделы + переключатель темы внизу (ТЗ п.4).

import { ClipboardList, FileText, LayoutDashboard, Radio, Settings, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { MonitorSun, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/renderer/src/lib/theme';
import type { ThemeMode } from '@/shared/types';
import { cn } from '@/renderer/src/lib/cn';

const NAV = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard, end: true },
  { to: '/team', label: 'Команда', icon: Users },
  { to: '/monitorings', label: 'Мониторинги', icon: Radio },
  { to: '/edo', label: 'ЭДО', icon: FileText },
  { to: '/tasks', label: 'Задачи', icon: ClipboardList },
  { to: '/settings', label: 'Настройки', icon: Settings },
];

const THEME_NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<ThemeMode, string> = { system: 'Системная', light: 'Светлая', dark: 'Тёмная' };

export function Sidebar() {
  const { mode, setMode } = useTheme();
  const Icon = mode === 'system' ? MonitorSun : mode === 'light' ? Sun : Moon;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">Ш</div>
        <div className="text-sm font-semibold leading-tight">
          Штаб
          <div className="text-[11px] font-normal text-muted-foreground">Управление СМП и ЧС</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-theme hover:bg-accent hover:text-accent-foreground',
                isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-2">
        <button
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-theme hover:bg-accent hover:text-foreground"
          onClick={() => setMode(THEME_NEXT[mode])}
          title="Переключить тему"
        >
          <Icon className="h-4 w-4" />
          Тема: {THEME_LABEL[mode]}
        </button>
      </div>
    </aside>
  );
}
