# Hotel Digital Guest Hub: Delivery Report

**Status: feature-complete and runtime-verified in staging conditions. Not yet production-ready.** The P0 items in §29–30 depend on the hotel's real data and on hosting, and must be done before launch.

## 1. Branch / commit
Branch `claude/trusting-ride-kmoksr`. Commits `3448097` (rebuild), `d3c9374` (tests), `fd19ffa` (migration tool, responsive/a11y, CI) and the report commit that follows. Base: `6bea48d` (main).

## 2. Architecture found
- A React/Vite single-page app that talked to Firebase (Firestore, Auth, Storage) directly from the browser. There was no backend. The Firebase config in the repo was redacted, so the live project could not be reached.
- Firestore rules relied on custom auth claims (`role`, `hotelId`) that nothing in the repo ever set. The rules would therefore deny writes to hotel admins and department staff.
- About 52k lines, much of it hard-coded demo data: `swissFloraData.ts` (3,300 lines of invented menus and prices), `inRoomServicesData`, `laundryHubData`, `wellnessHubData`, and localStorage stores seeded with fake requests, reviews and complaints.

**Decision (confirmed with you):** replace it with a Node API plus PostgreSQL. The new stack:
- React 18 / Vite / Tailwind 4 / TanStack Query client
- Hono API with Zod validation
- PostgreSQL with SQL migrations
- scrypt passwords and httpOnly sessions
- One process serves both the API and the built client

## 3. Features already working (old system)
- Production build and TypeScript compile.
- 46 tests passed, but they only checked the hard-coded demo data.
- Room QR URL format (`?room=`).
- Bilingual toggle.
- Firestore CRUD for some content, when Firebase was configured.

## 4. Features repaired (old status → now)
| Area | Old status | Now |
| --- | --- | --- |
| Admin auth / RBAC | BROKEN: claims never set; dev login granted roles by email prefix | Server sessions, 9 roles, module and department scoping, lockout, CSRF |
| Guest requests | PARTIAL: totals computed in the browser; failed writes silently went to localStorage | Server-priced, validated, stored, referenced, routed |
| Complaints & reviews | BROKEN: saved only in the guest's own browser, seeded with fakes | Stored server-side and routed to management; reviews moderated |
| Opening status | HARDCODED: always "OPEN NOW" | Evaluated from weekly schedules in the hotel's time zone, including overnight ranges |
| WhatsApp routing | PARTIAL/HARDCODED: fallback `+966110000000`; numbers private, so guests could not use them | Per-department numbers, outlet override, configurable fallback, message built on the server |
| Admin saves | BROKEN: silent no-op when Firebase was unreachable | Every save goes through the API; errors surface at field level |
| Room/laundry/spa catalogs | HARDCODED data files | Database-driven and fully editable |
| Dashboard | PARTIAL: counted local/demo requests | Real SQL analytics scoped by role; empty state when there is no data |

## 5. Features newly implemented
**Guest side**
- Welcome + language + identification gate, with the room pre-filled from the QR code.
- Premium mobile-first guest site: hero slider supporting image, video, YouTube/Vimeo and scheduling; 12 configurable section types.
- Dining: outlet → menu → category → item, with modifiers, VAT modes and a basket.
- Room services, hotel services, spa booking requests, laundry with express surcharge, feedback with photo upload.
- "My requests" with live status and staff messages.
- Guest review submission with moderation.

**Admin side**
- Website Manager with draft → live preview → publish.
- Schema-driven CMS for 12 content types, menu builder.
- Branding with logo-based palette suggestion and WCAG contrast check.
- Departments & WhatsApp routing.
- Requests board with status actions, internal notes and guest messages.
- Analytics, media library (content-sniffed uploads, in-browser WebP resize).
- QR generator (hotel/room/dining/outlet/spa/services; PNG, SVG, print-to-PDF sheets, bulk room ranges).
- Excel/CSV import with preview, row errors and atomic commit, plus export.
- Users & roles, audit log, hotel portfolio for super admins.
- Firestore migration tool (`npm run import:firestore`).

## 6. Remaining gaps
See §29–30.

