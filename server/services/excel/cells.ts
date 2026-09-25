import { mediaUrlSchema, type FieldSpec } from '../../../shared/fields';
import type { Cell } from './types';

/**
 * Cell coercion shared by every adapter. Staff type values by hand, in
 * English or Arabic, sometimes with Arabic-Indic digits or Excel dates, so
 * every reader is lenient in what it accepts and precise in what it reports.
 */

export type Coerced<T> = { value: T; error?: undefined } | { value?: undefined; error: string };

const ARABIC_DIGITS: Record<string, string> = Object.fromEntries(
  [...'٠١٢٣٤٥٦٧٨٩'].map((d, i) => [d, String(i)]).concat([...'۰۱۲۳۴۵۶۷۸۹'].map((d, i) => [d, String(i)]))
);

export function isBlank(v: Cell | undefined): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

export function text(v: Cell | undefined): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  return String(v).trim();
}

export function code(v: Cell | undefined): string {
  return text(v).toUpperCase().replace(/\s+/g, '-');
}

const TRUE = new Set(['yes', 'y', 'true', '1', 'on', 'نعم', 'x', '✓']);
const FALSE = new Set(['no', 'n', 'false', '0', 'off', 'لا']);

export function bool(v: Cell | undefined, fallback: boolean): Coerced<boolean> {
  if (typeof v === 'boolean') return { value: v };
  if (isBlank(v)) return { value: fallback };
  const s = text(v).toLowerCase();
  if (TRUE.has(s)) return { value: true };
  if (FALSE.has(s)) return { value: false };
  return { error: `"${text(v)}" is not yes/no` };
}

export function num(v: Cell | undefined): Coerced<number | null> {
  if (typeof v === 'number') return Number.isFinite(v) ? { value: v } : { error: 'Not a number' };
  if (isBlank(v)) return { value: null };
  const s = text(v)
    .replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d])
    .replace(/٫/g, '.')
    .replace(/[,٬\s]/g, '')
    .replace(/^(SAR|AED|USD|EUR|ر\.س|﷼)/i, '')
    .replace(/(SAR|AED|USD|EUR|ر\.س|﷼)$/i, '');
  const n = Number(s);
  return s !== '' && Number.isFinite(n) ? { value: n } : { error: `"${text(v)}" is not a number` };
}

export function int(v: Cell | undefined): Coerced<number | null> {
  const n = num(v);
  if (n.error !== undefined || n.value === null) return n;
  return Number.isInteger(n.value) ? n : { error: `"${text(v)}" must be a whole number` };
}

/** Excel stores dates as days since 1899-12-30. */
function fromSerial(n: number): Date {
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

/** Offset of a time zone from UTC at a given instant, in ms. */
function tzOffset(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(at));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - at;
}

/** Wall-clock time in the hotel's time zone → UTC instant. */
function zonedToUtc(wall: number, tz: string): number {
  let t = wall - tzOffset(wall, tz);
  t = wall - tzOffset(t, tz); // second pass settles DST transitions
  return t;
}

/** UTC ISO instant → "YYYY-MM-DD HH:MM" in the hotel's time zone (export). */
export function localDateTime(iso: string, tz: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t + tzOffset(t, tz)).toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Dates typed in the sheet are the hotel's local time (no zone), unless the
 * text carries an explicit offset. Excel date cells arrive as UTC-labelled
 * wall-clock values and are treated the same way.
 */
export function dateTime(v: Cell | undefined, tz = 'UTC'): Coerced<string | null> {
  if (isBlank(v)) return { value: null };
  if (v instanceof Date) return { value: new Date(zonedToUtc(v.getTime(), tz)).toISOString() };
  if (typeof v === 'number' && v > 20000 && v < 80000) return { value: new Date(zonedToUtc(fromSerial(v).getTime(), tz)).toISOString() };
  const s = text(v).replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d]);
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(s);
  if (m) {
    const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0));
    if (Number.isNaN(wall) || Number(m[2]) > 12 || Number(m[3]) > 31) return { error: `"${s}" is not a valid date` };
    return { value: new Date(zonedToUtc(wall, tz)).toISOString() };
  }
  const t = Date.parse(s);
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) && !Number.isNaN(t) ? { value: new Date(t).toISOString() } : { error: `"${s}" is not a date (use YYYY-MM-DD or YYYY-MM-DD HH:MM)` };
}

