import type { Module } from '../../../../shared/domain';
import { CODE_PATTERN, ENTITIES, type EntityName } from '../../../../shared/entities';
import type { FieldSpec } from '../../../../shared/fields';
import { one, q } from '../../../db';
import { createEntity, getEntityByCode, listEntities, updateEntity, type EntityRow } from '../../../repos/entities';
import { code as toCode, fieldValue, int, bool, isBlank, text, toCell } from '../cells';
import { readState, track } from '../state';
import type { ApplyContext, Cell, ColumnDef, HotelScope, ParsedSheet, RowResult, TemplateAdapter } from '../types';
import { SeenKeys, departmentCodes, inSavepoint, newResult, plain } from './shared';

/** Parent reference column per parent entity. */
const PARENT_COLUMN: Partial<Record<EntityName, { key: string; header: string }>> = {
  outlets: { key: 'outlet_code', header: 'Outlet Code' },
  menus: { key: 'menu_code', header: 'Menu Code' },
  menu_categories: { key: 'category_code', header: 'Category Code' },
  spa_categories: { key: 'category_code', header: 'Category Code' },
  laundry_categories: { key: 'category_code', header: 'Category Code' },
};

type Rule = (data: Record<string, unknown>, res: ReturnType<typeof newResult>, ctx: ApplyContext) => void;

export interface EntityTemplateOptions {
  key: string;
  number: string;
  title: string;
  title_ar: string;
  sheet: string;
  description: string;
  entity: EntityName;
  /** Only these field keys (default: every importable field). */
  include?: string[];
  exclude?: string[];
  /** Exported for readability, ignored on import. */
  reference?: string[];
  updateOnly?: boolean;
  examples?: Record<string, string>;
  rules?: Rule[];
  /** Extra modules needed (e.g. offers linking outlets need dining read access — not required). */
  modules?: Module[];
}

interface FieldColumn extends ColumnDef {
  field?: FieldSpec;
  /** Storage key in the entity data (i18n halves, ref ids). */
  storage?: string;
  role: 'code' | 'parent' | 'field' | 'ref' | 'active' | 'sort' | 'reference';
}

const refKey = (f: FieldSpec) => `${f.key.replace(/_id$/, '')}_code`;

