import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEPARTMENT_LABELS, FEEDBACK_TYPE_LABELS, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, type DepartmentCode, type FeedbackType, type RequestStatus, type RequestType } from '@shared/domain';
import { formatMoney } from '@shared/pricing';
import { api, errorMessage } from '../../lib/api';
import { EmptyState, ErrorState, Segmented, Skeleton, cx } from '../../components/ui';
import { useAdminHotel, useMe } from '../data';
import { Card, PageHeader } from '../layout/AdminLayout';

interface Analytics {
  days: number;
  summary: {
    today: number;
    total: number;
    open: number;
    awaiting: number;
    avg_response_min: number | null;
    avg_completion_min: number | null;
    food_orders: number;
    food_completed_value: number;
    laundry: number;
    spa: number;
    complaints: number;
  };
  by_department: { department: string; n: number }[];
  by_status: { status: string; n: number }[];
  by_type: { type: string; n: number }[];
  top_services: { title_en: string; type: string; n: number }[];
  popular_items: { name_en: string; qty: number; orders: number }[];
  trend: { day: string; n: number }[];
  feedback: { feedback_type: string; n: number }[];
  reviews: { average: number | null; approved: number; pending: number } | null;
}

const fmtMin = (v: number | null) => (v == null ? '—' : v < 60 ? `${Math.round(v)} min` : `${(v / 60).toFixed(1)} h`);

export function Dashboard({ hid }: { hid: string }) {
  const [days, setDays] = useState<'1' | '7' | '30' | '90'>('30');
  const me = useMe();
  const hotel = useAdminHotel(hid);
  const q = useQuery({ queryKey: ['analytics', hid, days], queryFn: () => api<Analytics>(`/admin/hotels/${hid}/analytics?days=${days}`), refetchInterval: 60_000 });
  const scoped = me.data?.permissions && me.data.permissions.departments.length < 9;
  const currency = hotel.data?.profile.currency ?? 'SAR';

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={scoped ? `Showing ${me.data!.permissions!.departments.map((d) => DEPARTMENT_LABELS[d].en).join(', ')} only.` : 'Live operational figures from guest requests. Nothing here is estimated or sample data.'}
        actions={
          <div className="w-80">
            <Segmented
              label="Period"
              value={days}
              onChange={setDays}
              options={[
                { value: '1', label: 'Today' },
                { value: '7', label: '7 days' },
                { value: '30', label: '30 days' },
                { value: '90', label: '90 days' },
              ]}
            />
          </div>
        }
      />
      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : q.error ? (
        <ErrorState title="Could not load analytics" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.data!.summary.total === 0 && q.data!.summary.open === 0 ? (
        <Card>
          <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No requests in this period" description="Figures will appear as soon as guests start sending requests from the guest site." />
        </Card>
      ) : (
        <Body a={q.data!} hid={hid} currency={currency} />
      )}
    </>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'warn' }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={cx('mt-2 text-3xl font-semibold tabular-nums tracking-tight', tone === 'warn' && 'text-amber-600')}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="text-sm text-zinc-500">No data in this period.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate" title={r.label}>
            {r.label}
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
            <span className="block h-full rounded-full bg-zinc-800" style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="text-end font-medium tabular-nums">{r.n}</span>
        </li>
      ))}
    </ul>
  );
}

function Trend({ rows }: { rows: { day: string; n: number }[] }) {
  if (rows.length < 2) return <p className="text-sm text-zinc-500">A trend appears after two or more days of activity.</p>;
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="flex h-36 items-end gap-1" role="img" aria-label={`Requests per day: ${rows.map((r) => `${r.day} ${r.n}`).join(', ')}`}>
      {rows.map((r) => (
        <div key={r.day} className="group relative flex-1">
          <div className="rounded-t bg-zinc-800 transition group-hover:bg-zinc-600" style={{ height: `${Math.max(4, (r.n / max) * 136)}px` }} />
          <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-zinc-900 px-1.5 py-0.5 text-xs whitespace-nowrap text-white group-hover:block">
            {r.day.slice(5)}: {r.n}
          </span>
        </div>
      ))}
    </div>
  );
}

function Body({ a, hid, currency }: { a: Analytics; hid: string; currency: string }) {
  const s = a.summary;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Requests today" value={s.today} />
        <Stat label="Open requests" value={s.open} sub={`${s.awaiting} awaiting acceptance`} tone={s.awaiting > 0 ? 'warn' : undefined} />
        <Stat label="Avg. response time" value={fmtMin(s.avg_response_min)} sub="Received → accepted" />
        <Stat label="Avg. completion time" value={fmtMin(s.avg_completion_min)} sub="Received → completed" />
        <Stat label="Food orders" value={s.food_orders} sub={`${formatMoney(s.food_completed_value, currency, 'en')} completed`} />
        <Stat label="Laundry requests" value={s.laundry} />
        <Stat label="Spa requests" value={s.spa} />
        <Stat label="Complaints" value={s.complaints} tone={s.complaints ? 'warn' : undefined} sub={a.reviews ? `Reviews: ${a.reviews.average ?? '—'}★ · ${a.reviews.pending} pending` : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Requests per day" actions={<Link to={`/admin/h/${hid}/requests`} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Open queue →</Link>}>
          <Trend rows={a.trend} />
        </Card>
        <Card title="By department">
          <Bars rows={a.by_department.map((r) => ({ label: DEPARTMENT_LABELS[r.department as DepartmentCode]?.en ?? r.department, n: r.n }))} />
        </Card>
        <Card title="Top requested services">
          <Bars rows={a.top_services.map((r) => ({ label: r.title_en, n: r.n }))} />
        </Card>
        <Card title="Popular menu items" description="Quantity ordered (cancelled orders excluded)">
          <Bars rows={a.popular_items.map((r) => ({ label: r.name_en, n: r.qty }))} />
        </Card>
        <Card title="By request type">
          <Bars rows={a.by_type.map((r) => ({ label: REQUEST_TYPE_LABELS[r.type as RequestType]?.en ?? r.type, n: r.n }))} />
        </Card>
        <Card title="Status & guest feedback">
          <Bars rows={[...a.by_status.map((r) => ({ label: REQUEST_STATUS_LABELS[r.status as RequestStatus]?.en ?? r.status, n: r.n })), ...a.feedback.map((f) => ({ label: `Feedback: ${FEEDBACK_TYPE_LABELS[f.feedback_type as FeedbackType]?.en ?? f.feedback_type}`, n: f.n }))]} />
        </Card>
      </div>
    </div>
  );
}
