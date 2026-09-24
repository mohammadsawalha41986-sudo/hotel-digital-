# Excel import & export

Hotel staff bulk-manage content through Excel: they download a template, fill it in,
upload it, review a preview and confirm. They can also export current data, edit it
and re-import it. The whole feature runs on **one shared engine** plus a small
**adapter** for each module. Nothing is parsed in the browser: the old client-side
`xlsx` package (which had known vulnerabilities) has been removed, and the server
uses `exceljs`.

## Flow

```
Template / Export ──► fill in Excel ──► Upload
      Upload ──► Parse ──► Headers ──► Schema ──► Relationships (by code)
             ──► Duplicates ──► Images ──► Business rules ──► Preview (stored)
      Preview ──► Confirm ──► Transactional import ──► History ──► (Rollback)
      Import  ──► Publish  ──► Guests see the change
```

- **Preview writes nothing.** The engine runs every adapter inside a transaction
  and then rolls it back. Because the full pipeline really runs, the preview
  catches everything the real import would:
  - rows that reference parents created earlier in the same workbook;
  - generated codes;
  - department checks;
  - schema validation.

  The parsed rows are stored in `import_batches.payload` with status
  `previewed`. A stored preview expires after 24 hours.
- **Confirming re-runs the same pipeline on the stored rows,** this time for
  real. If any row is no longer valid (for example, its category was deleted
  after the preview), nothing is imported. The API then returns
  `422 import_invalid` together with the updated preview.
- **A batch is claimed inside the import transaction,** so a double click cannot
  import it twice.
- **Imports never go straight to guests.** Every write touches the hotel's
  draft, and guests see the new content only after a publish.
- **One import per hotel runs at a time.** Previews and imports take a
  per-hotel advisory lock (`pg_advisory_xact_lock`).

## Templates

| # | Template | Key | Covers |
|---|---|---|---|
| 01 | Hotel Profile | `hotel_profile` | name, contact, currency, VAT, languages, social links (1 row) |
| 02 | Departments | `departments` | built-in and hotel-defined departments |
| 03 | WhatsApp Routing | `whatsapp_routing` | WhatsApp, phone and email per department (update only) |
| 04 | Dining Outlets | `dining_outlets` | outlets |
| 05 | F&B Menus | `fnb_menus` | menus (Outlet Code) |
| 06 | F&B Categories | `fnb_categories` | categories (Menu Code) |
| 07 | F&B Items | `fnb_items` | items (Category Code), prices, images, gallery, allergens, dietary |
| 08 | F&B Modifiers | `fnb_modifiers` | option groups and options per item; one row per option |
| 09 | In-Room Services | `in_room_services` | room services |
| 10 | Spa Categories | `spa_categories` | wellness categories |
| 11 | Spa Services | `spa_services` | treatments (Category Code) |
| 12 | Laundry Categories | `laundry_categories` | garment groups, turnaround |
| 13 | Laundry Garments | `laundry_garments` | garments (Category Code) |
| 14 | Laundry Prices | `laundry_prices` | wash, dry-clean and press prices, express surcharge (update only) |
| 15 | Laundry Packages | `laundry_packages` | packages |
| 16 | Guest Services | `guest_services` | hotel services |
| 17 | Offers & Packages | `offers` | offers, linked outlet/spa category by code |
| 18 | Homepage Sections | `homepage_sections` | built-in homepage sections (website draft) |
| 19 | Navigation | `navigation` | guest menu links (website draft) |
| 20 | Custom Sections | `custom_sections` | text, image, banner and CTA blocks (website draft) |
| 21 | Hotel Information / FAQ | `info_faq` | information items |
| 22 | Operating Hours | `operating_hours` | hours of outlets, menus, services, spa; one row per opening period |

**MASTER HOTEL CONTENT TEMPLATE.xlsx** (`master`) contains an Instructions sheet
plus one data sheet for every template the user may access. Sheets are imported
in the catalogue order, so parents always come before the rows that reference
them.

Each workbook contains:

