import type pg from 'pg';
import type { Role } from '../../shared/domain';
import { defaultSiteConfig } from '../../shared/defaults';
import { brandingSchema, settingsSchema } from '../../shared/hotel';
import { one, q } from '../db';
import { createEntity } from '../repos/entities';
import { ensureDepartments } from '../repos/hotels';
import { hashPassword } from '../security';

/**
 * STAGING / E2E ONLY. Adds a sample catalog (menus, prices, WhatsApp test
 * numbers), a second hotel for isolation testing and one user per role.
 * Never run against production data: every record is marked as demo content.
 */
export const DEMO_PASSWORD = 'Demo-pass-2026';
export const DEMO_WHATSAPP: Record<string, string> = {
  FNB: '+966500000101',
  HOUSEKEEPING: '+966500000102',
  MAINTENANCE: '+966500000103',
  FRONT_OFFICE: '+966500000104',
  CONCIERGE: '+966500000105',
  LAUNDRY: '+966500000106',
  SPA: '+966500000107',
  MANAGEMENT: '+966500000108',
  FEEDBACK: '+966500000109',
};

const mods = {
  size: { id: 'size', kind: 'size', name_en: 'Size', name_ar: 'الحجم', min: 1, max: 1, options: [
    { id: 'regular', name_en: 'Regular', name_ar: 'عادي', price: 0, available: true },
    { id: 'large', name_en: 'Large', name_ar: 'كبير', price: 6, available: true },
  ] },
  milk: { id: 'milk', kind: 'preference', name_en: 'Milk', name_ar: 'الحليب', min: 0, max: 1, options: [
    { id: 'full', name_en: 'Full cream', name_ar: 'كامل الدسم', price: 0, available: true },
    { id: 'oat', name_en: 'Oat milk', name_ar: 'حليب الشوفان', price: 4, available: true },
  ] },
  doneness: { id: 'doneness', kind: 'preference', name_en: 'Cooking preference', name_ar: 'درجة الطهي', min: 1, max: 1, options: [
    { id: 'medium', name_en: 'Medium', name_ar: 'متوسط', price: 0, available: true },
    { id: 'well', name_en: 'Well done', name_ar: 'مطهو جيداً', price: 0, available: true },
  ] },
  addons: { id: 'addons', kind: 'addon', name_en: 'Add-ons', name_ar: 'إضافات', min: 0, max: 3, options: [
    { id: 'cheese', name_en: 'Extra cheese', name_ar: 'جبنة إضافية', price: 5, available: true },
    { id: 'egg', name_en: 'Fried egg', name_ar: 'بيضة مقلية', price: 4, available: true },
    { id: 'avocado', name_en: 'Avocado', name_ar: 'أفوكادو', price: 7, available: true },
  ] },
  remove: { id: 'remove', kind: 'remove', name_en: 'Remove', name_ar: 'إزالة', min: 0, max: 3, options: [
    { id: 'onion', name_en: 'No onion', name_ar: 'بدون بصل', price: 0, available: true },
    { id: 'tomato', name_en: 'No tomato', name_ar: 'بدون طماطم', price: 0, available: true },
  ] },
};

async function outletId(client: pg.PoolClient, hid: string, nameEn: string) {
  const row = await one<{ id: string }>('SELECT id FROM outlets WHERE hotel_id = $1 AND name_en = $2', [hid, nameEn], client);
  if (!row) throw new Error(`Outlet ${nameEn} missing — run the Swiss Flora seed first`);
  return row.id;
}

