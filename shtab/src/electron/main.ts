// Точка входа main-процесса: окно, БД, диспетчер типизированного IPC, автобэкап при запуске.

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { getBackupDir, initDatabase } from './db/database';
import { TeamRepository } from './repositories/teamRepo';
import { MonitoringRepository } from './repositories/monitoringRepo';
import { EdoRepository, WorkLogRepository } from './repositories/edoRepo';
import { TaskRepository } from './repositories/taskRepo';
import { SettingsService } from './services/settingsService';
import { runBackup } from './services/backupService';
import { buildDashboard, globalSearch, type DashboardServices } from './services/dashboardService';
import { loadDemoData } from './services/demoService';
import { IPC_CHANNEL, type IpcRequest, type IpcResponse } from '../shared/ipc';
import {
  absenceSchema,
  checkItemSchema,
  departmentSchema,
  edoDocumentSchema,
  employeeSchema,
  monitoringSchema,
  settingsPatchSchema,
  taskSchema,
  taskTypeSchema,
  workLogSchema,
} from '../shared/schemas';
import type { Absence, AppSettings, EdoDocument, Employee, Monitoring, Task, TaskCheckItem, TaskType, Department } from '../shared/types';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'Штаб',
    width: 1440,
    height: 900,
    minWidth: 1100, // минимальная поддерживаемая ширина окна (ТЗ п.6)
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // нужен для require('electron') в preload при contextIsolation
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Внешние ссылки — только в системном браузере.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    void mainWindow.loadURL('http://localhost:5173');
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupServices() {
  const db = initDatabase(app.getPath('userData'));
  const settings = new SettingsService(db);
  const team = new TeamRepository(db);
  const monitorings = new MonitoringRepository(db);
  const edo = new EdoRepository(db);
  const tasks = new TaskRepository(db);
  const workLog = new WorkLogRepository(db);
  const services: DashboardServices = { db, settings, team, monitorings, edo, tasks, workLog };
  return { db, settings, team, monitorings, edo, tasks, workLog, services };
}

type Handlers = ReturnType<typeof setupServices>;