- **An Instructions sheet in English and Arabic.** It gives:
  - the rules (codes, relationships, images, dates, blank cells, modes,
    history, publishing);
  - a table for every template listing each column, whether it is required,
    what to enter, the allowed values and an example.
- **A hidden `Lists` sheet** that supplies the dropdowns:
  - enumerations, yes/no, icons and pages are *strict*;
  - existing parent, department and reference codes only *warn*, because the
    same workbook may create them.
- **Header formatting and notes.** Required columns end in ` *` and use a
  different colour. Every header carries a note explaining what to enter. The
  header row is frozen and filterable, and Arabic columns are right-to-left.

## Codes and relationships

- **Codes identify records.** Examples: `OUTLET-FLORA`, `MENU-BREAKFAST`,
  `CAT-COFFEE`, `ITEM-LATTE`, `SPA-MASSAGE-60`, `LAUNDRY-SHIRT`. Database ids
  are never exposed.
- **An empty code on a new row** is generated from the English name
  (`PREFIX-NAME`, with a numeric suffix if needed).
- **A row without a code matches an existing record by English name** under the
  same parent. The engine reports a warning suggesting the code be added.
- **Changing a translated name never creates a duplicate,** because the code
  keeps the record's identity.
- **Relationships are resolved by code.** These include:
  - parent codes;
  - `Linked Outlet Code` on offers;
  - `Department Code`, which must exist in the hotel or be created earlier in
    the same workbook.

## Modes and blank cells

- **CREATE + UPDATE** (default) creates new codes and updates existing ones.
- **CREATE ONLY** creates new records only. Existing records are reported as
  `skipped`, never changed.
- **Only columns present in the file are applied.** In an update, an empty cell
  clears that field. When this would remove an existing image, the preview
  shows a warning. To leave a field unchanged, delete the whole column.

## Validation and preview

Each row gets:

- an action: `create`, `update`, `unchanged`, `skipped` or `error`;
- its **exact Excel row number**;
- its code and name;
- messages, each with a level (`error` or `warning`) and a column.

The preview counts `total`, `valid`, `warnings`, `errors`, `create`, `update`,
`unchanged`, `skipped` and `duplicates`. Problems with the file or a sheet are
reported under `summary.issues`, for example:

- wrong format;
- missing required columns;
- a sheet that belongs to another template;
- unknown columns;
- no data rows.

Any error blocks the whole import. Example message:

```
ROW 18 · ITEM-LATTE · ERROR · category_code · Category CAT-COFFEE not found
```

Cells are read leniently:

- yes/no in English or Arabic;
- Arabic-Indic digits, thousands separators and currency prefixes;
- option values or their English/Arabic labels;
- times as `HH:MM`, AM/PM or Excel time cells;
- dates as hotel-local `YYYY-MM-DD [HH:MM]` or Excel date cells, converted
  using the hotel's time zone.

Exports write dates back in the same local format, so an exported file
re-imports unchanged.

Business rules include:

- an offer price that is not lower than the original price (warning);
- an end date before the start date (error);
- an end date in the past (warning);
- a zero price (warning);
- an empty Arabic name (warning);
- modifier minimum/maximum consistency (error);
- at most 4 opening periods per day (error).

### Images

- **URL checks.** Image and video columns (including `URL1|URL2|URL3`
  galleries) must hold valid `http(s)` URLs, or `/media/…` paths.
- **Reachability checks.** During the preview, external links are probed
  through the SSRF-safe fetcher (`services/net.ts`), which blocks private
  addresses, re-checks each redirect, and limits time and size. The engine
  checks at most 200 links, 8 at a time, with a 5-second timeout.
- **Media library links** are checked against this hotel's media library.
- **Broken or non-image links are warnings, never errors.** An optional missing
  or broken image never blocks otherwise valid content. Staff can turn the
  check off for a quicker preview.

## History, audit and rollback

- **History.** `import_batches` records the hotel, user, time, file, mode,
  status, summary, per-row results and the list of **changes**. Each change is
  `{sheet, kind, ref, op, before, after}`, captured from the state that was
  actually written.
