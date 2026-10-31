export declare function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): {
    data: T | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
};
