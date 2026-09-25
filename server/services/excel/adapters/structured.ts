import { GUEST_PAGES, SECTION_BACKGROUNDS, SECTION_LAYOUTS, SECTION_TYPES } from '../../../../shared/domain';
import { ENTITIES, type EntityName } from '../../../../shared/entities';
import { MODIFIER_KINDS, WEEKDAYS, hoursSchema, modifierGroupSchema, type Hours, type ModifierGroup } from '../../../../shared/fields';
import { navItemSchema, sectionSchema, type NavItem, type Section } from '../../../../shared/hotel';
import { one, q } from '../../../db';
import { getEntityByCode, updateEntity, type EntityRow } from '../../../repos/entities';
import { bool, code as toCode, int, isBlank, mediaUrl, num, option, text, time } from '../cells';
import { readState, sameState, track } from '../state';
import type { ApplyContext, Cell, ColumnDef, HotelScope, ParsedRow, ParsedSheet, RowResult, TemplateAdapter } from '../types';
import { inSavepoint, newResult, plain } from './shared';

type Res = ReturnType<typeof newResult>;
const yesNo = { values: ['yes', 'no'], strict: true } as const;

/**
 * Grouped sheets (modifiers, hours) describe one field of a parent record over
 * several rows. Rows are grouped by the parent code; the group is validated and
 * written as a whole and every row of the group shares its outcome.
 */
async function applyGrouped<T>(
  sheet: ParsedSheet,
  ctx: ApplyContext,
  o: {
    key: string;
    /** Resolves the parent record of a row, or reports an error. */
    target: (r: ParsedRow, res: Res) => Promise<{ entity: EntityName; row: EntityRow } | null>;
    field: string;
    /** Builds the new field value from the group's rows (row errors go to each res). */
    build: (rows: { r: ParsedRow; res: Res }[], current: unknown) => T | null;
    /** In CREATE ONLY mode, a record whose field is already filled is skipped. */
    isEmpty: (current: unknown) => boolean;
  }
): Promise<RowResult[]> {
  const all: Res[] = [];
  const groups = new Map<string, { entity: EntityName; row: EntityRow; rows: { r: ParsedRow; res: Res }[] }>();
  for (const r of sheet.rows) {
    const res = newResult(o.key, r, '', '');
    all.push(res);
    const t = await o.target(r, res);
    if (!t) {
      res.action = 'error';
      continue;
    }
    res.code = t.row.code;
    res.name = t.row.name_en;
    const k = `${t.entity}|${t.row.id}`;
    if (!groups.has(k)) groups.set(k, { ...t, rows: [] });
    groups.get(k)!.rows.push({ r, res });
  }
  for (const g of groups.values()) {
    const current = g.row.data[o.field];
    const setAll = (fn: (res: Res) => void) => g.rows.forEach((x) => fn(x.res));
    if (ctx.mode === 'create_only' && !o.isEmpty(current)) {
      setAll((res) => {
        res.action = 'skipped';
        res.warn('Already set for this record — skipped (CREATE ONLY never changes existing records)');
      });
      continue;
    }
    const value = o.build(g.rows, current);
    if (value === null || g.rows.some((x) => x.res.hasErrors())) {
      setAll((res) => {
        res.action = 'error';
        if (!res.hasErrors()) res.err('Another row of this group has an error');
      });
      continue;
    }
    if (sameState(current, value)) {
      setAll((res) => (res.action = 'unchanged'));
      continue;
    }
    const lead = g.rows[0].res;
    const kind = `entity:${g.entity}`;
    await inSavepoint(ctx, lead, async () => {
      const before = await readState(ctx.client, ctx.hotelId, kind, g.row.id);
      const { changed } = await updateEntity(g.entity, ctx.hotelId, g.row.id, { [o.field]: value }, ctx.client);
      if (changed) await track(ctx, { sheet: o.key, kind, ref: g.row.id, label: `${ENTITIES[g.entity].label.singular} ${g.row.code} (${o.field})`, op: 'update', before });
      lead.action = changed ? 'update' : 'unchanged';
    });
    for (const x of g.rows.slice(1)) {
      x.res.action = lead.action;
      if (lead.action === 'error') x.res.err('Could not be saved — see the first row of this group');
    }
  }
  return all.map(plain);
}

