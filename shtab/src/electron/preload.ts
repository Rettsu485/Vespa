// Preload: типизированный мост window.api ↔ main через contextBridge.

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNEL, apiMethodsList, type ApiMethodName, type IpcResponse, type ShtabApi } from '../shared/ipc';

let counter = 0;

function call(method: ApiMethodName, ...args: unknown[]): Promise<unknown> {
  const callId = `${Date.now()}-${++counter}`;
  return ipcRenderer.invoke(IPC_CHANNEL, { callId, method, args }).then((res: IpcResponse) => {
    if (res.ok) return res.result;
    throw new Error(res.error);
  });
}

const api: ShtabApi = Object.fromEntries(
  (Object.keys(apiMethodsList) as ApiMethodName[]).map((method) => [
    method,
    (...args: unknown[]) => call(method, ...args),
  ])
) as ShtabApi;

contextBridge.exposeInMainWorld('api', api);
