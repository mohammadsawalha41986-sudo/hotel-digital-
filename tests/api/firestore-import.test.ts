import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { importFirestoreHotel } from '../../server/tools/firestoreImport';
import { Client, one, q, setup, teardown, tx } from './helpers';
import { clearPublicCaches } from '../../server/services/bundleCache';

before(setup);
after(teardown);

/** Synthetic export shaped like the previous Firebase data model. */
const exported = {
  name_en: 'Legacy Palace', name_ar: 'قصر التراث', slug: 'legacy-palace', classification_stars: 5, currency: 'SAR',
  phone: '+966110000000', email: 'info@legacy.example', logo_url: 'https://cdn.example.com/logo.png', check_in_time: '15:00', check_out_time: '12:00', wifi_name: 'Legacy-Guest',
  social_links: { instagram: 'https://instagram.com/legacy', twitter: 'https://x.com/legacy' },
  __collections__: {
    branding: { theme: { primary: '#123456', accent: '#C5A880', background: 'not-a-color' } },
    private: { departmentRouting: { lines: [{ department_code: 'fnb', whatsapp_number: '+966500001111', is_enabled: true }, { department_code: 'housekeeping', whatsapp_number: 'bad', is_enabled: true }] } },
    outlets: {
      o1: {
        name_en: 'Palace Grill', name_ar: 'مشويات القصر', outlet_type: 'restaurant', hero_image: 'https://cdn.example.com/grill.jpg', is_active: true,
        contact: { phone: '+966110000001', whatsapp_number: '+966500002222', whatsapp_enabled: true },
        menu_categories: [{ name_en: 'Grill', name_ar: 'مشويات', items: [
          { name_en: 'Mixed grill', name_ar: 'مشاوي مشكلة', price: 120, is_spicy: true, option_groups: [{ id: 'side', title_en: 'Side', type: 'single', is_required: true, options: [{ id: 'rice', name_en: 'Rice', price_delta: 0 }, { id: 'fries', name_en: 'Fries', price_delta: 5 }] }] },
          { name_en: 'No price dish' },
        ] }],
      },
    },
    offers: { of1: { title_en: 'Iftar buffet', title_ar: 'بوفيه إفطار', offer_price: 199, image_url: 'https://cdn.example.com/iftar.jpg', is_active: true } },
    wellness: { w1: { name_en: 'Hammam', name_ar: 'حمام مغربي', service_type: 'spa', price: 250, duration_minutes: 60, booking_enabled: true, is_active: true } },
    laundry: { l1: { name_en: 'Thobe', name_ar: 'ثوب', category_en: 'Thobes & traditional', prices: { wash: 10, dry_clean: 18, press: 6, wash_press: 15, express_surcharge: 7.5 }, is_active: true } },
    guestServices: { g1: { title_en: 'Extra blanket', title_ar: 'بطانية إضافية', department_code: 'housekeeping' }, g2: { title_en: 'Limousine', title_ar: 'ليموزين', department_code: 'concierge' } },
  },
};

test('previous Firebase data is migrated with validation and reporting', async () => {
  const report = await tx((c) => importFirestoreHotel(c, 'legacy-palace', exported));
  assert.deepEqual(report.created, { whatsapp_routes: 1, outlets: 1, menus: 1, menu_categories: 1, menu_items: 1, offers: 1, spa_categories: 1, spa_services: 1, laundry_categories: 1, laundry_items: 1, room_services: 1, hotel_services: 1, info_items: 3 });
  assert.deepEqual(report.skipped.map((s) => s.what).sort(), ['item No price dish', 'routing housekeeping']);

  const hotel = await one('SELECT is_published, branding, profile FROM hotels WHERE id = $1', [report.hotelId]);
  assert.equal(hotel.is_published, false, 'imported hotels start unpublished for review');
  assert.equal(hotel.branding.colors.primary, '#123456');
  assert.equal(hotel.branding.theme?.overrides?.page_background, undefined, 'an invalid colour is dropped (the theme derives it)');
  assert.equal(hotel.profile.social.x, 'https://x.com/legacy');
  assert.equal((await one(`SELECT whatsapp FROM departments WHERE hotel_id = $1 AND code = 'FNB'`, [report.hotelId])).whatsapp, '+966500001111');
  const ldy = await one(`SELECT i.data, c.code FROM laundry_items i JOIN laundry_categories c ON c.id = i.parent_id WHERE i.hotel_id = $1`, [report.hotelId]);
  assert.equal(ldy.data.express_pct, 50);
  assert.equal(ldy.code, 'LCAT-TRADITIONAL');

  // The migrated catalog works end to end once published.
  await q('UPDATE hotels SET is_published = true WHERE id = $1', [report.hotelId]);
  clearPublicCaches();
  const b = (await new Client().get('/public/hotels/legacy-palace')).body;
  const outlet = b.catalog.outlets[0];
  const menu = (await new Client().get(`/public/hotels/legacy-palace/outlets/${outlet.id}/menu`)).body;
  const grill = menu.menus[0].categories[0].items[0];
  const order = await new Client().post('/public/hotels/legacy-palace/requests', { guest: { type: 'IN_HOUSE', name: 'Guest', phone: '+966555000111', room: '10' }, payload: { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: grill.id, quantity: 1, modifiers: { side: ['fries'] } }] } });
  assert.equal(order.status, 201);
  assert.equal(order.body.totals.total, 125);
  assert.match(order.body.whatsapp_url, /966500002222/, 'outlet WhatsApp override is preserved');
});

test('refuses to merge into an existing slug', async () => {
  await assert.rejects(tx((c) => importFirestoreHotel(c, 'x', { ...exported, slug: 'swiss-flora-royal' })), /already exists/);
});