// ============================== 08 F&B modifiers ==============================
export const modifiersTemplate: TemplateAdapter = {
  key: 'fnb_modifiers',
  number: '08',
  title: 'F&B Modifiers',
  title_ar: 'خيارات الأصناف',
  sheet: 'F&B Modifiers',
  description: 'Sizes, add-ons and choices for menu items. One row per option; the rows of an item replace its options.',
  modules: ['dining'],
  entities: ['menu_items'],
  updateOnly: true,
  async columns(h) {
    const items = await q<{ code: string }>('SELECT code FROM menu_items WHERE hotel_id = $1 AND archived_at IS NULL ORDER BY code', [h.hotelId], h.db);
    return [
      { key: 'item_code', header: 'Item Code', required: true, hint: 'Existing menu item (ITEM-…)', list: { values: items.map((i) => i.code), strict: false }, example: 'ITEM-LATTE', width: 22 },
      { key: 'item_name', header: 'Item (reference)', hint: 'For reference only — not imported', width: 24 },
      { key: 'group_code', header: 'Group Code', required: true, hint: 'Groups options together, e.g. size or milk', example: 'size', width: 14 },
      { key: 'group_type', header: 'Group Type', hint: MODIFIER_KINDS.join(', '), list: { values: MODIFIER_KINDS, strict: true }, example: 'size', width: 12 },
      { key: 'group_name_en', header: 'Group Name (English)', required: true, hint: 'Shown above the options', example: 'Size', width: 20 },
      { key: 'group_name_ar', header: 'Group Name (Arabic)', hint: '', example: 'الحجم', width: 20 },
      { key: 'min_select', header: 'Minimum Choices', hint: '0 = optional, 1 = required', example: '1', width: 12 },
      { key: 'max_select', header: 'Maximum Choices', hint: '1 = pick one', example: '1', width: 12 },
      { key: 'option_code', header: 'Option Code', required: true, hint: 'Unique within the group, e.g. large', example: 'large', width: 14 },
      { key: 'option_name_en', header: 'Option Name (English)', required: true, hint: '', example: 'Large', width: 20 },
      { key: 'option_name_ar', header: 'Option Name (Arabic)', hint: '', example: 'كبير', width: 20 },
      { key: 'option_price', header: 'Extra Price', hint: 'Added to the item price (0 if included)', example: '4', width: 12 },
      { key: 'option_available', header: 'Option Available', hint: 'yes / no', list: yesNo, width: 12 },
    ];
  },
  async exportRows(h) {
    const items = await q<{ code: string; name_en: string; data: { modifiers?: ModifierGroup[] } }>(
      `SELECT i.code, i.name_en, i.data FROM menu_items i WHERE i.hotel_id = $1 AND i.archived_at IS NULL AND jsonb_array_length(COALESCE(i.data->'modifiers', '[]'::jsonb)) > 0 ORDER BY i.code`,
      [h.hotelId],
      h.db
    );
    return items.flatMap((i) =>
      (i.data.modifiers ?? []).flatMap((g) =>
        g.options.map((opt) => ({
          item_code: i.code,
          item_name: i.name_en,
          group_code: g.id,
          group_type: g.kind,
          group_name_en: g.name_en,
          group_name_ar: g.name_ar,
          min_select: g.min,
          max_select: g.max,
          option_code: opt.id,
          option_name_en: opt.name_en,
          option_name_ar: opt.name_ar,
          option_price: opt.price,
          option_available: opt.available ? 'yes' : 'no',
        }))
      )
    );
  },
  apply(sheet, ctx) {
    return applyGrouped<ModifierGroup[]>(sheet, ctx, {
      key: 'fnb_modifiers',
      field: 'modifiers',
      isEmpty: (cur) => !Array.isArray(cur) || cur.length === 0,
      async target(r, res) {
        const c = toCode(r.values.item_code);
        if (!c) return res.err('Item Code is required', 'item_code'), null;
        const row = await getEntityByCode('menu_items', ctx.hotelId, c, ctx.client);
        if (!row) return res.err(`Menu item ${c} not found`, 'item_code'), null;
        return { entity: 'menu_items', row };
      },
      build(rows) {
        const groups = new Map<string, { g: Record<string, unknown>; options: Record<string, unknown>[]; optionIds: Set<string>; firstRow: Res }>();
        for (const { r, res } of rows) {
          const v = r.values;
          const gid = text(v.group_code).toLowerCase();
          const oid = text(v.option_code).toLowerCase();
          if (!gid) res.err('Group Code is required', 'group_code');
          if (!oid) res.err('Option Code is required', 'option_code');
          if (!gid || !oid) continue;
          if (!groups.has(gid)) {
            const kind = option(v.group_type, MODIFIER_KINDS.map((k) => ({ value: k, en: k, ar: k })));
            if (kind.error !== undefined) res.err(kind.error, 'group_type');
            const min = int(v.min_select);
            const max = int(v.max_select);
            if (min.error !== undefined) res.err(min.error, 'min_select');
            if (max.error !== undefined) res.err(max.error, 'max_select');
            groups.set(gid, {
              g: { id: gid, kind: kind.value ?? 'choice', name_en: text(v.group_name_en), name_ar: text(v.group_name_ar), min: min.value ?? 0, max: max.value ?? 1 },
              options: [],
              optionIds: new Set(),
              firstRow: res,
            });
          } else if (!isBlank(v.group_name_en) && text(v.group_name_en) !== groups.get(gid)!.g.name_en) {
            res.warn(`Group name differs from row ${groups.get(gid)!.firstRow.row}; the first row wins`, 'group_name_en');
          }
          const grp = groups.get(gid)!;
          if (grp.optionIds.has(oid)) {
            res.duplicate = true;
            res.err(`Option ${oid} appears twice in group ${gid}`, 'option_code');
            continue;
          }
          grp.optionIds.add(oid);
          const price = num(v.option_price);
          if (price.error !== undefined) res.err(price.error, 'option_price');
          const avail = bool(v.option_available, true);
          if (avail.error !== undefined) res.err(avail.error, 'option_available');
          grp.options.push({ id: oid, name_en: text(v.option_name_en), name_ar: text(v.option_name_ar), price: price.value ?? 0, available: avail.value ?? true });
        }
        const out: ModifierGroup[] = [];
        for (const grp of groups.values()) {
          const parsed = modifierGroupSchema.safeParse({ ...grp.g, options: grp.options });
          if (!parsed.success) {
            for (const iss of parsed.error.issues) grp.firstRow.err(`Group ${String(grp.g.id)}: ${iss.path.length ? `${iss.path.join('.')} ` : ''}${iss.message}`);
            return null;
          }
          out.push(parsed.data);
        }
        if (out.length > 15) return rows[0].res.err('At most 15 option groups per item'), null;
        return out;
      },
    });
  },
};

