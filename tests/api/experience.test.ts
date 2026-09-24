import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, bundle, ids, login, one, publish, q, setup, teardown, users } from './helpers';

before(setup);
after(teardown);

const H = () => `/admin/hotels/${ids.royal}`;
const events = (c: Client, body: unknown) => c.post('/public/hotels/swiss-flora-royal/events', body);

describe('experience categories', () => {
  test('are managed like any catalog entity and reach guests after publishing', async () => {
    const admin = await login(users.admin);
    const b0 = await bundle();
    assert.ok(Array.isArray(b0.catalog.experiences));
    const n0 = b0.catalog.experiences.length;
    const outlet = b0.catalog.outlets[0];
    const r = await admin.post(`${H()}/entities/experiences`, { title_en: 'Rooftop sunset', title_ar: 'غروب السطح', target: 'outlet', outlet_id: outlet.id, badges: ['new', 'exclusive'], icon: 'sun' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.match(r.body.code, /^EXP-ROOFTOP-SUNSET/);
    assert.equal((await bundle()).catalog.experiences.length, n0, 'draft until published');
    await publish(admin);
    const exp = (await bundle()).catalog.experiences.find((e: any) => e.title_en === 'Rooftop sunset');
    assert.deepEqual(exp.badges, ['new', 'exclusive']);
    assert.equal(exp.outlet_id, outlet.id);
  });

  test('targets must exist in the same hotel; badges are validated', async () => {
    const admin = await login(users.admin);
    const other = await one(`SELECT id FROM outlets WHERE hotel_id = $1 LIMIT 1`, [ids.harbour]);
    const bad = await admin.post(`${H()}/entities/experiences`, { title_en: 'X', target: 'outlet', outlet_id: other.id });
    assert.equal(bad.status, 422);
    const tag = await admin.post(`${H()}/entities/offers`, { title_en: 'x', badges: ['cheapest'] });
    assert.equal(tag.status, 422);
    assert.ok(Object.keys(tag.body.error.details.fields).some((k) => k.startsWith('badges')), JSON.stringify(tag.body));
  });

  test('merchandised menu items are in the bundle with their outlet', async () => {
    const b = await bundle();
    assert.ok(b.catalog.featured_items.length > 0);
    for (const i of b.catalog.featured_items) {
      assert.ok(i.outlet_id, 'each featured item links to its outlet');
      assert.ok(i.featured || i.recommended || i.badges?.length);
      assert.notEqual(i.available, false, 'sold-out items are not promoted');
      assert.equal(i.internal_notes, undefined, 'staff-only fields never leave the admin API');
    }
  });
});

describe('guest engagement counters', () => {
  test('store only aggregate daily counts, never guest identifiers', async () => {
    const g = new Client();
    const r = await events(g, {
      events: [
        { event: 'offer_impression', target_type: 'offer', target_code: 'OFFER-X' },
        { event: 'offer_impression', target_type: 'offer', target_code: 'OFFER-X' },
        { event: 'offer_click', target_type: 'offer', target_code: 'OFFER-X' },
        { event: 'request_started' },
        { event: 'request_completed' },
        { event: 'whatsapp_click', target_type: 'department', target_code: 'FNB' },
      ],
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.recorded, 6);
    const rows = await q(`SELECT * FROM guest_event_counts WHERE hotel_id = $1`, [ids.royal]);
    assert.equal(rows.find((x: any) => x.event === 'offer_impression').n, 2, 'duplicates collapse into one counter');
    const cols = Object.keys(rows[0]).sort();
    assert.deepEqual(cols, ['day', 'event', 'hotel_id', 'n', 'target_code', 'target_type'], 'no session, device, IP or guest column exists');
  });

  test('invalid events are rejected; personal-looking values cannot be sent as targets', async () => {
    const g = new Client();
    assert.equal((await events(g, { events: [{ event: 'page_view' }] })).status, 422);
    assert.equal((await events(g, { events: [{ event: 'offer_click', target_code: 'sara@example.com' }] })).status, 422);
    assert.equal((await events(g, { events: [] })).status, 422);
    assert.equal((await events(g, { events: Array.from({ length: 26 }, () => ({ event: 'offer_click' })) })).status, 422);
  });

  test('staff previews are not counted', async () => {
    const admin = await login(users.admin);
    const before = (await one(`SELECT COALESCE(SUM(n),0)::int AS n FROM guest_event_counts WHERE hotel_id = $1`, [ids.royal])).n;
    const r = await admin.post('/public/hotels/swiss-flora-royal/events?preview=1', { events: [{ event: 'offer_click' }] });
    assert.equal(r.body.preview, true);
    assert.equal((await one(`SELECT COALESCE(SUM(n),0)::int AS n FROM guest_event_counts WHERE hotel_id = $1`, [ids.royal])).n, before);
  });

  test('the admin dashboard gets conversion figures; department roles do not', async () => {
    const admin = await login(users.admin);
    const a = await admin.get(`${H()}/analytics?days=7`);
    assert.equal(a.status, 200);
    assert.equal(a.body.engagement.totals.offer_impression, 2);
    assert.equal(a.body.engagement.offer_ctr, 50);
    assert.equal(a.body.engagement.request_completion, 100);
    assert.ok(a.body.engagement.top.some((t: any) => t.target_code === 'OFFER-X'));
    const hk = await login(users.housekeeping);
    assert.equal((await hk.get(`${H()}/analytics?days=7`)).body.engagement, null);
  });
});
