import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, guest, login, menuItems, one, outletByName, q, setup, teardown, users } from './helpers';

before(setup);
after(teardown);

describe('health, readiness and correlation ids', () => {
  test('liveness and readiness report separately; readiness includes the database and storage', async () => {
    const c = new Client();
    const live = await c.get('/health');
    assert.equal(live.status, 200);
    const ready = await c.get('/ready');
    assert.equal(ready.status, 200, JSON.stringify(ready.body));
    assert.equal(ready.body.checks.database.ok, true);
    assert.equal(ready.body.checks.storage.ok, true);
    assert.equal(ready.headers.get('cache-control'), 'no-store');
  });

  test('draining makes readiness fail while liveness stays up', async () => {
    const health = await import('../../server/health');
    health.startDraining();
    try {
      const c = new Client();
      assert.equal((await c.get('/ready')).status, 503);
      assert.equal((await c.get('/health')).status, 200);
    } finally {
      health.resetDraining();
    }
  });

  test('every response carries a request id; a sane incoming id is kept', async () => {
    const c = new Client();
    const r = await c.get('/health', { 'x-request-id': 'lb-abc123' });
    assert.equal(r.headers.get('x-request-id'), 'lb-abc123');
    const r2 = await c.get('/health', { 'x-request-id': 'bad id with spaces' });
    assert.match(r2.headers.get('x-request-id') ?? '', /^[A-Za-z0-9_-]{6,}$/);
    const err = await c.get('/public/hotels/no-such-hotel');
    assert.ok(err.body.error.request_id);
  });

  test('operations view is for super admins only', async () => {
    const sa = await login(users.superAdmin);
    const r = await sa.get('/admin/platform/ops');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    for (const k of ['ready', 'metrics', 'jobs', 'signals']) assert.ok(k in r.body, k);
    assert.ok(r.body.metrics.requests > 0);
    assert.equal(typeof r.body.signals.db_max_connections, 'number');
    assert.equal((await (await login(users.admin)).get('/admin/platform/ops')).status, 403);
  });
});

describe('replica-safe background jobs', () => {
  test('a job runs at most once per interval and every run is recorded', async () => {
    const { JOBS, runJobIfDue } = await import('../../server/services/scheduler');
    const prune = JOBS.find((j) => j.name === 'rate_limit_prune')!;
    await q(`DELETE FROM job_runs WHERE job = 'rate_limit_prune'`);
    // Two "replicas" ticking at the same moment.
    const [a, b] = await Promise.all([runJobIfDue(prune), runJobIfDue(prune)]);
    assert.equal([a, b].filter(Boolean).length, 1);
    assert.equal(await runJobIfDue(prune), null, 'not due again yet');
    const runs = await q(`SELECT status FROM job_runs WHERE job = 'rate_limit_prune'`);
    assert.deepEqual(runs.map((r) => r.status), ['OK']);
  });

  test('a failing job is recorded as FAILED without affecting others', async () => {
    const { runJobIfDue } = await import('../../server/services/scheduler');
    const r = await runJobIfDue({ name: 'always_fails', everyMs: 1, enabled: () => true, run: async () => { throw new Error('boom'); } });
    assert.equal(r?.error, 'boom');
    const row = await one(`SELECT status, error FROM job_runs WHERE job = 'always_fails' ORDER BY id DESC LIMIT 1`);
    assert.deepEqual([row.status, row.error], ['FAILED', 'boom']);
  });
});

describe('shared rate limiting (hotel Wi-Fi aware)', () => {
  test('one busy device is limited; other guests behind the same IP are not', async () => {
    delete process.env.DISABLE_RATE_LIMIT;
    try {
      await q(`DELETE FROM rate_limits`);
      const outlet = await outletByName('In-Room Dining');
      const juice = (await menuItems(outlet.id)).find((i: any) => i.name_en.includes('juice'));
      const body = { guest: guest(), lang: 'en', payload: { kind: 'ORDER', outlet_id: outlet.id, lines: [{ item_id: juice.id, quantity: 1, modifiers: { size: ['large'] } }] } };
      const spammer = new Client();
      const statuses: number[] = [];
      for (let i = 0; i < 17; i++) statuses.push((await spammer.post('/public/hotels/swiss-flora-royal/requests', body)).status);
      assert.equal(statuses.filter((s) => s === 201).length, 15, statuses.join(','));
      assert.equal(statuses.at(-1), 429);
      // 20 other guests on the same hotel IP order normally.
      for (let i = 0; i < 20; i++) assert.equal((await new Client().post('/public/hotels/swiss-flora-royal/requests', body)).status, 201);
      // Counters live in the database (shared by every replica), stored hashed.
      const rows = await q(`SELECT key FROM rate_limits`);
      assert.ok(rows.length > 0);
      assert.ok(rows.every((r) => /^[0-9a-f]{64}$/.test(r.key)), 'keys are hashes, not IPs or tokens');
    } finally {
      process.env.DISABLE_RATE_LIMIT = '1';
    }
  });
});
