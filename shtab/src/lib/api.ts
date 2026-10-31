// Типизированный доступ к api из preload. Никаких других способов достучаться до main-процесса нет.
import type { IpcApi } from '@shared/ipc';

declare global {
  interface Window {
    api: IpcApi;
  }
}

export const api: IpcApi = window.api;
