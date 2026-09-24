import { CODE_PATTERN, ENTITIES, ENTITY_NAMES, ENTITY_SCHEMAS, childrenOf, makeCode, type EntityName } from '../../shared/entities';
import { fieldKeys } from '../../shared/fields';
import { one, q, type Queryable } from '../db';
import { HttpError, badRequest, conflict, notFound, validationError } from '../errors';

export interface EntityRow {
  id: string;
  hotel_id: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  name_en: string;
  name_ar: string;
  code: string;
  archived_at: Date | null;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface EntityRecord extends Record<string, unknown> {
  id: string;
  code: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  archived: boolean;
  updated_at: string;
}

/** Keys a caller may send besides the entity's data fields. */
const SYSTEM_KEYS = ['is_active', 'sort_order', 'parent_id', 'code'] as const;

const fieldError = (field: string, message: string) => new HttpError(422, 'validation_failed', message, { fields: { [field]: message } });

/** Flattens a row into the API shape: system columns + validated data fields. */
export function toRecord(name: EntityName, row: EntityRow): EntityRecord {
  // Parse leniently so a later schema change never breaks reads of old rows.
  const parsed = ENTITY_SCHEMAS[name].partial().safeParse(row.data);
  const data = parsed.success ? parsed.data : row.data;
  return {
    ...data,
    id: row.id,
    code: row.code,
    parent_id: row.parent_id,
    sort_order: row.sort_order,
    is_active: row.is_active,
    archived: !!row.archived_at,
    updated_at: row.updated_at.toISOString(),
  };
}

const table = (name: EntityName) => ENTITIES[name].table; // static registry, never user input

export async function touchDraft(hotelId: string, db?: Queryable) {
  await q('UPDATE hotels SET draft_updated_at = now() WHERE id = $1', [hotelId], db);
}

export async function listEntities(
  name: EntityName,
  hotelId: string,
  opts: { parentId?: string | null; activeOnly?: boolean; includeArchived?: boolean; archivedOnly?: boolean } = {},
  db?: Queryable
): Promise<EntityRecord[]> {
  const params: unknown[] = [hotelId];
  let where = 'hotel_id = $1';
  if (opts.parentId !== undefined) {
    params.push(opts.parentId);
    where += ` AND parent_id = $${params.length}`;
  }
  if (opts.activeOnly) where += ' AND is_active';
  if (opts.archivedOnly) where += ' AND archived_at IS NOT NULL';
  else if (!opts.includeArchived) where += ' AND archived_at IS NULL';
  const rows = await q<EntityRow>(`SELECT * FROM ${table(name)} WHERE ${where} ORDER BY sort_order, created_at`, params, db);
  return rows.map((r) => toRecord(name, r));
}

export async function listByParents(name: EntityName, hotelId: string, parentIds: string[], activeOnly = true, db?: Queryable) {
  if (!parentIds.length) return [];
  const rows = await q<EntityRow>(
    `SELECT * FROM ${table(name)} WHERE hotel_id = $1 AND parent_id = ANY($2::uuid[]) AND archived_at IS NULL ${activeOnly ? 'AND is_active' : ''} ORDER BY sort_order, created_at`,
    [hotelId, parentIds],
    db
  );
  return rows.map((r) => toRecord(name, r));
}

export async function getEntityRow(name: EntityName, hotelId: string, id: string, db?: Queryable) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return one<EntityRow>(`SELECT * FROM ${table(name)} WHERE hotel_id = $1 AND id = $2`, [hotelId, id], db);
}

export async function getEntityByCode(name: EntityName, hotelId: string, code: string, db?: Queryable) {
  return one<EntityRow>(`SELECT * FROM ${table(name)} WHERE hotel_id = $1 AND code = $2`, [hotelId, code.trim().toUpperCase()], db);
}

