/**
 * §24 End-to-end commercial acceptance test (steps 1–33) plus the §23
 * no-fabrication rule, run against the real API and PostgreSQL.
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Client, login, one, q, setup, teardown, users } from './helpers';

before(setup);
after(teardown);

const PASSWORD = 'Commerce-Test-2026!';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
const yesterdayIso = () => new Date(Date.now() - 86_400_000).toISOString();

interface HotelFixture {
  id: string;
  slug: string;
  outletId: string;
  itemId: string;
  admin: Client;
}

async function createHotel(superAdmin: Client, slug: string, name: string, price: number, adminEmail: string): Promise<HotelFixture> {
  const h = await superAdmin.post('/admin/hotels', { name_en: name, name_ar: `فندق ${name}`, slug });
  assert.equal(h.status, 201, JSON.stringify(h.body));
  const id = h.body.id;
  assert.equal((await superAdmin.post(`/admin/hotels/${id}/publication`, { published: true })).status, 200);
  const outlet = await superAdmin.post(`/admin/hotels/${id}/entities/outlets`, { name_en: 'Lobby Café', name_ar: 'مقهى الردهة', code: 'OUTLET-CAFE' });
  assert.equal(outlet.status, 201, JSON.stringify(outlet.body));
  const menu = await superAdmin.post(`/admin/hotels/${id}/entities/menus`, { name_en: 'All day', name_ar: 'طوال اليوم', parent_id: outlet.body.id });
  const cat = await superAdmin.post(`/admin/hotels/${id}/entities/menu_categories`, { name_en: 'Mains', name_ar: 'الأطباق الرئيسية', parent_id: menu.body.id, code: 'CAT-MAINS' });
  const item = await superAdmin.post(`/admin/hotels/${id}/entities/menu_items`, { name_en: 'Mixed grill', name_ar: 'مشاوي مشكلة', price, parent_id: cat.body.id, code: 'ITEM-GRILL' });
  assert.equal(item.status, 201, JSON.stringify(item.body));
  const u = await superAdmin.post(`/admin/hotels/${id}/users`, { email: adminEmail, name: `${name} Admin`, role: 'HOTEL_ADMIN', password: PASSWORD });
  assert.equal(u.status, 201, JSON.stringify(u.body));
  return { id, slug, outletId: outlet.body.id, itemId: item.body.id, admin: await login(adminEmail, PASSWORD) };
}

const guestIdentity = { type: 'IN_HOUSE', name: 'Layla Haddad', phone: '0551234567', room: '812' };

async function placeOrder(h: HotelFixture, guest: Client, qty = 1) {
  const r = await guest.post(`/public/hotels/${h.slug}/requests`, {
    guest: guestIdentity,
    lang: 'en',
    payload: { kind: 'ORDER', outlet_id: h.outletId, lines: [{ item_id: h.itemId, quantity: qty }] },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body as { id: string; reference: string; totals: { total: number } };
}

async function move(h: HotelFixture, orderId: string, ...statuses: string[]) {
  for (const s of statuses) {
    const r = await h.admin.post(`/admin/hotels/${h.id}/requests/${orderId}/status`, { status: s, note: s === 'CANCELLED' ? 'Guest changed plans' : '' });
    assert.equal(r.status, 200, `${s}: ${JSON.stringify(r.body)}`);
  }
}

describe('§24 commercial acceptance', () => {
  let superAdmin: Client;
  let finance: Client;
  let A: HotelFixture;
  let B: HotelFixture;
  const guest = new Client();
  let agreementA: string;
  let ruleA: { id: string; rule_key: string };
  let first: { id: string; reference: string; totals: { total: number } };
  let second: { id: string; reference: string };
  let guestId: string;

  test('1–2. create Hotel A and configure 5% commission', async () => {
    superAdmin = await login(users.superAdmin);
    A = await createHotel(superAdmin, 'hotel-a-commerce', 'Hotel A', 100, 'admin-a@commerce.test');
    const pf = await superAdmin.post(`/admin/hotels/${A.id}/users`, { email: 'finance@platform.test', name: 'Platform Finance', role: 'PLATFORM_FINANCE', password: PASSWORD });
    assert.equal(pf.status, 201, JSON.stringify(pf.body));
    finance = await login('finance@platform.test', PASSWORD);

    const ag = await finance.post('/admin/platform/agreements', { hotel_id: A.id, name: 'Hotel A — standard agreement', contract_reference: 'CTR-A-001' });
    assert.equal(ag.status, 201, JSON.stringify(ag.body));
    agreementA = ag.body.id;
    const rule = await finance.post(`/admin/platform/agreements/${agreementA}/rules`, {
      scope_level: 'HOTEL',
      commission_type: 'PERCENTAGE',
      rate_bps: 500,
      basis: 'GROSS_INCL_VAT',
      tax_treatment: 'NOT_APPLICABLE',
      effective_from: yesterdayIso(),
    });
    assert.equal(rule.status, 201, JSON.stringify(rule.body));
    ruleA = rule.body;
    // Hotel admins cannot configure commission.
    assert.equal((await A.admin.post(`/admin/platform/agreements/${agreementA}/rules`, {})).status, 403);
    // Ambiguous configuration is refused rather than guessed.
    const vague = await finance.post(`/admin/platform/agreements/${agreementA}/rules`, { scope_level: 'HOTEL', commission_type: 'PERCENTAGE', rate_bps: 500, effective_from: yesterdayIso() });
    assert.equal(vague.status, 422, 'basis and tax treatment must be explicit');
  });

  test('3–4. guest is identified through the QR entry', async () => {
    const s = await guest.post(`/public/hotels/${A.slug}/session`, { guest: guestIdentity, lang: 'en', entry: 'QR' });
    assert.equal(s.status, 201);
    const g = await one(`SELECT id, phone, guest_type FROM guests WHERE hotel_id = $1`, [A.id]);
    assert.equal(g.phone, '+966551234567', 'phone normalised to E.164');
    assert.equal(g.guest_type, 'IN_HOUSE');
    guestId = g.id;
    // Scanning again does not create a second profile.
    await guest.post(`/public/hotels/${A.slug}/session`, { guest: { ...guestIdentity, phone: '+966 55 123 4567' }, lang: 'en', entry: 'QR' });
    assert.equal((await one(`SELECT COUNT(*) AS n FROM guests WHERE hotel_id = $1`, [A.id])).n, 1);
  });

  test('5–10. F&B order of SAR 100 is received, accepted, processed and completed', async () => {
    first = await placeOrder(A, guest);
    assert.equal(first.totals.total, 100);
    const row = await one(`SELECT source, order_type, guest_id, stay_id, is_commercial, financial_status FROM requests WHERE id = $1`, [first.id]);
    assert.deepEqual(
      { source: row.source, order_type: row.order_type, guest: row.guest_id, commercial: row.is_commercial, fin: row.financial_status },
      { source: 'QR', order_type: 'FNB', guest: guestId, commercial: true, fin: 'AWAITING_ELIGIBILITY' }
    );
    assert.ok(row.stay_id);
    const lines = await q(`SELECT item_code, category_code, name_en, name_ar, quantity, unit_price_minor, gross_minor FROM order_lines WHERE request_id = $1`, [first.id]);
    assert.deepEqual(lines, [{ item_code: 'ITEM-GRILL', category_code: 'CAT-MAINS', name_en: 'Mixed grill', name_ar: 'مشاوي مشكلة', quantity: 1, unit_price_minor: 10000, gross_minor: 10000 }]);
    await move(A, first.id, 'ACCEPTED', 'IN_PROGRESS', 'READY');
    assert.equal((await one(`SELECT COUNT(*) AS n FROM financial_snapshots WHERE request_id = $1`, [first.id])).n, 0, 'not eligible before completion');
    await move(A, first.id, 'COMPLETED');
  });

  test('11–15. snapshot locked; rule 5%; base SAR 100; commission SAR 5; ledger entry', async () => {
    const d = (await finance.get(`/admin/platform/orders/${first.id}`)).body;
    assert.equal(d.order.financial_status, 'ELIGIBLE');
    assert.equal(d.snapshot.rule_id, ruleA.id);
    assert.equal(d.snapshot.rule_level, 'HOTEL');
    assert.equal(d.snapshot.rate_bps, 500);
    assert.equal(d.snapshot.basis, 'GROSS_INCL_VAT');
    assert.equal(d.snapshot.eligible_base_minor, 10000);
    assert.equal(d.snapshot.commission_minor, 500);
    assert.equal(d.snapshot.commission_tax_minor, 0);
    assert.equal(d.snapshot.hotel_amount_minor, 9500);
    assert.equal(d.ledger.length, 1);
    assert.equal(d.ledger[0].entry_type, 'COMMISSION');
    assert.equal(d.ledger[0].commission_minor, 500);
    assert.equal(d.ledger[0].status, 'EARNED');
    // Status history is complete and attributable.
    const statuses = d.events.filter((e: any) => e.event_type === 'STATUS').map((e: any) => `${e.from_status}→${e.to_status}`);
    assert.deepEqual(statuses, ['NEW→ACCEPTED', 'ACCEPTED→IN_PROGRESS', 'IN_PROGRESS→READY', 'READY→COMPLETED']);
    assert.ok(d.events.some((e: any) => e.event_type === 'FINANCIAL' && /5\.00%/.test(e.note)));
    // Immutable: the database refuses edits to snapshots, lines, ledger amounts and events.
    await assert.rejects(q(`UPDATE financial_snapshots SET commission_minor = 1 WHERE request_id = $1`, [first.id]), /immutable/);
    await assert.rejects(q(`UPDATE order_lines SET unit_price_minor = 1 WHERE request_id = $1`, [first.id]), /immutable/);
    await assert.rejects(q(`UPDATE commission_ledger SET commission_minor = 1 WHERE request_id = $1`, [first.id]), /immutable/);
    await assert.rejects(q(`DELETE FROM request_events WHERE request_id = $1`, [first.id]), /immutable/);
    await assert.rejects(q(`UPDATE commission_rules SET rate_bps = 700 WHERE id = $1`, [ruleA.id]), /immutable/);
  });

  test('16. order appears in Guest Profile 360 with its timeline', async () => {
    const p = (await A.admin.get(`/admin/hotels/${A.id}/guests/${guestId}`)).body;
    assert.equal(p.guest.name, 'Layla Haddad');
    assert.equal(p.current_stay.room, '812');
    assert.equal(p.summary.total_orders, 1);
    assert.equal(p.summary.completed_orders, 1);
    assert.equal(p.summary.total_value, 100);
    assert.ok(p.orders.some((o: any) => o.reference === first.reference));
    const titles = p.timeline.map((t: any) => t.title);
    assert.ok(titles.includes('QR session started'));
    assert.ok(titles.some((t: string) => /created$/.test(t)));
    assert.ok(titles.some((t: string) => /completed/.test(t)));
    assert.ok(titles.some((t: string) => /Commission eligible/.test(t)));
    assert.deepEqual(p.commission, [], 'hotel admin without finance access sees no commission');
    const search = (await A.admin.get(`/admin/hotels/${A.id}/guests?search=0551234567`)).body;
    assert.equal(search.guests.length, 1, 'searchable by phone as typed locally');
  });

  test('17. order appears on the hotel dashboard (no commission for the hotel by default)', async () => {
    const d = (await A.admin.get(`/admin/hotels/${A.id}/orders/dashboard`)).body;
    assert.equal(d.summary.completed, 1);
    assert.equal(d.summary.order_value, 100);
    assert.ok(d.recent.some((o: any) => o.reference === first.reference));
    assert.equal(d.finance, null);
    assert.equal(d.finance_access, 'NONE');
    assert.equal((await A.admin.get(`/admin/hotels/${A.id}/finance/summary`)).status, 403);
    // Granting the hotel FULL access exposes its own commission data only.
    await finance.put(`/admin/platform/hotels/${A.id}/commercial`, { hotel_finance_access: 'FULL' });
    const d2 = (await A.admin.get(`/admin/hotels/${A.id}/orders/dashboard`)).body;
    assert.equal(d2.finance.commission_minor, 500);
    assert.equal((await A.admin.get(`/admin/hotels/${A.id}/orders/${first.id}`)).body.snapshot.commission_minor, 500);
  });

  test('18. commission appears on the platform dashboard', async () => {
    const d = (await finance.get(`/admin/platform/dashboard?hotel_id=${A.id}`)).body;
    assert.equal(d.finance.eligible_orders, 1);
    assert.equal(d.finance.gross_minor, 10000);
    assert.equal(d.finance.base_minor, 10000);
    assert.equal(d.finance.commission_minor, 500);
    assert.equal(d.by_hotel[0].hotel_name, 'Hotel A');
  });

  let settlementId: string;
  test('19–21. settlement includes the order and is approved and closed', async () => {
    const s = await finance.post('/admin/platform/settlements', { hotel_id: A.id, period_type: 'CUSTOM', period_start: today(), period_end: today() });
    assert.equal(s.status, 201, JSON.stringify(s.body));
    settlementId = s.body.id;
    const d = (await finance.get(`/admin/platform/settlements/${settlementId}`)).body;
    assert.equal(d.settlement.commission_minor, 500);
    assert.equal(d.settlement.gross_minor, 10000);
    assert.equal(d.settlement.amount_due_minor, 500);
    assert.equal(d.lines.length, 1);
    assert.equal(d.lines[0].reference, first.reference);
    assert.match(d.lines[0].formula, /5\.00% × 100\.00 = 5\.00/);
    // Overlapping periods are refused (an entry can only be settled once).
    assert.equal((await finance.post('/admin/platform/settlements', { hotel_id: A.id, period_type: 'CUSTOM', period_start: today(), period_end: today() })).status, 409);
    assert.equal((await finance.post(`/admin/platform/settlements/${settlementId}/status`, { status: 'SETTLED' })).status, 409, 'cannot skip review and approval');
    for (const status of ['REVIEWED', 'APPROVED']) assert.equal((await finance.post(`/admin/platform/settlements/${settlementId}/status`, { status })).status, 200);
    assert.equal((await finance.post(`/admin/platform/settlements/${settlementId}/status`, { status: 'SETTLED' })).status, 422, 'payment reference required');
    assert.equal((await finance.post(`/admin/platform/settlements/${settlementId}/status`, { status: 'SETTLED', payment_reference: 'TRX-889201' })).status, 200);
    assert.equal((await one(`SELECT status FROM commission_ledger WHERE request_id = $1`, [first.id])).status, 'SETTLED');
    // The hotel sees its own statement.
    const hotelView = await A.admin.get(`/admin/hotels/${A.id}/finance/settlements/${settlementId}`);
    assert.equal(hotelView.status, 200);
    const xlsx = await finance.req('GET', `/admin/platform/settlements/${settlementId}?format=xlsx`);
    assert.equal(xlsx.status, 200);
    assert.match(xlsx.headers.get('content-type') ?? '', /spreadsheetml/);
  });

  test('22–25. commission changes to 7%: history keeps 5%, the new order uses 7%', async () => {
    const v2 = await finance.post(`/admin/platform/agreements/${agreementA}/rules`, {
      supersedes: ruleA.rule_key,
      scope_level: 'HOTEL',
      commission_type: 'PERCENTAGE',
      rate_bps: 700,
      basis: 'GROSS_INCL_VAT',
      tax_treatment: 'NOT_APPLICABLE',
      effective_from: new Date().toISOString(),
    });
    assert.equal(v2.status, 201, JSON.stringify(v2.body));
    assert.equal(v2.body.version, 2);
    const v1 = await one(`SELECT effective_to FROM commission_rules WHERE id = $1`, [ruleA.id]);
    assert.ok(v1.effective_to, 'version 1 was closed, not overwritten');

    const old = (await finance.get(`/admin/platform/orders/${first.id}`)).body;
    assert.equal(old.snapshot.rate_bps, 500);
    assert.equal(old.snapshot.commission_minor, 500);
    assert.equal((await finance.get(`/admin/platform/settlements/${settlementId}`)).body.settlement.commission_minor, 500);

    second = await placeOrder(A, guest);
    await move(A, second.id, 'ACCEPTED', 'COMPLETED');
    const now = (await finance.get(`/admin/platform/orders/${second.id}`)).body;
    assert.equal(now.snapshot.rate_bps, 700);
    assert.equal(now.snapshot.rule_version, 2);
    assert.equal(now.snapshot.commission_minor, 700);
  });

  test('26–27. a cancelled order earns no commission', async () => {
    const third = await placeOrder(A, guest);
    await move(A, third.id, 'ACCEPTED', 'CANCELLED');
    const d = (await finance.get(`/admin/platform/orders/${third.id}`)).body;
    assert.equal(d.order.financial_status, 'NOT_ELIGIBLE');
    assert.equal(d.snapshot, null);
    assert.equal(d.ledger.length, 0);
    assert.ok(d.events.some((e: any) => e.event_type === 'FINANCIAL' && /No commission/.test(e.note)));
    // Guest self-cancel of a new order behaves the same.
    const fourth = await placeOrder(A, guest);
    assert.equal((await guest.post(`/public/hotels/${A.slug}/requests/${fourth.reference}/cancel`)).status, 200);
    assert.equal((await one(`SELECT financial_status FROM requests WHERE id = $1`, [fourth.id])).financial_status, 'NOT_ELIGIBLE');
  });

  test('28–29. a partial refund is an explicit adjustment; history is not rewritten', async () => {
    const before = (await finance.get(`/admin/platform/orders/${second.id}`)).body;
    const r = await finance.post(`/admin/platform/orders/${second.id}/adjustments`, { adjustment_type: 'PARTIAL_REFUND', amount_minor: 4000, reason: 'Dish returned — partial refund', reference: 'RF-1001' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.gross_delta_minor, -4000);
    assert.equal(r.body.commission_delta_minor, -280, '40% of SAR 7.00 reversed at the original 7%');
    const after = (await finance.get(`/admin/platform/orders/${second.id}`)).body;
    assert.deepEqual(after.snapshot, before.snapshot, 'snapshot unchanged');
    const original = after.ledger.find((l: any) => l.entry_type === 'COMMISSION');
    assert.equal(original.commission_minor, 700, 'original ledger amount unchanged');
    assert.equal(original.status, 'ADJUSTED');
    const adj = after.ledger.find((l: any) => l.entry_type === 'ADJUSTMENT');
    assert.equal(adj.commission_minor, -280);
    assert.equal(adj.original_entry_id, original.id);
    assert.equal(after.adjustments[0].reason, 'Dish returned — partial refund');
    assert.ok(after.events.some((e: any) => e.event_type === 'REFUNDED'));
    // Refunding more than remains is refused; a reason is always required.
    assert.equal((await finance.post(`/admin/platform/orders/${second.id}/adjustments`, { adjustment_type: 'PARTIAL_REFUND', amount_minor: 6000, reason: 'Too much' })).status, 422);
    assert.equal((await finance.post(`/admin/platform/orders/${second.id}/adjustments`, { adjustment_type: 'PARTIAL_REFUND', amount_minor: 100, reason: '' })).status, 422);
    // Settled order: an adjustment is a new entry for the next settlement; the settled one is untouched.
    const onSettled = await finance.post(`/admin/platform/orders/${first.id}/adjustments`, { adjustment_type: 'COMMISSION_CORRECTION', direction: 'DECREASE', amount_minor: 100, reason: 'Agreed goodwill correction' });
    assert.equal(onSettled.status, 201);
    const firstEntries = (await finance.get(`/admin/platform/orders/${first.id}`)).body.ledger;
    assert.equal(firstEntries.find((l: any) => l.entry_type === 'COMMISSION').status, 'SETTLED');
    assert.equal(firstEntries.find((l: any) => l.entry_type === 'ADJUSTMENT').settlement_id, null);
  });

  test('§23. a missing rule is reported, never assumed to be 0% or back-dated', async () => {
    B = await createHotel(superAdmin, 'hotel-b-commerce', 'Hotel B', 50, 'admin-b@commerce.test');
    const gB = new Client();
    const o = await placeOrder(B, gB);
    await move(B, o.id, 'ACCEPTED', 'COMPLETED');
    const d = (await finance.get(`/admin/platform/orders/${o.id}`)).body;
    assert.equal(d.order.financial_status, 'RULE_UNAVAILABLE');
    assert.match(d.order.financial_note, /COMMISSION_RULE_UNAVAILABLE/);
    assert.equal(d.ledger.length, 0);
    // Hotel B: 10% from now on. The earlier order must not pick it up retroactively.
    const ag = await finance.post('/admin/platform/agreements', { hotel_id: B.id, name: 'Hotel B — agreement' });
    const rule = await finance.post(`/admin/platform/agreements/${ag.body.id}/rules`, {
      scope_level: 'HOTEL', commission_type: 'PERCENTAGE', rate_bps: 1000, basis: 'GROSS_INCL_VAT', tax_treatment: 'NOT_APPLICABLE', effective_from: new Date(Date.now() + 1000).toISOString(),
    });
    assert.equal(rule.status, 201, JSON.stringify(rule.body));
    await new Promise((r) => setTimeout(r, 1100));
    const ev = await finance.post(`/admin/platform/orders/${o.id}/evaluate`);
    assert.equal(ev.status, 409);
    assert.equal(ev.body.error.code, 'HISTORICAL_COMMISSION_RULE_UNAVAILABLE');
    const next = await placeOrder(B, gB);
    await move(B, next.id, 'COMPLETED');
    const nd = (await finance.get(`/admin/platform/orders/${next.id}`)).body;
    assert.equal(nd.snapshot.rate_bps, 1000);
    assert.equal(nd.snapshot.commission_minor, 500, '10% of SAR 50');
  });

  test('30–33. Hotel A and Hotel B are isolated; platform finance sees both', async () => {
    const bGuest = await one(`SELECT id FROM guests WHERE hotel_id = $1 LIMIT 1`, [B.id]);
    const bOrder = await one(`SELECT id FROM requests WHERE hotel_id = $1 LIMIT 1`, [B.id]);
    // Hotel A admin → Hotel B data
    for (const p of [`/admin/hotels/${B.id}/guests`, `/admin/hotels/${B.id}/orders`, `/admin/hotels/${B.id}/finance/summary`, `/admin/hotels/${B.id}/guests/${bGuest.id}`]) {
      assert.equal((await A.admin.get(p)).status, 404, p);
    }
    // ID manipulation inside Hotel A's own scope
    assert.equal((await A.admin.get(`/admin/hotels/${A.id}/guests/${bGuest.id}`)).status, 404);
    assert.equal((await A.admin.get(`/admin/hotels/${A.id}/orders/${bOrder.id}`)).status, 404);
    // Hotel B admin → Hotel A finance, and → platform endpoints
    assert.equal((await B.admin.get(`/admin/hotels/${A.id}/finance/summary`)).status, 404);
    assert.equal((await B.admin.get(`/admin/hotels/${A.id}/finance/settlements/${settlementId}`)).status, 404);
    assert.equal((await B.admin.get(`/admin/hotels/${B.id}/finance/settlements/${settlementId}`)).status, 403, 'B has no finance access by default');
    await finance.put(`/admin/platform/hotels/${B.id}/commercial`, { hotel_finance_access: 'FULL' });
    assert.equal((await B.admin.get(`/admin/hotels/${B.id}/finance/settlements/${settlementId}`)).status, 404, "A's settlement is not visible under B");
    assert.equal((await B.admin.get('/admin/platform/dashboard')).status, 403);
    assert.equal((await B.admin.get('/admin/platform/orders')).status, 403);
    const bLedger = (await B.admin.get(`/admin/hotels/${B.id}/finance/summary`)).body.ledger;
    assert.ok(bLedger.length > 0 && bLedger.every((l: any) => !String(l.reference).length || l.entry_no.includes('HOTELBCO')), 'only Hotel B entries');
    // Same phone in two hotels = two separate guest profiles.
    assert.equal((await one(`SELECT COUNT(DISTINCT hotel_id) AS n FROM guests WHERE phone = '+966551234567'`)).n, 2);
    // Platform finance sees both hotels.
    const all = (await finance.get('/admin/platform/orders?limit=200')).body.orders;
    assert.ok(all.some((o: any) => o.hotel_id === A.id) && all.some((o: any) => o.hotel_id === B.id));
    const dash = (await finance.get('/admin/platform/dashboard')).body;
    const names = dash.by_hotel.map((h: any) => h.hotel_name);
    assert.ok(names.includes('Hotel A') && names.includes('Hotel B'));
    // Platform finance has no access to guest CRM or content.
    assert.equal((await finance.get(`/admin/hotels/${A.id}/guests`)).status, 403);
    assert.equal((await finance.post(`/admin/hotels/${A.id}/entities/offers`, { title_en: 'x' })).status, 403);
    // …and sees masked guest contact details.
    const aOrder = all.find((o: any) => o.hotel_id === A.id);
    assert.doesNotMatch(aOrder.guest_phone, /551234567/);
  });

  test('traceability: every settled SAR maps back to ledger, order, lines and rule', async () => {
    const rows = await q(
      `SELECT s.commission_minor AS header, SUM(sl.commission_minor) AS lines, SUM(l.commission_minor) AS ledger, SUM(fs.commission_minor) FILTER (WHERE l.entry_type = 'COMMISSION') AS snapshots,
              bool_and(ol.n > 0) AS has_lines, bool_and(cr.id IS NOT NULL) AS has_rule
         FROM settlements s JOIN settlement_lines sl ON sl.settlement_id = s.id JOIN commission_ledger l ON l.id = sl.ledger_entry_id
         JOIN financial_snapshots fs ON fs.id = l.snapshot_id JOIN commission_rules cr ON cr.id = fs.rule_id
         JOIN LATERAL (SELECT COUNT(*) AS n FROM order_lines WHERE request_id = l.request_id) ol ON true
        WHERE s.id = $1 GROUP BY s.commission_minor`,
      [settlementId]
    );
    assert.equal(rows[0].header, rows[0].lines);
    assert.equal(rows[0].lines, rows[0].ledger);
    assert.equal(rows[0].ledger, rows[0].snapshots);
    assert.ok(rows[0].has_lines && rows[0].has_rule);
  });
});
