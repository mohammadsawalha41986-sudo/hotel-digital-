import { Download } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ORDER_SOURCE_LABELS, ORDER_TYPE_LABELS, ORDER_SOURCES, ORDER_TYPES, type OrderSource, type OrderType } from '@shared/commerce';
import { DEPARTMENT_LABELS, REQUEST_STATUS_LABELS, REQUEST_STATUSES, type DepartmentCode, type RequestStatus } from '@shared/domain';
import { Badge, Select, TextInput, cx } from '../../components/ui';
import { adminLang, tr, L, locale } from '../i18n';

/** Amounts keep Latin digits in both languages (finance readability). */
const moneyLocale = () => (adminLang() === 'ar' ? 'ar-SA-u-nu-latn' : 'en-SA');

/** Minor units (halalas) → "SAR 1,234.50". */
export function money(minor: number | null | undefined, currency = 'SAR') {
  if (minor == null) return '—';
  return new Intl.NumberFormat(moneyLocale(), { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100);
}
/** Major units (order totals) → currency. */
export function major(v: number | null | undefined, currency = 'SAR') {
  if (v == null) return '—';
  return new Intl.NumberFormat(moneyLocale(), { style: 'currency', currency, minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(v);
}
export const pct = (bps: number | null | undefined) => (bps == null ? '—' : `${(bps / 100).toFixed(2)}%`);
export const dateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const dateOnly = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(locale(), { dateStyle: 'medium' }) : '—');
export const deptLabel = (d: string) => L(DEPARTMENT_LABELS[d as DepartmentCode]) || d;
export const typeLabel = (t: string) => L(ORDER_TYPE_LABELS[t as OrderType]) || t;
export const sourceLabel = (s: string) => L(ORDER_SOURCE_LABELS[s as OrderSource]) || s;

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'info';
const ORDER_TONE: Record<string, Tone> = { NEW: 'info', ACCEPTED: 'brand', IN_PROGRESS: 'warning', READY: 'brand', COMPLETED: 'success', REJECTED: 'danger', CANCELLED: 'neutral' };
export function OrderStatus({ status }: { status: string }) {
  return <Badge tone={ORDER_TONE[status] ?? 'neutral'}>{L(REQUEST_STATUS_LABELS[status as RequestStatus]) || status}</Badge>;
}

const FIN: Record<string, [string, Tone]> = {
  NOT_APPLICABLE: ['No billable value', 'neutral'],
  AWAITING_ELIGIBILITY: ['Awaiting completion', 'info'],
  ELIGIBLE: ['Commission eligible', 'success'],
  NOT_ELIGIBLE: ['Not eligible', 'neutral'],
  RULE_UNAVAILABLE: ['Commission rule missing', 'danger'],
  HISTORICAL_RULE_UNAVAILABLE: ['No rule at order time', 'danger'],
};
export function FinancialStatus({ status }: { status: string }) {
  const [label, tone] = FIN[status] ?? [status, 'neutral'];
  return <Badge tone={tone}>{label}</Badge>;
}

const SETTLEMENT_TONE: Record<string, Tone> = { DRAFT: 'info', REVIEWED: 'warning', APPROVED: 'brand', SETTLED: 'success', VOID: 'neutral' };
export function SettlementStatus({ status }: { status: string }) {
  return <Badge tone={SETTLEMENT_TONE[status] ?? 'neutral'}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
const LEDGER_TONE: Record<string, Tone> = { PENDING: 'info', EARNED: 'success', ADJUSTED: 'warning', SETTLED: 'brand', DISPUTED: 'danger', VOIDED: 'neutral' };
export function LedgerStatus({ status }: { status: string }) {
  return <Badge tone={LEDGER_TONE[status] ?? 'neutral'}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'danger' | 'success' }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={cx('mt-1 text-xl font-semibold tracking-tight tabular-nums', tone === 'danger' && 'text-red-700', tone === 'success' && 'text-emerald-700')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

/** CSV / XLSX download links for an export endpoint (GET with the session cookie). */
export function ExportLinks({ href, label = 'Export' }: { href: string; label?: string }) {
  const sep = href.includes('?') ? '&' : '?';
  const cls = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50';
  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      <a className={cls} href={`/api${href}${sep}format=xlsx`} download>
        <Download className="h-4 w-4" aria-hidden="true" />{' '}{tr('Excel')}</a>
      <a className={cls} href={`/api${href}${sep}format=csv`} download>
        <Download className="h-4 w-4" aria-hidden="true" />{' '}{tr('CSV')}</a>
    </div>
  );
}

export interface OrderFilters {
  search: string;
  status: string;
  department: string;
  order_type: string;
  source: string;
  from: string;
  to: string;
  settlement: string;
  financial_status: string;
}
export const emptyFilters: OrderFilters = { search: '', status: '', department: '', order_type: '', source: '', from: '', to: '', settlement: '', financial_status: '' };

export function filterQuery(f: Partial<OrderFilters> & Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return p.toString();
}

export function OrderFilterBar({ value, onChange, departments, showFinance, extra }: { value: OrderFilters; onChange: (v: OrderFilters) => void; departments: string[]; showFinance?: boolean; extra?: ReactNode }) {
  const set = (k: keyof OrderFilters) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const cls = 'h-10 rounded-lg text-sm';
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <div className="sm:col-span-2">
        <label htmlFor="of-search" className="sr-only">{tr('Search')}</label>
        <TextInput id="of-search" placeholder={tr('Reference, guest, phone, room, guest ID…')} value={value.search} onChange={set('search')} className={cls} />
      </div>
      {extra}
      <div>
        <label htmlFor="of-status" className="sr-only">{tr('Status')}</label>
        <Select id="of-status" value={value.status} onChange={set('status')} className={cls}>
          <option value="">{tr('All statuses')}</option>
          <option value="OPEN">{tr('Open')}</option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>{L(REQUEST_STATUS_LABELS[s])}</option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="of-dept" className="sr-only">{tr('Department')}</label>
        <Select id="of-dept" value={value.department} onChange={set('department')} className={cls}>
          <option value="">{tr('All departments')}</option>
          {departments.map((d) => (
            <option key={d} value={d}>{deptLabel(d)}</option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="of-type" className="sr-only">{tr('Order type')}</label>
        <Select id="of-type" value={value.order_type} onChange={set('order_type')} className={cls}>
          <option value="">{tr('All order types')}</option>
          {ORDER_TYPES.map((t) => (
            <option key={t} value={t}>{L(ORDER_TYPE_LABELS[t])}</option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="of-source" className="sr-only">{tr('Source')}</label>
        <Select id="of-source" value={value.source} onChange={set('source')} className={cls}>
          <option value="">{tr('All sources')}</option>
          {ORDER_SOURCES.map((s) => (
            <option key={s} value={s}>{L(ORDER_SOURCE_LABELS[s])}</option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="of-from" className="text-xs text-zinc-500">{tr('From')}</label>
        <TextInput id="of-from" type="date" value={value.from} onChange={set('from')} className={cls} />
      </div>
      <div>
        <label htmlFor="of-to" className="text-xs text-zinc-500">{tr('To')}</label>
        <TextInput id="of-to" type="date" value={value.to} onChange={set('to')} className={cls} />
      </div>
      {showFinance && (
        <>
          <div>
            <label htmlFor="of-fin" className="text-xs text-zinc-500">{tr('Financial status')}</label>
            <Select id="of-fin" value={value.financial_status} onChange={set('financial_status')} className={cls}>
              <option value="">{tr('Any')}</option>
              {Object.entries(FIN).map(([k, [l]]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="of-stl" className="text-xs text-zinc-500">{tr('Settlement no.')}</label>
            <TextInput id="of-stl" placeholder={tr('STL-…')} value={value.settlement} onChange={set('settlement')} className={cls} />
          </div>
        </>
      )}
    </div>
  );
}

/** Simple horizontal bar list for breakdowns (department, source, …). */
export function Breakdown({ rows, label, value, format = (v) => String(v) }: { rows: Record<string, any>[]; label: (r: any) => string; value: (r: any) => number; format?: (v: number) => string }) {
  const max = Math.max(1, ...rows.map(value));
  if (!rows.length) return <p className="text-sm text-zinc-500">{tr('No orders in this period.')}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{label(r)}</span>
            <span className="shrink-0 font-semibold tabular-nums">{format(value(r))}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
            <div className="h-1.5 rounded-full bg-zinc-800" style={{ width: `${Math.max(2, (value(r) / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}
