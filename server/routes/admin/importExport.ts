import { Hono } from 'hono';
import type pg from 'pg';
import { z } from 'zod';
import { ENTITIES, IMPORT_ORDER, IMPORT_WORKBOOKS, type EntityName } from '../../../shared/entities';
import { ANCESTOR_COLUMN, ancestorsOf, coerceCell, exportCell, importColumns } from '../../../shared/importSpec';
import { audit } from '../../audit';
import { requireHotelAccess } from '../../auth';
import { clientIp, type AppEnv } from '../../context';
import { one, pool } from '../../db';
import { HttpError, notFound, validationError } from '../../errors';
import { createEntity, listEntities, updateEntity } from '../../repos/entities';

export const importRoutes = new Hono<AppEnv>();

type Row = Record<string, unknown>;
interface RowResult {
  sheet: EntityName;
  row: number; // spreadsheet row number (header = 1)
  action: 'create' | 'update' | 'error';
  name: string;
  errors: string[];
}

const bodySchema = z.object({
  sheets: z.record(z.string(), z.array(z.record(z.string(), z.unknown())).max(3000)),
  mode: z.enum(['upsert', 'create_only']).default('upsert'),
  commit: z.boolean().default(false),
});

function workbook(c: { req: { param: (k: string) => string | undefined } }) {
  const key = c.req.param('workbook') ?? '';
  const wb = IMPORT_WORKBOOKS[key];
  if (!wb) throw notFound('Unknown import template');
  return { key, wb };
}

/** Finds a row by ancestor path + English name, case-insensitively, inside one hotel. */
async function findByPath(client: pg.PoolClient, hotelId: string, entity: EntityName, parentId: string | null, name: string) {
  const def = ENTITIES[entity];
  return one<{ id: string }>(
    `SELECT id FROM ${def.table} WHERE hotel_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND lower(name_en) = lower($3) ORDER BY created_at LIMIT 1`,
    [hotelId, parentId, name.trim()],
    client
  );
}

async function resolveParent(client: pg.PoolClient, hotelId: string, entity: EntityName, row: Row): Promise<{ parentId: string | null; error?: string }> {
  let parentId: string | null = null;
  for (const a of ancestorsOf(entity)) {
    const col = ANCESTOR_COLUMN[a]!;
    const value = String(row[col] ?? '').trim();
    if (!value) return { parentId: null, error: `Column "${col}" is required` };
    const found = await findByPath(client, hotelId, a, parentId, value);
    if (!found) return { parentId: null, error: `${ENTITIES[a].label.singular} "${value}" not found${parentId ? ' under the given parent' : ''}` };
    parentId = found.id;
  }
  return { parentId };
}

async function processSheet(client: pg.PoolClient, hotelId: string, entity: EntityName, rows: Row[], mode: 'upsert' | 'create_only'): Promise<RowResult[]> {
  const columns = importColumns(entity);
  const results: RowResult[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of rows.entries()) {
    const rowNo = i + 2;
    // Normalise headers (trim/lowercase) so "Name_EN " still matches.
    const row: Row = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), v]));
    const isBlank = Object.values(row).every((v) => v == null || String(v).trim() === '');
    if (isBlank) continue;
    const name = String(row[`${ENTITIES[entity].titleField}_en`] ?? '').trim();
    const res: RowResult = { sheet: entity, row: rowNo, action: 'create', name, errors: [] };
    results.push(res);

    const patch: Record<string, unknown> = {};
    for (const col of columns) {
      if (col.kind !== 'field' || !(col.header in row)) continue;
      const { value, error } = coerceCell(col.field!, row[col.header]);
      if (error) res.errors.push(`${col.header}: ${error}`);
      else if (value !== undefined) patch[col.storageKey!] = value;
    }
    if ('active' in row) {
      const { value, error } = coerceCell({ key: 'active', type: 'boolean', label: 'active', default: true }, row.active);
      if (error) res.errors.push(`active: ${error}`);
      else patch.is_active = value;
    }
    if ('sort_order' in row && String(row.sort_order ?? '').trim() !== '') {
      const n = Number(row.sort_order);
      if (Number.isInteger(n)) patch.sort_order = n;
      else res.errors.push('sort_order: must be a whole number');
    }

    const { parentId, error: parentError } = await resolveParent(client, hotelId, entity, row);
    if (parentError) res.errors.push(parentError);
    if (!name) res.errors.push(`${ENTITIES[entity].titleField}_en is required`);

    const dupKey = `${parentId}|${name.toLowerCase()}`;
    if (name && seen.has(dupKey)) res.errors.push(`Duplicate of an earlier row in this sheet ("${name}")`);
    seen.add(dupKey);

    if (res.errors.length) {
      res.action = 'error';
      continue;
    }

    const id = String(row.id ?? '').trim();
    let targetId: string | null = null;
    if (id) {
      const exists = await one(`SELECT id FROM ${ENTITIES[entity].table} WHERE hotel_id = $1 AND id::text = $2`, [hotelId, id], client);
      if (!exists) {
        res.action = 'error';
        res.errors.push(`id ${id} does not belong to this hotel`);
        continue;
      }
      targetId = id;
    } else {
      const match = await findByPath(client, hotelId, entity, parentId, name);
      if (match) {
        if (mode === 'create_only') {
          res.action = 'error';
          res.errors.push(`"${name}" already exists (choose "update existing" to overwrite)`);
          continue;
        }
        targetId = match.id;
      }
    }

    // Savepoint per row: a failing row must not poison the rest of the dry run.
    await client.query('SAVEPOINT import_row');
    try {
      if (targetId) {
        await updateEntity(entity, hotelId, targetId, { ...patch, parent_id: parentId ?? undefined }, client);
        res.action = 'update';
      } else {
        await createEntity(entity, hotelId, { ...patch, parent_id: parentId }, client);
        res.action = 'create';
      }
      await client.query('RELEASE SAVEPOINT import_row');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT import_row');
      res.action = 'error';
      const fields = e instanceof HttpError ? (e.details as { fields?: Record<string, string> } | undefined)?.fields : undefined;
      if (fields) for (const [k, m] of Object.entries(fields)) res.errors.push(`${k}: ${m}`);
      else res.errors.push(e instanceof Error ? e.message : 'Invalid row');
    }
  }
  return results;
}