export async function seedDemoCatalog(client: pg.PoolClient, hid: string) {
  if (await one('SELECT 1 FROM menus WHERE hotel_id = $1 LIMIT 1', [hid], client)) return false;
  const add = (e: Parameters<typeof createEntity>[0], d: Record<string, unknown>, parent: string | null = null) => createEntity(e, hid, { ...d, parent_id: parent }, client);

  // In-room dining menu
  const ird = await outletId(client, hid, 'In-Room Dining');
  const irdMenu = await add('menus', { name_en: 'All-day menu', name_ar: 'قائمة طوال اليوم' }, ird);
  const breakfast = await add('menu_categories', { name_en: 'Breakfast', name_ar: 'الإفطار' }, irdMenu.id);
  const mains = await add('menu_categories', { name_en: 'Mains', name_ar: 'الأطباق الرئيسية' }, irdMenu.id);
  const drinks = await add('menu_categories', { name_en: 'Drinks', name_ar: 'المشروبات' }, irdMenu.id);
  await add('menu_items', { name_en: '[Demo] Arabic breakfast', name_ar: '[تجريبي] فطور عربي', description_en: 'Foul, falafel, labneh, olives and fresh bread.', description_ar: 'فول وفلافل ولبنة وزيتون وخبز طازج.', price: 65, calories: 780, dietary: ['vegetarian'], allergens: ['gluten', 'dairy', 'sesame'], featured: true, prep_minutes: 20 }, breakfast.id);
  await add('menu_items', { name_en: '[Demo] Club sandwich', name_ar: '[تجريبي] كلوب ساندويتش', description_en: 'Grilled chicken, turkey, egg and fries.', description_ar: 'دجاج مشوي وتركي وبيض مع بطاطس.', price: 58, calories: 920, allergens: ['gluten', 'eggs'], recommended: true, prep_minutes: 25, modifiers: [mods.addons, mods.remove] }, mains.id);
  await add('menu_items', { name_en: '[Demo] Beef burger', name_ar: '[تجريبي] برجر لحم', description_en: 'Angus beef, cheddar and house sauce.', description_ar: 'لحم أنجوس وجبنة شيدر وصلصة خاصة.', price: 72, calories: 1050, spicy: '1', allergens: ['gluten', 'dairy'], prep_minutes: 25, modifiers: [mods.doneness, mods.addons, mods.remove] }, mains.id);
  await add('menu_items', { name_en: '[Demo] Chicken biryani', name_ar: '[تجريبي] برياني دجاج', price: 68, spicy: '2', prep_minutes: 30, available: false }, mains.id);
  await add('menu_items', { name_en: '[Demo] Fresh orange juice', name_ar: '[تجريبي] عصير برتقال طازج', price: 24, dietary: ['vegan'], modifiers: [mods.size] }, drinks.id);
  await add('menu_items', { name_en: '[Demo] Cappuccino', name_ar: '[تجريبي] كابتشينو', price: 22, allergens: ['dairy'], modifiers: [mods.size, mods.milk] }, drinks.id);

  // Lobby café
  const cafe = await outletId(client, hid, 'Lobby Café');
  const cafeMenu = await add('menus', { name_en: 'Café menu', name_ar: 'قائمة المقهى' }, cafe);
  const coffee = await add('menu_categories', { name_en: 'Coffee', name_ar: 'القهوة' }, cafeMenu.id);
  await add('menu_items', { name_en: '[Demo] Saudi coffee & dates', name_ar: '[تجريبي] قهوة سعودية وتمر', price: 30, featured: true }, coffee.id);
  await add('menu_items', { name_en: '[Demo] Flat white', name_ar: '[تجريبي] فلات وايت', price: 20, modifiers: [mods.milk] }, coffee.id);

  // Spa prices for the massage treatments seeded without prices.
  const massageRows = await q<{ id: string; name_en: string }>(`SELECT s.id, s.name_en FROM spa_services s WHERE s.hotel_id = $1 AND s.name_en ILIKE '%massage%'`, [hid], client);
  const prices: Record<string, [number, number]> = { 'Swedish massage': [60, 280], 'Deep tissue massage': [60, 320], 'Relaxation massage': [45, 220] };
  for (const m of massageRows) {
    const p = prices[m.name_en];
    if (p) await q(`UPDATE spa_services SET data = data || jsonb_build_object('duration_minutes', $2::int, 'price', $3::numeric) WHERE id = $1`, [m.id, p[0], p[1]], client);
  }

  // Laundry price list
  const laundry: [string, string, string, number | null, number | null, number | null][] = [
    ['[Demo] Shirt', '[تجريبي] قميص', 'gentlemen', 12, 16, 8],
    ['[Demo] Trousers', '[تجريبي] بنطال', 'gentlemen', 14, 18, 9],
    ['[Demo] Thobe', '[تجريبي] ثوب', 'traditional', 15, 20, 10],
    ['[Demo] Shemagh', '[تجريبي] شماغ', 'traditional', 10, 14, 6],
    ['[Demo] Dress', '[تجريبي] فستان', 'ladies', 20, 30, 12],
    ['[Demo] Abaya', '[تجريبي] عباية', 'ladies', 18, 25, 10],
  ];
  const laundryCats = new Map(
    (await q<{ id: string; code: string }>(`SELECT id, code FROM laundry_categories WHERE hotel_id = $1`, [hid], client)).map((r) => [r.code, r.id])
  );
  for (const [en, ar, category, wash, dry, press] of laundry) {
    const parent = laundryCats.get(`LCAT-${category.toUpperCase()}`);
    if (!parent) throw new Error(`Laundry category ${category} missing — run the base seed first`);
    await add('laundry_items', { name_en: en, name_ar: ar, wash_price: wash, dry_clean_price: dry, press_price: press, express_pct: 50 }, parent);
  }

  // Offer
  await add('offers', { title_en: '[Demo] Breakfast in bed', title_ar: '[تجريبي] الإفطار في السرير', subtitle_en: 'Arabic breakfast delivered to your room', subtitle_ar: 'فطور عربي يصلك إلى غرفتك', image: '', badge_en: 'This week', badge_ar: 'هذا الأسبوع', price_label_en: 'SAR 65', price_label_ar: '65 ر.س', cta_label_en: 'Order now', cta_label_ar: 'اطلب الآن', cta_page: 'dining', cta_outlet_id: ird, placement: ['home', 'dining'] });

  for (const [code, number] of Object.entries(DEMO_WHATSAPP)) {
    await q('UPDATE departments SET whatsapp = $3 WHERE hotel_id = $1 AND code = $2', [hid, code, number], client);
  }
  return true;
}

