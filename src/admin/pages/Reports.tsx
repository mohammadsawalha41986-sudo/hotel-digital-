import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { EmptyState, ErrorState, Select, Skeleton, TextInput, cx } from '../../components/ui';
import { ExportLinks, filterQuery } from '../commerce/kit';
import { useMe } from '../data';
import { PageHeader } from '../layout/AdminLayout';
import { HotelPicker } from './Orders';

const REPORTS: { key: string; title: string; finance?: boolean; platformOnly?: boolean }[] = [
  { key: 'orders_by_hotel', title: 'Orders by hotel', platformOnly: true },
  { key: 'orders_by_department', title: 'Orders by department' },
  { key: 'orders_by_service', title: 'Orders by service' },
  { key: 'orders_by_guest_type', title: 'Orders by guest type' },
  { key: 'orders_by_source', title: 'Orders by source' },
  { key: 'average_order_value', title: 'Average order value' },
  { key: 'cancellation_rate', title: 'Cancellation rate' },
  { key: 'commission_revenue', title: 'Commission revenue', finance: true },
  { key: 'settlements', title: 'Settlements', finance: true },
  { key: 'adjustments', title: 'Adjustments', finance: true },
];

interface Report {
  title: string;
  columns: { key: string; label: string; money?: boolean }[];
  rows: Record<string, unknown>[];
}

export function Reports({ hid, platform }: { hid?: string; platform?: boolean }) {
  const me = useMe();
  const hasFinance = platform || me.data?.permissions?.modules.includes('finance');
  const available = REPORTS.filter((r) => (platform || !r.platformOnly) && (!r.finance || hasFinance));
  const [key, setKey] = useState(available[0]?.key ?? 'orders_by_department');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hotelId, setHotelId] = useState('');
  const base = platform ? `/admin/platform/reports/${key}` : `/admin/hotels/${hid}/reports/${key}`;
  const qs = filterQuery({ from, to, hotel_id: platform ? hotelId : undefined });
  const q = useQuery({ queryKey: ['report', base, qs], queryFn: () => api<Report>(`${base}?${qs}`), retry: false });
  const fmt = (c: Report['columns'][number], v: unknown) =>
    v == null ? '—' : c.money ? new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) / 100) : typeof v === 'number' ? v.toLocaleString('en') : String(v);
  return (
    <>
      <PageHeader title={platform ? 'Reports — all hotels' : 'Reports'} description="Built from order records and the commission ledger. Download as Excel or CSV, or print to PDF." actions={<ExportLinks href={`${base}?${qs}`} label="Download report" />} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[16rem_repeat(3,minmax(0,11rem))]">
        <div>
          <label htmlFor="rp-key" className="sr-only">Report</label>
          <Select id="rp-key" value={key} onChange={(e) => setKey(e.target.value)} className="h-10 rounded-lg text-sm">
            {available.map((r) => (
              <option key={r.key} value={r.key}>{r.title}</option>
            ))}
          </Select>
        </div>
        {platform && <HotelPicker value={hotelId} onChange={setHotelId} />}
        <TextInput aria-label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg text-sm" />
        <TextInput aria-label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg text-sm" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        {q.isLoading ? (
          <Skeleton className="m-4 h-40 rounded-xl" />
        ) : q.error ? (
          <ErrorState title="Could not run this report" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data!.rows.length ? (
          <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No data for this period" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-black/[0.06] bg-zinc-50 text-left text-xs text-zinc-500">
                <tr>
                  {q.data!.columns.map((c) => (
                    <th key={c.key} className={cx('px-4 py-2.5 font-medium', (c.money || typeof q.data!.rows[0][c.key] === 'number') && 'text-right')}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {q.data!.rows.map((r, i) => (
                  <tr key={i}>
                    {q.data!.columns.map((c) => (
                      <td key={c.key} className={cx('px-4 py-2', (c.money || typeof r[c.key] === 'number') && 'text-right tabular-nums')}>{fmt(c, r[c.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
