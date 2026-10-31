import type { EmployeeView } from '@shared/types';
export declare function TeamPage(): import("react").JSX.Element;
export declare function EmployeeRow({ emp, view, onOpen }: {
    emp: EmployeeView;
    view: 'compact' | 'full';
    onOpen: () => void;
}): import("react").JSX.Element;
