import { z } from 'zod';

/**
 * Commerce vocabulary and the canonical commission arithmetic.
 *
 * Money is integer minor units (halalas); rates are basis points (500 = 5%).
 * Everything here is pure so the server, the admin UI and the unit tests use
 * exactly the same formulas.
 */

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const ORDER_SOURCES = ['QR', 'GUEST_PORTAL', 'WHATSAPP', 'ADMIN', 'MANUAL'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const ORDER_TYPES = ['FNB', 'ROOM_SERVICE', 'LAUNDRY', 'SPA', 'GUEST_SERVICE', 'OFFER_PACKAGE', 'OTHER'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_SOURCE_LABELS: Record<OrderSource, { en: string; ar: string }> = {
  QR: { en: 'QR code', ar: 'رمز QR' },
  GUEST_PORTAL: { en: 'Guest portal', ar: 'بوابة النزيل' },
  WHATSAPP: { en: 'WhatsApp', ar: 'واتساب' },
  ADMIN: { en: 'Admin', ar: 'الإدارة' },
  MANUAL: { en: 'Manual entry', ar: 'إدخال يدوي' },
};

export const ORDER_TYPE_LABELS: Record<OrderType, { en: string; ar: string }> = {
  FNB: { en: 'Food & beverage', ar: 'الأغذية والمشروبات' },
  ROOM_SERVICE: { en: 'Room service', ar: 'خدمة الغرف' },
  LAUNDRY: { en: 'Laundry', ar: 'المغسلة' },
  SPA: { en: 'Spa & wellness', ar: 'السبا والعافية' },
  GUEST_SERVICE: { en: 'Guest service', ar: 'خدمة النزلاء' },
  OFFER_PACKAGE: { en: 'Offer / package', ar: 'عرض / باقة' },
  OTHER: { en: 'Other', ar: 'أخرى' },
};

export const FINANCIAL_STATUSES = [
  'NOT_APPLICABLE', // no billable value (free service, feedback)
  'AWAITING_ELIGIBILITY', // billable, not yet completed
  'ELIGIBLE', // snapshot locked, ledger entry posted
  'NOT_ELIGIBLE', // cancelled / declined under a no-commission policy
  'RULE_UNAVAILABLE', // COMMISSION_RULE_UNAVAILABLE
  'HISTORICAL_RULE_UNAVAILABLE', // HISTORICAL_COMMISSION_RULE_UNAVAILABLE
] as const;
export type FinancialStatus = (typeof FINANCIAL_STATUSES)[number];

// ---------------------------------------------------------------------------
// Commission rules
// ---------------------------------------------------------------------------
/** Most specific first. The first level with an effective rule wins. */
export const RULE_LEVELS = ['SERVICE', 'CATEGORY', 'OUTLET', 'DEPARTMENT', 'ORDER_TYPE', 'HOTEL', 'PLATFORM'] as const;
export type RuleLevel = (typeof RULE_LEVELS)[number];

export const RULE_LEVEL_LABELS: Record<RuleLevel, string> = {
  SERVICE: 'Specific service / item',
  CATEGORY: 'Service category',
  OUTLET: 'Outlet',
  DEPARTMENT: 'Department',
  ORDER_TYPE: 'Order type',
  HOTEL: 'Hotel (all orders)',
  PLATFORM: 'Platform default',
};

export const COMMISSION_TYPES = ['PERCENTAGE', 'FIXED', 'PERCENTAGE_PLUS_FIXED'] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const COMMISSION_BASES = ['GROSS_INCL_VAT', 'NET_EXCL_VAT', 'SUBTOTAL_BEFORE_DISCOUNT'] as const;
export type CommissionBasis = (typeof COMMISSION_BASES)[number];

export const COMMISSION_BASIS_LABELS: Record<CommissionBasis, string> = {
  GROSS_INCL_VAT: 'Gross incl. VAT, after discounts',
  NET_EXCL_VAT: 'Net excl. VAT, after discounts',
  SUBTOTAL_BEFORE_DISCOUNT: 'Subtotal excl. VAT, before discounts',
};

export const ELIGIBLE_STATUSES = ['COMPLETED', 'ACCEPTED'] as const;
export const CANCELLATION_POLICIES = ['NO_COMMISSION', 'CHARGE_IF_ACCEPTED'] as const;
export const TAX_TREATMENTS = ['NOT_APPLICABLE', 'EXCLUSIVE', 'INCLUSIVE'] as const;
export type TaxTreatment = (typeof TAX_TREATMENTS)[number];

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  NOT_APPLICABLE: 'No tax on commission',
  EXCLUSIVE: 'Tax added on top of the commission',
  INCLUSIVE: 'Commission already includes tax',
};

export const HOTEL_FINANCE_ACCESS = ['NONE', 'SETTLEMENTS', 'FULL'] as const;
export type HotelFinanceAccess = (typeof HOTEL_FINANCE_ACCESS)[number];

export const SETTLEMENT_PERIODS = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'] as const;
export const SETTLEMENT_STATUSES = ['DRAFT', 'REVIEWED', 'APPROVED', 'SETTLED', 'VOID'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];
export const SETTLEMENT_TRANSITIONS: Record<SettlementStatus, readonly SettlementStatus[]> = {
  DRAFT: ['REVIEWED', 'VOID'],
  REVIEWED: ['APPROVED', 'DRAFT', 'VOID'],
  APPROVED: ['SETTLED'],
  SETTLED: [],
  VOID: [],
};

export const LEDGER_STATUSES = ['PENDING', 'EARNED', 'ADJUSTED', 'SETTLED', 'DISPUTED', 'VOIDED'] as const;

export const ADJUSTMENT_TYPES = [
  'FULL_REFUND',
  'PARTIAL_REFUND',
  'COMMISSION_CORRECTION',
  'HOTEL_CREDIT',
  'HOTEL_DEBIT',
  'PLATFORM_CREDIT',
  'PLATFORM_DEBIT',
] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number] | 'CANCELLATION_REVERSAL';

