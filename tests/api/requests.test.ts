import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, bundle, guest, ids, login, menuItems, one, outletByName, q, setup, teardown, users } from './helpers';

before(setup);
after(teardown);

const SLUG = 'swiss-flora-royal';
const submit = (c: Client, payload: unknown, g = guest(), lang = 'en') => c.post(`/public/hotels/${SLUG}/requests`, { guest: g, lang, payload });

describe('food orders', () => {
  test('server recomputes totals from DB prices, modifiers and VAT (inclusive)', async () => {
    const outlet = await outletByName('In-Room Dining');
    const burger = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('Beef burger'));
    const c = new Client();
    const r = await submit(c, { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: burger.id, quantity: 2, modifiers: { doneness: ['well'], addons: ['cheese', 'egg'] }, note: 'no pickles' }], notes: 'Ring bell' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    // (72 + 5 + 4) × 2 = 162, VAT-inclusive at 15%
    assert.deepEqual(r.body.totals, { subtotal: 140.87, vat: 21.13, total: 162 });
    assert.equal(r.body.department, 'FNB');
    assert.match(r.body.reference, /^ORD-\d{6}-\d{3}$/);
    const msg = decodeURIComponent(r.body.whatsapp_url.split('text=')[1]).replace(/\u00a0/g, ' ');
    for (const part of ['Swiss Flora Royal Hotel Riyadh', r.body.reference, 'Room: *1204*', 'Test Guest', '2 × [Demo] Beef burger', 'Extra cheese', 'no pickles', 'Ring bell', 'SAR 162']) {
      assert.ok(msg.includes(part), `message should contain ${part}\n${msg}`);
    }
    const row = await one('SELECT total, room, guest_name, source_id FROM requests WHERE id = $1', [r.body.id]);
    assert.equal(row.total, 162);
    assert.equal(row.source_id, outlet.id);
  });

  test('client-supplied prices are ignored', async () => {
    const outlet = await outletByName('In-Room Dining');
    const juice = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('juice'));
    const r = await submit(new Client(), { kind: 'ORDER', outlet_id: outlet.id, total: 1, lines: [{ item_id: juice.id, quantity: 1, price: 0.01, modifiers: { size: ['large'] } }] });
    assert.equal(r.status, 201);
    assert.equal(r.body.totals.total, 30); // 24 + 6 (large)
  });

  test('VAT-exclusive hotels add VAT on top', async () => {
    const outlet = await outletByName('[Demo] Harbour Grill', 'demo-harbour-hotel');
    const steak = (await menuItems(outlet.id, 'demo-harbour-hotel'))[0];
    const r = await new Client().post('/public/hotels/demo-harbour-hotel/requests', { guest: guest(), payload: { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: steak.id, quantity: 1 }] } });
    assert.deepEqual(r.body.totals, { subtotal: 140, vat: 21, total: 161 });
  });

  test('required modifiers, max selections and unknown options are enforced', async () => {
    const outlet = await outletByName('In-Room Dining');
    const burger = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('Beef burger'));
    const c = new Client();
    assert.equal((await submit(c, { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: burger.id, quantity: 1 }] })).status, 422);
    assert.equal((await submit(c, { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: burger.id, quantity: 1, modifiers: { doneness: ['medium', 'well'] } }] })).status, 422);
    assert.equal((await submit(c, { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: burger.id, quantity: 1, modifiers: { doneness: ['raw'] } }] })).status, 400);
  });

  test('unavailable items, hidden items and closed outlets cannot be ordered', async () => {
    const outlet = await outletByName('In-Room Dining');
    const items = await menuItems(outlet.id);
    const biryani = items.find((i: any) => i.name_en.includes('biryani'));
    assert.equal((await submit(new Client(), { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: biryani.id, quantity: 1 }] })).status, 409);

    const juice = items.find((i: any) => i.name_en.includes('juice'));
    await q(`UPDATE outlets SET data = data || '{"status_override":"closed"}' WHERE id = $1`, [outlet.id]);
    const closed = await submit(new Client(), { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: juice.id, quantity: 1, modifiers: { size: ['regular'] } }] });
    assert.equal(closed.status, 409);
    assert.match(closed.body.error.message, /closed/i);
    await q(`UPDATE outlets SET data = data || '{"status_override":"auto"}' WHERE id = $1`, [outlet.id]);

    await q('UPDATE menu_items SET is_active = false WHERE id = $1', [juice.id]);
    assert.equal((await submit(new Client(), { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: juice.id, quantity: 1, modifiers: { size: ['regular'] } }] })).status, 409);
    await q('UPDATE menu_items SET is_active = true WHERE id = $1', [juice.id]);
  });

  test('external visitors are refused at room-only outlets', async () => {
    const outlet = await outletByName('In-Room Dining');
    const juice = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('juice'));
    const r = await submit(new Client(), { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: juice.id, quantity: 1, modifiers: { size: ['regular'] } }] }, guest('', 'EXTERNAL'));
    assert.equal(r.status, 409);
  });

  test('identity validation: in-house guests need a room, phone required by default', async () => {
    const outlet = await outletByName('In-Room Dining');
    const r1 = await submit(new Client(), { kind: 'ORDER', outlet_id: outlet.id, lines: [] }, { type: 'IN_HOUSE', name: 'A', phone: '', room: '' });
    assert.equal(r1.status, 422);
    assert.ok(r1.body.error.details.fields['guest.room']);
    const b = await bundle();
    const towels = b.catalog.room_services.find((s: any) => s.name_en === 'Extra towels');
    const r2 = await submit(new Client(), { kind: 'ROOM_SERVICE', service_id: towels.id }, { type: 'IN_HOUSE', name: 'Sara', phone: '', room: '1204' });
    assert.equal(r2.status, 422);
    assert.ok(r2.body.error.details.fields['guest.phone']);
  });
});

