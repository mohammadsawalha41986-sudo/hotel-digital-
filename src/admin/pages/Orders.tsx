import { useQuery } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Button, EmptyState, ErrorState, Select, Skeleton } from '../../components/ui';
import { ExportLinks, FinancialStatus, OrderFilterBar, OrderStatus, dateTime, deptLabel, emptyFilters, filterQuery, major, money, typeLabel, useDebounced, type OrderFilters } from '../commerce/kit';
import { OrderDetailSheet } from '../commerce/OrderDetail';
import { useMe } from '../data';
import { PageHeader } from '../layout/AdminLayout';

interface OrderRow {
  id: string;
  hotel_id: string;
  hotel_name: string;
  reference: string;
  order_type: string;
  department: string;
  source: string;
  status: string;
  title_en: string;
  guest_name: string;
  guest_phone: string;
  guest_no: string | null;
  room: string;
  total: number | null;
  currency: string;
  financial_status: string;
  created_at: string;
  commission_minor: number | null;
  settlement_no: string | null;
}

const PAGE = 50;

/** Order records for one hotel, or — with `platform` — every hotel. */
export function Orders({ hid, platform }: { hid?: string; platform?: boolean }) {
  const me = useMe();
  const [filters, setFilters] = useState<OrderFilters>(emptyFilters);
  const [hotelId, setHotelId] = useState('');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const f = useDebounced(filters);
  const base = platform ? '/admin/platform/orders' : `/admin/hotels/${hid}/orders`;
  const qs = filterQuery({ ...f, hotel_id: platform ? hotelId : undefined });
  const q = useQuery({
    queryKey: ['orders', base, qs, page],
    queryFn: () => api<{ orders: OrderRow[]; total: number; completed_value: number }>(`${base}?${qs}&limit=${PAGE}&offset=${page * PAGE}`),
  });
  const departments = (me.data?.permissions?.departments ?? []) as string[];
  const showFinance = platform || me.data?.permissions?.modules.includes('finance');
  const rows = q.data?.orders ?? [];
  const hasCommission = rows.some((r) => r.commission_minor != null);

  return (
    <>
      <PageHeader
        title={platform ? 'Orders — all hotels' : 'Orders'}
        description="Every order with its guest, lines, status history and — where you have finance access — its locked commission."
        actions={<ExportLinks href={`${base}?${qs}`} label="Export orders" />}
      />
      <OrderFilterBar
        value={filters}
        onChange={(v) => {
          setFilters(v);
          setPage(0);
        }}
        departments={departments}
        showFinance={showFinance}
        extra={platform ? <HotelPicker value={hotelId} onChange={(v) => { setHotelId(v); setPage(0); }} /> : undefined}
      />
      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        {q.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : q.error ? (
          <ErrorState title="Could not load orders" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !rows.length ? (
          <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="No orders match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="border-b border-black/[0.06] bg-zinc-50 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Reference</th>
                  {platform && <th className="px-4 py-2.5 font-medium">Hotel</th>}
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Guest</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  {hasCommission && <th className="px-4 py-2.5 text-right font-medium">Commission</th>}
                  <th className="px-4 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => setOpenId(r.id)} className="font-mono font-semibold underline-offset-2 hover:underline">
                        {r.reference}
                      </button>
                    </td>
                    {platform && <td className="px-4 py-2.5">{r.hotel_name}</td>}
                    <td className="px-4 py-2.5">
                      <p className="max-w-[16rem] truncate font-medium">{r.title_en}</p>
                      <p className="text-xs text-zinc-500">{typeLabel(r.order_type)} · {deptLabel(r.department)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="max-w-[12rem] truncate">{r.guest_name || '—'}</p>
                      <p className="text-xs text-zinc-500">{r.room ? `Room ${r.room}` : 'Visitor'}{r.guest_no ? ` · ${r.guest_no}` : ''}</p>
                    </td>
                    <td className="space-y-1 px-4 py-2.5">
                      <OrderStatus status={r.status} />
                      {showFinance && <div><FinancialStatus status={r.financial_status} /></div>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{major(r.total, r.currency)}</td>
                    {hasCommission && <td className="px-4 py-2.5 text-right tabular-nums">{money(r.commission_minor, r.currency)}{r.settlement_no && <p className="text-xs text-zinc-500">{r.settlement_no}</p>}</td>}
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{dateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {q.data && q.data.total > PAGE && (
        <nav className="mt-3 flex items-center justify-between text-sm" aria-label="Pages">
          <span className="text-zinc-500">
            {page * PAGE + 1}–{Math.min((page + 1) * PAGE, q.data.total)} of {q.data.total}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= q.data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </nav>
      )}
      <OrderDetailSheet
        open={!!openId}
        onClose={() => setOpenId(null)}
        apiPath={openId ? (platform ? `/admin/platform/orders/${openId}` : `/admin/hotels/${hid}/orders/${openId}`) : null}
        canAdjust={platform}
      />
    </>
  );
}

export function HotelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const me = useMe();
  return (
    <div>
      <label htmlFor="hotel-pick" className="sr-only">Hotel</label>
      <Select id="hotel-pick" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-lg text-sm">
        <option value="">All hotels</option>
        {(me.data?.hotels ?? []).map((h) => (
          <option key={h.id} value={h.id}>{h.name_en}</option>
        ))}
      </Select>
    </div>
  );
}
