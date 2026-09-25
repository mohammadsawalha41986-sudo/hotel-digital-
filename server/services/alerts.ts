import type pg from 'pg';
import { pool } from '../db';
import { readiness } from '../health';
import { log } from '../log';
import { cpuPercent5m, metricsSnapshot, recentCounts } from '../metrics';

/**
 * Operational alerts. Each alert has a stable key, a measured value and the
 * threshold from docs/SCALING.md §5. Two sources:
 *
 *  - process alerts (this replica/worker): readiness, p95 latency, 5xx rate,
 *    request rate, sustained CPU — evaluated every minute by every process;
 *  - platform alerts (database-wide): connection pressure, failed jobs,
 *    ledger/settlement integrity — evaluated once platform-wide by the
 *    `integrity_watch` job.
 *
 * State changes are written as structured log lines (`alert.firing` at error
 * level, `alert.resolved` at info) so the hosting platform's log alerts or a
 * log drain can notify someone. No hotel names, guest data or amounts are
 * logged — only keys, counts and ids.
 */
export interface Alert {
  key: string;
  severity: 'critical' | 'warning';
  value: number | string;
  threshold: number | string;
  message: string;
}

export const THRESHOLDS = {
  p95_ms: Number(process.env.ALERT_P95_MS ?? 150),
  cpu_pct: Number(process.env.ALERT_CPU_PCT ?? 60),
  rps_per_process: Number(process.env.ALERT_RPS ?? 400),
  error_rate_pct: Number(process.env.ALERT_5XX_PCT ?? 1),
  min_errors: 5,
  db_connections_pct: 70,
};

export async function processAlerts(): Promise<Alert[]> {
  const out: Alert[] = [];
  const ready = await readiness();
  if (!ready.checks.database.ok) out.push({ key: 'readiness.database', severity: 'critical', value: ready.checks.database.error ?? 'failed', threshold: 'ok', message: 'Database unreachable from this replica' });
  if (!ready.checks.storage.ok) out.push({ key: 'readiness.storage', severity: 'critical', value: ready.checks.storage.error ?? 'failed', threshold: 'ok', message: 'Media storage unreachable' });
  const m = metricsSnapshot();
  const recent = recentCounts(300);
  if (m.latency_ms.window >= 200 && (m.latency_ms.p95 ?? 0) > THRESHOLDS.p95_ms) {
    out.push({ key: 'latency.p95', severity: 'warning', value: m.latency_ms.p95!, threshold: THRESHOLDS.p95_ms, message: 'p95 latency above target' });
  }
  const errPct = recent.requests ? (recent.errors_5xx / recent.requests) * 100 : 0;
  if (recent.errors_5xx >= THRESHOLDS.min_errors && errPct > THRESHOLDS.error_rate_pct) {
    out.push({ key: 'errors.5xx_rate', severity: 'critical', value: +errPct.toFixed(2), threshold: THRESHOLDS.error_rate_pct, message: `${recent.errors_5xx} server errors in 5 minutes` });
  }
  if (recent.rps > THRESHOLDS.rps_per_process) {
    out.push({ key: 'load.rps', severity: 'warning', value: recent.rps, threshold: THRESHOLDS.rps_per_process, message: 'Request rate per process above the planning threshold — add capacity' });
  }
  const cpu = cpuPercent5m();
  if (cpu != null && cpu > THRESHOLDS.cpu_pct) {
    out.push({ key: 'load.cpu', severity: 'warning', value: cpu, threshold: THRESHOLDS.cpu_pct, message: 'Sustained CPU above 60 % (5-minute average)' });
  }
  return out;
}

