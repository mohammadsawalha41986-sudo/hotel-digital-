import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, bundle, guest, ids, login, menuItems, one, outletByName, q, setup, teardown, users } from './helpers';

/**
 * Cross-tenant isolation. Hotel B's own admin — given FULL finance access so
 * nothing is refused for lack of a module — attacks every hotel-scoped route
 * that takes a record id, using hotel A's ids through hotel B's path (the IDOR
 * shape) and through hotel A's path directly. Every attempt must be refused,
 * and hotel A's rows must be byte-for-byte unchanged afterwards.
 */
after(teardown);

const A = () => ids.royal;
const B = () => ids.harbour;
// 400 = explicit "does not belong to this hotel" refusal (e.g. reorder).
const REFUSED = [400, 403, 404, 409, 422];

interface Fixtures {
  outlet: string;
  item: string;
  request: string;
  reference: string;
  guest: string;
  stay: string;
  media: string;
  user: string;
  batch: string;
  settlement: string;
  publication: string;
  review: string;
  department: string;
}
let f: Fixtures;

/** Fingerprint of everything hotel A owns that an attack could touch. */
async function snapshotA() {
  const tables = ['outlets', 'menu_items', 'requests', 'request_events', 'guests', 'guest_stays', 'media', 'import_batches', 'settlements', 'publications', 'reviews', 'departments', 'order_lines'];
  const out: Record<string, string> = {};
  for (const t of tables) {
    const r = await one(`SELECT md5(COALESCE(string_agg(t::text, '|' ORDER BY t::text), '')) AS h FROM ${t} t WHERE hotel_id = $1`, [A()]);
    out[t] = r.h;
  }
  const u = await one(`SELECT md5(string_agg(u::text, '|' ORDER BY u.id)) AS h FROM users u JOIN user_hotels uh ON uh.user_id = u.id WHERE uh.hotel_id = $1`, [A()]);
  out.users = u.h;
  return out;
}

before(async () => {
  await setup();
  // Hotel B may see its own finances fully, so finance routes reach the lookup.
  await q(
    `INSERT INTO hotel_commercial_settings (hotel_id, hotel_finance_access) VALUES ($1, 'FULL')
     ON CONFLICT (hotel_id) DO UPDATE SET hotel_finance_access = 'FULL'`,
    [B()]
  );
  const outlet = await outletByName('In-Room Dining');
  const item = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('juice'));
  const g = new Client();
  const r = await g.post('/public/hotels/swiss-flora-royal/requests', { guest: guest(), lang: 'en', payload: { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: item.id, quantity: 1, modifiers: { size: ['large'] } }] } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const req = await one(`SELECT id, guest_id FROM requests WHERE id = $1`, [r.body.id]);
  const stay = await one(`SELECT id FROM guest_stays WHERE guest_id = $1 LIMIT 1`, [req.guest_id]);
  const media = await one(`INSERT INTO media (hotel_id, url, kind, source, filename) VALUES ($1, '/media/x.png', 'image', 'upload', 'x.png') RETURNING id`, [A()]);
  const user = await one(`SELECT u.id FROM users u JOIN user_hotels uh ON uh.user_id = u.id WHERE uh.hotel_id = $1 AND u.email = $2`, [A(), users.fnb]);
  const batch = await one(`INSERT INTO import_batches (hotel_id, template, mode, status) VALUES ($1, 'menu_items', 'create', 'previewed') RETURNING id`, [A()]);
  const settlement = await one(
    `INSERT INTO settlements (hotel_id, settlement_no, period_type, period_start, period_end, currency) VALUES ($1, 'STL-TENANCY-1', 'CUSTOM', '2026-01-01', '2026-01-31', 'SAR') RETURNING id`,
    [A()]
  );
  const publication = await one(`SELECT id FROM publications WHERE hotel_id = $1 ORDER BY version DESC LIMIT 1`, [A()]);
  const review = await one(`INSERT INTO reviews (hotel_id, guest_name, rating, body) VALUES ($1, 'A guest', 5, 'Lovely') RETURNING id`, [A()]);
  const dept = await one(`INSERT INTO departments (hotel_id, code, name_en, name_ar) VALUES ($1, 'ROOFTOP', 'Rooftop', 'السطح') RETURNING code`, [A()]).catch(async () => one(`SELECT code FROM departments WHERE hotel_id = $1 LIMIT 1`, [A()]));
  f = {
    outlet: outlet.id,
    item: item.id,
    request: req.id,
    reference: r.body.reference,
    guest: req.guest_id,
    stay: stay?.id ?? req.guest_id,
    media: media.id,
    user: user.id,
    batch: batch.id,
    settlement: settlement.id,
    publication: publication.id,
    review: review.id,
    department: dept.code,
  };
});

