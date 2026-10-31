import type { AppSettings } from '@shared/types';
export declare function EdoPage({ settings }: {
    settings: AppSettings;
}): import("react").JSX.Element;
export declare function EdoForm({ open, docId, onClose, onSaved, }: {
    open: boolean;
    docId: number | null;
    onClose: () => void;
    onSaved: () => void;
}): import("react").JSX.Element;
