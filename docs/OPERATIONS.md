# Operations runbook

This runbook is for whoever runs the platform day to day. The commands assume the production build (`npm run build`).

## 1. Health

| Endpoint | Meaning | Use |
|---|---|---|
| `GET /api/health` | Liveness: the process is up. No dependencies are checked, so it does not flap on a database blip. | Restart decisions |
| `GET /api/ready` | Readiness: the database answered `SELECT 1` within 2 s, media storage is reachable (probed at most every 30 s), and the process is not draining. Returns 503 otherwise, with a `checks` object explaining why. | Platform health check (routing traffic) |
| `GET /api/admin/platform/ops` (Super Admin) | This replica's readiness, request metrics (p50/p95/p99, 5xx, 429), background jobs, and business signals | Dashboards, incident triage |

Business signals on `/ops`, with the action for each:

| Signal | Meaning | Action |
|---|---|---|
| `orders_unaccepted_30min` | Guests are waiting | Call the hotel; check the department's WhatsApp number |
| `completed_without_ledger` | Commercial orders completed over an hour ago with no commission entry | Open the order in Platform → Orders and use *Re-evaluate*. A missing commission rule shows as `RULE_UNAVAILABLE`. |
| `settlements_unacknowledged_7d` | Hotel finance has not confirmed an approved statement | Follow up with the hotel |
| `job_failures_24h` | A background job failed | See `jobs[].error`; each job is retried on the next tick |
| `db_connections` / `db_max_connections` | Connection budget | Keep under 70 % (see SCALING.md) |

Every response carries `X-Request-Id`, and every error body includes `request_id`. Search the logs for that id to see the request, its status and duration. Logs are JSON, one line per event: `{"t","level","event",…}`.

## 1a. Alerts

The application evaluates the signals below and writes **one structured log line per state change**: `alert.firing` (level `error`) when an alert starts, and `alert.resolved` (level `info`) when it clears. Point the hosting platform's log alerting or a log drain at `event = "alert.firing"`.

| Alert key | Scope | Fires when | Evaluated by |
|---|---|---|---|
| `readiness.database` / `readiness.storage` | Replica | The DB (2 s) or media storage is unreachable | Every process, each minute |
| `latency.p95` | Replica | p95 > 150 ms (at least 200 samples) | Every process, each minute |
| `errors.5xx_rate` | Replica | ≥ 5 server errors **and** > 1 % of requests in 5 min | Every process, each minute |
| `load.rps` | Replica | > 400 req/s averaged over 5 min | Every process, each minute |
| `load.cpu` | Replica | > 60 % CPU averaged over 5 min | Every process, each minute |
| `db.connections` | Platform | > 70 % of `max_connections` | `integrity_watch` job, every 15 min, once platform-wide |
| `jobs.failed` | Platform | Any failed background job in 24 h | `integrity_watch` |
| `finance.completed_without_ledger` | Platform | A commercial order completed over 1 h ago with no commission decision | `integrity_watch` |
| `finance.ledger_snapshot_mismatch` | Platform | A ledger entry differs from its locked snapshot | `integrity_watch` |
| `finance.duplicate_commission` | Platform | More than one commission entry for an order | `integrity_watch` |
| `finance.settlement_header_mismatch` / `finance.settlement_line_mismatch` | Platform | A settlement no longer equals its lines or ledger entries | `integrity_watch` |

- Thresholds can be tuned with `ALERT_P95_MS`, `ALERT_CPU_PCT`, `ALERT_RPS` and `ALERT_5XX_PCT`.
- **Per hotel:** `/api/admin/platform/ops` (Super Admin only) lists every hotel's orders in the last hour, orders unaccepted after 30 min, open orders, and this process's requests and 5xx for that hotel. Hotel staff never see other hotels. Alert logs contain keys and counts only, never hotel names, guest data or amounts.
- **Platform-level alerts** that the application cannot observe need Railway: deployment failed/crashed/OOM (webhook), and backup failure. See RAILWAY.md §4.

## 2. Deploying

The same steps apply to every environment:

