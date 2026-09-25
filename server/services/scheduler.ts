import { audit } from '../audit';
import { q, tx } from '../db';
import { log } from '../log';
import { pruneRateLimits } from '../rateLimit';
import { applyRetention } from './guests';

/**
 * Background jobs that run inside the API process, safely with any number of
 * replicas. Each tick, every replica asks the database "is this job due?"
 * under a transaction advisory lock; the first one to see it due records a run
 * in job_runs and does the work, the others skip. So each job runs at most
 * once per interval platform-wide, a crashed replica just hands the next tick
 * to another, and every run is visible in job_runs (and /api/admin/platform/ops).
 *
 * Financial correctness never depends on these jobs: they only prune caches,
 * expire sessions and apply the opt-in retention policy.
 */
export interface Job {
  name: string;
  everyMs: number;
  enabled: () => boolean;
  run: (client: import('pg').PoolClient) => Promise<Record<string, unknown>>;
}

const MINUTE = 60_000;

export const JOBS: Job[] = [
  {
    name: 'rate_limit_prune',
    everyMs: 10 * MINUTE,
    enabled: () => true,
    run: async () => ({ removed: await pruneRateLimits() }),
  },
  {
    name: 'session_expiry',
    everyMs: 60 * MINUTE,
    enabled: () => true,
    run: async (client) => {
      const r = await client.query(`DELETE FROM sessions WHERE expires_at < now()`);
      return { removed: r.rowCount ?? 0 };
    },
  },
  {
    // Destructive (anonymises guest profiles), so opt-in per environment and,
    // within it, only for hotels that configured a retention period.
    name: 'guest_retention',
    everyMs: 24 * 60 * MINUTE,
    enabled: () => process.env.RETENTION_JOB === '1',
    run: async (client) => {
      const n = await applyRetention(client);
      if (n) await audit({ hotelId: null, user: null, action: 'retention', entity: 'guest', summary: `Scheduled retention anonymised ${n} guest profile(s)` }, client);
      return { anonymized: n };
    },
  },
];

const lockKey = (name: string) => `job:${name}`;

/**
 * Runs `job` if it is due. Returns null when another replica holds it or it
 * ran recently; otherwise the job's result.
 */
export async function runJobIfDue(job: Job, force = false): Promise<Record<string, unknown> | null> {
  return tx(async (client) => {
    const { rows } = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_xact_lock(hashtext($1)) AS ok', [lockKey(job.name)]);
    if (!rows[0]?.ok) return null;
    if (!force) {
      const last = await client.query(`SELECT 1 FROM job_runs WHERE job = $1 AND status = 'OK' AND started_at > now() - make_interval(secs => $2::double precision / 1000) LIMIT 1`, [job.name, job.everyMs]);
      if (last.rowCount) return null;
    }
    // The run row is written by its own connection so a failure is still recorded.
    const run = await q<{ id: number }>(`INSERT INTO job_runs (job) VALUES ($1) RETURNING id`, [job.name]);
    const id = run[0].id;
    const t0 = Date.now();
    try {
      await client.query('SAVEPOINT job');
      const detail = await job.run(client);
      await q(`UPDATE job_runs SET status = 'OK', finished_at = now(), detail = $2 WHERE id = $1`, [id, JSON.stringify({ ...detail, ms: Date.now() - t0 })]);
      log.info('job.ok', { job: job.name, ms: Date.now() - t0, ...detail });
      return detail;
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT job').catch(() => undefined);
      const message = err instanceof Error ? err.message : String(err);
      await q(`UPDATE job_runs SET status = 'FAILED', finished_at = now(), error = $2 WHERE id = $1`, [id, message.slice(0, 500)]).catch(() => undefined);
      log.error('job.failed', { job: job.name, message });
      return { error: message };
    }
  });
}

/** Starts the periodic tick. Returns a stop function (used on shutdown). */
export function startJobs(tickMs = MINUTE): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      for (const job of JOBS) if (job.enabled()) await runJobIfDue(job).catch((e) => log.error('job.tick_failed', { job: job.name, message: (e as Error).message }));
    } finally {
      running = false;
    }
  };
  // Stagger the first tick so a fleet restarting together does not stampede.
  const first = setTimeout(tick, 20_000 + Math.random() * 20_000);
  const every = setInterval(tick, tickMs);
  first.unref();
  every.unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}

/** Kept for the retention API test and the manual platform endpoint. */
export async function runRetentionOnce(): Promise<number | null> {
  const r = await runJobIfDue(JOBS.find((j) => j.name === 'guest_retention')!, true);
  return r === null ? null : Number(r.anonymized ?? 0);
}

/** Recent runs per job, for the operations view. */
export async function jobStatus() {
  return q(
    `SELECT DISTINCT ON (job) job, started_at, finished_at, status, detail, error,
            (SELECT COUNT(*) FROM job_runs f WHERE f.job = j.job AND f.status = 'FAILED' AND f.started_at > now() - interval '24 hours') AS failures_24h
       FROM job_runs j ORDER BY job, started_at DESC`
  );
}