// ============================== 22 Operating hours ==============================
const HOURS_TARGETS: Record<string, EntityName> = {
  outlet: 'outlets',
  menu: 'menus',
  room_service: 'room_services',
  guest_service: 'hotel_services',
  spa_category: 'spa_categories',
  spa_service: 'spa_services',
};
const DAY_VALUES = ['always', 'daily', ...WEEKDAYS, 'closed'] as const;

export const operatingHoursTemplate: TemplateAdapter = {
  key: 'operating_hours',
  number: '22',
  title: 'Operating Hours',
  title_ar: 'ساعات العمل',
  sheet: 'Operating Hours',
  description: 'Opening hours of outlets, menus, spa and services. One row per opening period; rows of a record replace its hours.',
  modules: ['hotel'],
  updateOnly: true,
  async columns() {
    return [
      { key: 'record_type', header: 'Record Type', required: true, hint: Object.keys(HOURS_TARGETS).join(', '), list: { values: Object.keys(HOURS_TARGETS), strict: true }, example: 'outlet', width: 16 },
      { key: 'code', header: 'Code', required: true, hint: 'Code of the outlet, menu, service…', example: 'OUTLET-FLORA', width: 22 },
      { key: 'day', header: 'Day', required: true, hint: 'always (24/7), daily, mon…sun, or closed', list: { values: DAY_VALUES, strict: true }, example: 'daily', width: 10 },
      { key: 'open', header: 'Opens', hint: 'HH:MM, 24h', example: '07:00', width: 10 },
      { key: 'close', header: 'Closes', hint: 'HH:MM, 24h (after midnight is fine, e.g. 01:00)', example: '23:00', width: 10 },
      { key: 'note_en', header: 'Note (English)', hint: 'e.g. "Last order 22:30"', width: 26 },
      { key: 'note_ar', header: 'Note (Arabic)', hint: '', width: 26 },
    ];
  },
  async exportRows(h) {
    const out: Record<string, Cell>[] = [];
    for (const [type, entity] of Object.entries(HOURS_TARGETS)) {
      const rows = await q<{ code: string; data: { hours?: Hours } }>(`SELECT code, data FROM ${ENTITIES[entity].table} WHERE hotel_id = $1 AND archived_at IS NULL ORDER BY sort_order, created_at`, [h.hotelId], h.db);
      for (const r of rows) {
        const hours = hoursSchema.safeParse(r.data.hours ?? { mode: 'always' });
        if (!hours.success) continue;
        const hh = hours.data;
        const note = { note_en: hh.note_en ?? '', note_ar: hh.note_ar ?? '' };
        if (hh.mode === 'always') {
          out.push({ record_type: type, code: r.code, day: 'always', open: '', close: '', ...note });
          continue;
        }
        let first = true;
        for (const d of WEEKDAYS) {
          for (const range of hh.days[d] ?? []) {
            out.push({ record_type: type, code: r.code, day: d, open: range.open, close: range.close, ...(first ? note : { note_en: '', note_ar: '' }) });
            first = false;
          }
        }
        if (first) out.push({ record_type: type, code: r.code, day: 'closed', open: '', close: '', ...note });
      }
    }
    return out;
  },
  apply(sheet, ctx) {
    return applyGrouped<Hours>(sheet, ctx, {
      key: 'operating_hours',
      field: 'hours',
      isEmpty: (cur) => !cur || (cur as Hours).mode === 'always',
      async target(r, res) {
        const type = text(r.values.record_type).toLowerCase().replace(/[\s-]+/g, '_');
        const entity = HOURS_TARGETS[type];
        const c = toCode(r.values.code);
        if (!entity) return res.err(`Record Type must be one of: ${Object.keys(HOURS_TARGETS).join(', ')}`, 'record_type'), null;
        if (!c) return res.err('Code is required', 'code'), null;
        const row = await getEntityByCode(entity, ctx.hotelId, c, ctx.client);
        if (!row) return res.err(`${ENTITIES[entity].label.singular} ${c} not found`, 'code'), null;
        return { entity, row };
      },
      build(rows) {
        const hours: Hours = { mode: 'schedule', days: {}, note_en: '', note_ar: '' };
        let always = false;
        for (const { r, res } of rows) {
          const v = r.values;
          const day = text(v.day).toLowerCase().slice(0, 6);
          const d = (DAY_VALUES as readonly string[]).find((x) => x === day || (x.length === 3 && day.startsWith(x)));
          if (!d) {
            res.err(`Day must be one of: ${DAY_VALUES.join(', ')}`, 'day');
            continue;
          }
          if (!hours.note_en && !isBlank(v.note_en)) hours.note_en = text(v.note_en);
          if (!hours.note_ar && !isBlank(v.note_ar)) hours.note_ar = text(v.note_ar);
          if (d === 'always') {
            always = true;
            continue;
          }
          if (d === 'closed') continue;
          const open = time(v.open);
          const close = time(v.close);
          if (open.error !== undefined || !open.value) res.err(open.error ?? 'Opening time is required', 'open');
          if (close.error !== undefined || !close.value) res.err(close.error ?? 'Closing time is required', 'close');
          if (!open.value || !close.value) continue;
          for (const wd of d === 'daily' ? WEEKDAYS : [d as (typeof WEEKDAYS)[number]]) {
            const list = (hours.days[wd] ??= []);
            if (list.length >= 4) res.err(`At most 4 opening periods on ${wd}`, 'day');
            else list.push({ open: open.value, close: close.value });
          }
        }
        if (always) {
          if (Object.keys(hours.days).length) rows[0].res.warn('“always” overrides the listed opening times');
          return { mode: 'always', days: {}, note_en: hours.note_en, note_ar: hours.note_ar };
        }
        const parsed = hoursSchema.safeParse(hours);
        if (!parsed.success) return rows[0].res.err(parsed.error.issues[0].message), null;
        return parsed.data;
      },
    });
  },
};

