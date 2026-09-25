import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, guest, ids, login, menuItems, one, outletByName, q, setup, teardown, users } from './helpers';

/**
 * Alerts fire on real faults and stay quiet on a healthy system. Faults are
 * injected directly in the database and then removed.
 */
before(setup);
after(teardown);

describe('platform alerts (database-wide, financial integrity)', () => {
  test('a healthy database raises no financial alerts', async () => {
    const { platformAlerts } = await import('../../server/services/alerts');
    const { alerts, checks } = await platformAlerts();
    assert.deepEqual(alerts.filter((a) => a.key.startsWith('finance.')), [], JSON.stringify(checks));
    assert.equal(typeof checks.db_max_connections, 'number');
  });

  test('a settlement whose header does not match its lines raises finance.settlement_header_mismatch', async () => {
    const { platformAlerts } = await import('../../server/services/alerts');
    const s = await one(
      `INSERT INTO settlements (hotel_id, settlement_no, period_type, period_start, period_end, currency, commission_minor)
       VALUES ($1, 'STL-ALERT-TEST', 'CUSTOM', '2023-01-01', '2023-01-02', 'SAR', 12345) RETURNING id`,
      [ids.royal]
    );
    try {
      const { alerts } = await platformAlerts();
      const a = alerts.find((x) => x.key === 'finance.settlement_header_mismatch');
      assert.ok(a, JSON.stringify(alerts));
      assert.equal(a!.severity, 'critical');
    } finally {
      await q(`DELETE FROM settlements WHERE id = $1`, [s.id]);
    }
    assert.equal((await platformAlerts()).alerts.some((x) => x.key === 'finance.settlement_header_mismatch'), false, 'resolves when fixed');
  });

  test('a completed commercial order with no commission decision after an hour raises finance.completed_without_ledger', async () => {
    const { platformAlerts } = await import('../../server/services/alerts');
    const outlet = await outletByName('In-Room Dining');
    const juice = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('juice'));
    const r = await new Client().post('/public/hotels/swiss-flora-royal/requests', { guest: guest(), payload: { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: juice.id, quantity: 1, modifiers: { size: ['large'] } }] } });
    assert.equal(r.status, 201);
    // Simulate an order completed outside the normal path (no commission posted).
    await q(`UPDATE requests SET status = 'COMPLETED', completed_at = now() - interval '2 hours', financial_status = 'AWAITING_ELIGIBILITY' WHERE id = $1`, [r.body.id]);
    try {
      const { alerts } = await platformAlerts();
      assert.ok(alerts.some((a) => a.key === 'finance.completed_without_ledger'), JSON.stringify(alerts));
    } finally {
      await q(`UPDATE requests SET status = 'CANCELLED', completed_at = NULL, financial_status = 'NOT_APPLICABLE' WHERE id = $1`, [r.body.id]);
    }
  });

  test('the integrity_watch job runs once per interval and records its checks', async () => {
    const { JOBS, runJobIfDue } = await import('../../server/services/scheduler');
    const job = JOBS.find((j) => j.name === 'integrity_watch')!;
    await q(`DELETE FROM job_runs WHERE job = 'integrity_watch'`);
    const r = await runJobIfDue(job);
    assert.ok(r && 'settlement_header_mismatch' in r, JSON.stringify(r));
    assert.equal(await runJobIfDue(job), null, 'not due again yet');
  });
});

describe('process alerts (per replica)', () => {
  test('p95 latency and 5xx-rate alerts fire past their thresholds', async () => {
    const alerts = await import('../../server/services/alerts');
    const metrics = await import('../../server/metrics');
    const before = { ...alerts.THRESHOLDS };
    try {
      for (let i = 0; i < 220; i++) metrics.recordRequest(200, 400, '/api/public/hotels/swiss-flora-royal');
      for (let i = 0; i < 10; i++) metrics.recordRequest(503, 5, '/api/public/hotels/swiss-flora-royal');
      alerts.THRESHOLDS.error_rate_pct = 1;
      const fired = (await alerts.processAlerts()).map((a) => a.key);
      assert.ok(fired.includes('latency.p95'), fired.join(','));
      assert.ok(fired.includes('errors.5xx_rate'), fired.join(','));
      // Per-hotel counters attribute the errors to that hotel only.
      const h = metrics.hotelMetrics().get('slug:swiss-flora-royal');
      assert.ok(h && h.errors_5xx >= 10);
      assert.equal(metrics.hotelMetrics().get('slug:demo-harbour-hotel')?.errors_5xx ?? 0, 0);
    } finally {
      Object.assign(alerts.THRESHOLDS, before);
    }
  });

  test('the operations view lists alerts, integrity checks and every hotel (super admin only)', async () => {
    const sa = await login(users.superAdmin);
    const r = await sa.get('/admin/platform/ops');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(Array.isArray(r.body.alerts));
    assert.equal(r.body.thresholds.p95_ms, 150);
    assert.ok('settlement_line_mismatch' in r.body.integrity);
    const slugs = r.body.hotels.map((h: any) => h.slug);
    assert.ok(slugs.includes('swiss-flora-royal') && slugs.includes('demo-harbour-hotel'));
    assert.equal((await (await login(users.admin)).get('/admin/platform/ops')).status, 403);
  });
});
