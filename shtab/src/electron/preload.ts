// Preload: типизированный мост window.api ↔ main через contextBridge.
// sandbox:false → обычный require, esbuild собирает в CJS.

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNEL, METHOD_NAMES, type ApiMethodName, type IpcResponse, type ShtabApi } from '../shared/ipc';

let counter = 0;

function call(method: ApiMethodName, ...args: unknown[]): Promise<unknown> {
  const callId = `${Date.now()}-${++counter}`;
  return ipcRenderer.invoke(IPC_CHANNEL, { callId, method, args }).then((res: IpcResponse) => {
    if (res.ok) return res.result;
    throw new Error(res.error);
  });
}

// Прокси: generic-аргументы prepare в better-sqlite3 не позволяют типизировать мост напрямую,
// поэтому собираем методы динамически и приводим через unknown (единственное место с таким приведением).
const api: ShtabApi = Object.fromEntries(
  METHOD_NAMES.map((method) => [
    method,
    (...args: unknown[]) => call(method, ...args),
  ])
) as unknown as ShtabApi;

contextBridge.exposeInMainWorld('api', api);