export const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  FULL_REFUND: 'Full refund',
  PARTIAL_REFUND: 'Partial refund',
  COMMISSION_CORRECTION: 'Commission correction',
  HOTEL_CREDIT: 'Hotel credit',
  HOTEL_DEBIT: 'Hotel debit',
  PLATFORM_CREDIT: 'Platform credit',
  PLATFORM_DEBIT: 'Platform debit',
  CANCELLATION_REVERSAL: 'Cancellation reversal',
};

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------
const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{0,63}$/);
const isoDateTime = z.string().datetime({ offset: true });

export const ruleInputSchema = z
  .object({
    scope_level: z.enum(RULE_LEVELS),
    scope_value: z.string().trim().max(80).default(''),
    commission_type: z.enum(COMMISSION_TYPES),
    rate_bps: z.number().int().min(0).max(10000).default(0),
    fixed_fee_minor: z.number().int().min(0).max(100_000_00).default(0),
    basis: z.enum(COMMISSION_BASES),
    eligible_status: z.enum(ELIGIBLE_STATUSES).default('COMPLETED'),
    cancellation_policy: z.enum(CANCELLATION_POLICIES).default('NO_COMMISSION'),
    included_codes: z.array(code).max(200).default([]),
    excluded_codes: z.array(code).max(200).default([]),
    tax_treatment: z.enum(TAX_TREATMENTS),
    tax_rate_bps: z.number().int().min(0).max(10000).default(0),
    effective_from: isoDateTime,
    effective_to: isoDateTime.nullable().default(null),
    notes: z.string().trim().max(1000).default(''),
  })
  .superRefine((r, ctx) => {
    if (r.commission_type !== 'FIXED' && r.rate_bps <= 0) ctx.addIssue({ code: 'custom', path: ['rate_bps'], message: 'Enter the commission rate' });
    if (r.commission_type !== 'PERCENTAGE' && r.fixed_fee_minor <= 0) ctx.addIssue({ code: 'custom', path: ['fixed_fee_minor'], message: 'Enter the fixed fee' });
    if (r.commission_type === 'PERCENTAGE' && r.fixed_fee_minor > 0) ctx.addIssue({ code: 'custom', path: ['fixed_fee_minor'], message: 'A percentage rule has no fixed fee' });
    if (r.commission_type === 'FIXED' && r.rate_bps > 0) ctx.addIssue({ code: 'custom', path: ['rate_bps'], message: 'A fixed-fee rule has no rate' });
    if (r.tax_treatment !== 'NOT_APPLICABLE' && r.tax_rate_bps <= 0) ctx.addIssue({ code: 'custom', path: ['tax_rate_bps'], message: 'Enter the tax rate for this treatment' });
    if (r.tax_treatment === 'NOT_APPLICABLE' && r.tax_rate_bps > 0) ctx.addIssue({ code: 'custom', path: ['tax_rate_bps'], message: 'No tax rate when tax is not applicable' });
    const needsValue = !['HOTEL', 'PLATFORM'].includes(r.scope_level);
    if (needsValue && !r.scope_value) ctx.addIssue({ code: 'custom', path: ['scope_value'], message: 'Choose what this rule applies to' });
    if (!needsValue && r.scope_value) ctx.addIssue({ code: 'custom', path: ['scope_value'], message: 'Hotel and platform rules apply to every order' });
    if (r.effective_to && Date.parse(r.effective_to) <= Date.parse(r.effective_from)) ctx.addIssue({ code: 'custom', path: ['effective_to'], message: 'Must be after the start' });
    const overlap = r.included_codes.filter((c) => r.excluded_codes.includes(c));
    if (overlap.length) ctx.addIssue({ code: 'custom', path: ['excluded_codes'], message: `Both included and excluded: ${overlap.join(', ')}` });
  });
