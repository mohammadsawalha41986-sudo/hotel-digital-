# Backup and disaster recovery

## 1. Status

| Item | Status |
|---|---|
| Logical backup and restore procedure | **Tested** on the 20-hotel load database (below) |
| Platform (Railway) automated Postgres backups | **Not verified.** The production project currently has no database, and the Railway account's trial has expired, which blocks creating one (see RAILWAY.md). Railway volume backups need a paid plan; they must be enabled **and a restore rehearsed** before go-live. |
| Media (object storage) | Railway Buckets have no automatic backups (Railway docs, 2026). Keep the logical media sync below. |

Backups are not declared ready because a provider says they are enabled. Readiness means a restore was performed and verified.

## 2. Restore test (performed, non-production)

**Source:** `hotelhub_load` (20 hotels, 306,141 orders, 398,430 order lines, 7,591 ledger entries, 61,040 guests, 69,377 audit entries; 340 MB).

| Step | Command | Result |
|---|---|---|
| Dump | `pg_dump "$DATABASE_URL" -Fc -Z 6 -f backup.dump` | 113 MB in **11 s** |
| Restore into an empty database | `pg_restore -d "$RESTORE_URL" --no-owner -j 4 backup.dump` | **8 s** |
| Verify row counts | Counts of 9 key tables in source vs restore | Identical |
| Verify money | `SUM(commission_minor)` and `md5` over every ledger entry number and amount | Identical (`910fc6c9…`) |
| Verify the app | Boot the production build on the restored DB, then call `/api/ready`, a hotel bundle and a staff login | 200 / 200 / 200 |

**RTO measured** at this size: under a minute for the data. Allow 5–10 minutes end to end, including provisioning and repointing `DATABASE_URL`. **RPO** equals the backup interval (below).

## 3. Backup policy (to apply on the production database)

1. **Platform snapshots:** enable Railway Postgres volume backups at the finest schedule offered (daily, plus weekly retention). Rehearse one restore into a scratch service.
2. **Independent logical backups:** a nightly `pg_dump -Fc`, copied to object storage *outside* the platform account (for example an R2 or S3 bucket owned by the business), kept 30 days daily plus 12 months monthly. Run it from a scheduled job with only a read-only database role and a write-only bucket key.
3. **Media:** a nightly sync of the media bucket to a second bucket (`rclone sync` or `aws s3 sync`).
4. **Before any risky migration:** take an on-demand dump first (`pg_dump -Fc`). Migrations are additive (expand phase), so application rollback needs no data restore.

## 4. Restore procedure (production incident)

1. **Freeze writes.** Scale the API to 0, or set it to maintenance, so no new orders land on a database you are about to replace.
2. **Restore into a new database service.** Never restore over the damaged one; keep it for forensics.
3. **Verify** with the queries in §2: row counts, the ledger checksum and a sample of today's orders.
4. **Repoint** the API's `DATABASE_URL` to the restored database and deploy. The release step applies any newer migrations.
5. **Reconcile** orders placed after the backup point: recover them from the damaged database if readable, or from department WhatsApp messages. Record every manual financial correction as an **adjustment**, never by editing the ledger.
6. **Post-incident:** record the timeline, RPO achieved and data lost (if any) in the audit notes.

## 5. Migration rollback

- **Application:** redeploy the previous release. Migrations up to 006 are additive (new columns, tables, indexes, triggers), and the previous release runs on the newer schema.
- **Schema:** there are no down-migrations. Undoing a schema change is a new forward migration, reviewed like any other.
- **Destructive changes** (drop or rename) are only allowed as a later *contract* release, after the code no longer uses the object, and after a fresh backup.
