// Карточка документа ЭДО в выдвижной панели с вкладками: Сводка | Проведённая работа | История (ТЗ п.5.3).

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Archive, Pencil } from 'lucide-react';
import type { EdoDocumentView } from '@/shared/types';
import { api, errText } from '@/renderer/src/lib/api';
import { useStore } from '@/renderer/src/lib/store';
import { fmtDate, fmtDateTime } from '@/renderer/src/lib/dates';
import { Badge, Button, Spinner } from '@/renderer/src/ui/primitives';
import { Sheet } from '@/renderer/src/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/renderer/src/ui/radix';
import { DeadlineBadge } from '@/renderer/src/ui/display';
import { WorkLogPanel } from '@/renderer/src/ui/workLogPanel';

export function EdoCard({
  documentId,
  onClose,
  onEdit,
  onArchive,
}: {
  documentId: number | null;
  onClose: () => void;
  onEdit: (doc: EdoDocumentView) => void;
  onArchive: (id: number) => void;
}) {
  const store = useStore();
  const [doc, setDoc] = useState<EdoDocumentView | null>(null);

  useEffect(() => {
    if (documentId == null) {
      setDoc(null);
      return;
    }
    api.edoGet(documentId)
      .then(setDoc)
      .catch((e: unknown) => toast.error(errText(e)));
  }, [documentId, store.version]);

  return (
    <Sheet
      open={documentId != null}
      onClose={onClose}
      title={doc ? `Док. ${doc.doc_number}` : 'Документ ЭДО'}
      headerExtra={
        doc && (
          <>
            <Button size="sm" variant="outline" onClick={() => onEdit(doc)}>
              <Pencil className="h-4 w-4" /> Изменить
            </Button>
            {!doc.archived && (
              <Button size="sm" variant="ghost" onClick={() => onArchive(doc.id)}>
                <Archive className="h-4 w-4" /> В архив
              </Button>
            )}
          </>
        )
      }
    >
      {documentId != null && doc == null ? (
        <Spinner />
      ) : doc ? (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Сводка</TabsTrigger>
            <TabsTrigger value="work">Проведённая работа</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={doc.control_type === 'red' ? 'red' : 'green'}>
                  {doc.control_type === 'red' ? store.settings.controlRedName : store.settings.controlGreenName}
                </Badge>
                <DeadlineBadge daysLeft={doc.days_left} offControl={doc.off_control} />
                {doc.approval_status && <Badge tone="blue">{doc.approval_status}</Badge>}
                {doc.archived && <Badge tone="gray">в архиве</Badge>}
              </div>
              <dl className="grid grid-cols-[160px_1fr] gap-y-2">
                <dt className="text-muted-foreground">Номер</dt>
                <dd>
                  {doc.resolved_url ? (
                    <a href={doc.resolved_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                      {doc.doc_number}
                    </a>
                  ) : (
                    doc.doc_number
                  )}
                </dd>
                <dt className="text-muted-foreground">Краткое содержание</dt>
                <dd>{doc.summary || '—'}</dd>
                <dt className="text-muted-foreground">Поручение</dt>
                <dd className="whitespace-pre-wrap">{doc.instruction || '—'}</dd>
                <dt className="text-muted-foreground">Ответственный</dt>
                <dd>{doc.responsible_name ?? '—'}</dd>
                <dt className="text-muted-foreground">Участники</dt>
                <dd>{doc.participants || '—'}</dd>
                <dt className="text-muted-foreground">Подрезолюция</dt>
                <dd>{doc.sub_resolution || '—'}</dd>
                <dt className="text-muted-foreground">Срок</dt>
                <dd>{doc.deadline ? fmtDate(doc.deadline) : 'не задан'}</dd>
                {doc.off_control && (
                  <>
                    <dt className="text-muted-foreground">Снят с контроля</dt>
                    <dd>{fmtDate(doc.off_control_date)}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Лист согласования</dt>
                <dd>
                  {doc.approval_number ? (
                    doc.approval_url ? (
                      <a href={doc.approval_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                        {doc.approval_number}
                      </a>
                    ) : (
                      doc.approval_number
                    )
                  ) : (
                    '—'
                  )}
                </dd>
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="work">
            <WorkLogPanel entityType="edo" entityId={doc.id} />
          </TabsContent>

          <TabsContent value="history">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Создан: {fmtDateTime(doc.created_at)}</li>
              <li>Изменён: {fmtDateTime(doc.updated_at)}</li>
              {doc.off_control_date && <li>Снят с контроля: {fmtDate(doc.off_control_date)}</li>}
            </ul>
          </TabsContent>
        </Tabs>
      ) : (
        <div />
      )}
    </Sheet>
  );
}
