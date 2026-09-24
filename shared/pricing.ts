import type { VatMode } from './fields';

/**
 * Money is computed in halalas (integer minor units) to avoid float drift and
 * rounded once per line. The server is authoritative; the client uses the same
 * functions only to show an estimate.
 */
export interface VatSettings {
  vat_rate: number; // percent, e.g. 15
  prices_include_vat: boolean;
}

export interface LineAmounts {
  net: number; // excl. VAT, minor units
  vat: number;
  gross: number;
}

export const toMinor = (v: number) => Math.round(v * 100);
export const fromMinor = (v: number) => Math.round(v) / 100;

export function resolveVatMode(mode: VatMode | undefined, settings: VatSettings): 'inclusive' | 'exclusive' | 'exempt' {
  if (!mode || mode === 'inherit') return settings.prices_include_vat ? 'inclusive' : 'exclusive';
  return mode;
}

/** Amounts for `quantity` units at `unitPrice` (major units, as entered by staff). */
export function lineAmounts(unitPrice: number, quantity: number, mode: VatMode | undefined, settings: VatSettings): LineAmounts {
  const listed = toMinor(unitPrice) * quantity;
  const rate = Math.max(0, settings.vat_rate) / 100;
  const effective = resolveVatMode(mode, settings);
  if (effective === 'exempt' || rate === 0) return { net: listed, vat: 0, gross: listed };
  if (effective === 'inclusive') {
    const net = Math.round(listed / (1 + rate));
    return { net, vat: listed - net, gross: listed };
  }
  const vat = Math.round(listed * rate);
  return { net: listed, vat, gross: listed + vat };
}

export interface Totals {
  subtotal: number; // major units, excl. VAT
  vat: number;
  total: number;
}

export function sumLines(lines: LineAmounts[]): Totals {
  const net = lines.reduce((s, l) => s + l.net, 0);
  const vat = lines.reduce((s, l) => s + l.vat, 0);
  return { subtotal: fromMinor(net), vat: fromMinor(vat), total: fromMinor(net + vat) };
}

export function formatMoney(amount: number, currency: string, lang: 'en' | 'ar'): string {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-SA', {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
