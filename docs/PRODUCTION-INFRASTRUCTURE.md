# Production infrastructure

## 1. Target topology (20 hotels at launch, designed to pass 50–100 hotels)

```
                    ┌──────────────── Railway project (region ams) ────────────────┐
 guests (QR) ─┐     │                                                              │
 staff ───────┼──▶  │  hotel-digital-  (API + guest site + admin, stateless)       │
              │     │   replicas: 2 × (1 vCPU, 1 GB)   WEB_CONCURRENCY=1           │
              │     │   health: /api/ready   pre-deploy: npm run release         │
              │     │        │                               │                     │
              │     │        ▼ private network               ▼ S3 API              │
              │     │   Postgres 16 (volume, backups)     Bucket (media)           │
              │     └──────────────────────────────────────────────────────────────┘
```

- **API.** One stateless service serves the API, the built guest site and admin, and `/media`.
- **State.** All shared state lives in Postgres (data, sessions, rate limits, idempotency, job runs, locks) or in the bucket (media).
- **No Redis, queue or worker service.** The measurements justified none of them (SCALING.md §7–9).

## 2. Resources (from measurements)

| Component | Size | Why |
|---|---|---|
| API | 2 replicas × 1 vCPU / 1 GB | 20 hotels at breakfast peak use 48 % of one vCPU and 318 MB RSS. Two replicas give failover plus 2× headroom. |
| Postgres | 1 vCPU / 1–2 GB RAM, 5 GB volume | Hot queries are under 1 ms; at most 8 connections were active per process. 20 hotels grow about 1.4 GB/year at 120 orders per hotel per day. |
| Bucket | Pay per GB (about $0.015/GB-month) | Optimised WebP images with 400/800/1600 variants |
| Connections | 2 × 10 = 20 of 100 | See SCALING.md §6 |

**Scale-up path:**
1. Add replicas (horizontal; verified replica-safe).
2. Give each replica more vCPU and set `WEB_CONCURRENCY` to match.
3. Scale the Postgres instance.
4. Add PgBouncer past about 60 connections.

Thresholds are in SCALING.md §5.

## 3. Environment variables

| Variable | Required | Production value | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | `${{Postgres.DATABASE_URL}}` | Private network |
| `NODE_ENV` | yes | `production` | Enables secure cookies and trusts the proxy |
| `PUBLIC_ORIGIN` | yes | `https://<domain>` | CSRF origin check and QR links |
| `TRUST_PROXY` | – | `1` (default in production) | Client IP from `X-Forwarded-For` |
| `SKIP_MIGRATIONS` | recommended | `1` | Migrations run in the release step |
| `STORAGE_DRIVER` | yes (more than one replica) | `s3` | `local` is for a single instance only |
| `BUCKET`, `ENDPOINT`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `REGION` | with s3 | Bucket references | `S3_*` aliases are also accepted; `S3_PATH_STYLE=1` for older buckets |
| `DB_POOL_MAX` | – | `10` | Per process |
| `DB_CONNECT_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS` | – | `5000`, `30000` | |
| `DATABASE_SSL` | – | unset (private network) | `1` for external managed Postgres |
| `WEB_CONCURRENCY` | – | `1` per vCPU | Worker processes per container |
| `SHUTDOWN_GRACE_MS` | – | `5000` | Drain time after SIGTERM |
| `BUNDLE_CACHE_MS`, `HOTEL_ROW_CACHE_MS`, `MEDIA_CACHE_MB` | – | `10000`, `5000`, `64` | Per-replica caches |
| `SESSION_DAYS` | – | `7` | |
| `MAX_UPLOAD_MB` | – | `8` | |
| `DEFAULT_HOTEL_SLUG` | – | first hotel | Served at `/` |
| `LOG_LEVEL` | – | `info` | JSON logs |
| `RETENTION_JOB` | – | **unset** until backups are verified | Destructive (anonymisation), opt-in |
| `JOBS_DISABLED` | – | unset | `1` on debugging instances |
| `ALLOW_SYNTHETIC_DATA`, `RELEASE_SEED_DEMO`, `RELEASE_SYNTH_HOTELS` | **never in production** | — | Staging data; refused where `RAILWAY_ENVIRONMENT_NAME=production` |

Obsolete variables: none. The old service has no variables.

**Secrets** (`DATABASE_URL`, the bucket keys) live only in Railway variables. They are never committed, and never exposed to the client bundle, which was verified.

## 4. Environments

| Environment | Database | Data | Purpose |
|---|---|---|---|
| Development | Local Postgres `hotelhub` | Demo seed | Day-to-day work |
| Test | `hotelhub_test` (API), `hotelhub_e2e` (Playwright) | Recreated per run | CI gates |
| Staging | Separate Railway project | Demo plus 20 synthetic hotels; never real guests | Release rehearsal, load tests, restore rehearsal |
| Production | `prolific-benevolence` / production | Real hotels | Live |

## 5. Deployment and rollback

See OPERATIONS.md §2–3.
- **Deploy:** release (migrate) → start → the `/api/ready` gate → the old instance drains.
- **Roll back:** redeploy the previous deployment; migrations are additive.

## 6. Production-readiness gates

| Gate | Status | Evidence |
|---|---|---|
| Tests green (typecheck, build, API, E2E, crawler) | ✅ | See the final report |
| Tenant isolation | ✅ | `tenancy.test.ts`, E2E 06 and 07 |
| Financial integrity (concurrency, idempotency, snapshots, commission, settlement, acknowledgement) | ✅ | `concurrency.test.ts`, `finance-codes.test.ts`, E2E 07, and the load-run integrity report |
| Migrations reviewed (additive, locked) | ✅ | 005, 006 |
| Load capacity for 20 hotels, measured | ✅ | SCALING.md |
| Failure handling (DB loss, crash, SIGTERM, mid-checkout failure) | ✅ | `failure.test.ts`, load-test fault injection |
| Backup and restore **procedure** tested | ✅ | BACKUP-RECOVERY.md §2 |
| **Production database and backups exist and a restore was rehearsed** | ❌ | Blocked by the Railway plan (RAILWAY.md §2) |
| **Staging deploy on Railway plus in-cluster load test** | ❌ | Blocked by the Railway plan |
| **Environment configured in production** | ❌ | Blocked by the Railway plan |

**The platform is not declared production-ready** until the last three gates pass. Everything they need is scripted in RAILWAY.md §3–4.
