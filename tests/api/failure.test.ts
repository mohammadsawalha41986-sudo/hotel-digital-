import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, guest, menuItems, one, outletByName, pool, q, setup, teardown } from './helpers';

/**
 * Failure behaviour: the platform must fail safely — no half-written orders,
 * and automatic recovery when the database drops connections.
 */
before(setup);
after(teardown);

async function orderBody() {
  const outlet = await outletByName('In-Room Dining');
  const juice = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('juice'));
  return { guest: guest(), lang: 'en', payload: { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: juice.id, quantity: 1, modifiers: { size: ['large'] } }] } };
}

describe('database connection loss', () => {
  test('after every connection is killed, the next requests succeed and readiness recovers', async () => {
    const body = await orderBody();
    assert.equal((await new Client().post('/public/hotels/swiss-flora-royal/requests', body)).status, 201);
    // Kill every server-side connection of this database except our own (like a failover or network cut).
    const killer = await pool.connect();
    try {
      await killer.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()`);
    } finally {
      killer.release(true); // do not return a connection that might be flagged
    }
    // Idle pooled connections were dropped; pg evicts them and opens new ones. Allow one failed call at most.
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await new Client().post('/public/hotels/swiss-flora-royal/requests', body)).status);
    assert.ok(statuses.filter((s) => s === 201).length >= 4, statuses.join(','));
    assert.ok(statuses.every((s) => s === 201 || s === 500), 'a failure is a clean 500, never a hang or partial success');
    assert.equal((await new Client().get('/ready')).status, 200);
  });
});

describe('a failure in the middle of checkout', () => {
  test('rolls back completely: no order, no lines, no history; a retry then succeeds exactly once', async () => {
    const body = await orderBody();
    const before = await one(`SELECT (SELECT COUNT(*) FROM requests) AS r, (SELECT COUNT(*) FROM order_lines) AS l, (SELECT COUNT(*) FROM request_events) AS e`);
    // Inject a failure after the order row is written: inserting its lines raises.
    await q(`CREATE OR REPLACE FUNCTION test_fail_lines() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$ LANGUAGE plpgsql`);
    await q(`CREATE TRIGGER test_fail_lines BEFORE INSERT ON order_lines FOR EACH ROW EXECUTE FUNCTION test_fail_lines()`);
    try {
      const r = await new Client().post('/public/hotels/swiss-flora-royal/requests', body, { 'idempotency-key': 'fail-mid-checkout-01' });
      assert.equal(r.status, 500);
      assert.ok(r.body.error.request_id, 'the guest gets a reference for support');
      assert.doesNotMatch(JSON.stringify(r.body), /injected failure/, 'internal errors are not leaked');
    } finally {
      await q(`DROP TRIGGER test_fail_lines ON order_lines`);
      await q(`DROP FUNCTION test_fail_lines()`);
    }
    const afterRow = await one(`SELECT (SELECT COUNT(*) FROM requests) AS r, (SELECT COUNT(*) FROM order_lines) AS l, (SELECT COUNT(*) FROM request_events) AS e`);
    assert.deepEqual(afterRow, before, 'nothing half-written');
    // The guest retries the same checkout after the fault clears: it goes through exactly once.
    const c = new Client();
    const retry1 = await c.post('/public/hotels/swiss-flora-royal/requests', body, { 'idempotency-key': 'fail-mid-checkout-02' });
    const retry2 = await c.post('/public/hotels/swiss-flora-royal/requests', body, { 'idempotency-key': 'fail-mid-checkout-02' });
    assert.equal(retry1.status, 201);
    assert.equal(retry2.body.id, retry1.body.id);
  });

  test('a department with no WhatsApp number still receives the order in the queue', async () => {
    await q(`UPDATE departments SET whatsapp = '' WHERE code = 'FNB' AND hotel_id = (SELECT id FROM hotels WHERE slug = 'swiss-flora-royal')`);
    const { clearPublicCaches } = await import('../../server/services/bundleCache');
    clearPublicCaches();
    const r = await new Client().post('/public/hotels/swiss-flora-royal/requests', await orderBody());
    assert.equal(r.status, 201);
    assert.ok(await one(`SELECT 1 FROM requests WHERE id = $1 AND status = 'NEW'`, [r.body.id]));
  });
});
