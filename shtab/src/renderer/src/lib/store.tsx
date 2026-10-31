// Глобальный контекст renderer: настройки + справочники (сотрудники, типы задач),
// обновление карточек после изменений (event-bus для открытия карточек из поиска/дашборда).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { AppSettings, Department, EmployeeView, TaskType, ThemeMode } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { api, errText } from './api';

/** Событие «открыть карточку» — используется глобальным поиском и дашбордом. */
export type OpenCardEvent =
  | { kind: 'employee'; id: number }
  | { kind: 'monitoring'; id: number }
  | { kind: 'edo'; id: number }
  | { kind: 'task'; id: number };

type Listener = (e: OpenCardEvent) => void;

export interface StoreCtx {
  settings: AppSettings;
  setTheme: (m: ThemeMode) => void;
  employees: EmployeeView[];
  employeeById: Map<number, EmployeeView>;
  departments: Department[];
  taskTypes: TaskType[];
  /** Перезагрузить справочники. */
  refreshRefs: () => Promise<void>;
  /** Пометить данные изменёнными (страницы подписываются на version). */
  bump: () => void;
  version: number;
  emitOpenCard: (e: OpenCardEvent) => void;
  subscribeOpenCard: (fn: Listener) => () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [version, setVersion] = useState(0);
  const listenersRef = useMemo(() => new Set<Listener>(), []);

  const refreshRefs = useCallback(async () => {
    try {
      const [emps, deps, types] = await Promise.all([
        api.employeeList({ includeArchived: true }),
        api.departmentList(),
        api.taskTypeList({ includeInactive: true }),
      ]);
      setEmployees(emps);
      setDepartments(deps);
      setTaskTypes(types);
    } catch (err) {
      toast.error(errText(err));
    }
  }, []);

  useEffect(() => {
    void api.settingsGet().then(setSettings).catch((e: unknown) => toast.error(errText(e)));
    void refreshRefs();
  }, [refreshRefs]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const setTheme = useCallback((m: ThemeMode) => {
    setSettings((s) => ({ ...s, theme: m }));
    void api.settingsSet({ theme: m }).then(setSettings).catch((e: unknown) => toast.error(errText(e)));
  }, []);

  const emitOpenCard = useCallback(
    (e: OpenCardEvent) => {
      for (const fn of listenersRef) fn(e);
    },
    [listenersRef]
  );

  const subscribeOpenCard = useCallback(
    (fn: Listener) => {
      listenersRef.add(fn);
      return () => listenersRef.delete(fn);
    },
    [listenersRef]
  );

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  return (
    <Ctx.Provider
      value={{ settings, setTheme, employees, employeeById, departments, taskTypes, refreshRefs, bump, version, emitOpenCard, subscribeOpenCard }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('StoreProvider не найден');
  return ctx;
}

/** Хук: перезагружать данные при изменении глобальной версии. */
export function useDataVersion(): number {
  return useStore().version;
}
