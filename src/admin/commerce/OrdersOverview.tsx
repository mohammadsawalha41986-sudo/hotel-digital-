import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { ErrorState, Skeleton } from '../../components/ui';
import { Card } from '../layout/AdminLayout';
import { Breakdown, FinancialStatus, Kpi, KpiGrid, OrderStatus, dateTime, deptLabel, major, money, sourceLabel, typeLabel } from './kit';

interface Overview {
  summary: Record<string, number>;
  by_department: { department: string; n: number; value: number }[];
  by_order_type: { order_type: string; n: number; value: number }[];
  by_source: { source: string; n: number }[];
  by_service: { name_en: string; item_code: string; orders: number; qty: number }[];
  recent: { id: string; reference: string; order_type: string; status: string; title_en: string; room: string; total: number; currency: string; created_at: string; financial_status: string }[];
  finance: Record<string, number> | null;
  finance_access: 'NONE' | 'SETTLEMENTS' | 'FULL';
}

/** Hotel order dashboard (real order records; commission only with finance access). */
export function OrdersOverview({ hid, from, currency }: { hid: string; from: string; currency: string }) {
  const q = useQuery({ queryKey: ['orders-dashboard', hid, from], queryFn: () => api<Overview>(`/admin/hotels/${hid}/orders/dashboard?from=${from}`), refetchInterval: 60_000 });
  if (q.isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (q.error) return <ErrorState title="Could not load order figures" description={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const s = d.summary;
  return (
    <section aria-labelledby="orders-heading" className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 id="orders-heading" className="text-lg font-semibold">Orders</h2>
        <Link to={`/admin/h/${hid}/orders`} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">All orders →</Link>
      </div>
      <KpiGrid>
        <Kpi label="Orders today" value={s.orders_today} />
        <Kpi label="New" value={s.new} />
        <Kpi label="Pending" value={s.pending} hint={`${s.in_progress} in progress`} />
        <Kpi label="Completed" value={s.completed} />
        <Kpi label="Cancelled / declined" value={s.cancelled} />
        <Kpi label="Order value (completed)" value={major(s.order_value, currency)} />
        <Kpi label="Average order value" value={major(s.average_order_value, currency)} />
        {d.finance && <Kpi label="Commission (this period)" value={money(d.finance.commission_minor, currency)} hint={`${d.finance.eligible_orders} eligible orders`} />}
      </KpiGrid>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="By department">
          <Breakdown rows={d.by_department} label={(r) => deptLabel(r.department)} value={(r) => r.n} />
        </Card>
        <Card title="By service">
          <Breakdown rows={d.by_service} label={(r) => r.name_en} value={(r) => r.orders} />
        </Card>
        <Card title="By source">
          <Breakdown rows={d.by_source} label={(r) => sourceLabel(r.source)} value={(r) => r.n} />
        </Card>
      </div>
      <Card title="Recent orders">
        {d.recent.length ? (
          <ul className="divide-y divide-black/[0.06] text-sm">
            {d.recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-mono font-semibold">{o.reference}</span>
                  <span className="ms-2 text-zinc-600">{o.title_en}</span>
                  <span className="block text-xs text-zinc-500">{typeLabel(o.order_type)} · {o.room ? `Room ${o.room}` : 'Visitor'} · {dateTime(o.created_at)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <OrderStatus status={o.status} />
                  {d.finance_access === 'FULL' && <FinancialStatus status={o.financial_status} />}
                  <span className="w-20 text-right tabular-nums">{major(o.total, o.currency)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No orders in this period.</p>
        )}
      </Card>
    </section>
  );
}
