import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Select, Skeleton } from '../../components/ui';
import { PageHeader } from '../layout/AdminLayout';
import { tr, locale } from '../i18n';

interface Entry {
  id: number;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  before: unknown;
  after: unknown;
  created_at: string;
}

const ENTITY_FILTERS = ['', 'request', 'menu_items', 'outlets', 'offers', 'room_services', 'hotel_services', 'spa_services', 'laundry_items', 'website', 'website_draft', 'branding', 'hotel_profile', 'department_routing', 'user', 'review', 'media', 'menu'];

export function AuditLog({ hid }: { hid: string }) {
  const [entity, setEntity] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const q = useInfiniteQuery({
    queryKey: ['audit', hid, entity],
    initialPageParam: '',
    queryFn: ({ pageParam }) => api<{ entries: Entry[] }>(`/admin/hotels/${hid}/audit?entity=${entity}&before=${pageParam}`).then((r) => r.entries),
    getNextPageParam: (last) => (last.length === 100 ? String(last[last.length - 1].id) : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  return (
    <>
      <PageHeader title={tr('Audit log')} description={tr('Who changed what and when — prices, menus, routing, publishing, request status and more. Entries cannot be edited.')} />
      <div className="mb-4 w-64">
        <label htmlFor="audit-entity" className="sr-only">{tr('Filter')}</label>
        <Select id="audit-entity" value={entity} onChange={(e) => setEntity(e.target.value)} className="h-10 rounded-lg text-sm">
          {ENTITY_FILTERS.map((e) => (
            <option key={e} value={e}>
              {e ? e.replace(/_/g, ' ') : tr('All changes')}
            </option>
          ))}
        </Select>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : q.error ? (
        <ErrorState title={tr('Could not load the audit log')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !rows.length ? (
        <div className="rounded-2xl border border-black/[0.07] bg-white">
          <EmptyState title={tr('No entries')} />
        </div>
      ) : (
        <div className="rounded-2xl border border-black/[0.07] bg-white">
          <ul className="divide-y divide-black/[0.06]">
            {rows.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <button type="button" className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-start" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
                  <span className="w-40 shrink-0 text-xs text-zinc-500">{new Date(e.created_at).toLocaleString(locale())}</span>
                  <Badge tone={e.action === 'delete' ? 'danger' : e.action === 'publish' ? 'success' : 'neutral'}>{e.action}</Badge>
                  <span className="min-w-0 flex-1 font-medium">{e.summary || `${e.entity} ${e.entity_id ?? ''}`}</span>
                  <span className="text-xs text-zinc-500">{e.user_email || 'system'}</span>
                </button>
                {open === e.id && (e.before != null || e.after != null) && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs">{JSON.stringify(e.before, null, 2)}</pre>
                    <pre className="max-h-64 overflow-auto rounded-lg bg-emerald-50/60 p-3 text-xs">{JSON.stringify(e.after, null, 2)}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {q.hasNextPage && (
            <div className="border-t border-black/[0.06] p-3 text-center">
              <Button variant="secondary" size="sm" className="rounded-lg" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{tr('Load older entries')}</Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