describe('services, laundry, spa, feedback routing', () => {
  test('room service uses stored room, routes to its department, enforces answers', async () => {
    const b = await bundle();
    const ac = b.catalog.room_services.find((s: any) => s.name_en === 'Air-conditioning issue');
    const missing = await submit(new Client(), { kind: 'ROOM_SERVICE', service_id: ac.id }, guest('808'));
    assert.equal(missing.status, 422);
    assert.ok(missing.body.error.details.fields['answers.issue']);
    const r = await submit(new Client(), { kind: 'ROOM_SERVICE', service_id: ac.id, answers: { issue: 'too_warm' }, notes: 'Since 2am' }, guest('808'));
    assert.equal(r.status, 201);
    assert.equal(r.body.department, 'MAINTENANCE');
    assert.match(r.body.whatsapp_url, /wa\.me\/966500000103/);
    const row = await one('SELECT room, priority, details FROM requests WHERE id = $1', [r.body.id]);
    assert.equal(row.room, '808');
    assert.equal(row.priority, 'HIGH');
    assert.equal(row.details.answers.issue, 'too_warm');
  });

  test('room services require an in-house guest', async () => {
    const b = await bundle();
    const towels = b.catalog.room_services.find((s: any) => s.name_en === 'Extra towels');
    const r = await submit(new Client(), { kind: 'ROOM_SERVICE', service_id: towels.id }, guest('', 'EXTERNAL'));
    assert.equal(r.status, 422);
  });

  test('laundry totals include express surcharge and are routed to Laundry', async () => {
    const b = await bundle();
    const shirt = b.catalog.laundry_items.find((i: any) => i.name_en.includes('Shirt'));
    const thobe = b.catalog.laundry_items.find((i: any) => i.name_en.includes('Thobe'));
    const r = await submit(new Client(), { kind: 'LAUNDRY', express: true, pickup: 'As soon as possible', lines: [{ item_id: shirt.id, service: 'wash', quantity: 3 }, { item_id: thobe.id, service: 'dry_clean', quantity: 1 }] });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    // (12×1.5×3) + (20×1.5×1) = 54 + 30 = 84
    assert.equal(r.body.totals.total, 84);
    assert.equal(r.body.department, 'LAUNDRY');
    assert.match(r.body.reference, /^LDY-/);
  });

  test('spa booking validates date and guest count and is routed to Spa', async () => {
    const b = await bundle();
    const swedish = b.catalog.spa_services.find((s: any) => s.name_en === 'Swedish massage');
    assert.equal((await submit(new Client(), { kind: 'SPA', service_id: swedish.id, date: '2020-01-01', time: '10:00' })).status, 422);
    assert.equal((await submit(new Client(), { kind: 'SPA', service_id: swedish.id, date: '2099-01-01', time: '10:00', guests: 9 })).status, 422);
    const r = await submit(new Client(), { kind: 'SPA', service_id: swedish.id, date: '2099-01-01', time: '17:30', guests: 2 });
    assert.equal(r.status, 201);
    assert.equal(r.body.totals.total, 560);
    assert.equal(r.body.department, 'SPA');
  });

  test('complaints go to management, suggestions to the feedback desk', async () => {
    const complaint = await submit(new Client(), { kind: 'FEEDBACK', feedback_type: 'COMPLAINT', subject: 'Noise at night', message: 'Loud music from the corridor after midnight.', urgency: 'HIGH' });
    assert.equal(complaint.status, 201);
    assert.equal(complaint.body.department, 'MANAGEMENT');
    assert.match(complaint.body.whatsapp_url, /966500000108/);
    const suggestion = await submit(new Client(), { kind: 'FEEDBACK', feedback_type: 'SUGGESTION', subject: 'Late breakfast', message: 'Please extend breakfast on weekends.' });
    assert.equal(suggestion.body.department, 'FEEDBACK');
    assert.match(suggestion.body.whatsapp_url, /966500000109/);
  });

  test('a department without WhatsApp falls back to the configured department, or to none', async () => {
    await q(`UPDATE departments SET whatsapp = '' WHERE hotel_id = $1 AND code = 'CONCIERGE'`, [ids.royal]);
    const b = await bundle();
    const transfer = b.catalog.hotel_services.find((s: any) => s.name_en === 'Transportation & taxi');
    const r = await submit(new Client(), { kind: 'HOTEL_SERVICE', service_id: transfer.id });
    assert.match(r.body.whatsapp_url, /966500000104/); // FRONT_OFFICE fallback
    await q(`UPDATE hotels SET settings = settings || '{"fallback_department": null}' WHERE id = $1`, [ids.royal]);
    const r2 = await submit(new Client(), { kind: 'HOTEL_SERVICE', service_id: transfer.id });
    assert.equal(r2.status, 201);
    assert.equal(r2.body.whatsapp_url, null); // still stored in the admin queue
    assert.ok(await one('SELECT 1 FROM requests WHERE id = $1', [r2.body.id]));
    await q(`UPDATE hotels SET settings = settings || '{"fallback_department": "FRONT_OFFICE"}' WHERE id = $1`, [ids.royal]);
    await q(`UPDATE departments SET whatsapp = '+966500000105' WHERE hotel_id = $1 AND code = 'CONCIERGE'`, [ids.royal]);
  });

  test('Arabic submissions produce an Arabic staff message', async () => {
    const b = await bundle();
    const towels = b.catalog.room_services.find((s: any) => s.name_en === 'Extra towels');
    const r = await submit(new Client(), { kind: 'ROOM_SERVICE', service_id: towels.id, quantity: 3 }, guest('1204'), 'ar');
    const msg = decodeURIComponent(r.body.whatsapp_url.split('text=')[1]);
    assert.ok(msg.includes('الغرفة: *1204*'));
    assert.ok(msg.includes('مناشف إضافية'));
  });
});

