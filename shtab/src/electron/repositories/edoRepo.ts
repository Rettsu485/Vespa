// Репозиторий документов ЭДО и журнала проделанной работы (work_log).

import { typed, type TypedDb } from '../db/database';
import { daysBetween, nowSqlTimestamp, todayIso } from '../db/dates';
import type { AppSettings, EdoDocument, EdoDocumentView, WorkLogEntry } from '../../shared/types';
import type { WorkLogInput } from '../../shared/ipc';

interface EdoRow {
  id: number;
  doc_number: string;
  doc_url: string;
  summary: string;
  instruction: string;
  responsible_id: number | null;
  participants: string;
  control_type: EdoDocument['control_type'];
  deadline: string | null;
  off_control: number;
  off_control_date: string | null;
  sub_resolution: string;
  approval_number: string;
  approval_url: string;
  approval_status: EdoDocument['approval_status'];
  archived: number;
  created_at: string;
  updated_at: string;
}

export function buildDocUrl(settings: AppSettings, doc: { doc_number: string; doc_url: string }): string | null {
  const template = settings.edoLinkTemplate.trim();
  if (template.includes('{номер}')) {
    return template.replaceAll('{номер}', encodeURIComponent(doc.doc_number));
  }
  if (doc.doc_url.trim()) return doc.doc_url.trim();
  return null;
}

export class EdoRepository {
  constructor(private db: TypedDb) {}

