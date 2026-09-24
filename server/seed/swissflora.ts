import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { defaultSiteConfig } from '../../shared/defaults';
import type { EntityName } from '../../shared/entities';
import { brandingSchema, hotelProfileSchema, settingsSchema, type SiteConfig } from '../../shared/hotel';
import { one, q } from '../db';
import { createEntity } from '../repos/entities';
import { ensureDepartments, splitProfile } from '../repos/hotels';

/**
 * Swiss Flora Royal Hotel Riyadh — production seed built only from the data
 * extracted from the hotel's public website (server/seed/data). Service
 * definitions follow the operating brief; no prices or menu items are invented:
 * those must be entered by the hotel (or imported) before launch.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(here, 'data/swissflora_raw.json'), 'utf8'));
const royal = raw.hotels['11'];

const MEDIA_BASE = 'https://api.swissflorahotels.com/wwwroot/';
export const mediaUrl = (p: string) => MEDIA_BASE + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');

export function stripHtml(html: string): string {
  return String(html ?? '')
    .replace(/<\/(p|h\d|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export const SWISS_FLORA_SLUG = 'swiss-flora-royal';

type Seed = Record<string, unknown>;
const hours24: Seed = { mode: 'always', days: {}, note_en: '', note_ar: '' };

async function add(client: pg.PoolClient, hotelId: string, entity: EntityName, data: Seed, parent?: string) {
  return createEntity(entity, hotelId, { ...data, parent_id: parent ?? null }, client);
}

export async function seedSwissFlora(client: pg.PoolClient): Promise<{ id: string; created: boolean }> {
  const existing = await one<{ id: string }>('SELECT id FROM hotels WHERE slug = $1', [SWISS_FLORA_SLUG], client);
  if (existing) return { id: existing.id, created: false };

  const aboutEn = stripHtml(royal.about[0].descriptionEN).split('\n')[0];
  const aboutAr = stripHtml(royal.about[0].descriptionAR).split('\n')[0];

  const profile = hotelProfileSchema.parse({
    name_en: royal.hotel.nameEN,
    name_ar: royal.hotel.nameAR,
    slug: SWISS_FLORA_SLUG,
    stars: royal.hotel.stars,
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    language_mode: 'both',
    default_language: 'ar',
    vat_rate: 15,
    prices_include_vat: true,
    tagline_en: 'Swiss precision, Saudi hospitality',
    tagline_ar: 'الدقة السويسرية بضيافة سعودية',
    description_en: aboutEn,
    description_ar: aboutAr,
    address_en: royal.hotel.addressEN,
    address_ar: royal.hotel.addressAR,
    city_en: 'Riyadh',
    city_ar: 'الرياض',
    phone: royal.hotel.firstPhone,
    email: royal.hotel.email,
    website: 'https://swissflorahotels.com',
    map_url: 'https://www.google.com/maps/search/?api=1&query=Swiss+Flora+Royal+Hotel+Riyadh',
  });

  const gallery = royal.gallery.map((g: { path: string }) => ({ url: mediaUrl(g.path), caption_en: '', caption_ar: '' }));
  const branding = brandingSchema.parse({
    // Brand gold taken from the hotel's own website styling (rgb(166,134,51)).
    colors: {
      primary: '#233B33',
      secondary: '#15201C',
      accent: '#A68633',
      background: '#F7F4EE',
      surface: '#FFFFFF',
      text: '#1B211E',
      muted: '#66706A',
    },
    fonts: { ar: 'Tajawal', en: 'Plus Jakarta Sans', display: 'Cormorant Garamond' },
    gallery,
  });

  const site: SiteConfig = defaultSiteConfig();
  site.welcome.image = mediaUrl(royal.sliders[0].path);
  site.welcome.title_en = 'Welcome to Swiss Flora Royal';
  site.welcome.title_ar = 'أهلاً بكم في سويس فلورا رويال';
  site.hero.slides = royal.sliders.slice(0, 4).map((s: { path: string }, i: number) => ({
    id: `slide-${i + 1}`,
    media_type: 'image',
    image: mediaUrl(s.path),
    video: '',
    overlay: 45,
    headline_en: i === 0 ? 'Welcome to Swiss Flora Royal' : '',
    headline_ar: i === 0 ? 'أهلاً بكم في سويس فلورا رويال' : '',
    subtitle_en: i === 0 ? 'Everything you need during your stay — one tap away.' : '',
    subtitle_ar: i === 0 ? 'كل ما تحتاجه خلال إقامتك بلمسة واحدة.' : '',
    cta_label_en: i === 0 ? 'Order to your room' : '',
    cta_label_ar: i === 0 ? 'اطلب إلى غرفتك' : '',
    cta_page: i === 0 ? 'dining' : 'none',
    starts_at: null,
    ends_at: null,
    visible: true,
  }));

  const { slug, name_en, name_ar, profile: rest } = splitProfile(profile);
  const hotel = await one<{ id: string }>(
    `INSERT INTO hotels (slug, name_en, name_ar, profile, branding, settings, site_draft, site_published, site_published_at, is_published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7, now(), true) RETURNING id`,
    [slug, name_en, name_ar, JSON.stringify(rest), JSON.stringify(branding), JSON.stringify(settingsSchema.parse({ emergency_phone: royal.hotel.firstPhone })), JSON.stringify(site)],
    client
  );
  const hid = hotel!.id;
  await ensureDepartments(hid, client);
  await q(`UPDATE departments SET phone = $2 WHERE hotel_id = $1 AND code IN ('FRONT_OFFICE','CONCIERGE')`, [hid, royal.hotel.firstPhone], client);

  // ---------------------------------------------------------------- Dining outlets
  const galleryUrl = (needle: string) => gallery.find((g: { url: string }) => g.url.includes(needle))?.url ?? '';
  const outlets: Seed[] = [
    { name_en: 'Main Restaurant', name_ar: 'المطعم الرئيسي', type: 'restaurant', cover: galleryUrl('Grill-Room-Restaurant-3'), room_delivery: false },
    { name_en: 'Lobby Café', name_ar: 'مقهى اللوبي', type: 'cafe', cover: galleryUrl('Swiss-Cafe-Restaurant-Lounge-1') },
    { name_en: 'Swiss Café & Lounge', name_ar: 'سويس كافيه ولاونج', type: 'lounge', cover: galleryUrl('Swiss-Cafe-Restaurant-Lounge-2') },
    { name_en: 'Shisha', name_ar: 'الشيشة', type: 'shisha', external_orders: true },
    { name_en: 'In-Room Dining', name_ar: 'خدمة الطعام في الغرف', type: 'room_service', room_delivery: true, external_orders: false, tagline_en: 'Delivered to your door', tagline_ar: 'يصلك إلى باب غرفتك' },
    { name_en: 'Mini Bar', name_ar: 'الميني بار', type: 'minibar', external_orders: false, accepts_orders: true },
    { name_en: 'Pool Bar', name_ar: 'بار المسبح', type: 'pool_bar' },
  ];
  for (const o of outlets) await add(client, hid, 'outlets', { hours: hours24, accepts_orders: true, status_override: 'auto', ...o });

  // ---------------------------------------------------------------- Room services
  const rs = (name_en: string, name_ar: string, category: string, department: string, icon: string, extra: Seed = {}) => ({
    name_en, name_ar, category, department, icon, available: true, hours: hours24, ...extra,
  });
  const roomServices: Seed[] = [
    rs('Room cleaning', 'تنظيف الغرفة', 'housekeeping', 'HOUSEKEEPING', 'sparkles', { response_minutes: 30, custom_fields: [{ id: 'when', type: 'select', label_en: 'When', label_ar: 'متى', required: true, options: [{ value: 'now', en: 'Now', ar: 'الآن' }, { value: 'later', en: 'Later today', ar: 'لاحقاً اليوم' }] }] }),
    rs('Linen change', 'تغيير البياضات', 'housekeeping', 'HOUSEKEEPING', 'bed-double', { response_minutes: 30 }),
    rs('Extra towels', 'مناشف إضافية', 'amenities', 'HOUSEKEEPING', 'bath', { response_minutes: 15, allow_quantity: true, max_quantity: 6 }),
    rs('Extra pillows', 'وسائد إضافية', 'amenities', 'HOUSEKEEPING', 'moon', { response_minutes: 15, allow_quantity: true, max_quantity: 4 }),
    rs('Bathroom amenities', 'مستلزمات الحمام', 'amenities', 'HOUSEKEEPING', 'shower-head', { response_minutes: 15 }),
    rs('Drinking water', 'مياه الشرب', 'amenities', 'HOUSEKEEPING', 'droplets', { response_minutes: 15, allow_quantity: true, max_quantity: 6 }),
    rs('Luggage assistance', 'المساعدة في الأمتعة', 'assistance', 'FRONT_OFFICE', 'luggage', { response_minutes: 10 }),
    rs('Air-conditioning issue', 'مشكلة في التكييف', 'maintenance', 'MAINTENANCE', 'snowflake', { response_minutes: 20, custom_fields: [{ id: 'issue', type: 'select', label_en: 'What is happening?', label_ar: 'ما المشكلة؟', required: true, options: [{ value: 'too_warm', en: 'Too warm', ar: 'حار جداً' }, { value: 'too_cold', en: 'Too cold', ar: 'بارد جداً' }, { value: 'noise', en: 'Noisy', ar: 'صوت مرتفع' }, { value: 'not_working', en: 'Not working', ar: 'لا يعمل' }] }] }),
    rs('Electrical issue', 'مشكلة كهربائية', 'maintenance', 'MAINTENANCE', 'zap', { response_minutes: 20 }),
    rs('Bathroom issue', 'مشكلة في الحمام', 'maintenance', 'MAINTENANCE', 'droplets', { response_minutes: 20 }),
    rs('Other maintenance', 'صيانة أخرى', 'maintenance', 'MAINTENANCE', 'wrench', { response_minutes: 30 }),
    rs('Do not disturb', 'عدم الإزعاج', 'housekeeping', 'HOUSEKEEPING', 'bell-off', { description_en: 'Let housekeeping know you prefer not to be disturbed.', description_ar: 'أبلغ فريق التدبير المنزلي بعدم رغبتك في الإزعاج.' }),
    rs('Other request', 'طلب آخر', 'other', 'FRONT_OFFICE', 'message-circle', { note_prompt_en: 'Tell us what you need', note_prompt_ar: 'أخبرنا بما تحتاجه' }),
  ];
  const roomServiceIds: Record<string, string> = {};
  for (const s of roomServices) roomServiceIds[String(s.name_en)] = (await add(client, hid, 'room_services', s)).id;

  // ---------------------------------------------------------------- Hotel services
  const hs = (name_en: string, name_ar: string, category: string, department: string, icon: string, extra: Seed = {}) => ({
    name_en, name_ar, category, department, icon, available: true, requestable: true, hours: hours24, ...extra,
  });
  const hotelServices: Seed[] = [
    hs('Airport transfer', 'التوصيل من وإلى المطار', 'transport', 'CONCIERGE', 'plane', { description_en: 'King Khalid International Airport is about 15 km away.', description_ar: 'يبعد مطار الملك خالد الدولي حوالي 15 كم.', custom_fields: [{ id: 'direction', type: 'select', label_en: 'Direction', label_ar: 'الاتجاه', required: true, options: [{ value: 'to_airport', en: 'To the airport', ar: 'إلى المطار' }, { value: 'from_airport', en: 'From the airport', ar: 'من المطار' }] }, { id: 'date', type: 'date', label_en: 'Date', label_ar: 'التاريخ', required: true, options: [] }, { id: 'time', type: 'time', label_en: 'Time', label_ar: 'الوقت', required: true, options: [] }, { id: 'passengers', type: 'number', label_en: 'Passengers', label_ar: 'عدد الركاب', required: false, options: [] }] }),
    hs('Transportation & taxi', 'المواصلات وسيارات الأجرة', 'transport', 'CONCIERGE', 'car'),
    hs('Parking & valet', 'المواقف وخدمة صف السيارات', 'transport', 'FRONT_OFFICE', 'car'),
    hs('Wake-up call', 'مكالمة إيقاظ', 'concierge', 'FRONT_OFFICE', 'alarm-clock', { custom_fields: [{ id: 'time', type: 'time', label_en: 'Wake-up time', label_ar: 'وقت الإيقاظ', required: true, options: [] }] }),
    hs('Luggage storage', 'حفظ الأمتعة', 'concierge', 'FRONT_OFFICE', 'luggage'),
    hs('Concierge', 'الكونسيرج', 'concierge', 'CONCIERGE', 'concierge-bell', { description_en: 'Reservations, recommendations and local arrangements.', description_ar: 'الحجوزات والتوصيات والترتيبات المحلية.' }),
    hs('Business center', 'مركز الأعمال', 'business', 'FRONT_OFFICE', 'briefcase'),
    hs('Accessibility assistance', 'خدمات ذوي الاحتياجات الخاصة', 'accessibility', 'FRONT_OFFICE', 'accessibility', { description_en: 'Accessible rooms with support rails, roll-in showers and visual alarms are available.', description_ar: 'تتوفر غرف مهيأة بقضبان دعم ودش مفتوح وإنذارات مرئية.' }),
  ];
  for (const s of hotelServices) await add(client, hid, 'hotel_services', s);

  // ---------------------------------------------------------------- Wellness
  const spaDesc = stripHtml(royal.spa[0].descriptionEN).split('\n')[0];
  const spaDescAr = stripHtml(royal.spa[0].descriptionAR).split('\n')[0];
  const spaImg = (i: number) => mediaUrl(royal.spaSlider[i % royal.spaSlider.length].path);
  const cat = async (name_en: string, name_ar: string, icon: string, image: string, extra: Seed = {}) =>
    (await add(client, hid, 'spa_categories', { name_en, name_ar, icon, image, hours: hours24, ...extra })).id;
  const massage = await cat('Massage', 'المساج', 'hand-heart', galleryUrl('Front Massage Room 2'), { description_en: spaDesc, description_ar: spaDescAr });
  for (const [en, ar] of [
    ['Swedish massage', 'المساج السويدي'],
    ['Deep tissue massage', 'مساج الأنسجة العميقة'],
    ['Relaxation massage', 'مساج الاسترخاء'],
  ]) {
    await add(client, hid, 'spa_services', { name_en: en, name_ar: ar, available: true, bookable: true, max_guests: 2, hours: hours24 }, massage);
  }
  await cat('Manicure', 'مانيكير', 'sparkles', spaImg(1));
  await cat('Pedicure', 'باديكير', 'sparkles', spaImg(2));
  await cat('Jacuzzi', 'الجاكوزي', 'waves', spaImg(0));
  const pool = await cat('Inspirations Pool', 'حمام السباحة', 'waves', galleryUrl('shutterstock_645095311'));
  await add(client, hid, 'spa_services', { name_en: 'Indoor pool access', name_ar: 'استخدام المسبح الداخلي', available: true, bookable: false, price_note_en: 'Complimentary for in-house guests', price_note_ar: 'مجاناً لنزلاء الفندق', hours: hours24 }, pool);
  const gym = await cat('Inspirations Gym', 'النادي الرياضي', 'dumbbell', galleryUrl('Gym Area 1'));
  await add(client, hid, 'spa_services', { name_en: 'Gym access', name_ar: 'استخدام النادي الرياضي', available: true, bookable: false, price_note_en: 'Complimentary for in-house guests', price_note_ar: 'مجاناً لنزلاء الفندق', hours: hours24 }, gym);
  await cat('Sauna', 'الساونا', 'flower', spaImg(2));

  // ---------------------------------------------------------------- Guest information (real data only)
  const info = async (d: Seed) => add(client, hid, 'info_items', d);
  await info({ title_en: 'Address', title_ar: 'العنوان', category: 'stay', icon: 'map-pin', body_en: royal.hotel.addressEN, body_ar: royal.hotel.addressAR, link: profile.map_url });
  await info({ title_en: 'Reception', title_ar: 'الاستقبال', category: 'stay', icon: 'phone', highlight_en: royal.hotel.firstPhone, highlight_ar: royal.hotel.firstPhone, body_en: 'Available 24 hours a day.', body_ar: 'متاح على مدار الساعة.' });
  await info({ title_en: 'Email', title_ar: 'البريد الإلكتروني', category: 'stay', icon: 'message-circle', highlight_en: royal.hotel.email, highlight_ar: royal.hotel.email });
  const facilityIcons: Record<string, string> = { 'Inspirations Pool': 'waves', 'Inspirations Gym': 'dumbbell', Sauna: 'flower', 'Massage Room': 'hand-heart', 'Business Center': 'briefcase' };
  for (const f of royal.facilities) {
    await info({ title_en: f.nameEn, title_ar: f.nameAr, category: 'facilities', icon: facilityIcons[f.nameEn] ?? 'sparkles' });
  }
  for (const d of royal.destinations) {
    await info({ title_en: d.titleEN, title_ar: d.titleAR, category: 'nearby', icon: 'compass', highlight_en: `${d.distance} km`, highlight_ar: `${d.distance} كم` });
  }

  // ---------------------------------------------------------------- Quick actions
  const qa = async (d: Seed) => add(client, hid, 'quick_actions', d);
  await qa({ label_en: 'Order food', label_ar: 'اطلب الطعام', icon: 'utensils', action: 'page', page: 'dining' });
  await qa({ label_en: 'Housekeeping', label_ar: 'التدبير المنزلي', icon: 'sparkles', action: 'room_service', room_service_id: roomServiceIds['Room cleaning'] });
  await qa({ label_en: 'Extra towels', label_ar: 'مناشف إضافية', icon: 'bath', action: 'room_service', room_service_id: roomServiceIds['Extra towels'] });
  await qa({ label_en: 'A/C problem', label_ar: 'مشكلة تكييف', icon: 'snowflake', action: 'room_service', room_service_id: roomServiceIds['Air-conditioning issue'] });
  await qa({ label_en: 'Maintenance', label_ar: 'الصيانة', icon: 'wrench', action: 'room_service', room_service_id: roomServiceIds['Other maintenance'] });
  await qa({ label_en: 'Luggage', label_ar: 'الأمتعة', icon: 'luggage', action: 'room_service', room_service_id: roomServiceIds['Luggage assistance'] });
  await qa({ label_en: 'Laundry pickup', label_ar: 'استلام الغسيل', icon: 'shirt', action: 'page', page: 'laundry' });
  await qa({ label_en: 'Spa booking', label_ar: 'حجز السبا', icon: 'flower', action: 'page', page: 'spa' });
  await qa({ label_en: 'Call reception', label_ar: 'اتصل بالاستقبال', icon: 'phone', action: 'call', department: 'FRONT_OFFICE' });
  await qa({ label_en: 'Concierge', label_ar: 'الكونسيرج', icon: 'concierge-bell', action: 'page', page: 'services' });
  await qa({ label_en: 'Complaint or suggestion', label_ar: 'شكوى أو اقتراح', icon: 'message-circle', action: 'feedback' });
  await qa({ label_en: 'Emergency', label_ar: 'الطوارئ', icon: 'siren', action: 'call', department: 'FRONT_OFFICE', emphasis: true });

  return { id: hid, created: true };
}
