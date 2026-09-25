import { pool } from './db';
import { tooMany } from './errors';
import { log } from './log';
import { sha256 } from './security';

/**
 * Shared fixed-window rate limiting, stored in PostgreSQL so every API replica
 * sees the same counters (see migration 005). One round trip checks several
 * limits at once.
 *
 * Design for hotels: many guests share one public IP (hotel Wi-Fi NAT), so the
 * tight limit is always per guest device token; hotel+IP limits are only a
 * generous ceiling against token rotation and never the first thing a busy
 * breakfast service hits.
 */
export interface Limit {
  /** Logical key, e.g. `req-token:<hash>`; stored hashed. */
  key: string;
  limit: number;
  windowMs: number;
}

export const minutes = (n: number) => n * 60_000;

export async function rateLimit(...limits: Limit[]): Promise<void> {
  if (process.env.DISABLE_RATE_LIMIT === '1' || !limits.length) return;
  let rows: { key: string; hits: number }[];
  try {
    const res = await pool.query<{ key: string; hits: number }>(
      `INSERT INTO rate_limits AS r (key, window_start, window_ms, hits)
       SELECT k, now(), w, 1 FROM unnest($1::text[], $2::int[]) AS t(k, w)
       ON CONFLICT (key) DO UPDATE SET
         hits = CASE WHEN r.window_start + make_interval(secs => r.window_ms / 1000.0) <= now() THEN 1 ELSE r.hits + 1 END,
         window_start = CASE WHEN r.window_start + make_interval(secs => r.window_ms / 1000.0) <= now() THEN now() ELSE r.window_start END,
         window_ms = EXCLUDED.window_ms
       RETURNING key, hits`,
      [limits.map((l) => sha256(l.key)), limits.map((l) => l.windowMs)]
    );
    rows = res.rows;
  } catch (err) {
    // Fail open: a limiter hiccup must not take ordering down with it.
    log.warn('rate_limit.unavailable', { message: err instanceof Error ? err.message : String(err) });
    return;
  }
  const hits = new Map(rows.map((r) => [r.key, r.hits]));
  for (const l of limits) {
    if ((hits.get(sha256(l.key)) ?? 0) > l.limit) throw tooMany();
  }
}

/** Drops expired windows; run periodically by the maintenance job. */
export async function pruneRateLimits(): Promise<number> {
  const r = await pool.query(`DELETE FROM rate_limits WHERE window_start < now() - interval '2 hours'`);
  return r.rowCount ?? 0;
}
