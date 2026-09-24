import { tooMany } from './errors';

/**
 * Fixed-window in-memory limiter. Adequate for a single instance; replace the
 * store with Redis when running more than one API replica.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  if (process.env.DISABLE_RATE_LIMIT === '1') return;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) throw tooMany();
}

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 60_000).unref();
