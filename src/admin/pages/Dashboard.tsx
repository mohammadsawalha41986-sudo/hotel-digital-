import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEPARTMENT_LABELS, FEEDBACK_TYPE_LABELS, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, type DepartmentCode, type FeedbackType, type RequestStatus, type RequestType } from '@shared/domain';
import { formatMoney } from '@shared/pricing';
import { api, errorMessage } from '../../lib/api';
import { EmptyState, ErrorState, Segmented, Skeleton, cx } from '../../components/ui';
import { useAdminHotel, useMe } from '../data';
import { OrdersOverview } from '../commerce/OrdersOverview';
import { Card, PageHeader } from '../layout/AdminLayout';
import { tr, L, adminLang, pickLang } from '../i18n';

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
  top_services: { title_en: string; title_ar: string; type: string; n: number }[];
  popular_items: { name_en: string; name_ar: string; qty: number; orders: number }[];
  trend: { day: string; n: number }[];
  feedback: { feedback_type: string; n: number }[];
  reviews: { average: number | null; approved: number; pending: number } | null;
  /** Anonymous aggregate guest engagement (content roles only). */
  engagement: { totals: Record<string, number>; offer_ctr: number | null; request_completion: number | null; top: { event: string; target_type: string; target_code: string; n: number }[] } | null;
}

/** First day (UTC date) of a period of `days` days ending today. */
const fromDate = (days: number) => new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);

