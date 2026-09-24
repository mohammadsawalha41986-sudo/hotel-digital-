import { z } from 'zod';

/**
 * Field specifications are the single source of truth for every editable
 * catalog entity. From one spec we derive:
 *  - the zod validation schema enforced by the API,
 *  - the admin form,
 *  - spreadsheet import/export columns.
 */

export type FieldType =
  | 'i18n' // name_en + name_ar
  | 'i18nText' // multi-line bilingual
  | 'text'
  | 'textarea'
  | 'number'
  | 'money'
  | 'boolean'
  | 'select'
  | 'tags'
  | 'media' // image URL (uploaded or external)
  | 'gallery' // list of image URLs
  | 'video'
  | 'phone'
  | 'url'
  | 'datetime'
  | 'department'
  | 'icon'
  | 'hours'
  | 'modifiers'
  | 'customFields'
  | 'ref';

export interface FieldOption {
  value: string;
  en: string;
  ar: string;
}

export interface FieldSpec {
  key: string;
  type: FieldType;
  label: string;
  help?: string;
  required?: boolean;
  default?: unknown;
  options?: readonly FieldOption[];
  min?: number;
  max?: number;
  /** For ref fields: the entity whose ids are valid values. */
  refEntity?: string;
  /** Show only when another field has one of the given values. */
  showIf?: { field: string; in: readonly unknown[] };
  /** Excluded from spreadsheet import/export (structured JSON fields). */
  noImport?: boolean;
  /** Admin form layout hint. */
  wide?: boolean;
  /** Staff-only: never included in the guest bundle. */
  private?: boolean;
  /** Recommended image specification (media fields). */
  imageSpec?: string;
}

// ---------------------------------------------------------------------------
// Structured value schemas
// ---------------------------------------------------------------------------
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)');

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const timeRangeSchema = z.object({ open: hhmm, close: hhmm });
export type TimeRange = z.infer<typeof timeRangeSchema>;

export const hoursSchema = z.object({
  mode: z.enum(['always', 'schedule']),
  days: z
    .object(Object.fromEntries(WEEKDAYS.map((d) => [d, z.array(timeRangeSchema).max(4)])) as Record<
      Weekday,
      z.ZodArray<typeof timeRangeSchema>
    >)
    .partial()
    .default({}),
  note_en: z.string().max(200).optional().default(''),
  note_ar: z.string().max(200).optional().default(''),
});
export type Hours = z.infer<typeof hoursSchema>;

export const modifierOptionSchema = z.object({
  id: z.string().min(1).max(64),
  name_en: z.string().min(1).max(120),
  name_ar: z.string().max(120).default(''),
  price: z.number().min(0).max(100000).default(0),
  available: z.boolean().default(true),
});

export const MODIFIER_KINDS = ['size', 'addon', 'preference', 'extra', 'remove', 'choice'] as const;

export const modifierGroupSchema = z
  .object({
    id: z.string().min(1).max(64),
    kind: z.enum(MODIFIER_KINDS).default('choice'),
    name_en: z.string().min(1).max(120),
    name_ar: z.string().max(120).default(''),
    min: z.number().int().min(0).max(20).default(0),
    max: z.number().int().min(1).max(20).default(1),
    options: z.array(modifierOptionSchema).min(1).max(40),
  })
  .refine((g) => g.min <= g.max, { message: 'Minimum selections cannot exceed maximum' })
  .refine((g) => g.min <= g.options.length, { message: 'Minimum selections exceed available options' });
export type ModifierGroup = z.infer<typeof modifierGroupSchema>;
export type ModifierOption = z.infer<typeof modifierOptionSchema>;

export const CUSTOM_FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'date', 'time', 'boolean'] as const;
export const customFieldSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, 'Use lowercase letters, digits and _'),
  type: z.enum(CUSTOM_FIELD_TYPES),
  label_en: z.string().min(1).max(120),
  label_ar: z.string().max(120).default(''),
  required: z.boolean().default(false),
  options: z.array(z.object({ value: z.string().min(1).max(80), en: z.string().max(120), ar: z.string().max(120) })).max(30).default([]),
});
export type CustomField = z.infer<typeof customFieldSchema>;

// ---------------------------------------------------------------------------
// Media validation
// ---------------------------------------------------------------------------
/** Accepts absolute http(s) URLs or files served by this API under /media/. */
export const mediaUrlSchema = z
  .string()
  .max(2000)
  .refine((v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v) || /^\/media\/[A-Za-z0-9._\-/]+$/.test(v), {
    message: 'Enter a valid http(s) URL or upload a file',
  });

