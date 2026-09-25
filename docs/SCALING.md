# Scaling and capacity

Everything below was **measured**, not estimated. Raw results are in [`docs/loadtest/`](loadtest/). The tools are:
- `scripts/synth-hotels.ts`: generates the synthetic data;
- `scripts/loadtest.mjs`: drives the load.

## 1. Test setup

**Machine.** A 4-vCPU / 16 GB sandbox shared by PostgreSQL 16, the API and the load generator. The generator competes for the same CPUs, so every figure here is a **conservative lower bound** for a dedicated server.

**Data** (`hotelhub_load`, synthetic only):

| Item | Amount |
|---|---|
| Hotels | 20 |
| Catalogue per hotel | 4 outlets × 5 categories × 8 items, 10 room services, 8 hotel services, 10 spa treatments, 4 offers |
| Staff per hotel | a hotel admin and an F&B user |
| Commission | a 5 % agreement per hotel |
| Order history | 90 days × 120 orders per day per hotel, clustered around breakfast and dinner: 216,000 orders |
| Guests | 30,000 |
| Database size after all runs | 306k orders, 398k order lines, 61k guests, 340 MB |

**Server.** Production build (`NODE_ENV=production`). One Node process represents one 1-vCPU replica. `DB_POOL_MAX=10`.

**Guest behaviour** (per virtual guest):
- First visit: HTML, the JS/CSS assets, the hotel bundle, and identification with room, name and phone.
- Then a loop with 3–8 s think time: menu views (35 %), analytics batches (25 %), orders with an `Idempotency-Key` (15–25 %, where 5 % are retried as if the network dropped), "my requests" (15 %), and bundle refreshes.

**Staff behaviour** (per hotel):
- Poll the live queue every 10 s and the new-request bell every 30 s.
- Load the dashboard every 60 s.
- Move orders NEW → ACCEPTED → IN_PROGRESS → READY → COMPLETED. Completion runs the commission engine.

**Network shape.** With `--ip-mode guest`, every guest has its own address, so pure capacity is measured. The hotel-NAT case (all guests of a hotel on one IP) is verified separately in `ops.test.ts`.

## 2. Results (one process ≈ one vCPU)

| Scenario | Concurrent users | Req/s | p50 | p95 | p99 | Errors | CPU (1 core = 100 %) | Peak RSS | DB connections (max / active) |
|---|---|---|---|---|---|---|---|---|---|
| S1 normal: 20 hotels × (15 guests + 3 staff) | 360 | 106 | 4.8 ms | 16 ms | 28 ms | 0 % | 26 % avg | 303 MB | 11 / 2 |
| S2 breakfast peak: 20 × (50 + 4), 25 % of actions are orders | 1,080 | 243 | 5.0 ms | 22 ms | 45 ms | 0.11 %¹ | 48 % avg | 318 MB | 11 / 4 |
| S3 QR burst: S1 plus 3,000 new guests scanning within 60 s | 360 + 3,000 | 246 | 4.0 ms | 21 ms | 50 ms | 0 % | 40 % avg | 384 MB | 11 / 6 |
| S4 stress: 20 × (100 + 4), 2–5 s think | 2,080 | 562 | 7.8 ms | 62 ms (steady 50) | 233 ms (steady 95) | 0 % | 80 % avg | 480 MB | 11 / 6 |
| S4 saturation: 20 × (150 + 4) | 3,080 | 686 | 424 ms | 2.0 s | 2.8 s | 0 % | 101 % | 588 MB | 11 / 8 |
| Same load, `WEB_CONCURRENCY=3` | 3,080 | 768² | 19 ms | steady 94 ms | steady 156 ms | 0 % | 133 % | 1.1 GB | 31 / 7 |
| S5 financial flow (orders worked to completion) | 360 | 107 | 4.7 ms | 15 ms | 28 ms | 0 % | 23 % avg | — | 11 / 2 |

¹ All errors were 429 from the per-device order limit (15 per 10 min). The synthetic guests order about every 20 s, which real guests never do.
² Limited by the load generator sharing the CPUs, not by the server.

