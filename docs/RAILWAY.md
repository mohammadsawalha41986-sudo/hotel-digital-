# Railway

## 1. Actual topology (inspected 2026-09-25)

| Project | Environment | Services | Notes |
|---|---|---|---|
| `prolific-benevolence` (19cfa7fd…) | production | `hotel-digital-` (repo `mohammadsawalha41986-sudo/hotel-digital-`, branch **`main`**), region `ams`, 1 replica, Railpack builder | **Not running this platform.** The live deployment is the repository's original "Initial commit" (redeployed 2026-09-24). The two later deploys of `main` (PR #1) **failed**. There are **no variables**, **no database**, **no volume** and **no bucket**. Domain: `hotel-digital-production.up.railway.app` (port 8080). |
| `Digital Menu` (65d206e6…) | production | `digital-menu`, `Postgres`, `Redis` | A different application (repo `digital-menu`). Not used or changed. |
| Four other projects | — | — | Unrelated. Not changed. |

Conclusion: production today holds **no guest, order or financial data** for this platform. Nothing needs migrating, and nothing may be "reseeded".

## 2. Blocker: Railway account plan

Creating the staging project returned: **`Your trial has expired. Please select a plan to continue using Railway.`**

With an expired trial Railway does not allow creating projects, databases, buckets or deployments. This is an account-level purchase that cannot be made automatically.

**What the owner needs to do:**
1. Railway dashboard → workspace **mohammadsawalha41986-sudo's Projects** → *Upgrade / Select plan*. The **Hobby** plan is enough for staging and a small production. **Pro** is recommended for production: it adds more replicas and resources per service, database backups and team seats.
2. Tell the engineer, or re-run the session, to execute §3–§5. Every step below is scripted, reversible and was designed from measurements (SCALING.md).

Separately, the sandbox's network policy blocks `*.up.railway.app`, so deployed services cannot be probed from the engineering sandbox. In-Railway checks go through deployment logs instead. To allow direct probing, add `up.railway.app` to the environment's allowed domains (cloud environment settings → Network access).

## 3. Staging (first)

A separate project, so production is never touched while rehearsing:

1. **Project:** `create-project` with name `hotel-hub-staging` and `defaultEnvironmentName: staging`.
2. **Database:** `deploy-template postgres`.
3. **Media:** `create-bucket` with `region: ams`.
4. **App:** `create-deployment` from repo `mohammadsawalha41986-sudo/hotel-digital-`, branch `claude/trusting-ride-kmoksr`.
5. **Service settings** (`update-service`):
   - build command `npm run build`;
   - start command `npm start`;
   - pre-deploy command `npm run release`;
   - health check path `/api/ready`, timeout 120 s;
   - restart policy `ON_FAILURE`, 10 retries.
6. **Variables** (`set-variables`, service scope):

   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   PUBLIC_ORIGIN=https://<staging domain>
   TRUST_PROXY=1
   SKIP_MIGRATIONS=1
   STORAGE_DRIVER=s3
   BUCKET=${{<bucket>.BUCKET}}
   ENDPOINT=${{<bucket>.ENDPOINT}}
   ACCESS_KEY_ID=${{<bucket>.ACCESS_KEY_ID}}
   SECRET_ACCESS_KEY=${{<bucket>.SECRET_ACCESS_KEY}}
   REGION=${{<bucket>.REGION}}
   DB_POOL_MAX=10
   WEB_CONCURRENCY=1
   LOG_LEVEL=info
   # staging only:
   ALLOW_SYNTHETIC_DATA=1
   RELEASE_SEED_DEMO=1
   RELEASE_SYNTH_HOTELS=20
   ```

7. **In-cluster load test:** add a second service from the same repo with start command

   ```
   node scripts/loadtest.mjs --base http://<app>.railway.internal:8080 --hotels 20 --guests 50 --staff 4 --duration 240 --ramp 60 --order-share 0.25 --ip-mode guest
   ```

   Set its restart policy to `NEVER` and read the JSON result from its deployment log (`get-logs`). Compare with SCALING.md, and check CPU and RAM with `get-service-metrics`.
8. **Backup rehearsal:** run a `pg_dump`/`pg_restore` into a scratch Postgres and apply the checks in BACKUP-RECOVERY.md §2.

## 4. Production

Only after every production-readiness gate passes on staging (PRODUCTION-INFRASTRUCTURE.md §6):

1. In `prolific-benevolence` / production:
   - `deploy-template postgres`, in region `ams` like the app;
   - enable volume backups (Pro);
   - `create-bucket` in region `ams`.
2. **Source.** The service deploys `main`. Merge the reviewed branch to `main` through a pull request, the approved repository process. Do not repoint production to a feature branch.
3. **Service settings:** as staging, plus:
   - **replicas: 2** (multi-region config `ams: 2`);
   - 1 vCPU / 1 GB per replica;
   - `WEB_CONCURRENCY=1`;
   - `SHUTDOWN_GRACE_MS=5000`.
4. **Variables:** as staging **without** `ALLOW_SYNTHETIC_DATA`, `RELEASE_SEED_DEMO` or `RELEASE_SYNTH_HOTELS`. Add:
   - `PUBLIC_ORIGIN=https://<production domain>`;
   - `DEFAULT_HOTEL_SLUG=<first hotel>`.
   - Leave `RETENTION_JOB` unset until backups are verified.
5. **First deploy.** The release step creates the schema. Then create the first Super Admin (`node dist/server/cli.js create-admin … --role SUPER_ADMIN`) from a Railway shell. Its password is chosen by the owner, never stored in the repository.
6. **Custom domain.** Add the domain in Railway, then set `PUBLIC_ORIGIN` to it.
7. **Alerts.** `create-webhook` for `Deployment.failed`, `Deployment.crashed` and `Deployment.oom_killed` to the owner's Slack or Discord.

## 5. Record of infrastructure changes

| Date | Change | By |
|---|---|---|
| 2026-09-25 | Inspection only (projects, services, deployments, config). **No changes were made** to any Railway project. Creating the staging project was refused (trial expired). | Engineering session |
| 2026-09-25 (later) | Re-inspected: production unchanged (one service on `main`, no DB, no bucket). Creating the staging project was refused again: "Your trial has expired. Please select a plan to continue using Railway." **No changes were made.** | Engineering session |
