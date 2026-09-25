/**
 * Synthetic multi-hotel data for staging and load testing — never production.
 * Used by `scripts/synth-hotels.ts` locally and by `cli.js release` in a
 * staging environment (ALLOW_SYNTHETIC_DATA=1). See the script for details.
 */
import { brandingSchema, settingsSchema } from '../../shared/hotel';
import { defaultSiteConfig } from '../../shared/defaults';
import { one, pool, q, tx } from '../db';
import { createEntity } from '../repos/entities';
import { ensureDepartments } from '../repos/hotels';
import { publishHotel } from '../services/publish';
import { upsertUser, DEMO_PASSWORD } from '../seed/demo';

export interface SynthOptions {
  hotels: number;
  days: number;
  perDay: number;
  prefix: string;
}

let values = { prefix: 'load-hotel' };
let DAYS = 90;
let PER_DAY = 120;

const OUTLETS = [
  { name: 'Main Restaurant', ar: 'المطعم الرئيسي', type: 'restaurant' },
  { name: 'Lobby Café', ar: 'مقهى الردهة', type: 'cafe' },
  { name: 'In-Room Dining', ar: 'الطعام في الغرف', type: 'room_service' },
  { name: 'Pool Bar', ar: 'بار المسبح', type: 'pool_bar' },
];
const CATS = ['Breakfast', 'Starters', 'Mains', 'Desserts', 'Drinks'];

async function createHotel(n: number) {
  const slug = `${values.prefix}-${String(n).padStart(2, '0')}`;
  const existing = await one<{ id: string }>(`SELECT id FROM hotels WHERE slug = $1`, [slug]);
  if (existing) return { id: existing.id, slug, created: false };
  return tx(async (c) => {
    const h = await one<{ id: string }>(
      `INSERT INTO hotels (slug, name_en, name_ar, profile, branding, settings, site_draft, site_published, site_published_at, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, now(), true) RETURNING id`,
      [
        slug,
        `[Load] Hotel ${n}`,
        `[تحميل] فندق ${n}`,
        JSON.stringify({ stars: 5, currency: 'SAR', timezone: 'Asia/Riyadh', language_mode: 'both', default_language: 'ar', vat_rate: 15, prices_include_vat: true }),
        JSON.stringify(brandingSchema.parse({})),
        JSON.stringify(settingsSchema.parse({})),
        JSON.stringify(defaultSiteConfig()),
      ],
      c
    );
    const hid = h!.id;
    await ensureDepartments(hid, c);
    await q(`UPDATE departments SET whatsapp = '+966500000' || lpad((random()*999)::int::text, 3, '0') WHERE hotel_id = $1`, [hid], c);
    for (const o of OUTLETS) {
      const outlet = await createEntity('outlets', hid, { name_en: o.name, name_ar: o.ar, type: o.type, status_override: 'open' }, c);
      const menu = await createEntity('menus', hid, { name_en: 'All day', name_ar: 'طوال اليوم', parent_id: outlet.id }, c);
      for (const cat of CATS) {
        const category = await createEntity('menu_categories', hid, { name_en: cat, name_ar: cat, parent_id: menu.id }, c);
        for (let i = 1; i <= 8; i++) {
          await createEntity('menu_items', hid, { name_en: `${cat} item ${i}`, name_ar: `صنف ${i}`, description_en: 'Synthetic item for load testing.', price: 20 + ((i * 7) % 90), parent_id: category.id, badges: i === 1 ? ['popular'] : [] }, c);
        }
      }
    }
    for (let i = 1; i <= 10; i++) await createEntity('room_services', hid, { name_en: `Room service ${i}`, name_ar: `خدمة غرفة ${i}`, category: ['housekeeping', 'amenities', 'maintenance'][i % 3] }, c);
    for (let i = 1; i <= 8; i++) await createEntity('hotel_services', hid, { name_en: `Guest service ${i}`, name_ar: `خدمة ${i}` }, c);
    const spaCat = await createEntity('spa_categories', hid, { name_en: 'Massage', name_ar: 'المساج' }, c);
    for (let i = 1; i <= 10; i++) await createEntity('spa_services', hid, { name_en: `Treatment ${i}`, name_ar: `علاج ${i}`, parent_id: spaCat.id, price: 250 + i * 20 }, c);
    for (let i = 1; i <= 4; i++) await createEntity('offers', hid, { title_en: `Offer ${i}`, title_ar: `عرض ${i}`, original_price: 200, price: 150, badges: ['limited'] }, c);
    await publishHotel(c, hid, null, 'Synthetic catalogue');
    // Commission: 5 % of gross, like the demo agreement.
    const a = await one<{ id: string }>(
      `INSERT INTO commission_agreements (hotel_id, agreement_no, name) VALUES ($1, 'AGR-LOAD-' || $2, 'Synthetic agreement') RETURNING id`,
      [hid, String(n).padStart(3, '0')],
      c
    );
    await q(
      `INSERT INTO commission_rules (agreement_id, hotel_id, rule_key, version, scope_level, scope_value, commission_type, rate_bps, basis, tax_treatment, effective_from)
       VALUES ($1, $2, gen_random_uuid(), 1, 'HOTEL', '', 'PERCENTAGE', 500, 'GROSS_INCL_VAT', 'NOT_APPLICABLE', now() - interval '400 days')`,
      [a!.id, hid],
      c
    );
    await q(`INSERT INTO hotel_commercial_settings (hotel_id, hotel_finance_access) VALUES ($1, 'FULL') ON CONFLICT DO NOTHING`, [hid], c);
    await upsertUser(c, `admin@${slug}.load`, `Admin ${n}`, 'HOTEL_ADMIN', [hid], DEMO_PASSWORD);
    await upsertUser(c, `fnb@${slug}.load`, `F&B ${n}`, 'FNB', [hid], DEMO_PASSWORD);
    return { id: hid, slug, created: true };
  });
}

