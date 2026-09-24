import type pg from 'pg';
import { DEPARTMENTS, type DepartmentCode } from '../../shared/domain';
import { defaultSiteConfig } from '../../shared/defaults';
import { brandingSchema, hotelProfileSchema, settingsSchema } from '../../shared/hotel';
import { one, q } from '../db';
import { createEntity } from '../repos/entities';
import { ensureDepartments, splitProfile } from '../repos/hotels';

/**
 * Migrates hotels created with the previous Firebase version of the product.
 *
 * Input is a Firestore JSON export in the `node-firestore-import-export`
 * layout: { hotels: { <id>: { ...fields, __collections__: { outlets: {...}, … } } } }.
 * Every record goes through the same validation as the admin API, and every
 * skipped record is reported — nothing is dropped silently.
 */
type Doc = Record<string, any>;
export interface ImportReport {
  hotel: string;
  hotelId: string;
  created: Record<string, number>;
  skipped: { what: string; reason: string }[];
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const url = (v: unknown) => (typeof v === 'string' && /^https?:\/\//.test(v) ? v : '');
const phone = (v: unknown) => (typeof v === 'string' && /^\+?[0-9\s-]{7,20}$/.test(v.trim()) ? v.trim() : '');
const docs = (col: unknown): Doc[] =>
  col && typeof col === 'object' ? Object.entries(col as Record<string, Doc>).map(([id, d]): Doc => ({ id, ...d })).sort((a: Doc, b: Doc) => (num(a.sort_order) ?? 0) - (num(b.sort_order) ?? 0)) : [];

const OUTLET_TYPES: Record<string, string> = { restaurant: 'restaurant', cafe: 'cafe', lounge: 'lounge', bar: 'bar', pool_bar: 'pool_bar', room_service: 'room_service', in_room_dining: 'room_service', minibar: 'minibar', shisha: 'shisha' };
const DEPT_MAP: Record<string, DepartmentCode> = {
  fnb: 'FNB', dining: 'FNB', restaurant: 'FNB', room_service: 'FNB', housekeeping: 'HOUSEKEEPING', hk: 'HOUSEKEEPING',
  engineering: 'MAINTENANCE', maintenance: 'MAINTENANCE', mnt: 'MAINTENANCE', front_office: 'FRONT_OFFICE', reception: 'FRONT_OFFICE', fo: 'FRONT_OFFICE',
  concierge: 'CONCIERGE', con: 'CONCIERGE', valet: 'CONCIERGE', laundry: 'LAUNDRY', ldy: 'LAUNDRY', spa: 'SPA', wellness: 'SPA', health_club: 'SPA',
  management: 'MANAGEMENT', gm: 'MANAGEMENT', complaints: 'MANAGEMENT', feedback: 'FEEDBACK',
};
const dept = (v: unknown, fallback: DepartmentCode): DepartmentCode => DEPT_MAP[str(v).toLowerCase()] ?? ((DEPARTMENTS as readonly string[]).includes(str(v).toUpperCase()) ? (str(v).toUpperCase() as DepartmentCode) : fallback);

function modifiers(groups: unknown) {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((g) => g && Array.isArray(g.options) && g.options.length)
    .map((g: Doc, i: number) => {
      const multiple = g.type === 'multiple';
      const min = num(g.min_selection) ?? (g.is_required ? 1 : 0);
      const max = num(g.max_selection) ?? (multiple ? g.options.length : 1);
      return {
        id: str(g.id) || `grp_${i}`,
        kind: 'choice',
        name_en: str(g.title_en) || `Options ${i + 1}`,
        name_ar: str(g.title_ar),
        min: Math.min(min, max),
        max: Math.max(1, max),
        options: g.options.map((o: Doc, k: number) => ({ id: str(o.id) || `opt_${k}`, name_en: str(o.name_en) || `Option ${k + 1}`, name_ar: str(o.name_ar), price: Math.max(0, num(o.price_delta) ?? 0), available: true })),
      };
    });
}

export async function importFirestoreHotel(client: pg.PoolClient, hotelKey: string, h: Doc): Promise<ImportReport> {
  const cols: Record<string, unknown> = h.__collections__ ?? {};
  const report: ImportReport = { hotel: str(h.name_en) || hotelKey, hotelId: '', created: {}, skipped: [] };
  const count = (k: string) => (report.created[k] = (report.created[k] ?? 0) + 1);
  const theme = docs(cols.branding).find((d) => d.id === 'theme') ?? {};

  const slug = (str(h.slug) || hotelKey).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  if (await one('SELECT 1 FROM hotels WHERE slug = $1', [slug], client)) throw new Error(`A hotel with slug "${slug}" already exists — refusing to merge into it.`);

  const profile = hotelProfileSchema.parse({
    name_en: str(h.name_en) || slug,
    name_ar: str(h.name_ar) || str(h.name_en) || slug,
    slug,
    stars: Math.min(7, Math.max(1, num(h.classification_stars) ?? 5)),
    currency: /^[A-Z]{3}$/.test(str(h.currency)) ? str(h.currency) : 'SAR',
    timezone: str(h.timezone) || 'Asia/Riyadh',
    default_language: h.default_language === 'en' ? 'en' : 'ar',
    tagline_en: str(h.tagline_en), tagline_ar: str(h.tagline_ar),
    description_en: str(h.description_en), description_ar: str(h.description_ar),
    address_en: str(h.address_en), address_ar: str(h.address_ar),
    city_en: str(h.city_en), city_ar: str(h.city_ar),
    phone: phone(h.phone), email: /^\S+@\S+\.\S+$/.test(str(h.email)) ? str(h.email) : '',
    website: url(h.website_url), map_url: url(h.google_maps_url),
    social: Object.fromEntries(Object.entries(h.social_links ?? {}).map(([k, v]) => [k === 'twitter' ? 'x' : k, url(v)]).filter(([k, v]) => v && ['instagram', 'x', 'facebook', 'snapchat', 'tiktok', 'youtube', 'linkedin'].includes(k as string))),
  });
  const colors = { primary: theme.primary, secondary: theme.secondary, accent: theme.accent, background: theme.background, surface: theme.surface, text: theme.text, muted: theme.muted };
  const branding = brandingSchema.parse({
    logo: url(h.logo_url),
    favicon: url(h.favicon_url),
    colors: Object.fromEntries(Object.entries({ ...brandingSchema.parse({}).colors, ...colors }).map(([k, v]) => [k, /^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : (brandingSchema.parse({}).colors as Record<string, string>)[k]])),
    gallery: (Array.isArray(h.hero_images) ? h.hero_images : []).map(url).filter(Boolean).map((u: string) => ({ url: u, caption_en: '', caption_ar: '' })),
  });
  const site = defaultSiteConfig();
  site.hero.slides = branding.gallery.slice(0, 5).map((g, i) => ({ id: `slide-${i + 1}`, media_type: 'image' as const, image: g.url, video: '', overlay: 45, headline_en: i === 0 ? profile.name_en : '', headline_ar: i === 0 ? profile.name_ar : '', subtitle_en: '', subtitle_ar: '', cta_label_en: '', cta_label_ar: '', cta_page: 'none' as const, starts_at: null, ends_at: null, visible: true }));

  const { name_en, name_ar, profile: rest } = splitProfile(profile);
  const row = await one<{ id: string }>(
    `INSERT INTO hotels (slug, name_en, name_ar, profile, branding, settings, site_draft, site_published, site_published_at, is_published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7, now(), false) RETURNING id`,
    [slug, name_en, name_ar, JSON.stringify(rest), JSON.stringify(branding), JSON.stringify(settingsSchema.parse({})), JSON.stringify(site)],
    client
  );
  const hid = row!.id;
  report.hotelId = hid;
  await ensureDepartments(hid, client);

  const safe = async (what: string, fn: () => Promise<unknown>) => {
    await client.query('SAVEPOINT fs_item');
    try {
      await fn();
      await client.query('RELEASE SAVEPOINT fs_item');
      return true;
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT fs_item');
      const fields = (e as { details?: { fields?: Record<string, string> } }).details?.fields;
      report.skipped.push({ what, reason: fields ? Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('; ') : (e as Error).message });
      return false;
    }
  };

  // WhatsApp routing lines
  const routing = docs(cols.private).find((d) => d.id === 'departmentRouting');
  for (const line of Array.isArray(routing?.lines) ? routing!.lines : []) {
    const code = dept(line.department_code, 'FRONT_OFFICE');
    const wa = phone(line.whatsapp_number);
    if (!wa) {
      report.skipped.push({ what: `routing ${line.department_code}`, reason: 'invalid WhatsApp number' });
      continue;
    }
    await q('UPDATE departments SET whatsapp = $3, is_active = $4 WHERE hotel_id = $1 AND code = $2', [hid, code, wa, line.is_enabled !== false], client);
    count('whatsapp_routes');
  }
  if (!routing && phone(h.whatsapp_number)) {
    await q(`UPDATE departments SET whatsapp = $2 WHERE hotel_id = $1 AND code = 'FRONT_OFFICE'`, [hid, phone(h.whatsapp_number)], client);
    count('whatsapp_routes');
  }

  // Outlets with embedded menus
  for (const o of docs(cols.outlets)) {
    const name = str(o.name_en) || str(o.nameEn);
    let outletId = '';
    const ok = await safe(`outlet ${name || o.id}`, async () => {
      const rec = await createEntity('outlets', hid, {
        name_en: name, name_ar: str(o.name_ar) || str(o.nameAr),
        type: OUTLET_TYPES[str(o.outlet_type || o.type).toLowerCase()] ?? 'other',
        tagline_en: str(o.short_description_en), tagline_ar: str(o.short_description_ar),
        description_en: str(o.full_description_en) || str(o.descriptionEn), description_ar: str(o.full_description_ar) || str(o.descriptionAr),
        cover: url(o.hero_image) || url(o.image), phone: phone(o.contact?.phone), whatsapp: o.contact?.whatsapp_enabled ? phone(o.contact?.whatsapp_number) : '',
        status_override: o.operating_info?.status_override === 'closed' ? 'closed' : 'auto',
        hours: { mode: 'always', days: {}, note_en: str(o.operating_info?.opening_hours_en), note_ar: str(o.operating_info?.opening_hours_ar) },
        is_active: o.is_active !== false && o.active !== false,
        accepts_orders: o.menuEnabled !== false,
      }, client);
      outletId = rec.id;
    });
    if (!ok) continue;
    count('outlets');
    const categories: Doc[] = Array.isArray(o.menu_categories) ? o.menu_categories : [];
    if (!categories.length) continue;
    const menu = await createEntity('menus', hid, { name_en: 'Menu', name_ar: 'القائمة', parent_id: outletId }, client);
    count('menus');
    for (const c of categories) {
      let catId = '';
      if (!(await safe(`category ${str(c.name_en)}`, async () => {
        catId = (await createEntity('menu_categories', hid, { name_en: str(c.name_en), name_ar: str(c.name_ar), description_en: str(c.description_en), description_ar: str(c.description_ar), image: url(c.image), is_active: c.is_active !== false, parent_id: menu.id }, client)).id;
      }))) continue;
      count('menu_categories');
      for (const it of Array.isArray(c.items) ? c.items : []) {
        const price = num(it.offer_price) ?? num(it.price);
        if (price == null) {
          report.skipped.push({ what: `item ${str(it.name_en)}`, reason: 'missing price' });
          continue;
        }
        if (await safe(`item ${str(it.name_en)}`, () =>
          createEntity('menu_items', hid, {
            name_en: str(it.name_en), name_ar: str(it.name_ar), description_en: str(it.description_en), description_ar: str(it.description_ar),
            price, image: url(it.image), calories: num(it.calories), featured: !!it.is_featured, recommended: !!(it.is_recommended || it.is_chef_choice),
            available: it.is_available !== false && !it.is_sold_out, spicy: it.is_spicy ? '1' : '0', dietary: it.is_vegetarian ? ['vegetarian'] : [],
            modifiers: modifiers(it.option_groups), parent_id: catId,
          }, client)
        )) count('menu_items');
      }
    }
  }

  // Offers
  for (const o of docs(cols.offers)) {
    const title = str(o.title_en) || str(o.titleEn);
    if (await safe(`offer ${title || o.id}`, () =>
      createEntity('offers', hid, {
        title_en: title, title_ar: str(o.title_ar) || str(o.titleAr), description_en: str(o.description_en) || str(o.descriptionEn), description_ar: str(o.description_ar) || str(o.descriptionAr),
        image: url(o.image_url) || url(o.image), badge_en: str(o.badge_en) || str(o.badgeEn), badge_ar: str(o.badge_ar) || str(o.badgeAr),
        price_label_en: num(o.offer_price) ? `${profile.currency} ${num(o.offer_price)}` : '', ends_at: str(o.valid_until) || str(o.validUntil) || null,
        placement: ['home'], is_active: o.is_active !== false && o.active !== false,
      }, client)
    )) count('offers');
  }

  // Wellness: one category per service type
  const spaCats = new Map<string, string>();
  for (const w of docs(cols.wellness)) {
    const type = str(w.service_type) || 'spa';
    if (!spaCats.has(type)) {
      const label = type.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
      spaCats.set(type, (await createEntity('spa_categories', hid, { name_en: label, name_ar: label, hours: { mode: 'always', days: {}, note_en: '', note_ar: '' } }, client)).id);
      count('spa_categories');
    }
    if (await safe(`wellness ${str(w.name_en)}`, () =>
      createEntity('spa_services', hid, {
        name_en: str(w.name_en), name_ar: str(w.name_ar), description_en: str(w.full_description_en) || str(w.short_description_en), description_ar: str(w.full_description_ar) || str(w.short_description_ar),
        image: url(w.hero_image), duration_minutes: num(w.duration_minutes), price: num(w.offer_price) ?? num(w.price), bookable: w.booking_enabled !== false,
        is_active: w.is_active !== false, parent_id: spaCats.get(type),
      }, client)
    )) count('spa_services');
  }

  // Laundry
  for (const l of docs(cols.laundry)) {
    const p = l.prices ?? {};
    const surcharge = num(p.express_surcharge);
    const wash = num(p.wash_press) ?? num(p.wash);
    const base = wash ?? num(p.dry_clean) ?? num(p.press);
    if (await safe(`laundry ${str(l.name_en)}`, () =>
      createEntity('laundry_items', hid, {
        name_en: str(l.name_en), name_ar: str(l.name_ar), category: /abaya|dress|ladies/i.test(str(l.category_en)) ? 'ladies' : /thobe|shemagh|ghutra|traditional/i.test(str(l.category_en)) ? 'traditional' : /child/i.test(str(l.category_en)) ? 'children' : 'gentlemen',
        wash_price: wash, dry_clean_price: num(p.dry_clean), press_price: num(p.press),
        // Old model stored an absolute surcharge; convert to a percentage of the base price.
        express_pct: surcharge && base ? Math.round((surcharge / base) * 100) : null,
        is_active: l.is_active !== false,
      }, client)
    )) count('laundry_items');
  }

  // Guest services
  for (const s of docs(cols.guestServices)) {
    const code = dept(s.department_code, 'CONCIERGE');
    const entity = code === 'HOUSEKEEPING' || code === 'MAINTENANCE' ? 'room_services' : 'hotel_services';
    if (await safe(`service ${str(s.title_en) || str(s.name_en)}`, () =>
      createEntity(entity, hid, {
        name_en: str(s.title_en) || str(s.name_en), name_ar: str(s.title_ar) || str(s.name_ar), description_en: str(s.description_en), description_ar: str(s.description_ar),
        department: code, category: entity === 'room_services' ? (code === 'MAINTENANCE' ? 'maintenance' : 'housekeeping') : 'concierge', is_active: s.is_active !== false,
      }, client)
    )) count(entity);
  }

  // Guest information derived from hotel fields
  const info = async (d: Record<string, unknown>) => {
    if (await safe(`info ${d.title_en}`, () => createEntity('info_items', hid, d, client))) count('info_items');
  };
  if (str(h.check_in_time)) await info({ title_en: 'Check-in', title_ar: 'تسجيل الدخول', category: 'stay', icon: 'key', highlight_en: str(h.check_in_time), highlight_ar: str(h.check_in_time) });
  if (str(h.check_out_time)) await info({ title_en: 'Check-out', title_ar: 'تسجيل المغادرة', category: 'stay', icon: 'door-open', highlight_en: str(h.check_out_time), highlight_ar: str(h.check_out_time) });
  if (str(h.wifi_name)) await info({ title_en: 'Wi-Fi', title_ar: 'الواي فاي', category: 'connectivity', icon: 'wifi', highlight_en: str(h.wifi_name), highlight_ar: str(h.wifi_name) });

  return report;
}
