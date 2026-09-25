import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  ADJUSTMENT_TYPES,
  HOTEL_FINANCE_ACCESS,
  SETTLEMENT_PERIODS,
  SETTLEMENT_STATUSES,
  adjustmentInputSchema,
  resolveRule,
  ruleInputSchema,
} from '../../../shared/commerce';
import { roleCan } from '../../../shared/domain';
import { audit, diff } from '../../audit';
import { requireUser } from '../../auth';
import { clientIp, type AppEnv, type Ctx } from '../../context';
import { one, pool, q, tx } from '../../db';
import { HttpError, badRequest, conflict, forbidden, notFound, validationError } from '../../errors';
import { canSeePii } from '../../services/access';
import {
  createSettlement,
  loadOrder,
  orderContext,
  orderLines,
  postAdjustment,
  refreshSettlement,
  reevaluate,
  rulesFor,
  setDispute,
  settlementDetail,
  transitionSettlement,
} from '../../services/finance';
import { applyRetention } from '../../services/guests';
import { jobStatus } from '../../services/scheduler';
import { readiness } from '../../health';
import { metricsSnapshot } from '../../metrics';
import { REPORTS, allDepartments, exportFormat, platformDashboard, reportFilterSchema, runReport, searchOrders, type ReportKey } from '../../services/reports';
import { sendReport, statementReport } from './commerce';

/**
 * Platform finance: commercial agreements, commission rules, every hotel's
 * orders, ledger, adjustments and settlements. Global roles only.
 */
export const platformRoutes = new Hono<AppEnv>();

function requirePlatform(c: Ctx) {
  const u = requireUser(c);
  if (!u.global || !roleCan(u.role, 'commercial')) throw forbidden('Platform finance access is required');
  return u;
}
const actor = (c: Ctx) => ({ user: c.get('user')!, ip: clientIp(c) });
const body = async (c: Ctx) =>
  c.req.json().catch(() => {
    throw badRequest('Invalid JSON body');
  });
const uuid = (v: string | undefined, what: string) => {
  if (!v || !/^[0-9a-f-]{36}$/i.test(v)) throw notFound(`${what} not found`);
  return v;
};
async function hotelExists(hid: string) {
  if (!(await one('SELECT 1 FROM hotels WHERE id = $1', [uuid(hid, 'Hotel')]))) throw notFound('Hotel not found');
  return hid;
}
async function orderHotel(orderId: string) {
  const r = await one<{ hotel_id: string }>('SELECT hotel_id FROM requests WHERE id = $1', [uuid(orderId, 'Order')]);
  if (!r) throw notFound('Order not found');
  return r.hotel_id;
}

// ------------------------------------------------------------------ Hotels & commercial settings
platformRoutes.get('/hotels', async (c) => {
  requirePlatform(c);
  const rows = await q(
    `SELECT h.id, h.slug, h.name_en, h.name_ar, h.is_published, COALESCE(h.profile->>'currency','SAR') AS currency,
            COALESCE(s.hotel_finance_access, 'NONE') AS hotel_finance_access, COALESCE(s.settlement_frequency, 'MONTHLY') AS settlement_frequency,
            s.guest_retention_days,
            (SELECT COUNT(*) FROM commission_rules r WHERE r.hotel_id = h.id AND r.is_active AND (r.effective_to IS NULL OR r.effective_to > now())) AS active_rules
       FROM hotels h LEFT JOIN hotel_commercial_settings s ON s.hotel_id = h.id ORDER BY h.name_en`
  );
  return c.json({ hotels: rows });
});

platformRoutes.put('/hotels/:hid/commercial', async (c) => {
  const u = requirePlatform(c);
  const hid = await hotelExists(c.req.param('hid'));
  const parsed = z
    .object({
      hotel_finance_access: z.enum(HOTEL_FINANCE_ACCESS),
      settlement_frequency: z.enum(SETTLEMENT_PERIODS),
      guest_retention_days: z.number().int().min(30).max(3650).nullable(),
    })
    .partial()
    .strict()
    .safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  if (!Object.keys(parsed.data).length) throw new HttpError(422, 'no_changes', 'Nothing to update');
  const before = await one(`SELECT hotel_finance_access, settlement_frequency, guest_retention_days FROM hotel_commercial_settings WHERE hotel_id = $1`, [hid]);
  const next = { hotel_finance_access: 'NONE', settlement_frequency: 'MONTHLY', guest_retention_days: null, ...before, ...parsed.data };
  await q(
    `INSERT INTO hotel_commercial_settings (hotel_id, hotel_finance_access, settlement_frequency, guest_retention_days, updated_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,now())
     ON CONFLICT (hotel_id) DO UPDATE SET hotel_finance_access = $2, settlement_frequency = $3, guest_retention_days = $4, updated_by = $5, updated_at = now()`,
    [hid, next.hotel_finance_access, next.settlement_frequency, next.guest_retention_days, u.id]
  );
  await audit({ hotelId: hid, user: u, action: 'update', entity: 'commercial_settings', entityId: hid, ...diff(before, next), ip: clientIp(c) });
  return c.json(next);
});

