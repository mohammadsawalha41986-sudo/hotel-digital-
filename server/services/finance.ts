import type pg from 'pg';
import {
  ADJUSTMENT_LABELS,
  SETTLEMENT_TRANSITIONS,
  adjustmentDeltas,
  calculateCommission,
  resolveRule,
  ruleMatchesContext,
  type AdjustmentInput,
  type AdjustmentType,
  type CalcLine,
  type CommissionBasis,
  type CommissionType,
  type OrderContext,
  type RuleLevel,
  type SettlementStatus,
  type TaxTreatment,
} from '../../shared/commerce';
import type { RequestStatus } from '../../shared/domain';
import { audit } from '../audit';
import type { SessionUser } from '../context';
import { one, q, type Queryable } from '../db';
import { HttpError, conflict, notFound } from '../errors';

/**
 * Canonical commission engine. Every financial number the platform reports is
 * produced here and stored immutably:
 *   order → order lines → financial snapshot (rule + formula) → ledger entry
 *   → settlement line → settlement.
 */

export interface RuleRow {
  id: string;
  agreement_id: string;
  hotel_id: string | null;
  rule_key: string;
  version: number;
  scope_level: RuleLevel;
  scope_value: string;
  commission_type: CommissionType;
  rate_bps: number;
  fixed_fee_minor: number;
  basis: CommissionBasis;
  eligible_status: 'COMPLETED' | 'ACCEPTED';
  cancellation_policy: 'NO_COMMISSION' | 'CHARGE_IF_ACCEPTED';
  included_codes: string[];
  excluded_codes: string[];
  tax_treatment: TaxTreatment;
  tax_rate_bps: number;
  effective_from: Date;
  effective_to: Date | null;
  is_active: boolean;
  notes: string;
  created_at: Date;
}

export interface OrderRow {
  id: string;
  hotel_id: string;
  reference: string;
  type: string;
  order_type: string;
  department: string;
  status: RequestStatus;
  source_id: string | null;
  currency: string;
  is_commercial: boolean;
  financial_status: string;
  created_at: Date;
  accepted_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  rejected_at: Date | null;
}

export interface Actor {
  user: SessionUser | null;
  ip?: string;
}

const PROGRESS: RequestStatus[] = ['NEW', 'ACCEPTED', 'IN_PROGRESS', 'READY', 'COMPLETED'];
const reached = (status: RequestStatus, target: 'COMPLETED' | 'ACCEPTED') => PROGRESS.indexOf(status) >= PROGRESS.indexOf(target);
const fmt = (m: number, cur: string) => `${cur} ${(m / 100).toFixed(2)}`;

async function nextNo(db: Queryable, hotelId: string, key: string, prefix: string, pad = 6) {
  const r = await one<{ value: number }>(
    `INSERT INTO counters (hotel_id, key, value) VALUES ($1, $2, 1)
     ON CONFLICT (hotel_id, key) DO UPDATE SET value = counters.value + 1 RETURNING value`,
    [hotelId, key],
    db
  );
  return `${prefix}-${String(r!.value).padStart(pad, '0')}`;
}

async function hotelCode(db: Queryable, hotelId: string) {
  const h = await one<{ slug: string }>('SELECT slug FROM hotels WHERE id = $1', [hotelId], db);
  return (h?.slug ?? 'HOTEL').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
}

async function systemEvent(db: Queryable, order: Pick<OrderRow, 'id' | 'hotel_id' | 'status'>, type: string, note: string, actor: Actor, reason = '') {
  await q(
    `INSERT INTO request_events (request_id, hotel_id, user_id, to_status, note, is_internal, event_type, actor_type, actor_name, reason)
     VALUES ($1,$2,$3,NULL,$4,true,$5,$6,$7,$8)`,
    [order.id, order.hotel_id, actor.user?.id ?? null, note, type, actor.user ? 'staff' : 'system', actor.user?.name ?? 'System', reason],
    db
  );
}

// ---------------------------------------------------------------------------
// Rule resolution
// ---------------------------------------------------------------------------
export async function rulesFor(db: Queryable, hotelId: string): Promise<RuleRow[]> {
  return q<RuleRow>(
    `SELECT r.* FROM commission_rules r JOIN commission_agreements a ON a.id = r.agreement_id
      WHERE (r.hotel_id = $1 OR r.hotel_id IS NULL) AND a.is_active`,
    [hotelId],
    db
  );
}

export async function orderLines(db: Queryable, requestId: string) {
  return q<CalcLine & { name_en: string; quantity: number; unit_price_minor: number }>(
    `SELECT id, line_no, item_code, category_code, discount_minor, net_minor, vat_minor, gross_minor, name_en, quantity, unit_price_minor
       FROM order_lines WHERE request_id = $1 ORDER BY line_no`,
    [requestId],
    db
  );
}