- **Audit.** Every confirmed import writes an `import` audit entry, and every
  rollback writes an `import_rollback` entry.
- **How rollback works.** Changes are walked in reverse. A record is restored
  to its `before` state only while it still equals its `after` state, and
  records the import created are deleted. Deletion goes through the normal
  delete path, which refuses while children or references exist.
- **When rollback is refused.** If any record changed after the import (edited,
  deleted, or given new children), the whole rollback is refused with
  `409 rollback_conflict`. The response lists the affected records. A dry run
  (`?dry=1`) shows the outcome first.
- **Rollback is a draft change,** like any other edit, and needs a publish.

## API

All routes live under `/api/admin/hotels/:hid/data/…`.

- **Access to the import center** requires the `import` module.
- **Each template also requires its content modules.** A laundry user sees and
  imports only the laundry templates. Their master workbook contains only
  those sheets, and they cannot open batches that touch other modules.
- **Batch ids are hotel-scoped.**

| Method | Path | Purpose |
|---|---|---|
| GET | `/data/templates` | catalogue with `allowed` per template |
| GET | `/data/templates/:key` | blank template `.xlsx` (`master` for the master workbook) |
| GET | `/data/export/:key` | template filled with current data |
| POST | `/data/imports` | multipart `file`, `template`, `mode`, `check_images` → stored preview |
| GET | `/data/imports` | history |
| GET | `/data/imports/:id` | results and changes |
| POST | `/data/imports/:id/commit` | confirm |
| POST | `/data/imports/:id/discard` | close a preview |
| POST | `/data/imports/:id/rollback[?dry=1]` | roll back (or check) |

Limits:

- `.xlsx` files only (checked by magic number);
- 8 MB per file;
- 5,000 rows per sheet.

## Code map

| Part | File |
|---|---|
| Types | `server/services/excel/types.ts` |
| Cell coercion | `server/services/excel/cells.ts` |
| Workbook build/parse | `server/services/excel/workbook.ts` |
| Image stage | `server/services/excel/images.ts` |
| State stores and rollback | `server/services/excel/state.ts` |
| Batch engine (preview, commit, history, rollback) | `server/services/excel/engine.ts` |
| Template catalogue | `server/services/excel/templates.ts` |
| Generic entity adapter (15 templates, derived from `shared/entities.ts` field specs) | `server/services/excel/adapters/entity.ts` |
| Profile, departments, routing | `server/services/excel/adapters/settings.ts` |
| Modifiers, hours, sections, navigation | `server/services/excel/adapters/structured.ts` |
| Routes | `server/routes/admin/imports.ts` |
| Import Center, import dialog, module Import/Export buttons | `src/admin/pages/ImportCenter.tsx`, `src/admin/imports/*` |

**Adding a template:** for a new catalog entity, add an `entityTemplate({...})`
entry to `templates.ts`. The columns, dropdowns, export, validation and rollback
all follow from the entity's field specs. For anything else, implement
`TemplateAdapter` and record changes with `track()`, using an existing or new
state store in `state.ts`.

## Tests

- **API** (`tests/api/excel.test.ts`):
  - the template catalogue and access rules;
  - template structure;
  - §62: master workbook → preview → commit → publish → portal; then
    export → price edit → update → publish → new prices;
  - history and rollback, including conflicts;
  - row-level errors with exact rows and columns;
  - file-level errors;
  - CREATE ONLY;
  - discard;
  - departments, routing and services in one workbook, with rollback order;
  - modifiers and hours grouping;
  - profile, sections and navigation;
  - a full export → re-import that is a no-op for every template;
  - RBAC and hotel isolation.
- **Unit** (`tests/api/unit.test.ts`): cell coercion and time-zone round trip.
- **E2E** (`e2e/05-excel.spec.ts`): the same §62 journey through the browser on
  the production build, plus Arabic guest verification, history and rollback,
  and the module buttons.
