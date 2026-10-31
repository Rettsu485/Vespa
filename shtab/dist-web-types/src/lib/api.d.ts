import type { IpcApi } from '@shared/ipc';
declare global {
    interface Window {
        api: IpcApi;
    }
}
export declare const api: IpcApi;
