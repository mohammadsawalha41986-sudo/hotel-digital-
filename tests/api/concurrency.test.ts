import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, guest, ids, login, menuItems, one, outletByName, pool, q, setup, teardown, users } from './helpers';

/**
 * Financial concurrency: double taps, network retries and parallel staff
 * actions must never create duplicate orders, settlements or transitions.
 */
before(setup);
after(teardown);

const SLUG = 'swiss-flora-royal';
const PLATFORM_FINANCE = 'finance@demo.hotelhub.local';
const HOTEL_FINANCE = 'hotelfinance@demo.hotelhub.local';

async function orderBody() {
  const outlet = await outletByName('In-Room Dining');
  const juice = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('juice'));
  return { guest: guest(), lang: 'en', payload: { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: juice.id, quantity: 2, modifiers: { size: ['large'] } }] } };
}

describe('idempotent checkout', () => {
  test('a retried submit with the same key returns the original order', async () => {
    const c = new Client();
    const body = await orderBody();
    const first = await c.post(`/public/hotels/${SLUG}/requests`, body, { 'idempotency-key': 'retry-key-000001' });
    const again = await c.post(`/public/hotels/${SLUG}/requests`, body, { 'idempotency-key': 'retry-key-000001' });
    assert.equal(first.status, 201);
    assert.equal(again.status, 201);
    assert.equal(again.body.id, first.body.id);
    assert.equal(again.body.reference, first.body.reference);
    assert.deepEqual(again.body.totals, first.body.totals);
    assert.equal((await one(`SELECT COUNT(*) AS n FROM requests WHERE hotel_id = $1 AND idempotency_key = 'retry-key-000001'`, [ids.royal])).n, 1);
  });

  test('ten simultaneous double taps create exactly one order and one set of lines', async () => {
    const c = new Client();
    const body = await orderBody();
    const results = await Promise.all(Array.from({ length: 10 }, () => c.post(`/public/hotels/${SLUG}/requests`, body, { 'idempotency-key': 'burst-key-0000001' })));
    assert.deepEqual([...new Set(results.map((r) => r.status))], [201], JSON.stringify(results.map((r) => r.body)));
    assert.equal(new Set(results.map((r) => r.body.id)).size, 1);
    const id = results[0].body.id;
    assert.equal((await one(`SELECT COUNT(*) AS n FROM requests WHERE hotel_id = $1 AND idempotency_key = 'burst-key-0000001'`, [ids.royal])).n, 1);
    assert.equal((await one(`SELECT COUNT(*) AS n FROM order_lines WHERE request_id = $1`, [id])).n, 1);
    assert.equal((await one(`SELECT COUNT(*) AS n FROM request_events WHERE request_id = $1`, [id])).n, 1);
  });

  test('reusing a key for a different basket is refused; keys are per guest device', async () => {
    const c = new Client();
    const body = await orderBody();
    assert.equal((await c.post(`/public/hotels/${SLUG}/requests`, body, { 'idempotency-key': 'mismatch-key-0001' })).status, 201);
    const changed = { ...body, payload: { ...body.payload, notes: 'extra ice' } };
    const r = await c.post(`/public/hotels/${SLUG}/requests`, changed, { 'idempotency-key': 'mismatch-key-0001' });
    assert.equal(r.status, 422);
    assert.equal(r.body.error.code, 'idempotency_mismatch');
    // Another device using the same key string gets its own order.
    const other = await new Client().post(`/public/hotels/${SLUG}/requests`, body, { 'idempotency-key': 'mismatch-key-0001' });
    assert.equal(other.status, 201);
    assert.equal((await one(`SELECT COUNT(*) AS n FROM requests WHERE idempotency_key = 'mismatch-key-0001'`)).n, 2);
  });

  test('malformed keys are rejected; submits without a key still work', async () => {
    const body = await orderBody();
    assert.equal((await new Client().post(`/public/hotels/${SLUG}/requests`, body, { 'idempotency-key': 'bad key!' })).status, 400);
    const a = await new Client().post(`/public/hotels/${SLUG}/requests`, body);
    const b = await new Client().post(`/public/hotels/${SLUG}/requests`, body);
    assert.equal(a.status, 201);
    assert.notEqual(a.body.id, b.body.id);
  });
});

describe('parallel staff actions', () => {
  test('five simultaneous "accept" clicks produce one transition', async () => {
    const created = await new Client().post(`/public/hotels/${SLUG}/requests`, await orderBody());
    const fnb = await login(users.fnb);
    const results = await Promise.all(Array.from({ length: 5 }, () => fnb.post(`/admin/hotels/${ids.royal}/requests/${created.body.id}/status`, { status: 'ACCEPTED' })));
    assert.equal(results.filter((r) => r.status === 200).length, 1, JSON.stringify(results.map((r) => [r.status, r.body?.error?.code])));
    assert.equal((await one(`SELECT COUNT(*) AS n FROM request_events WHERE request_id = $1 AND to_status = 'ACCEPTED'`, [created.body.id])).n, 1);
  });
});