async function assertParent(name: EntityName, hotelId: string, parentId: unknown, db?: Queryable): Promise<string | null> {
  const def = ENTITIES[name];
  if (!def.parent) return null;
  const parentDef = ENTITIES[def.parent];
  if (typeof parentId !== 'string') throw fieldError('parent_id', `Choose the ${parentDef.label.singular.toLowerCase()} this belongs to`);
  const parent = await getEntityRow(def.parent, hotelId, parentId, db);
  if (!parent) throw fieldError('parent_id', `${parentDef.label.singular} not found in this hotel`);
  return parent.id;
}

/** Ref and department fields must point at rows of the same hotel. */
async function assertRefs(name: EntityName, hotelId: string, data: Record<string, unknown>, db?: Queryable) {
  for (const f of ENTITIES[name].fields) {
    const v = data[f.key];
    if (v == null || v === '') continue;
    if (f.type === 'ref' && f.refEntity) {
      const row = await getEntityRow(f.refEntity as EntityName, hotelId, String(v), db);
      if (!row) throw fieldError(f.key, 'Selected item no longer exists');
    }
    if (f.type === 'department') {
      const d = await one('SELECT 1 FROM departments WHERE hotel_id = $1 AND code = $2', [hotelId, v], db);
      if (!d) throw fieldError(f.key, `Department ${String(v)} is not configured for this hotel`);
    }
  }
}

export function validateData(name: EntityName, input: Record<string, unknown>) {
  const res = ENTITY_SCHEMAS[name].safeParse(input);
  if (!res.success) throw validationError(res.error);
  return res.data as Record<string, unknown>;
}

function titleOf(name: EntityName, data: Record<string, unknown>) {
  const key = ENTITIES[name].titleField;
  return { en: String(data[`${key}_en`] ?? ''), ar: String(data[`${key}_ar`] ?? '') };
}

async function codeTaken(name: EntityName, hotelId: string, code: string, exceptId: string | null, db?: Queryable) {
  return !!(await one(`SELECT 1 FROM ${table(name)} WHERE hotel_id = $1 AND code = $2 AND id IS DISTINCT FROM $3`, [hotelId, code, exceptId], db));
}

/** Uses the given code (validated, unique) or generates PREFIX-NAME with a numeric suffix. */
async function resolveCode(name: EntityName, hotelId: string, requested: unknown, nameEn: string, exceptId: string | null, db?: Queryable) {
  if (requested !== undefined && requested !== null && String(requested).trim() !== '') {
    const code = String(requested).trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) throw fieldError('code', 'Codes use capital letters, digits and hyphens (e.g. ITEM-LATTE)');
    if (await codeTaken(name, hotelId, code, exceptId, db)) throw fieldError('code', `Code ${code} is already used`);
    return code;
  }
  const base = makeCode(ENTITIES[name].codePrefix, nameEn).slice(0, 60);
  let code = base;
  for (let n = 2; await codeTaken(name, hotelId, code, exceptId, db); n++) code = `${base}-${n}`;
  return code;
}

