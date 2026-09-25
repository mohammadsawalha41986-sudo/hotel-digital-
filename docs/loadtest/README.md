# Load-test results

These files are raw JSON output of `scripts/loadtest.mjs`, run against the production build and the 20-hotel synthetic database from `scripts/synth-hotels.ts`. The method and the interpretation are in [../SCALING.md](../SCALING.md).

| File | Scenario |
|---|---|
| `s1-normal.json` | 20 hotels × (15 guests + 3 staff), one process |
| `s2-breakfast-peak.json` | 20 × (50 + 4), 25 % of actions are orders, 60 s ramp |
| `s3-qr-burst.json` | S1 plus 3,000 QR arrivals in 60 s |
| `s4-stress-1proc-100.json` / `-150.json` | 2,080 / 3,080 very active users on one process (the knee, then saturation) |
| `s4-stress-3workers-150.json` | 3,080 users with `WEB_CONCURRENCY=3` |
| `s5-financial-flow.json` | Orders worked through to completion (commission path) |
| `financial-integrity.txt` | Ledger and order consistency after all runs |
| `top-queries.txt` | `pg_stat_statements`, top queries by total time |

To reproduce:

```
createdb hotelhub_load
DATABASE_URL=postgres://…/hotelhub_load npx tsx scripts/synth-hotels.ts --hotels 20 --days 90 --orders 120
npm run build
NODE_ENV=production DATABASE_URL=… PORT=8095 TRUST_PROXY=1 PUBLIC_ORIGIN=http://127.0.0.1:8095 node dist/server/index.js
node scripts/loadtest.mjs --hotels 20 --guests 50 --staff 4 --duration 240 --ramp 60 --order-share 0.25 --ip-mode guest --pid <server pid> --db postgres://…/hotelhub_load
```