const fmtMin = (v: number | null) => (v == null ? '—' : v < 60 ? tr('{0} min', { 0: Math.round(v) }) : tr('{0} h', { 0: (v / 60).toFixed(1) }));

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
        title={tr('Dashboard')}
        description={scoped ? tr('Showing {0} only.', { 0: me.data!.permissions!.departments.map((d) => L(DEPARTMENT_LABELS[d])).join(', ') }) : tr('Live operational figures from guest requests. Nothing here is estimated or sample data.')}
        actions={
          <div className="w-80">
            <Segmented
              label={tr('Period')}
              value={days}
              onChange={setDays}
              options={[
                { value: '1', label: tr('Today') },
                { value: '7', label: tr('7 days') },
                { value: '30', label: tr('30 days') },
                { value: '90', label: tr('90 days') },
              ]}
            />
          </div>
        }
      />
      {me.data?.permissions?.modules.includes('orders') && (
        <div className="mb-8">
          <OrdersOverview hid={hid} from={fromDate(Number(days))} currency={currency} />
        </div>
      )}
      <h2 className="mb-4 text-lg font-semibold">{tr('Service operations')}</h2>
      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : q.error ? (
        <ErrorState title={tr('Could not load analytics')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.data!.summary.total === 0 && q.data!.summary.open === 0 ? (
        <Card>
          <EmptyState icon={<BarChart3 className="h-6 w-6" />} title={tr('No requests in this period')} description={tr('Figures will appear as soon as guests start sending requests from the guest site.')} />
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
  if (!rows.length) return <p className="text-sm text-zinc-500">{tr('No data in this period.')}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate" title={tr(r.label)}>
            {tr(r.label)}
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
  if (rows.length < 2) return <p className="text-sm text-zinc-500">{tr('A trend appears after two or more days of activity.')}</p>;
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="flex h-36 items-end gap-1" role="img" aria-label={tr('Requests per day: {0}', { 0: rows.map((r) => `${r.day} ${r.n}`).join(', ') })}>
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
        <Stat label={tr('Requests today')} value={s.today} />
        <Stat label={tr('Open requests')} value={s.open} sub={tr('{0} awaiting acceptance', { 0: s.awaiting })} tone={s.awaiting > 0 ? 'warn' : undefined} />
        <Stat label={tr('Avg. response time')} value={fmtMin(s.avg_response_min)} sub={tr('Received → accepted')} />
        <Stat label={tr('Avg. completion time')} value={fmtMin(s.avg_completion_min)} sub={tr('Received → completed')} />
        <Stat label={tr('Food orders')} value={s.food_orders} sub={tr('{0} completed', { 0: formatMoney(s.food_completed_value, currency, adminLang()) })} />
        <Stat label={tr('Laundry requests')} value={s.laundry} />
        <Stat label={tr('Spa requests')} value={s.spa} />
        <Stat label={tr('Complaints')} value={s.complaints} tone={s.complaints ? 'warn' : undefined} sub={a.reviews ? tr('Reviews: {0}★ · {1} pending', { 0: a.reviews.average ?? '—', 1: a.reviews.pending }) : undefined} />
      </div>
      {a.engagement && <Engagement e={a.engagement} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={tr('Requests per day')} actions={<Link to={`/admin/h/${hid}/requests`} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">{tr('Open queue →')}</Link>}>
          <Trend rows={a.trend} />
        </Card>
        <Card title={tr('By department')}>
          <Bars rows={a.by_department.map((r) => ({ label: L(DEPARTMENT_LABELS[r.department as DepartmentCode]) || r.department, n: r.n }))} />
        </Card>
        <Card title={tr('Top requested services')}>
          <Bars rows={a.top_services.map((r) => ({ label: pickLang(r, 'title'), n: r.n }))} />
        </Card>
        <Card title={tr('Popular menu items')} description={tr('Quantity ordered (cancelled orders excluded)')}>
          <Bars rows={a.popular_items.map((r) => ({ label: pickLang(r, 'name'), n: r.qty }))} />
        </Card>
        <Card title={tr('By request type')}>
          <Bars rows={a.by_type.map((r) => ({ label: L(REQUEST_TYPE_LABELS[r.type as RequestType]) || r.type, n: r.n }))} />
        </Card>
        <Card title={tr('Status & guest feedback')}>
          <Bars rows={[...a.by_status.map((r) => ({ label: L(REQUEST_STATUS_LABELS[r.status as RequestStatus]) || r.status, n: r.n })), ...a.feedback.map((f) => ({ label: tr('Feedback: {0}', { 0: L(FEEDBACK_TYPE_LABELS[f.feedback_type as FeedbackType]) || f.feedback_type }), n: f.n }))]} />
        </Card>
      </div>
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  offer_click: 'Offer opened',
  experience_click: 'Experience tile opened',
  menu_item_view: 'Menu item viewed',
  service_view: 'Service viewed',
  offer_impression: 'Offer seen',
};

/** Guest-site engagement: anonymous daily counters, never individual behaviour. */
function Engagement({ e }: { e: NonNullable<Analytics['engagement']> }) {
  const t = e.totals;
  const pct = (v: number | null) => (v == null ? '—' : `${v}%`);
  return (
    <Card title={tr('Guest engagement')} description={tr('Anonymous counts from the guest site — no guest, device or session is recorded.')} className="mb-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={tr('Offers seen')} value={t.offer_impression ?? 0} sub={tr('Opened: {0} · click-through {1}', { 0: t.offer_click ?? 0, 1: pct(e.offer_ctr) })} />
        <Stat label={tr('Experience tiles opened')} value={t.experience_click ?? 0} sub={tr('Menu items viewed: {0}', { 0: t.menu_item_view ?? 0 })} />
        <Stat label={tr('Requests started')} value={t.request_started ?? 0} sub={tr('Completed: {0} · {1}', { 0: t.request_completed ?? 0, 1: pct(e.request_completion) })} />
        <Stat label={tr('WhatsApp opened')} value={t.whatsapp_click ?? 0} sub={tr('Services viewed: {0}', { 0: t.service_view ?? 0 })} />
      </div>
      {e.top.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-zinc-600">{tr('Most engaged content')}</p>
          <Bars rows={e.top.filter((x) => x.event !== 'offer_impression').slice(0, 8).map((x) => ({ label: `${x.target_code} · ${tr(EVENT_LABELS[x.event] ?? x.event)}`, n: x.n }))} />
        </div>
      )}
    </Card>
  );
}