describe('settlements under concurrency and hotel acknowledgement', () => {
  let settlementId = '';

  test('concurrent creation for the same period yields exactly one settlement', async () => {
    const pf = await login(PLATFORM_FINANCE);
    const body = { hotel_id: ids.royal, period_type: 'CUSTOM', period_start: '2025-03-01', period_end: '2025-03-31' };
    const results = await Promise.all(Array.from({ length: 6 }, () => pf.post('/admin/platform/settlements', body)));
    const ok = results.filter((r) => r.status === 201 || r.status === 200);
    assert.equal(ok.length, 1, JSON.stringify(results.map((r) => [r.status, r.body?.error?.message])));
    assert.ok(results.every((r) => r.status < 300 || r.status === 409));
    assert.equal((await one(`SELECT COUNT(*) AS n FROM settlements WHERE hotel_id = $1 AND period_start = '2025-03-01' AND status <> 'VOID'`, [ids.royal])).n, 1);
    settlementId = ok[0].body.id ?? ok[0].body.settlement?.id;
    assert.ok(settlementId);
  });

  test('a creation racing an uncommitted one waits and is refused (deterministic)', async () => {
    const { createSettlement } = await import('../../server/services/finance');
    const actor = { user: (await one(`SELECT id, email, name, role FROM users WHERE email = $1`, [PLATFORM_FINANCE])) as any, ip: '' };
    actor.user.global = true;
    actor.user.hotelIds = [];
    const period = { period_type: 'CUSTOM' as const, period_start: '2025-05-01', period_end: '2025-05-31', notes: '' };
    const holder = await pool.connect();
    await holder.query('BEGIN');
    try {
      await createSettlement(holder, ids.royal, period, actor);
      // The first creation is not committed yet; a second one arrives now.
      const racing = (await login(PLATFORM_FINANCE)).post('/admin/platform/settlements', { hotel_id: ids.royal, ...period });
      await new Promise((r) => setTimeout(r, 400));
      await holder.query('COMMIT');
      const r = await racing;
      assert.equal(r.status, 409, `racing creation → ${r.status}`);
    } catch (e) {
      await holder.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      holder.release();
    }
    assert.equal((await one(`SELECT COUNT(*) AS n FROM settlements WHERE hotel_id = $1 AND period_start = '2025-05-01' AND status <> 'VOID'`, [ids.royal])).n, 1);
  });

  test('the hotel acknowledges an approved settlement exactly once; platform staff cannot', async () => {
    await q(`INSERT INTO hotel_commercial_settings (hotel_id, hotel_finance_access) VALUES ($1, 'SETTLEMENTS') ON CONFLICT (hotel_id) DO UPDATE SET hotel_finance_access = 'SETTLEMENTS'`, [ids.royal]);
    const pf = await login(PLATFORM_FINANCE);
    const hotel = await login(HOTEL_FINANCE);
    const ack = (c: Client, note = '') => c.post(`/admin/hotels/${ids.royal}/finance/settlements/${settlementId}/acknowledge`, { note });

    assert.equal((await ack(hotel)).status, 409, 'a draft cannot be acknowledged');
    assert.equal((await pf.post(`/admin/platform/settlements/${settlementId}/status`, { status: 'REVIEWED' })).status, 200);
    const checker = await login(users.superAdmin);
    assert.equal((await checker.post(`/admin/platform/settlements/${settlementId}/status`, { status: 'APPROVED' })).status, 200);

    const platformTry = await ack(await login(users.superAdmin));
    assert.equal(platformTry.status, 403, 'platform staff cannot acknowledge for the hotel');

    const results = await Promise.all(Array.from({ length: 4 }, () => ack(hotel, 'Checked against our POS totals')));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.ok(results.filter((r) => r.status !== 200).every((r) => r.body.error.code === 'already_acknowledged'));

    const row = await one(`SELECT acknowledged_at, hotel_note, u.email FROM settlements s JOIN users u ON u.id = s.acknowledged_by WHERE s.id = $1`, [settlementId]);
    assert.ok(row.acknowledged_at);
    assert.equal(row.hotel_note, 'Checked against our POS totals');
    assert.equal(row.email, HOTEL_FINANCE);
    assert.ok(await one(`SELECT 1 FROM audit_log WHERE entity = 'settlement' AND entity_id = $1 AND action = 'acknowledge'`, [settlementId]));
    const detail = await hotel.get(`/admin/hotels/${ids.royal}/finance/settlements/${settlementId}`);
    assert.equal(detail.body.settlement.acknowledged_by_name, 'Hotel Finance');
  });

  test('roles without hotel finance access cannot acknowledge', async () => {
    const fnb = await login(users.fnb);
    const r = await fnb.post(`/admin/hotels/${ids.royal}/finance/settlements/${settlementId}/acknowledge`, {});
    assert.equal(r.status, 403);
  });
});
