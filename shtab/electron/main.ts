// Main-процесс Electron: окно, БД в userData, автобэкап при запуске, регистрация IPC.
import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { openDatabase } from './db/database';
import { backupNow } from './db/settings';
import { registerIpc } from './ipc/handlers';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'Штаб',
    width: 1440,
    height: 900,
    minWidth: 1100, // обязательная минимальная ширина по ТЗ
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // нужен для require('electron') в preload (contextBridge)
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Внешние ссылки (mailto:, tel:, http) — открывать в системе, не внутри приложения.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Единственный экземпляр приложения — как принято для десктопных трекеров.
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

  void app.whenReady().then(async () => {
    // Название папки userData и заголовка окна — «Штаб» (в package.json name — ASCII).
    app.setName('Штаб');

    const userDataDir = app.getPath('userData');
    const dbPath = path.join(userDataDir, 'shtab.db');

    const db = openDatabase(dbPath);

    // Обязательное НФТ: при каждом запуске — автобэкап с ротацией (хранится 30 копий).
    // backupNow асинхронный (см. исправление бага) — ждём фактической записи файла.
    try {
      await backupNow(dbPath, path.join(userDataDir, 'backups'));
    } catch (err) {
      console.error('Не удалось сделать резервную копию:', err);
    }

    registerIpc(db, dbPath, userDataDir);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    // Windows-приложение: закрываемся полностью (macOS-ветка не требуется по ТЗ).
    app.quit();
  });
}
