// Типизированный клиент window.api.

import type { ShtabApi } from '@/shared/ipc';

declare global {
  interface Window {
    api: ShtabApi;
  }
}

export const api = window.api;

/** Текст ошибки для тоста: единый обработчик ошибок IPC. */
export function errText(err: unknown): string {
  return err instanceof Error ? err.message : 'Неизвестная ошибка';
}
