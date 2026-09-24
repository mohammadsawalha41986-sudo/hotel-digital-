# Hotel Digital Guest Hub

A multi-hotel digital concierge: guests scan a QR code and order food, request room and hotel
services, book the spa, arrange laundry pickup and send feedback, in Arabic or English. Each request
is routed to the right department (admin queue and WhatsApp). Hotel staff manage the entire guest
website, catalog, routing and operations from the admin console.

## Architecture

| Layer | Technology |
| --- | --- |
| Web client | React 18, Vite, Tailwind CSS 4, TanStack Query, React Router |
| API | Node.js 22+, Hono, Zod validation, one process serves the API **and** the built client |
| Database | PostgreSQL 14+ with plain SQL migrations (`server/migrations`) |
| Auth | Email + password (scrypt), httpOnly session cookies, CSRF guard, account lockout |
| Files | Uploads stored on disk (`UPLOAD_DIR`, use a persistent volume), content-type sniffed |

```
shared/   domain vocabulary, entity field specs, pricing, hours, WhatsApp message builder (used by API + client)
server/   API (routes, repositories, services), migrations, seeds, CLI, Firestore importer
src/      guest app (src/guest) and admin console (src/admin)
tests/    API integration + unit tests (node:test, real PostgreSQL)
e2e/      Playwright end-to-end tests against the production build
```

Key rules enforced on the **server**:

- Every hotel-owned row carries `hotel_id`; every admin route checks the user's hotel scope (out-of-scope ids return 404).
- Roles map to modules and departments (`shared/domain.ts`). Department staff only see their own requests.
- Guest totals are recomputed from database prices, modifiers and VAT; client prices are ignored.
- Requests get a per-hotel reference (`ORD-260924-007`), an audit trail and a status lifecycle
  `NEW → ACCEPTED → IN_PROGRESS → COMPLETED` (or `REJECTED` / `CANCELLED`).
- Admin changes to prices, menus, routing, publishing and request status are written to `audit_log`.

## Local development

Requirements: Node.js 22.9+ and PostgreSQL.

```bash
npm ci
cp .env.example .env            # adjust DATABASE_URL
npm run db:seed                 # Swiss Flora Royal (real hotel data, no invented prices)
npm run db:seed:demo            # optional: demo menus/prices, a second hotel, one user per role (NOT for production)
npm run dev                     # API on :8080, web on http://localhost:3000
```

Guest site: `http://localhost:3000/h/swiss-flora-royal` · Room QR: `…/h/swiss-flora-royal?room=1204` · Admin: `http://localhost:3000/admin`

Demo users (only after `db:seed:demo`): `admin@demo.hotelhub.local`, `fnb@…`, `housekeeping@…`, `maintenance@…`,
`frontoffice@…`, `laundry@…`, `spa@…`, `management@…`, `super@…` — password `Demo-pass-2026`.

## Production

```bash
npm ci
npm run build                   # typecheck + client bundle + server bundle (dist/)
npm run db:migrate              # also runs automatically on start
node dist/server/cli.js seed    # first deploy only: loads the Swiss Flora Royal profile
node dist/server/cli.js create-admin --email you@hotel.com --name "Your Name" --role SUPER_ADMIN --password '…'
npm start                       # NODE_ENV=production node dist/server/index.js
```

Environment variables: see `.env.example`. Put `UPLOAD_DIR` on a persistent volume. Behind a TLS proxy (Railway,
Render, Nginx) keep `TRUST_PROXY=1` so rate limiting sees the client IP; set `PUBLIC_ORIGIN` to the public URL.

Migrating content from the previous Firebase version: export Firestore with `node-firestore-import-export`
(collection `hotels`), then `npm run import:firestore -- export.json --dry-run` and, after reviewing the
report, run it again without `--dry-run`. Imported hotels start unpublished.

## Quality gates

```bash
npm run typecheck               # client + server TypeScript (strict)
npm test                        # API integration + unit tests (needs PostgreSQL; DATABASE_URL_TEST)
npm run build && npm run test:e2e   # Playwright E2E on the production build (DATABASE_URL_E2E)
```

The E2E suite resets its database (the name must contain `e2e` or `test`) and writes the screenshots in
`docs/screenshots`.
