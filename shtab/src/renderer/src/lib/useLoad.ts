// Хук загрузки данных через IPC с обработкой ошибок и перезагрузкой по external version.

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { errText } from './api';

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[], onError?: (e: unknown) => void): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loaderRef.current());
    } catch (err) {
      if (onErrorRef.current) onErrorRef.current(err);
      else toast.error(errText(err));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, reload: () => void run() };
}