export const IMAGE_URL_PATTERN = /\.(avif|webp|png|jpe?g|gif|svg)(\?.*)?$/i;
export const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|m3u8)(\?.*)?$|youtube\.com|youtu\.be|vimeo\.com/i;

export const phoneSchema = z
  .string()
  .max(24)
  .refine((v) => v === '' || /^\+?[0-9\s-]{7,20}$/.test(v), { message: 'Enter a valid phone number, e.g. +966 5x xxx xxxx' });

// ---------------------------------------------------------------------------
// Schema derivation
// ---------------------------------------------------------------------------
function textSchema(max: number, required: boolean) {
  const base = z.string().trim().max(max);
  return required ? base.min(1, 'Required') : base.default('');
}

/** Returns the storage keys a field occupies (i18n fields occupy two). */
export function fieldKeys(f: FieldSpec): string[] {
  return f.type === 'i18n' || f.type === 'i18nText' ? [`${f.key}_en`, `${f.key}_ar`] : [f.key];
}

export function buildEntitySchema(fields: readonly FieldSpec[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    const req = !!f.required;
    switch (f.type) {
      case 'i18n':
        shape[`${f.key}_en`] = textSchema(200, req);
        shape[`${f.key}_ar`] = textSchema(200, false);
        break;
      case 'i18nText':
        shape[`${f.key}_en`] = textSchema(4000, false);
        shape[`${f.key}_ar`] = textSchema(4000, false);
        break;
      case 'text':
      case 'icon':
        shape[f.key] = textSchema(300, req);
        break;
      case 'textarea':
        shape[f.key] = textSchema(4000, req);
        break;
      case 'number': {
        let n = z.number({ error: 'Must be a number' });
        if (f.min !== undefined) n = n.min(f.min);
        if (f.max !== undefined) n = n.max(f.max);
        shape[f.key] = req ? n : n.nullable().default(null);
        break;
      }
      case 'money': {
        const n = z.number({ error: 'Must be a number' }).min(0).max(1_000_000);
        shape[f.key] = req ? n : n.nullable().default(null);
        break;
      }
      case 'boolean':
        shape[f.key] = z.boolean().default((f.default as boolean) ?? false);
        break;
      case 'select': {
        const values = (f.options ?? []).map((o) => o.value) as [string, ...string[]];
        const e = z.enum(values);
        shape[f.key] = req ? e : e.default(((f.default as string) ?? values[0]) as never);
        break;
      }
      case 'tags': {
        const values = (f.options ?? []).map((o) => o.value) as [string, ...string[]];
        shape[f.key] = z.array(z.enum(values)).max(values.length).default(((f.default as string[] | undefined) ?? []) as never);
        break;
      }
      case 'gallery':
        shape[f.key] = z.array(mediaUrlSchema.refine((v) => v !== '', 'Empty image URL')).max(24).default([]);
        break;
      case 'media':
      case 'video':
        shape[f.key] = req ? mediaUrlSchema.refine((v) => v !== '', 'Required') : mediaUrlSchema.default('');
        break;
      case 'url':
        shape[f.key] = z
          .string()
          .max(2000)
          .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Must start with http:// or https://')
          .default('');
        break;
      case 'phone':
        shape[f.key] = phoneSchema.default('');
        break;
      case 'datetime':
        shape[f.key] = z
          .string()
          .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Invalid date')
          .nullable()
          .default(null)
          .transform((v) => (v ? v : null));
        break;
      case 'department': {
        // Existence in the hotel's department list is checked by the API.
        const e = z.string().regex(/^[A-Z][A-Z0-9_]{1,31}$/, 'Choose a department');
        shape[f.key] = f.default ? e.default(f.default as string) : e;
        break;
      }
      case 'hours':
        shape[f.key] = hoursSchema.default({ mode: 'always', days: {}, note_en: '', note_ar: '' });
        break;
      case 'modifiers':
        shape[f.key] = z.array(modifierGroupSchema).max(15).default([]);
        break;
      case 'customFields':
        shape[f.key] = z.array(customFieldSchema).max(15).default([]);
        break;
      case 'ref':
        shape[f.key] = req ? z.string().uuid('Select an item') : z.string().uuid().nullable().default(null);
        break;
    }
  }
  return z.object(shape);
}