// ------------------------------------------------------------------ Agreements & rules
platformRoutes.get('/agreements', async (c) => {
  requirePlatform(c);
  const hid = c.req.query('hotel_id');
  const rows = await q(
    `SELECT a.*, h.name_en AS hotel_name,
            (SELECT COUNT(*) FROM commission_rules r WHERE r.agreement_id = a.id) AS rule_versions
       FROM commission_agreements a LEFT JOIN hotels h ON h.id = a.hotel_id
      ${hid === 'platform' ? 'WHERE a.hotel_id IS NULL' : hid ? 'WHERE a.hotel_id = $1' : ''}
      ORDER BY a.hotel_id NULLS FIRST, a.created_at DESC`,
    hid && hid !== 'platform' ? [uuid(hid, 'Hotel')] : []
  );
  return c.json({ agreements: rows });
});

const agreementInput = z.object({
  hotel_id: z.string().uuid().nullable(),
  name: z.string().trim().min(3).max(160),
  contract_reference: z.string().trim().max(120).default(''),
  currency: z.string().regex(/^[A-Z]{3}$/).default('SAR'),
  notes: z.string().trim().max(2000).default(''),
});

platformRoutes.post('/agreements', async (c) => {
  const u = requirePlatform(c);
  const parsed = agreementInput.safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const v = parsed.data;
  if (v.hotel_id) await hotelExists(v.hotel_id);
  const a = await tx(async (client) => {
    const n = await one<{ n: number }>(`SELECT nextval('commission_agreement_seq') AS n`, [], client);
    const no = `AGR-${String(n!.n).padStart(5, '0')}`;
    const row = await one(
      `INSERT INTO commission_agreements (hotel_id, agreement_no, name, contract_reference, currency, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [v.hotel_id, no, v.name, v.contract_reference, v.currency, v.notes, u.id],
      client
    );
    await audit({ hotelId: v.hotel_id, user: u, action: 'create', entity: 'commission_agreement', entityId: row.id, summary: `Agreement ${no}: ${v.name}`, after: row, ip: clientIp(c) }, client);
    return row;
  });
  return c.json(a, 201);
});

platformRoutes.patch('/agreements/:aid', async (c) => {
  const u = requirePlatform(c);
  const aid = uuid(c.req.param('aid'), 'Agreement');
  const parsed = z
    .object({ name: z.string().trim().min(3).max(160), contract_reference: z.string().trim().max(120), notes: z.string().trim().max(2000), is_active: z.boolean() })
    .partial()
    .strict()
    .safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  if (!Object.keys(parsed.data).length) throw new HttpError(422, 'no_changes', 'Nothing to update');
  const before = await one(`SELECT * FROM commission_agreements WHERE id = $1`, [aid]);
  if (!before) throw notFound('Agreement not found');
  const v = parsed.data;
  const after = await one(
    `UPDATE commission_agreements SET name = COALESCE($2, name), contract_reference = COALESCE($3, contract_reference), notes = COALESCE($4, notes),
            is_active = COALESCE($5, is_active), updated_at = now() WHERE id = $1 RETURNING *`,
    [aid, v.name ?? null, v.contract_reference ?? null, v.notes ?? null, v.is_active ?? null]
  );
  await audit({ hotelId: before.hotel_id, user: u, action: 'update', entity: 'commission_agreement', entityId: aid, ...diff(before, after), ip: clientIp(c) });
  return c.json(after);
});

platformRoutes.get('/agreements/:aid/rules', async (c) => {
  requirePlatform(c);
  const aid = uuid(c.req.param('aid'), 'Agreement');
  const rules = await q(
    `SELECT r.*, u.name AS created_by_name,
            (SELECT COUNT(*) FROM financial_snapshots s WHERE s.rule_id = r.id) AS orders_using
       FROM commission_rules r LEFT JOIN users u ON u.id = r.created_by WHERE r.agreement_id = $1
      ORDER BY r.scope_level, r.scope_value, r.version DESC`,
    [aid]
  );
  return c.json({ rules });
});

/**
 * Adds a rule version. With `supersedes` (a rule_key) the new version
 * replaces that rule from its effective_from: the open previous version is
 * closed at that moment. History is never rewritten.
 */
platformRoutes.post('/agreements/:aid/rules', async (c) => {
  const u = requirePlatform(c);
  const aid = uuid(c.req.param('aid'), 'Agreement');
  const raw = await body(c);
  const parsed = ruleInputSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error);
  const supersedes = z.string().uuid().nullable().default(null).safeParse(raw?.supersedes ?? null);
  if (!supersedes.success) throw validationError(supersedes.error);
  const v = parsed.data;
  const result = await tx(async (client) => {
    const a = await one<{ id: string; hotel_id: string | null; is_active: boolean }>(`SELECT id, hotel_id, is_active FROM commission_agreements WHERE id = $1 FOR UPDATE`, [aid], client);
    if (!a) throw notFound('Agreement not found');
    if (!a.is_active) throw conflict('This agreement is inactive');
    if (v.scope_level === 'PLATFORM' && a.hotel_id) throw new HttpError(422, 'validation_failed', 'Platform default rules belong to the platform agreement', { fields: { scope_level: 'Use a hotel-level scope' } });
    if (v.scope_level !== 'PLATFORM' && !a.hotel_id && !['ORDER_TYPE', 'DEPARTMENT'].includes(v.scope_level)) {
      throw new HttpError(422, 'validation_failed', 'The platform agreement can hold platform-wide, order-type and department rules only', { fields: { scope_level: 'Not allowed here' } });
    }
    const from = new Date(v.effective_from);
    let ruleKey: string = randomUUID();
    let version = 1;
    if (supersedes.data) {
      const prev = await one<{ rule_key: string; version: number; scope_level: string; scope_value: string }>(
        `SELECT rule_key, MAX(version) AS version, MIN(scope_level) AS scope_level, MIN(scope_value) AS scope_value FROM commission_rules WHERE rule_key = $1 AND agreement_id = $2 GROUP BY rule_key`,
        [supersedes.data, aid],
        client
      );
      if (!prev) throw notFound('Rule to supersede not found');
      if (prev.scope_level !== v.scope_level || prev.scope_value !== v.scope_value) throw new HttpError(422, 'validation_failed', 'A new version must keep the same scope', { fields: { scope_level: 'Scope differs from the rule it replaces' } });
      ruleKey = prev.rule_key;
      version = prev.version + 1;
      const open = await q<{ id: string; effective_from: Date }>(
        `SELECT id, effective_from FROM commission_rules WHERE rule_key = $1 AND is_active AND (effective_to IS NULL OR effective_to > $2) FOR UPDATE`,
        [ruleKey, from],
        client
      );
      for (const o of open) {
        if (o.effective_from >= from) throw conflict('A version already starts on or after this date; choose a later effective date');
        await q(`UPDATE commission_rules SET effective_to = $2 WHERE id = $1`, [o.id, from], client);
      }
    }
    // One live rule per scope at any moment: refuse overlaps with a different rule.
    const overlap = await one<{ id: string; version: number }>(
      `SELECT id, version FROM commission_rules
        WHERE agreement_id = $1 AND scope_level = $2 AND scope_value = $3 AND rule_key <> $4 AND is_active
          AND effective_from < COALESCE($6::timestamptz, 'infinity') AND COALESCE(effective_to, 'infinity') > $5`,
      [aid, v.scope_level, v.scope_value, ruleKey, from, v.effective_to],
      client
    );
    if (overlap) throw conflict('Another rule already covers this scope for part of this period. Create a new version of it instead.');
    const row = await one(
      `INSERT INTO commission_rules (agreement_id, hotel_id, rule_key, version, scope_level, scope_value, commission_type, rate_bps, fixed_fee_minor, basis,
          eligible_status, cancellation_policy, included_codes, excluded_codes, tax_treatment, tax_rate_bps, effective_from, effective_to, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [
        aid, a.hotel_id, ruleKey, version, v.scope_level, v.scope_value, v.commission_type, v.rate_bps, v.fixed_fee_minor, v.basis, v.eligible_status,
        v.cancellation_policy, v.included_codes, v.excluded_codes, v.tax_treatment, v.tax_rate_bps, from, v.effective_to, v.notes, u.id,
      ],
      client
    );
    await audit(
      { hotelId: a.hotel_id, user: u, action: 'create', entity: 'commission_rule', entityId: row.id, summary: `${v.scope_level}${v.scope_value ? ` ${v.scope_value}` : ''} v${version}: ${(v.rate_bps / 100).toFixed(2)}% + ${(v.fixed_fee_minor / 100).toFixed(2)} from ${v.effective_from}`, after: row, ip: clientIp(c) },
      client
    );
    return row;
  });
  return c.json(result, 201);
});

platformRoutes.post('/rules/:rid/close', async (c) => {
  const u = requirePlatform(c);
  const rid = uuid(c.req.param('rid'), 'Rule');
  const parsed = z.object({ effective_to: z.string().datetime({ offset: true }), reason: z.string().trim().min(3).max(500) }).safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const r = await one<{ id: string; hotel_id: string | null; effective_from: Date; effective_to: Date | null }>(`SELECT id, hotel_id, effective_from, effective_to FROM commission_rules WHERE id = $1`, [rid]);
  if (!r) throw notFound('Rule not found');
  const to = new Date(parsed.data.effective_to);
  if (to <= r.effective_from) throw new HttpError(422, 'validation_failed', 'Must be after the rule starts', { fields: { effective_to: 'Too early' } });
  if (r.effective_to && to > r.effective_to) throw conflict('A rule can only be closed earlier, not extended; create a new version instead');
  // Orders already snapshotted keep their rule; closing only affects orders placed after `to`.
  const affected = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM financial_snapshots s JOIN requests o ON o.id = s.request_id WHERE s.rule_id = $1 AND o.created_at >= $2`, [rid, to]);
  if (affected && affected.n > 0) throw conflict(`${affected.n} order(s) placed after this date already used this rule; their snapshots stay unchanged. Choose a date after them.`);
  await q(`UPDATE commission_rules SET effective_to = $2 WHERE id = $1`, [rid, to]);
  await audit({ hotelId: r.hotel_id, user: u, action: 'close', entity: 'commission_rule', entityId: rid, summary: `Closed at ${to.toISOString()}: ${parsed.data.reason}`, before: { effective_to: r.effective_to }, after: { effective_to: to }, ip: clientIp(c) });
  return c.json({ effective_to: to.toISOString() });
});

platformRoutes.post('/rules/:rid/active', async (c) => {
  const u = requirePlatform(c);
  const rid = uuid(c.req.param('rid'), 'Rule');
  const parsed = z.object({ is_active: z.boolean(), reason: z.string().trim().min(3).max(500) }).safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const r = await one<{ hotel_id: string | null; is_active: boolean }>(`SELECT hotel_id, is_active FROM commission_rules WHERE id = $1`, [rid]);
  if (!r) throw notFound('Rule not found');
  if (r.is_active === parsed.data.is_active) throw new HttpError(422, 'no_changes', `Rule is already ${r.is_active ? 'active' : 'inactive'}`);
  await q(`UPDATE commission_rules SET is_active = $2 WHERE id = $1`, [rid, parsed.data.is_active]);
  await audit({ hotelId: r.hotel_id, user: u, action: parsed.data.is_active ? 'activate' : 'deactivate', entity: 'commission_rule', entityId: rid, summary: parsed.data.reason, ip: clientIp(c) });
  return c.json({ is_active: parsed.data.is_active });
});

/** Which rule would apply to an order (or a hypothetical context) at a moment — for checking a configuration before relying on it. */
platformRoutes.post('/rules/preview', async (c) => {
  requirePlatform(c);
  const parsed = z
    .object({
      hotel_id: z.string().uuid(),
      order_id: z.string().uuid().optional(),
      at: z.string().datetime({ offset: true }).optional(),
      context: z.object({ order_type: z.string(), department: z.string(), outlet_code: z.string().nullable().default(null), category_code: z.string().nullable().default(null), service_code: z.string().nullable().default(null) }).optional(),
    })
    .safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const v = parsed.data;
  await hotelExists(v.hotel_id);
  let ctx = v.context;
  let at = v.at ? new Date(v.at) : new Date();
  if (v.order_id) {
    const order = await loadOrder(pool, v.hotel_id, v.order_id);
    ctx = await orderContext(pool, order, await orderLines(pool, order.id));
    at = order.created_at;
  }
  if (!ctx) throw badRequest('Give an order or a context');
  const rule = resolveRule(await rulesFor(pool, v.hotel_id), ctx, at);
  return c.json({ context: ctx, at: at.toISOString(), rule, code: rule ? null : 'COMMISSION_RULE_UNAVAILABLE' });
});

// ------------------------------------------------------------------ Dashboard, orders, ledger
platformRoutes.get('/dashboard', async (c) => {
  requirePlatform(c);
  const f = reportFilterSchema.safeParse(c.req.query());
  if (!f.success) throw validationError(f.error);
  c.header('Cache-Control', 'no-store');
  return c.json(await platformDashboard(f.data));
});

platformRoutes.get('/orders', async (c) => {
  const u = requirePlatform(c);
  const f = reportFilterSchema.safeParse(c.req.query());
  if (!f.success) throw validationError(f.error);
  const page = z.object({ limit: z.coerce.number().int().min(1).max(500).default(50), offset: z.coerce.number().int().min(0).default(0) }).parse(c.req.query());
  const format = exportFormat(c.req.query('format'));
  const result = await searchOrders({ hotelIds: null, departments: await allDepartments() }, f.data, { ...page, limit: format === 'json' ? page.limit : 5000, showPii: canSeePii(u), showFinance: true });
  if (format === 'json') {
    c.header('Cache-Control', 'no-store');
    return c.json(result);
  }
  await audit({ hotelId: f.data.hotel_id ?? null, user: u, action: 'export', entity: 'orders', summary: `Platform export of ${result.orders.length} orders (${format})`, ip: clientIp(c) });
  return sendReport(
    c,
    {
      title: 'Orders — all hotels',
      columns: [
        { key: 'hotel_name', label: 'Hotel' }, { key: 'reference', label: 'Reference' }, { key: 'created_at', label: 'Created' }, { key: 'order_type', label: 'Type' },
        { key: 'department', label: 'Department' }, { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' }, { key: 'guest_no', label: 'Guest ID' },
        { key: 'total', label: 'Total' }, { key: 'financial_status', label: 'Financial status' }, { key: 'commission_minor', label: 'Commission', money: true },
        { key: 'settlement_no', label: 'Settlement' },
      ],
      rows: result.orders,
    },
    format,
    `orders-all-${new Date().toISOString().slice(0, 10)}`
  );
});

platformRoutes.get('/orders/:id', async (c) => {
  const u = requirePlatform(c);
  const id = uuid(c.req.param('id'), 'Order');
  const hid = await orderHotel(id);
  const r = await one(`SELECT r.*, g.guest_no FROM requests r LEFT JOIN guests g ON g.id = r.guest_id WHERE r.id = $1`, [id]);
  const [lines, events, snapshot, ledger, adjustments] = await Promise.all([
    q(`SELECT * FROM order_lines WHERE request_id = $1 ORDER BY line_no`, [id]),
    q(`SELECT e.event_type, e.from_status, e.to_status, e.note, e.reason, e.actor_type, COALESCE(u.name, NULLIF(e.actor_name,'')) AS actor, e.created_at FROM request_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.request_id = $1 ORDER BY e.created_at`, [id]),
    one(`SELECT * FROM financial_snapshots WHERE request_id = $1`, [id]),
    q(`SELECT l.*, s.settlement_no FROM commission_ledger l LEFT JOIN settlements s ON s.id = l.settlement_id WHERE l.request_id = $1 ORDER BY l.created_at`, [id]),
    q(`SELECT * FROM financial_adjustments WHERE request_id = $1 ORDER BY created_at`, [id]),
  ]);
  const { guest_token_hash: _t, whatsapp_text: _w, ...order } = r;
  const pii = canSeePii(u);
  return c.json({ hotel_id: hid, order: pii ? order : { ...order, guest_name: '', guest_phone: '' }, lines, events, snapshot, ledger, adjustments, finance_access: 'FULL' });
});

platformRoutes.post('/orders/:id/evaluate', async (c) => {
  requirePlatform(c);
  const id = uuid(c.req.param('id'), 'Order');
  const hid = await orderHotel(id);
  const r = await tx((client) => reevaluate(client, hid, id, actor(c)));
  return c.json({ snapshot_id: r.snapshotId, ledger_entry_id: r.entryId, commission_minor: r.calc.commission_minor, formula: r.calc.formula });
});

platformRoutes.post('/orders/:id/adjustments', async (c) => {
  requirePlatform(c);
  const id = uuid(c.req.param('id'), 'Order');
  const hid = await orderHotel(id);
  const raw = await body(c);
  const parsed = adjustmentInputSchema.extend({ direction: z.enum(['INCREASE', 'DECREASE']).default('DECREASE') }).safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error);
  if (!(ADJUSTMENT_TYPES as readonly string[]).includes(parsed.data.adjustment_type)) throw badRequest('Unknown adjustment type');
  const r = await tx((client) => postAdjustment(client, hid, id, parsed.data, actor(c)));
  return c.json(r, 201);
});

platformRoutes.get('/ledger', async (c) => {
  requirePlatform(c);
  const f = z
    .object({
      hotel_id: z.string().uuid().optional(),
      status: z.string().regex(/^[A-Z]+$/).optional(),
      unsettled: z.enum(['1']).optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
      offset: z.coerce.number().int().min(0).default(0),
    })
    .parse(c.req.query());
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.hotel_id) where.push(`l.hotel_id = $${params.push(f.hotel_id)}`);
  if (f.status) where.push(`l.status = $${params.push(f.status)}`);
  if (f.unsettled) where.push(`l.settlement_id IS NULL`);
  const rows = await q(
    `SELECT l.*, h.name_en AS hotel_name, r.reference, r.order_type, r.department, s.settlement_no, fs.rule_level, fs.rule_version, fs.formula
       FROM commission_ledger l JOIN hotels h ON h.id = l.hotel_id JOIN requests r ON r.id = l.request_id
       JOIN financial_snapshots fs ON fs.id = l.snapshot_id LEFT JOIN settlements s ON s.id = l.settlement_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY l.earned_at DESC LIMIT $${params.push(f.limit)} OFFSET $${params.push(f.offset)}`,
    params
  );
  c.header('Cache-Control', 'no-store');
  return c.json({ entries: rows });
});

platformRoutes.post('/ledger/:eid/dispute', async (c) => {
  requirePlatform(c);
  const eid = uuid(c.req.param('eid'), 'Ledger entry');
  const parsed = z.object({ disputed: z.boolean(), reason: z.string().trim().min(3).max(500) }).safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const e = await one<{ hotel_id: string }>(`SELECT hotel_id FROM commission_ledger WHERE id = $1`, [eid]);
  if (!e) throw notFound('Ledger entry not found');
  return c.json(await tx((client) => setDispute(client, e.hotel_id, eid, parsed.data.disputed, parsed.data.reason, actor(c))));
});

// ------------------------------------------------------------------ Settlements
platformRoutes.get('/settlements', async (c) => {
  requirePlatform(c);
  const f = z.object({ hotel_id: z.string().uuid().optional(), status: z.enum(SETTLEMENT_STATUSES).optional() }).parse(c.req.query());
  const params: unknown[] = [];
  const where: string[] = [];
  if (f.hotel_id) where.push(`s.hotel_id = $${params.push(f.hotel_id)}`);
  if (f.status) where.push(`s.status = $${params.push(f.status)}`);
  const rows = await q(
    `SELECT s.id, s.hotel_id, h.name_en AS hotel_name, s.settlement_no, s.period_type, to_char(s.period_start,'YYYY-MM-DD') AS period_start,
            to_char(s.period_end,'YYYY-MM-DD') AS period_end, s.status, s.order_count, s.entry_count, s.gross_minor, s.refunds_minor, s.adjustments_minor,
            s.base_minor, s.commission_minor, s.commission_tax_minor, s.platform_revenue_minor, s.hotel_amount_minor, s.amount_due_minor, s.currency,
            s.created_at, s.settled_at, s.payment_reference
       FROM settlements s JOIN hotels h ON h.id = s.hotel_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.period_start DESC, h.name_en`,
    params
  );
  return c.json({ settlements: rows });
});

platformRoutes.post('/settlements', async (c) => {
  requirePlatform(c);
  const parsed = z
    .object({
      hotel_id: z.string().uuid(),
      period_type: z.enum(SETTLEMENT_PERIODS),
      period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().trim().max(1000).default(''),
    })
    .safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const { hotel_id, ...input } = parsed.data;
  await hotelExists(hotel_id);
  return c.json(await tx((client) => createSettlement(client, hotel_id, input, actor(c))), 201);
});

async function settlementHotel(sid: string) {
  const s = await one<{ hotel_id: string }>(`SELECT hotel_id FROM settlements WHERE id = $1`, [uuid(sid, 'Settlement')]);
  if (!s) throw notFound('Settlement not found');
  return s.hotel_id;
}

platformRoutes.get('/settlements/:sid', async (c) => {
  const u = requirePlatform(c);
  const sid = c.req.param('sid');
  const hid = await settlementHotel(sid);
  const detail = await settlementDetail(hid, sid, { showGuest: canSeePii(u) });
  const format = exportFormat(c.req.query('format'));
  if (format === 'json') return c.json(detail);
  await audit({ hotelId: hid, user: u, action: 'export', entity: 'settlement', entityId: sid, summary: `Statement ${detail.settlement.settlement_no} (${format})`, ip: clientIp(c) });
  return sendReport(c, statementReport(detail), format, detail.settlement.settlement_no);
});

platformRoutes.post('/settlements/:sid/refresh', async (c) => {
  requirePlatform(c);
  const sid = c.req.param('sid');
  const hid = await settlementHotel(sid);
  return c.json(await tx((client) => refreshSettlement(client, hid, sid, actor(c))));
});

platformRoutes.post('/settlements/:sid/status', async (c) => {
  requirePlatform(c);
  const sid = c.req.param('sid');
  const hid = await settlementHotel(sid);
  const parsed = z
    .object({ status: z.enum(SETTLEMENT_STATUSES), payment_reference: z.string().trim().max(120).default(''), notes: z.string().trim().max(1000).default('') })
    .safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const { status, ...extra } = parsed.data;
  return c.json(await tx((client) => transitionSettlement(client, hid, sid, status, extra, actor(c))));
});

// ------------------------------------------------------------------ Reports & privacy
platformRoutes.get('/reports/:report', async (c) => {
  requirePlatform(c);
  const key = c.req.param('report') as ReportKey;
  if (!REPORTS[key]) throw notFound('Unknown report');
  const f = reportFilterSchema.safeParse(c.req.query());
  if (!f.success) throw validationError(f.error);
  const report = await runReport(key, { hotelIds: null, departments: await allDepartments() }, f.data);
  return sendReport(c, report, exportFormat(c.req.query('format')), `${key}-${new Date().toISOString().slice(0, 10)}`);
});

/**
 * Operations view for platform administrators: this replica's health and
 * latency, background jobs, and business-level failure signals.
 */
platformRoutes.get('/ops', async (c) => {
  const u = requirePlatform(c);
  if (u.role !== 'SUPER_ADMIN') throw forbidden();
  const [ready, jobs, signals] = await Promise.all([
    readiness(),
    jobStatus(),
    one(
      `SELECT
         (SELECT COUNT(*) FROM requests WHERE created_at > now() - interval '1 hour') AS orders_last_hour,
         (SELECT COUNT(*) FROM requests WHERE status = 'NEW' AND created_at < now() - interval '30 minutes') AS orders_unaccepted_30min,
         (SELECT COUNT(*) FROM requests WHERE is_commercial AND status = 'COMPLETED' AND financial_status = 'AWAITING_ELIGIBILITY' AND completed_at < now() - interval '1 hour') AS completed_without_ledger,
         (SELECT COUNT(*) FROM settlements WHERE status = 'APPROVED' AND acknowledged_at IS NULL AND approved_at < now() - interval '7 days') AS settlements_unacknowledged_7d,
         (SELECT COUNT(*) FROM job_runs WHERE status = 'FAILED' AND started_at > now() - interval '24 hours') AS job_failures_24h,
         (SELECT COUNT(*) FROM hotels) AS hotels,
         (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS db_max_connections,
         (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) AS db_connections`
    ),
  ]);
  c.header('Cache-Control', 'no-store');
  return c.json({ replica: process.env.RAILWAY_REPLICA_ID ?? String(process.pid), ready, metrics: metricsSnapshot(), jobs, signals });
});

platformRoutes.post('/privacy/retention', async (c) => {
  const u = requirePlatform(c);
  if (u.role !== 'SUPER_ADMIN') throw forbidden();
  const n = await tx((client) => applyRetention(client));
  await audit({ hotelId: null, user: u, action: 'retention', entity: 'guest', summary: `Retention run anonymised ${n} guest profile(s)`, ip: clientIp(c) });
  return c.json({ anonymized: n });
});
