import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, guest, login, one, q, setup, teardown, users } from './helpers';

/**
 * Regression: financial document numbers embed a hotel code and are unique
 * platform-wide. Two hotels whose slugs share their first 8 letters used to
 * get the same code, so the second hotel's orders could never complete (its
 * first ledger number collided). Found by the 20-hotel load test.
 */
before(setup);
after(teardown);

async function hotelWithMenu(sa: Client, slug: string) {
  const h = await sa.post('/admin/hotels', { name_en: slug, name_ar: slug, slug });
  assert.equal(h.status, 201, JSON.stringify(h.body));
  const id = h.body.id;
  await sa.post(`/admin/hotels/${id}/publication`, { published: true });
  const outlet = (await sa.post(`/admin/hotels/${id}/entities/outlets`, { name_en: 'Café', name_ar: 'مقهى' })).body;
  const menu = (await sa.post(`/admin/hotels/${id}/entities/menus`, { name_en: 'All day', name_ar: 'طوال اليوم', parent_id: outlet.id })).body;
  const cat = (await sa.post(`/admin/hotels/${id}/entities/menu_categories`, { name_en: 'Mains', name_ar: 'رئيسية', parent_id: menu.id })).body;
  const item = (await sa.post(`/admin/hotels/${id}/entities/menu_items`, { name_en: 'Grill', name_ar: 'مشاوي', price: 100, parent_id: cat.id })).body;
  assert.equal((await sa.post(`/admin/hotels/${id}/publish`, { note: 'ready' })).status, 200);
  const ag = await sa.post('/admin/platform/agreements', { hotel_id: id, name: `${slug} agreement` });
  const rule = await sa.post(`/admin/platform/agreements/${ag.body.id}/rules`, {
    scope_level: 'HOTEL', commission_type: 'PERCENTAGE', rate_bps: 500, basis: 'GROSS_INCL_VAT', tax_treatment: 'NOT_APPLICABLE', effective_from: new Date(Date.now() - 60_000).toISOString(),
  });
  assert.equal(rule.status, 201, JSON.stringify(rule.body));
  return { id, slug, outlet: outlet.id, item: item.id };
}

async function completeOrder(sa: Client, h: { id: string; slug: string; outlet: string; item: string }) {
  const o = await new Client().post(`/public/hotels/${h.slug}/requests`, { guest: guest(), payload: { kind: 'ORDER', outlet_id: h.outlet, lines: [{ item_id: h.item, quantity: 1 }] } });
  assert.equal(o.status, 201, JSON.stringify(o.body));
  for (const s of ['ACCEPTED', 'COMPLETED']) {
    const r = await sa.post(`/admin/hotels/${h.id}/requests/${o.body.id}/status`, { status: s });
    assert.equal(r.status, 200, `${h.slug} → ${s}: ${JSON.stringify(r.body)}`);
  }
  return o.body.id as string;
}

describe('hotel finance codes', () => {
  test('hotels with the same slug prefix get distinct codes; both complete orders and settle', async () => {
    const sa = await login(users.superAdmin);
    const north = await hotelWithMenu(sa, 'seaside-palace-north');
    const south = await hotelWithMenu(sa, 'seaside-palace-south');
    const codes = await q(`SELECT slug, finance_code FROM hotels WHERE slug LIKE 'seaside-palace-%' ORDER BY created_at`);
    assert.deepEqual(codes.map((c) => c.finance_code), ['SEASIDEP', 'SEASIDEP2']);

    const a = await completeOrder(sa, north);
    const b = await completeOrder(sa, south);
    const entries = await q(`SELECT entry_no FROM commission_ledger WHERE request_id = ANY($1::uuid[]) ORDER BY entry_no`, [[a, b]]);
    assert.deepEqual(entries.map((e) => e.entry_no), ['LE-SEASIDEP-000001', 'LE-SEASIDEP2-000001']);

    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
    for (const h of [north, south]) {
      const s = await sa.post('/admin/platform/settlements', { hotel_id: h.id, period_type: 'CUSTOM', period_start: day, period_end: day });
      assert.equal(s.status, 201, JSON.stringify(s.body));
    }
    const nos = await q(`SELECT settlement_no FROM settlements WHERE hotel_id = ANY($1::uuid[]) ORDER BY settlement_no`, [[north.id, south.id]]);
    assert.equal(new Set(nos.map((n) => n.settlement_no)).size, 2);
  });

  test('existing hotels keep their code, so numbers already issued stay valid', async () => {
    const royal = await one(`SELECT finance_code FROM hotels WHERE slug = 'swiss-flora-royal'`);
    assert.equal(royal.finance_code, 'SWISSFLO');
    const jeddah = await one(`INSERT INTO hotels (slug, name_en, name_ar) VALUES ('swiss-flora-jeddah', 'J', 'J') RETURNING finance_code`);
    assert.equal(jeddah.finance_code, 'SWISSFLO2');
  });
});

describe('legacy number overlap', () => {
  test('a number already issued elsewhere is skipped instead of blocking the hotel', async () => {
    const sa = await login(users.superAdmin);
    const h = await one(`SELECT id, finance_code FROM hotels WHERE slug = 'seaside-palace-south'`);
    const other = await one(`SELECT id FROM hotels WHERE slug = 'seaside-palace-north'`);
    // Another hotel already holds the number this hotel would issue next (legacy shared code).
    const next = await one(`SELECT COALESCE((SELECT value FROM counters WHERE hotel_id = $1 AND key = 'SETTLEMENT'), 0) + 1 AS n`, [h.id]);
    const clash = `STL-${h.finance_code}-${String(next.n).padStart(4, '0')}`;
    await q(`INSERT INTO settlements (hotel_id, settlement_no, period_type, period_start, period_end, currency) VALUES ($1, $2, 'CUSTOM', '2024-01-01', '2024-01-02', 'SAR')`, [other.id, clash]);
    const r = await sa.post('/admin/platform/settlements', { hotel_id: h.id, period_type: 'CUSTOM', period_start: '2024-02-01', period_end: '2024-02-02' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const created = await one(`SELECT settlement_no FROM settlements WHERE hotel_id = $1 AND period_start = '2024-02-01'`, [h.id]);
    assert.equal(created.settlement_no, `STL-${h.finance_code}-${String(next.n + 1).padStart(4, '0')}`);
  });
});
