import { roleCan } from '../../../shared/domain';
import { audit } from '../../audit';
import type { SessionUser } from '../../context';
import { one, pool, q, tx } from '../../db';
import { HttpError, conflict, notFound } from '../../errors';
import { getHotelRow, hydrate } from '../../repos/hotels';
import { checkImages } from './images';
import { rollbackChanges, type RollbackReport } from './state';
import { MASTER_KEY, MASTER_TITLE, TEMPLATES, templateByKey } from './templates';
import type { ApplyContext, Change, ColumnDef, HotelScope, ImportMode, ParsedSheet, RowMessage, RowResult, TemplateAdapter } from './types';
import { buildWorkbook, parseWorkbook, type ParseOutcome } from './workbook';

/** A preview can be confirmed for this long; after that the file must be uploaded again. */
const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;

export interface ImportSummary {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  create: number;
  update: number;
  unchanged: number;
  skipped: number;
  duplicates: number;
}

export function summarize(results: RowResult[]): ImportSummary {
  const s: ImportSummary = { total: results.length, valid: 0, warnings: 0, errors: 0, create: 0, update: 0, unchanged: 0, skipped: 0, duplicates: 0 };
  for (const r of results) {
    if (r.action === 'error') s.errors++;
    else s.valid++;
    if (r.action === 'create') s.create++;
    if (r.action === 'update') s.update++;
    if (r.action === 'unchanged') s.unchanged++;
    if (r.action === 'skipped') s.skipped++;
    if (r.duplicate) s.duplicates++;
    if (r.messages.some((m) => m.level === 'warning')) s.warnings++;
  }
  return s;
}

/** Templates this user may use (every module of the template). */
export function templatesFor(u: SessionUser): TemplateAdapter[] {
  return TEMPLATES.filter((t) => t.modules.every((m) => roleCan(u.role, m)));
}

export async function hotelScope(hotelId: string): Promise<HotelScope & { hotelName: string }> {
  const row = await getHotelRow(hotelId);
  if (!row) throw notFound('Hotel not found');
  const h = hydrate(row);
  return { hotelId, timezone: h.profile.timezone || 'UTC', db: pool, hotelName: h.profile.name_en };
}

/** Resolves a template key (or "master") to the adapters it covers, enforcing access. */
export function resolveTemplates(key: string, u: SessionUser): { adapters: TemplateAdapter[]; single: TemplateAdapter | null; title: string } {
  const allowed = templatesFor(u);
  if (key === MASTER_KEY) {
    if (!allowed.length) throw new HttpError(403, 'forbidden', 'You do not have access to any import template');
    return { adapters: allowed, single: null, title: MASTER_TITLE };
  }
  const t = templateByKey(key);
  if (!t) throw notFound('Unknown template');
  if (!allowed.includes(t)) throw new HttpError(403, 'forbidden', `You do not have access to ${t.title}`);
  return { adapters: [t], single: t, title: `${t.number} ${t.title}` };
}

export async function templateWorkbook(key: string, u: SessionUser, hotelId: string, withData: boolean) {
  const { adapters, title } = resolveTemplates(key, u);
  const h = await hotelScope(hotelId);
  const buf = await buildWorkbook(adapters, h, { title, hotelName: h.hotelName, withData });
  const safe = title.replace(/[^A-Za-z0-9 &-]+/g, '').trim();
  return { buf, filename: `${withData ? `${h.hotelName.replace(/[^A-Za-z0-9 -]+/g, '').trim()} - ` : ''}${safe}${withData ? ` ${new Date().toISOString().slice(0, 10)}` : ''}.xlsx` };
}

/**
 * Runs every sheet through its adapter inside one transaction. Nothing is
 * kept unless `commit` is set and every row is valid — a batch is never
 * partially imported. `finalize` runs inside the same transaction just
 * before COMMIT (batch bookkeeping, audit).
 */
