import { ENTITIES, ENTITY_SCHEMAS, type EntityName } from '../../shared/entities';
import { fieldKeys } from '../../shared/fields';
import { one, q, type Queryable } from '../db';
import { HttpError, badRequest, notFound, validationError } from '../errors';

export interface EntityRow {
  id: string;
  hotel_id: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  name_en: string;
  name_ar: string;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface EntityRecord extends Record<string, unknown> {
  id: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

/** Flattens a row into the API shape: system columns + validated data fields. */
export function toRecord(name: EntityName, row: EntityRow): EntityRecord {
  const schema = ENTITY_SCHEMAS[name];
  // Parse leniently so a later schema change never breaks reads of old rows.
  const parsed = schema.partial().safeParse(row.data);
  const data = parsed.success ? parsed.data : row.data;
  return {
    ...data,
    id: row.id,
    parent_id: row.parent_id,
    sort_order: row.sort_order,
    is_active: row.is_active,
    updated_at: row.updated_at.toISOString(),
  };
}

function table(name: EntityName) {
  // Table names come from the static registry, never from user input.
  return ENTITIES[name].table;
}

export async function listEntities(
  name: EntityName,
  hotelId: string,
  opts: { parentId?: string | null; activeOnly?: boolean } = {},
  db?: Queryable
): Promise<EntityRecord[]> {
  const params: unknown[] = [hotelId];
  let where = 'hotel_id = $1';
  if (opts.parentId !== undefined) {
    params.push(opts.parentId);
    where += ` AND parent_id = $${params.length}`;
  }
  if (opts.activeOnly) where += ' AND is_active';
  const rows = await q<EntityRow>(`SELECT * FROM ${table(name)} WHERE ${where} ORDER BY sort_order, created_at`, params, db);
  return rows.map((r) => toRecord(name, r));
}

export async function getEntityRow(name: EntityName, hotelId: string, id: string, db?: Queryable) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return one<EntityRow>(`SELECT * FROM ${table(name)} WHERE hotel_id = $1 AND id = $2`, [hotelId, id], db);
}

/** Validates that a parent id exists in the same hotel (tenant isolation for FKs). */
async function assertParent(name: EntityName, hotelId: string, parentId: unknown, db?: Queryable): Promise<string | null> {
  const def = ENTITIES[name];
  if (!def.parent) return null;
  if (typeof parentId !== 'string') throw badRequest(`${def.label.singular} requires a parent ${ENTITIES[def.parent].label.singular.toLowerCase()}`);
  const parent = await getEntityRow(def.parent, hotelId, parentId, db);
  if (!parent) throw badRequest(`Parent ${ENTITIES[def.parent].label.singular.toLowerCase()} not found in this hotel`);
  return parent.id;
}

/** Validates ref fields point at rows of the same hotel. */
async function assertRefs(name: EntityName, hotelId: string, data: Record<string, unknown>, db?: Queryable) {
  for (const f of ENTITIES[name].fields) {
    if (f.type !== 'ref' || !f.refEntity) continue;
    const v = data[f.key];
    if (v == null) continue;
    const row = await getEntityRow(f.refEntity as EntityName, hotelId, String(v), db);
    if (!row) throw new HttpError(422, 'validation_failed', 'Please correct the highlighted fields', { fields: { [f.key]: 'Selected item no longer exists' } });
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

export async function createEntity(
  name: EntityName,
  hotelId: string,
  input: Record<string, unknown>,
  db?: Queryable
): Promise<EntityRecord> {
  const data = validateData(name, input);
  const parentId = await assertParent(name, hotelId, input.parent_id, db);
  await assertRefs(name, hotelId, data, db);
  const t = titleOf(name, data);
  const isActive = input.is_active === undefined ? true : Boolean(input.is_active);
  const next = await one<{ n: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM ${table(name)} WHERE hotel_id = $1 AND parent_id IS NOT DISTINCT FROM $2`,
    [hotelId, parentId],
    db
  );
  const sort = typeof input.sort_order === 'number' ? input.sort_order : next?.n ?? 0;
  const row = await one<EntityRow>(
    `INSERT INTO ${table(name)} (hotel_id, parent_id, sort_order, is_active, name_en, name_ar, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [hotelId, parentId, sort, isActive, t.en, t.ar, JSON.stringify(data)],
    db
  );
  return toRecord(name, row!);
}

export async function updateEntity(
  name: EntityName,
  hotelId: string,
  id: string,
  patch: Record<string, unknown>,
  db?: Queryable
): Promise<{ before: EntityRecord; after: EntityRecord }> {
  const row = await getEntityRow(name, hotelId, id, db);
  if (!row) throw notFound(`${ENTITIES[name].label.singular} not found`);
  const before = toRecord(name, row);
  const dataKeys = new Set(ENTITIES[name].fields.flatMap(fieldKeys));
  const merged: Record<string, unknown> = { ...row.data };
  for (const [k, v] of Object.entries(patch)) if (dataKeys.has(k)) merged[k] = v;
  const data = validateData(name, merged);
  await assertRefs(name, hotelId, data, db);
  const parentId = patch.parent_id !== undefined && patch.parent_id !== row.parent_id ? await assertParent(name, hotelId, patch.parent_id, db) : row.parent_id;
  const isActive = patch.is_active === undefined ? row.is_active : Boolean(patch.is_active);
  const sort = typeof patch.sort_order === 'number' ? patch.sort_order : row.sort_order;
  const t = titleOf(name, data);
  const updated = await one<EntityRow>(
    `UPDATE ${table(name)} SET parent_id=$3, sort_order=$4, is_active=$5, name_en=$6, name_ar=$7, data=$8, updated_at=now()
     WHERE hotel_id=$1 AND id=$2 RETURNING *`,
    [hotelId, id, parentId, sort, isActive, t.en, t.ar, JSON.stringify(data)],
    db
  );
  return { before, after: toRecord(name, updated!) };
}

export async function deleteEntity(name: EntityName, hotelId: string, id: string, db?: Queryable): Promise<EntityRecord> {
  const row = await getEntityRow(name, hotelId, id, db);
  if (!row) throw notFound(`${ENTITIES[name].label.singular} not found`);
  await q(`DELETE FROM ${table(name)} WHERE hotel_id = $1 AND id = $2`, [hotelId, id], db);
  return toRecord(name, row);
}

export async function reorderEntities(name: EntityName, hotelId: string, ids: string[], db?: Queryable) {
  for (let i = 0; i < ids.length; i++) {
    await q(`UPDATE ${table(name)} SET sort_order = $3, updated_at = now() WHERE hotel_id = $1 AND id = $2`, [hotelId, ids[i], i], db);
  }
}

export async function listByParents(name: EntityName, hotelId: string, parentIds: string[], activeOnly = true, db?: Queryable) {
  if (!parentIds.length) return [];
  const rows = await q<EntityRow>(
    `SELECT * FROM ${table(name)} WHERE hotel_id = $1 AND parent_id = ANY($2::uuid[]) ${activeOnly ? 'AND is_active' : ''} ORDER BY sort_order, created_at`,
    [hotelId, parentIds],
    db
  );
  return rows.map((r) => toRecord(name, r));
}
