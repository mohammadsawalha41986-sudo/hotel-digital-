import { z } from 'zod';
import {
  DEPARTMENTS,
  FEEDBACK_TYPES,
  GUEST_PAGES,
  GUEST_TYPES,
  LANGUAGE_MODES,
  LAUNDRY_SERVICES,
  SECTION_BACKGROUNDS,
  SECTION_LAYOUTS,
  SECTION_TYPES,
  URGENCIES,
} from './domain';
import { mediaUrlSchema, phoneSchema } from './fields';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color, e.g. #872033');
const str = (max: number) => z.string().trim().max(max).default('');
const url = z
  .string()
  .max(2000)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Must start with http:// or https://')
  .default('');

// ---------------------------------------------------------------------------
// Hotel profile, branding, settings
// ---------------------------------------------------------------------------
export const hotelProfileSchema = z.object({
  name_en: z.string().trim().min(2).max(160),
  name_ar: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and single hyphens only'),
  stars: z.number().int().min(1).max(7).default(5),
  currency: z.string().regex(/^[A-Z]{3}$/).default('SAR'),
  timezone: z.string().min(3).max(64).default('Asia/Riyadh'),
  language_mode: z.enum(LANGUAGE_MODES).default('both'),
  default_language: z.enum(['en', 'ar']).default('ar'),
  vat_rate: z.number().min(0).max(50).default(15),
  prices_include_vat: z.boolean().default(true),
  tagline_en: str(200),
  tagline_ar: str(200),
  description_en: str(4000),
  description_ar: str(4000),
  address_en: str(400),
  address_ar: str(400),
  city_en: str(100),
  city_ar: str(100),
  phone: phoneSchema.default(''),
  email: z.union([z.literal(''), z.string().email()]).default(''),
  website: url,
  map_url: url,
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  social: z
    .object({
      instagram: url,
      x: url,
      facebook: url,
      snapchat: url,
      tiktok: url,
      youtube: url,
      linkedin: url,
    })
    .partial()
    .default({}),
});
export type HotelProfile = z.infer<typeof hotelProfileSchema>;

export const FONT_CHOICES = {
  ar: ['Tajawal', 'Cairo', 'IBM Plex Sans Arabic', 'Noto Kufi Arabic', 'Almarai', 'Readex Pro'],
  en: ['Plus Jakarta Sans', 'Inter', 'Manrope', 'DM Sans', 'Lato', 'Montserrat'],
  display: ['Cormorant Garamond', 'Playfair Display', 'Marcellus', 'DM Serif Display', 'Fraunces', 'Plus Jakarta Sans'],
} as const;

export const brandingSchema = z.object({
  logo: mediaUrlSchema.default(''),
  logo_inverse: mediaUrlSchema.default(''),
  favicon: mediaUrlSchema.default(''),
  colors: z
    .object({
      primary: hex.default('#7A2434'),
      secondary: hex.default('#1F1A17'),
      accent: hex.default('#B8955A'),
      background: hex.default('#F8F5F0'),
      surface: hex.default('#FFFFFF'),
      text: hex.default('#1F1A17'),
      muted: hex.default('#6F665E'),
    })
    .default({
      primary: '#7A2434',
      secondary: '#1F1A17',
      accent: '#B8955A',
      background: '#F8F5F0',
      surface: '#FFFFFF',
      text: '#1F1A17',
      muted: '#6F665E',
    }),
  fonts: z
    .object({
      ar: z.string().max(60).default('Tajawal'),
      en: z.string().max(60).default('Plus Jakarta Sans'),
      display: z.string().max(60).default('Cormorant Garamond'),
    })
    .default({ ar: 'Tajawal', en: 'Plus Jakarta Sans', display: 'Cormorant Garamond' }),
  gallery: z.array(z.object({ url: mediaUrlSchema, caption_en: str(200), caption_ar: str(200) })).max(60).default([]),
});
export type Branding = z.infer<typeof brandingSchema>;

export const settingsSchema = z.object({
  reviews_enabled: z.boolean().default(true),
  external_guests_enabled: z.boolean().default(true),
  require_phone: z.boolean().default(true),
  /** Department used when a request's department has no WhatsApp number. */
  fallback_department: z.enum(DEPARTMENTS).nullable().default('FRONT_OFFICE'),
  emergency_phone: phoneSchema.default(''),
  /** Dialling code applied to local numbers (e.g. 0555… → +966555…). */
  default_country_code: z.string().regex(/^[1-9][0-9]{0,3}$/, 'Digits only, e.g. 966').default('966'),
});
export type HotelSettings = z.infer<typeof settingsSchema>;

// ---------------------------------------------------------------------------
// Website (homepage) configuration: edited as a draft, then published
// ---------------------------------------------------------------------------
const i18n = { en: str(200), ar: str(200) };

export const heroSlideSchema = z.object({
  id: z.string().min(1).max(64),
  media_type: z.enum(['image', 'video']).default('image'),
  image: mediaUrlSchema.default(''),
  video: mediaUrlSchema.default(''),
  overlay: z.number().min(0).max(90).default(40),
  headline_en: i18n.en,
  headline_ar: i18n.ar,
  subtitle_en: str(400),
  subtitle_ar: str(400),
  cta_label_en: i18n.en,
  cta_label_ar: i18n.ar,
  cta_page: z.enum(['none', ...GUEST_PAGES]).default('none'),
  starts_at: z.string().nullable().default(null),
  ends_at: z.string().nullable().default(null),
  visible: z.boolean().default(true),
});
export type HeroSlide = z.infer<typeof heroSlideSchema>;

