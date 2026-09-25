# Security

This file describes how security is implemented, how it was verified, and what risk remains. Every control listed has a test named next to it, or is visible in the code referenced.

## 1. Authentication

| Control | Implementation | Verified by |
|---|---|---|
| Password storage | scrypt with a per-user salt; self-describing hash `scrypt$N$r$p$salt$hash` (`server/security.ts`) | `auth-rbac.test.ts` |
| Brute force | The account locks for 15 minutes after 8 failed logins. The shared limiter allows 10 attempts per account and 100 per IP per 15 minutes; the IP ceiling is high because a hotel office shares one IP. | `auth-rbac.test.ts`, `ops.test.ts` |
| User enumeration | Unknown emails are hashed against a dummy hash, so both paths take the same time | code: `routes/auth.ts` |
| Sessions | A random token in a cookie (httpOnly, SameSite=Lax, Secure in production). Only the token's SHA-256 is stored server-side. Sessions expire after `SESSION_DAYS`, and expired ones are purged hourly by the job runner. | `auth-rbac.test.ts` |
| CSRF | Every mutating request needs the `x-requested-with: hub` header, and its `Origin` must equal `PUBLIC_ORIGIN` or the request host | `auth-rbac.test.ts` |
| Guests | No accounts. Each device holds a random token (≥ 24 characters); only its hash is stored. A guest can only read requests created with their own token. | `tenancy.test.ts`, `requests.test.ts` |

## 2. Authorisation and tenant isolation

- **Server-side only.** Every admin route calls `requireHotelAccess(hotel, module)`. The UI hides navigation, but that is convenience, not security.
- **Hotel scope.** A hotel outside the user's scope returns **404** (not 403), so hotel ids cannot be probed.
- **Record scope.** Every record lookup filters on `hotel_id` as well as `id`.
- **Finance.** Finance access is a separate per-hotel setting (`NONE` / `SETTLEMENTS` / `FULL`), and platform roles are the only cross-hotel readers.
- **Department scope.** Department roles see only their departments' requests (`departmentScope`).

**Cross-tenant attack suite (`tests/api/tenancy.test.ts`).** Hotel B's own admin, even with FULL finance access, attacks all **31** routes that take a hotel plus a record id. It uses hotel A's ids, both through hotel B's path (the IDOR shape) and through hotel A's path.
- Every attempt is refused.
- Hotel A's rows in 14 tables are fingerprinted (md5) before and after, and are unchanged.
- Refusals are checked so they do not echo hotel A's data.
- List endpoints never contain hotel A ids.
- Cross-hotel parent references are rejected.
- A guest of hotel B cannot order hotel A items or read hotel A requests.

**Per-role matrix (`e2e/06-admin-language-permissions.spec.ts`).** For each of the 9 hotel roles it checks the exact navigation, that a denied screen is refused, and that the server returns 403 on the same data.

**Action audit (`e2e/90-action-audit.spec.ts`).** It fails if any visible control leads to a 403.

## 3. Financial controls

- **Server-side pricing.** Totals are computed on the server from database prices, modifiers and VAT, in integer minor units. Client-sent prices are ignored (`requests.test.ts`).
- **Immutable history.** Financial snapshots and ledger entries are protected by database triggers. Corrections are posted as adjustments (`commerce.test.ts`).
- **Maker–checker.** The approver of a settlement must differ from its creator and reviewer (409 `four_eyes`). The hotel acknowledges once, and platform staff cannot acknowledge on the hotel's behalf (`concurrency.test.ts`).
- **Idempotency.** Checkout carries an `Idempotency-Key`, and a unique index enforces one order per key and device, including under 10 simultaneous submits (`concurrency.test.ts`).
- **Serialised settlements.** Settlement creation takes a per-hotel advisory lock. The race was demonstrated without the lock (duplicate created) and fixed with it.
- **Document numbers.** They are unique per hotel (migration 006), and numbers that are already taken are skipped (`finance-codes.test.ts`).

