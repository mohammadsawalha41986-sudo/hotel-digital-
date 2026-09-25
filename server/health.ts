import { pool } from './db';
import { storage } from './storage';

/**
 * Readiness state. `draining` flips on SIGTERM so the platform stops routing
 * new traffic here while in-flight requests finish.
 */
let draining = false;
export const startDraining = () => {
  draining = true;
};
export const isDraining = () => draining;
/** Tests only. */
export const resetDraining = () => {
  draining = false;
};

// Storage is probed at most every 30 s (a bucket round trip per probe would be wasteful).
let storageCheck = { at: 0, ok: true, error: '' };

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([p, new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error(`timeout after ${ms} ms`)), ms)))]);
  } finally {
    clearTimeout(t);
  }
}

export async function readiness() {
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {};
  const t0 = Date.now();
  try {
    await withTimeout(pool.query('SELECT 1'), 2_000);
    checks.database = { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    checks.database = { ok: false, error: (e as Error).message };
  }
  if (Date.now() - storageCheck.at > 30_000) {
    try {
      await withTimeout(storage.ping(), 3_000);
      storageCheck = { at: Date.now(), ok: true, error: '' };
    } catch (e) {
      storageCheck = { at: Date.now(), ok: false, error: (e as Error).message };
    }
  }
  checks.storage = storageCheck.ok ? { ok: true } : { ok: false, error: storageCheck.error };
  checks.pool = { ok: true, ms: pool.waitingCount };
  const ok = !draining && Object.values(checks).every((c) => c.ok);
  return {
    ok,
    draining,
    checks,
    pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
    uptime_s: Math.round(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  };
}