export async function seedIsolationHotel(client: pg.PoolClient): Promise<string> {
  const existing = await one<{ id: string }>(`SELECT id FROM hotels WHERE slug = 'demo-harbour-hotel'`, [], client);
  if (existing) return existing.id;
  const row = await one<{ id: string }>(
    `INSERT INTO hotels (slug, name_en, name_ar, profile, branding, settings, site_draft, site_published, site_published_at, is_published)
     VALUES ('demo-harbour-hotel', '[Demo] Harbour Hotel', '[تجريبي] فندق الميناء', $1, $2, $3, $4, $4, now(), true) RETURNING id`,
    [
      JSON.stringify({ stars: 4, currency: 'SAR', timezone: 'Asia/Riyadh', language_mode: 'en', default_language: 'en', vat_rate: 15, prices_include_vat: false }),
      JSON.stringify(brandingSchema.parse({ colors: { primary: '#1D4E89', secondary: '#0B1F33', accent: '#E0A458', background: '#F4F7FA', surface: '#FFFFFF', text: '#0B1F33', muted: '#5A6B7B' } })),
      JSON.stringify(settingsSchema.parse({})),
      JSON.stringify(defaultSiteConfig()),
    ],
    client
  );
  const hid = row!.id;
  await ensureDepartments(hid, client);
  const outlet = await createEntity('outlets', hid, { name_en: '[Demo] Harbour Grill', name_ar: '[تجريبي] مشويات الميناء', type: 'restaurant' }, client);
  const menu = await createEntity('menus', hid, { name_en: 'Dinner', name_ar: 'العشاء', parent_id: outlet.id }, client);
  const cat = await createEntity('menu_categories', hid, { name_en: 'Grill', name_ar: 'مشويات', parent_id: menu.id }, client);
  await createEntity('menu_items', hid, { name_en: '[Demo] Harbour steak', name_ar: '[تجريبي] ستيك', price: 140, parent_id: cat.id }, client);
  await q(`UPDATE departments SET whatsapp = '+966500000901' WHERE hotel_id = $1 AND code = 'FNB'`, [hid], client);
  return hid;
}

