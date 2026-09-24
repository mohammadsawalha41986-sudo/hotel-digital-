# Audit against the Master Implementation Order (v2)

Baseline: commit `939c390`, the Node/PostgreSQL rebuild. The earlier Firebase app no longer exists; its audit is in `DELIVERY_REPORT.md` §2–4.
Every defect marked **(verified)** was reproduced against the running API.

## 1. Current architecture map
| Layer | Implementation |
| --- | --- |
| Client | React 18 + Vite; `src/guest/*` (portal), `src/admin/*` (console), `src/components/ui.tsx` |
| Shared | `shared/domain.ts` (roles, departments, statuses), `shared/fields.ts` + `shared/entities.ts` (schema-driven entities), `shared/hotel.ts` (profile/branding/site/guest payloads), pricing, hours, WhatsApp builder, import spec |
| API | Hono. Routes: `auth`, `public`, `admin/{hotels,entities,requests,analytics,misc,importExport}` |
| Data | PostgreSQL: `hotels` (profile/branding/settings JSONB, `site_draft`/`site_published`), 12 generic catalog tables (`parent_id` + `data` JSONB), `departments`, `requests`, `request_events`, `reviews`, `media`, `users`, `user_hotels`, `sessions`, `audit_log`, `counters` |
| Tests | 69 API tests (node:test + Postgres), 25 Playwright E2E tests on the production build |

## 2. Working (IMPLEMENTED, with runtime evidence in the existing tests)
- Auth: sessions, lockout, CSRF
- RBAC by module/department and hotel isolation (API)
- Requests: server pricing, WhatsApp routing and fallback, lifecycle and timeline, guest tracking
- Generic CRUD with create/update/delete/reorder/activate for 12 entities
- Outlet → menu → category → item with modifiers
- Room services / hotel services / spa / laundry / offers / info
- Website draft → publish for hero, sections, navigation and welcome only
- Reviews moderation
- Media upload/URL with content sniffing and client-side WebP resize
- QR (hotel/room/dining/outlet/spa/services; PNG/SVG/print)
- Analytics from real data, audit log
- Import/export by name for 8 entities
- Firestore migration tool
- Guest portal in AR/EN with RTL/LTR at 320–1280 px

## 3. Partial
- **Publishing:** only the website layout is draft/publish. Catalog prices, images, offers and theme go live on save **(verified)**. No publishing history.
- **Brand engine:** extracts only primary/accent/secondary from the logo in the browser. No full token set, no contrast-safe derivation, no regenerate/undo/reset, no dark logo or square mark, tiny preview.
- **Images:**
  - Single image per record, no gallery.
  - No server-side variants or thumbnails, no `srcset`.
  - No dimension check or recommended-size guidance; no crop.
  - SVG is rejected, so SVG logos are unsupported.
- **Excel:**
  - 8 entities, matched by name rather than stable codes.
  - Uses the vulnerable SheetJS 0.18 package.
  - No dropdowns or examples in templates, no master workbook, no image-URL validation.
  - No import history or rollback.
  - Preview is not persisted: the file is re-sent on confirm.
- **Admin shell:** sidebar only. No top bar (publish/preview/notifications/current role/language), no hotel creation wizard.
- **Custom sections:** a single layout (image + text).
- **Navigation:** no icon choice; destinations limited to built-in pages.
- **Laundry:** category is a fixed list, not an entity. No packages, no turnaround time.
- **Spa:** no capacity or price unit.
- **Offers:** free-text price label only. No original/offer price, terms, or linked service.
- **Complaints:** handled as generic requests. No resolution field, no Guest Relations view.
- **Departments:** fixed enum; hotels cannot add their own.
- **Records:** no duplicate, no archive (only hide/delete), no stable code, no internal notes.

## 4. Broken
- **(verified)** `PATCH /entities/:e/:id` with no recognised field returns **200** and changes nothing, which violates the no-silent-success rule.
- **(verified)** `PUT /settings`, `/branding` and `/profile` are full replacements: an empty or partial body silently resets fields to defaults (emergency phone was wiped).
- **(verified)** Content edits reach guests before "Publish", so the Website Manager's "Publish" misleads for catalog changes.

## 5. Missing
- Admin UI in Arabic
- Top bar
- Hotel creation wizard
- Publishing history
- Import history / rollback
- Master workbook and the 22 templates (profile, departments, routing, modifiers, laundry categories/prices/packages, homepage sections, navigation, custom sections, operating hours)
- Stable codes
- Image variants and gallery
- Brand token engine
- Custom departments
- Duplicate / archive
- Deployed environment (none exists; §70 needs your approval of a target)

## 6. Data-model / API gaps
- `code` column, unique per hotel and entity.
- `archived_at`.
- Gallery and internal-notes fields.
- Publish snapshot table and publishing history.
- `import_batches` with a rollback payload.
- `media_variants`.
- Branding token set.
- Custom departments.
- Guest-relations fields (resolution, case status).
- No-op detection on every mutation.
- Orders must be priced from the **published** catalog.

## 7. Static / hardcoded content found
- The guest dictionary is complete. The admin console's strings are English literals (about 600).
- Laundry, info and service category options are fixed lists in `shared/entities.ts`.
- Department list is a fixed enum.
- Recommended image sizes are not shown anywhere.
- The demo catalog is clearly prefixed `[Demo]` and exists only in `db:seed:demo`. The production seed has no invented prices.

## 8. Dead controls found
- No handler-less buttons remain; the earlier "Change password" link was fixed.
- Misleading control: the website "Publish" does not govern catalog, theme or prices (see §4).
- The "Crop" and "Duplicate" actions the spec requires do not exist (missing, not dead).

## 9. Proposed implementation sequence
This follows the order in §73, merged where phases share infrastructure:

- **P2:** schema migration (codes, archive, snapshot/publish history, import batches, media variants, custom departments, guest relations) and the no-op/PATCH fixes.
- **P3–4:** shared CRUD extensions (duplicate, archive, codes, gallery); admin shell with top bar and bilingual admin i18n.
- **P5–6:** settings and the brand engine (shared token derivation with contrast solver, logo analysis, full preview, theme draft).
- **P7:** homepage/navigation/custom-section layouts and footer.
- **P8–12:** module schemas (F&B, spa, laundry categories/packages, services, offers).
- **P13–14:** custom departments, requests, guest relations.
- **P15–16:** exceljs-based shared import engine (server parse, persisted preview, codes, dropdowns, image-URL checks, history/rollback) and the 22 templates plus master workbook.
- **P17:** sharp variants, `srcset`, dimension warnings, spec help, SVG logos (sandboxed), crop.
- **P18–19:** guest portal updates (gallery, custom layouts, laundry categories) and AR/EN parity.
- **P20–22:** RBAC and isolation tests; QR; publish snapshot so guests read the published catalog.
- **P23–24:** unit/API/E2E acceptance tests §62–67 and the definition-of-done flow.
- **P25:** deployment verification, which is blocked until you approve a target.

## 10. Files / modules expected to change
- `server/migrations/002_*.sql`
- `server/repos/entities.ts`
- `server/services/{catalog,requests,media,publish,importEngine}.ts`
- `server/routes/admin/*`, `server/routes/public.ts`
- `shared/{entities,fields,hotel,domain,importSpec,theme}.ts`
- `src/admin/**` (shell, i18n, brand engine, import center, wizard, publishing)
- `src/guest/**` (gallery, sections, laundry, snapshot consumption)
- `tests/api/*`, `e2e/*`