## 7. Guest pages tested
Welcome/identify, home, dining, outlet menu, item sheet, basket, room services, hotel services, spa, laundry, info, feedback, my requests, request detail, offers, 404, unknown hotel, and preview mode.

## 8. Admin pages tested
- **Through E2E:** login, dashboard, requests (drawer and lifecycle), website manager, offers, dining/menu builder, room services, spa, laundry, departments, branding, audit.
- **Through the API suite:** users, reviews, media, import/export, profile/settings.
- **Visual check only (screenshots):** QR codes and hotel portfolio.

## 9. Arabic / English
- Full dictionary parity; `dir` and `lang` switch at runtime.
- Arabic-specific display typography.
- Latin digits for prices, references and room numbers, and LTR-isolated phone numbers.
- The WhatsApp message is written in the guest's language.
- Language mode per hotel: both / Arabic only / English only.
- Verified by the E2E journeys in both languages, each run at 6 widths.
- The admin console is in English; content fields are bilingual.

## 10. Mobile results
- No horizontal overflow at 320, 360, 390, 430, 768 and 1280 px in AR and EN on 9 guest pages.
- Item sheet and basket actions stay inside the viewport at every width.
- Found and fixed along the way: long addresses and emails overflowing, and the Arabic add button wrapping.

## 11. Multi-hotel isolation
Every table carries `hotel_id`; out-of-scope ids return 404. Tests prove a second hotel's admin gets 404 on 11 read endpoints plus writes, and that none of the following can cross hotels:
- parent and reference links
- orders via another hotel's slug
- menus via another hotel's slug
- WhatsApp routing

## 12. RBAC
- Department roles see only their own requests, including direct-id access (404) and analytics.
- Modules are guarded in both the UI and the API.
- Hotel admins cannot grant super admin.
- Deactivation or role changes end sessions immediately.
- Verified in 11 API tests and 2 E2E tests.

## 13. WhatsApp routing
- Correct number per department is verified end to end for FNB, Housekeeping, Maintenance, Laundry, Spa and Management.
- Fallback chain works: department → Front Office → none (the request is still in the admin queue).
- Outlet-level override works.
- The message contains hotel, guest, room, reference, items, quantities, options, notes and total.
- A routing change applies to the next request and is audited.

## 14. Menu / order
- Outlet → menu → category → item.
- Modifiers are enforced for required choices, maximum selections, unknown options and unavailable options.
- VAT inclusive, exclusive and exempt modes.
- Client-sent prices are ignored.
- Closed outlets, hidden items and unavailable items are rejected.
- Reference format `ORD-YYMMDD-NNN`.

## 15. Room Service
- 13 services seeded from your brief, each with icon, department, response time and custom questions (e.g. the A/C issue type).
- Room number is taken automatically from the guest session; in-house status is required.

## 16. Laundry
- Wash / dry-clean / press prices and an express percentage per item.
- Quantities, pickup time, server total (e.g. 3 × 12 × 1.5 + 20 × 1.5 = 84).
- Routed to Laundry.

## 17. Spa
- Categories → services with duration, price or price note, and bookable / information-only mode.
- Date must not be in the past; guest count is capped.
- Routed to Spa.

## 18. Complaint
- Complaints, service recovery and anything marked urgent go to MANAGEMENT; suggestions and compliments go to FEEDBACK.
- Optional photo attachment (image only, 5 MB) and urgency level.