export async function orderContext(db: Queryable, order: OrderRow, lines: CalcLine[]): Promise<OrderContext> {
  const shared = (vals: string[]) => (vals.length && vals.every((v) => v && v === vals[0]) ? vals[0] : null);
  let outlet: string | null = null;
  if (order.type === 'ORDER' && order.source_id) {
    outlet = (await one<{ code: string }>('SELECT code FROM outlets WHERE hotel_id = $1 AND id = $2', [order.hotel_id, order.source_id], db))?.code ?? null;
  }
  return {
    order_type: order.order_type,
    department: order.department,
    outlet_code: outlet,
    category_code: shared(lines.map((l) => l.category_code)),
    service_code: shared(lines.map((l) => l.item_code)),
  };
}

export type Resolution =
  | { ok: true; rule: RuleRow; context: OrderContext }
  | { ok: false; code: 'COMMISSION_RULE_UNAVAILABLE' | 'HISTORICAL_COMMISSION_RULE_UNAVAILABLE'; context: OrderContext; message: string };

/** Resolves the rule effective when the order was placed. Never falls back to 0% or to today's rule. */
export async function resolveForOrder(db: Queryable, order: OrderRow, lines: CalcLine[]): Promise<Resolution> {
  const context = await orderContext(db, order, lines);
  const rules = await rulesFor(db, order.hotel_id);
  const rule = resolveRule(rules, context, order.created_at);
  if (rule) return { ok: true, rule, context };
  const laterRule = rules.some((r) => r.is_active && ruleMatchesContext(r, context) && r.effective_from.getTime() > order.created_at.getTime());
  return laterRule
    ? {
        ok: false,
        code: 'HISTORICAL_COMMISSION_RULE_UNAVAILABLE',
        context,
        message: 'No commission rule was in effect when this order was placed. Later rules are not applied retroactively.',
      }
    : { ok: false, code: 'COMMISSION_RULE_UNAVAILABLE', context, message: 'No commission rule is configured for this order.' };
}

// ---------------------------------------------------------------------------
// Eligibility → snapshot → ledger
// ---------------------------------------------------------------------------
export async function loadOrder(db: Queryable, hotelId: string, id: string, lock = false): Promise<OrderRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Order not found');
  const o = await one<OrderRow>(
    `SELECT id, hotel_id, reference, type, order_type, department, status, source_id, currency, is_commercial, financial_status,
            created_at, accepted_at, completed_at, cancelled_at, rejected_at
       FROM requests WHERE hotel_id = $1 AND id = $2 ${lock ? 'FOR UPDATE' : ''}`,
    [hotelId, id],
    db
  );
  if (!o) throw notFound('Order not found');
  return o;
}

async function setFinancialStatus(db: Queryable, orderId: string, status: string, note: string) {
  await q(`UPDATE requests SET financial_status = $2, financial_note = $3 WHERE id = $1`, [orderId, status, note], db);
}