/** HH:MM from a typed string, an Excel time fraction or a time-formatted cell. */
export function time(v: Cell | undefined): Coerced<string | null> {
  if (isBlank(v)) return { value: null };
  let minutes: number | null = null;
  if (v instanceof Date) minutes = v.getUTCHours() * 60 + v.getUTCMinutes();
  else if (typeof v === 'number' && v >= 0 && v < 1) minutes = Math.round(v * 24 * 60);
  else {
    const s = text(v).replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d]).toLowerCase();
    const m = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|ص|م)?$/.exec(s);
    if (m) {
      let h = Number(m[1]);
      const mi = Number(m[2] ?? 0);
      if (m[3] === 'pm' || m[3] === 'م') h = h === 12 ? 12 : h + 12;
      if ((m[3] === 'am' || m[3] === 'ص') && h === 12) h = 0;
      if (h === 24 && mi === 0) h = 0;
      if (h < 24 && mi < 60) minutes = h * 60 + mi;
    }
  }
  if (minutes === null || minutes >= 24 * 60) return { error: `"${text(v)}" is not a time (use HH:MM, 24h)` };
  return { value: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` };
}

export function mediaUrl(v: Cell | undefined): Coerced<string> {
  const s = text(v);
  const r = mediaUrlSchema.safeParse(s);
  return r.success ? { value: s } : { error: `"${s.slice(0, 80)}" is not a valid http(s) URL` };
}

export function urlList(v: Cell | undefined): Coerced<string[]> {
  const parts = text(v)
    .split(/[|\n]/)
    .map((u) => u.trim())
    .filter(Boolean);
  const bad = parts.filter((u) => !mediaUrlSchema.safeParse(u).success);
  if (bad.length) return { error: `Not a valid URL: ${bad[0].slice(0, 80)}` };
  if (parts.length > 24) return { error: 'At most 24 gallery images' };
  return { value: parts };
}

/** Matches a typed value against options by value or English/Arabic label. */
export function option(v: Cell | undefined, options: readonly { value: string; en: string; ar: string }[]): Coerced<string | undefined> {
  if (isBlank(v)) return { value: undefined };
  const s = text(v).toLowerCase();
  const hit = options.find((o) => o.value.toLowerCase() === s || o.en.toLowerCase() === s || o.ar === text(v));
  return hit ? { value: hit.value } : { error: `"${text(v)}" is not one of: ${options.map((o) => o.value).join(', ')}` };
}

/** Converts a raw cell into the typed value the entity schema expects for a field. */
export function fieldValue(f: FieldSpec, v: Cell | undefined, tz = 'UTC'): Coerced<unknown> {
  switch (f.type) {
    case 'boolean':
      return bool(v, (f.default as boolean) ?? false);
    case 'money':
    case 'number':
      return num(v);
    case 'tags': {
      if (isBlank(v)) return { value: [] };
      const out: string[] = [];
      for (const part of text(v).split(/[,،;|]/).map((s) => s.trim()).filter(Boolean)) {
        const o = option(part, f.options ?? []);
        if (o.error !== undefined) return { error: `Unknown value "${part}". Allowed: ${(f.options ?? []).map((x) => x.value).join(', ')}` };
        if (o.value) out.push(o.value);
      }
      return { value: [...new Set(out)] };
    }
    case 'select': {
      const o = option(v, f.options ?? []);
      if (o.error !== undefined) return o;
      return { value: o.value ?? (f.default as string | undefined) ?? f.options?.[0]?.value };
    }
    case 'department': {
      if (isBlank(v)) return { value: (f.default as string | undefined) ?? undefined };
      const c = text(v).toUpperCase().replace(/[\s&-]+/g, '_');
      return /^[A-Z][A-Z0-9_]{1,31}$/.test(c) ? { value: c } : { error: `"${text(v)}" is not a department code (e.g. HOUSEKEEPING)` };
    }
    case 'media':
    case 'video':
      return mediaUrl(v);
    case 'gallery':
      return urlList(v);
    case 'datetime':
      return dateTime(v, tz);
    case 'icon': {
      if (isBlank(v)) return { value: '' };
      const s = text(v).toLowerCase();
      return (f.options ?? []).some((o) => o.value === s) ? { value: s } : { error: `Unknown icon "${text(v)}" (see the Lists sheet)` };
    }
    default:
      return { value: text(v) };
  }
}

/** Formats a stored value back into a cell for export. */
export function toCell(f: FieldSpec | undefined, v: unknown, tz = 'UTC'): Cell {
  if (v == null) return null;
  if (f?.type === 'boolean' || typeof v === 'boolean') return v ? 'yes' : 'no';
  if (Array.isArray(v)) return v.join(f?.type === 'gallery' ? '|' : ', ');
  if (f?.type === 'datetime' && typeof v === 'string') return localDateTime(v, tz);
  if (typeof v === 'number') return v;
  return String(v);
}
