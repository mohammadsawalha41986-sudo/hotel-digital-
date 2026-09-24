import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BedDouble, Clock, MessageCircle, Phone, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEPARTMENT_LABELS, REQUEST_STATUS_LABELS, REQUEST_TYPES, REQUEST_TYPE_LABELS,
  type DepartmentCode, type RequestStatus, type RequestType,
} from '@shared/domain';
import { formatMoney } from '@shared/pricing';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Field, Select, Sheet, Skeleton, TextArea, TextInput, cx } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';
import { tr, L, locale, adminLang } from '../i18n';

interface Row {
  id: string;
  reference: string;
  type: RequestType;
  department: DepartmentCode;
  status: RequestStatus;
  priority: string;
  title_en: string;
  guest_type: string;
  guest_name: string;
  guest_phone: string;
  room: string;
  lang: string;
  total: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  line_count: number;
}

interface Detail {
  request: Row & {
    title_ar: string;
    lines: { quantity?: number; name_en: string; name_ar: string; detail_en?: string; amount?: number }[];
    details: { facts?: { label_en: string; value: string }[]; attachment?: string } & Record<string, unknown>;
    notes: string;
    subtotal: number | null;
    vat: number | null;
    whatsapp_to: string;
    whatsapp_url: string | null;
    accepted_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    rejected_at: string | null;
    cancelled_at: string | null;
  };
  events: { id: string; from_status: string | null; to_status: string | null; note: string; is_internal: boolean; created_at: string; user_name: string | null }[];
  transitions: RequestStatus[];
}

