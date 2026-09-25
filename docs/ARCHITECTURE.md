# Architecture

Hotel Digital Guest Hub is a multi-hotel platform:

> platform → hotels → branding, content and menus → QR → guest → order or request → hotel department → completion → financial snapshot → platform commission → settlement → hotel acknowledgement → analytics and reports.

Related documents:
- [UX-ARCHITECTURE.md](UX-ARCHITECTURE.md): product and UX
- [COMMERCE.md](COMMERCE.md): money
- [EXCEL.md](EXCEL.md): imports
- [SECURITY.md](SECURITY.md)
- [SCALING.md](SCALING.md)
- [OPERATIONS.md](OPERATIONS.md)
- [PRODUCTION-INFRASTRUCTURE.md](PRODUCTION-INFRASTRUCTURE.md)

## 1. Components

| Layer | Technology | Location |
|---|---|---|
| Guest site (mobile-first, AR/EN, per-hotel theme) | React 18, Vite, Tailwind 4, TanStack Query, motion | `src/guest` |
| Admin console (hotel and platform, AR/EN) | React | `src/admin` |
| API | Node 22, Hono, zod | `server/` |
| Shared domain (schemas, pricing, theme, labels) | TypeScript used by both sides | `shared/` |
| Database | PostgreSQL 16 | `server/migrations/*.sql` |
| Media | Local disk (development) or S3-compatible bucket | `server/storage.ts` |

One Node process serves the API, the built client and `/media`. `WEB_CONCURRENCY` forks worker processes. Replicas are stateless.

## 2. Tenancy model

- **Every hotel-owned row carries `hotel_id`:** content entities, requests and orders, order lines, events, guests, stays, sessions, media, imports, publications, reviews, departments, ledger, snapshots, settlements and analytics counters.
- **Users** belong to hotels through `user_hotels`. `SUPER_ADMIN` and `PLATFORM_FINANCE` are global.
- **Every admin route** is `/:hid/...` and passes through `requireHotelAccess(hid, module)`. It returns 404 for hotels outside the user's scope, and every query also filters on `hotel_id`.
- **Public routes** resolve the hotel from its slug, and guests only see their own requests (device-token hash).
- **Onboarding a hotel is data, not code:**
  - created by a Super Admin, with default departments, homepage sections and a unique finance code;
  - configured in the admin or through the Excel master workbook;
  - published as an immutable snapshot.

Cross-tenant isolation is verified by attack tests (SECURITY.md §2).

## 3. Content and publishing

- **Drafts.** Staff edit draft rows (entities).
- **Publishing.** *Publish* writes an immutable `publications` snapshot (versioned, per hotel, advisory-locked).
- **Guest bundle.** Guests read the latest snapshot, with *live* fields (availability, open/closed, archived) overlaid on top.
- **Caching.** The bundle is cached per hotel for 10 s and served gzipped with an ETag. A successful admin change drops the cache immediately on that replica.

## 4. Request and order lifecycle

1. **Guest identification** (session): name, phone, room (from a room QR) or external visitor. This creates or updates the guest profile and stay.
2. **Submission** (`POST /public/hotels/:slug/requests`, with an `Idempotency-Key`). One transaction does all of the following:
   - validates availability, modifiers and opening hours against published data;
   - prices every line server-side in integer minor units (VAT inclusive, exclusive or exempt per line);
   - assigns the per-hotel reference;
   - stores `order_lines`;
   - writes the `NEW` event;
   - builds the department WhatsApp message.
3. **Department queue** (polling every 10–30 s):
   - statuses NEW → ACCEPTED → IN_PROGRESS → READY → COMPLETED, plus CANCELLED and REJECTED;
   - every transition row-locks the order and appends an immutable `request_events` row (from, to, actor, time, note).
4. **Completion.** The commission engine resolves the rule in force at order time (most specific wins: service → category → outlet → department → order type → hotel → platform). It writes a **financial snapshot** and a **ledger entry** in the same transaction. Later changes to prices, rules or taxes never alter them.

## 5. Money

See COMMERCE.md for detail. In short:
- Amounts are integer minor units.
- Snapshots and the ledger are immutable (database triggers); corrections are adjustments.
- Settlements go through DRAFT → REVIEWED → APPROVED (by a different person) → hotel acknowledgement → SETTLED (with a payment reference).
- Settlement creation is serialised per hotel.
- Document numbers are `<PREFIX>-<hotel finance code>-<n>` and unique platform-wide.

## 6. Cross-cutting services

| Concern | Implementation |
|---|---|
| Rate limiting | Postgres-backed, per device plus per hotel+IP (`server/rateLimit.ts`) |
| Background jobs | Replica-safe runner using advisory locks and `job_runs` (`server/services/scheduler.ts`) |
| Health | `/api/health` (liveness), `/api/ready` (DB, storage, draining) (`server/health.ts`) |
| Observability | JSON logs with `X-Request-Id`, per-replica metrics, and `/api/admin/platform/ops` |
| Media | Upload sniffing, WebP variants and the storage driver (`server/services/media.ts`, `server/storage.ts`) |
| Theme | Palette extraction from the logo gives a contrast-checked token set, applied as CSS variables (`shared/theme.ts`) |
| Excel | Templates, staged preview, transactional commit and rollback (`server/services/excel/*`) |
| i18n | Guest dictionary (`src/lib/i18n.tsx`); admin dictionary, loaded lazily for Arabic, plus a server-message catalogue (`src/admin/i18n`) |

## 7. Database migrations

| File | Content |
|---|---|
| 001_init | Hotels, users, sessions, departments, requests, events, reviews, media, audit |
| 002_cms_v2 | Content entities, publications, import batches |
| 003_commerce | Guests, stays, sessions, order lines, agreements and rules, snapshots, ledger, adjustments, settlements, immutability triggers |
| 004_experience | Experiences, aggregate engagement counters |
| 005_scale | Idempotency keys, settlement acknowledgement, the rate-limit table, job runs |
| 006_hotel_finance_code | Unique per-hotel finance code, with an insert trigger |

All migrations are additive (expand phase) and run under an advisory lock in the release step.