**Order submission** under breakfast peak: p50 11.7 ms, p95 31 ms, p99 65 ms, about 40 orders/s across the 20 hotels. For comparison, a busy 300-room hotel's breakfast rush is a few orders per minute.

**Financial integrity after all runs** (`docs/loadtest/financial-integrity.txt`):
- 91,080 orders created and 7,028 completed, across all 20 hotels.
- 0 completed orders without a ledger entry.
- 0 orders with more than one commission entry.
- 0 commission amounts that differ from 5 % of gross.
- 0 ledger/order total mismatches and 0 line/total mismatches.
- 0 duplicate idempotency keys.

## 3. Where the limits are

1. **Node CPU is the first limit.** One process saturates near **690 req/s**. Past that, latency grows but **nothing fails**: requests queue and still succeed, and no errors were recorded even at 6,080 users. The comfortable operating point is **≤ 550 req/s per vCPU**, which keeps steady-state p95 under 50 ms.
2. **The database is far from its limit.**
   - Every hot query averages under 1 ms (`docs/loadtest/top-queries.txt`).
   - At most 8 connections were active at once, per 10-connection pool.
   - The dashboard aggregates (8–53 ms) run once a minute per staff screen.
3. **Per-hotel order numbering serialises** on one counter row per hotel. The worst case measured was 123 ms under saturation, a theoretical ceiling of about 100 orders/s per hotel. That is far above any real hotel.

Tail-latency fix made during testing:
- **Before:** in a QR rush the hotel bundle (~17 queries plus a fresh gzip per request) took p50 537 ms, because hundreds of guests of the same hotel arrived within seconds.
- **Fix:** the bundle is now cached per hotel for 10 s, coalesced, pre-gzipped and served with an ETag. Hotel rows are cached for 5 s.
- **After:** bundle p50 is 2–16 ms under the same arrivals.

## 4. Capacity for 20 hotels, and beyond

| Measure | Value |
|---|---|
| 20 hotels at breakfast-peak intensity (S2) | 243 req/s = **48 % of one vCPU** |
| One vCPU at the comfortable point | ≈ 550 req/s ≈ **45 hotels** at S2 intensity |
| Recommended production start | **2 replicas × 1 vCPU / 1 GB** (high availability) |
| Capacity of that start with one replica down | ≈ 45 peak hotels on the survivor |
| Capacity of that start with both replicas | ≈ 90 peak hotels |

S2 is deliberately harsh: 50 guests per hotel continuously active every few seconds, for four minutes. So "45 hotels per vCPU" is conservative. **The 20-hotel target is met by a single vCPU at under half load**, and two replicas add failover plus 2× headroom.

## 5. Scaling thresholds and actions

| Signal (from `/api/admin/platform/ops` and Railway metrics) | Threshold | Action |
|---|---|---|
| Replica CPU | > 60 % sustained 15 min | Add a replica, or raise `WEB_CONCURRENCY` on a larger instance |
| p95 latency (`metrics.latency_ms.p95`) | > 150 ms sustained | Same as above |
| Req/s per replica | > 400 at peak | Plan the next replica |
| DB connections | > 70 % of `max_connections` | Lower `DB_POOL_MAX` or add PgBouncer (see §6) |
| DB CPU | > 70 % at peak | Scale the Postgres instance; review `pg_stat_statements` |
| Rate-limit table writes | > 1,000/s | Consider moving the limiter to Redis (see §7) |

## 6. Connection budget

- **Formula:** connections = replicas × `WEB_CONCURRENCY` × `DB_POOL_MAX`, plus one for the release step while it runs.
- **Recommended start:** 2 replicas × 1 × 10 = 20 of Postgres's default 100 `max_connections`.
- **Timeouts** (`server/db.ts`):
  - connect: `DB_CONNECT_TIMEOUT_MS`, 5 s;
  - statement: `DB_STATEMENT_TIMEOUT_MS`, 30 s;
  - idle: 30 s.
  - Migrations lift the statement timeout inside their own transaction.