describe('request lifecycle', () => {
  test('references are sequential per hotel and type', async () => {
    const b = await bundle();
    const pillows = b.catalog.room_services.find((s: any) => s.name_en === 'Extra pillows');
    const a = await submit(new Client(), { kind: 'ROOM_SERVICE', service_id: pillows.id });
    const c = await submit(new Client(), { kind: 'ROOM_SERVICE', service_id: pillows.id });
    const n = (ref: string) => Number(ref.split('-').pop());
    assert.equal(n(c.body.reference), n(a.body.reference) + 1);
  });

  test('staff move a request through its lifecycle with timestamps and a guest-visible timeline', async () => {
    const guestClient = new Client();
    const b = await bundle();
    const linen = b.catalog.room_services.find((s: any) => s.name_en === 'Linen change');
    const created = await submit(guestClient, { kind: 'ROOM_SERVICE', service_id: linen.id });
    const hk = await login(users.housekeeping);
    const base = `/admin/hotels/${ids.royal}/requests/${created.body.id}`;

    assert.equal((await hk.post(`${base}/status`, { status: 'REJECTED' })).status, 422, 'decline needs a reason');
    assert.equal((await hk.post(`${base}/status`, { status: 'ACCEPTED', guest_message: 'On our way' })).status, 200);
    assert.equal((await hk.post(`${base}/notes`, { note: 'Assigned to Maria' })).status, 201);
    assert.equal((await hk.post(`${base}/status`, { status: 'IN_PROGRESS' })).status, 200);
    assert.equal((await hk.post(`${base}/status`, { status: 'COMPLETED' })).status, 200);
    assert.equal((await hk.post(`${base}/status`, { status: 'IN_PROGRESS' })).status, 409, 'completed is terminal');

    const row = await one('SELECT status, accepted_at, started_at, completed_at FROM requests WHERE id = $1', [created.body.id]);
    assert.equal(row.status, 'COMPLETED');
    assert.ok(row.accepted_at && row.started_at && row.completed_at);

    const detail = await guestClient.get(`/public/hotels/${SLUG}/requests/${created.body.reference}`);
    assert.equal(detail.body.request.status, 'COMPLETED');
    const notes = detail.body.events.map((e: any) => e.note);
    assert.ok(notes.includes('On our way'));
    assert.ok(!notes.includes('Assigned to Maria'), 'internal notes are never shown to guests');

    const audit = await one(`SELECT COUNT(*) AS n FROM audit_log WHERE entity = 'request' AND entity_id = $1`, [created.body.id]);
    assert.equal(audit.n, 3);
  });

  test('guests only see their own requests and can cancel only while NEW', async () => {
    const mine = new Client();
    const other = new Client();
    const b = await bundle();
    const water = b.catalog.room_services.find((s: any) => s.name_en === 'Drinking water');
    const r = await submit(mine, { kind: 'ROOM_SERVICE', service_id: water.id });
    assert.equal((await other.get(`/public/hotels/${SLUG}/requests/${r.body.reference}`)).status, 404);
    assert.ok(!(await other.get(`/public/hotels/${SLUG}/requests`)).body.requests.some((x: any) => x.id === r.body.id));
    assert.ok((await mine.get(`/public/hotels/${SLUG}/requests`)).body.requests.some((x: any) => x.id === r.body.id));
    assert.equal((await other.post(`/public/hotels/${SLUG}/requests/${r.body.reference}/cancel`)).status, 409);
    assert.equal((await mine.post(`/public/hotels/${SLUG}/requests/${r.body.reference}/cancel`)).status, 200);
    assert.equal((await mine.post(`/public/hotels/${SLUG}/requests/${r.body.reference}/cancel`)).status, 409);
  });

  test('a guest token is mandatory for request endpoints', async () => {
    const c = new Client('');
    assert.equal((await c.get(`/public/hotels/${SLUG}/requests`)).status, 400);
  });

  test('analytics reflect real requests only', async () => {
    const admin = await login(users.admin);
    const a = (await admin.get(`/admin/hotels/${ids.royal}/analytics?days=1`)).body;
    const count = await one(`SELECT COUNT(*) AS n FROM requests WHERE hotel_id = $1`, [ids.royal]);
    assert.equal(a.summary.total, count.n);
    assert.ok(a.summary.avg_completion_min !== null);
    assert.ok(a.popular_items.some((p: any) => p.name_en.includes('Beef burger')));
    assert.ok(a.summary.complaints >= 1);
  });
});