export type RuleInput = z.infer<typeof ruleInputSchema>;

export const adjustmentInputSchema = z.object({
  adjustment_type: z.enum(ADJUSTMENT_TYPES),
  /** Refunds: value refunded to the guest (gross). Others: commission amount. Minor units, positive. */
  amount_minor: z.number().int().min(0).max(1_000_000_00).default(0),
  reason: z.string().trim().min(3, 'A reason is required').max(1000),
  reference: z.string().trim().max(120).default(''),
});
export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;

// ---------------------------------------------------------------------------
// Commission arithmetic
// ---------------------------------------------------------------------------
/** Round half away from zero to a whole minor unit. */
export const roundMinor = (v: number) => Math.sign(v) * Math.round(Math.abs(v));
export const pctOf = (amount: number, bps: number) => roundMinor((amount * bps) / 10000);

export interface CalcLine {
  id: string;
  line_no: number;
  item_code: string;
  category_code: string;
  discount_minor: number;
  net_minor: number; // after discount, excl. VAT
  vat_minor: number;
  gross_minor: number; // after discount, incl. VAT
}

export interface CalcTerms {
  commission_type: CommissionType;
  rate_bps: number;
  fixed_fee_minor: number;
  basis: CommissionBasis;
  included_codes: string[];
  excluded_codes: string[];
  tax_treatment: TaxTreatment;
  tax_rate_bps: number;
}

export interface CommissionResult {
  eligible_lines: { line_id: string; line_no: number; code: string; base_minor: number }[];
  eligible_base_minor: number;
  commission_minor: number; // as charged (INCLUSIVE: tax included)
  commission_tax_minor: number;
  platform_revenue_minor: number; // commission excl. tax
  hotel_amount_minor: number; // gross order value the hotel keeps
  formula: string;
}

const fmt = (m: number) => (m / 100).toFixed(2);

/** A line is eligible when it matches the inclusion list (if any) and not the exclusion list, by item or category code. */
export function lineEligible(line: Pick<CalcLine, 'item_code' | 'category_code'>, terms: Pick<CalcTerms, 'included_codes' | 'excluded_codes'>) {
  const codes = [line.item_code, line.category_code].filter(Boolean);
  if (terms.excluded_codes.some((c) => codes.includes(c))) return false;
  return !terms.included_codes.length || terms.included_codes.some((c) => codes.includes(c));
}

export function lineBase(line: CalcLine, basis: CommissionBasis): number {
  switch (basis) {
    case 'GROSS_INCL_VAT':
      return line.gross_minor;
    case 'NET_EXCL_VAT':
      return line.net_minor;
    case 'SUBTOTAL_BEFORE_DISCOUNT':
      return line.net_minor + line.discount_minor;
  }
}

