import type pg from 'pg';
import { ENTITIES, privateKeys, type EntityName } from '../../shared/entities';
import type { SiteConfig } from '../../shared/hotel';
import { audit } from '../audit';
import type { SessionUser } from '../context';
import { one, pool, q, type Queryable } from '../db';
import { conflict, notFound } from '../errors';
import { listEntities, type EntityRecord } from '../repos/entities';
import { getHotelRow, hydrate, parseSite, type Hotel } from '../repos/hotels';

/**
 * Publishing model.
 *
 * Staff edit live tables (the draft). "Publish updates" freezes everything
 * guest-facing — profile, branding, website layout, the whole catalog and
 * every outlet menu — into an immutable, versioned snapshot. Guests read the
 * latest snapshot; staff preview reads the draft. Orders are priced from the
 * snapshot, so a guest always pays the price they were shown.
 *
 * Operational state is NOT published: availability ("sold out"), outlet
 * status override ("closed now"), departments/WhatsApp routing and hotel
 * settings apply immediately. Removing something (hide, archive, delete) is
 * also enforced immediately when ordering.
 */

/** Entities in the guest bundle. Menus are served per outlet. */
export const BUNDLE_ENTITIES: EntityName[] = [
  'offers',
  'quick_actions',
  'outlets',
  'room_services',
  'hotel_services',
  'spa_categories',
  'spa_services',
  'laundry_categories',
  'laundry_items',
  'laundry_packages',
  'info_items',
];
export const MENU_ENTITIES: EntityName[] = ['menus', 'menu_categories', 'menu_items'];
const SNAPSHOT_ENTITIES = [...BUNDLE_ENTITIES, ...MENU_ENTITIES];

/** Content entities whose audit entries count as "changes since publish". */
const CONTENT_AUDIT_ENTITIES = [...SNAPSHOT_ENTITIES, 'hotel_profile', 'branding', 'website_draft'];

export interface ContentSnapshot {
  schema: 1;
  profile: Hotel['profile'];
  branding: Hotel['branding'];
  site: SiteConfig;
  catalog: Record<string, EntityRecord[]>;
}

/** Private fields that never leave the server, except outlet WhatsApp (used for routing, stripped from the bundle). */
function stripPrivate(name: EntityName, r: EntityRecord): EntityRecord {
  const hidden = privateKeys(name).filter((k) => k !== 'whatsapp');
  if (!hidden.length) return r;
  return Object.fromEntries(Object.entries(r).filter(([k]) => !hidden.includes(k))) as EntityRecord;
}

/** The current draft content (live tables), shaped exactly like a snapshot. */
export async function buildDraftContent(hotelId: string, db: Queryable = pool): Promise<ContentSnapshot> {
  const row = await getHotelRow(hotelId, db);
  if (!row) throw notFound('Hotel not found');
  const hotel = hydrate(row);
  const catalog: Record<string, EntityRecord[]> = {};
  for (const e of SNAPSHOT_ENTITIES) catalog[e] = (await listEntities(e, hotelId, { activeOnly: true }, db)).map((r) => stripPrivate(e, r));
  // Children of hidden parents are not part of the guest-facing content.
  const keep = (child: EntityName, parent: EntityName) => {
    const ids = new Set(catalog[parent].map((p) => p.id));
    catalog[child] = catalog[child].filter((c) => c.parent_id && ids.has(c.parent_id));
  };
  keep('spa_services', 'spa_categories');
  keep('laundry_items', 'laundry_categories');
  keep('menus', 'outlets');
  keep('menu_categories', 'menus');
  keep('menu_items', 'menu_categories');
  return { schema: 1, profile: hotel.profile, branding: hotel.branding, site: parseSite(row.site_draft), catalog };
}

// ---------------------------------------------------------------------------
// Latest publication (cached per process, validated by version on each read)
// ---------------------------------------------------------------------------
interface Cached {
  id: string;
  version: number;
  published_at: Date;
  snapshot: ContentSnapshot;
}
const cache = new Map<string, Cached>();