- **Retries:** none at the query level, by design. A request fails cleanly (500 with a request id). Guests retry checkout with the same idempotency key, so a retry never duplicates. After connections were killed, the pool recovered on the next request (`failure.test.ts`).
- **When to add PgBouncer:** when replicas × pool exceeds about 60 % of `max_connections`, for example beyond 6 replicas at pool 10. Use transaction pooling; the app uses no session-level state apart from transaction-scoped advisory locks. The migration runner's *session* advisory lock must connect to Postgres directly, not through PgBouncer.

## 7. Redis decision: not needed at this scale

| Candidate use | Current solution | Measured cost | Verdict |
|---|---|---|---|
| Rate limiting | PostgreSQL UNLOGGED table, one upsert per public write | 0.07 ms mean, 20k calls per run | Postgres is enough |
| Distributed locks | Postgres advisory locks (settlements, publishing, jobs, migrations) | Transactional, no extra service | Postgres is better, since locks commit with the data |
| Caching | Per-replica, tenant-keyed bundle (10 s) and hotel-row (5 s) caches | Bundle p50 2–16 ms | No shared cache needed; staleness is bounded |
| Queues / jobs | Advisory-locked job runner plus `job_runs` | Jobs take milliseconds | No queue needed |
| Real-time | Polling (staff queue every 10–30 s) | Queue query p50 5–13 ms | See §8 |

Redis would add a service to run, secure, back up and monitor, without fixing any measured problem. Revisit it when rate-limit writes exceed about 1k/s, when there are more than about 8 replicas, or if push-based real-time (SSE/WebSocket) is adopted. Redis must never hold financial state.

## 8. Real-time: polling (evaluated against SSE and WebSocket)

Department screens refresh the queue every 10 s and the bell every 30 s.
- **Cost:** at breakfast peak with 80 staff screens, polling was about 10 req/s, 4 % of load, at p50 ≈ 10 ms.
- **Latency:** an order reaches the department within 10 s, and the WhatsApp message to the department is immediate.
- **Why not SSE or WebSocket yet:** they would need sticky sessions or a pub/sub fan-out across replicas (Redis, or Postgres `LISTEN/NOTIFY` with one listener per replica) and long-lived connection handling through the platform proxy. That is more infrastructure for about 10 s less latency.
- **When to revisit:** if departments need sub-second updates; `LISTEN/NOTIFY` would then be the first step.

## 9. Background work

- **Heavy work stays in the request, for now.** Excel imports are bounded (≤ 8 MB, ≤ 5,000 rows per sheet), parsed and previewed in the request, then committed in one transaction. Import timing at the upper bound has not been load-tested. If a maximum-size import approaches the request timeout, move the commit step to the job runner. The staged-preview design already separates it.
- **Jobs.** Retention, session expiry and rate-limit pruning run in the replica-safe job runner (OPERATIONS.md §5).
- **Money never depends on async work.** Commission is posted in the same transaction as order completion.

## 10. Horizontal-scale checklist (verified)

| Concern | How it works with N replicas | Verified by |
|---|---|---|
| Sessions | Stored in Postgres (hashed tokens) | `auth-rbac.test.ts` |
| Rate limits | Postgres table, shared | `ops.test.ts` |
| Idempotency | Unique index in Postgres | `concurrency.test.ts` (10 simultaneous submits) |
| Settlements, publishing | Advisory locks | `concurrency.test.ts` (deterministic race proof) |
| Jobs | Advisory lock plus `job_runs`; at most once per interval | `ops.test.ts` |
| Migrations | Session advisory lock; run once in the release step | `server/db.ts` |
| Media | S3-compatible bucket (`STORAGE_DRIVER=s3`); local disk only for single-instance development | `storage.test.ts` |
| Caches | Per replica, tenant-keyed, TTL-bounded, dropped on change | `ops.test.ts` |
| Worker crash | The cluster primary restarts it; 1 in-flight request of 5,347 was lost and is covered by the idempotent client retry | Load test, SIGKILL |
| Rolling deploy | Readiness goes 503 on SIGTERM; 5 s drain; exits in 6.5 s with no half-written orders | Load test, SIGTERM |
