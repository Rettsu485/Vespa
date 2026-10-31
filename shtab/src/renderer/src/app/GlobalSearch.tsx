// Глобальный поиск Ctrl+K (ТЗ п.4): модальное окно, результаты сгруппированы, переход к карточке.

import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { SearchResults } from '@/shared/types';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore, type OpenCardEvent } from '@/renderer/src/lib/store';
import { DialogContent, DialogRoot } from '@/renderer/src/ui/dialog';
import { Input } from '@/renderer/src/ui/primitives';
import { cn } from '@/renderer/src/lib/cn';

const ROUTE: Record<OpenCardEvent['kind'], string> = {
  employee: '/team',
  monitoring: '/monitorings',
  edo: '/edo',
  task: '/tasks',
};

const GROUP_LABEL: Record<keyof SearchResults, string> = {
  employees: 'Сотрудники',
  monitorings: 'Мониторинги',
  edo: 'Документы ЭДО',
  tasks: 'Задачи',
};

const ENTITY: Record<keyof SearchResults, OpenCardEvent['kind']> = {
  employees: 'employee',
  monitorings: 'monitoring',
  edo: 'edo',
  tasks: 'task',
};

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const store = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      api.searchGlobal(q)
        .then((r) => !cancelled && setResults(r))
        .catch((e: unknown) => toast.error(errText(e)));
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  const go = (e: OpenCardEvent) => {
    onClose();
    navigate(ROUTE[e.kind]);
    // Карточка откроется после перехода — небольшая задержка на монтирование страницы.
    setTimeout(() => store.emitOpenCard(e), 60);
  };

  return (
    <DialogRoot open={open}>
      <DialogContent title="Глобальный поиск" wide className="!top-[15%] !translate-y-0">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по сотрудникам, мониторингам, документам, задачам… (Esc — закрыть)"
          className="mb-4"
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
        {!results || query.trim().length < 2 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Введите не менее 2 символов.
          </div>
        ) : (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto">
            {(Object.keys(GROUP_LABEL) as Array<keyof SearchResults>).map((group) => {
              const items = results[group];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{GROUP_LABEL[group]}</div>
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <button
                        key={`${item.entity}-${item.id}`}
                        onClick={() => go({ kind: ENTITY[group], id: item.id })}
                        className={cn('flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-theme hover:bg-accent')}
                      >
                        <span className="font-medium">{item.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {results.employees.length + results.monitorings.length + results.edo.length + results.tasks.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено.</div>
            )}
          </div>
        )}
      </DialogContent>
    </DialogRoot>
  );
}