export const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(SECTION_TYPES),
  visible: z.boolean().default(true),
  title_en: i18n.en,
  title_ar: i18n.ar,
  subtitle_en: str(400),
  subtitle_ar: str(400),
  layout: z.enum(SECTION_LAYOUTS).default('carousel'),
  background: z.enum(SECTION_BACKGROUNDS).default('default'),
  image: mediaUrlSchema.default(''),
  body_en: str(4000),
  body_ar: str(4000),
  cta_label_en: i18n.en,
  cta_label_ar: i18n.ar,
  cta_page: z.enum(['none', ...GUEST_PAGES]).default('none'),
});
export type Section = z.infer<typeof sectionSchema>;

export const navItemSchema = z.object({
  id: z.string().min(1).max(64),
  page: z.enum(GUEST_PAGES),
  label_en: i18n.en,
  label_ar: i18n.ar,
  visible: z.boolean().default(true),
  in_bottom_bar: z.boolean().default(false),
});
export type NavItem = z.infer<typeof navItemSchema>;

export const siteConfigSchema = z.object({
  welcome: z
    .object({
      title_en: str(200),
      title_ar: str(200),
      message_en: str(600),
      message_ar: str(600),
      image: mediaUrlSchema.default(''),
      video: mediaUrlSchema.default(''),
    })
    .default({ title_en: '', title_ar: '', message_en: '', message_ar: '', image: '', video: '' }),
  hero: z
    .object({ slides: z.array(heroSlideSchema).max(10).default([]), autoplay_seconds: z.number().min(0).max(30).default(6) })
    .default({ slides: [], autoplay_seconds: 6 }),
  sections: z.array(sectionSchema).max(30).default([]),
  navigation: z.array(navItemSchema).max(12).default([]),
});
export type SiteConfig = z.infer<typeof siteConfigSchema>;

// ---------------------------------------------------------------------------
// Guest request payloads (public API)
// ---------------------------------------------------------------------------
export const guestIdentitySchema = z
  .object({
    type: z.enum(GUEST_TYPES),
    name: z.string().trim().min(2, 'Please enter your name').max(100),
    phone: z
      .string()
      .trim()
      .max(24)
      .refine((v) => v === '' || /^\+?[0-9\s-]{7,20}$/.test(v), 'Enter a valid phone number'),
    room: z.string().trim().max(12).default(''),
  })
  .refine((g) => g.type !== 'IN_HOUSE' || /^[A-Za-z0-9-]{1,12}$/.test(g.room), {
    message: 'Room number is required for in-house guests',
    path: ['room'],
  });
export type GuestIdentity = z.infer<typeof guestIdentitySchema>;

const answers = z.record(z.string().max(64), z.union([z.string().max(1000), z.number(), z.boolean()])).default({});
const notes = z.string().trim().max(1000).default('');

export const orderPayloadSchema = z.object({
  kind: z.literal('ORDER'),
  outlet_id: z.string().uuid(),
  lines: z
    .array(
      z.object({
        item_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
        modifiers: z.record(z.string().max(64), z.array(z.string().max(64)).max(20)).default({}),
        note: z.string().trim().max(300).default(''),
      })
    )
    .min(1, 'Your basket is empty')
    .max(60),
  notes,
});

export const servicePayloadSchema = z.object({
  kind: z.enum(['ROOM_SERVICE', 'HOTEL_SERVICE']),
  service_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(50).default(1),
  answers,
  notes,
});

export const spaPayloadSchema = z.object({
  kind: z.literal('SPA'),
  service_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a time'),
  guests: z.number().int().min(1).max(20).default(1),
  answers,
  notes,
});

export const laundryPayloadSchema = z.object({
  kind: z.literal('LAUNDRY'),
  lines: z
    .array(z.object({ item_id: z.string().uuid(), service: z.enum(LAUNDRY_SERVICES), quantity: z.number().int().min(1).max(100) }))
    .min(1, 'Add at least one item')
    .max(80),
  express: z.boolean().default(false),
  pickup: z.string().trim().min(1, 'Choose a pickup time').max(40),
  notes,
});

export const feedbackPayloadSchema = z.object({
  kind: z.literal('FEEDBACK'),
  feedback_type: z.enum(FEEDBACK_TYPES),
  about_department: z.enum(DEPARTMENTS).nullable().default(null),
  subject: z.string().trim().min(3, 'Add a short subject').max(160),
  message: z.string().trim().min(5, 'Tell us a little more').max(3000),
  urgency: z.enum(URGENCIES).default('NORMAL'),
  attachment: mediaUrlSchema.default(''),
});

export const guestRequestSchema = z.object({
  guest: guestIdentitySchema,
  lang: z.enum(['en', 'ar']).default('en'),
  payload: z.discriminatedUnion('kind', [
    orderPayloadSchema,
    servicePayloadSchema,
    spaPayloadSchema,
    laundryPayloadSchema,
    feedbackPayloadSchema,
  ]),
});
export type GuestRequestInput = z.input<typeof guestRequestSchema>;

export const guestSessionSchema = z.object({
  guest: guestIdentitySchema,
  lang: z.enum(['en', 'ar']).default('en'),
  /** QR when the guest arrived through a printed code (?qr=1 / ?room=). */
  entry: z.enum(['QR', 'GUEST_PORTAL']).default('GUEST_PORTAL'),
});

export const reviewInputSchema = z.object({
  guest_name: z.string().trim().min(2).max(80),
  room: z.string().trim().max(12).default(''),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).default(''),
  body: z.string().trim().min(5).max(1500),
  lang: z.enum(['en', 'ar']).default('en'),
});
