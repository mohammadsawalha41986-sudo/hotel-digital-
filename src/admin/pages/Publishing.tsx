import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';
import { PublishControls } from '../components/Publish';
import { tr, locale } from '../i18n';

interface Pub {
  id: string;
  version: number;
  published_at: string;
  published_by: string | null;
  summary: { counts?: Record<string, number>; changes?: number; note?: string; restored_from?: number; sections?: number };
}

const when = (iso: string) => new Date(iso).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' });

/** Every published version, who published it and what it contained. Older versions can be made live again. */
export function PublishingHistory({ hid }: { hid: string }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['publications', hid], queryFn: () => api<{ publications: Pub[] }>(`/admin/hotels/${hid}/publications`).then((r) => r.publications) });
  const restore = useMutation({
    mutationFn: (id: string) => api<{ version: number }>(`/admin/hotels/${hid}/publications/${id}/republish`, { method: 'POST' }),
    onSuccess: (r) => {
      fb.success(tr('Restored as version {0}', { 0: r.version }));
      qc.invalidateQueries({ queryKey: ['publications', hid] });
      qc.invalidateQueries({ queryKey: ['publishing', hid] });
    },
    onError: (e) => fb.error(errorMessage(e)),
  });
  return (
    <>
      <PageHeader title={tr('Publishing history')} description={tr('Each publish freezes everything guests see into a version. Restoring an older version publishes it again as a new version; your draft is not changed.')} actions={<PublishControls hid={hid} />} />
      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        {q.isLoading ? (
          <Skeleton className="m-4 h-40 rounded-xl" />
        ) : q.error ? (
          <ErrorState title={tr('Could not load the history')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data!.length ? (
          <EmptyState icon={<History className="h-6 w-6" />} title={tr('Nothing published yet')} />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {q.data!.map((p, i) => {
              const c = p.summary.counts ?? {};
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">{tr('Version {0}', { 0: p.version })}{i === 0 && <Badge tone="success">{tr('Live')}</Badge>}
                      {p.summary.restored_from && <Badge tone="info">{tr('Restored from v{0}', { 0: p.summary.restored_from })}</Badge>}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {when(p.published_at)} · {p.published_by ?? tr('System')}
                      {p.summary.note ? ` · ${p.summary.note}` : ''}
                      {typeof p.summary.changes === 'number' ? tr(' · {0} change(s)', { 0: p.summary.changes }) : ''}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {c.menu_items ?? 0}{tr('menu items · {0} outlets · {1} room services · {2} treatments · {3} laundry items · {4} offers · {5} homepage sections', { 0: c.outlets ?? 0, 1: c.room_services ?? 0, 2: c.spa_services ?? 0, 3: c.laundry_items ?? 0, 4: c.offers ?? 0, 5: p.summary.sections ?? 0 })}</p>
                  </div>
                  {i > 0 && (
                    <Button size="sm" variant="secondary" loading={restore.isPending && restore.variables === p.id} onClick={() => restore.mutate(p.id)}>{tr('Restore this version')}</Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