async function lockSnapshot(client: pg.PoolClient, order: OrderRow, rule: RuleRow, context: OrderContext, trigger: string, actor: Actor) {
  const lines = await orderLines(client, order.id);
  const totals = await one<{ gross: number; net: number; vat: number; discount: number; service: number; other: number }>(
    `SELECT COALESCE(SUM(gross_minor),0) AS gross, COALESCE(SUM(net_minor),0) AS net, COALESCE(SUM(vat_minor),0) AS vat,
            COALESCE(SUM(discount_minor),0) AS discount,
            (SELECT ROUND(service_charge*100) FROM requests WHERE id = $1) AS service,
            (SELECT ROUND(other_fees*100) FROM requests WHERE id = $1) AS other
       FROM order_lines WHERE request_id = $1`,
    [order.id],
    client
  );
  const grandTotal = totals!.gross + totals!.service + totals!.other;
  const calc = calculateCommission(lines, grandTotal, rule);
  const snapshot = await one<{ id: string; locked_at: Date }>(
    `INSERT INTO financial_snapshots (hotel_id, request_id, currency, trigger_status, subtotal_before_discount_minor, discount_minor, net_minor, vat_minor,
        service_charge_minor, other_fees_minor, gross_minor, eligible_lines, basis, eligible_base_minor, commission_type, rate_bps, fixed_fee_minor,
        commission_minor, tax_treatment, tax_rate_bps, commission_tax_minor, platform_revenue_minor, hotel_amount_minor,
        rule_id, rule_key, rule_version, rule_level, agreement_id, rule_terms, order_context, formula)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
     RETURNING id, locked_at`,
    [
      order.hotel_id, order.id, order.currency, trigger, totals!.net + totals!.discount, totals!.discount, totals!.net, totals!.vat,
      totals!.service, totals!.other, grandTotal, JSON.stringify(calc.eligible_lines), rule.basis, calc.eligible_base_minor, rule.commission_type,
      rule.rate_bps, rule.fixed_fee_minor, calc.commission_minor, rule.tax_treatment, rule.tax_rate_bps, calc.commission_tax_minor,
      calc.platform_revenue_minor, calc.hotel_amount_minor, rule.id, rule.rule_key, rule.version, rule.scope_level, rule.agreement_id,
      JSON.stringify(rule), JSON.stringify(context), calc.formula,
    ],
    client
  );
  const code = await hotelCode(client, order.hotel_id);
  const entryNo = await nextNo(client, order.hotel_id, 'LEDGER', `LE-${code}`);
  const entry = await one<{ id: string }>(
    `INSERT INTO commission_ledger (hotel_id, entry_no, entry_type, request_id, snapshot_id, earned_at, currency, gross_minor, base_minor, rule_id,
        rate_bps, commission_minor, commission_tax_minor, platform_revenue_minor, hotel_amount_minor, status)
     VALUES ($1,$2,'COMMISSION',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'EARNED') RETURNING id`,
    [
      order.hotel_id, entryNo, order.id, snapshot!.id, snapshot!.locked_at, order.currency, grandTotal, calc.eligible_base_minor, rule.id,
      rule.rate_bps, calc.commission_minor, calc.commission_tax_minor, calc.platform_revenue_minor, calc.hotel_amount_minor,
    ],
    client
  );
  const rateText = rule.commission_type === 'FIXED' ? `fixed ${fmt(rule.fixed_fee_minor, order.currency)}` : `${(rule.rate_bps / 100).toFixed(2)}%`;
  const note = `Commission eligible: ${rateText} on ${fmt(calc.eligible_base_minor, order.currency)} = ${fmt(calc.commission_minor, order.currency)} (${rule.scope_level} rule v${rule.version})`;
  await setFinancialStatus(client, order.id, 'ELIGIBLE', note);
  await systemEvent(client, order, 'FINANCIAL', note, { user: null }, calc.formula);
  await audit(
    { hotelId: order.hotel_id, user: actor.user, action: 'commission', entity: 'commission_ledger', entityId: entry!.id, summary: `${order.reference}: ${note}`, after: { snapshot_id: snapshot!.id, ...calc }, ip: actor.ip },
    client
  );
  return { snapshotId: snapshot!.id, entryId: entry!.id, calc };
}

/**
 * Called inside the status-change transaction. Decides whether the order is
 * now financially eligible, not eligible (cancelled), or blocked on a missing
 * rule — and records exactly why.
 */
export async function onOrderStatus(client: pg.PoolClient, order: OrderRow, to: RequestStatus, actor: Actor) {
  if (!order.is_commercial) return;
  const existing = await one<{ id: string }>(`SELECT id FROM financial_snapshots WHERE request_id = $1`, [order.id], client);
  const lines = await orderLines(client, order.id);
  const now = { ...order, status: to };

  if (to === 'CANCELLED' || to === 'REJECTED') {
    const res = await resolveForOrder(client, order, lines);
    if (existing) {
      // Eligible at acceptance, then cancelled: reverse unless the contract charges for it.
      if (res.ok && res.rule.cancellation_policy === 'CHARGE_IF_ACCEPTED') {
        await systemEvent(client, now, 'FINANCIAL', `Cancelled after acceptance — commission kept (${res.rule.cancellation_policy})`, { user: null });
        return;
      }
      await postAdjustment(client, order.hotel_id, order.id, { adjustment_type: 'CANCELLATION_REVERSAL' as never, amount_minor: 0, reason: `Order ${to.toLowerCase()} after it became eligible`, reference: '' }, actor, 'CANCELLATION_REVERSAL');
      await setFinancialStatus(client, order.id, 'NOT_ELIGIBLE', `Commission reversed: order ${to.toLowerCase()}`);
      return;
    }
    if (res.ok && res.rule.cancellation_policy === 'CHARGE_IF_ACCEPTED' && order.accepted_at) {
      await lockSnapshot(client, now, res.rule, res.context, to, actor);
      return;
    }
    const why = res.ok
      ? `No commission: order ${to.toLowerCase()} (${res.rule.scope_level} rule v${res.rule.version}, ${res.rule.cancellation_policy})`
      : `No commission: order ${to.toLowerCase()}`;
    await setFinancialStatus(client, order.id, 'NOT_ELIGIBLE', why);
    await systemEvent(client, now, 'FINANCIAL', why, { user: null });
    return;
  }

  if (existing) return;
  const res = await resolveForOrder(client, order, lines);
  if (!res.ok) {
    if (to === 'COMPLETED') {
      const status = res.code === 'COMMISSION_RULE_UNAVAILABLE' ? 'RULE_UNAVAILABLE' : 'HISTORICAL_RULE_UNAVAILABLE';
      await setFinancialStatus(client, order.id, status, `${res.code}: ${res.message}`);
      await systemEvent(client, now, 'FINANCIAL', res.code, { user: null }, res.message);
    }
    return;
  }
  if (reached(to, res.rule.eligible_status)) await lockSnapshot(client, now, res.rule, res.context, to, actor);
}

