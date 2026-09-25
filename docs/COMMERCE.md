# Guest CRM, orders, commission and settlements

Scope: follow-up implementation order, sections 1–26 (and §77–103 of the master order).
Branch: `claude/trusting-ride-kmoksr`.

| Commit | What it contains |
| --- | --- |
| `2b2d329` | Groundwork for this batch: stable codes and item/category codes on order lines |
| `50f2e56` | Commerce backend |
| `50f1631` | Admin UI |

## 1. Audit: what existed before

| Concept | Existing | Decision |
| --- | --- | --- |
| Order | `requests`: reference, type, department, status, lifecycle timestamps, display lines as JSON, totals | **Kept as the single order table**. Extended with guest, stay, source, order type, `READY` and a financial status. No second order engine. |
| Order lines | JSON only | New `order_lines` table (immutable) |
| Status history | `request_events` (from, to, actor, note) | Extended with event type, actor type and reason; made immutable |
| Guest / stay | None: identity copied onto each request | New `guests`, `guest_stays`, `guest_sessions` |
| Commission, ledger, settlement | None | New tables, below |
| Finance RBAC | None | New roles and modules, below |

## 2. Models and migrations

Migration `server/migrations/003_commerce.sql` is additive. It does not drop or rewrite any existing data.

**Operational tables**
- `guests`
- `guest_stays` (stay or visit context)
- `guest_sessions` (device ↔ guest; "QR session started")
- `requests`: the order. Adds `guest_id`, `stay_id`, `hotel_name`, `source`, `order_type`, `is_commercial`, `discount`, `service_charge`, `other_fees`, `ready_at`, `created_by`, `financial_status` and `financial_note`.
- `order_lines`: item id and code, category code, Arabic and English names, quantity, unit price, modifiers, VAT mode and rate, discount, net, VAT and line total. All money in integer halalas.
- `request_events`: now typed and attributable.

**Financial tables**
- `commission_agreements`
- `commission_rules`: immutable, effective-dated versions
- `financial_snapshots`: one per order
- `commission_ledger`
- `financial_adjustments`
- `settlements`
- `settlement_lines`
- `hotel_commercial_settings`: hotel finance visibility, settlement frequency, guest retention

**Guards**
- Database triggers refuse `UPDATE`/`DELETE` on `order_lines`, `request_events` and `financial_snapshots`.
- Ledger amounts can never change. Only the status, settlement link and dispute reason may.
- Rule terms can never change. Only closing a version, deactivating it, or editing its notes is allowed.
- Adjustments are append-only.
- If one of these writes is attempted, the API returns `409 immutable_record`.

**Legacy data**
- Requests created before the migration have their lines rebuilt from the stored JSON. VAT is split pro rata, and the lines are marked `vat_mode = 'legacy'`.
- Verified on a database upgraded from 001 → 002 → 003: a legacy order later completed at 5% of the SAR 86.96 net produced SAR 4.35.

## 3. Guest identity (sections 1–3)

Phone numbers are normalised to E.164 using the hotel's `default_country_code` setting (default 966). For example, `0551234567` becomes `+966551234567`.

A profile is reused only when one of these is true:
1. Same phone **and** a compatible name ("Sara" matches "Sara Ali"; "Sara Ali" does not match "Sarah Ali").
2. Same device **and** a compatible name, with no conflicting phone number.
3. In-house guest without a phone: an open stay in the same room with a compatible name.

In every other case a new profile is created. Phone numbers are deliberately **not unique**, because family members share them.

Duplicate candidates are listed with the evidence for each match: same phone, same email, or same name and room. A merge must be confirmed and needs a reason. The secondary profile remains as a pointer to the primary, and the merge is audited.

## 4. Commission engine

The single implementation is `shared/commerce.ts` → `calculateCommission`. The same function runs on the server, in the UI and in the unit tests.

