import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, bundle, ids, login, menuItems, one, outletByName, publish, setup, teardown, users } from './helpers';

before(setup);
after(teardown);

const H = () => `/admin/hotels/${ids.royal}`;

/**
 * Admin simulation: every change goes Admin → API → DB, survives a fresh
 * read (the "refresh"), and is reflected on the public guest bundle.
 */
describe('admin → database → guest persistence', () => {
  test('logo and colors', async () => {
    const admin = await login(users.admin);
    const current = (await admin.get(H())).body.branding;
    const r = await admin.put(`${H()}/branding`, { ...current, logo: 'https://cdn.example.com/logo.png', colors: { ...current.colors, primary: '#112233' } });
    assert.equal(r.status, 200);
    const reread = (await (await login(users.admin)).get(H())).body.branding;
    assert.equal(reread.logo, 'https://cdn.example.com/logo.png');
    assert.notEqual((await bundle()).hotel.branding.colors.primary, '#112233', 'branding waits for publish');
    assert.equal((await admin.get(H())).body.has_unpublished_changes, true);
    await publish(admin);
    const b = await bundle();
    assert.equal(b.hotel.branding.colors.primary, '#112233');
    assert.equal((await admin.get(H())).body.has_unpublished_changes, false);
    assert.equal((await admin.put(`${H()}/branding`, { ...current, colors: { ...current.colors, primary: 'red' } })).status, 422);
  });

  test('hero and homepage sections use draft → publish', async () => {
    const admin = await login(users.admin);
    const hotel = (await admin.get(H())).body;
    const draft = structuredClone(hotel.site_draft);
    draft.hero.slides[0].headline_en = 'New hero headline';
    const gallery = draft.sections.find((s: any) => s.type === 'gallery');
    gallery.visible = false;
    assert.equal((await admin.put(`${H()}/site/draft`, draft)).status, 200);

    let pub = await bundle();
    assert.notEqual(pub.site.hero.slides[0].headline_en, 'New hero headline', 'draft must not leak to guests');
    const preview = await admin.get('/public/hotels/swiss-flora-royal?preview=1');
    assert.equal(preview.body.site.hero.slides[0].headline_en, 'New hero headline');

    assert.equal((await admin.post(`${H()}/site/publish`)).status, 200);
    pub = await bundle();
    assert.equal(pub.site.hero.slides[0].headline_en, 'New hero headline');
    assert.equal(pub.site.sections.find((s: any) => s.type === 'gallery').visible, false);
    const audit = await one(`SELECT COUNT(*) AS n FROM audit_log WHERE hotel_id = $1 AND entity = 'publication' AND action = 'publish' AND user_id IS NOT NULL`, [ids.royal]);
    assert.ok(audit.n >= 1);
  });

  test('create offer, change outlet image, change item price, disable item', async () => {
    const admin = await login(users.admin);
    const offer = await admin.post(`${H()}/entities/offers`, { title_en: 'Weekend brunch', title_ar: 'برانش نهاية الأسبوع', image: 'https://cdn.example.com/brunch.jpg', placement: ['home'] });
    assert.equal(offer.status, 201);

    const outlet = await outletByName('Lobby Café');
    assert.equal((await admin.patch(`${H()}/entities/outlets/${outlet.id}`, { cover: 'https://cdn.example.com/cafe.jpg' })).status, 200);

    const ird = await outletByName('In-Room Dining');
    const club = (await menuItems(ird.id)).find((i: any) => i.name_en.includes('Club sandwich'));
    const priced = await admin.patch(`${H()}/entities/menu_items/${club.id}`, { price: 61.5 });
    assert.equal(priced.status, 200);
    assert.equal(priced.body.price, 61.5);
    const disabled = (await menuItems(ird.id)).find((i: any) => i.name_en.includes('Fresh orange'));
    assert.equal((await admin.patch(`${H()}/entities/menu_items/${disabled.id}`, { available: false })).status, 200);

    // Before publishing: new content and prices are not visible; availability applies at once.
    const before = await bundle();
    assert.ok(!before.catalog.offers.some((o: any) => o.title_en === 'Weekend brunch'));
    const itemsBefore = await menuItems(ird.id);
    assert.equal(itemsBefore.find((i: any) => i.id === club.id).price, 58);
    assert.equal(itemsBefore.find((i: any) => i.id === disabled.id).available, false, 'sold out is operational');
    const changes = (await admin.get(`${H()}/publishing`)).body;
    assert.equal(changes.has_unpublished_changes, true);
    assert.ok(changes.changes.some((c: any) => /price change/.test(c.summary)));
    await publish(admin);

    const b = await bundle();
    assert.ok(b.catalog.offers.some((o: any) => o.title_en === 'Weekend brunch'));
    assert.equal(b.catalog.outlets.find((o: any) => o.id === outlet.id).cover, 'https://cdn.example.com/cafe.jpg');
    const items = await menuItems(ird.id);
    assert.equal(items.find((i: any) => i.id === club.id).price, 61.5);
    assert.equal(items.find((i: any) => i.id === disabled.id).available, false);

    const priceAudit = await one(`SELECT before, after, summary FROM audit_log WHERE entity = 'menu_items' AND entity_id = $1 ORDER BY id DESC LIMIT 1`, [club.id]);
    assert.equal(priceAudit.before.price, 58);
    assert.equal(priceAudit.after.price, 61.5);
    assert.match(priceAudit.summary, /price change/);
  });

  test('hidden content disappears from the guest site', async () => {
    const admin = await login(users.admin);
    const b0 = await bundle();
    const pillow = b0.catalog.room_services.find((s: any) => s.name_en === 'Extra pillows');
    await admin.patch(`${H()}/entities/room_services/${pillow.id}`, { is_active: false });
    // Immediately unorderable; removed from the page with the next publish.
    assert.equal((await bundle()).catalog.room_services.find((s: any) => s.id === pillow.id).available, false);
    const r = await new Client().post('/public/hotels/swiss-flora-royal/requests', { guest: { type: 'IN_HOUSE', name: 'Sara', phone: '+966555000111', room: '301' }, payload: { kind: 'ROOM_SERVICE', service_id: pillow.id } });
    assert.equal(r.status, 409);
    await publish(admin);
    assert.ok(!(await bundle()).catalog.room_services.some((s: any) => s.id === pillow.id));
    await admin.patch(`${H()}/entities/room_services/${pillow.id}`, { is_active: true });
    await publish(admin);
  });

  test('add room service, change spa price, change laundry price', async () => {
    const admin = await login(users.admin);
    const created = await admin.post(`${H()}/entities/room_services`, { name_en: 'Baby cot', name_ar: 'سرير أطفال', department: 'HOUSEKEEPING', category: 'amenities', icon: 'baby' });
    assert.equal(created.status, 201);
    const b0 = await bundle();
    const swedish = b0.catalog.spa_services.find((s: any) => s.name_en === 'Swedish massage');
    await admin.patch(`${H()}/entities/spa_services/${swedish.id}`, { price: 300 });
    const shirt = b0.catalog.laundry_items.find((s: any) => s.name_en.includes('Shirt'));
    await admin.patch(`${H()}/entities/laundry_items/${shirt.id}`, { wash_price: 13 });
    const guest = { type: 'IN_HOUSE', name: 'Sara', phone: '+966555000111', room: '301' };
    const unpublished = await new Client().post('/public/hotels/swiss-flora-royal/requests', { guest, payload: { kind: 'LAUNDRY', pickup: 'Now', lines: [{ item_id: shirt.id, service: 'wash', quantity: 2 }] } });
    assert.equal(unpublished.body.totals.total, 24, 'guests pay the published price until the change is published');
    await publish(admin);
    const b = await bundle();
    assert.ok(b.catalog.room_services.some((s: any) => s.name_en === 'Baby cot'));
    assert.equal(b.catalog.spa_services.find((s: any) => s.id === swedish.id).price, 300);
    assert.equal(b.catalog.laundry_items.find((s: any) => s.id === shirt.id).wash_price, 13);
    // …and the new price is what the server charges
    const r = await new Client().post('/public/hotels/swiss-flora-royal/requests', { guest: { type: 'IN_HOUSE', name: 'Sara', phone: '+966555000111', room: '301' }, payload: { kind: 'LAUNDRY', pickup: 'Now', lines: [{ item_id: shirt.id, service: 'wash', quantity: 2 }] } });
    assert.equal(r.body.totals.total, 26);
  });

  test('department WhatsApp routing change applies to the next request and is audited', async () => {
    const admin = await login(users.admin);
    const depts = (await admin.get(`${H()}/departments`)).body.departments;
    const updated = depts.map((d: any) => (d.code === 'HOUSEKEEPING' ? { ...d, whatsapp: '+966511111111' } : d));
    assert.equal((await admin.put(`${H()}/departments`, { departments: updated })).status, 200);
    assert.equal((await admin.put(`${H()}/departments`, { departments: updated.map((d: any) => (d.code === 'SPA' ? { ...d, whatsapp: 'not-a-phone' } : d)) })).status, 422);
    const b = await bundle();
    const towels = b.catalog.room_services.find((s: any) => s.name_en === 'Extra towels');
    const r = await new Client().post('/public/hotels/swiss-flora-royal/requests', { guest: { type: 'IN_HOUSE', name: 'Sara', phone: '+966555000111', room: '301' }, payload: { kind: 'ROOM_SERVICE', service_id: towels.id } });
    assert.match(r.body.whatsapp_url, /966511111111/);
    const a = await one(`SELECT before, after FROM audit_log WHERE entity = 'department_routing' AND entity_id = 'HOUSEKEEPING' ORDER BY id DESC LIMIT 1`);
    assert.equal(a.after.whatsapp, '+966511111111');
  });

  test('profile language mode and VAT settings persist and reach guests', async () => {
    const admin = await login(users.admin);
    const p = (await admin.get(H())).body.profile;
    assert.equal((await admin.put(`${H()}/profile`, { ...p, language_mode: 'ar', tagline_en: 'Updated tagline' })).status, 200);
    await publish(admin);
    const b = await bundle();
    assert.equal(b.hotel.profile.language_mode, 'ar');
    assert.equal(b.hotel.profile.tagline_en, 'Updated tagline');
    // Hotel admins cannot change the slug (would break printed QR codes)
    assert.equal((await admin.put(`${H()}/profile`, { ...p, slug: 'renamed-hotel' })).status, 403);
    await admin.put(`${H()}/profile`, { ...p });
  });

  test('entity validation returns field errors', async () => {
    const admin = await login(users.admin);
    const r = await admin.post(`${H()}/entities/menu_items`, { name_en: '', price: -4, parent_id: null });
    assert.equal(r.status, 422);
    const cat = await one<{ id: string }>(`SELECT id FROM menu_categories WHERE hotel_id = $1 LIMIT 1`, [ids.royal]);
    const r2 = await admin.post(`${H()}/entities/menu_items`, { name_en: 'Tea', price: -4, parent_id: cat!.id });
    assert.equal(r2.status, 422);
    assert.ok(r2.body.error.details.fields.price);
    const r3 = await admin.post(`${H()}/entities/menu_items`, { name_en: 'Tea', price: 9, parent_id: cat!.id, image: 'javascript:alert(1)' });
    assert.equal(r3.status, 422);
    assert.ok(r3.body.error.details.fields.image);
  });
});

describe('reviews moderation', () => {
  test('guest reviews are hidden until approved and can be hidden again', async () => {
    const guest = new Client();
    const r = await guest.post('/public/hotels/swiss-flora-royal/reviews', { guest_name: 'Omar', rating: 5, body: 'Wonderful stay, great staff.' });
    assert.equal(r.status, 201);
    let pub = (await guest.get('/public/hotels/swiss-flora-royal/reviews')).body;
    assert.equal(pub.count, 0);
    const admin = await login(users.frontOffice);
    const pending = (await admin.get(`${H()}/reviews?status=PENDING`)).body.reviews;
    const id = pending[0].id;
    assert.equal((await admin.post(`${H()}/reviews/${id}/status`, { status: 'APPROVED' })).status, 200);
    pub = (await guest.get('/public/hotels/swiss-flora-royal/reviews')).body;
    assert.equal(pub.count, 1);
    assert.equal(pub.average, 5);
    await admin.post(`${H()}/reviews/${id}/status`, { status: 'HIDDEN' });
    pub = (await guest.get('/public/hotels/swiss-flora-royal/reviews')).body;
    assert.equal(pub.count, 0);
  });
});