/**
 * The single, canonical commission calculation.
 *   base        = Σ basis amount of eligible lines
 *   commission  = round(base × rate) + fixed fee      (per commission type)
 *   tax         = EXCLUSIVE: round(commission × tax rate), charged on top
 *                 INCLUSIVE: commission − round(commission ÷ (1 + tax rate))
 *   platform revenue = commission excluding tax
 *   hotel amount     = order gross − commission − exclusive tax
 */
export function calculateCommission(lines: CalcLine[], orderGrossMinor: number, t: CalcTerms): CommissionResult {
  const eligible = lines.filter((l) => lineEligible(l, t)).map((l) => ({ line_id: l.id, line_no: l.line_no, code: l.item_code, base_minor: lineBase(l, t.basis) }));
  const base = eligible.reduce((s, l) => s + l.base_minor, 0);
  const pct = t.commission_type === 'FIXED' ? 0 : pctOf(base, t.rate_bps);
  const fixed = t.commission_type === 'PERCENTAGE' || base <= 0 ? 0 : t.fixed_fee_minor;
  const commission = pct + fixed;
  let tax = 0;
  let revenue = commission;
  if (t.tax_treatment === 'EXCLUSIVE') tax = pctOf(commission, t.tax_rate_bps);
  if (t.tax_treatment === 'INCLUSIVE') {
    revenue = roundMinor((commission * 10000) / (10000 + t.tax_rate_bps));
    tax = commission - revenue;
  }
  const hotel = orderGrossMinor - commission - (t.tax_treatment === 'EXCLUSIVE' ? tax : 0);
  const parts = [
    `Base (${t.basis}) = ${fmt(base)} from ${eligible.length}/${lines.length} line(s)`,
    t.commission_type !== 'FIXED' ? `${(t.rate_bps / 100).toFixed(2)}% × ${fmt(base)} = ${fmt(pct)}` : '',
    fixed ? `fixed fee ${fmt(fixed)}` : '',
    `commission ${fmt(commission)}`,
    t.tax_treatment === 'EXCLUSIVE' ? `tax ${(t.tax_rate_bps / 100).toFixed(2)}% on top = ${fmt(tax)}` : '',
    t.tax_treatment === 'INCLUSIVE' ? `includes tax ${fmt(tax)} (${(t.tax_rate_bps / 100).toFixed(2)}%)` : '',
    `hotel amount ${fmt(orderGrossMinor)} − ${fmt(commission + (t.tax_treatment === 'EXCLUSIVE' ? tax : 0))} = ${fmt(hotel)}`,
  ].filter(Boolean);
  return {
    eligible_lines: eligible,
    eligible_base_minor: base,
    commission_minor: commission,
    commission_tax_minor: tax,
    platform_revenue_minor: revenue,
    hotel_amount_minor: hotel,
    formula: parts.join('; '),
  };
}

export interface SnapshotAmounts {
  gross_minor: number;
  eligible_base_minor: number;
  commission_minor: number;
  commission_tax_minor: number;
  platform_revenue_minor: number;
  hotel_amount_minor: number;
  fixed_fee_minor: number;
  tax_treatment: TaxTreatment;
  tax_rate_bps: number;
}

export interface AdjustmentDeltas {
  gross_delta_minor: number;
  base_delta_minor: number;
  commission_delta_minor: number;
  tax_delta_minor: number;
  platform_revenue_delta_minor: number;
  hotel_amount_delta_minor: number;
  calculation: string;
}

function taxSplit(commissionDelta: number, s: Pick<SnapshotAmounts, 'tax_treatment' | 'tax_rate_bps'>) {
  if (s.tax_treatment === 'EXCLUSIVE') {
    const tax = pctOf(commissionDelta, s.tax_rate_bps);
    return { tax, revenue: commissionDelta, hotelCost: commissionDelta + tax };
  }
  if (s.tax_treatment === 'INCLUSIVE') {
    const revenue = roundMinor((commissionDelta * 10000) / (10000 + s.tax_rate_bps));
    return { tax: commissionDelta - revenue, revenue, hotelCost: commissionDelta };
  }
  return { tax: 0, revenue: commissionDelta, hotelCost: commissionDelta };
}

