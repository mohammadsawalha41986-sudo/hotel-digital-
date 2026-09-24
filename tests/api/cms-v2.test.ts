import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { bundle, ids, login, one, outletByName, setup, teardown, users } from './helpers';

before(setup);
after(teardown);

const H = () => `/admin/hotels/${ids.royal}`;

describe('stable codes', () => {
  test('codes are generated, unique per hotel, and validated', async () => {
    const admin = await login(users.admin);
    const a = await admin.post(`${H()}/entities/room_services`, { name_en: 'Ironing board', department: 'HOUSEKEEPING' });
    assert.equal(a.status, 201);
    assert.equal(a.body.code, 'RS-IRONING-BOARD');
    const b = await admin.post(`${H()}/entities/room_services`, { name_en: 'Ironing board', department: 'HOUSEKEEPING' });
    assert.equal(b.body.code, 'RS-IRONING-BOARD-2', 'a clash gets a numeric suffix');
    const clash = await admin.post(`${H()}/entities/room_services`, { name_en: 'Kettle', department: 'HOUSEKEEPING', code: 'RS-IRONING-BOARD' });
    assert.equal(clash.status, 422);
    assert.ok(clash.body.error.details.fields.code);
    const bad = await admin.post(`${H()}/entities/room_services`, { name_en: 'Kettle', department: 'HOUSEKEEPING', code: 'bad code!' });
    assert.equal(bad.status, 422);
    const custom = await admin.post(`${H()}/entities/room_services`, { name_en: 'Kettle', department: 'HOUSEKEEPING', code: 'rs-kettle' });
    assert.equal(custom.body.code, 'RS-KETTLE', 'codes are normalised to upper case');
  });

  test('a department that does not exist in the hotel is rejected', async () => {
    const admin = await login(users.admin);
    const r = await admin.post(`${H()}/entities/room_services`, { name_en: 'Ghost', department: 'NOPE_DEPT' });
    assert.equal(r.status, 422);
    assert.match(r.body.error.details.fields.department, /not configured/);
  });
});

describe('no silent success', () => {
  test('PATCH with no recognised field is a 422, not a 200', async () => {
    const admin = await login(users.admin);
    const svc = (await admin.get(`${H()}/entities/room_services`)).body.items[0];
    const r = await admin.req('PATCH', `${H()}/entities/room_services/${svc.id}`, { nonsense: 1 });
    assert.equal(r.status, 422);
    assert.equal(r.body.error.code, 'no_changes');
    const empty = await admin.req('PATCH', `${H()}/entities/room_services/${svc.id}`, {});
    assert.equal(empty.status, 422);
  });

  test('PATCH reports whether anything changed', async () => {
    const admin = await login(users.admin);
    const svc = (await admin.get(`${H()}/entities/room_services`)).body.items[0];
    const same = await admin.req('PATCH', `${H()}/entities/room_services/${svc.id}`, { name_en: svc.name_en });
    assert.equal(same.status, 200);
    assert.equal(same.body.changed, false);
    const diff = await admin.req('PATCH', `${H()}/entities/room_services/${svc.id}`, { name_en: `${svc.name_en}!` });
    assert.equal(diff.body.changed, true);
    assert.equal(diff.body.name_en, `${svc.name_en}!`);
  });

  test('settings, branding and profile merge partial bodies instead of resetting', async () => {
    const admin = await login(users.admin);
    const before = (await admin.get(H())).body;
    assert.equal((await admin.put(`${H()}/settings`, {})).status, 422, 'empty body is rejected');
    assert.equal((await admin.req('PATCH', `${H()}/settings`, { unknown_key: true })).status, 422);
    const r = await admin.req('PATCH', `${H()}/settings`, { emergency_phone: '+966500009999' });
    assert.equal(r.status, 200);
    assert.equal(r.body.changed, true);
    assert.equal(r.body.settings.emergency_phone, '+966500009999');
    assert.equal(r.body.settings.fallback_department, before.settings.fallback_department, 'other settings are kept');
    const again = await admin.req('PATCH', `${H()}/settings`, { emergency_phone: '+966500009999' });
    assert.equal(again.body.changed, false);

    const p = await admin.req('PATCH', `${H()}/profile`, { phone: '+966110001234' });
    assert.equal(p.status, 200);
    assert.equal(p.body.profile.name_en, before.profile.name_en);
    const b = await admin.req('PATCH', `${H()}/branding`, { logo: 'https://cdn.example.com/l.png' });
    assert.equal(b.body.branding.colors.primary, before.branding.colors.primary);
  });
});

describe('archive, duplicate, delete protection', () => {
  test('archived records disappear from guests and admin lists but can be restored', async () => {
    const admin = await login(users.admin);
    const svc = (await admin.get(`${H()}/entities/room_services`)).body.items.find((s: any) => s.is_active);
    const a = await admin.post(`${H()}/entities/room_services/${svc.id}/archive`);
    assert.equal(a.status, 200);
    assert.equal(a.body.archived, true);
    assert.ok(!(await bundle()).catalog.room_services.some((s: any) => s.id === svc.id));
    assert.ok(!(await admin.get(`${H()}/entities/room_services`)).body.items.some((s: any) => s.id === svc.id));
    assert.ok((await admin.get(`${H()}/entities/room_services?archived=only`)).body.items.some((s: any) => s.id === svc.id));
    const stats = (await admin.get(`${H()}/entities/room_services/stats`)).body;
    assert.ok(stats.archived >= 1);
    await admin.post(`${H()}/entities/room_services/${svc.id}/restore`);
    assert.ok((await bundle()).catalog.room_services.some((s: any) => s.id === svc.id));
  });

  test('duplicating a menu copies its categories and items, hidden by default', async () => {
    const admin = await login(users.admin);
    const outlet = await outletByName('In-Room Dining');
    const menu = (await admin.get(`${H()}/entities/menus?parent_id=${outlet.id}`)).body.items[0];
    const srcItems = await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM menu_items i JOIN menu_categories c ON c.id = i.parent_id WHERE c.parent_id = $1`,
      [menu.id]
    );
    const r = await admin.post(`${H()}/entities/menus/${menu.id}/duplicate`);
    assert.equal(r.status, 201);
    assert.equal(r.body.is_active, false);
    assert.match(r.body.name_en, /\(copy\)$/);
    assert.notEqual(r.body.code, menu.code);
    const copied = await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM menu_items i JOIN menu_categories c ON c.id = i.parent_id WHERE c.parent_id = $1`,
      [r.body.id]
    );
    assert.equal(copied!.n, srcItems!.n);
  });

  test('deleting a parent with children, or a record still referenced, is refused', async () => {
    const admin = await login(users.admin);
    const outlet = await outletByName('In-Room Dining');
    const del = await admin.req('DELETE', `${H()}/entities/outlets/${outlet.id}`);
    assert.equal(del.status, 409);
    const qa = (await admin.get(`${H()}/entities/quick_actions`)).body.items.find((x: any) => x.room_service_id);
    const refDel = await admin.req('DELETE', `${H()}/entities/room_services/${qa.room_service_id}`);
    assert.equal(refDel.status, 409);
    assert.match(refDel.body.error.message, /Still used by/);
  });
});
