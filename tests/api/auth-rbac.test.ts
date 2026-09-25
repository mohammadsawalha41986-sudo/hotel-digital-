import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, bundle, guest, ids, login, menuItems, one, outletByName, q, setup, teardown, users } from './helpers';
import { clearPublicCaches } from '../../server/services/bundleCache';

before(setup);
after(teardown);

describe('authentication', () => {
  test('admin API is not public', async () => {
    const anon = new Client();
    for (const path of [`/admin/hotels`, `/admin/hotels/${ids.royal}`, `/admin/hotels/${ids.royal}/requests`, `/admin/hotels/${ids.royal}/entities/menu_items`]) {
      const r = await anon.get(path);
      assert.equal(r.status, 401, path);
    }
  });

  test('login sets an httpOnly session cookie and /me reports role + permissions', async () => {
    const c = new Client();
    const r = await c.post('/auth/login', { email: users.fnb, password: 'Demo-pass-2026' });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('set-cookie') ?? '', /HttpOnly/i);
    const me = await c.get('/auth/me');
    assert.equal(me.body.user.role, 'FNB');
    assert.deepEqual(me.body.permissions.departments, ['FNB']);
    assert.ok(!me.body.permissions.modules.includes('hotel'));
  });

  test('wrong password is rejected without revealing whether the email exists', async () => {
    const a = await new Client().post('/auth/login', { email: users.fnb, password: 'nope-nope-1' });
    const b = await new Client().post('/auth/login', { email: 'nobody@example.com', password: 'nope-nope-1' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.body.error.message, b.body.error.message);
  });

  test('account locks after repeated failures', async () => {
    for (let i = 0; i < 8; i++) await new Client().post('/auth/login', { email: users.laundry, password: `bad-password-${i}` });
    const r = await new Client().post('/auth/login', { email: users.laundry, password: 'Demo-pass-2026' });
    assert.equal(r.status, 423);
    await q(`UPDATE users SET locked_until = NULL, failed_logins = 0 WHERE email = $1`, [users.laundry]);
  });

  test('logout destroys the session server-side', async () => {
    const c = await login(users.fnb);
    const cookie = c.cookie;
    await c.post('/auth/logout');
    const replay = new Client();
    replay.cookie = cookie;
    assert.equal((await replay.get(`/admin/hotels/${ids.royal}`)).status, 401);
  });

  test('mutations require the CSRF header and same origin', async () => {
    const c = await login(users.admin);
    const noHeader = await c.req('PUT', `/admin/hotels/${ids.royal}/settings`, {}, { 'x-requested-with': '' });
    assert.equal(noHeader.status, 403);
    const crossOrigin = await c.req('PUT', `/admin/hotels/${ids.royal}/settings`, {}, { origin: 'https://evil.example' });
    assert.equal(crossOrigin.status, 403);
  });

  test('deactivating a user ends their sessions immediately', async () => {
    const admin = await login(users.admin);
    const target = await login(users.spa);
    const spaId = (await one<{ id: string }>('SELECT id FROM users WHERE email = $1', [users.spa]))!.id;
    const r = await admin.patch(`/admin/hotels/${ids.royal}/users/${spaId}`, { is_active: false });
    assert.equal(r.status, 200);
    assert.equal((await target.get(`/admin/hotels/${ids.royal}/requests`)).status, 401);
    await admin.patch(`/admin/hotels/${ids.royal}/users/${spaId}`, { is_active: true });
  });

  test('password policy is enforced on change', async () => {
    const c = await login(users.maintenance);
    const weak = await c.post('/auth/password', { current: 'Demo-pass-2026', next: 'short' });
    assert.equal(weak.status, 422);
  });
});

describe('role-based access', () => {
  test('department roles cannot edit hotel configuration or other modules', async () => {
    const fnb = await login(users.fnb);
    assert.equal((await fnb.put(`/admin/hotels/${ids.royal}/branding`, {})).status, 403);
    assert.equal((await fnb.put(`/admin/hotels/${ids.royal}/departments`, { departments: [] })).status, 403);
    assert.equal((await fnb.get(`/admin/hotels/${ids.royal}/entities/laundry_items`)).status, 403);
    assert.equal((await fnb.get(`/admin/hotels/${ids.royal}/users`)).status, 403);
    // …but can manage their own catalog
    assert.equal((await fnb.get(`/admin/hotels/${ids.royal}/entities/menu_items`)).status, 200);
  });

  test('staff only see requests for their departments', async () => {
    const g = new Client();
    const outlet = await outletByName('In-Room Dining');
    const item = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('juice'));
    const order = await g.post('/public/hotels/swiss-flora-royal/requests', { guest: guest(), payload: { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: item.id, quantity: 1, modifiers: { size: ['regular'] } }] } });
    assert.equal(order.status, 201, JSON.stringify(order.body));
    const b = await bundle();
    const towels = b.catalog.room_services.find((s: any) => s.name_en === 'Extra towels');
    const hk = await g.post('/public/hotels/swiss-flora-royal/requests', { guest: guest(), payload: { kind: 'ROOM_SERVICE', service_id: towels.id, quantity: 2 } });
    assert.equal(hk.status, 201);

    const fnb = await login(users.fnb);
    const housekeeping = await login(users.housekeeping);
    const fnbList = (await fnb.get(`/admin/hotels/${ids.royal}/requests?status=ALL`)).body.requests;
    const hkList = (await housekeeping.get(`/admin/hotels/${ids.royal}/requests?status=ALL`)).body.requests;
    assert.ok(fnbList.every((r: any) => r.department === 'FNB'));
    assert.ok(hkList.every((r: any) => r.department === 'HOUSEKEEPING'));
    assert.ok(fnbList.some((r: any) => r.id === order.body.id));
    // Direct access to another department's request is indistinguishable from not found.
    assert.equal((await housekeeping.get(`/admin/hotels/${ids.royal}/requests/${order.body.id}`)).status, 404);
    assert.equal((await housekeeping.post(`/admin/hotels/${ids.royal}/requests/${order.body.id}/status`, { status: 'ACCEPTED' })).status, 404);
    // Analytics are scoped the same way.
    const a = (await housekeeping.get(`/admin/hotels/${ids.royal}/analytics`)).body;
    assert.ok(a.by_department.every((d: any) => d.department === 'HOUSEKEEPING'));
  });

  test('hotel admins cannot grant super admin', async () => {
    const admin = await login(users.admin);
    const r = await admin.post(`/admin/hotels/${ids.royal}/users`, { email: 'x@y.com', name: 'Xavier', role: 'SUPER_ADMIN', password: 'Longenough-123' });
    assert.equal(r.status, 403);
  });
});

