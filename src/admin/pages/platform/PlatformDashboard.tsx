import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ORDER_TYPES, ORDER_TYPE_LABELS } from '@shared/commerce';
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS } from '@shared/domain';
import { api, errorMessage } from '../../../lib/api';
import { ErrorState, Select, Skeleton, TextInput } from '../../../components/ui';
import { Breakdown, FinancialStatus, Kpi, KpiGrid, OrderStatus, dateTime, deptLabel, filterQuery, major, money, sourceLabel, typeLabel } from '../../commerce/kit';
import { Card, PageHeader } from '../../layout/AdminLayout';
import { HotelPicker } from '../Orders';

interface Dash {
  total_hotels: number;
  summary: Record<string, number>;
  finance: Record<string, number>;
  settlements: { outstanding_minor: number; outstanding_count: number; settled_minor: number; settled_count: number };
  by_hotel: { hotel_id: string; hotel_name: string; eligible_orders: number; gross_minor: number; base_minor: number; commission_minor: number; platform_revenue_minor: number }[];
  by_department: { department: string; n: number; value: number }[];
  by_order_type: { order_type: string; n: number; value: number }[];
  by_source: { source: string; n: number }[];
  recent: { id: string; hotel_name: string; reference: string; order_type: string; status: string; title_en: string; total: number; currency: string; created_at: string; financial_status: string }[];
}

const OPERATIONAL_DEPARTMENTS = ['FNB', 'HOUSEKEEPING', 'MAINTENANCE', 'FRONT_OFFICE', 'CONCIERGE', 'LAUNDRY', 'SPA'];

/** Platform revenue across hotels, from real eligible orders and posted adjustments only. */
export function PlatformDashboard() {
  const [f, setF] = useState({ from: '', to: '', hotel_id: '', department: '', order_type: '', status: '' });
  const qs = filterQuery(f);
  const q = useQuery({ queryKey: ['platform', 'dashboard', qs], queryFn: () => api<Dash>(`/admin/platform/dashboard?${qs}`) });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const d = q.data;
  return (
    <>
      <PageHeader title="Commercial dashboard" description="Platform revenue derived only from completed, eligible orders and posted adjustments." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <HotelPicker value={f.hotel_id} onChange={(v) => setF({ ...f, hotel_id: v })} />
        <TextInput aria-label="From" type="date" value={f.from} onChange={set('from')} className="h-10 rounded-lg text-sm" />
        <TextInput aria-label="To" type="date" value={f.to} onChange={set('to')} className="h-10 rounded-lg text-sm" />
        <Select aria-label="Department" value={f.department} onChange={set('department')} className="h-10 rounded-lg text-sm">
          <option value="">All departments</option>
          {OPERATIONAL_DEPARTMENTS.map((x) => (
            <option key={x} value={x}>{deptLabel(x)}</option>
          ))}
        </Select>
        <Select aria-label="Order type" value={f.order_type} onChange={set('order_type')} className="h-10 rounded-lg text-sm">
          <option value="">All order types</option>
          {ORDER_TYPES.map((x) => (
            <option key={x} value={x}>{ORDER_TYPE_LABELS[x].en}</option>
          ))}
        </Select>
        <Select aria-label="Status" value={f.status} onChange={set('status')} className="h-10 rounded-lg text-sm">
          <option value="">All statuses</option>
          {REQUEST_STATUSES.map((x) => (
            <option key={x} value={x}>{REQUEST_STATUS_LABELS[x].en}</option>
          ))}
        </Select>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : q.error ? (
        <ErrorState title="Could not load the dashboard" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : d ? (
        <div className="space-y-4">
          <KpiGrid>
            <Kpi label="Hotels" value={d.total_hotels} />
            <Kpi label="Orders" value={d.summary.orders} hint={`${d.summary.completed} completed · ${d.summary.cancelled} cancelled`} />
            <Kpi label="Completed eligible orders" value={d.finance.eligible_orders} />
            <Kpi label="Gross order value" value={money(d.finance.gross_minor)} />
            <Kpi label="Eligible commission base" value={money(d.finance.base_minor)} />
            <Kpi label="Platform commission" value={money(d.finance.commission_minor)} hint={`Revenue excl. tax ${money(d.finance.platform_revenue_minor)}`} tone="success" />
            <Kpi label="Outstanding settlements" value={money(d.settlements.outstanding_minor)} hint={`${d.settlements.outstanding_count} open · unsettled ledger ${money(d.finance.unsettled_due_minor)}`} />
            <Kpi label="Settled" value={money(d.settlements.settled_minor)} hint={`${d.settlements.settled_count} settlements`} />
            <Kpi label="Adjustments" value={money(d.finance.adjustments_minor)} />
            <Kpi
              label="Missing commission rules"
              value={d.summary.rule_unavailable}
              tone={d.summary.rule_unavailable ? 'danger' : undefined}
              hint={d.summary.rule_unavailable ? <Link className="underline" to="/admin/platform/orders">Review orders</Link> : 'None'}
            />
          </KpiGrid>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Commission by hotel" className="lg:col-span-2">
              {d.by_hotel.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-zinc-500">
                      <tr>
                        <th className="py-1.5 font-medium">Hotel</th>
                        <th className="py-1.5 text-right font-medium">Eligible orders</th>
                        <th className="py-1.5 text-right font-medium">Gross value</th>
                        <th className="py-1.5 text-right font-medium">Base</th>
                        <th className="py-1.5 text-right font-medium">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06]">
                      {d.by_hotel.map((h) => (
                        <tr key={h.hotel_id}>
                          <td className="py-2">{h.hotel_name}</td>
                          <td className="py-2 text-right tabular-nums">{h.eligible_orders}</td>
                          <td className="py-2 text-right tabular-nums">{money(h.gross_minor)}</td>
                          <td className="py-2 text-right tabular-nums">{money(h.base_minor)}</td>
                          <td className="py-2 text-right font-semibold tabular-nums">{money(h.commission_minor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No commission earned in this period.</p>
              )}
            </Card>
            <Card title="Orders by source">
              <Breakdown rows={d.by_source} label={(r) => sourceLabel(r.source)} value={(r) => r.n} />
            </Card>
            <Card title="Orders by department">
              <Breakdown rows={d.by_department} label={(r) => deptLabel(r.department)} value={(r) => r.n} />
            </Card>
            <Card title="Completed value by order type">
              <Breakdown rows={d.by_order_type} label={(r) => typeLabel(r.order_type)} value={(r) => r.value} format={(v) => major(v)} />
            </Card>
            <Card title="Recent orders">
              {d.recent.length ? (
                <ul className="space-y-2 text-sm">
                  {d.recent.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="font-mono text-xs">{o.reference}</span>
                        <span className="block truncate text-xs text-zinc-500">{o.hotel_name} · {dateTime(o.created_at)}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <OrderStatus status={o.status} />
                        <FinancialStatus status={o.financial_status} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No orders yet.</p>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