1. **Build:** `npm run build`, which runs the typecheck, the client build and the server bundle.
2. **Pre-deploy:** `npm run release`, which applies pending migrations under an advisory lock and ensures an initial publication. It runs once per deploy, before new instances start. In staging it can also seed demo or synthetic data (see RAILWAY.md). That can never happen in a Railway environment named `production`.
3. **Start:** `npm start`. Instances boot with `SKIP_MIGRATIONS=1`, since migrations already ran in step 2.
4. **Health gate:** the platform waits for `/api/ready` to return 200 before routing traffic.
5. **Old instances:** they receive SIGTERM, report not-ready, finish in-flight requests (`SHUTDOWN_GRACE_MS`, default 5 s), then exit. An order being written completes or rolls back; it is never half-written (`failure.test.ts`).

**Migrations must be backward compatible with the running version (expand → migrate → verify → contract):**
- **Expand:** add columns, tables or indexes (nullable or defaulted), and deploy code that writes both shapes.
- **Migrate:** backfill in batches.
- **Verify:** confirm the backfill is correct.
- **Contract:** only in a later release, remove what the old code needed.
- Never drop or rename a column the previous release reads, in the same deploy.

## 3. Rolling back

- **Application:** redeploy the previous successful deployment (Railway → Deployments → *Redeploy*, or `list-deployments` / `redeploy`). Because migrations are additive (expand phase), the previous code runs on the newer schema.
- **Data:** never roll back by restoring a backup over live data unless data was corrupted (see BACKUP-RECOVERY.md). Financial history is append-only by design; corrections are adjustments.
- **One content change:** use Publishing history → *Restore* for a single hotel. It republishes an earlier version as a new version.

## 4. Routine tasks

| Task | How |
|---|---|
| Create a platform admin | `node dist/server/cli.js create-admin --email … --name … --role SUPER_ADMIN --password …` |
| Onboard a hotel | Super Admin → Hotels → *New hotel*; then logo, theme, departments, content (or the Excel master workbook), publish, commission agreement, QR codes. No code change is needed. |
| Monthly settlements | Platform → Settlements → *New*. One person prepares and reviews, a different person approves, the hotel acknowledges, then *Mark settled* with the payment reference. |
| Guest data retention | Set the period per hotel (Agreements → hotel), then enable `RETENTION_JOB=1` once backups are verified. The job runs daily, once platform-wide. |
| Anonymise a guest on request | Guests → profile → *Anonymise* (Hotel Admin), with a reason; the action is audited. |

## 5. Background jobs

All jobs run inside the API process on every replica. A job runs at most once per interval platform-wide (advisory lock plus the `job_runs` table). Every run is recorded with status, duration, detail and error.

| Job | Interval | Effect |
|---|---|---|
| `rate_limit_prune` | 10 min | Deletes expired rate-limit windows |
| `session_expiry` | 1 h | Deletes expired staff sessions |
| `guest_retention` | 24 h, only with `RETENTION_JOB=1` | Anonymises inactive guests of hotels that set a retention period |

Set `JOBS_DISABLED=1` to stop the jobs on an instance (for example a one-off debugging instance).

## 6. Incidents

| Symptom | First checks |
|---|---|
| `/api/ready` 503, `database` failing | Postgres service status and connection count (`/ops` → `signals.db_connections`). The pool reconnects automatically once the database is back (`failure.test.ts`). |
| p95 latency rising | `/ops` → `metrics.latency_ms`. Also check CPU per replica: one Node process saturates near 700 req/s (SCALING.md). Add a replica or raise `WEB_CONCURRENCY` on a larger instance. |
| Many 429 responses | `/ops` → `metrics.rate_limited`. A single hotel hitting the hotel+IP ceiling means more than 600 orders per 10 minutes from one IP; check for abuse before raising it. |
| Images missing | `/api/ready` → `checks.storage`. The media route returns 503 (not 404) when storage is unreachable. |
| Orders not reaching WhatsApp | Departments & WhatsApp: the department's number. Orders always land in the Requests queue regardless. |
