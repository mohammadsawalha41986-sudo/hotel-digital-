import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, bundle, ids, login, one, setup, teardown, users } from './helpers';

before(setup);
after(teardown);

const SLUG = 'swiss-flora-royal';
const H = () => `/admin/hotels/${ids.royal}`;
const session = (c: Client, guest: Record<string, string>, entry = 'QR') => c.post(`/public/hotels/${SLUG}/session`, { guest, lang: 'en', entry });

describe('guest identity and duplicates', () => {
  test('same phone + compatible name = one profile; same phone + different name = separate profile', async () => {
    await session(new Client(), { type: 'IN_HOUSE', name: 'Omar', phone: '0501112233', room: '301' });
    await session(new Client(), { type: 'IN_HOUSE', name: 'Omar Saeed', phone: '+966501112233', room: '301' });
    await session(new Client(), { type: 'IN_HOUSE', name: 'Huda Saeed', phone: '0501112233', room: '301' }); // spouse, same phone
    const rows = await (await login(users.admin)).get(`${H()}/guests?search=501112233`);
    assert.equal(rows.body.guests.length, 2);
    assert.ok(rows.body.guests.some((g: any) => g.name === 'Omar Saeed'), 'the fuller name is kept');
    const pairs = (await (await login(users.admin)).get(`${H()}/guests/duplicates`)).body.pairs;
    assert.ok(pairs.some((p: any) => p.reasons.includes('same_phone')), 'surfaced for review, not merged');
  });

  test('same device, no phone: the same person is recognised; a different name is not', async () => {
    const device = new Client();
    await session(device, { type: 'EXTERNAL', name: 'Visitor Nora', phone: '', room: '' });
    await session(device, { type: 'EXTERNAL', name: 'Visitor Nora', phone: '', room: '' });
    await session(device, { type: 'EXTERNAL', name: 'Visitor Ahmed', phone: '', room: '' });
    const admin = await login(users.admin);
    assert.equal((await admin.get(`${H()}/guests?search=${encodeURIComponent('Visitor Nora')}`)).body.guests.length, 1);
    assert.equal((await admin.get(`${H()}/guests?search=${encodeURIComponent('Visitor Ahmed')}`)).body.guests.length, 1);
  });

  test('controlled merge moves orders and stays; requires a reason and confirmation', async () => {
    const admin = await login(users.admin);
    const a = await admin.post(`${H()}/guests`, { type: 'IN_HOUSE', name: 'Karim Nasser', phone: '0509990000', room: '505' });
    const b = await admin.post(`${H()}/guests`, { type: 'IN_HOUSE', name: 'K. Nasser', phone: '0503334444', room: '505', email: 'karim@example.com' });
    assert.equal(a.status, 201);
    assert.equal(b.status, 201, 'a different name never auto-links');
    // Give the secondary profile an order.
    const svc = (await bundle()).catalog.room_services.find((s: any) => s.name_en === 'Drinking water');
    const staffOrder = await admin.post(`${H()}/orders`, { source: 'MANUAL', guest: { type: 'IN_HOUSE', name: 'K. Nasser', phone: '0503334444', room: '505' }, payload: { kind: 'ROOM_SERVICE', service_id: svc.id } });
    assert.equal(staffOrder.status, 201, JSON.stringify(staffOrder.body));
    assert.equal((await one(`SELECT source, created_by IS NOT NULL AS by_staff FROM requests WHERE id = $1`, [staffOrder.body.id])).source, 'MANUAL');

    assert.equal((await admin.post(`${H()}/guests/merge`, { primary_id: a.body.guest.id, secondary_id: b.body.guest.id, reason: 'x' })).status, 422);
    const m = await admin.post(`${H()}/guests/merge`, { primary_id: a.body.guest.id, secondary_id: b.body.guest.id, reason: 'Same guest, confirmed at front desk', confirm: true });
    assert.equal(m.status, 200, JSON.stringify(m.body));
    assert.equal(m.body.moved.requests, 1);
    assert.equal(m.body.guest.email, 'karim@example.com', 'missing contact fields are filled from the merged profile');
    const p = (await admin.get(`${H()}/guests/${a.body.guest.id}`)).body;
    assert.ok(p.orders.some((o: any) => o.id === staffOrder.body.id));
    assert.equal((await admin.post(`${H()}/guests/merge`, { primary_id: a.body.guest.id, secondary_id: b.body.guest.id, reason: 'again', confirm: true })).status, 409);
    assert.ok((await one(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'merge'`)).n >= 1);
  });

  test('anonymisation erases personal data but keeps orders and money', async () => {
    const admin = await login(users.admin);
    const g = await admin.post(`${H()}/guests`, { type: 'EXTERNAL', name: 'Private Person', phone: '0507778888', email: 'p@example.com' });
    const id = g.body.guest.id;
    const svc = (await bundle()).catalog.room_services.find((s: any) => s.name_en === 'Drinking water');
    const o = await admin.post(`${H()}/orders`, { source: 'ADMIN', guest: { type: 'IN_HOUSE', name: 'Private Person', phone: '0507778888', room: '707' }, payload: { kind: 'ROOM_SERVICE', service_id: svc.id, notes: 'call me on 0507778888' } });
    assert.equal((await admin.post(`${H()}/guests/${id}/anonymize`, { reason: 'Erasure request', confirm: true })).status, 409, 'open requests block erasure');
    await admin.post(`${H()}/requests/${o.body.id}/status`, { status: 'COMPLETED' });
    const r = await admin.post(`${H()}/guests/${id}/anonymize`, { reason: 'Erasure request by guest', confirm: true });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const guest = await one(`SELECT name, phone, email, anonymized_at FROM guests WHERE id = $1`, [id]);
    assert.deepEqual([guest.name, guest.phone, guest.email, !!guest.anonymized_at], ['Anonymised guest', '', '', true]);
    const req = await one(`SELECT guest_name, guest_phone, notes, reference FROM requests WHERE id = $1`, [o.body.id]);
    assert.deepEqual([req.guest_name, req.guest_phone, req.notes], ['Anonymised guest', '', '']);
    assert.ok(req.reference, 'the order record itself remains');
    assert.equal((await one(`SELECT COUNT(*) AS n FROM order_lines WHERE request_id = $1`, [o.body.id])).n, 1);
  });

  test('guest CRM and finance permissions by role', async () => {
    const fnb = await login(users.fnb);
    assert.equal((await fnb.get(`${H()}/guests`)).status, 403, 'department staff: no guest CRM');
    assert.equal((await fnb.get(`${H()}/finance/summary`)).status, 403, 'department staff: no finance');
    const fo = await login(users.frontOffice);
    assert.equal((await fo.get(`${H()}/guests`)).status, 200, 'front office manages guests');
    assert.equal((await fo.post(`${H()}/guests/${ids.royal}/anonymize`, { reason: 'x', confirm: true })).status, 404, 'only admins erase');
    const mgmt = await login(users.management);
    const orders = await mgmt.get(`${H()}/orders?commercial_only=0`);
    assert.equal(orders.status, 200);
    assert.ok(orders.body.orders.every((o: any) => o.commission_minor === null), 'no commission data without finance access');
    const harbour = await login(users.harbourAdmin);
    assert.equal((await harbour.get(`${H()}/guests`)).status, 404);
    assert.equal((await harbour.get(`${H()}/orders`)).status, 404);
  });

  test('order exports are CSV/XLSX, formula-safe, and audited', async () => {
    const admin = await login(users.admin);
    const csv = await admin.req('GET', `${H()}/orders?format=csv&commercial_only=0`);
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type') ?? '', /text\/csv/);
    assert.ok(String(csv.body).startsWith('Reference'), 'header row (the BOM is consumed by the decoder)');
    const { toCsv } = await import('../../server/services/reports');
    const out = toCsv({ title: 't', columns: [{ key: 'a', label: 'A' }], rows: [{ a: '=HYPERLINK("http://x")' }, { a: '-12.5' }] });
    assert.ok(out.includes(`"'=HYPERLINK(""http://x"")"`), 'formulas are neutralised');
    assert.ok(out.includes('\r\n-12.5'), 'negative numbers are left alone');
    const x = await admin.req('GET', `${H()}/reports/orders_by_department?format=xlsx&commercial_only=0`);
    assert.equal(x.status, 200);
    assert.equal((await admin.get(`${H()}/reports/commission_revenue`)).status, 403, 'finance reports need finance access');
    assert.equal((await admin.get(`${H()}/reports/orders_by_hotel`)).status, 404, 'cross-hotel reports are platform-only');
    assert.ok((await one(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'export' AND entity = 'orders'`)).n >= 1);
  });
});
