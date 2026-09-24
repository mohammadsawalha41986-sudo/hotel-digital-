import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  adjustmentDeltas,
  calculateCommission,
  namesCompatible,
  normalizePhone,
  resolveRule,
  ruleInputSchema,
  type CalcLine,
  type CalcTerms,
  type RuleCandidate,
} from '../../shared/commerce';

const line = (id: string, gross: number, vat = 0, extra: Partial<CalcLine> = {}): CalcLine => ({
  id, line_no: Number(id), item_code: `ITEM-${id}`, category_code: 'CAT-A', discount_minor: 0, net_minor: gross - vat, vat_minor: vat, gross_minor: gross, ...extra,
});
const terms = (t: Partial<CalcTerms> = {}): CalcTerms => ({
  commission_type: 'PERCENTAGE', rate_bps: 500, fixed_fee_minor: 0, basis: 'GROSS_INCL_VAT', included_codes: [], excluded_codes: [], tax_treatment: 'NOT_APPLICABLE', tax_rate_bps: 0, ...t,
});

describe('commission calculation', () => {
  test('5% of SAR 100 gross = SAR 5; hotel keeps SAR 95', () => {
    const r = calculateCommission([line('1', 10000, 1304)], 10000, terms());
    assert.equal(r.eligible_base_minor, 10000);
    assert.equal(r.commission_minor, 500);
    assert.equal(r.hotel_amount_minor, 9500);
  });

  test('net-excl-VAT basis uses the VAT-free amount', () => {
    const r = calculateCommission([line('1', 11500, 1500)], 11500, terms({ basis: 'NET_EXCL_VAT' }));
    assert.equal(r.eligible_base_minor, 10000);
    assert.equal(r.commission_minor, 500);
  });

  test('subtotal-before-discount adds the discount back', () => {
    const r = calculateCommission([line('1', 9000, 0, { discount_minor: 1000, net_minor: 9000 })], 9000, terms({ basis: 'SUBTOTAL_BEFORE_DISCOUNT' }));
    assert.equal(r.eligible_base_minor, 10000);
  });

  test('fixed fee and percentage + fixed', () => {
    assert.equal(calculateCommission([line('1', 10000)], 10000, terms({ commission_type: 'FIXED', rate_bps: 0, fixed_fee_minor: 300 })).commission_minor, 300);
    assert.equal(calculateCommission([line('1', 10000)], 10000, terms({ commission_type: 'PERCENTAGE_PLUS_FIXED', fixed_fee_minor: 200 })).commission_minor, 700);
  });

  test('tax on top (exclusive) vs included (inclusive)', () => {
    const ex = calculateCommission([line('1', 10000)], 10000, terms({ tax_treatment: 'EXCLUSIVE', tax_rate_bps: 1500 }));
    assert.deepEqual([ex.commission_minor, ex.commission_tax_minor, ex.platform_revenue_minor, ex.hotel_amount_minor], [500, 75, 500, 9425]);
    const inc = calculateCommission([line('1', 10000)], 10000, terms({ tax_treatment: 'INCLUSIVE', tax_rate_bps: 1500 }));
    assert.deepEqual([inc.commission_minor, inc.commission_tax_minor, inc.platform_revenue_minor, inc.hotel_amount_minor], [500, 65, 435, 9500]);
  });

  test('included / excluded codes select eligible lines', () => {
    const lines = [line('1', 6000), line('2', 4000, 0, { category_code: 'CAT-B' })];
    assert.equal(calculateCommission(lines, 10000, terms({ excluded_codes: ['CAT-B'] })).eligible_base_minor, 6000);
    assert.equal(calculateCommission(lines, 10000, terms({ included_codes: ['ITEM-2'] })).eligible_base_minor, 4000);
  });

  test('rounding is half away from zero, per order', () => {
    assert.equal(calculateCommission([line('1', 1010)], 1010, terms()).commission_minor, 51); // 50.5 → 51
  });
});

describe('adjustments', () => {
  const snap = { gross_minor: 10000, eligible_base_minor: 10000, commission_minor: 700, commission_tax_minor: 0, platform_revenue_minor: 700, hotel_amount_minor: 9300, fixed_fee_minor: 0, tax_treatment: 'NOT_APPLICABLE' as const, tax_rate_bps: 0 };
  const remaining = { gross_minor: 10000, base_minor: 10000, commission_minor: 700, tax_minor: 0, revenue_minor: 700, hotel_minor: 9300 };
  test('partial refund reverses commission pro rata at the original rate', () => {
    const d = adjustmentDeltas('PARTIAL_REFUND', 4000, snap, remaining);
    assert.deepEqual([d.gross_delta_minor, d.base_delta_minor, d.commission_delta_minor, d.hotel_amount_delta_minor], [-4000, -4000, -280, -3720]);
  });
  test('full refund reverses what remains', () => {
    const d = adjustmentDeltas('FULL_REFUND', 0, snap, { ...remaining, gross_minor: 6000, base_minor: 6000, commission_minor: 420, revenue_minor: 420, hotel_minor: 5580 });
    assert.deepEqual([d.gross_delta_minor, d.commission_delta_minor], [-6000, -420]);
  });
  test('hotel credit lowers the platform commission; platform debit too; corrections are signed', () => {
    assert.equal(adjustmentDeltas('HOTEL_CREDIT', 100, snap, remaining).commission_delta_minor, -100);
    assert.equal(adjustmentDeltas('HOTEL_DEBIT', 100, snap, remaining).commission_delta_minor, 100);
    assert.equal(adjustmentDeltas('COMMISSION_CORRECTION', -50, snap, remaining).commission_delta_minor, -50);
  });
});