/** Re-runs eligibility for an order blocked on a missing rule (after finance configured one). */
export async function reevaluate(client: pg.PoolClient, hotelId: string, orderId: string, actor: Actor) {
  const order = await loadOrder(client, hotelId, orderId, true);
  if (!order.is_commercial) throw new HttpError(422, 'not_commercial', 'This request has no billable value');
  if (await one(`SELECT 1 FROM financial_snapshots WHERE request_id = $1`, [order.id], client)) throw conflict('This order already has a locked financial snapshot');
  if (!['COMPLETED', 'READY', 'IN_PROGRESS', 'ACCEPTED'].includes(order.status)) throw conflict(`Order is ${order.status.toLowerCase()}; nothing to evaluate`);
  const res = await resolveForOrder(client, order, await orderLines(client, order.id));
  if (!res.ok) {
    await setFinancialStatus(client, order.id, res.code === 'COMMISSION_RULE_UNAVAILABLE' ? 'RULE_UNAVAILABLE' : 'HISTORICAL_RULE_UNAVAILABLE', `${res.code}: ${res.message}`);
    throw new HttpError(409, res.code, res.message);
  }
  if (!reached(order.status, res.rule.eligible_status)) throw conflict(`This rule makes orders eligible when ${res.rule.eligible_status.toLowerCase()}`);
  return lockSnapshot(client, order, res.rule, res.context, order.status, actor);
}

// ---------------------------------------------------------------------------
// Adjustments
// ---------------------------------------------------------------------------
export async function remainingFor(db: Queryable, originalEntryId: string) {
  const r = await one<{ gross: number; base: number; commission: number; tax: number; revenue: number; hotel: number }>(
    `SELECT SUM(gross_minor) AS gross, SUM(base_minor) AS base, SUM(commission_minor) AS commission, SUM(commission_tax_minor) AS tax,
            SUM(platform_revenue_minor) AS revenue, SUM(hotel_amount_minor) AS hotel
       FROM commission_ledger WHERE id = $1 OR original_entry_id = $1`,
    [originalEntryId],
    db
  );
  return { gross_minor: r!.gross, base_minor: r!.base, commission_minor: r!.commission, tax_minor: r!.tax, revenue_minor: r!.revenue, hotel_minor: r!.hotel };
}