describe('tenant isolation', () => {
  test('hotel B cannot read or change hotel A records through any hotel-scoped route', async () => {
    const b = await login(users.harbourAdmin);
    const before = await snapshotA();
    const attacks: [string, string, unknown?][] = [];
    for (const hid of [B(), A()]) {
      const H = `/admin/hotels/${hid}`;
      attacks.push(
        ['GET', `${H}/entities/outlets/${f.outlet}`],
        ['PATCH', `${H}/entities/outlets/${f.outlet}`, { name_en: 'pwned' }],
        ['DELETE', `${H}/entities/outlets/${f.outlet}`],
        ['POST', `${H}/entities/outlets/${f.outlet}/duplicate`, {}],
        ['PATCH', `${H}/entities/menu_items/${f.item}`, { price: 0.01 }],
        ['POST', `${H}/entities/menu_items/reorder`, { ids: [f.item] }],
        ['GET', `${H}/requests/${f.request}`],
        ['POST', `${H}/requests/${f.request}/status`, { status: 'CANCELLED', note: 'x' }],
        ['POST', `${H}/requests/${f.request}/notes`, { note: 'x' }],
        ['POST', `${H}/requests/${f.request}/resolution`, { resolution: 'x' }],
        ['GET', `${H}/orders/${f.request}`],
        ['GET', `${H}/guests/${f.guest}`],
        ['GET', `${H}/guests/${f.guest}/export`],
        ['PATCH', `${H}/guests/${f.guest}`, { notes: 'x' }],
        ['PATCH', `${H}/guests/${f.guest}/stays/${f.stay}`, { room: '1' }],
        ['POST', `${H}/guests/${f.guest}/anonymize`, { reason: 'x', confirm: true }],
        ['DELETE', `${H}/media/${f.media}`],
        ['PATCH', `${H}/users/${f.user}`, { name: 'pwned' }],
        ['DELETE', `${H}/users/${f.user}`],
        ['GET', `${H}/data/imports/${f.batch}`],
        ['POST', `${H}/data/imports/${f.batch}/commit`, {}],
        ['POST', `${H}/data/imports/${f.batch}/discard`, {}],
        ['POST', `${H}/data/imports/${f.batch}/rollback`, {}],
        ['GET', `${H}/finance/settlements/${f.settlement}`],
        ['POST', `${H}/publications/${f.publication}/republish`, {}],
        ['POST', `${H}/reviews/${f.review}/status`, { status: 'HIDDEN' }]
      );
      if (hid === A()) attacks.push(['GET', `${H}/entities/outlets`], ['GET', `${H}/requests`], ['GET', `${H}/guests`], ['GET', `${H}/analytics`], ['GET', `${H}/media`], ['DELETE', `${H}/departments/${f.department}`]);
    }
    const leaks: string[] = [];
    for (const [method, path, body] of attacks) {
      const r = method === 'GET' ? await b.get(path) : method === 'DELETE' ? await b.del(path) : method === 'PATCH' ? await b.patch(path, body) : await b.post(path, body);
      if (!REFUSED.includes(r.status)) leaks.push(`${method} ${path.replace(A(), 'A').replace(B(), 'B')} → ${r.status}`);
      // A refusal must not echo hotel A data either.
      if (JSON.stringify(r.body ?? '').includes('Swiss Flora Royal')) leaks.push(`${method} ${path} echoed hotel A data`);
    }
    assert.deepEqual(leaks, []);
    assert.deepEqual(await snapshotA(), before, 'hotel A data unchanged');
  });

  test('list endpoints of hotel B never contain hotel A rows', async () => {
    const b = await login(users.harbourAdmin);
    const H = `/admin/hotels/${B()}`;
    for (const path of ['/entities/outlets', '/entities/menu_items', '/requests', '/orders', '/guests', '/media', '/users', '/data/imports', '/finance/settlements', '/publications', '/reviews', '/audit']) {
      const r = await b.get(`${H}${path}`);
      if (r.status === 404) continue; // route shape differs; covered above
      const text = JSON.stringify(r.body);
      for (const id of Object.values(f)) assert.ok(!text.includes(id), `${path} leaked hotel A id ${id}`);
    }
  });

  test('entity references cannot point at another hotel', async () => {
    const b = await login(users.harbourAdmin);
    const cat = await one(`SELECT id FROM menu_categories WHERE hotel_id = $1 LIMIT 1`, [A()]);
    const r = await b.post(`/admin/hotels/${B()}/entities/menu_items`, { name_en: 'Cross', parent_id: cat.id, price: 10 });
    assert.ok(REFUSED.includes(r.status), `menu item in a hotel A category → ${r.status}`);
    const menu = await b.post(`/admin/hotels/${B()}/entities/menus`, { name_en: 'Cross', parent_id: f.outlet });
    assert.ok(REFUSED.includes(menu.status), `menu under a hotel A outlet → ${menu.status}`);
  });

  test('guests of hotel B cannot order hotel A items or read hotel A requests', async () => {
    const g = new Client();
    const order = await g.post('/public/hotels/demo-harbour-hotel/requests', { guest: guest(), payload: { kind: 'ORDER', outlet_id: f.outlet, lines: [{ item_id: f.item, quantity: 1 }] } });
    assert.ok(REFUSED.includes(order.status) || order.status === 400, `order across hotels → ${order.status}`);
    const own = (await bundle('demo-harbour-hotel')).catalog.outlets[0];
    const mixed = await g.post('/public/hotels/demo-harbour-hotel/requests', { guest: guest(), payload: { kind: 'ORDER', outlet_id: own.id, lines: [{ item_id: f.item, quantity: 1 }] } });
    assert.ok(mixed.status >= 400, `hotel A item inside a hotel B outlet → ${mixed.status}`);
    assert.equal((await g.get(`/public/hotels/demo-harbour-hotel/requests/${f.reference}`)).status, 404);
    // A different guest of the same hotel cannot read it either.
    assert.equal((await new Client().get(`/public/hotels/swiss-flora-royal/requests/${f.reference}`)).status, 404);
  });

  test('staff of hotel A only see hotel A; platform routes are closed to hotel roles', async () => {
    const a = await login(users.admin);
    assert.equal((await a.get(`/admin/hotels/${B()}/requests`)).status, 404);
    for (const path of ['/admin/platform/hotels', '/admin/platform/orders', '/admin/platform/settlements', '/admin/platform/ledger']) {
      const r = await a.get(path);
      assert.ok([403, 404].includes(r.status), `${path} → ${r.status}`);
    }
  });
});
