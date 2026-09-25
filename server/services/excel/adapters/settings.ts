import { z } from 'zod';
import { LANGUAGE_MODES } from '../../../../shared/domain';
import { phoneSchema } from '../../../../shared/fields';
import { hotelProfileSchema } from '../../../../shared/hotel';
import { one, q } from '../../../db';
import { getHotelRow, hydrate, splitProfile } from '../../../repos/hotels';
import { bool, int, isBlank, num, text } from '../cells';
import { readState, sameState, track } from '../state';
import type { ApplyContext, Cell, ColumnDef, RowResult, TemplateAdapter } from '../types';
import { SeenKeys, inSavepoint, newResult, plain } from './shared';

// ============================== 01 Hotel profile ==============================
type ProfileCol = ColumnDef & { kind: 'text' | 'number' | 'int' | 'bool' | 'social' };
const SOCIAL = ['instagram', 'x', 'facebook', 'snapchat', 'tiktok', 'youtube', 'linkedin'] as const;
const PROFILE_COLUMNS: ProfileCol[] = [
  { key: 'name_en', header: 'Hotel Name (English)', required: true, kind: 'text', hint: 'Official hotel name', example: 'Swiss Flora Royal', width: 30 },
  { key: 'name_ar', header: 'Hotel Name (Arabic)', required: true, kind: 'text', hint: 'Arabic hotel name', example: 'سويس فلورا رويال', width: 30 },
  { key: 'stars', header: 'Stars', kind: 'int', hint: '1–7', list: { values: ['1', '2', '3', '4', '5', '6', '7'], strict: false }, width: 8 },
  { key: 'currency', header: 'Currency', kind: 'text', hint: 'ISO code, e.g. SAR', list: { values: ['SAR', 'AED', 'USD', 'EUR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'JOD'], strict: false }, width: 10 },
  { key: 'timezone', header: 'Time Zone', kind: 'text', hint: 'e.g. Asia/Riyadh', width: 18 },
  { key: 'language_mode', header: 'Languages', kind: 'text', hint: 'both, ar (Arabic only) or en (English only)', list: { values: LANGUAGE_MODES, strict: true }, width: 12 },
  { key: 'default_language', header: 'Default Language', kind: 'text', hint: 'ar or en', list: { values: ['ar', 'en'], strict: true }, width: 12 },
  { key: 'vat_rate', header: 'VAT %', kind: 'number', hint: 'e.g. 15', width: 8 },
  { key: 'prices_include_vat', header: 'Prices Include VAT', kind: 'bool', hint: 'yes / no', list: { values: ['yes', 'no'], strict: true }, width: 12 },
  ...(['tagline', 'description', 'address', 'city'] as const).flatMap((k) => [
    { key: `${k}_en`, header: `${k[0].toUpperCase()}${k.slice(1)} (English)`, kind: 'text' as const, hint: '', width: k === 'description' ? 44 : 28 },
    { key: `${k}_ar`, header: `${k[0].toUpperCase()}${k.slice(1)} (Arabic)`, kind: 'text' as const, hint: '', width: k === 'description' ? 44 : 28 },
  ]),
  { key: 'phone', header: 'Phone', kind: 'text', hint: '+966 11 000 0000', width: 18 },
  { key: 'email', header: 'Email', kind: 'text', hint: 'Public contact email', width: 24 },
  { key: 'website', header: 'Website', kind: 'text', hint: 'https:// link', width: 28 },
  { key: 'map_url', header: 'Map Link', kind: 'text', hint: 'Google Maps link', width: 28 },
  { key: 'latitude', header: 'Latitude', kind: 'number', hint: '-90 to 90', width: 12 },
  { key: 'longitude', header: 'Longitude', kind: 'number', hint: '-180 to 180', width: 12 },
  ...SOCIAL.map((s) => ({ key: `social_${s}`, header: `${s === 'x' ? 'X (Twitter)' : s[0].toUpperCase() + s.slice(1)} Link`, kind: 'social' as const, hint: 'https:// link', width: 26 })),
];

/** Blank cells keep these (they can never be empty). */
const KEEP_WHEN_BLANK = new Set(['name_en', 'name_ar', 'timezone', 'language_mode', 'default_language', 'currency']);

export const hotelProfileTemplate: TemplateAdapter = {
  key: 'hotel_profile',
  number: '01',
  title: 'Hotel Profile',
  title_ar: 'ملف الفندق',
  sheet: 'Hotel Profile',
  description: 'Name, contact details, currency, VAT and languages. One row.',
  modules: ['hotel'],
  async columns() {
    return PROFILE_COLUMNS.map(({ kind: _k, ...c }) => c);
  },
  async exportRows(h) {
    const row = await getHotelRow(h.hotelId, h.db);
    if (!row) return [];
    const p = hydrate(row).profile as Record<string, unknown>;
    const out: Record<string, Cell> = {};
    for (const c of PROFILE_COLUMNS) {
      const v = c.kind === 'social' ? (p.social as Record<string, string>)?.[c.key.slice(7)] : p[c.key];
      out[c.key] = typeof v === 'boolean' ? (v ? 'yes' : 'no') : (v as Cell) ?? '';
    }
    return [out];
  },
  async apply(sheet, ctx) {
    const results: RowResult[] = [];
    const present = new Set(sheet.columns);
    for (const [i, r] of sheet.rows.entries()) {
      const res = newResult('hotel_profile', r, '', text(r.values.name_en));
      results.push(res);
      if (i > 0) {
        res.err('The hotel profile has exactly one row — remove the extra rows');
        res.action = 'error';
        continue;
      }
      if (ctx.mode === 'create_only') {
        res.action = 'skipped';
        res.warn('The profile always exists — skipped (CREATE ONLY never changes existing records)');
        continue;
      }
      const row = (await getHotelRow(ctx.hotelId, ctx.client))!;
      const current = hydrate(row).profile as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...current, social: { ...(current.social as object) } };
      for (const c of PROFILE_COLUMNS) {
        if (!present.has(c.key)) continue;
        const v = r.values[c.key];
        if (c.kind === 'social') {
          const social = merged.social as Record<string, string>;
          if (isBlank(v)) delete social[c.key.slice(7)];
          else social[c.key.slice(7)] = text(v);
        }
        else if (c.kind === 'bool') {
          const b = bool(v, current[c.key] as boolean);
          if (b.error !== undefined) res.err(b.error, c.key);
          else merged[c.key] = b.value;
        } else if (c.kind === 'number' || c.kind === 'int') {
          const n = c.kind === 'int' ? int(v) : num(v);
          if (n.error !== undefined) res.err(n.error, c.key);
          else merged[c.key] = n.value ?? (c.key === 'latitude' || c.key === 'longitude' ? null : current[c.key]);
        } else if (isBlank(v) && KEEP_WHEN_BLANK.has(c.key)) merged[c.key] = current[c.key];
        else merged[c.key] = c.key === 'currency' ? text(v).toUpperCase() : text(v);
      }
      const parsed = hotelProfileSchema.safeParse(merged);
      if (!parsed.success) for (const iss of parsed.error.issues) res.err(iss.message, String(iss.path[0] === 'social' ? `social_${String(iss.path[1])}` : iss.path[0]));
      if (res.hasErrors()) {
        res.action = 'error';
        continue;
      }
      const next = parsed.data!;
      if (sameState(current, next)) {
        res.action = 'unchanged';
        continue;
      }
      await inSavepoint(ctx, res, async () => {
        const before = await readState(ctx.client, ctx.hotelId, 'hotel_profile', ctx.hotelId);
        const { slug, name_en, name_ar, profile } = splitProfile(next);
        await q('UPDATE hotels SET slug=$2, name_en=$3, name_ar=$4, profile=$5, updated_at=now(), draft_updated_at=now() WHERE id=$1', [ctx.hotelId, slug, name_en, name_ar, JSON.stringify(profile)], ctx.client);
        res.action = 'update';
        await track(ctx, { sheet: 'hotel_profile', kind: 'hotel_profile', ref: ctx.hotelId, label: 'Hotel profile', op: 'update', before });
      });
    }
    return results.map(plain);
  },
};

// ============================== 02 Departments / 03 WhatsApp routing ==============================
const deptCodeRe = /^[A-Z][A-Z0-9_]{1,31}$/;
const deptCode = (v: Cell | undefined) => text(v).toUpperCase().replace(/[\s&-]+/g, '_');

interface DeptRow {
  code: string;
  name_en: string;
  name_ar: string;
  whatsapp: string;
  phone: string;
  email: string;
  is_active: boolean;
  sla_minutes: number | null;
  sort_order: number;
  is_custom: boolean;
}

async function listDepartments(hotelId: string, db: ApplyContext['client'] | Parameters<TemplateAdapter['columns']>[0]['db']) {
  return q<DeptRow>('SELECT code, name_en, name_ar, whatsapp, phone, email, is_active, sla_minutes, sort_order, is_custom FROM departments WHERE hotel_id = $1 ORDER BY is_custom, sort_order, code', [hotelId], db);
}

export const departmentsTemplate: TemplateAdapter = {
  key: 'departments',
  number: '02',
  title: 'Departments',
  title_ar: 'الأقسام',
  sheet: 'Departments',
  description: 'Built-in and hotel-defined departments that receive guest requests.',
  modules: ['hotel'],
  async columns() {
    return [
      { key: 'code', header: 'Department Code', required: true, hint: 'Capital letters, digits and _ — e.g. KIDS_CLUB. Existing codes are updated, new codes are added.', example: 'KIDS_CLUB', width: 20 },
      { key: 'name_en', header: 'Name (English)', required: true, hint: 'Shown to staff and in WhatsApp messages', example: 'Kids Club', width: 26 },
      { key: 'name_ar', header: 'Name (Arabic)', required: true, hint: '', example: 'نادي الأطفال', width: 26 },
      { key: 'active', header: 'Active', hint: 'yes / no', list: { values: ['yes', 'no'], strict: true }, width: 10 },
      { key: 'sla_minutes', header: 'Response Target (min)', hint: 'Minutes before a request is flagged late (optional)', width: 14 },
      { key: 'sort_order', header: 'Display Order', hint: 'Whole number (optional)', width: 12 },
    ];
  },
  async exportRows(h) {
    return (await listDepartments(h.hotelId, h.db)).map((d) => ({ code: d.code, name_en: d.name_en, name_ar: d.name_ar, active: d.is_active ? 'yes' : 'no', sla_minutes: d.sla_minutes, sort_order: d.sort_order }));
  },
  async apply(sheet, ctx) {
    const present = new Set(sheet.columns);
    const seen = new SeenKeys();
    const results: RowResult[] = [];
    for (const r of sheet.rows) {
      const v = r.values;
      const res = newResult('departments', r, deptCode(v.code), text(v.name_en));
      results.push(res);
      if (!deptCodeRe.test(res.code)) res.err('Use capital letters, digits and _ (e.g. KIDS_CLUB)', 'code');
      const first = seen.check(res.code, r.row);
      if (first !== null) (res.duplicate = true), res.err(`Duplicate of row ${first}`, 'code');
      const existing = res.code ? await one<DeptRow>('SELECT * FROM departments WHERE hotel_id = $1 AND code = $2', [ctx.hotelId, res.code], ctx.client) : null;
      const next: DeptRow = existing ? { ...existing } : { code: res.code, name_en: '', name_ar: '', whatsapp: '', phone: '', email: '', is_active: true, sla_minutes: null, sort_order: 0, is_custom: true };
      for (const k of ['name_en', 'name_ar'] as const) if (present.has(k) && !isBlank(v[k])) next[k] = text(v[k]);
      if (present.has('active')) {
        const b = bool(v.active, next.is_active);
        if (b.error !== undefined) res.err(b.error, 'active');
        else next.is_active = b.value;
      }
      if (present.has('sla_minutes')) {
        const n = int(v.sla_minutes);
        if (n.error !== undefined || (n.value !== null && (n.value < 1 || n.value > 1440))) res.err('Response target must be 1–1440 minutes', 'sla_minutes');
        else next.sla_minutes = n.value;
      }
      if (present.has('sort_order') && !isBlank(v.sort_order)) {
        const n = int(v.sort_order);
        if (n.error !== undefined) res.err(n.error, 'sort_order');
        else next.sort_order = n.value ?? next.sort_order;
      }
      for (const k of ['name_en', 'name_ar'] as const) if (next[k].length < 2 || next[k].length > 80) res.err(`${k === 'name_en' ? 'English' : 'Arabic'} name must be 2–80 characters`, k);
      if (existing && ctx.mode === 'create_only' && !res.hasErrors()) {
        res.action = 'skipped';
        res.warn('Already exists — skipped (CREATE ONLY never changes existing records)');
        continue;
      }
      if (res.hasErrors()) {
        res.action = 'error';
        continue;
      }
      if (existing && sameState(existing, next)) {
        res.action = 'unchanged';
        continue;
      }
      await inSavepoint(ctx, res, async () => {
        if (existing) {
          const before = await readState(ctx.client, ctx.hotelId, 'department', res.code);
          await q('UPDATE departments SET name_en=$3, name_ar=$4, is_active=$5, sla_minutes=$6, sort_order=$7, updated_at=now() WHERE hotel_id=$1 AND code=$2', [ctx.hotelId, res.code, next.name_en, next.name_ar, next.is_active, next.sla_minutes, next.sort_order], ctx.client);
          res.action = 'update';
          await track(ctx, { sheet: 'departments', kind: 'department', ref: res.code, label: `Department ${res.code}`, op: 'update', before });
        } else {
          const n = present.has('sort_order') && !isBlank(v.sort_order) ? next.sort_order : ((await one<{ n: number }>('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM departments WHERE hotel_id = $1', [ctx.hotelId], ctx.client))?.n ?? 1);
          await q(
            `INSERT INTO departments (hotel_id, code, name_en, name_ar, is_active, sla_minutes, is_custom, sort_order) VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
            [ctx.hotelId, res.code, next.name_en, next.name_ar, next.is_active, next.sla_minutes, n],
            ctx.client
          );
          res.action = 'create';
          await track(ctx, { sheet: 'departments', kind: 'department', ref: res.code, label: `Department ${res.code}`, op: 'create', before: null });
        }
      });
    }
    return results.map(plain);
  },
};

const emailSchema = z.union([z.literal(''), z.string().email()]);

export const whatsappRoutingTemplate: TemplateAdapter = {
  key: 'whatsapp_routing',
  number: '03',
  title: 'WhatsApp Routing',
  title_ar: 'توجيه واتساب',
  sheet: 'WhatsApp Routing',
  description: 'WhatsApp number, phone and email for each department.',
  modules: ['hotel'],
  updateOnly: true,
  async columns(h) {
    const codes = (await listDepartments(h.hotelId, h.db)).map((d) => d.code);
    return [
      { key: 'code', header: 'Department Code', required: true, hint: 'Existing department (add new ones in the Departments template)', list: { values: codes, strict: false }, example: 'FNB', width: 20 },
      { key: 'name_en', header: 'Department (reference)', hint: 'For reference only — not imported', width: 26 },
      { key: 'whatsapp', header: 'WhatsApp Number', hint: 'International format, e.g. +966 5x xxx xxxx. Requests for this department are sent here.', example: '+966 55 000 0000', width: 22 },
      { key: 'phone', header: 'Phone / Extension', hint: 'Shown to guests for calls', width: 18 },
      { key: 'email', header: 'Email', hint: 'Optional', width: 26 },
    ];
  },
  async exportRows(h) {
    return (await listDepartments(h.hotelId, h.db)).map((d) => ({ code: d.code, name_en: d.name_en, whatsapp: d.whatsapp, phone: d.phone, email: d.email }));
  },
  async apply(sheet, ctx) {
    const present = new Set(sheet.columns);
    const seen = new SeenKeys();
    const results: RowResult[] = [];
    for (const r of sheet.rows) {
      const v = r.values;
      const res = newResult('whatsapp_routing', r, deptCode(v.code), text(v.name_en));
      results.push(res);
      const first = seen.check(res.code, r.row);
      if (first !== null) (res.duplicate = true), res.err(`Duplicate of row ${first}`, 'code');
      const existing = await one<DeptRow>('SELECT * FROM departments WHERE hotel_id = $1 AND code = $2', [ctx.hotelId, res.code], ctx.client);
      if (!existing) res.err(`Department ${res.code || '(empty)'} not found — add it in the Departments template first`, 'code');
      if (ctx.mode === 'create_only' && !res.hasErrors()) {
        res.action = 'skipped';
        res.warn('Routing only updates existing departments — skipped in CREATE ONLY mode');
        continue;
      }
      if (res.hasErrors() || !existing) {
        res.action = 'error';
        continue;
      }
      res.name = existing.name_en;
      const next = { ...existing };
      for (const k of ['whatsapp', 'phone'] as const) {
        if (!present.has(k)) continue;
        const p = phoneSchema.safeParse(text(v[k]));
        if (!p.success) res.err(p.error.issues[0].message, k);
        else next[k] = p.data;
      }
      if (present.has('email')) {
        const e = emailSchema.safeParse(text(v.email));
        if (!e.success) res.err('Not a valid email address', 'email');
        else next.email = e.data;
      }
      if (next.is_active && !next.whatsapp) res.warn('No WhatsApp number — requests for this department use the fallback department', 'whatsapp');
      if (res.hasErrors()) {
        res.action = 'error';
        continue;
      }
      if (sameState(existing, next)) {
        res.action = 'unchanged';
        continue;
      }
      await inSavepoint(ctx, res, async () => {
        const before = await readState(ctx.client, ctx.hotelId, 'department', res.code);
        await q('UPDATE departments SET whatsapp=$3, phone=$4, email=$5, updated_at=now() WHERE hotel_id=$1 AND code=$2', [ctx.hotelId, res.code, next.whatsapp, next.phone, next.email], ctx.client);
        res.action = 'update';
        await track(ctx, { sheet: 'whatsapp_routing', kind: 'department', ref: res.code, label: `WhatsApp routing ${res.code}`, op: 'update', before });
      });
    }
    return results.map(plain);
  },
};