export async function postAdjustment(
  client: pg.PoolClient,
  hotelId: string,
  orderId: string,
  input: AdjustmentInput & { direction?: 'INCREASE' | 'DECREASE' },
  actor: Actor,
  forcedType?: AdjustmentType
) {
  const type: AdjustmentType = forcedType ?? input.adjustment_type;
  const order = await loadOrder(client, hotelId, orderId, true);
  const original = await one<{ id: string; status: string; settlement_id: string | null; rule_id: string; rate_bps: number; snapshot_id: string }>(
    `SELECT id, status, settlement_id, rule_id, rate_bps, snapshot_id FROM commission_ledger WHERE request_id = $1 AND entry_type = 'COMMISSION' FOR UPDATE`,
    [order.id],
    client
  );
  if (!original) throw new HttpError(409, 'not_eligible', 'This order has no commission entry to adjust');
  const snap = await one<{ gross_minor: number; eligible_base_minor: number; commission_minor: number; commission_tax_minor: number; platform_revenue_minor: number; hotel_amount_minor: number; fixed_fee_minor: number; tax_treatment: TaxTreatment; tax_rate_bps: number }>(
    `SELECT gross_minor, eligible_base_minor, commission_minor, commission_tax_minor, platform_revenue_minor, hotel_amount_minor, fixed_fee_minor, tax_treatment, tax_rate_bps
       FROM financial_snapshots WHERE id = $1`,
    [original.snapshot_id],
    client
  );
  const remaining = await remainingFor(client, original.id);
  const amount = input.amount_minor;
  const err = (m: string) => new HttpError(422, 'validation_failed', m, { fields: { amount_minor: m } });

  if (type === 'PARTIAL_REFUND') {
    if (amount <= 0) throw err('Enter the refunded amount');
    if (amount >= remaining.gross_minor) throw err(`A partial refund must be less than the remaining ${fmt(remaining.gross_minor, order.currency)}; use a full refund instead`);
  }
  if ((type === 'FULL_REFUND' || type === 'CANCELLATION_REVERSAL') && remaining.gross_minor <= 0) throw conflict('This order has already been fully refunded');
  const commissionTypes = ['COMMISSION_CORRECTION', 'HOTEL_CREDIT', 'HOTEL_DEBIT', 'PLATFORM_CREDIT', 'PLATFORM_DEBIT'];
  if (commissionTypes.includes(type) && amount <= 0) throw err('Enter the amount');

  const signed = type === 'COMMISSION_CORRECTION' && input.direction === 'DECREASE' ? -amount : amount;
  const d = adjustmentDeltas(type, signed, { ...snap!, gross_minor: snap!.gross_minor }, remaining);
  if (remaining.commission_minor + d.commission_delta_minor < 0) throw err('This would make the commission negative');

  const code = await hotelCode(client, hotelId);
  const adjNo = await nextNo(client, hotelId, 'ADJUSTMENT', `ADJ-${code}`);
  const adj = await one<{ id: string; created_at: Date }>(
    `INSERT INTO financial_adjustments (hotel_id, adjustment_no, adjustment_type, request_id, original_entry_id, amount_minor, gross_delta_minor,
        base_delta_minor, commission_delta_minor, tax_delta_minor, platform_revenue_delta_minor, hotel_amount_delta_minor, currency, reason, reference,
        calculation, created_by, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id, created_at`,
    [
      hotelId, adjNo, type, order.id, original.id, type === 'FULL_REFUND' || type === 'CANCELLATION_REVERSAL' ? remaining.gross_minor : amount,
      d.gross_delta_minor, d.base_delta_minor, d.commission_delta_minor, d.tax_delta_minor, d.platform_revenue_delta_minor, d.hotel_amount_delta_minor,
      order.currency, input.reason, input.reference, d.calculation, actor.user?.id ?? null, actor.user?.name ?? 'System',
    ],
    client
  );
  const entryNo = await nextNo(client, hotelId, 'LEDGER', `LE-${code}`);
  const entry = await one<{ id: string }>(
    `INSERT INTO commission_ledger (hotel_id, entry_no, entry_type, request_id, snapshot_id, adjustment_id, original_entry_id, earned_at, currency,
        gross_minor, base_minor, rule_id, rate_bps, commission_minor, commission_tax_minor, platform_revenue_minor, hotel_amount_minor, status)
     VALUES ($1,$2,'ADJUSTMENT',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'EARNED') RETURNING id`,
    [
      hotelId, entryNo, order.id, original.snapshot_id, adj!.id, original.id, adj!.created_at, order.currency, d.gross_delta_minor, d.base_delta_minor,
      original.rule_id, original.rate_bps, d.commission_delta_minor, d.tax_delta_minor, d.platform_revenue_delta_minor, d.hotel_amount_delta_minor,
    ],
    client
  );
  await q(`UPDATE financial_adjustments SET ledger_entry_id = $2 WHERE id = $1`, [adj!.id, entry!.id], client);
  // The original entry is never edited; its status records that it has been adjusted (a settled entry stays SETTLED).
  if (original.status !== 'SETTLED') {
    const after = await remainingFor(client, original.id);
    await q(`UPDATE commission_ledger SET status = $2 WHERE id = $1`, [original.id, after.gross_minor <= 0 && after.commission_minor <= 0 ? 'VOIDED' : 'ADJUSTED'], client);
  }
  const eventType = type === 'FULL_REFUND' || type === 'PARTIAL_REFUND' ? 'REFUNDED' : 'ADJUSTED';
  const note = `${ADJUSTMENT_LABELS[type]} ${adjNo}: order ${fmt(d.gross_delta_minor, order.currency)}, commission ${fmt(d.commission_delta_minor, order.currency)}`;
  await systemEvent(client, order, eventType, note, actor, input.reason);
  await audit({ hotelId, user: actor.user, action: 'adjust', entity: 'financial_adjustment', entityId: adj!.id, summary: `${order.reference}: ${note}`, after: { ...d, reason: input.reason, reference: input.reference }, ip: actor.ip }, client);
  return { id: adj!.id, adjustment_no: adjNo, ledger_entry_id: entry!.id, ...d };
}

