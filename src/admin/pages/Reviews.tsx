import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { REVIEW_STATUSES, type ReviewStatus } from '@shared/domain';
import { api, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Segmented, Skeleton } from '../../components/ui';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';

interface Review {
  id: string;
  guest_name: string;
  room: string;
  rating: number;
  title: string;
  body: string;
  lang: string;
  status: ReviewStatus;
  created_at: string;
  moderated_by_name: string | null;
  moderated_at: string | null;
}

const TONE: Record<ReviewStatus, 'info' | 'success' | 'danger' | 'neutral' | 'warning'> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', HIDDEN: 'neutral', ARCHIVED: 'neutral' };
const ACTIONS: Record<ReviewStatus, ReviewStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['HIDDEN', 'ARCHIVED'],
  REJECTED: ['APPROVED', 'ARCHIVED'],
  HIDDEN: ['APPROVED', 'ARCHIVED'],
  ARCHIVED: ['APPROVED'],
};
const VERB: Record<ReviewStatus, string> = { PENDING: 'Reset', APPROVED: 'Approve', REJECTED: 'Reject', HIDDEN: 'Hide', ARCHIVED: 'Archive' };

export function Reviews({ hid }: { hid: string }) {
  const [status, setStatus] = useState<'ALL' | ReviewStatus>('PENDING');
  const qc = useQueryClient();
  const fb = useFeedback();
  const q = useQuery({ queryKey: ['reviews-admin', hid, status], queryFn: () => api<{ reviews: Review[] }>(`/admin/hotels/${hid}/reviews?status=${status}`).then((r) => r.reviews) });
  const m = useMutation({
    mutationFn: ({ id, s }: { id: string; s: ReviewStatus }) => api(`/admin/hotels/${hid}/reviews/${id}/status`, { method: 'POST', body: { status: s } }),
    onSuccess: (_d, v) => {
      fb.success(`Review ${VERB[v.s].toLowerCase()}d`.replace('ed d', 'ed'));
      qc.invalidateQueries({ queryKey: ['reviews-admin', hid] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (e) => fb.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Guest reviews" description="Nothing is published without approval. Only approved reviews appear on the guest site." />
      <div className="mb-4 max-w-3xl">
        <Segmented label="Filter by status" value={status} onChange={setStatus} options={[{ value: 'PENDING', label: 'Pending' }, ...REVIEW_STATUSES.filter((s) => s !== 'PENDING').map((s) => ({ value: s, label: s[0] + s.slice(1).toLowerCase() })), { value: 'ALL', label: 'All' }]} />
      </div>
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : q.error ? (
        <ErrorState title="Could not load reviews" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data!.length ? (
        <div className="rounded-2xl border border-black/[0.07] bg-white">
          <EmptyState title="No reviews here" description={status === 'PENDING' ? 'New guest reviews waiting for moderation will appear here.' : undefined} />
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {q.data!.map((r) => (
            <li key={r.id} className="flex flex-col rounded-2xl border border-black/[0.07] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex gap-0.5 text-amber-500" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-current' : 'opacity-25'}`} aria-hidden="true" />
                    ))}
                  </div>
                  {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                </div>
                <Badge tone={TONE[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-700" dir="auto" lang={r.lang}>
                {r.body}
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                {r.guest_name}
                {r.room ? ` · Room ${r.room}` : ''} · {new Date(r.created_at).toLocaleString()}
                {r.moderated_by_name ? ` · moderated by ${r.moderated_by_name}` : ''}
              </p>
              <div className="mt-4 flex gap-2">
                {ACTIONS[r.status].map((s) => (
                  <Button key={s} size="sm" className="rounded-lg" variant={s === 'APPROVED' ? 'primary' : 'secondary'} loading={m.isPending && m.variables?.id === r.id && m.variables.s === s} onClick={() => m.mutate({ id: r.id, s })}>
                    {VERB[s]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