export const STATUS_TONE: Record<RequestStatus, 'info' | 'warning' | 'success' | 'danger' | 'neutral' | 'brand'> = {
  NEW: 'info',
  ACCEPTED: 'brand',
  IN_PROGRESS: 'warning',
  READY: 'brand',
  COMPLETED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

const ACTION_LABEL: Record<RequestStatus, string> = {
  NEW: 'Reopen',
  ACCEPTED: 'Accept',
  IN_PROGRESS: 'Start',
  READY: 'Mark ready',
  COMPLETED: 'Complete',
  REJECTED: 'Decline',
  CANCELLED: 'Cancel',
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} h ${m % 60} min ago`;
  return new Date(iso).toLocaleString(locale());
};

export function Requests({ hid }: { hid: string }) {
  const me = useMe();
  const depts = me.data?.permissions?.departments ?? [];
  const [status, setStatus] = useState('OPEN');
  const [department, setDepartment] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  // Deep link from the notification bell: ?open=<request id>
  const [url, setUrl] = useSearchParams();
  const [openId, setOpenIdState] = useState<string | null>(url.get('open'));
  const setOpenId = (id: string | null) => {
    setOpenIdState(id);
    if (!id && url.has('open')) {
      url.delete('open');
      setUrl(url, { replace: true });
    }
  };
  useEffect(() => {
    const id = url.get('open');
    if (id) setOpenIdState(id);
  }, [url]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ status, department, type, search: debounced });
  const q = useQuery({
    queryKey: ['requests', hid, status, department, type, debounced],
    queryFn: () => api<{ requests: Row[]; open_counts: Record<string, number> }>(`/admin/hotels/${hid}/requests?${params}`),
    refetchInterval: 10_000,
  });
  const awaiting = q.data?.open_counts.NEW ?? 0;
  useEffect(() => {
    document.title = awaiting ? `(${awaiting}) Requests · Guest Hub` : 'Requests · Guest Hub';
    return () => {
      document.title = 'Guest Hub Admin';
    };
  }, [awaiting]);

  return (
    <>
      <PageHeader
        title={tr('Requests')}
        description={tr('Live queue of orders, service requests, bookings and feedback. Refreshes every 10 seconds.')}
        actions={
          <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => q.refetch()} loading={q.isFetching}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />{' '}{tr('Refresh')}</Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,12rem))_1fr]">
        <div>
          <label htmlFor="rq-status" className="sr-only">{tr('Status')}</label>
          <Select id="rq-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg text-sm">
            <option value="OPEN">{tr('Open ({0})', { 0: (q.data?.open_counts.NEW ?? 0) + (q.data?.open_counts.ACCEPTED ?? 0) + (q.data?.open_counts.IN_PROGRESS ?? 0) })}</option>
            <option value="ALL">{tr('All statuses')}</option>
            {Object.keys(REQUEST_STATUS_LABELS).map((s) => (
              <option key={s} value={s}>
                {L(REQUEST_STATUS_LABELS[s as RequestStatus])}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="rq-dept" className="sr-only">{tr('Department')}</label>
          <Select id="rq-dept" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-10 rounded-lg text-sm">
            <option value="ALL">{tr('All my departments')}</option>
            {depts.map((d) => (
              <option key={d} value={d}>
                {L(DEPARTMENT_LABELS[d])}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="rq-type" className="sr-only">{tr('Type')}</label>
          <Select id="rq-type" value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-lg text-sm">
            <option value="ALL">{tr('All types')}</option>
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {L(REQUEST_TYPE_LABELS[t])}
              </option>
            ))}
          </Select>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <TextInput aria-label={tr('Search requests')} placeholder={tr('Reference, room, guest, phone…')} value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-lg ps-9 text-sm" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        {q.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : q.error ? (
          <ErrorState title={tr('Could not load requests')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data!.requests.length ? (
          <EmptyState title={status === 'OPEN' ? tr('All caught up') : tr('No requests match these filters')} description={status === 'OPEN' ? tr('New guest requests will appear here automatically.') : undefined} />
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {q.data!.requests.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpenId(r.id)} className={cx('grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 text-start transition hover:bg-zinc-50 sm:grid-cols-[8.5rem_1fr_10rem_8rem_auto]', r.status === 'NEW' && 'bg-sky-50/40')}>
                  <span className="font-mono text-sm font-semibold">{r.reference}</span>
                  <span className="order-first min-w-0 sm:order-none">
                    <span className="flex items-center gap-2">
                      {r.priority === 'HIGH' && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label={tr('High priority')} />}
                      <span className="truncate font-medium">{r.title_en}</span>
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {L(REQUEST_TYPE_LABELS[r.type])} · {L(DEPARTMENT_LABELS[r.department])}
                      {r.line_count > 1 ? tr(' · {0} items', { 0: r.line_count }) : ''}
                    </span>
                  </span>
                  <span className="truncate text-sm">
                    {r.room ? (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <BedDouble className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" /> {r.room}
                      </span>
                    ) : (
                      <span className="text-zinc-500">{tr('Visitor')}</span>
                    )}{' '}
                    · {r.guest_name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {ago(r.created_at)}
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    {r.total ? <span className="hidden text-sm tabular-nums text-zinc-600 md:inline">{formatMoney(r.total, r.currency, adminLang())}</span> : null}
                    <Badge tone={STATUS_TONE[r.status]}>{L(REQUEST_STATUS_LABELS[r.status])}</Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <RequestDrawer hid={hid} id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function RequestDrawer({ hid, id, onClose }: { hid: string; id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const fb = useFeedback();
  const [note, setNote] = useState('');
  const [guestMsg, setGuestMsg] = useState('');
  const [internal, setInternal] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ['request', hid, id], queryFn: () => api<Detail>(`/admin/hotels/${hid}/requests/${id}`), enabled: !!id, refetchInterval: 15_000 });

  useEffect(() => {
    setNote('');
    setGuestMsg('');
    setInternal('');
    setErrors({});
  }, [id]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['request', hid, id] });
    qc.invalidateQueries({ queryKey: ['requests', hid] });
    qc.invalidateQueries({ queryKey: ['analytics', hid] });
  };
  const status = useMutation({
    mutationFn: (s: RequestStatus) => api(`/admin/hotels/${hid}/requests/${id}/status`, { method: 'POST', body: { status: s, note, guest_message: guestMsg } }),
    onSuccess: (_d, s) => {
      fb.success(tr('Request {0}', { 0: L(REQUEST_STATUS_LABELS[s]).toLowerCase() }));
      setNote('');
      setGuestMsg('');
      setErrors({});
      refresh();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
      refresh();
    },
  });
  const addNote = useMutation({
    mutationFn: () => api(`/admin/hotels/${hid}/requests/${id}/notes`, { method: 'POST', body: { note: internal, internal: true } }),
    onSuccess: () => {
      setInternal('');
      refresh();
    },
    onError: (e) => fb.error(errorMessage(e)),
  });

  const d = q.data;
  const r = d?.request;
  const money = (v: number | null | undefined) => (v == null ? '' : formatMoney(v, r?.currency ?? 'SAR', adminLang()));
  const guestWa = r?.guest_phone ? `https://wa.me/${r.guest_phone.replace(/\D/g, '')}` : null;

  return (
    <Sheet open={!!id} onClose={onClose} side="right" title={r ? `${r.reference} · ${r.title_en}` : tr('Request')} description={r ? `${L(REQUEST_TYPE_LABELS[r.type])} → ${L(DEPARTMENT_LABELS[r.department])}` : undefined}>
      {q.isLoading || !r ? (
        q.error ? <ErrorState title={tr('Could not load')} description={errorMessage(q.error)} /> : <Skeleton className="h-64" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[r.status]}>{L(REQUEST_STATUS_LABELS[r.status])}</Badge>
            {r.priority === 'HIGH' && <Badge tone="warning">{tr('High priority')}</Badge>}
            <span className="text-xs text-zinc-500">{tr('Received')}{' '}{new Date(r.created_at).toLocaleString(locale())}{' '}{tr('· guest language')}{' '}{r.lang.toUpperCase()}</span>
          </div>

          <section className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">{tr('Guest')}</p>
              <p className="font-semibold">{r.guest_name}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{tr('Room')}</p>
              <p className="font-semibold">{r.room || tr('External visitor')}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">{tr('Phone')}</p>
              {r.guest_phone ? (
                <div className="flex items-center gap-2">
                  <a href={`tel:${r.guest_phone}`} className="inline-flex items-center gap-1 font-semibold" dir="ltr">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {r.guest_phone}
                  </a>
                  {guestWa && (
                    <a href={guestWa} target="_blank" rel="noopener noreferrer" aria-label={tr('WhatsApp the guest')} className="text-emerald-600">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-zinc-500">—</p>
              )}
            </div>
          </section>

          {r.lines.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">{tr('Items')}</h3>
              <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.07]">
                {r.lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>
                      <span className="font-medium">
                        {l.quantity ? `${l.quantity} × ` : ''}
                        {l.name_en}
                      </span>
                      {l.detail_en && <span className="block text-zinc-500">{l.detail_en}</span>}
                    </span>
                    <span className="tabular-nums">{l.amount ? money(l.amount) : ''}</span>
                  </li>
                ))}
              </ul>
              {r.total != null && (
                <dl className="mt-2 space-y-0.5 px-1 text-sm">
                  <div className="flex justify-between text-zinc-500"><dt>{tr('Subtotal')}</dt><dd className="tabular-nums">{money(r.subtotal)}</dd></div>
                  <div className="flex justify-between text-zinc-500"><dt>{tr('VAT')}</dt><dd className="tabular-nums">{money(r.vat)}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>{tr('Estimated total')}</dt><dd className="tabular-nums">{money(r.total)}</dd></div>
                </dl>
              )}
            </section>
          )}

          {(r.details.facts?.length || r.notes) && (
            <section className="space-y-1.5 text-sm">
              {r.details.facts?.map((f, i) => (
                <p key={i}>
                  <span className="text-zinc-500">{f.label_en}:</span>{' '}
                  {f.label_en === 'Attachment' ? (
                    <a href={f.value} target="_blank" rel="noopener noreferrer" className="font-medium underline">{tr('View photo')}</a>
                  ) : (
                    <span className="font-medium">{f.value}</span>
                  )}
                </p>
              ))}
              {r.notes && (
                <p className="rounded-lg bg-amber-50 px-3 py-2">
                  <span className="text-amber-800">{r.type === 'FEEDBACK' ? tr('Message') : tr('Guest notes')}:</span> {r.notes}
                </p>
              )}
            </section>
          )}

          <section className="text-sm">
            <h3 className="mb-1 font-semibold">{tr('WhatsApp routing')}</h3>
            {r.whatsapp_to ? (
              <p className="text-zinc-600">{tr('Routed to')}{' '}<span dir="ltr" className="font-medium">{r.whatsapp_to}</span>.{' '}
                {r.whatsapp_url && (
                  <a href={r.whatsapp_url} target="_blank" rel="noopener noreferrer" className="font-medium underline">{tr('Open message')}</a>
                )}
              </p>
            ) : (
              <p className="text-amber-700">{tr('No WhatsApp number is configured for this department — the request is only in this queue.')}</p>
            )}
          </section>

          {d!.transitions.length > 0 && (
            <section className="space-y-3 rounded-xl border border-black/[0.07] p-4">
              <h3 className="text-sm font-semibold">{tr('Update status')}</h3>
              <Field label={tr('Internal note (staff only)')} htmlFor="rq-note" error={errors.note}>
                <TextArea id="rq-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg text-sm" placeholder={tr('Required when declining')} />
              </Field>
              <Field label={tr('Message to guest (shown on their request page)')} htmlFor="rq-guest">
                <TextInput id="rq-guest" value={guestMsg} onChange={(e) => setGuestMsg(e.target.value)} className="h-10 rounded-lg text-sm" placeholder={tr('e.g. Your order will arrive in 20 minutes')} />
              </Field>
              <div className="flex flex-wrap gap-2">
                {d!.transitions.map((s) => (
                  <Button key={s} size="sm" className="rounded-lg" variant={s === 'REJECTED' || s === 'CANCELLED' ? 'secondary' : 'primary'} loading={status.isPending && status.variables === s} onClick={() => status.mutate(s)}>
                    {L(ACTION_LABEL[s])}
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">{tr('Timeline')}</h3>
            <ol className="space-y-3 border-s border-black/10 ps-4">
              {d!.events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -start-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-zinc-400" aria-hidden="true" />
                  <p>
                    {e.to_status ? <strong>{e.from_status ? `${e.from_status} → ` : ''}{e.to_status}</strong> : <strong>{tr('Note')}</strong>}
                    {!e.is_internal && <Badge tone="info" className="ms-2">{tr('Visible to guest')}</Badge>}
                  </p>
                  {e.note && <p className="text-zinc-700">{e.note}</p>}
                  <p className="text-xs text-zinc-500">
                    {new Date(e.created_at).toLocaleString(locale())} {e.user_name ? `· ${e.user_name}` : tr('· Guest')}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex gap-2">
              <TextInput aria-label={tr('Add internal note')} value={internal} onChange={(e) => setInternal(e.target.value)} placeholder={tr('Add an internal note…')} className="h-10 rounded-lg text-sm" />
              <Button size="sm" className="h-10 rounded-lg" disabled={!internal.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()}>{tr('Add')}</Button>
            </div>
          </section>
        </div>
      )}
    </Sheet>
  );
}