**Formula**
```
base       = Σ eligible lines at the configured basis
             GROSS_INCL_VAT            gross after discounts
             NET_EXCL_VAT              net after discounts
             SUBTOTAL_BEFORE_DISCOUNT  net + discount
             Lines are filtered by included / excluded item or category codes.
commission = round(base × rate_bps / 10000) + fixed fee        (per commission type)
tax        EXCLUSIVE:       round(commission × tax rate), charged on top
           INCLUSIVE:       commission − round(commission ÷ (1 + tax rate))
           NOT_APPLICABLE:  0
platform revenue = commission excluding tax
hotel amount     = order gross − commission − exclusive tax
```
- Money is held in integer halalas, and rates in basis points (500 = 5%).
- Rounding is half away from zero, once per order.
- Basis and tax treatment must be chosen explicitly. A rule without them is rejected with 422.

**Precedence**

The most specific rule wins, in this order: `SERVICE → CATEGORY → OUTLET → DEPARTMENT → ORDER_TYPE → HOTEL → PLATFORM`.
- The rule is resolved at the **order's creation time**, so an October order keeps October terms even if it completes in January.
- Service and category rules apply when every line of the order shares that code.
- Within one level, a hotel rule beats a platform rule, then the latest `effective_from`, then the highest version.
- A given scope can have only one live rule at a time; overlapping rules are refused.
- The rule actually used is recorded in the snapshot: id, key, version, level, full terms, order context and formula text.

**Eligibility**
- Each rule sets when commission is earned: `COMPLETED` (the default) or `ACCEPTED`.
- The snapshot and ledger entry are written inside the same transaction as the status change.
- Cancelled or declined orders get `NOT_ELIGIBLE` with no commission, unless the rule's cancellation policy is `CHARGE_IF_ACCEPTED` and the order had been accepted.
- If an order that was already eligible is cancelled, an explicit `CANCELLATION_REVERSAL` adjustment is posted.

**No fabricated numbers (section 23)**
- If no rule applies, the order is marked `RULE_UNAVAILABLE` (`COMMISSION_RULE_UNAVAILABLE`).
- If the only rules start after the order was placed, it is marked `HISTORICAL_RULE_UNAVAILABLE` (`HISTORICAL_COMMISSION_RULE_UNAVAILABLE`).
- Neither case is ever treated as 0% or back-dated.
- "Re-evaluate" retries the calculation, but only with a rule that was in force when the order was placed.

**Versions**
- "New version" closes the open version at the new version's start date. The old version stays on record.
- Closing a version at a date is refused if orders already snapshotted under that version were placed after that date.

## 5. Adjustments, ledger, settlements

**Adjustments**
- Types: full refund, partial refund, commission correction (increase or decrease), hotel credit, hotel debit, platform credit, platform debit.
- Each one needs a reason and records a reference, the user, the time and the original order and ledger entry.
- Each one posts a **new** ledger entry, computed from the **original snapshot**.
- A partial refund reverses commission pro rata on the percentage part; a fixed fee is reversed only on a full refund.
- Settled entries are never touched. Their adjustments go into the next settlement.

**Ledger statuses**
- `EARNED`: posted.
- `ADJUSTED` / `VOIDED`: adjustments posted against it.
- `SETTLED`: included in a settled settlement.
- `DISPUTED`: held out of new settlements.
- `PENDING` exists in the schema but is currently unused.

**Settlements**
- Periods: weekly (7 days), biweekly (14), monthly (1st to the last day of the month) or custom. Dates are the hotel's local dates.
- Periods of one hotel cannot overlap.
- A settlement collects every unsettled, undisputed ledger entry in its period, and its totals are recomputed from those lines.
- Lifecycle: `DRAFT → REVIEWED → APPROVED → SETTLED`. A payment reference is required to settle. `VOID` releases the entries.
- **Maker–checker:** the approver must be a different person from the creator and the reviewer.
  - The server rejects self-approval with `409 four_eyes`.
  - The settlement screen disables Approve for that user and explains why.
  - Covered by `tests/api/commerce.test.ts` and `e2e/04-commerce.spec.ts`: the reviewer is blocked, and a second finance user approves and settles.
- Moving to approved or settled runs an integrity check: header = Σ lines, and every line still equals its ledger entry.
- Every figure can be drilled down: settlement → ledger entry → order → order lines → snapshot (rule and formula) → adjustment. Statements export to Excel or CSV and print to PDF.

## 6. APIs

**Guest portal**
- `POST /api/public/hotels/:slug/session`: identify the guest and start the stay/session.