export async function latestPublication(hotelId: string, db: Queryable = pool): Promise<Cached | null> {
  const head = await one<{ id: string; version: number; published_at: Date }>(
    `SELECT id, version, published_at FROM publications WHERE hotel_id = $1 ORDER BY version DESC LIMIT 1`,
    [hotelId],
    db
  );
  if (!head) return null;
  const hit = cache.get(hotelId);
  if (hit && hit.id === head.id) return hit;
  const row = await one<{ snapshot: ContentSnapshot }>(`SELECT snapshot FROM publications WHERE id = $1`, [head.id], db);
  const entry = { ...head, snapshot: row!.snapshot };
  cache.set(hotelId, entry);
  return entry;
}

/** Published content, or the draft when there is nothing published yet (only possible before the first publish). */
export async function publishedContent(hotelId: string): Promise<ContentSnapshot> {
  const p = await latestPublication(hotelId);
  return p ? p.snapshot : buildDraftContent(hotelId);
}

function summarize(content: ContentSnapshot) {
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(content.catalog)) counts[k] = v.length;
  return { counts, sections: content.site.sections.filter((s) => s.visible).length, slides: content.site.hero.slides.filter((s) => s.visible).length };
}

export async function changesSincePublish(hotelId: string, db: Queryable = pool) {
  const latest = await latestPublication(hotelId, db);
  const since = latest?.published_at ?? new Date(0);
  const rows = await q<{ action: string; entity: string; summary: string; user_email: string; created_at: Date }>(
    `SELECT action, entity, summary, user_email, created_at FROM audit_log
      WHERE hotel_id = $1 AND created_at > $2 AND entity = ANY($3::text[])
      ORDER BY created_at DESC LIMIT 100`,
    [hotelId, since, CONTENT_AUDIT_ENTITIES],
    db
  );
  const draft = await one<{ draft_updated_at: Date }>(`SELECT draft_updated_at FROM hotels WHERE id = $1`, [hotelId], db);
  return {
    has_unpublished_changes: !latest || (draft?.draft_updated_at ?? new Date(0)) > latest.published_at,
    latest: latest ? { id: latest.id, version: latest.version, published_at: latest.published_at } : null,
    changes: rows,
  };
}

export async function publishHotel(client: pg.PoolClient, hotelId: string, user: SessionUser | null, note: string, ip?: string) {
  // Serialise publishes per hotel so versions are gap-free and ordered.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`publish:${hotelId}`]);
  const content = await buildDraftContent(hotelId, client);
  const { changes } = await changesSincePublish(hotelId, client);
  const next = await one<{ v: number }>(`SELECT COALESCE(MAX(version), 0) + 1 AS v FROM publications WHERE hotel_id = $1`, [hotelId], client);
  const summary = { ...summarize(content), changes: changes.length, note };
  const row = await one<{ id: string; version: number; published_at: Date }>(
    `INSERT INTO publications (hotel_id, version, snapshot, summary, published_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, version, published_at`,
    [hotelId, next!.v, JSON.stringify(content), JSON.stringify(summary), user?.id ?? null],
    client
  );
  await q(`UPDATE hotels SET site_published = site_draft, site_published_at = $2, updated_at = now() WHERE id = $1`, [hotelId, row!.published_at], client);
  await audit({ hotelId, user, action: 'publish', entity: 'publication', entityId: row!.id, summary: `Published version ${row!.version}${note ? ` — ${note}` : ''} (${changes.length} change(s))`, after: summary, ip }, client);
  return { id: row!.id, version: row!.version, published_at: row!.published_at.toISOString(), summary };
}

