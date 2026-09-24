import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { bundle, ids, login, one, outletByName, publish, setup, teardown, users } from './helpers';

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
    assert.equal((await bundle()).catalog.room_services.find((s: any) => s.id === svc.id).available, false, 'unorderable at once');
    await publish(admin);
    assert.ok(!(await bundle()).catalog.room_services.some((s: any) => s.id === svc.id));
    assert.ok(!(await admin.get(`${H()}/entities/room_services`)).body.items.some((s: any) => s.id === svc.id));
    assert.ok((await admin.get(`${H()}/entities/room_services?archived=only`)).body.items.some((s: any) => s.id === svc.id));
    const stats = (await admin.get(`${H()}/entities/room_services/stats`)).body;
    assert.ok(stats.archived >= 1);
    await admin.post(`${H()}/entities/room_services/${svc.id}/restore`);
    await publish(admin);
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

describe('publishing', () => {
  test('versions are recorded; an older version can be republished; history is kept', async () => {
    const admin = await login(users.admin);
    const before = (await admin.get(`${H()}/publications`)).body.publications;
    const svc = (await bundle()).catalog.room_services.find((s: any) => s.name_en === 'Drinking water');
    await admin.patch(`${H()}/entities/room_services/${svc.id}`, { name_en: 'Still water' });
    const v = await publish(admin);
    assert.equal(v.publication.version, before[0].version + 1);
    assert.equal((await bundle()).catalog.room_services.find((s: any) => s.id === svc.id).name_en, 'Still water');

    const r = await admin.post(`${H()}/publications/${before[0].id}/republish`);
    assert.equal(r.status, 201);
    assert.equal(r.body.version, before[0].version + 2, 'restoring creates a new version');
    assert.equal((await bundle()).catalog.room_services.find((s: any) => s.id === svc.id).name_en, 'Drinking water');
    assert.equal((await admin.get(H())).body.has_unpublished_changes, true, 'the draft still differs from what is live');
    assert.equal((await admin.post(`${H()}/publications/${r.body.id}/republish`)).status, 409, 'already live');
    const list = (await admin.get(`${H()}/publications`)).body.publications;
    assert.equal(list.length, before.length + 2);
    assert.equal(list[0].summary.restored_from, before[0].version);
  });

  test('preview shows the draft; guests see the published version; staff previews do not leak', async () => {
    const admin = await login(users.admin);
    const b = await bundle();
    const info = b.catalog.info_items[0];
    await admin.patch(`${H()}/entities/info_items/${info.id}`, { title_en: 'Draft title only' });
    assert.notEqual((await bundle()).catalog.info_items.find((i: any) => i.id === info.id).title_en, 'Draft title only');
    const preview = await admin.get('/public/hotels/swiss-flora-royal?preview=1');
    assert.equal(preview.body.preview, true);
    assert.equal(preview.body.version, null);
    assert.equal(preview.body.catalog.info_items.find((i: any) => i.id === info.id).title_en, 'Draft title only');
    assert.equal(typeof (await bundle()).version, 'number');
  });

  test('routing and settings are live; internal notes are never published', async () => {
    const admin = await login(users.admin);
    const b = await bundle();
    const svc = b.catalog.room_services[0];
    await admin.patch(`${H()}/entities/room_services/${svc.id}`, { internal_notes: 'Staff only: check stock' });
    await publish(admin);
    const after = await bundle();
    assert.ok(!('internal_notes' in after.catalog.room_services.find((s: any) => s.id === svc.id)));
    const snap = await one(`SELECT snapshot FROM publications WHERE hotel_id = $1 ORDER BY version DESC LIMIT 1`, [ids.royal]);
    assert.ok(!JSON.stringify(snap.snapshot).includes('Staff only: check stock'));
    assert.ok(after.catalog.outlets.every((o: any) => !('whatsapp' in o)), 'outlet WhatsApp numbers stay server-side');
  });

  test('new hotels start with a published version and a working (empty) guest site', async () => {
    const sa = await login(users.superAdmin);
    const h = await sa.post('/admin/hotels', { name_en: 'Fresh Hotel', name_ar: 'فندق جديد', slug: 'fresh-hotel' });
    assert.equal(h.status, 201);
    const pubs = (await sa.get(`/admin/hotels/${h.body.id}/publications`)).body.publications;
    assert.equal(pubs.length, 1);
    assert.equal((await sa.get(`/admin/hotels/${h.body.id}`)).body.has_unpublished_changes, false);
  });
});

describe('hotel-defined departments and guest relations', () => {
  test('a custom department routes requests, is visible to admins, and cannot be deleted while used', async () => {
    const admin = await login(users.admin);
    const created = await admin.post(`${H()}/departments`, { code: 'kids_club', name_en: 'Kids Club', name_ar: 'نادي الأطفال', whatsapp: '+966500007777' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.code, 'KIDS_CLUB');
    assert.equal((await admin.post(`${H()}/departments`, { code: 'KIDS_CLUB', name_en: 'Dup', name_ar: 'مكرر' })).status, 422);
    const svc = await admin.post(`${H()}/entities/hotel_services`, { name_en: 'Kids activity booking', name_ar: 'حجز نشاط للأطفال', department: 'KIDS_CLUB', category: 'facilities' });
    assert.equal(svc.status, 201, JSON.stringify(svc.body));
    await publish(admin);
    const r = await new (await import('./helpers')).Client().post('/public/hotels/swiss-flora-royal/requests', { guest: { type: 'IN_HOUSE', name: 'Sara', phone: '+966555000111', room: '301' }, payload: { kind: 'HOTEL_SERVICE', service_id: svc.body.id } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.match(decodeURIComponent(r.body.whatsapp_url), /Kids Club/);
    assert.match(r.body.whatsapp_url, /966500007777/);
    const list = (await admin.get(`${H()}/requests?status=ALL&department=KIDS_CLUB`)).body.requests;
    assert.ok(list.some((x: any) => x.id === r.body.id), 'admins see hotel-defined departments');
    assert.equal((await (await login(users.fnb)).get(`${H()}/requests/${r.body.id}`)).status, 404);
    assert.equal((await admin.req('DELETE', `${H()}/departments/KIDS_CLUB`)).status, 409);
    assert.equal((await admin.req('DELETE', `${H()}/departments/FNB`)).status, 409, 'built-in departments cannot be deleted');
  });

  test('complaints get a recorded resolution and can be closed in one step', async () => {
    const admin = await login(users.admin);
    const { Client } = await import('./helpers');
    const r = await new Client().post('/public/hotels/swiss-flora-royal/requests', {
      guest: { type: 'IN_HOUSE', name: 'Sara', phone: '+966555000111', room: '301' },
      payload: { kind: 'FEEDBACK', feedback_type: 'COMPLAINT', subject: 'Noise', message: 'Loud music next door', urgency: 'NORMAL', about_department: null, attachment: '' },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal((await admin.post(`${H()}/requests/${r.body.id}/resolution`, { resolution: 'x' })).status, 422);
    const ok = await admin.post(`${H()}/requests/${r.body.id}/resolution`, { resolution: 'Moved guest to a quiet room and offered breakfast', complete: true });
    assert.equal(ok.status, 200);
    const row = await one(`SELECT status, resolution, resolved_at FROM requests WHERE id = $1`, [r.body.id]);
    assert.equal(row.status, 'COMPLETED');
    assert.match(row.resolution, /quiet room/);
    assert.ok(row.resolved_at);
  });
});
