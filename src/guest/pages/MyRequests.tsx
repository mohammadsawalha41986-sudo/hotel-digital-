import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ClipboardList, Circle, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { OPEN_STATUSES, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, type RequestStatus, type RequestType } from '@shared/domain';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Badge, Button, EmptyState, ErrorState, Skeleton, cx } from '../../components/ui';
import { SectionHeader } from '../components/cards';
import { usePageTitle } from '../components/usePageTitle';
import { useMyRequests } from '../layout/GuestLayout';
import { useHotel } from '../hotel';
import { guestToken } from '../session';
import type { GuestRequestRow } from '../types';

const TONE: Record<RequestStatus, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  NEW: 'info',
  ACCEPTED: 'warning',
  IN_PROGRESS: 'warning',
  READY: 'success',
  COMPLETED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export function StatusBadge({ status }: { status: string }) {
  const { lang } = useI18n();
  const s = status as RequestStatus;
  return <Badge tone={TONE[s] ?? 'neutral'}>{REQUEST_STATUS_LABELS[s]?.[lang] ?? status}</Badge>;
}

export function MyRequests() {
  const { t, lang, date, money } = useI18n();
  const { path } = useHotel();
  const title = usePageTitle('requests');
  const q = useMyRequests();

  return (
    <div className="mx-auto max-w-3xl pt-8 pb-12">
      <SectionHeader as="h1" title={title} />
      <div className="px-5 sm:px-8">
        {q.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : q.error ? (
          <ErrorState title={t('errorTitle')} description={errorMessage(q.error)} onRetry={() => q.refetch()} retryLabel={t('retry')} />
        ) : !q.data?.requests.length ? (
          <EmptyState icon={<ClipboardList className="h-6 w-6" />} title={t('noRequests')} description={t('noRequestsHint')} />
        ) : (
          <ul className="space-y-3">
            {q.data.requests.map((r) => (
              <li key={r.id}>
                <Link to={path(`requests/${r.reference}`)} className={cx('block rounded-[1.35rem] bg-surface p-4 ring-1 ring-line transition hover:shadow-md', !OPEN_STATUSES.includes(r.status as never) && 'opacity-80')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted">{REQUEST_TYPE_LABELS[r.type as RequestType]?.[lang]}</p>
                      <p className="mt-0.5 truncate font-semibold">{lang === 'ar' ? r.title_ar || r.title_en : r.title_en}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-muted">
                    <span className="ltr-nums font-mono">{r.reference}</span>
                    <span>
                      {r.total ? `${money(r.total)} · ` : ''}
                      {date(r.created_at, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const FLOW: RequestStatus[] = ['NEW', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

export function RequestDetail() {
  const { reference = '' } = useParams();
  const { slug, path } = useHotel();
  const { t, lang, date, money } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['my-request', slug, reference],
    queryFn: () => api<{ request: GuestRequestRow; events: { to_status: string | null; note: string; created_at: string }[] }>(`/public/hotels/${slug}/requests/${encodeURIComponent(reference)}`, { headers: { 'x-guest-token': guestToken() } }),
    refetchInterval: 15_000,
  });
  const cancel = useMutation({
    mutationFn: () => api(`/public/hotels/${slug}/requests/${encodeURIComponent(reference)}/cancel`, { method: 'POST', headers: { 'x-guest-token': guestToken() } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-request', slug, reference] });
      qc.invalidateQueries({ queryKey: ['my-requests', slug] });
    },
  });

  if (q.isLoading) return <div className="mx-auto max-w-3xl space-y-3 p-5"><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;
  if (q.error) return <ErrorState title={t('errorTitle')} description={errorMessage(q.error)} onRetry={() => q.refetch()} retryLabel={t('retry')} />;
  const r = q.data!.request;
  const status = r.status as RequestStatus;
  const terminalBad = status === 'REJECTED' || status === 'CANCELLED';
  const reached = FLOW.indexOf(status);
  const messages = q.data!.events.filter((e) => e.note && e.note !== 'Request received' && e.note !== 'Cancelled by guest');

  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-12 sm:px-8">
      <Link to={path('requests')} className="inline-flex h-10 items-center gap-2 text-sm font-medium text-muted">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('myRequests')}
      </Link>
      <div className="mt-3 rounded-[1.6rem] bg-surface p-5 ring-1 ring-line sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{REQUEST_TYPE_LABELS[r.type as RequestType]?.[lang]}</p>
            <h1 className="display mt-1 text-3xl">{lang === 'ar' ? r.title_ar || r.title_en : r.title_en}</h1>
            <p className="ltr-nums mt-2 font-mono text-sm font-semibold">{r.reference}</p>
          </div>
          <StatusBadge status={r.status} />
        </div>

        <h2 className="mt-8 mb-3 text-sm font-semibold">{t('statusTimeline')}</h2>
        {terminalBad ? (
          <p className="flex items-center gap-2 rounded-2xl bg-black/[0.04] px-4 py-3 text-sm">
            <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
            {REQUEST_STATUS_LABELS[status][lang]}
          </p>
        ) : (
          <ol className="grid grid-cols-4 gap-2" aria-label={t('statusTimeline')}>
            {FLOW.map((s, i) => (
              <li key={s} className="flex flex-col items-center text-center" aria-current={i === reached ? 'step' : undefined}>
                {i <= reached ? <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" /> : <Circle className="h-6 w-6 text-black/20" aria-hidden="true" />}
                <span className={cx('mt-1.5 text-[0.72rem] leading-tight', i <= reached ? 'font-semibold' : 'text-muted')}>{REQUEST_STATUS_LABELS[s][lang]}</span>
              </li>
            ))}
          </ol>
        )}

        {messages.length > 0 && (
          <ul className="mt-6 space-y-2">
            {messages.map((m, i) => (
              <li key={i} className="rounded-2xl bg-[color-mix(in_oklab,var(--c-primary)_6%,transparent)] px-4 py-3 text-sm">
                <p>{m.note}</p>
                <p className="mt-1 text-xs text-muted">{date(m.created_at)}</p>
              </li>
            ))}
          </ul>
        )}

        {r.lines.length > 0 && (
          <ul className="mt-8 divide-y divide-line border-t border-line">
            {r.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-3 text-sm">
                <span>
                  {l.quantity ? `${l.quantity} × ` : ''}
                  {lang === 'ar' ? l.name_ar || l.name_en : l.name_en}
                  {(lang === 'ar' ? l.detail_ar : l.detail_en) && <span className="block text-muted">{lang === 'ar' ? l.detail_ar : l.detail_en}</span>}
                </span>
                {l.amount ? <span className="tabular-nums">{money(l.amount)}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {r.total ? (
          <p className="mt-2 flex justify-between border-t border-line pt-3 font-semibold">
            <span>{t('estimatedTotal')}</span>
            <span className="tabular-nums">{money(r.total)}</span>
          </p>
        ) : null}
        {r.notes && (
          <p className="mt-4 text-sm">
            <span className="font-semibold">{t('notes')}:</span> <span className="text-muted">{r.notes}</span>
          </p>
        )}
        <p className="mt-4 text-xs text-muted">{date(r.created_at)}</p>

        {status === 'NEW' && (
          <div className="mt-6">
            {cancel.error && <p className="mb-2 text-sm text-red-600">{errorMessage(cancel.error)}</p>}
            <Button
              variant="secondary"
              loading={cancel.isPending}
              onClick={() => {
                if (window.confirm(t('cancelConfirm'))) cancel.mutate();
              }}
            >
              {t('cancelRequest')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
