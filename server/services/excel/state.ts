import { ENTITIES, isEntityName } from '../../../shared/entities';
import { one, q, type Queryable } from '../../db';
import { conflict } from '../../errors';
import { departmentUsage } from '../../repos/hotels';
import { deleteEntity, touchDraft } from '../../repos/entities';
import type { ApplyContext, Change } from './types';

/**
 * Reversible state of everything an import can touch. Every change records
 * the state before and after; rollback restores `before` only while the
 * record still equals `after` — anything edited since the import is left
 * alone and reported, never overwritten.
 */
interface StateStore {
  read(db: Queryable, hotelId: string, ref: string): Promise<unknown>;
  write(db: Queryable, hotelId: string, ref: string, state: unknown): Promise<void>;
}

/** Key-order independent JSON for comparing states. */
export function stableJson(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, (val as Record<string, unknown>)[k]])) : val
  );
}
export const sameState = (a: unknown, b: unknown) => stableJson(a ?? null) === stableJson(b ?? null);

interface EntityState {
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  code: string;
  name_en: string;
  name_ar: string;
  data: Record<string, unknown>;
  archived_at: string | null;
}

function entityStore(name: string): StateStore {
  if (!isEntityName(name)) throw new Error(`Unknown entity ${name}`);
  const t = ENTITIES[name].table; // static registry
  return {
    async read(db, hotelId, id) {
      const r = await one<EntityState & { archived_at: Date | null }>(
        `SELECT parent_id, sort_order, is_active, code, name_en, name_ar, data, archived_at FROM ${t} WHERE hotel_id = $1 AND id = $2`,
        [hotelId, id],
        db
      );
      return r ? { ...r, archived_at: r.archived_at ? r.archived_at.toISOString() : null } : null;
    },
    async write(db, hotelId, id, state) {
      if (state === null) {
        await deleteEntity(name, hotelId, id, db); // refuses while children or references exist
        return;
      }
      const s = state as EntityState;
      await q(
        `UPDATE ${t} SET parent_id=$3, sort_order=$4, is_active=$5, code=$6, name_en=$7, name_ar=$8, data=$9, archived_at=$10, updated_at=now()
         WHERE hotel_id=$1 AND id=$2`,
        [hotelId, id, s.parent_id, s.sort_order, s.is_active, s.code, s.name_en, s.name_ar, JSON.stringify(s.data), s.archived_at],
        db
      );
      await touchDraft(hotelId, db);
    },
  };
}

const departmentStore: StateStore = {
  async read(db, hotelId, code) {
    return one(
      'SELECT name_en, name_ar, whatsapp, phone, email, is_active, sla_minutes, is_custom, sort_order FROM departments WHERE hotel_id = $1 AND code = $2',
      [hotelId, code],
      db
    );
  },
  async write(db, hotelId, code, state) {
    if (state === null) {
      const used = await departmentUsage(hotelId, code, db);
      if (used.length) throw conflict(`Department ${code} is now used by ${used.join(', ')}`);
      await q('DELETE FROM departments WHERE hotel_id = $1 AND code = $2 AND is_custom', [hotelId, code], db);
      return;
    }
    const s = state as Record<string, unknown>;
    await q(
      `UPDATE departments SET name_en=$3, name_ar=$4, whatsapp=$5, phone=$6, email=$7, is_active=$8, sla_minutes=$9, sort_order=$10, updated_at=now()
       WHERE hotel_id=$1 AND code=$2`,
      [hotelId, code, s.name_en, s.name_ar, s.whatsapp, s.phone, s.email, s.is_active, s.sla_minutes, s.sort_order],
      db
    );
  },
};

const profileStore: StateStore = {
  async read(db, hotelId) {
    return one('SELECT slug, name_en, name_ar, profile FROM hotels WHERE id = $1', [hotelId], db);
  },
  async write(db, hotelId, _ref, state) {
    const s = state as { slug: string; name_en: string; name_ar: string; profile: unknown };
    await q('UPDATE hotels SET slug=$2, name_en=$3, name_ar=$4, profile=$5, updated_at=now(), draft_updated_at=now() WHERE id=$1', [hotelId, s.slug, s.name_en, s.name_ar, JSON.stringify(s.profile)], db);
  },
};

/** One part (sections, navigation) of the website draft. */
const SITE_PARTS = ['sections', 'navigation'] as const;
const siteStore: StateStore = {
  async read(db, hotelId, part) {
    if (!(SITE_PARTS as readonly string[]).includes(part)) throw new Error(`Unknown site part ${part}`);
    const r = await one<{ v: unknown }>(`SELECT site_draft -> '${part}' AS v FROM hotels WHERE id = $1`, [hotelId], db);
    return r?.v ?? [];
  },
  async write(db, hotelId, part, state) {
    if (!(SITE_PARTS as readonly string[]).includes(part)) throw new Error(`Unknown site part ${part}`);
    await q(
      `UPDATE hotels SET site_draft = jsonb_set(COALESCE(site_draft, '{}'::jsonb), '{${part}}', $2::jsonb, true),
              site_draft_updated_at = now(), draft_updated_at = now(), updated_at = now() WHERE id = $1`,
      [hotelId, JSON.stringify(state ?? [])],
      db
    );
  },
};

export function storeFor(kind: string): StateStore {
  if (kind.startsWith('entity:')) return entityStore(kind.slice(7));
  if (kind === 'department') return departmentStore;
  if (kind === 'hotel_profile') return profileStore;
  if (kind === 'site') return siteStore;
  throw new Error(`Unknown state kind ${kind}`);
}

export async function readState(db: Queryable, hotelId: string, kind: string, ref: string) {
  return storeFor(kind).read(db, hotelId, ref);
}

/** Records a change after the adapter wrote it (the after-state is read back). */
export async function track(ctx: ApplyContext, c: Omit<Change, 'after'>) {
  const after = await readState(ctx.client, ctx.hotelId, c.kind, c.ref);
  ctx.changes.push({ ...c, after });
}

export interface RollbackReport {
  restored: number;
  unchanged: number;
  conflicts: { label: string; reason: string }[];
}

/**
 * Plans and applies a rollback in reverse order. With `dryRun`, nothing is
 * written and the report says whether a rollback is safe.
 */
export async function rollbackChanges(db: Queryable, hotelId: string, changes: Change[], dryRun: boolean): Promise<RollbackReport> {
  const report: RollbackReport = { restored: 0, unchanged: 0, conflicts: [] };
  // Later changes to the same record chain their states: walk backwards and
  // compare each change with the state its successor restored.
  const virtual = new Map<string, unknown>();
  for (const c of [...changes].reverse()) {
    const key = `${c.kind}|${c.ref}`;
    const current = virtual.has(key) ? virtual.get(key) : await readState(db, hotelId, c.kind, c.ref);
    if (sameState(current, c.before)) {
      report.unchanged++;
      virtual.set(key, c.before);
      continue;
    }
    if (!sameState(current, c.after)) {
      report.conflicts.push({ label: c.label, reason: current === null ? 'deleted since the import' : 'edited since the import' });
      virtual.set(key, current);
      continue;
    }
    if (!dryRun) await storeFor(c.kind).write(db, hotelId, c.ref, c.before);
    virtual.set(key, c.before);
    report.restored++;
  }
  return report;
}