export function defaultValues(fields: readonly FieldSpec[]): Record<string, unknown> {
  const parsed = buildEntitySchema(fields.map((f) => ({ ...f, required: false }))).safeParse({});
  return parsed.success ? (parsed.data as Record<string, unknown>) : {};
}

// ---------------------------------------------------------------------------
// Option catalogues
// ---------------------------------------------------------------------------
const opt = (value: string, en: string, ar: string): FieldOption => ({ value, en, ar });

export const ALLERGENS = [
  opt('gluten', 'Gluten', 'الغلوتين'),
  opt('dairy', 'Dairy', 'الألبان'),
  opt('eggs', 'Eggs', 'البيض'),
  opt('nuts', 'Tree nuts', 'المكسرات'),
  opt('peanuts', 'Peanuts', 'الفول السوداني'),
  opt('soy', 'Soy', 'الصويا'),
  opt('fish', 'Fish', 'السمك'),
  opt('shellfish', 'Shellfish', 'المحار'),
  opt('sesame', 'Sesame', 'السمسم'),
  opt('mustard', 'Mustard', 'الخردل'),
  opt('celery', 'Celery', 'الكرفس'),
] as const;

export const DIETARY = [
  opt('vegetarian', 'Vegetarian', 'نباتي'),
  opt('vegan', 'Vegan', 'نباتي صرف'),
  opt('gluten_free', 'Gluten free', 'خالٍ من الغلوتين'),
  opt('dairy_free', 'Dairy free', 'خالٍ من الألبان'),
  opt('healthy', 'Healthy choice', 'خيار صحي'),
  opt('keto', 'Keto', 'كيتو'),
  opt('signature', 'Signature', 'طبق مميز'),
] as const;

export const SPICY_LEVELS = [
  opt('0', 'Not spicy', 'غير حار'),
  opt('1', 'Mild', 'حار خفيف'),
  opt('2', 'Medium', 'حار متوسط'),
  opt('3', 'Hot', 'حار جداً'),
] as const;

export const VAT_MODES = [
  opt('inherit', 'Hotel default', 'إعداد الفندق'),
  opt('inclusive', 'Price includes VAT', 'السعر شامل الضريبة'),
  opt('exclusive', 'VAT added to price', 'تضاف الضريبة'),
  opt('exempt', 'VAT exempt', 'معفى من الضريبة'),
] as const;
export type VatMode = 'inherit' | 'inclusive' | 'exclusive' | 'exempt';

export const OUTLET_TYPES = [
  opt('restaurant', 'Restaurant', 'مطعم'),
  opt('cafe', 'Café', 'مقهى'),
  opt('lounge', 'Lounge', 'لاونج'),
  opt('bar', 'Bar', 'بار'),
  opt('pool_bar', 'Pool bar', 'بار المسبح'),
  opt('shisha', 'Shisha', 'شيشة'),
  opt('room_service', 'In-room dining', 'خدمة الطعام في الغرف'),
  opt('minibar', 'Mini bar', 'الميني بار'),
  opt('other', 'Other', 'أخرى'),
] as const;

export const STATUS_OVERRIDES = [
  opt('auto', 'Follow opening hours', 'حسب ساعات العمل'),
  opt('open', 'Force open', 'مفتوح دائماً'),
  opt('closed', 'Closed', 'مغلق'),
] as const;

export const ICONS = [
  'sparkles', 'bed-double', 'bath', 'shirt', 'wrench', 'snowflake', 'zap', 'droplets', 'luggage', 'phone',
  'concierge-bell', 'utensils', 'coffee', 'wine', 'flower', 'dumbbell', 'waves', 'car', 'plane', 'alarm-clock',
  'briefcase', 'accessibility', 'map-pin', 'wifi', 'shield', 'siren', 'message-circle', 'star', 'heart',
  'moon', 'sun', 'baby', 'key', 'package', 'pill', 'baggage-claim', 'bell-off', 'shower-head', 'lamp',
  'trash', 'info', 'clock', 'circle-parking', 'car-taxi-front', 'building', 'utensils-crossed', 'cake', 'soup', 'sandwich',
  'ice-cream', 'cigarette', 'hand-heart', 'spray-can', 'fan', 'tv', 'plug', 'door-open', 'scroll', 'compass',
] as const;
export const ICON_OPTIONS: readonly FieldOption[] = ICONS.map((i) => opt(i, i, i));