describe('rule precedence and effective dates', () => {
  const ctx = { order_type: 'SPA', department: 'SPA', outlet_code: null, category_code: 'SPACAT-MASSAGE', service_code: 'SPA-MASSAGE-60' };
  const r = (id: string, level: RuleCandidate['scope_level'], value = '', extra: Partial<RuleCandidate> = {}): RuleCandidate => ({
    id, hotel_id: level === 'PLATFORM' ? null : 'h', scope_level: level, scope_value: value, effective_from: '2026-01-01T00:00:00Z', effective_to: null, is_active: true, version: 1, ...extra,
  });
  const at = new Date('2026-10-15T12:00:00Z');
  test('most specific level wins: service > category > department > order type > hotel > platform', () => {
    const all = [r('p', 'PLATFORM'), r('h', 'HOTEL'), r('t', 'ORDER_TYPE', 'SPA'), r('d', 'DEPARTMENT', 'SPA'), r('c', 'CATEGORY', 'SPACAT-MASSAGE'), r('s', 'SERVICE', 'SPA-MASSAGE-60')];
    assert.equal(resolveRule(all, ctx, at)!.id, 's');
    assert.equal(resolveRule(all.filter((x) => x.id !== 's'), ctx, at)!.id, 'c');
    assert.equal(resolveRule(all.filter((x) => !['s', 'c'].includes(x.id)), ctx, at)!.id, 'd');
    assert.equal(resolveRule([r('p', 'PLATFORM'), r('h', 'HOTEL')], ctx, at)!.id, 'h');
    assert.equal(resolveRule([r('p', 'PLATFORM')], ctx, at)!.id, 'p');
  });
  test('October order uses the Oct–Dec version; February order the 2027 version', () => {
    const v1 = r('v1', 'HOTEL', '', { effective_from: '2026-10-01T00:00:00+03:00', effective_to: '2027-01-01T00:00:00+03:00' });
    const v2 = r('v2', 'HOTEL', '', { effective_from: '2027-01-01T00:00:00+03:00', version: 2 });
    assert.equal(resolveRule([v1, v2], ctx, new Date('2026-10-20T10:00:00+03:00'))!.id, 'v1');
    assert.equal(resolveRule([v1, v2], ctx, new Date('2027-02-10T10:00:00+03:00'))!.id, 'v2');
    assert.equal(resolveRule([v1, v2], ctx, new Date('2026-09-20T10:00:00+03:00')), null, 'no rule before the agreement → unavailable, not 0%');
  });
  test('inactive rules and non-matching scopes are ignored', () => {
    assert.equal(resolveRule([r('x', 'SERVICE', 'OTHER'), r('y', 'HOTEL', '', { is_active: false })], ctx, at), null);
  });
  test('rule input must state basis and tax treatment explicitly', () => {
    const ok = ruleInputSchema.safeParse({ scope_level: 'HOTEL', commission_type: 'PERCENTAGE', rate_bps: 500, basis: 'GROSS_INCL_VAT', tax_treatment: 'NOT_APPLICABLE', effective_from: '2026-10-01T00:00:00Z' });
    assert.ok(ok.success);
    assert.ok(!ruleInputSchema.safeParse({ scope_level: 'HOTEL', commission_type: 'PERCENTAGE', rate_bps: 500, effective_from: '2026-10-01T00:00:00Z' }).success);
    assert.ok(!ruleInputSchema.safeParse({ scope_level: 'SERVICE', commission_type: 'PERCENTAGE', rate_bps: 500, basis: 'GROSS_INCL_VAT', tax_treatment: 'NOT_APPLICABLE', effective_from: '2026-10-01T00:00:00Z' }).success, 'service scope needs a code');
    assert.ok(!ruleInputSchema.safeParse({ scope_level: 'HOTEL', commission_type: 'PERCENTAGE', rate_bps: 500, basis: 'GROSS_INCL_VAT', tax_treatment: 'EXCLUSIVE', effective_from: '2026-10-01T00:00:00Z' }).success, 'tax rate required');
  });
});

describe('guest identity helpers', () => {
  test('phone numbers normalise to E.164', () => {
    assert.equal(normalizePhone('0551234567', '966').e164, '+966551234567');
    assert.equal(normalizePhone('+966 55 123 4567', '966').e164, '+966551234567');
    assert.equal(normalizePhone('00966551234567', '966').e164, '+966551234567');
    assert.equal(normalizePhone('966551234567', '966').e164, '+966551234567');
    assert.equal(normalizePhone('+44 7700 900123', '966').countryCode, '44');
    assert.equal(normalizePhone('+1 415 555 0100', '966').countryCode, '1');
    assert.equal(normalizePhone('123', '966').e164, '');
  });
  test('names are compatible only when one contains the other', () => {
    assert.ok(namesCompatible('Sara', 'Sara Ali'));
    assert.ok(namesCompatible('سارة علي', 'ساره'));
    assert.ok(!namesCompatible('Sara Ali', 'Sarah Ali'), 'similar is not the same');
    assert.ok(!namesCompatible('Ahmed', 'Mohammed'));
  });
});