**Hotel scope** (`/api/admin/hotels/:hid`)
- **Guests**
  - `GET` / `POST /guests`
  - `GET /guests/duplicates`, `POST /guests/merge`
  - `GET` / `PATCH /guests/:gid`: the 360 view and edits
  - `PATCH /guests/:gid/stays/:sid`
  - `POST /guests/:gid/anonymize`, `GET /guests/:gid/export`
- **Orders**
  - `GET /orders`: search, and `?format=csv|xlsx` export
  - `GET /orders/dashboard`, `GET /orders/:id`
  - `POST /orders`: staff-entered order, source `ADMIN`, `MANUAL` or `WHATSAPP`
- **Finance and reports**
  - `GET /finance/summary`, `GET /finance/settlements/:sid` (json, csv or xlsx)
  - `GET /reports/:report`
- **Department picker**
  - `GET /departments/options`

**Platform** (`/api/admin/platform`, global roles only)
- **Hotels and agreements**
  - `GET /hotels`, `PUT /hotels/:hid/commercial`
  - `GET` / `POST /agreements`, `PATCH /agreements/:aid`
- **Rules**
  - `GET` / `POST /agreements/:aid/rules`: pass `supersedes` to create a new version
  - `POST /rules/:rid/close`, `POST /rules/:rid/active`, `POST /rules/preview`
- **Dashboard, orders and ledger**
  - `GET /dashboard`
  - `GET /orders`, `GET /orders/:id`, `POST /orders/:id/evaluate`, `POST /orders/:id/adjustments`
  - `GET /ledger`, `POST /ledger/:eid/dispute`
- **Settlements**
  - `GET` / `POST /settlements`, `GET /settlements/:sid`
  - `POST /settlements/:sid/refresh`, `POST /settlements/:sid/status`
- **Reports and privacy**
  - `GET /reports/:report`, `POST /privacy/retention`

**Reports**
- By hotel (platform only), department, service, guest type and source.
- Average order value, cancellation rate.
- Commission revenue, settlements, adjustments.
- CSV exports neutralise spreadsheet formulas, and every export is audited.

## 7. Admin screens

**Hotel**
- Guests: list, search, add, and a duplicates tab with the merge flow.
- Guest Profile 360: overview, current stay, KPIs, service history, most-used items, orders, relations, notes, stays, timeline, export and anonymise.
- Orders: filters, export, and an order-record drawer.
- Dashboard: order overview.
- Finance, Reports.

**Platform finance**
- Commercial dashboard (filters: date, hotel, department, order type, status).
- Agreements & rules: per-hotel commercial settings and versioned rules.
- All orders: adjustments and re-evaluation.
- Settlements: workflow and statement.
- Commission ledger: disputes.
- Reports.

## 8. RBAC changes

- **New roles**
  - `PLATFORM_FINANCE` (global): dashboard, orders, finance and commercial. No content management and no guest CRM, and guest contact details are masked.
  - `HOTEL_FINANCE` (hotel-scoped): dashboard, orders, finance.
- **New modules:** `guests`, `orders`, `finance`, `commercial`.
- **Who has them**
  - Hotel admin: everything except `commercial`.
  - Management: guests and orders.
  - Front office: guests.
  - Department staff: operational requests only.
- **Hotel finance visibility** is set per hotel by the platform: `NONE` (the default), `SETTLEMENTS` or `FULL`. It is enforced on the backend.
- **Platform-wide roles** (super admin, platform finance) can only be granted by a super admin.
- **Out-of-scope IDs** return 404 across every hotel-scoped endpoint.

## 9. Tests

| Suite | Result |
| --- | --- |
| API integration and unit (`npm test`) | **113 / 113** |
| E2E, Playwright on the production build | **29 / 29** |

