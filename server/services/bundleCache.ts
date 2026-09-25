import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

/**
 * Short-lived cache of the serialised public bundle, per hotel (the key is the
 * hotel id — never shared across tenants). A QR rush sends hundreds of guests
 * to the same hotel within seconds; building the bundle costs ~17 queries, so
 * each replica builds it at most once per TTL and serves the same
 * pre-compressed bytes (with an ETag for 304s) to everyone else.
 *
 * Staleness is bounded by the TTL: an availability toggle reaches guests within
 * seconds, and ordering re-validates availability and prices server-side, so a
 * stale bundle can never sell something that is off. Publishing clears the
 * entry on the replica that published; other replicas refresh within the TTL.
 */
export interface CachedBundle {
  json: string;
  gzip: Buffer;
  etag: string;
  at: number;
}

const TTL_MS = Number(process.env.BUNDLE_CACHE_MS ?? 10_000);
const MAX_ENTRIES = 500;
const entries = new Map<string, CachedBundle>();
const inflight = new Map<string, Promise<CachedBundle>>();

export async function cachedBundle(hotelId: string, build: () => Promise<unknown>): Promise<CachedBundle> {
  const hit = entries.get(hotelId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  // Coalesce concurrent misses: one build per hotel, everyone awaits it.
  const pending = inflight.get(hotelId);
  if (pending) return pending;
  const p = (async () => {
    const json = JSON.stringify(await build());
    const entry = { json, gzip: gzipSync(json), etag: `"${createHash('sha1').update(json).digest('base64url')}"`, at: Date.now() };
    entries.set(hotelId, entry);
    if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
    return entry;
  })().finally(() => inflight.delete(hotelId));
  inflight.set(hotelId, p);
  return p;
}

export function invalidateBundle(hotelId: string) {
  entries.delete(hotelId);
  for (const [slug, v] of rows) if (v.id === hotelId) rows.delete(slug);
}

/**
 * Hotel rows resolved by slug for public routes, kept for a few seconds so a
 * guest rush does not re-read (and re-parse) the hotel's large JSON columns on
 * every call. Keyed by slug; entries are dropped with invalidateBundle. The
 * cached row is shared — callers must treat it as read-only.
 */
const ROW_TTL_MS = Number(process.env.HOTEL_ROW_CACHE_MS ?? 5_000);
const rows = new Map<string, { id: string; row: unknown; at: number }>();

export async function cachedHotelRow<T extends { id: string }>(slug: string, load: () => Promise<T | null>): Promise<T | null> {
  const hit = rows.get(slug);
  if (hit && Date.now() - hit.at < ROW_TTL_MS) return hit.row as T;
  const row = await load();
  if (row) {
    rows.set(slug, { id: row.id, row, at: Date.now() });
    if (rows.size > MAX_ENTRIES) rows.delete(rows.keys().next().value!);
  } else rows.delete(slug);
  return row;
}

/** Drops every cached bundle and hotel row (tests that write SQL directly). */
export function clearPublicCaches() {
  entries.clear();
  rows.clear();
}