async function runBatch(
  scope: { hotelId: string; timezone: string },
  sheets: ParsedSheet[],
  mode: ImportMode,
  commit: boolean,
  finalize?: (client: ApplyContext['client'], results: RowResult[], changes: Change[]) => Promise<void>
): Promise<{ results: RowResult[]; changes: Change[]; committed: boolean }> {
  const client = await pool.connect();
  const ctx: ApplyContext = { client, hotelId: scope.hotelId, timezone: scope.timezone, mode, changes: [], cache: new Map() };
  const results: RowResult[] = [];
  try {
    await client.query('BEGIN');
    // One import (preview or commit) per hotel at a time: previews see a stable catalog.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('import:' || $1))", [scope.hotelId]);
    for (const t of TEMPLATES) {
      const sheet = sheets.find((s) => s.template === t.key);
      if (sheet) results.push(...(await t.apply(sheet, ctx)));
    }
    const ok = commit && results.length > 0 && !results.some((r) => r.action === 'error');
    if (ok) {
      await finalize?.(client, results, ctx.changes);
      await client.query('COMMIT');
    } else await client.query('ROLLBACK');
    return { results, changes: ctx.changes, committed: ok };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

function mergeMessages(results: RowResult[], extra: Map<string, RowMessage[]>) {
  for (const r of results) {
    const add = extra.get(`${r.sheet}|${r.row}`);
    if (add?.length) r.messages.push(...add);
  }
  return results;
}

export interface BatchRow {
  id: string;
  hotel_id: string;
  user_id: string | null;
  user_email: string;
  template: string;
  filename: string;
  mode: ImportMode;
  status: 'previewed' | 'committed' | 'failed' | 'rolled_back' | 'discarded' | 'expired';
  summary: ImportSummary & { issues?: ParseOutcome['issues']; notice?: string };
  results: RowResult[];
  payload: { sheets?: ParsedSheet[]; imageWarnings?: [string, RowMessage[]][] };
  changes: Change[];
  created_at: Date;
  committed_at: Date | null;
  rolled_back_at: Date | null;
}

/** Public shape of a batch (never the raw payload). */
export function batchView(b: BatchRow, opts: { results?: boolean } = {}) {
  const templ = b.template === MASTER_KEY ? { number: '', title: MASTER_TITLE } : templateByKey(b.template) ?? { number: '', title: b.template };
  const changeCounts: Record<string, number> = {};
  for (const c of b.changes ?? []) changeCounts[`${c.sheet}:${c.op}`] = (changeCounts[`${c.sheet}:${c.op}`] ?? 0) + 1;
  return {
    id: b.id,
    template: b.template,
    template_title: `${templ.number ? `${templ.number} ` : ''}${templ.title}`,
    filename: b.filename,
    mode: b.mode,
    status: b.status,
    user_email: b.user_email,
    summary: b.summary,
    created_at: b.created_at,
    committed_at: b.committed_at,
    rolled_back_at: b.rolled_back_at,
    expires_at: b.status === 'previewed' ? new Date(b.created_at.getTime() + PREVIEW_TTL_MS) : null,
    change_count: (b.changes ?? []).length,
    change_counts: changeCounts,
    ...(opts.results ? { results: b.results, changes: (b.changes ?? []).map((c) => ({ sheet: c.sheet, op: c.op, label: c.label })) } : {}),
  };
}

/** Upload → parse → header/schema/relationship/duplicate/image/business checks → stored preview. */
export async function previewImport(o: { hotelId: string; user: SessionUser; template: string; filename: string; mode: ImportMode; file: Buffer; checkImages?: boolean }) {
  const { adapters, single } = resolveTemplates(o.template, o.user);
  const scope = await hotelScope(o.hotelId);
  const parsed = await parseWorkbook(o.file, single, adapters, scope);
  const fileErrors = parsed.issues.filter((i) => i.level === 'error');

  let results: RowResult[] = [];
  let notice: string | undefined;
  let imageWarnings = new Map<string, RowMessage[]>();
  if (!fileErrors.length) {
    if (o.checkImages !== false) {
      const columns = new Map<string, ColumnDef[]>();
      for (const s of parsed.sheets) columns.set(s.template, await templateByKey(s.template)!.columns(scope));
      const img = await checkImages(o.hotelId, parsed.sheets, columns);
      imageWarnings = img.byRow;
      notice = img.notice;
    }
    results = mergeMessages((await runBatch(scope, parsed.sheets, o.mode, false)).results, imageWarnings);
  }
  const summary = { ...summarize(results), issues: parsed.issues, ...(notice ? { notice } : {}) };
  if (fileErrors.length) summary.errors = Math.max(summary.errors, fileErrors.length);
  const status = fileErrors.length ? 'failed' : 'previewed';

  // Previews that were never confirmed release their stored rows after the TTL.
  await q(`UPDATE import_batches SET status = 'expired', payload = '{}'::jsonb WHERE hotel_id = $1 AND status = 'previewed' AND created_at < now() - interval '1 day'`, [o.hotelId]);
  const row = await one<BatchRow>(
    `INSERT INTO import_batches (hotel_id, user_id, user_email, template, filename, mode, status, summary, results, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [o.hotelId, o.user.id, o.user.email, o.template, o.filename.slice(0, 200), o.mode, status, JSON.stringify(summary), JSON.stringify(results), JSON.stringify(status === 'previewed' ? { sheets: parsed.sheets, imageWarnings: [...imageWarnings] } : {})]
  );
  return batchView(row!, { results: true });
}

async function loadBatch(hotelId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Import not found');
  const b = await one<BatchRow>('SELECT * FROM import_batches WHERE hotel_id = $1 AND id = $2', [hotelId, id]);
  if (!b) throw notFound('Import not found');
  return b;
}

/** Access to a batch requires access to its template(s). */
function assertBatchAccess(b: BatchRow, u: SessionUser) {
  resolveTemplates(b.template, u);
  const allowed = new Set(templatesFor(u).map((t) => t.key));
  for (const s of b.payload.sheets ?? []) if (!allowed.has(s.template)) throw new HttpError(403, 'forbidden', 'This import includes templates you cannot access');
  for (const c of b.changes ?? []) if (!allowed.has(c.sheet)) throw new HttpError(403, 'forbidden', 'This import includes templates you cannot access');
}

export async function getBatch(hotelId: string, id: string, u: SessionUser) {
  const b = await loadBatch(hotelId, id);
  assertBatchAccess(b, u);
  return batchView(b, { results: true });
}

export async function listBatches(hotelId: string, u: SessionUser, limit = 50) {
  const mine = templatesFor(u);
  // Master workbooks can span every module: listed only for users who can open all of them.
  const allowed = new Set([...mine.map((t) => t.key), ...(mine.length === TEMPLATES.length ? [MASTER_KEY] : [])]);
  const rows = await q<BatchRow>(
    `SELECT id, hotel_id, user_id, user_email, template, filename, mode, status, summary, '[]'::jsonb AS results, '{}'::jsonb AS payload, changes, created_at, committed_at, rolled_back_at
       FROM import_batches WHERE hotel_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [hotelId, limit]
  );
  return rows.filter((r) => allowed.has(r.template)).map((r) => batchView(r));
}

/** Confirmation: re-validates the stored rows against current data and imports them atomically. */
export async function commitImport(hotelId: string, id: string, u: SessionUser, ip: string) {
  const b = await loadBatch(hotelId, id);
  assertBatchAccess(b, u);
  if (b.status !== 'previewed') throw conflict(b.status === 'committed' ? 'This import was already confirmed' : `This import can no longer be confirmed (${b.status.replace('_', ' ')})`);
  if (Date.now() - b.created_at.getTime() > PREVIEW_TTL_MS) {
    await q(`UPDATE import_batches SET status = 'expired', payload = '{}'::jsonb WHERE id = $1`, [id]);
    throw conflict('This preview has expired — upload the file again');
  }
  const scope = await hotelScope(hotelId);
  const imageWarnings = new Map(b.payload.imageWarnings ?? []);
  const run = await runBatch(scope, b.payload.sheets ?? [], b.mode, true, async (client, results, changes) => {
    // Claim the batch in the same transaction: a double click cannot import twice.
    const claimed = await one(`UPDATE import_batches SET status = 'committed', committed_at = now() WHERE id = $1 AND status = 'previewed' RETURNING id`, [id], client);
    if (!claimed) throw conflict('This import was already confirmed');
    mergeMessages(results, imageWarnings);
    const summary = { ...summarize(results), issues: b.summary.issues ?? [] };
    await q(`UPDATE import_batches SET summary = $2, results = $3, changes = $4, payload = '{}'::jsonb WHERE id = $1`, [id, JSON.stringify(summary), JSON.stringify(results), JSON.stringify(changes)], client);
    await audit(
      {
        hotelId,
        user: u,
        action: 'import',
        entity: b.template,
        entityId: id,
        summary: `Imported ${b.filename || b.template}: ${summary.create} new, ${summary.update} updated, ${summary.skipped} skipped, ${summary.unchanged} unchanged`,
        after: { create: summary.create, update: summary.update, skipped: summary.skipped, unchanged: summary.unchanged },
        ip,
      },
      client
    );
  });
  if (!run.committed) {
    // Data changed since the preview (e.g. a category was deleted): show the new result, keep nothing.
    const results = mergeMessages(run.results, imageWarnings);
    const summary = { ...summarize(results), issues: b.summary.issues ?? [] };
    await q('UPDATE import_batches SET summary = $2, results = $3 WHERE id = $1', [id, JSON.stringify(summary), JSON.stringify(results)]);
    throw new HttpError(422, 'import_invalid', 'Nothing was imported: some rows are no longer valid. Review the updated preview.', { batch: batchView({ ...b, summary, results }, { results: true }) });
  }
  return batchView(await loadBatch(hotelId, id), { results: true });
}

export async function discardImport(hotelId: string, id: string, u: SessionUser) {
  const b = await loadBatch(hotelId, id);
  assertBatchAccess(b, u);
  if (b.status !== 'previewed') throw conflict('Only a preview that was not confirmed can be discarded');
  await q(`UPDATE import_batches SET status = 'discarded', payload = '{}'::jsonb WHERE id = $1`, [id]);
  return batchView(await loadBatch(hotelId, id));
}

/**
 * Restores every record the batch changed. Refused as a whole when any of
 * them was edited (or deleted, or gained children) after the import.
 */
export async function rollbackImport(hotelId: string, id: string, u: SessionUser, ip: string, dryRun: boolean): Promise<{ report: RollbackReport; batch: ReturnType<typeof batchView> }> {
  const b = await loadBatch(hotelId, id);
  assertBatchAccess(b, u);
  if (b.status !== 'committed') throw conflict(b.status === 'rolled_back' ? 'This import was already rolled back' : 'Only a confirmed import can be rolled back');
  return tx(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('import:' || $1))", [hotelId]);
    const locked = await one<{ status: string }>('SELECT status FROM import_batches WHERE id = $1 FOR UPDATE', [id], client);
    if (locked?.status !== 'committed') throw conflict('This import was already rolled back');
    const plan = await rollbackChanges(client, hotelId, b.changes, true);
    if (dryRun) return { report: plan, batch: batchView(b) };
    if (plan.conflicts.length) {
      throw new HttpError(409, 'rollback_conflict', `Rollback is not safe: ${plan.conflicts.length} record(s) changed after the import. Undo those edits or fix the records manually.`, { conflicts: plan.conflicts.slice(0, 50) });
    }
    const report = await rollbackChanges(client, hotelId, b.changes, false);
    await q(`UPDATE import_batches SET status = 'rolled_back', rolled_back_at = now() WHERE id = $1`, [id], client);
    await audit({ hotelId, user: u, action: 'import_rollback', entity: b.template, entityId: id, summary: `Rolled back import ${b.filename || b.template}: ${report.restored} record(s) restored`, ip }, client);
    return { report, batch: batchView((await one<BatchRow>('SELECT * FROM import_batches WHERE id = $1', [id], client))!) };
  });
}

export { TEMPLATES, MASTER_KEY, MASTER_TITLE };