importRoutes.get('/:hid/import/:workbook/template', async (c) => {
  const hid = c.req.param('hid');
  const { wb } = workbook(c);
  for (const e of wb.entities) requireHotelAccess(c, hid, ENTITIES[e].module);
  return c.json({ sheets: wb.entities.map((e) => ({ entity: e, label: ENTITIES[e].label.plural, columns: importColumns(e).map(({ header, hint }) => ({ header, hint })) })) });
});

importRoutes.get('/:hid/export/:workbook', async (c) => {
  const hid = c.req.param('hid');
  const { wb } = workbook(c);
  for (const e of wb.entities) requireHotelAccess(c, hid, ENTITIES[e].module);
  const nameById = new Map<string, { name: string; parent: string | null; entity: EntityName }>();
  const sheets = [];
  // Ancestors (e.g. outlets) are loaded first so child rows can name their parents.
  const order = [...new Set(wb.entities.flatMap((e) => [...ancestorsOf(e), e]))];
  for (const e of order) {
    const recs = await listEntities(e, hid);
    for (const r of recs) nameById.set(r.id, { name: String(r[`${ENTITIES[e].titleField}_en`] ?? ''), parent: r.parent_id, entity: e });
    if (!wb.entities.includes(e)) continue;
    const cols = importColumns(e);
    const rows = recs.map((r) => {
      const out: Record<string, string | number> = {};
      // Walk up the parent chain to fill ancestor columns.
      let pid = r.parent_id;
      const names: Record<string, string> = {};
      while (pid && nameById.has(pid)) {
        const p = nameById.get(pid)!;
        names[ANCESTOR_COLUMN[p.entity]!] = p.name;
        pid = p.parent;
      }
      for (const col of cols) {
        if (col.kind === 'id') out.id = r.id;
        else if (col.kind === 'ancestor') out[col.header] = names[col.header] ?? '';
        else if (col.kind === 'active') out.active = r.is_active ? 'yes' : 'no';
        else if (col.kind === 'sort') out.sort_order = r.sort_order;
        else out[col.header] = exportCell(col.field, r[col.storageKey!]);
      }
      return out;
    });
    sheets.push({ entity: e, label: ENTITIES[e].label.plural, columns: cols.map((x) => x.header), rows });
  }
  // outlets are needed as ancestors but are not themselves importable
  return c.json({ sheets });
});

importRoutes.post('/:hid/import/:workbook', async (c) => {
  const hid = c.req.param('hid');
  const { key, wb } = workbook(c);
  let user = null;
  for (const e of wb.entities) user = requireHotelAccess(c, hid, ENTITIES[e].module);
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const { sheets, mode, commit } = parsed.data;
  const unknown = Object.keys(sheets).filter((s) => !wb.entities.includes(s as EntityName));
  if (unknown.length) throw new HttpError(422, 'validation_failed', `Unexpected sheet(s): ${unknown.join(', ')}. Expected: ${wb.entities.join(', ')}`);

  const client = await pool.connect();
  const results: RowResult[] = [];
  try {
    await client.query('BEGIN');
    for (const e of IMPORT_ORDER) {
      if (!wb.entities.includes(e) || !sheets[e]) continue;
      results.push(...(await processSheet(client, hid, e, sheets[e], mode)));
    }
    const errors = results.filter((r) => r.action === 'error').length;
    const summary = {
      create: results.filter((r) => r.action === 'create').length,
      update: results.filter((r) => r.action === 'update').length,
      errors,
    };
    if (commit && errors === 0 && results.length > 0) {
      await audit({ hotelId: hid, user, action: 'import', entity: key, summary: `Imported ${summary.create} new, ${summary.update} updated`, after: summary, ip: clientIp(c) }, client);
      await client.query('COMMIT');
      return c.json({ committed: true, summary, results });
    }
    // Preview (or a commit blocked by errors) is a dry run: nothing is kept.
    await client.query('ROLLBACK');
    if (commit) {
      return c.json({ committed: false, summary, results, message: errors ? 'Fix the rows with errors — nothing was imported.' : 'The file has no data rows.' }, 422);
    }
    return c.json({ committed: false, summary, results });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
});

