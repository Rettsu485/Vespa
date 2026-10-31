// Глобальный поиск Ctrl+K: сгруппированный список результатов с переходом к карточке.
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui';
import type { SearchResult } from '@shared/types';
import { Users, Radar, FileText, ListTodo } from 'lucide-react';

export function CommandPalette({
  open,
  onClose,
  onOpenEmployee,
  onOpenMonitoring,
  onOpenDoc,
  onOpenTask,
}: {
  open: boolean;
  onClose: () => void;
  onOpenEmployee: (id: number) => void;
  onOpenMonitoring: (id: number) => void;
  onOpenDoc: (id: number) => void;
  onOpenTask: (id: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResult(null);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResult(null);
      return;
    }
    const t = window.setTimeout(() => {
      api.search.global(query).then(setResult).catch(console.error);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const go = (fn: () => void) => {
    fn();
    onClose();
  };

  const groupEmpty = !result || (result.employees.length === 0 && result.monitorings.length === 0 && result.documents.length === 0 && result.tasks.length === 0);

  return (
    <div className="fixed inset-0 z-[65] flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 animate-overlay-show" onClick={onClose} />
      <div className="relative w-[640px] max-h-[70vh] overflow-y-auto rounded-lg border bg-card p-3 shadow-2xl animate-toast-in">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по сотрудникам, мониторингам, документам, задачам…"
        />
        {query.trim().length >= 2 && groupEmpty ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Ничего не найдено.</div>
        ) : null}
        {result ? (
          <div className="mt-2 grid gap-3">
            {result.employees.length > 0 ? (
              <Group title="Сотрудники" icon={<Users className="h-3.5 w-3.5" />}>
                {result.employees.map((e) => (
                  <Item key={`e${e.id}`} onClick={() => go(() => onOpenEmployee(e.id))} main={e.full_name} sub={`${e.department_name ?? ''} · ${e.position}`} />
                ))}
              </Group>
            ) : null}
            {result.monitorings.length > 0 ? (
              <Group title="Мониторинги" icon={<Radar className="h-3.5 w-3.5" />}>
                {result.monitorings.map((m) => (
                  <Item key={`m${m.id}`} onClick={() => go(() => onOpenMonitoring(m.id))} main={m.name} sub={`${m.type_name} · ${m.employee_name}`} />
                ))}
              </Group>
            ) : null}
            {result.documents.length > 0 ? (
              <Group title="Документы ЭДО" icon={<FileText className="h-3.5 w-3.5" />}>
                {result.documents.map((d) => (
                  <Item key={`d${d.id}`} onClick={() => go(() => onOpenDoc(d.id))} main={`№ ${d.doc_number}`} sub={d.summary} />
                ))}
              </Group>
            ) : null}
            {result.tasks.length > 0 ? (
              <Group title="Задачи" icon={<ListTodo className="h-3.5 w-3.5" />}>
                {result.tasks.map((t) => (
                  <Item key={`t${t.id}`} onClick={() => go(() => onOpenTask(t.id))} main={t.title} sub={`${t.theme} · ${t.status}`} />
                ))}
              </Group>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </div>
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}

function Item({ main, sub, onClick }: { main: string; sub: string; onClick: () => void }) {
  return (
    <button className="w-full rounded-md px-2 py-1.5 text-left transition-colors duration-fast hover:bg-accent" onClick={onClick}>
      <div className="text-sm font-medium">{main}</div>
      <div className="truncate text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}