export async function setDispute(client: pg.PoolClient, hotelId: string, entryId: string, disputed: boolean, reason: string, actor: Actor) {
  const e = await one<{ id: string; status: string; settlement_id: string | null; entry_no: string }>(
    `SELECT id, status, settlement_id, entry_no FROM commission_ledger WHERE hotel_id = $1 AND id = $2 FOR UPDATE`,
    [hotelId, entryId],
    client
  );
  if (!e) throw notFound('Ledger entry not found');
  if (e.settlement_id) throw conflict('This entry is part of a settlement; remove it from the draft or post an adjustment');
  if (disputed && e.status === 'DISPUTED') throw conflict('Already disputed');
  if (!disputed && e.status !== 'DISPUTED') throw conflict('This entry is not disputed');
  const next = disputed ? 'DISPUTED' : (await one<{ n: number }>(`SELECT COUNT(*) AS n FROM commission_ledger WHERE original_entry_id = $1`, [e.id], client))!.n > 0 ? 'ADJUSTED' : 'EARNED';
  await q(`UPDATE commission_ledger SET status = $2, dispute_reason = $3 WHERE id = $1`, [e.id, next, disputed ? reason : ''], client);
  await audit({ hotelId, user: actor.user, action: disputed ? 'dispute' : 'resolve_dispute', entity: 'commission_ledger', entityId: e.id, summary: `${e.entry_no}: ${disputed ? 'disputed' : 'dispute resolved'} — ${reason}`, before: { status: e.status }, after: { status: next }, ip: actor.ip }, client);
  return { status: next };
}

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------
export interface SettlementInput {
  period_type: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  period_start: string;
  period_end: string;
  notes: string;
}

function checkPeriod(p: SettlementInput) {
  const s = new Date(`${p.period_start}T00:00:00Z`);
  const e = new Date(`${p.period_end}T00:00:00Z`);
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  const bad = (m: string) => new HttpError(422, 'validation_failed', m, { fields: { period_end: m } });
  if (days < 1) throw bad('The period must end on or after its start');
  if (p.period_type === 'WEEKLY' && days !== 7) throw bad('A weekly period is 7 days');
  if (p.period_type === 'BIWEEKLY' && days !== 14) throw bad('A biweekly period is 14 days');
  if (p.period_type === 'MONTHLY') {
    const monthEnd = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0));
    if (s.getUTCDate() !== 1 || e.getTime() !== monthEnd.getTime()) throw bad('A monthly period runs from the 1st to the last day of the month');
  }
  if (days > 366) throw bad('A settlement period cannot exceed a year');
}

async function hotelTz(db: Queryable, hotelId: string) {
  const h = await one<{ tz: string; currency: string }>(`SELECT COALESCE(profile->>'timezone','Asia/Riyadh') AS tz, COALESCE(profile->>'currency','SAR') AS currency FROM hotels WHERE id = $1`, [hotelId], db);
  if (!h) throw notFound('Hotel not found');
  return h;
}

/** Attaches every unsettled, undisputed ledger entry of the period and recomputes totals from the lines. */
async function fillSettlement(client: pg.PoolClient, settlementId: string, hotelId: string, start: string, end: string) {
  const { tz } = await hotelTz(client, hotelId);
  const entries = await q<{ id: string }>(
    `SELECT id FROM commission_ledger
      WHERE hotel_id = $1 AND settlement_id IS NULL AND status <> 'DISPUTED'
        AND (earned_at AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date
      ORDER BY earned_at FOR UPDATE`,
    [hotelId, start, end, tz],
    client
  );
  if (entries.length) {
    const ids = entries.map((e) => e.id);
    await q(`UPDATE commission_ledger SET settlement_id = $2 WHERE id = ANY($1::uuid[])`, [ids, settlementId], client);
    await q(
      `INSERT INTO settlement_lines (settlement_id, hotel_id, ledger_entry_id, request_id, entry_type, gross_minor, base_minor, commission_minor,
          commission_tax_minor, platform_revenue_minor, hotel_amount_minor)
       SELECT $2, hotel_id, id, request_id, entry_type, gross_minor, base_minor, commission_minor, commission_tax_minor, platform_revenue_minor, hotel_amount_minor
         FROM commission_ledger WHERE id = ANY($1::uuid[])`,
      [ids, settlementId],
      client
    );
  }
  await recomputeTotals(client, settlementId);
  return entries.length;
}