/**
 * Adjustment deltas, always derived from the ORIGINAL snapshot (never from
 * today's prices or rules).
 *  - Refunds reduce the order value; commission is reversed pro rata on the
 *    percentage part (fixed fee only on a full refund).
 *  - Commission corrections / credits change the commission directly.
 *  - Hotel credit/debit move money between hotel and platform without
 *    changing the order value.
 * `refundedSoFar` is the gross already refunded; `remaining` is what is left
 * of each original amount after earlier adjustments (for a full refund).
 */
export function adjustmentDeltas(
  type: AdjustmentType,
  amount: number,
  s: SnapshotAmounts,
  remaining: { gross_minor: number; base_minor: number; commission_minor: number; tax_minor: number; revenue_minor: number; hotel_minor: number }
): AdjustmentDeltas {
  switch (type) {
    case 'FULL_REFUND':
    case 'CANCELLATION_REVERSAL':
      return {
        gross_delta_minor: -remaining.gross_minor,
        base_delta_minor: -remaining.base_minor,
        commission_delta_minor: -remaining.commission_minor,
        tax_delta_minor: -remaining.tax_minor,
        platform_revenue_delta_minor: -remaining.revenue_minor,
        hotel_amount_delta_minor: -remaining.hotel_minor,
        calculation: `Reverses the remaining order value ${fmt(remaining.gross_minor)} and commission ${fmt(remaining.commission_minor)}`,
      };
    case 'PARTIAL_REFUND': {
      const share = s.gross_minor > 0 ? amount / s.gross_minor : 0;
      const baseDelta = -roundMinor(s.eligible_base_minor * share);
      const pctPart = s.commission_minor - (s.eligible_base_minor > 0 ? s.fixed_fee_minor : 0);
      const commissionDelta = -roundMinor(pctPart * share);
      const { tax, revenue, hotelCost } = taxSplit(commissionDelta, s);
      return {
        gross_delta_minor: -amount,
        base_delta_minor: baseDelta,
        commission_delta_minor: commissionDelta,
        tax_delta_minor: tax,
        platform_revenue_delta_minor: revenue,
        hotel_amount_delta_minor: -amount - hotelCost,
        calculation: `Refund ${fmt(amount)} of ${fmt(s.gross_minor)} (${(share * 100).toFixed(2)}%): base ${fmt(baseDelta)}, commission ${fmt(pctPart)} × ${(share * 100).toFixed(2)}% = ${fmt(commissionDelta)}`,
      };
    }
    case 'COMMISSION_CORRECTION':
    case 'PLATFORM_CREDIT':
    case 'PLATFORM_DEBIT':
    case 'HOTEL_CREDIT':
    case 'HOTEL_DEBIT': {
      // Sign convention: + increases what the platform earns.
      const sign = type === 'PLATFORM_DEBIT' || type === 'HOTEL_CREDIT' ? -1 : 1;
      const commissionDelta = type === 'COMMISSION_CORRECTION' ? amount : sign * amount;
      const { tax, revenue, hotelCost } = taxSplit(commissionDelta, s);
      return {
        gross_delta_minor: 0,
        base_delta_minor: 0,
        commission_delta_minor: commissionDelta,
        tax_delta_minor: tax,
        platform_revenue_delta_minor: revenue,
        hotel_amount_delta_minor: -hotelCost,
        calculation: `${ADJUSTMENT_LABELS[type]}: commission ${commissionDelta >= 0 ? '+' : ''}${fmt(commissionDelta)}${tax ? `, tax ${fmt(tax)}` : ''}`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Rule resolution
// ---------------------------------------------------------------------------
export interface OrderContext {
  order_type: string;
  department: string;
  outlet_code: string | null;
  category_code: string | null; // shared by every line, else null
  service_code: string | null; // shared by every line, else null
}

export interface RuleCandidate {
  id: string;
  hotel_id: string | null;
  scope_level: RuleLevel;
  scope_value: string;
  effective_from: string | Date;
  effective_to: string | Date | null;
  is_active: boolean;
  version: number;
}

export function ruleMatchesContext(r: Pick<RuleCandidate, 'scope_level' | 'scope_value'>, ctx: OrderContext): boolean {
  switch (r.scope_level) {
    case 'SERVICE':
      return !!ctx.service_code && r.scope_value === ctx.service_code;
    case 'CATEGORY':
      return !!ctx.category_code && r.scope_value === ctx.category_code;
    case 'OUTLET':
      return !!ctx.outlet_code && r.scope_value === ctx.outlet_code;
    case 'DEPARTMENT':
      return r.scope_value === ctx.department;
    case 'ORDER_TYPE':
      return r.scope_value === ctx.order_type;
    case 'HOTEL':
    case 'PLATFORM':
      return true;
  }
}

const ts = (v: string | Date) => (v instanceof Date ? v.getTime() : Date.parse(v));

/**
 * Deterministic precedence: the most specific level with a rule effective at
 * `at` wins (SERVICE → CATEGORY → OUTLET → DEPARTMENT → ORDER_TYPE → HOTEL →
 * PLATFORM). Within a level the latest effective_from, then the highest
 * version, wins. Hotel rules beat platform rules at the same level.
 */
export function resolveRule<R extends RuleCandidate>(rules: R[], ctx: OrderContext, at: Date): R | null {
  const t = at.getTime();
  const live = rules.filter((r) => r.is_active && ts(r.effective_from) <= t && (r.effective_to == null || ts(r.effective_to) > t) && ruleMatchesContext(r, ctx));
  for (const level of RULE_LEVELS) {
    const atLevel = live.filter((r) => r.scope_level === level);
    if (!atLevel.length) continue;
    atLevel.sort((a, b) => Number(!!b.hotel_id) - Number(!!a.hotel_id) || ts(b.effective_from) - ts(a.effective_from) || b.version - a.version);
    return atLevel[0];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------
/**
 * Normalises a phone number to E.164 (+CCC…). Local numbers get the hotel's
 * dialling code (Saudi 05xxxxxxxx → +9665xxxxxxxx). Returns '' when the input
 * is empty or cannot be a valid number.
 */
export function normalizePhone(raw: string, defaultCountryCode: string): { e164: string; countryCode: string } {
  let d = (raw ?? '').trim();
  if (!d) return { e164: '', countryCode: '' };
  const plus = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!plus && d.startsWith('00')) d = d.slice(2);
  else if (!plus) {
    if (d.startsWith(defaultCountryCode) && d.length > defaultCountryCode.length + 7) {
      // Already carries the country code without "+".
    } else {
      d = defaultCountryCode + d.replace(/^0+/, '');
    }
  }
  if (d.length < 8 || d.length > 15) return { e164: '', countryCode: '' };
  return { e164: `+${d}`, countryCode: dialCode(d, defaultCountryCode) };
}

// ITU zone prefixes: 1 and 7 are one digit; these are the two-digit codes; the rest are three digits.
const TWO_DIGIT_CODES = new Set([
  '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55',
  '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98',
]);

function dialCode(digits: string, preferred: string): string {
  if (preferred && digits.startsWith(preferred)) return preferred;
  if (digits[0] === '1' || digits[0] === '7') return digits[0];
  const two = digits.slice(0, 2);
  return TWO_DIGIT_CODES.has(two) ? two : digits.slice(0, 3);
}

/** Lowercase, diacritics/tatweel stripped, collapsed spaces — for duplicate detection only. */
export function nameKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ًͯ-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Two names can belong to the same person when their normalised forms are
 * equal or one's tokens are all contained in the other's ("Sara" vs
 * "Sara Ali"). Used only as a safety check on top of a phone match, never as
 * a reason to link on its own.
 */
export function namesCompatible(a: string, b: string): boolean {
  const ka = nameKey(a).split(' ').filter(Boolean);
  const kb = nameKey(b).split(' ').filter(Boolean);
  if (!ka.length || !kb.length) return false;
  const [short, long] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  return short.every((t) => long.includes(t));
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  return phone.length <= 6 ? '•••' : `${phone.slice(0, 4)}•••${phone.slice(-3)}`;
}

export const fromMinorUnits = (m: number) => Math.round(m) / 100;
export const toMinorUnits = (v: number | string | null | undefined) => Math.round(Number(v ?? 0) * 100);