export async function createEntity(name: EntityName, hotelId: string, input: Record<string, unknown>, db?: Queryable): Promise<EntityRecord> {
  const data = validateData(name, input);
  const parentId = await assertParent(name, hotelId, input.parent_id, db);
  await assertRefs(name, hotelId, data, db);
  const t = titleOf(name, data);
  const code = await resolveCode(name, hotelId, input.code, t.en, null, db);
  const isActive = input.is_active === undefined ? true : Boolean(input.is_active);
  const next = await one<{ n: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM ${table(name)} WHERE hotel_id = $1 AND parent_id IS NOT DISTINCT FROM $2`,
    [hotelId, parentId],
    db
  );
  const sort = typeof input.sort_order === 'number' ? input.sort_order : next?.n ?? 0;
  const row = await one<EntityRow>(
    `INSERT INTO ${table(name)} (hotel_id, parent_id, sort_order, is_active, name_en, name_ar, code, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [hotelId, parentId, sort, isActive, t.en, t.ar, code, JSON.stringify(data)],
    db
  );
  await touchDraft(hotelId, db);
  return toRecord(name, row!);
}

/**
 * Partial update. Rejects payloads without any recognised field (no silent
 * success) and reports whether anything actually changed.
 */
export async function updateEntity(
  name: EntityName,
  hotelId: string,
  id: string,
  patch: Record<string, unknown>,
  db?: Queryable
): Promise<{ before: EntityRecord; after: EntityRecord; changed: boolean }> {
  const dataKeys = new Set(ENTITIES[name].fields.flatMap(fieldKeys));
  const recognised = Object.keys(patch).filter((k) => dataKeys.has(k) || (SYSTEM_KEYS as readonly string[]).includes(k));
  if (!recognised.length) {
    throw new HttpError(422, 'no_changes', `Nothing to update: none of the fields sent (${Object.keys(patch).join(', ') || 'empty body'}) belong to ${ENTITIES[name].label.singular.toLowerCase()}.`);
  }
  const row = await getEntityRow(name, hotelId, id, db);
  if (!row) throw notFound(`${ENTITIES[name].label.singular} not found`);
  const before = toRecord(name, row);
  const merged: Record<string, unknown> = { ...row.data };
  for (const [k, v] of Object.entries(patch)) if (dataKeys.has(k)) merged[k] = v;
  const data = validateData(name, merged);
  await assertRefs(name, hotelId, data, db);
  const parentId = patch.parent_id !== undefined && patch.parent_id !== row.parent_id ? await assertParent(name, hotelId, patch.parent_id, db) : row.parent_id;
  const isActive = patch.is_active === undefined ? row.is_active : Boolean(patch.is_active);
  const sort = typeof patch.sort_order === 'number' ? patch.sort_order : row.sort_order;
  const t = titleOf(name, data);
  const code = patch.code !== undefined && String(patch.code).trim().toUpperCase() !== row.code ? await resolveCode(name, hotelId, patch.code, t.en, row.id, db) : row.code;

  const prevData = ENTITY_SCHEMAS[name].safeParse(row.data);
  const changed =
    JSON.stringify(data) !== JSON.stringify(prevData.success ? prevData.data : row.data) ||
    parentId !== row.parent_id ||
    isActive !== row.is_active ||
    sort !== row.sort_order ||
    code !== row.code;
  if (!changed) return { before, after: before, changed: false };

  const updated = await one<EntityRow>(
    `UPDATE ${table(name)} SET parent_id=$3, sort_order=$4, is_active=$5, name_en=$6, name_ar=$7, code=$8, data=$9, updated_at=now()
     WHERE hotel_id=$1 AND id=$2 RETURNING *`,
    [hotelId, id, parentId, sort, isActive, t.en, t.ar, code, JSON.stringify(data)],
    db
  );
  await touchDraft(hotelId, db);
  return { before, after: toRecord(name, updated!), changed: true };
}

/** Other rows that reference this one (quick actions, offers). */
async function referencesTo(name: EntityName, hotelId: string, id: string, db?: Queryable): Promise<string[]> {
  const out: string[] = [];
  for (const e of ENTITY_NAMES) {
    for (const f of ENTITIES[e].fields) {
      if (f.type !== 'ref' || f.refEntity !== name) continue;
      const rows = await q<{ name_en: string }>(`SELECT name_en FROM ${table(e)} WHERE hotel_id = $1 AND data->>'${f.key}' = $2`, [hotelId, id], db);
      out.push(...rows.map((r) => `${ENTITIES[e].label.singular} “${r.name_en}”`));
    }
  }
  return out;
}

export async function deleteEntity(name: EntityName, hotelId: string, id: string, db?: Queryable): Promise<EntityRecord> {
  const row = await getEntityRow(name, hotelId, id, db);
  if (!row) throw notFound(`${ENTITIES[name].label.singular} not found`);
  for (const child of childrenOf(name)) {
    const c = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table(child)} WHERE hotel_id = $1 AND parent_id = $2`, [hotelId, id], db);
    if (c && c.n > 0) throw conflict(`This ${ENTITIES[name].label.singular.toLowerCase()} still contains ${c.n} ${ENTITIES[child].label.plural.toLowerCase()}. Move or delete them first, or archive it instead.`);
  }
  const refs = await referencesTo(name, hotelId, id, db);
  if (refs.length) throw conflict(`Still used by ${refs.slice(0, 3).join(', ')}${refs.length > 3 ? '…' : ''}. Update those first, or archive this instead.`);
  await q(`DELETE FROM ${table(name)} WHERE hotel_id = $1 AND id = $2`, [hotelId, id], db);
  await touchDraft(hotelId, db);
  return toRecord(name, row);
}

export async function setArchived(name: EntityName, hotelId: string, id: string, archived: boolean, db?: Queryable): Promise<EntityRecord> {
  const row = await one<EntityRow>(
    `UPDATE ${table(name)} SET archived_at = ${archived ? 'now()' : 'NULL'}, updated_at = now() WHERE hotel_id = $1 AND id = $2 RETURNING *`,
    [hotelId, id],
    db
  );
  if (!row) throw notFound(`${ENTITIES[name].label.singular} not found`);
  await touchDraft(hotelId, db);
  return toRecord(name, row);
}

/**
 * Copies a record (and everything below it, e.g. a menu with its categories
 * and items). Copies start hidden so they never go live by accident.
 */
export async function duplicateEntity(name: EntityName, hotelId: string, id: string, db: Queryable, parentOverride?: string, depth = 0): Promise<EntityRecord> {
  const row = await getEntityRow(name, hotelId, id, db);
  if (!row) throw notFound(`${ENTITIES[name].label.singular} not found`);
  const key = ENTITIES[name].titleField;
  const data = { ...row.data };
  if (depth === 0) {
    data[`${key}_en`] = `${String(data[`${key}_en`] ?? '')} (copy)`.slice(0, 200);
    if (data[`${key}_ar`]) data[`${key}_ar`] = `${String(data[`${key}_ar`])} (نسخة)`.slice(0, 200);
  }
  const copy = await createEntity(name, hotelId, { ...data, parent_id: parentOverride ?? row.parent_id, is_active: depth === 0 ? false : row.is_active }, db);
  for (const child of childrenOf(name)) {
    const kids = await q<{ id: string }>(`SELECT id FROM ${table(child)} WHERE hotel_id = $1 AND parent_id = $2 AND archived_at IS NULL ORDER BY sort_order`, [hotelId, id], db);
    for (const k of kids) await duplicateEntity(child, hotelId, k.id, db, copy.id, depth + 1);
  }
  return copy;
}

export async function reorderEntities(name: EntityName, hotelId: string, ids: string[], db?: Queryable) {
  const found = await q<{ id: string }>(`SELECT id FROM ${table(name)} WHERE hotel_id = $1 AND id = ANY($2::uuid[])`, [hotelId, ids], db);
  if (found.length !== ids.length) throw badRequest('Some items do not belong to this hotel');
  for (let i = 0; i < ids.length; i++) {
    await q(`UPDATE ${table(name)} SET sort_order = $3, updated_at = now() WHERE hotel_id = $1 AND id = $2`, [hotelId, ids[i], i], db);
  }
  await touchDraft(hotelId, db);
}

export async function countEntities(name: EntityName, hotelId: string, db?: Queryable) {
  return one<{ total: number; active: number; hidden: number; archived: number }>(
    `SELECT COUNT(*) FILTER (WHERE archived_at IS NULL) AS total,
            COUNT(*) FILTER (WHERE archived_at IS NULL AND is_active) AS active,
            COUNT(*) FILTER (WHERE archived_at IS NULL AND NOT is_active) AS hidden,
            COUNT(*) FILTER (WHERE archived_at IS NOT NULL) AS archived
       FROM ${table(name)} WHERE hotel_id = $1`,
    [hotelId],
    db
  );
}