/** Months of history in a few set-based statements per hotel. */
async function history(hid: string) {
  if (await one(`SELECT 1 FROM requests WHERE hotel_id = $1 AND reference LIKE 'SYN-%' LIMIT 1`, [hid])) return 0;
  const total = DAYS * PER_DAY;
  await tx(async (c) => {
    await q(
      `INSERT INTO guests (hotel_id, guest_no, guest_type, name, name_key, phone, last_activity_at)
       SELECT $1, 'G-SYN-' || lpad(g::text, 6, '0'), 'IN_HOUSE', 'Synthetic Guest ' || g, 'synthetic guest ' || g, '+9665' || lpad(g::text, 8, '0'),
              now() - (random() * $2 || ' days')::interval
         FROM generate_series(1, 1500) g`,
      [hid, DAYS],
      c
    );
    // Orders cluster at breakfast (07–10) and dinner (19–22) like real hotels.
    await q(
      `WITH items AS (SELECT id, code, name_en, name_ar, (data->>'price')::numeric AS price, row_number() OVER () AS rn FROM menu_items WHERE hotel_id = $1),
            n AS (SELECT COUNT(*) AS c FROM items),
            gs AS (SELECT array_agg(id) AS ids FROM guests WHERE hotel_id = $1),
            base AS (
              SELECT i,
                     date_trunc('day', now()) - ((i % $2) || ' days')::interval
                       + (CASE WHEN random() < 0.45 THEN 7 + random() * 3 WHEN random() < 0.8 THEN 19 + random() * 3 ELSE random() * 24 END || ' hours')::interval AS at,
                     1 + (random() * 2)::int AS qty,
                     1 + (random() * ((SELECT c FROM n) - 1))::int AS pick
                FROM generate_series(1, $3) i)
       INSERT INTO requests (hotel_id, reference, type, department, priority, title_en, title_ar, guest_type, guest_name, guest_phone, room, lang,
                             lines, details, notes, subtotal, vat, total, currency, whatsapp_to, whatsapp_text, guest_token_hash, guest_id,
                             hotel_name, source, order_type, is_commercial, financial_status, status, created_at, updated_at, accepted_at, completed_at)
       SELECT $1, 'SYN-' || lpad(b.i::text, 7, '0'), 'ORDER', 'FNB', 'NORMAL', it.name_en, it.name_ar, 'IN_HOUSE', 'Synthetic Guest', '+966500000000',
              (100 + (b.i % 400))::text, 'en', '[]'::jsonb, '{}'::jsonb, '',
              round(it.price * b.qty / 1.15, 2), round(it.price * b.qty - it.price * b.qty / 1.15, 2), it.price * b.qty, 'SAR', '', '', md5(b.i::text),
              (SELECT ids[1 + (b.i % 1500)] FROM gs), '[Load]', 'QR', 'FNB', true,
              CASE WHEN b.at < now() - interval '1 hour' THEN 'NOT_APPLICABLE' ELSE 'AWAITING_ELIGIBILITY' END,
              CASE WHEN b.at < now() - interval '2 hours' THEN 'COMPLETED' WHEN random() < 0.5 THEN 'NEW' ELSE 'IN_PROGRESS' END,
              b.at, b.at + interval '25 minutes', b.at + interval '3 minutes', CASE WHEN b.at < now() - interval '2 hours' THEN b.at + interval '25 minutes' END
         FROM base b JOIN items it ON it.rn = b.pick
        WHERE b.at < now()`,
      [hid, DAYS, total],
      c
    );
    await q(
      `INSERT INTO order_lines (hotel_id, request_id, line_no, item_entity, item_id, item_code, category_code, name_en, name_ar, quantity,
                                unit_price_minor, modifiers, service, vat_mode, vat_rate_bps, discount_minor, net_minor, vat_minor, gross_minor, note)
       SELECT r.hotel_id, r.id, 1, 'menu_items', NULL, '', '', r.title_en, r.title_ar, 1, (r.total * 100)::bigint, '{}'::jsonb, '', 'inclusive', 1500, 0,
              (r.subtotal * 100)::bigint, (r.vat * 100)::bigint, (r.total * 100)::bigint, ''
         FROM requests r WHERE r.hotel_id = $1 AND r.reference LIKE 'SYN-%'`,
      [hid],
      c
    );
    await q(
      `INSERT INTO request_events (request_id, hotel_id, to_status, note, is_internal, event_type, actor_type, actor_name, created_at)
       SELECT id, hotel_id, 'NEW', 'Request received', false, 'CREATED', 'guest', 'Synthetic Guest', created_at FROM requests WHERE hotel_id = $1 AND reference LIKE 'SYN-%'`,
      [hid],
      c
    );
  });
  return total;
}


export async function synthHotels(opts: SynthOptions, log: (m: string) => void = console.log) {
  if (process.env.RAILWAY_ENVIRONMENT_NAME === 'production' || (process.env.NODE_ENV === 'production' && process.env.ALLOW_SYNTHETIC_DATA !== '1')) {
    throw new Error('Refusing to generate synthetic data here (production, or ALLOW_SYNTHETIC_DATA is not set)');
  }
  values = { prefix: opts.prefix };
  DAYS = opts.days;
  PER_DAY = opts.perDay;
  let orders = 0;
  for (let n = 1; n <= opts.hotels; n++) {
    const h = await createHotel(n);
    const added = await history(h.id);
    orders += added;
    log(`${h.slug}: ${h.created ? 'created' : 'exists'}; +${added} historical orders`);
  }
  await pool.query('ANALYZE');
  return orders;
}