describe('multi-hotel isolation', () => {
  test('a hotel admin cannot read or write another hotel through any endpoint', async () => {
    const harbour = await login(users.harbourAdmin);
    const paths = [
      '',
      '/requests',
      '/analytics',
      '/departments',
      '/media',
      '/users',
      '/audit',
      '/reviews',
      '/entities/menu_items',
      '/entities/outlets',
      '/export/menu',
    ];
    for (const p of paths) assert.equal((await harbour.get(`/admin/hotels/${ids.royal}${p}`)).status, 404, `GET ${p}`);
    assert.equal((await harbour.put(`/admin/hotels/${ids.royal}/branding`, {})).status, 404);
    assert.equal((await harbour.post(`/admin/hotels/${ids.royal}/entities/offers`, { title_en: 'x' })).status, 404);
    const hotels = (await harbour.get('/admin/hotels')).body.hotels;
    assert.deepEqual(hotels.map((h: any) => h.id), [ids.harbour]);
  });

  test('parents and references cannot point at another hotel', async () => {
    const superAdmin = await login(users.superAdmin);
    const royalOutlet = await outletByName('In-Room Dining');
    const r = await superAdmin.post(`/admin/hotels/${ids.harbour}/entities/menus`, { name_en: 'Hijack', parent_id: royalOutlet.id });
    assert.equal(r.status, 422);
    assert.match(r.body.error.details.fields.parent_id, /not found in this hotel/);
    const royalService = (await bundle()).catalog.room_services[0];
    const qa = await superAdmin.post(`/admin/hotels/${ids.harbour}/entities/quick_actions`, { label_en: 'x', action: 'room_service', room_service_id: royalService.id });
    assert.equal(qa.status, 422);
  });

  test('guests cannot order another hotel’s items or read its menus via a different slug', async () => {
    const royalOutlet = await outletByName('In-Room Dining');
    const royalItem = (await menuItems(royalOutlet.id))[0];
    const viaHarbour = await new Client().get(`/public/hotels/demo-harbour-hotel/outlets/${royalOutlet.id}/menu`);
    assert.equal(viaHarbour.status, 404);
    const harbourOutlet = await outletByName('[Demo] Harbour Grill', 'demo-harbour-hotel');
    const order = await new Client().post('/public/hotels/demo-harbour-hotel/requests', { guest: guest(), payload: { kind: 'ORDER', outlet_id: harbourOutlet.id, lines: [{ item_id: royalItem.id, quantity: 1 }] } });
    assert.equal(order.status, 409);
  });

  test('WhatsApp routing never crosses hotels', async () => {
    const harbourOutlet = await outletByName('[Demo] Harbour Grill', 'demo-harbour-hotel');
    const item = (await menuItems(harbourOutlet.id, 'demo-harbour-hotel'))[0];
    const r = await new Client().post('/public/hotels/demo-harbour-hotel/requests', { guest: guest(), payload: { kind: 'ORDER', outlet_id: harbourOutlet.id, lines: [{ item_id: item.id, quantity: 1 }] } });
    assert.equal(r.status, 201);
    assert.match(r.body.whatsapp_url, /wa\.me\/966500000901/);
  });

  test('unpublished hotels are invisible to guests but previewable by their staff', async () => {
    await q('UPDATE hotels SET is_published = false WHERE id = $1', [ids.harbour]);
    clearPublicCaches(); // direct SQL bypasses the app's cache invalidation
    assert.equal((await new Client().get('/public/hotels/demo-harbour-hotel')).status, 404);
    const staff = await login(users.harbourAdmin);
    const r = await staff.get('/public/hotels/demo-harbour-hotel');
    assert.equal(r.status, 200);
    assert.equal(r.body.preview, true);
    const otherStaff = await login(users.admin);
    assert.equal((await otherStaff.get('/public/hotels/demo-harbour-hotel')).status, 404);
    await q('UPDATE hotels SET is_published = true WHERE id = $1', [ids.harbour]);
    clearPublicCaches();
  });

  test('public bundle does not leak private routing numbers', async () => {
    const b = await bundle();
    const json = JSON.stringify(b);
    assert.ok(!json.includes('966500000101'), 'department WhatsApp number must not be in the bundle');
    assert.ok(b.departments.every((d: any) => !('whatsapp' in d)));
  });
});
