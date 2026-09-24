import { audit } from '../audit';
import { tx } from '../db';
import { log } from '../log';
import { applyRetention } from './guests';

/** Arbitrary but fixed key: only one instance runs the retention job at a time. */
const RETENTION_LOCK = 0x5245_5431; // "RET1"
const DAY_MS = 86_400_000;

/**
 * Runs the configured guest-data retention once. Safe to call from several
 * instances at once: a transaction-scoped advisory lock lets exactly one proceed,
 * and hotels without a retention period are never touched.
 */
export async function runRetentionOnce(): Promise<number | null> {
  return tx(async (client) => {
    const { rows } = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_xact_lock($1) AS ok', [RETENTION_LOCK]);
    if (!rows[0]?.ok) return null;
    const n = await applyRetention(client);
    if (n) await audit({ hotelId: null, user: null, action: 'retention', entity: 'guest', summary: `Scheduled retention anonymised ${n} guest profile(s)` }, client);
    return n;
  });
}

/**
 * Opt-in daily retention job (RETENTION_JOB=1). The first run happens shortly after
 * start so a restarted instance does not wait a full day. Returns a stop function.
 */
export function startRetentionJob(intervalMs = DAY_MS): () => void {
  const run = () =>
    runRetentionOnce()
      .then((n) => n !== null && log.info('retention.run', { anonymized: n }))
      .catch((err) => log.error('retention.failed', { message: err instanceof Error ? err.message : String(err) }));
  const first = setTimeout(run, 60_000);
  const every = setInterval(run, intervalMs);
  first.unref();
  every.unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}