  list(opts: {
    controlType?: string | null;
    offControl?: 'all' | 'on' | 'off';
    responsibleId?: number | null;
    approvalStatus?: string | null;
    burning?: boolean;
    includeArchived?: boolean;
  }, settings: AppSettings): EdoDocumentView[] {
    const conds: string[] = [];
    const params: (number | string)[] = [];
    if (!opts.includeArchived) conds.push('d.archived = 0');
    if (opts.controlType) {
      conds.push('d.control_type = ?');
      params.push(opts.controlType);
    }
    if (opts.offControl === 'on') conds.push('d.off_control = 1');
    if (opts.offControl === 'off') conds.push('d.off_control = 0');
    if (opts.responsibleId) {
      conds.push('d.responsible_id = ?');
      params.push(opts.responsibleId);
    }
    if (opts.approvalStatus) {
      conds.push('d.approval_status = ?');
      params.push(opts.approvalStatus);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = this.db.prepare(`SELECT d.* FROM edo_documents d ${where}`).all(...params) as EdoRow[];
    let views = rows.map((r) => this.toView(r, settings));
    if (opts.burning) {
      views = views.filter((v) => !v.off_control && v.days_left != null && v.days_left <= 3);
    }
    // Сортировка по умолчанию: срок по возрастанию; снятые с контроля — в конец.
    views.sort((a, b) => {
      if (a.off_control !== b.off_control) return a.off_control ? 1 : -1;
      const da = a.deadline ?? '9999-12-31';
      const dbb = b.deadline ?? '9999-12-31';
      if (da !== dbb) return da < dbb ? -1 : 1;
      return a.doc_number.localeCompare(b.doc_number, 'ru');
    });
    return views;
  }

  get(id: number, settings: AppSettings): EdoDocumentView | null {
    const row = this.db.prepare('SELECT * FROM edo_documents WHERE id = ?').get(id);
    return row ? this.toView(row, settings) : null;
  }

  create(input: Omit<EdoDocument, 'id' | 'created_at' | 'updated_at'>, settings: AppSettings): EdoDocumentView {
    const ts = nowSqlTimestamp();
    const res = this.db
      .prepare(
        `INSERT INTO edo_documents (doc_number, doc_url, summary, instruction, responsible_id, participants, control_type, deadline, off_control, off_control_date, sub_resolution, approval_number, approval_url, approval_status, archived, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        input.doc_number, input.doc_url, input.summary, input.instruction, input.responsible_id, input.participants,
        input.control_type, input.deadline, input.off_control ? 1 : 0, input.off_control_date, input.sub_resolution,
        input.approval_number, input.approval_url, input.approval_status, input.archived ? 1 : 0, ts, ts
      );
    return this.require(Number(res.lastInsertRowid), settings);
  }

  update(id: number, input: Omit<EdoDocument, 'id' | 'created_at' | 'updated_at'>, settings: AppSettings): EdoDocumentView {
    this.db
      .prepare(
        `UPDATE edo_documents SET doc_number=?, doc_url=?, summary=?, instruction=?, responsible_id=?, participants=?, control_type=?, deadline=?, off_control=?, off_control_date=?, sub_resolution=?, approval_number=?, approval_url=?, approval_status=?, archived=?, updated_at=? WHERE id=?`
      )
      .run(
        input.doc_number, input.doc_url, input.summary, input.instruction, input.responsible_id, input.participants,
        input.control_type, input.deadline, input.off_control ? 1 : 0, input.off_control_date, input.sub_resolution,
        input.approval_number, input.approval_url, input.approval_status, input.archived ? 1 : 0, nowSqlTimestamp(), id
      );
    return this.require(id, settings);
  }

  setOffControl(id: number, off: boolean, settings: AppSettings): EdoDocumentView {
    const date = off ? todayIso() : null;
    this.db.prepare('UPDATE edo_documents SET off_control = ?, off_control_date = ?, updated_at = ? WHERE id = ?').run(off ? 1 : 0, date, nowSqlTimestamp(), id);
    return this.require(id, settings);
  }

  archive(id: number, settings: AppSettings): EdoDocumentView {
    this.db.prepare('UPDATE edo_documents SET archived = 1, updated_at = ? WHERE id = ?').run(nowSqlTimestamp(), id);
    return this.require(id, settings);
  }

  private require(id: number, settings: AppSettings): EdoDocumentView {
    const v = this.get(id, settings);
    if (!v) throw new Error('Документ не найден');
    return v;
  }

  private toView(r: EdoRow, settings: AppSettings): EdoDocumentView {
    const responsible = r.responsible_id
      ? this.db.prepare('SELECT full_name FROM employees WHERE id = ?').get(r.responsible_id)
      : null;
    const today = todayIso();
    const daysLeft = r.deadline && !r.off_control ? daysBetween(r.deadline, today) : null;
    return {
      id: r.id,
      doc_number: r.doc_number,
      doc_url: r.doc_url,
      summary: r.summary,
      instruction: r.instruction,
      responsible_id: r.responsible_id,
      participants: r.participants,
      control_type: r.control_type,
      deadline: r.deadline,
      off_control: r.off_control === 1,
      off_control_date: r.off_control_date,
      sub_resolution: r.sub_resolution,
      approval_number: r.approval_number,
      approval_url: r.approval_url,
      approval_status: r.approval_status,
      archived: r.archived === 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
      responsible_name: responsible?.full_name ?? null,
      days_left: daysLeft,
      resolved_url: buildDocUrl(settings, r),
    };
  }
}

export class WorkLogRepository {
  constructor(private db: TypedDb) {}

  list(entityType: 'edo' | 'task', entityId: number): WorkLogEntry[] {
    return this.db
      .prepare('SELECT * FROM work_log WHERE entity_type = ? AND entity_id = ? ORDER BY log_date DESC, id DESC')
      .all(entityType, entityId);
  }

  add(input: WorkLogInput): WorkLogEntry {
    const res = this.db
      .prepare('INSERT INTO work_log (entity_type, entity_id, log_date, text, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(input.entity_type, input.entity_id, input.log_date, input.text, nowSqlTimestamp());
    const row = this.db.prepare('SELECT * FROM work_log WHERE id = ?').get(Number(res.lastInsertRowid));
    if (!row) throw new Error('Запись не создана');
    return row;
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM work_log WHERE id = ?').run(id);
  }
}