/** Диспетчер: имя метода → реализация. Аргументы приходят как есть (renderer их сериализует). */
function buildHandlers(h: Handlers): Record<string, (...args: unknown[]) => unknown> {
  const currentSettings = (): AppSettings => h.settings.get();
  const num = (v: unknown): number => {
    const n = Number(v);
    if (!Number.isInteger(n)) throw new Error('Некорректный идентификатор');
    return n;
  };

  return {
    // ── Настройки ──────────────────────────────────────────
    settingsGet: () => h.settings.get(),
    settingsSet: (patch) => h.settings.set(settingsPatchSchema.parse(patch) as Partial<AppSettings>),

    // ── Команда ────────────────────────────────────────────
    departmentList: () => h.team.listDepartments(),
    departmentTree: () => h.team.departmentTree(),
    departmentCreate: (input) => h.team.createDepartment(departmentSchema.parse(input) as Omit<Department, 'id'>),
    departmentUpdate: (id, input) => h.team.updateDepartment(num(id), departmentSchema.parse(input) as Omit<Department, 'id'>),
    departmentDelete: (id) => h.team.deleteDepartment(num(id)),
    employeeList: (opts) => {
      const o = opts as { includeArchived?: boolean };
      return h.team.listEmployees({ includeArchived: Boolean(o?.includeArchived) });
    },
    employeeGet: (id) => h.team.getEmployee(num(id)),
    employeeCreate: (input) => h.team.createEmployee(employeeSchema.parse(input) as unknown as Omit<Employee, 'id' | 'created_at' | 'updated_at'>),
    employeeUpdate: (id, input) => h.team.updateEmployee(num(id), employeeSchema.parse(input) as unknown as Omit<Employee, 'id' | 'created_at' | 'updated_at'>),
    employeeArchive: (id, archived) => h.team.setArchived(num(id), Boolean(archived)),
    absenceListByEmployee: (employeeId) => h.team.listAbsencesByEmployee(num(employeeId)),
    absenceCreate: (input) => h.team.createAbsence(absenceSchema.parse(input) as unknown as Omit<Absence, 'id'>),
    absenceUpdate: (id, input) => h.team.updateAbsence(num(id), absenceSchema.parse(input) as unknown as Omit<Absence, 'id'>),
    absenceDelete: (id) => h.team.deleteAbsence(num(id)),
    absenceTimeline: (daysAhead) => h.team.absenceTimeline(num(daysAhead)),

    // ── Мониторинги ────────────────────────────────────────
    taskTypeList: (opts) => h.monitorings.listTaskTypes(opts as { includeInactive?: boolean } | undefined),
    taskTypeCreate: (input) => h.monitorings.createTaskType(taskTypeSchema.parse(input) as unknown as Omit<TaskType, 'id'>),
    taskTypeUpdate: (id, input) => h.monitorings.updateTaskType(num(id), taskTypeSchema.parse(input) as unknown as Omit<TaskType, 'id'>),
    taskTypeDelete: (id) => h.monitorings.deleteTaskType(num(id)),
    taskTypeReorder: (orderedIds) => h.monitorings.reorderTaskTypes((orderedIds as unknown[]).map(num)),
    monitoringList: (opts) => {
      const o = opts as { typeId?: number | null; employeeId?: number | null; status?: string | null; includeArchived?: boolean };
      return h.monitorings.listMonitorings({ ...o, typeId: o.typeId ?? null, employeeId: o.employeeId ?? null, status: o.status ?? null });
    },
    monitoringGet: (id) => h.monitorings.getMonitoring(num(id)),
    monitoringCreate: (input) => h.monitorings.createMonitoring(monitoringSchema.parse(input) as unknown as Omit<Monitoring, 'id' | 'created_at' | 'updated_at'>),
    monitoringUpdate: (id, input) => h.monitorings.updateMonitoring(num(id), monitoringSchema.parse(input) as unknown as Omit<Monitoring, 'id' | 'created_at' | 'updated_at'>),
    monitoringArchive: (id) => h.monitorings.archiveMonitoring(num(id)),

    // ── ЭДО ────────────────────────────────────────────────
    edoList: (opts) => {
      const o = opts as Parameters<typeof h.edo.list>[0];
      return h.edo.list(o, currentSettings());
    },
    edoGet: (id) => h.edo.get(num(id), currentSettings()),
    edoCreate: (input) => h.edo.create(edoDocumentSchema.parse(input) as unknown as Omit<EdoDocument, 'id' | 'created_at' | 'updated_at'>, currentSettings()),
    edoUpdate: (id, input) => h.edo.update(num(id), edoDocumentSchema.parse(input) as unknown as Omit<EdoDocument, 'id' | 'created_at' | 'updated_at'>, currentSettings()),
    edoSetOffControl: (id, off) => h.edo.setOffControl(num(id), Boolean(off), currentSettings()),
    edoArchive: (id) => h.edo.archive(num(id), currentSettings()),

    // ── Журнал работы ──────────────────────────────────────
    workLogList: (entityType, entityId) => h.workLog.list(entityType as 'edo' | 'task', num(entityId)),
    workLogAdd: (input) => {
      const parsed = workLogSchema.parse(input);
      return h.workLog.add(parsed);
    },
    workLogDelete: (id) => h.workLog.delete(num(id)),

    // ── Задачи ─────────────────────────────────────────────
    taskList: (opts) => {
      const o = opts as { includeArchived?: boolean; status?: string | null };
      return h.tasks.list({ includeArchived: Boolean(o?.includeArchived), status: o?.status ?? null });
    },
    taskGet: (id) => h.tasks.get(num(id)),
    taskCreate: (input) => h.tasks.create(taskSchema.parse(input) as unknown as Omit<Task, 'id' | 'created_at' | 'updated_at'>),
    taskUpdate: (id, input) => h.tasks.update(num(id), taskSchema.parse(input) as unknown as Omit<Task, 'id' | 'created_at' | 'updated_at'>),
    taskSetStatus: (id, status) => h.tasks.setStatus(num(id), status as Task['status']),
    taskArchive: (id) => h.tasks.archive(num(id)),
    checkItemList: (taskId) => h.tasks.listItems(num(taskId)),
    checkItemCreate: (input) => h.tasks.createItem(checkItemSchema.parse(input) as unknown as Omit<TaskCheckItem, 'id'>),
    checkItemUpdate: (id, patch) => {
      const p = patch as Partial<Omit<TaskCheckItem, 'id'>>;
      const safe: Partial<Omit<TaskCheckItem, 'id'>> = {};
      if (p.title !== undefined) safe.title = String(p.title);
      if (p.done !== undefined) safe.done = Boolean(p.done);
      if (p.sort_order !== undefined) safe.sort_order = Number(p.sort_order);
      if (safe.title !== undefined && safe.title.trim().length === 0) throw new Error('Введите пункт');
      return h.tasks.updateItem(num(id), safe);
    },
    checkItemDelete: (id) => h.tasks.deleteItem(num(id)),

    // ── Дашборд / поиск / обслуживание ─────────────────────
    dashboardGet: () => buildDashboard(h.services),
    searchGlobal: (query) => globalSearch(h.services, String(query ?? '')),
    backupNow: () => runBackup(h.db, getBackupDir(app.getPath('userData'))),
    demoLoad: () => {
      loadDemoData(h.db);
    },
    wipeAll: () => {
      const tables = ['task_check_items', 'work_log', 'tasks', 'edo_documents', 'monitorings', 'absences', 'employees', 'departments'];
      h.db.transaction(() => {
        for (const t of tables) h.db.prepare(`DELETE FROM ${t}`).run();
        h.db.prepare("DELETE FROM task_types WHERE name NOT IN ('Мониторинг','Письмо','Таблица')").run();
        h.db.prepare('UPDATE task_types SET sort_order = id').run();
        h.db.prepare('DELETE FROM settings').run();
      })();
    },
  };
}

function registerIpc(handlers: Record<string, (...args: unknown[]) => unknown>): void {
  ipcMain.handle(IPC_CHANNEL, (_event, req: IpcRequest): IpcResponse => {
    const fn = handlers[req.method];
    if (!fn) return { callId: req.callId, ok: false, error: `Неизвестный метод: ${String(req.method)}` };
    try {
      const result = fn(...(req.args ?? []));
      return { callId: req.callId, ok: true, result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      return { callId: req.callId, ok: false, error: message };
    }
  });
}

// Единый экземпляр приложения.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    const services = setupServices();
    registerIpc(buildHandlers(services));

    // Автоматическая резервная копия при каждом запуске (ротация — 30 копий).
    try {
      runBackup(services.db, getBackupDir(app.getPath('userData')));
    } catch (err) {
      console.error('Не удалось создать резервную копию:', err);
    }
    
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