/** Short, consistent headers for staff ("Currently available" → "Available"). */
const HEADER_OVERRIDES: Record<string, string> = { available: 'Available', internal_notes: 'Internal Notes', vat_mode: 'VAT Mode', featured: 'Featured', recommended: "Chef's Recommendation" };
const SMALL = new Set(['a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'per', 'for', 'the', '&']);
export function titleCase(label: string): string {
  return label
    .replace(/\s*\(.*?\)\s*/g, (m) => (/(min|kcal|%)/i.test(m) ? m : ' '))
    .trim()
    .split(/\s+/)
    .map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}
const headerFor = (f: FieldSpec) => HEADER_OVERRIDES[f.key] ?? titleCase(f.label);

function fieldHint(f: FieldSpec): string {
  switch (f.type) {
    case 'boolean':
      return 'yes / no';
    case 'money':
      return 'Number, e.g. 45 or 45.50 (no currency sign needed)';
    case 'number':
      return `Number${f.min !== undefined ? ` ${f.min}–${f.max ?? '∞'}` : ''}`;
    case 'tags':
      return `Comma separated: ${(f.options ?? []).map((o) => o.value).join(', ')}`;
    case 'select':
      return `One of: ${(f.options ?? []).map((o) => o.value).join(', ')}`;
    case 'media':
      return 'Full https:// link to a JPG, PNG, WEBP or SVG image (optional — add it later in Admin if you prefer)';
    case 'video':
      return 'https:// link to an MP4 file or a YouTube/Vimeo page';
    case 'gallery':
      return 'Several image links separated by | (URL1|URL2|URL3)';
    case 'datetime':
      return 'YYYY-MM-DD or YYYY-MM-DD HH:MM in hotel time';
    case 'department':
      return 'Department code that receives the requests (see the Departments template)';
    case 'icon':
      return 'Icon name from the dropdown';
    case 'phone':
      return 'International format, e.g. +966 5x xxx xxxx';
    case 'url':
      return 'https:// link';
    default:
      return '';
  }
}

export function entityTemplate(o: EntityTemplateOptions): TemplateAdapter {
  const def = ENTITIES[o.entity];
  const titleKey = `${def.titleField}_en`;
  const parent = def.parent ? PARENT_COLUMN[def.parent] : undefined;
  const wanted = (f: FieldSpec) =>
    !f.noImport && (!o.include || o.include.includes(f.key) || o.reference?.includes(f.key)) && !o.exclude?.includes(f.key);

  /** Static column list (dropdown values are filled per hotel in `columns`). */
  function baseColumns(): FieldColumn[] {
    const cols: FieldColumn[] = [
      {
        key: 'code',
        header: 'Code',
        role: 'code',
        required: !!o.updateOnly,
        hint: o.updateOnly
          ? `Code of an existing ${def.label.singular.toLowerCase()} (${def.codePrefix}-…)`
          : `Stable identifier, e.g. ${def.codePrefix}-EXAMPLE. Leave empty on a new row to generate it from the English name; never change it afterwards.`,
        example: o.examples?.code ?? `${def.codePrefix}-EXAMPLE`,
        width: 24,
      },
    ];
    if (parent && !o.updateOnly) {
      cols.push({ key: parent.key, header: parent.header, role: 'parent', required: true, hint: `Code of the ${ENTITIES[def.parent!].label.singular.toLowerCase()} this belongs to`, example: o.examples?.[parent.key], width: 22 });
    }
    for (const f of def.fields) {
      if (!wanted(f)) continue;
      const role = o.reference?.includes(f.key) ? 'reference' : 'field';
      const req = !!f.required && !o.updateOnly && role === 'field';
      if (f.type === 'i18n' || f.type === 'i18nText') {
        const long = f.type === 'i18nText';
        cols.push({ key: `${f.key}_en`, storage: `${f.key}_en`, field: f, role, header: `${headerFor(f)} (English)`, required: req, hint: role === 'reference' ? 'For reference only — not imported' : `${f.help ?? f.label}${long ? ' — long text allowed' : ''}`, example: o.examples?.[`${f.key}_en`], width: long ? 44 : 28 });
        cols.push({ key: `${f.key}_ar`, storage: `${f.key}_ar`, field: f, role, header: `${headerFor(f)} (Arabic)`, hint: role === 'reference' ? 'For reference only — not imported' : `Arabic ${f.label.toLowerCase()} (right-to-left text is fine)`, example: o.examples?.[`${f.key}_ar`], width: long ? 44 : 28 });
      } else if (f.type === 'ref') {
        const target = ENTITIES[f.refEntity as EntityName];
        cols.push({ key: refKey(f), storage: f.key, field: f, role: 'ref', header: `${headerFor(f)} Code`, hint: `Code of the ${target.label.singular.toLowerCase()} (optional)`, width: 22 });
      } else {
        const media = f.type === 'media' ? 'image' : f.type === 'video' ? 'video' : f.type === 'gallery' ? 'gallery' : undefined;
        const header =
          f.type === 'media' ? `${headerFor(f).replace(/ ?Image$/i, '')} Image URL`.trim().replace(/^Image URL$/, 'Image URL')
          : f.type === 'video' ? 'Video URL'
          : f.type === 'gallery' ? 'Gallery URLs'
          : f.type === 'department' ? 'Department Code'
          : headerFor(f);
        cols.push({
          key: f.key,
          storage: f.key,
          field: f,
          role,
          header,
          required: req,
          media,
          hint: [f.help, fieldHint(f)].filter(Boolean).join(' — '),
          example: o.examples?.[f.key],
          list: f.type === 'boolean' ? { values: ['yes', 'no'], strict: true } : f.type === 'select' || f.type === 'icon' ? { values: (f.options ?? []).map((x) => x.value), strict: false } : undefined,
          width: media ? 40 : f.type === 'textarea' ? 40 : 18,
        });
      }
    }
    if (!o.updateOnly) {
      cols.push({ key: 'active', header: 'Active', role: 'active', hint: 'yes = shown to guests, no = hidden (default yes)', list: { values: ['yes', 'no'], strict: true }, width: 10 });
      cols.push({ key: 'sort_order', header: 'Display Order', role: 'sort', hint: 'Whole number; lower numbers come first (optional)', width: 14 });
    }
    return cols;
  }
  const BASE = baseColumns();

  async function codeList(entity: EntityName, h: HotelScope) {
    const rows = await q<{ code: string }>(`SELECT code FROM ${ENTITIES[entity].table} WHERE hotel_id = $1 AND archived_at IS NULL ORDER BY sort_order, created_at`, [h.hotelId], h.db);
    return rows.map((r) => r.code);
  }

  async function codeMap(entity: EntityName, hotelId: string, db: HotelScope['db']) {
    const rows = await q<{ id: string; code: string }>(`SELECT id, code FROM ${ENTITIES[entity].table} WHERE hotel_id = $1`, [hotelId], db);
    return new Map(rows.map((r) => [r.id, r.code]));
  }

  const adapter: TemplateAdapter = {
    key: o.key,
    number: o.number,
    title: o.title,
    title_ar: o.title_ar,
    sheet: o.sheet,
    description: o.description,
    modules: [def.module, ...(o.modules ?? [])],
    entities: [o.entity],
    updateOnly: o.updateOnly,

    async columns(h) {
      const out: ColumnDef[] = [];
      for (const c of BASE) {
        const { field: _f, storage: _s, role, ...col } = c;
        if (role === 'parent') out.push({ ...col, list: { values: await codeList(def.parent!, h), strict: false } });
        else if (role === 'ref') out.push({ ...col, list: { values: await codeList(c.field!.refEntity as EntityName, h), strict: false } });
        else if (role === 'code' && o.updateOnly) out.push({ ...col, list: { values: await codeList(o.entity, h), strict: false } });
        else if (c.field?.type === 'department') out.push({ ...col, list: { values: await departmentCodes(h.hotelId, h.db), strict: false } });
        else out.push(col);
      }
      return out;
    },

    async exportRows(h) {
      const recs = await listEntities(o.entity, h.hotelId, {}, h.db);
      const parentCodes = def.parent ? await codeMap(def.parent, h.hotelId, h.db) : new Map<string, string>();
      const refMaps = new Map<string, Map<string, string>>();
      for (const c of BASE) if (c.role === 'ref') refMaps.set(c.key, await codeMap(c.field!.refEntity as EntityName, h.hotelId, h.db));
      // Keep children grouped under their parent, in the parent's order.
      if (def.parent) {
        const order = new Map((await codeList(def.parent, h)).map((c, i) => [c, i]));
        recs.sort((a, b) => (order.get(parentCodes.get(a.parent_id!) ?? '') ?? 1e6) - (order.get(parentCodes.get(b.parent_id!) ?? '') ?? 1e6) || a.sort_order - b.sort_order);
      }
      return recs.map((r) => {
        const row: Record<string, Cell> = {};
        for (const c of BASE) {
          if (c.role === 'code') row.code = r.code;
          else if (c.role === 'parent') row[c.key] = parentCodes.get(r.parent_id ?? '') ?? '';
          else if (c.role === 'ref') row[c.key] = r[c.storage!] ? refMaps.get(c.key)!.get(String(r[c.storage!])) ?? '' : '';
          else if (c.role === 'active') row.active = r.is_active ? 'yes' : 'no';
          else if (c.role === 'sort') row.sort_order = r.sort_order;
          else row[c.key] = toCell(c.field, r[c.storage!], h.timezone);
        }
        return row;
      });
    },

    async apply(sheet: ParsedSheet, ctx: ApplyContext): Promise<RowResult[]> {
      const { client, hotelId } = ctx;
      const present = new Set(sheet.columns);
      const results: RowResult[] = [];
      const seen = new SeenKeys();
      const departments = new Set(await departmentCodes(hotelId, client));
      const columnFor = (field: string) => BASE.find((c) => c.storage === field)?.key ?? field;

      for (const r of sheet.rows) {
        const v = r.values;
        const res = newResult(o.key, r, toCode(v.code), text(v[titleKey]));
        results.push(res);

        // Schema: coerce the columns present in the file.
        const patch: Record<string, unknown> = {};
        for (const c of BASE) {
          if (!present.has(c.key)) continue;
          if (c.role === 'field') {
            const got = fieldValue(c.field!, v[c.key], ctx.timezone);
            if (got.error !== undefined) res.err(got.error, c.key);
            else if (got.value !== undefined) patch[c.storage!] = got.value;
          } else if (c.role === 'active') {
            const got = bool(v.active, true);
            if (got.error !== undefined) res.err(got.error, 'active');
            else if (!isBlank(v.active)) patch.is_active = got.value;
          } else if (c.role === 'sort') {
            const got = int(v.sort_order);
            if (got.error !== undefined) res.err(got.error, 'sort_order');
            else if (got.value !== null) patch.sort_order = got.value;
          }
        }

        // Relationships, resolved by code (rows created earlier in this batch are visible).
        let parentId: string | undefined;
        if (parent && !o.updateOnly) {
          const pc = toCode(v[parent.key]);
          const pdef = ENTITIES[def.parent!];
          if (!pc) res.err(`${parent.header} is required`, parent.key);
          else {
            const p = await getEntityByCode(def.parent!, hotelId, pc, client);
            if (!p) res.err(`${pdef.label.singular} ${pc} not found`, parent.key);
            else parentId = p.id;
          }
        }
        for (const c of BASE) {
          if (c.role !== 'ref' || !present.has(c.key)) continue;
          const rc = toCode(v[c.key]);
          if (!rc) {
            patch[c.storage!] = null;
            continue;
          }
          const target = await getEntityByCode(c.field!.refEntity as EntityName, hotelId, rc, client);
          if (!target) res.err(`${ENTITIES[c.field!.refEntity as EntityName].label.singular} ${rc} not found`, c.key);
          else patch[c.storage!] = target.id;
        }
        for (const c of BASE) {
          if (c.field?.type !== 'department' || c.role !== 'field') continue;
          const d = patch[c.storage!];
          if (typeof d === 'string' && !departments.has(d)) {
            // Departments added by an earlier sheet of this batch.
            if (await one('SELECT 1 FROM departments WHERE hotel_id = $1 AND code = $2', [hotelId, d], client)) departments.add(d);
            else res.err(`Department ${d} is not set up for this hotel`, c.key);
          }
        }

        // Target record: by code, or (without a code) by English name under the same parent.
        let target: EntityRow | null = null;
        if (res.code) {
          if (!CODE_PATTERN.test(res.code)) res.err('Codes use capital letters, digits and hyphens (e.g. ITEM-LATTE)', 'code');
          else target = await getEntityByCode(o.entity, hotelId, res.code, client);
        } else if (res.name && !o.updateOnly) {
          target = await one<EntityRow>(
            `SELECT * FROM ${def.table} WHERE hotel_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND lower(name_en) = lower($3) ORDER BY created_at LIMIT 1`,
            [hotelId, parentId ?? null, res.name],
            client
          );
          if (target) {
            res.code = target.code;
            res.warn(`No code given — matched the existing record ${target.code} by its English name. Add the code to be certain.`, 'code');
          }
        }
        if (!res.name && target) res.name = String(target.name_en);

        const first = seen.check(res.code || `name:${parentId}|${res.name.toLowerCase()}`, r.row);
        if (first !== null) {
          res.duplicate = true;
          res.err(`Duplicate of row ${first} (same ${res.code ? 'code' : 'name'})`, res.code ? 'code' : titleKey);
        }
        if (!target && o.updateOnly && res.code && !res.hasErrors()) res.err(`${def.label.singular} ${res.code} not found — add it first`, 'code');
        if (!target && !o.updateOnly && !res.name) res.err(`${BASE.find((c) => c.key === titleKey)?.header ?? 'English name'} is required`, titleKey);

        if (target && ctx.mode === 'create_only') {
          if (!res.hasErrors()) {
            res.action = 'skipped';
            res.warn('Already exists — skipped (CREATE ONLY never changes existing records)');
          } else res.action = 'error';
          continue;
        }
        if (res.hasErrors()) {
          res.action = 'error';
          continue;
        }

        // Business rules and helpful warnings.
        const merged = { ...(target?.data ?? {}), ...patch };
        for (const rule of o.rules ?? []) rule(merged, res, ctx);
        if (target && def.imageField && patch[def.imageField] === '' && target.data[def.imageField]) res.warn('The image cell is empty — the current image will be removed', def.imageField);
        const arKey = `${def.titleField}_ar`;
        if (present.has(arKey) && !String(merged[arKey] ?? '').trim()) res.warn('Arabic name is empty — Arabic guests will see the English name', arKey);
        if (res.hasErrors()) {
          res.action = 'error';
          continue;
        }

        const kind = `entity:${o.entity}`;
        await inSavepoint(
          ctx,
          res,
          async () => {
            if (target) {
              const writes = { ...patch, ...(parentId && parentId !== target.parent_id ? { parent_id: parentId } : {}) };
              if (!Object.keys(writes).length) {
                res.action = 'unchanged';
                return;
              }
              const before = await readState(client, hotelId, kind, target.id);
              const { changed } = await updateEntity(o.entity, hotelId, target.id, writes, client);
              res.action = changed ? 'update' : 'unchanged';
              if (changed) await track(ctx, { sheet: o.key, kind, ref: target.id, label: `${def.label.singular} ${target.code}`, op: 'update', before });
            } else {
              const rec = await createEntity(o.entity, hotelId, { ...patch, parent_id: parentId ?? null, code: res.code || undefined }, client);
              res.code = rec.code;
              res.action = 'create';
              await track(ctx, { sheet: o.key, kind, ref: rec.id, label: `${def.label.singular} ${rec.code}`, op: 'create', before: null });
            }
          },
          columnFor
        );
      }
      return results.map(plain);
    },
  };
  return adapter;
}

// ----------------------------- Reusable business rules -----------------------------
export const rules = {
  /** Offer price should undercut the original price. */
  offerPricing: ((d, res) => {
    const orig = d.original_price as number | null;
    const offer = d.offer_price as number | null;
    if (orig != null && offer != null && offer >= orig) res.warn('Offer price is not lower than the original price', 'offer_price');
  }) as Rule,
  /** Start must precede end; past end dates are allowed but flagged. */
  schedule: ((d, res) => {
    const s = d.starts_at ? Date.parse(String(d.starts_at)) : null;
    const e = d.ends_at ? Date.parse(String(d.ends_at)) : null;
    if (s !== null && e !== null && e <= s) res.err('End date must be after the start date', 'ends_at');
    else if (e !== null && e < Date.now()) res.warn('End date is in the past — guests will not see this', 'ends_at');
  }) as Rule,
  /** A zero price on a sellable item is usually a typo. */
  zeroPrice: ((d, res) => {
    if (d.price === 0) res.warn('Price is 0 — guests will see it as free', 'price');
  }) as Rule,
};