/** Database-wide checks, including financial integrity. */
export async function platformAlerts(db: pg.PoolClient | typeof pool = pool): Promise<{ alerts: Alert[]; checks: Record<string, number> }> {
  const { rows } = await db.query<Record<string, number>>(
    `SELECT
       (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database())::int AS db_connections,
       (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS db_max_connections,
       (SELECT COUNT(*) FROM job_runs WHERE status = 'FAILED' AND started_at > now() - interval '24 hours')::int AS job_failures_24h,
       -- Commercial orders completed over an hour ago without a commission decision.
       (SELECT COUNT(*) FROM requests WHERE is_commercial AND status = 'COMPLETED' AND financial_status = 'AWAITING_ELIGIBILITY' AND completed_at < now() - interval '1 hour')::int AS completed_without_ledger,
       -- A ledger entry whose amounts differ from its locked snapshot.
       (SELECT COUNT(*) FROM commission_ledger l JOIN financial_snapshots s ON s.id = l.snapshot_id
         WHERE l.entry_type = 'COMMISSION' AND (l.commission_minor <> s.commission_minor OR l.gross_minor <> s.gross_minor))::int AS ledger_snapshot_mismatch,
       -- More than one commission entry for the same order (the unique index should make this impossible).
       (SELECT COUNT(*) FROM (SELECT request_id FROM commission_ledger WHERE entry_type = 'COMMISSION' GROUP BY 1 HAVING COUNT(*) > 1) d)::int AS duplicate_commission,
       -- A live settlement whose header differs from the sum of its lines.
       (SELECT COUNT(*) FROM settlements s WHERE s.status <> 'VOID'
          AND s.commission_minor <> COALESCE((SELECT SUM(commission_minor) FROM settlement_lines WHERE settlement_id = s.id), 0))::int AS settlement_header_mismatch,
       -- A settlement line that no longer matches its ledger entry.
       (SELECT COUNT(*) FROM settlement_lines sl JOIN commission_ledger l ON l.id = sl.ledger_entry_id JOIN settlements s ON s.id = sl.settlement_id
         WHERE s.status <> 'VOID' AND l.commission_minor <> sl.commission_minor)::int AS settlement_line_mismatch`
  );
  const c = rows[0];
  const alerts: Alert[] = [];
  const connPct = (c.db_connections / Math.max(1, c.db_max_connections)) * 100;
  if (connPct > THRESHOLDS.db_connections_pct) alerts.push({ key: 'db.connections', severity: 'warning', value: Math.round(connPct), threshold: THRESHOLDS.db_connections_pct, message: `${c.db_connections}/${c.db_max_connections} connections in use` });
  if (c.job_failures_24h > 0) alerts.push({ key: 'jobs.failed', severity: 'warning', value: c.job_failures_24h, threshold: 0, message: 'Background job failures in the last 24 h' });
  for (const k of ['completed_without_ledger', 'ledger_snapshot_mismatch', 'duplicate_commission', 'settlement_header_mismatch', 'settlement_line_mismatch'] as const) {
    if (c[k] > 0) alerts.push({ key: `finance.${k}`, severity: 'critical', value: c[k], threshold: 0, message: 'Financial integrity check failed — see OPERATIONS.md §1' });
  }
  return { alerts, checks: c };
}

// Transition logging: only changes are logged, so a firing alert is one line, not one per minute.
const firing = new Map<string, Alert>();

export function reportTransitions(scope: string, current: Alert[]) {
  const replica = process.env.RAILWAY_REPLICA_ID ?? String(process.pid);
  const now = new Set(current.map((a) => `${scope}:${a.key}`));
  for (const a of current) {
    const id = `${scope}:${a.key}`;
    if (!firing.has(id)) log.error('alert.firing', { alert: a.key, severity: a.severity, value: a.value, threshold: a.threshold, message: a.message, scope, replica });
    firing.set(id, a);
  }
  for (const [id, a] of firing) {
    if (id.startsWith(`${scope}:`) && !now.has(id)) {
      firing.delete(id);
      log.info('alert.resolved', { alert: a.key, scope, replica });
    }
  }
}

/** Every process checks its own health each minute. Returns a stop function. */
export function startProcessAlerts(everyMs = 60_000): () => void {
  const t = setInterval(() => {
    processAlerts()
      .then((a) => reportTransitions('process', a))
      .catch((e) => log.error('alert.evaluation_failed', { message: (e as Error).message }));
  }, everyMs);
  t.unref();
  return () => clearInterval(t);
}