/** Makes an earlier version live again, as a new version (history is never rewritten). */
export async function republish(client: pg.PoolClient, hotelId: string, publicationId: string, user: SessionUser, ip?: string) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`publish:${hotelId}`]);
  const old = await one<{ version: number; snapshot: ContentSnapshot }>(`SELECT version, snapshot FROM publications WHERE hotel_id = $1 AND id = $2`, [hotelId, publicationId], client);
  if (!old) throw notFound('Version not found');
  const latest = await one<{ id: string }>(`SELECT id FROM publications WHERE hotel_id = $1 ORDER BY version DESC LIMIT 1`, [hotelId], client);
  if (latest?.id === publicationId) throw conflict('This version is already live');
  const next = await one<{ v: number }>(`SELECT MAX(version) + 1 AS v FROM publications WHERE hotel_id = $1`, [hotelId], client);
  const summary = { ...summarize(old.snapshot), restored_from: old.version, note: `Restored version ${old.version}` };
  const row = await one<{ id: string; version: number; published_at: Date }>(
    `INSERT INTO publications (hotel_id, version, snapshot, summary, published_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, version, published_at`,
    [hotelId, next!.v, JSON.stringify(old.snapshot), JSON.stringify(summary), user.id],
    client
  );
  // What is live now differs from the draft: flag it so staff see "unpublished changes".
  await q(
    `UPDATE hotels SET site_published = $2, site_published_at = $3::timestamptz, draft_updated_at = $3::timestamptz + interval '1 millisecond', updated_at = now() WHERE id = $1`,
    [hotelId, JSON.stringify(old.snapshot.site), row!.published_at],
    client
  );
  await audit({ hotelId, user, action: 'publish', entity: 'publication', entityId: row!.id, summary: `Restored version ${old.version} as version ${row!.version}`, ip }, client);
  return { id: row!.id, version: row!.version };
}

/** Existing hotels without any publication get one, so their guest site keeps working. */
export async function ensurePublications(db: Queryable = pool) {
  const missing = await q<{ id: string }>(`SELECT id FROM hotels h WHERE NOT EXISTS (SELECT 1 FROM publications p WHERE p.hotel_id = h.id)`, [], db);
  for (const h of missing) {
    const client = 'release' in db ? (db as pg.PoolClient) : await pool.connect();
    try {
      if (client !== db) await client.query('BEGIN');
      await publishHotel(client, h.id, null, 'Initial publication');
      if (client !== db) await client.query('COMMIT');
    } catch (e) {
      if (client !== db) await client.query('ROLLBACK');
      throw e;
    } finally {
      if (client !== db) client.release();
    }
  }
  return missing.length;
}

// ---------------------------------------------------------------------------
// Operational overlay (applies immediately, never published)
// ---------------------------------------------------------------------------
export interface LiveState {
  is_active: boolean;
  archived: boolean;
  available: boolean | null;
  status_override: string | null;
}

export async function liveStates(hotelId: string, name: EntityName, ids: string[], db: Queryable = pool): Promise<Map<string, LiveState>> {
  if (!ids.length) return new Map();
  const rows = await q<{ id: string; is_active: boolean; archived: boolean; available: boolean | null; status_override: string | null }>(
    `SELECT id, is_active, archived_at IS NOT NULL AS archived, (data->>'available')::boolean AS available, data->>'status_override' AS status_override
       FROM ${ENTITIES[name].table} WHERE hotel_id = $1 AND id = ANY($2::uuid[])`,
    [hotelId, ids],
    db
  );
  return new Map(rows.map((r) => [r.id, r]));
}

/** Applies live availability/status to published records (display). Removed records show as unavailable. */
export async function overlay(hotelId: string, name: EntityName, records: EntityRecord[]): Promise<EntityRecord[]> {
  const fields = ENTITIES[name].fields.map((f) => f.key);
  const hasAvailable = fields.includes('available');
  const hasStatus = fields.includes('status_override');
  if (!hasAvailable && !hasStatus) return records;
  const live = await liveStates(hotelId, name, records.map((r) => r.id));
  return records.map((r) => {
    const s = live.get(r.id);
    const gone = !s || !s.is_active || s.archived;
    const out: EntityRecord = { ...r };
    if (hasAvailable) out.available = gone ? false : s!.available ?? r.available;
    if (hasStatus) out.status_override = gone ? 'closed' : s!.status_override ?? r.status_override;
    return out;
  });
}