export async function upsertUser(client: pg.PoolClient, email: string, name: string, role: Role, hotelIds: string[], password: string) {
  const hash = await hashPassword(password);
  const row = await one<{ id: string }>(
    `INSERT INTO users (email, name, role, password_hash) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, is_active = true, failed_logins = 0, locked_until = NULL
     RETURNING id`,
    [email.toLowerCase(), name, role, hash],
    client
  );
  for (const h of hotelIds) await q('INSERT INTO user_hotels (user_id, hotel_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [row!.id, h], client);
  return row!.id;
}

export async function seedDemoUsers(client: pg.PoolClient, royalId: string, harbourId: string) {
  const users: [string, string, Role, string[]][] = [
    ['super@demo.hotelhub.local', 'Platform Owner', 'SUPER_ADMIN', []],
    ['finance@demo.hotelhub.local', 'Platform Finance', 'PLATFORM_FINANCE', []],
    ['hotelfinance@demo.hotelhub.local', 'Hotel Finance', 'HOTEL_FINANCE', [royalId]],
    ['admin@demo.hotelhub.local', 'Hotel Admin', 'HOTEL_ADMIN', [royalId]],
    ['management@demo.hotelhub.local', 'General Manager', 'MANAGEMENT', [royalId]],
    ['fnb@demo.hotelhub.local', 'F&B Supervisor', 'FNB', [royalId]],
    ['housekeeping@demo.hotelhub.local', 'Housekeeping Supervisor', 'HOUSEKEEPING', [royalId]],
    ['maintenance@demo.hotelhub.local', 'Maintenance Engineer', 'MAINTENANCE', [royalId]],
    ['frontoffice@demo.hotelhub.local', 'Front Office Agent', 'FRONT_OFFICE', [royalId]],
    ['laundry@demo.hotelhub.local', 'Laundry Attendant', 'LAUNDRY', [royalId]],
    ['spa@demo.hotelhub.local', 'Spa Therapist', 'SPA', [royalId]],
    ['harbour-admin@demo.hotelhub.local', 'Harbour Admin', 'HOTEL_ADMIN', [harbourId]],
  ];
  for (const [email, name, role, hotels] of users) await upsertUser(client, email, name, role, hotels, DEMO_PASSWORD);
  return users.map((u) => u[0]);
}


/**
 * [Demo] commercial configuration so the finance screens have something to
 * show in staging. Clearly labelled; never loaded by the production seed.
 */
export async function seedDemoCommerce(client: pg.PoolClient, royalId: string) {
  if (await one(`SELECT 1 FROM commission_agreements WHERE hotel_id = $1`, [royalId], client)) return false;
  const n = await one<{ n: number }>(`SELECT nextval('commission_agreement_seq') AS n`, [], client);
  const a = await one<{ id: string }>(
    `INSERT INTO commission_agreements (hotel_id, agreement_no, name, contract_reference, notes)
     VALUES ($1, $2, '[Demo] Standard commission agreement', 'DEMO-ONLY', 'Demo configuration — replace with the signed commercial agreement.') RETURNING id`,
    [royalId, `AGR-${String(n!.n).padStart(5, '0')}`],
    client
  );
  await q(
    `INSERT INTO commission_rules (agreement_id, hotel_id, rule_key, version, scope_level, scope_value, commission_type, rate_bps, basis, tax_treatment, effective_from, notes)
     VALUES ($1, $2, gen_random_uuid(), 1, 'HOTEL', '', 'PERCENTAGE', 500, 'GROSS_INCL_VAT', 'NOT_APPLICABLE', now() - interval '30 days', '[Demo] 5% of gross order value')`,
    [a!.id, royalId],
    client
  );
  await q(
    `INSERT INTO hotel_commercial_settings (hotel_id, hotel_finance_access, settlement_frequency) VALUES ($1, 'FULL', 'MONTHLY')
     ON CONFLICT (hotel_id) DO NOTHING`,
    [royalId],
    client
  );
  return true;
}