async function recomputeTotals(db: Queryable, settlementId: string) {
  await q(
    `UPDATE settlements s SET
        entry_count = t.entries, order_count = t.orders,
        gross_minor = t.gross, refunds_minor = t.refunds, adjustments_minor = t.adjustments, base_minor = t.base,
        commission_minor = t.commission, commission_tax_minor = t.tax, platform_revenue_minor = t.revenue,
        hotel_amount_minor = t.hotel, amount_due_minor = t.gross_all - t.hotel
       FROM (SELECT COUNT(*) AS entries,
                    COUNT(DISTINCT request_id) FILTER (WHERE entry_type = 'COMMISSION') AS orders,
                    COALESCE(SUM(gross_minor) FILTER (WHERE entry_type = 'COMMISSION'), 0) AS gross,
                    COALESCE(-SUM(gross_minor) FILTER (WHERE entry_type = 'ADJUSTMENT'), 0) AS refunds,
                    COALESCE(SUM(commission_minor) FILTER (WHERE entry_type = 'ADJUSTMENT'), 0) AS adjustments,
                    COALESCE(SUM(gross_minor), 0) AS gross_all,
                    COALESCE(SUM(base_minor), 0) AS base, COALESCE(SUM(commission_minor), 0) AS commission,
                    COALESCE(SUM(commission_tax_minor), 0) AS tax, COALESCE(SUM(platform_revenue_minor), 0) AS revenue,
                    COALESCE(SUM(hotel_amount_minor), 0) AS hotel
               FROM settlement_lines WHERE settlement_id = $1) t
      WHERE s.id = $1`,
    [settlementId],
    db
  );
}