// ============================== 18/19/20 Website draft lists ==============================
interface SiteListOptions<T extends { id: string }> {
  key: string;
  part: 'sections' | 'navigation';
  label: string;
  /** Which items of the list this sheet manages. */
  owns: (item: T) => boolean;
  build: (row: ParsedRow, res: Res, current: T | undefined, present: Set<string>) => T | null;
  toRow: (item: T, index: number) => Record<string, Cell>;
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string; path: PropertyKey[] }[] } } };
  max: number;
  idPrefix: string;
  titleOf: (row: ParsedRow) => string;
}

function slugId(prefix: string, title: string, taken: Set<string>) {
  const base = `${prefix}-${title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item'}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

async function readSiteList<T>(ctx: { client: ApplyContext['client']; hotelId: string } | HotelScope, part: string): Promise<T[]> {
  const db = 'client' in ctx ? ctx.client : ctx.db;
  const r = await one<{ v: T[] | null }>(`SELECT site_draft -> '${part === 'navigation' ? 'navigation' : 'sections'}' AS v FROM hotels WHERE id = $1`, [ctx.hotelId], db);
  return Array.isArray(r?.v) ? r!.v : [];
}

function siteListTemplate<T extends { id: string }>(meta: Omit<TemplateAdapter, 'exportRows' | 'apply'>, o: SiteListOptions<T>): TemplateAdapter {
  return {
    ...meta,
    async exportRows(h) {
      const list = await readSiteList<T>(h, o.part);
      return list.map((item, i) => ({ item, i })).filter(({ item }) => o.owns(item)).map(({ item, i }) => o.toRow(item, i));
    },
    async apply(sheet, ctx) {
      const present = new Set(sheet.columns);
      const list = [...(await readSiteList<T>(ctx, o.part))];
      const taken = new Set(list.map((x) => x.id));
      const order = new Map<string, number>();
      const seen = new Map<string, number>();
      const all: Res[] = [];
      let dirty = false;
      for (const r of sheet.rows) {
        const res = newResult(o.key, r, text(r.values.code), o.titleOf(r));
        all.push(res);
        const idx = res.code ? list.findIndex((x) => x.id === res.code) : -1;
        const current = idx >= 0 ? list[idx] : undefined;
        if (current && !o.owns(current)) res.err(`${res.code} belongs to another template (${o.part === 'sections' ? 'Homepage Sections / Custom Sections' : 'Navigation'})`, 'code');
        if (res.code && !/^[A-Za-z0-9_-]{1,64}$/.test(res.code)) res.err('Codes use letters, digits, - and _', 'code');
        if (res.code && seen.has(res.code)) (res.duplicate = true), res.err(`Duplicate of row ${seen.get(res.code)}`, 'code');
        if (res.code) seen.set(res.code, r.row);
        if (current && ctx.mode === 'create_only' && !res.hasErrors()) {
          res.action = 'skipped';
          res.warn('Already exists — skipped (CREATE ONLY never changes existing records)');
          continue;
        }
        const built = res.hasErrors() ? null : o.build(r, res, current, present);
        if (!built || res.hasErrors()) {
          res.action = 'error';
          continue;
        }
        if (!current) built.id = res.code || slugId(o.idPrefix, res.name || 'item', taken);
        const parsed = o.schema.safeParse(built);
        if (!parsed.success) {
          for (const iss of parsed.error!.issues) res.err(iss.message, String(iss.path[0] ?? ''));
          res.action = 'error';
          continue;
        }
        const item = parsed.data!;
        res.code = item.id;
        taken.add(item.id);
        if (present.has('sort_order') && !isBlank(r.values.sort_order)) {
          const n = int(r.values.sort_order);
          if (n.error !== undefined) {
            res.err(n.error, 'sort_order');
            res.action = 'error';
            continue;
          }
          order.set(item.id, n.value! - 1);
        }
        if (current) {
          if (sameState(current, item)) res.action = 'unchanged';
          else {
            list[idx] = item;
            res.action = 'update';
            dirty = true;
          }
        } else {
          if (list.length >= o.max) {
            res.err(`At most ${o.max} ${o.label.toLowerCase()}`);
            res.action = 'error';
            continue;
          }
          list.push(item);
          res.action = 'create';
          dirty = true;
        }
      }
      // Display Order positions the listed items; others keep their relative place.
      if (order.size) {
        // An explicit position wins over an item that is only there by its current index.
        const keyed = list.map((x, i) => ({ x, k: order.get(x.id) ?? i, explicit: order.has(x.id) ? 0 : 1, i }));
        keyed.sort((a, b) => a.k - b.k || a.explicit - b.explicit || a.i - b.i);
        const next = keyed.map((e) => e.x);
        if (next.some((x, i) => x !== list[i])) {
          dirty = true;
          for (const res of all) if (res.action === 'unchanged' && order.has(res.code)) res.action = 'update';
        }
        list.splice(0, list.length, ...next);
      }
      if (dirty && all.some((r) => r.action === 'create' || r.action === 'update')) {
        const lead = all.find((r) => r.action === 'create' || r.action === 'update')!;
        await inSavepoint(ctx, lead, async () => {
          const before = await readState(ctx.client, ctx.hotelId, 'site', o.part);
          await q(
            `UPDATE hotels SET site_draft = jsonb_set(COALESCE(site_draft, '{}'::jsonb), '{${o.part}}', $2::jsonb, true),
                    site_draft_updated_at = now(), draft_updated_at = now(), updated_at = now() WHERE id = $1`,
            [ctx.hotelId, JSON.stringify(list)],
            ctx.client
          );
          await track(ctx, { sheet: o.key, kind: 'site', ref: o.part, label: `Website ${o.label.toLowerCase()}`, op: 'update', before });
        });
      }
      return all.map(plain);
    },
  };
}

const pageList = { values: ['none', ...GUEST_PAGES], strict: true } as const;
const sectionCommon = (present: Set<string>, v: Record<string, Cell>, res: Res, cur: Partial<Section>) => {
  const out: Record<string, unknown> = { ...cur };
  for (const k of ['title_en', 'title_ar', 'subtitle_en', 'subtitle_ar'] as const) if (present.has(k)) out[k] = text(v[k]);
  if (present.has('visible')) {
    const b = bool(v.visible, cur.visible ?? true);
    if (b.error !== undefined) res.err(b.error, 'visible');
    else out.visible = b.value;
  }
  for (const [k, values] of [['layout', SECTION_LAYOUTS], ['background', SECTION_BACKGROUNDS]] as const) {
    if (!present.has(k) || isBlank(v[k])) continue;
    const s = text(v[k]).toLowerCase();
    if (!(values as readonly string[]).includes(s)) res.err(`Must be one of: ${values.join(', ')}`, k);
    else out[k] = s;
  }
  return out;
};

const SECTION_COLUMNS_BASE: ColumnDef[] = [
  { key: 'visible', header: 'Visible', hint: 'yes / no', list: yesNo, width: 10 },
  { key: 'title_en', header: 'Title (English)', hint: 'Leave empty to use the default title', width: 28 },
  { key: 'title_ar', header: 'Title (Arabic)', hint: '', width: 28 },
  { key: 'subtitle_en', header: 'Subtitle (English)', hint: '', width: 32 },
  { key: 'subtitle_ar', header: 'Subtitle (Arabic)', hint: '', width: 32 },
  { key: 'layout', header: 'Layout', hint: SECTION_LAYOUTS.join(', '), list: { values: SECTION_LAYOUTS, strict: true }, width: 12 },
  { key: 'background', header: 'Background', hint: SECTION_BACKGROUNDS.join(', '), list: { values: SECTION_BACKGROUNDS, strict: true }, width: 12 },
];

export const homepageSectionsTemplate = siteListTemplate<Section>(
  {
    key: 'homepage_sections',
    number: '18',
    title: 'Homepage Sections',
    title_ar: 'أقسام الصفحة الرئيسية',
    sheet: 'Homepage Sections',
    description: 'Order, visibility, titles and layout of the built-in homepage sections (draft — publish to go live).',
    modules: ['hotel'],
    async columns() {
      return [
        { key: 'code', header: 'Section Code', hint: 'Keep the exported code to update a section; leave empty to add one', example: 'dining', width: 18 },
        { key: 'type', header: 'Section Type', required: true, hint: SECTION_TYPES.filter((t) => t !== 'custom').join(', '), list: { values: SECTION_TYPES.filter((t) => t !== 'custom'), strict: true }, example: 'dining', width: 16 },
        ...SECTION_COLUMNS_BASE,
        { key: 'sort_order', header: 'Display Order', hint: 'Position on the homepage (1 = first)', width: 12 },
      ];
    },
  },
  {
    key: 'homepage_sections',
    part: 'sections',
    label: 'Sections',
    idPrefix: 'sec',
    max: 30,
    owns: (s) => s.type !== 'custom',
    titleOf: (r) => text(r.values.title_en) || text(r.values.type),
    schema: sectionSchema as never,
    build(r, res, cur, present) {
      const type = text(r.values.type).toLowerCase() || cur?.type || '';
      if (!(SECTION_TYPES as readonly string[]).includes(type) || type === 'custom') {
        res.err(type === 'custom' ? 'Custom sections go in the Custom Sections template' : `Section Type must be one of: ${SECTION_TYPES.filter((t) => t !== 'custom').join(', ')}`, 'type');
        return null;
      }
      return { ...sectionCommon(present, r.values, res, cur ?? {}), type } as Section;
    },
    toRow: (s, i) => ({ code: s.id, type: s.type, visible: s.visible ? 'yes' : 'no', title_en: s.title_en, title_ar: s.title_ar, subtitle_en: s.subtitle_en, subtitle_ar: s.subtitle_ar, layout: s.layout, background: s.background, sort_order: i + 1 }),
  }
);

export const customSectionsTemplate = siteListTemplate<Section>(
  {
    key: 'custom_sections',
    number: '20',
    title: 'Custom Sections',
    title_ar: 'أقسام مخصصة',
    sheet: 'Custom Sections',
    description: 'Free text, image + text, banner and call-to-action blocks on the homepage (draft — publish to go live).',
    modules: ['hotel'],
    async columns() {
      return [
        { key: 'code', header: 'Section Code', hint: 'Keep the exported code to update; leave empty to add a section', example: 'sec-ramadan', width: 18 },
        ...SECTION_COLUMNS_BASE,
        { key: 'image', header: 'Image URL', hint: 'https:// image link (optional)', media: 'image', width: 40 },
        { key: 'body_en', header: 'Text (English)', hint: 'Paragraph text', width: 44 },
        { key: 'body_ar', header: 'Text (Arabic)', hint: '', width: 44 },
        { key: 'cta_label_en', header: 'Button Label (English)', hint: 'Optional', width: 20 },
        { key: 'cta_label_ar', header: 'Button Label (Arabic)', hint: '', width: 20 },
        { key: 'cta_page', header: 'Button Opens', hint: `none or a page: ${GUEST_PAGES.join(', ')}`, list: pageList, width: 16 },
        { key: 'sort_order', header: 'Display Order', hint: 'Position on the homepage (1 = first)', width: 12 },
      ];
    },
  },
  {
    key: 'custom_sections',
    part: 'sections',
    label: 'Sections',
    idPrefix: 'sec',
    max: 30,
    owns: (s) => s.type === 'custom',
    titleOf: (r) => text(r.values.title_en),
    schema: sectionSchema as never,
    build(r, res, cur, present) {
      const v = r.values;
      const out = sectionCommon(present, v, res, cur ?? { layout: 'feature' });
      for (const k of ['body_en', 'body_ar', 'cta_label_en', 'cta_label_ar'] as const) if (present.has(k)) out[k] = text(v[k]);
      if (present.has('image')) {
        const m = mediaUrl(v.image);
        if (m.error !== undefined) res.err(m.error, 'image');
        else out.image = m.value;
      }
      if (present.has('cta_page') && !isBlank(v.cta_page)) {
        const p = text(v.cta_page).toLowerCase();
        if (!pageList.values.includes(p as never)) res.err(`Must be one of: ${pageList.values.join(', ')}`, 'cta_page');
        else out.cta_page = p;
      }
      if (!cur && !String(out.title_en ?? '').trim() && !String(out.body_en ?? '').trim()) res.err('A custom section needs a title or text', 'title_en');
      return { ...out, type: 'custom' } as Section;
    },
    toRow: (s, i) => ({ code: s.id, visible: s.visible ? 'yes' : 'no', title_en: s.title_en, title_ar: s.title_ar, subtitle_en: s.subtitle_en, subtitle_ar: s.subtitle_ar, layout: s.layout, background: s.background, image: s.image, body_en: s.body_en, body_ar: s.body_ar, cta_label_en: s.cta_label_en, cta_label_ar: s.cta_label_ar, cta_page: s.cta_page, sort_order: i + 1 }),
  }
);

export const navigationTemplate = siteListTemplate<NavItem>(
  {
    key: 'navigation',
    number: '19',
    title: 'Navigation',
    title_ar: 'قائمة التنقل',
    sheet: 'Navigation',
    description: 'Guest menu links: page, labels, visibility and bottom-bar shortcuts (draft — publish to go live).',
    modules: ['hotel'],
    async columns() {
      return [
        { key: 'code', header: 'Link Code', hint: 'Keep the exported code to update; leave empty to add a link', example: 'dining', width: 16 },
        { key: 'page', header: 'Page', required: true, hint: GUEST_PAGES.join(', '), list: { values: GUEST_PAGES, strict: true }, example: 'dining', width: 16 },
        { key: 'label_en', header: 'Label (English)', hint: 'Empty = default page name', width: 22 },
        { key: 'label_ar', header: 'Label (Arabic)', hint: '', width: 22 },
        { key: 'visible', header: 'Visible', hint: 'yes / no', list: yesNo, width: 10 },
        { key: 'in_bottom_bar', header: 'Bottom Bar', hint: 'yes = also a shortcut in the mobile bottom bar', list: yesNo, width: 12 },
        { key: 'sort_order', header: 'Display Order', hint: '1 = first', width: 12 },
      ];
    },
  },
  {
    key: 'navigation',
    part: 'navigation',
    label: 'Navigation links',
    idPrefix: 'nav',
    max: 12,
    owns: () => true,
    titleOf: (r) => text(r.values.label_en) || text(r.values.page),
    schema: navItemSchema as never,
    build(r, res, cur, present) {
      const v = r.values;
      const out: Record<string, unknown> = { ...(cur ?? {}) };
      const page = text(v.page).toLowerCase() || cur?.page;
      if (!page || !(GUEST_PAGES as readonly string[]).includes(page)) {
        res.err(`Page must be one of: ${GUEST_PAGES.join(', ')}`, 'page');
        return null;
      }
      out.page = page;
      for (const k of ['label_en', 'label_ar'] as const) if (present.has(k)) out[k] = text(v[k]);
      for (const k of ['visible', 'in_bottom_bar'] as const) {
        if (!present.has(k)) continue;
        const b = bool(v[k], (cur?.[k] as boolean | undefined) ?? k === 'visible');
        if (b.error !== undefined) res.err(b.error, k);
        else out[k] = b.value;
      }
      return out as NavItem;
    },
    toRow: (n, i) => ({ code: n.id, page: n.page, label_en: n.label_en, label_ar: n.label_ar, visible: n.visible ? 'yes' : 'no', in_bottom_bar: n.in_bottom_bar ? 'yes' : 'no', sort_order: i + 1 }),
  }
);