**`tests/api/commerce.test.ts`** covers acceptance steps 1–33 plus the no-fabrication rule:
- 5% on SAR 100 gives SAR 5, with the snapshot, ledger, Guest 360, hotel and platform dashboards all checked.
- The settlement goes through the full lifecycle, and the statement exports.
- After the rate moves to 7%, the history still shows 5% / SAR 5, and a new order uses 7% / SAR 7.
- A cancelled order earns no commission.
- A partial refund of SAR 40 is an explicit −SAR 2.80 adjustment, and the original entry is unchanged.
- Hotel B at 10%: a missing rule and a back-dated rule are both reported rather than guessed.
- Hotel A and Hotel B cannot see each other's data, and platform finance sees both.
- Every settled riyal is traced from settlement → ledger → snapshot → order lines → rule.
- The database refuses edits to snapshots, lines, ledger amounts, events and rule terms.

**Other suites**
- `commerce-unit.test.ts`: bases, fixed fees, tax treatments, code filters, rounding, adjustment deltas, precedence, effective dates, schema strictness, phone normalisation, name compatibility.
- `guests.test.ts`: matching, shared phones, device matching, merge, anonymisation, role permissions, export safety.
- `e2e/04-commerce.spec.ts`: the whole chain through the UI, from a room-QR guest order through Guest 360, the order record, a new rule version and the settlement lifecycle, to hotel finance and department-staff restrictions.

## 10. Remaining gaps

1. **Admin console language:** done.
   - The whole console, commerce screens included, is Arabic/English with RTL.
   - Server error messages are translated through a generated catalogue. See `docs/UX-ARCHITECTURE.md`.
2. **Discounts and fees:** discounts, service charge and other fees are stored and fully handled by the maths, but nothing sets them yet. There is no promotion engine, so they are always 0 today.
3. **Offers and packages:** offer and laundry-package ordering is not available in the guest portal yet. `OFFER_PACKAGE` orders can only be entered by staff.
4. **Payments and PMS:** there is no payment gateway (the hotel collects from the guest) and no PMS integration. Check-in and check-out dates are entered manually.
5. **PDF output:** settlement PDFs come from the browser's print dialog. There is no server-rendered PDF.
6. **Retention scheduling:** an opt-in daily job (`RETENTION_JOB=1`, `server/services/scheduler.ts`) runs retention.
   - It runs at most once a day platform-wide (advisory lock plus `job_runs`).
   - It is audited, and it only touches hotels that have a retention period.
   - It is off by default until the operator enables it. Staff notes in request history are immutable, so anonymisation cannot erase them. Staff are told not to record personal data there.
7. **Settlement approval:** four-eyes approval is enforced, and the hotel acknowledges approved statements in the app (see §11).
8. **Rule entry time zone:** effective dates are entered in the browser's local time.
9. **Deployment:** blocked by the Railway account plan. The production project has no database yet; see RAILWAY.md.

## 11. Production-scale financial safety (2026-09 pass)

**Idempotent checkout**
- The guest app sends an `Idempotency-Key` per checkout attempt.
- A partial unique index on (hotel, guest device, key) makes a duplicate impossible, even with 10 simultaneous submits.
- A retry returns the original order. Reusing the same key with a different basket is refused (`idempotency_mismatch`).
- The app retries once, with the same key, after a dropped connection.

**Serialised settlement creation**
- A per-hotel transaction advisory lock is taken before the overlap check.
- A deterministic test shows the race without it (a duplicate overlapping settlement is created) and the fix (409).

**Hotel acknowledgement**
- `POST /admin/hotels/:hid/finance/settlements/:sid/acknowledge` with an optional note, for APPROVED or SETTLED statements.
- Once only, audited; platform staff are refused.
- The UI shows an acknowledge panel on the hotel's statement, "Needs your acknowledgement" in the list, and "Awaiting the hotel's acknowledgement" on the platform view.

**Unique finance codes** (migration 006)
- Document numbers (`LE-`, `ADJ-`, `STL-`) embed a per-hotel code. That code used to be the first 8 letters of the slug, so hotels such as `swiss-flora-royal` and `swiss-flora-jeddah` collided, and the second hotel could never complete an order.
- Codes are now stored and unique (the collider gets a suffix, e.g. `SWISSFLO2`), and numbering skips any number already issued. Found by the 20-hotel load test; regression tests are in `finance-codes.test.ts`.

**Verified under load**
- 91,080 orders across 20 hotels, 7,028 completed.
- 0 missing or duplicate commission entries, 0 amount mismatches and 0 duplicate idempotency keys (SCALING.md).