export async function createSettlement(client: pg.PoolClient, hotelId: string, input: SettlementInput, actor: Actor) {
  checkPeriod(input);
  const { currency } = await hotelTz(client, hotelId);
  const overlap = await one<{ settlement_no: string }>(
    `SELECT settlement_no FROM settlements WHERE hotel_id = $1 AND status <> 'VOID' AND period_start <= $3::date AND period_end >= $2::date`,
    [hotelId, input.period_start, input.period_end],
    client
  );
  if (overlap) throw conflict(`This period overlaps settlement ${overlap.settlement_no}`);
  const code = await hotelCode(client, hotelId);
  const no = await nextNo(client, hotelId, 'SETTLEMENT', `STL-${code}`, 4);
  const s = await one<{ id: string }>(
    `INSERT INTO settlements (hotel_id, settlement_no, period_type, period_start, period_end, currency, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [hotelId, no, input.period_type, input.period_start, input.period_end, currency, input.notes, actor.user?.id ?? null],
    client
  );
  const n = await fillSettlement(client, s!.id, hotelId, input.period_start, input.period_end);
  await audit({ hotelId, user: actor.user, action: 'create', entity: 'settlement', entityId: s!.id, summary: `${no}: ${input.period_start} → ${input.period_end}, ${n} ledger entries`, ip: actor.ip }, client);
  return { id: s!.id, settlement_no: no, entries: n };
}

export async function refreshSettlement(client: pg.PoolClient, hotelId: string, settlementId: string, actor: Actor) {
  const s = await one<{ id: string; status: string; period_start: string; period_end: string; settlement_no: string }>(
    `SELECT id, status, to_char(period_start,'YYYY-MM-DD') AS period_start, to_char(period_end,'YYYY-MM-DD') AS period_end, settlement_no
       FROM settlements WHERE hotel_id = $1 AND id = $2 FOR UPDATE`,
    [hotelId, settlementId],
    client
  );
  if (!s) throw notFound('Settlement not found');
  if (s.status !== 'DRAFT') throw conflict('Only a draft settlement can be refreshed');
  await q(`UPDATE commission_ledger SET settlement_id = NULL WHERE settlement_id = $1`, [s.id], client);
  await q(`DELETE FROM settlement_lines WHERE settlement_id = $1`, [s.id], client);
  const n = await fillSettlement(client, s.id, hotelId, s.period_start, s.period_end);
  await audit({ hotelId, user: actor.user, action: 'refresh', entity: 'settlement', entityId: s.id, summary: `${s.settlement_no}: refreshed, ${n} ledger entries`, ip: actor.ip }, client);
  return { entries: n };
}

export async function transitionSettlement(
  client: pg.PoolClient,
  hotelId: string,
  settlementId: string,
  to: SettlementStatus,
  extra: { payment_reference?: string; notes?: string },
  actor: Actor
) {
  const s = await one<{ id: string; status: SettlementStatus; settlement_no: string; commission_minor: number }>(
    `SELECT id, status, settlement_no, commission_minor FROM settlements WHERE hotel_id = $1 AND id = $2 FOR UPDATE`,
    [hotelId, settlementId],
    client
  );
  if (!s) throw notFound('Settlement not found');
  if (!SETTLEMENT_TRANSITIONS[s.status].includes(to)) throw new HttpError(409, 'invalid_transition', `A ${s.status.toLowerCase()} settlement cannot move to ${to.toLowerCase()}`);
  if (to === 'SETTLED' && !extra.payment_reference?.trim()) {
    throw new HttpError(422, 'validation_failed', 'Enter the payment reference', { fields: { payment_reference: 'Required to close a settlement' } });
  }
  if (to === 'APPROVED' || to === 'SETTLED') {
    // Integrity: the header must equal the sum of its lines, and every line must still match its ledger entry.
    const check = await one<{ header: number; lines: number; mismatched: number }>(
      `SELECT s.commission_minor AS header,
              COALESCE((SELECT SUM(commission_minor) FROM settlement_lines WHERE settlement_id = s.id), 0) AS lines,
              (SELECT COUNT(*) FROM settlement_lines sl JOIN commission_ledger l ON l.id = sl.ledger_entry_id
                WHERE sl.settlement_id = s.id AND (l.commission_minor <> sl.commission_minor OR l.settlement_id IS DISTINCT FROM s.id)) AS mismatched
         FROM settlements s WHERE s.id = $1`,
      [s.id],
      client
    );
    if (check!.header !== check!.lines || check!.mismatched > 0) throw new HttpError(409, 'integrity_error', 'Settlement totals do not match their ledger entries; refresh the draft');
  }
  const col = { REVIEWED: 'reviewed', APPROVED: 'approved', SETTLED: 'settled', VOID: 'voided', DRAFT: null }[to];
  await q(
    `UPDATE settlements SET status = $2 ${col ? `, ${col}_by = $3, ${col}_at = now()` : ''},
            payment_reference = CASE WHEN $4 <> '' THEN $4 ELSE payment_reference END,
            notes = CASE WHEN $5 <> '' THEN $5 ELSE notes END
      WHERE id = $1`,
    [s.id, to, actor.user?.id ?? null, extra.payment_reference?.trim() ?? '', extra.notes?.trim() ?? ''],
    client
  );
  if (to === 'VOID') {
    await q(`UPDATE commission_ledger SET settlement_id = NULL WHERE settlement_id = $1`, [s.id], client);
  }
  if (to === 'SETTLED') {
    await q(`UPDATE commission_ledger SET status = 'SETTLED' WHERE settlement_id = $1`, [s.id], client);
  }
  await audit({ hotelId, user: actor.user, action: 'status', entity: 'settlement', entityId: s.id, summary: `${s.settlement_no}: ${s.status} → ${to}`, before: { status: s.status }, after: { status: to, ...extra }, ip: actor.ip }, client);
  return { status: to };
}

/** Full drill-down: settlement → lines → ledger entry → order → order lines → snapshot/rule → adjustment. */
export async function settlementDetail(hotelId: string, settlementId: string, opts: { showGuest: boolean }) {
  if (!/^[0-9a-f-]{36}$/i.test(settlementId)) throw notFound('Settlement not found');
  const s = await one(
    `SELECT s.*, to_char(s.period_start,'YYYY-MM-DD') AS period_start, to_char(s.period_end,'YYYY-MM-DD') AS period_end,
            h.name_en AS hotel_name, h.slug AS hotel_slug,
            cu.name AS created_by_name, ru.name AS reviewed_by_name, au.name AS approved_by_name, su.name AS settled_by_name
       FROM settlements s JOIN hotels h ON h.id = s.hotel_id
       LEFT JOIN users cu ON cu.id = s.created_by LEFT JOIN users ru ON ru.id = s.reviewed_by
       LEFT JOIN users au ON au.id = s.approved_by LEFT JOIN users su ON su.id = s.settled_by
      WHERE s.hotel_id = $1 AND s.id = $2`,
    [hotelId, settlementId]
  );
  if (!s) throw notFound('Settlement not found');
  const lines = await q(
    `SELECT sl.*, l.entry_no, l.earned_at, l.status AS ledger_status, l.rate_bps,
            r.reference, r.order_type, r.department, r.title_en, r.completed_at, r.created_at AS order_created_at,
            ${opts.showGuest ? 'r.guest_name, r.room,' : "'' AS guest_name, '' AS room,"}
            g.guest_no, fs.formula, fs.basis, fs.rule_level, fs.rule_version, fs.commission_type, fs.fixed_fee_minor, fs.tax_treatment,
            a.adjustment_no, a.adjustment_type, a.reason AS adjustment_reason
       FROM settlement_lines sl
       JOIN commission_ledger l ON l.id = sl.ledger_entry_id
       JOIN requests r ON r.id = sl.request_id
       JOIN financial_snapshots fs ON fs.id = l.snapshot_id
       LEFT JOIN guests g ON g.id = r.guest_id
       LEFT JOIN financial_adjustments a ON a.id = l.adjustment_id
      WHERE sl.settlement_id = $1
      ORDER BY l.earned_at`,
    [settlementId]
  );
  return { settlement: s, lines };
}