## 4. Input handling

- **Validation.** Every body and query is validated with zod schemas that bound lengths, enums, UUIDs and numbers.
- **SQL.** All SQL is parameterised. Table and column names come only from fixed maps (`ENTITIES`, `NUMBERED`), never from input.
- **Uploads.**
  - Size limits: `MAX_UPLOAD_MB` for staff, 5 MB for guests.
  - Type is sniffed from content, not the extension.
  - Raster images are re-encoded (EXIF stripped).
  - SVGs are checked for scripts and external references, and served with a sandboxing CSP.
  - Storage keys are confined to `<hotel uuid>/<file>` (`storage.test.ts`).
- **Excel imports.** Imports are limited to 8 MB and 5,000 rows per sheet. They go through staged preview, row-level errors and a transactional commit.
- **Outbound fetches.** Logo URLs and import image URLs go through `safeFetch`: private and link-local addresses are blocked (SSRF), with size and time limits.
- **XSS.** React escapes output. The CSP is `script-src 'self'` with no inline scripts, and `object-src 'none'`; frames are limited to video embeds.
- **CORS.** None is configured, so the API is same-origin only.

## 5. Abuse and rate limiting

- **Shared store.** Limits live in PostgreSQL (the `rate_limits` table), so every replica sees the same counters.
- **No raw identifiers stored.** Keys are SHA-256 hashes, so no IPs or tokens are stored.
- **Hotel Wi-Fi aware.** The tight limit is per guest device. The per hotel+IP limit is a high ceiling, because a whole hotel often shares one NAT IP. This was verified with 20 guests on one IP ordering while a spamming device was throttled (`ops.test.ts`).

| Endpoint | Per device | Per hotel + IP |
|---|---|---|
| Order / request | 15 / 10 min | 600 / 10 min |
| Identification | 20 / 10 min | 1,000 / 10 min |
| Analytics events | 300 / 10 min | 5,000 / 10 min |
| Reviews | 3 / h | 60 / h |
| Guest uploads | 5 / h | 100 / h |
| Staff login | 10 / 15 min per account | 100 / 15 min per IP |

## 6. Secrets and privacy

- **No secrets in the repository.** `.env*` files are ignored (except `.env.example`).
- **No secrets in the client bundle.** The built client was checked for `DATABASE_URL`, secret keys, password hashes and `postgres://`, with no matches.
- **Private numbers.** WhatsApp numbers and routing stay server-side; the guest bundle exposes only `has_whatsapp` flags (`auth-rbac.test.ts`).
- **Logs.** Logs are structured JSON with a request id. They record the path only (no query string), and never bodies, passwords, tokens or guest names/phones.
- **Analytics.** Analytics are daily aggregate counters only, with no guest, device, IP or session.
- **Data collected.** No passport, ID or card data is collected.
- **Retention.** Retention anonymisation is opt-in (`RETENTION_JOB=1`) and applies only to hotels with a retention period.

## 7. Dependencies

`npm audit --omit=dev` reported **0 vulnerabilities** at the time of this audit.

## 8. Residual risks and recommendations

1. **Compressed spreadsheets.** A highly compressed `.xlsx` (a "zip bomb") within 8 MB could expand in memory. Exposure is limited to authenticated users with the import module. A future improvement is to check the uncompressed size from the zip directory before parsing.
2. **Short caches across replicas.** The public bundle and hotel-row caches are per replica. After an admin change, *other* replicas can serve the previous version for up to 10 s (bundle) or 5 s (row). Ordering always re-validates availability and prices, so money is never affected.
3. **No second factor** for staff logins yet. Recommended for platform roles (SUPER_ADMIN, PLATFORM_FINANCE) before scaling the operator team.
4. **Rate limits fail open** if the database is unreachable. This is deliberate: during a database outage requests fail anyway, and the limiter must not add an outage of its own.