## 19. QR
- Generates hotel, room (carries `?room=`), dining, outlet, spa and services codes, with an optional preset language.
- Output: PNG and SVG downloads, plus printable sheets (the browser's Save as PDF), including bulk room ranges up to 500.

## 20. Import / export
- Excel/CSV workbooks: menus/categories/items, room services, hotel services, spa, laundry.
- Preview is a rolled-back dry run with row numbers.
- Duplicates are either updated or rejected, by id or by name within the same parent.
- A file with any error is never partially imported.
- Export includes parent names so a file can round-trip.

## 21. Media
- Upload is validated by file content: JPG/PNG/WebP/AVIF/GIF/MP4/WebM; SVG is rejected; 8 MB limit.
- Admin uploads are resized in the browser to at most 2000 px WebP.
- URL media gets a live preview with a broken-media warning.
- Guests see a branded placeholder instead of a broken image.

## 22. Branding
- Logo, inverse logo, favicon, 7 colours, 3 font families and a gallery; all apply at runtime.
- Palette suggestion from an uploaded logo.
- Contrast badges.

## 23. Admin → DB → Guest persistence evidence
E2E `02-admin-simulation` performs these through the UI, reloads, re-checks each value, and verifies the public site:
- Change the logo (upload).
- Change the hero headline (draft → publish).
- Create an offer.
- Change an outlet image.
- Change a menu item price (64).
- Disable an item.
- Add a room service ("Baby cot").
- Change a spa price (300).
- Change a laundry price (13).
- Change the Housekeeping WhatsApp number.
- Hide the gallery section.

After reload, the public site shows the new headline, the offer, no gallery, the price 64 with "Unavailable", and the new WhatsApp number on the next request. The audit log records the price change with its before/after values.

## 24. E2E result
**25/25 passing, run twice back to back** (Playwright, Chromium, against the production build and a freshly seeded database).

## 25. Automated tests
**69/69 API integration and unit tests** (15 suites, real PostgreSQL).

## 26. Typecheck / lint / build
- `npm run typecheck`: clean, strict mode, client and server.
- `npm run build`: client and server bundle built.
- Guest initial JS is about 200 KB gzipped; xlsx and qrcode load lazily.
- A CI workflow is added but has not yet run on GitHub.

## 27. Guest screenshots
`docs/screenshots/guest-*.png`: welcome, home (AR/EN mobile, EN desktop, full-page AR), menu, item sheet, laundry, spa, my requests.

## 28. Admin screenshots
`docs/screenshots/admin-*.png`: dashboard, requests, request detail, website manager with live preview, menu item editor, WhatsApp routing, QR codes, branding.

## 29. Unresolved issues

**P0 (before launch)**
1. Real department WhatsApp numbers are not set; only the reception phone is known.
2. There are no real menus, prices, spa prices or laundry price list. The production seed contains outlets and services without prices; the priced catalog exists only in the demo seed.
3. Not deployed: needs PostgreSQL, a persistent volume for uploads, TLS, and a first admin created with `create-admin`.
4. Hotel images are hotlinked from `api.swissflorahotels.com`. This sandbox blocks that host, so their loading could not be verified. Re-upload them to the Media library or confirm hotlinking is allowed.
5. Check-in/out times, Wi-Fi, policies, prayer and emergency information are missing from the source data and must be entered in Guest information.

**P1**
- WhatsApp is click-to-chat: the guest taps "send". Automatic delivery needs the WhatsApp Business Cloud API.
- The admin queue polls every 10 s; there is no push, sound or notification yet.
- The rate limiter is in-memory, which is fine for a single instance only.
- The Firestore importer is tested against a synthetic export only.
- The CI workflow has not run on GitHub yet.

**P2**
- No server-side responsive image variants (`srcset`).
- Guest complaint photos are public behind an unguessable URL.
- Catalog edits go live immediately (audited); only the website layout has draft/publish.
- The admin console is English-only.
- No self-service password reset by email; no 2FA.

**P3**
- Reordering uses up/down buttons (no drag and drop).
- No UI to reassign a request to a specific staff member.
- Basic bar charts; no analytics export.

**P4**
- PMS integration, payments, push/PWA, table QR sessions.

## 30. Remaining work before production deployment
1. Provision PostgreSQL, a persistent upload volume and TLS hosting (for example Railway), and set the variables from `.env.example`.
2. Run `npm run build`, then `node dist/server/cli.js seed`, then `create-admin` for the super admin and hotel admin.
3. Enter the real WhatsApp numbers per department, and check them with the "Send test" button.
4. Enter or import the real menus, prices, spa treatments and laundry price list, using the Import templates.
5. Complete Guest information, and upload the logo and photos to the Media library.
6. Review the Website Manager, publish, print room QR codes, and do a staff walkthrough per department role.
7. Before scaling beyond one instance, move rate limiting to Redis. Consider the WhatsApp Business API and push notifications (P1).
