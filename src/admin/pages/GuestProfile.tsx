import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Pencil, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Field, Select, Sheet, Skeleton, TextArea, TextInput, Toggle, cx } from '../../components/ui';
import { FinancialStatus, Kpi, KpiGrid, OrderStatus, dateOnly, dateTime, deptLabel, major, money, typeLabel } from '../commerce/kit';
import { OrderDetailSheet } from '../commerce/OrderDetail';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { Card, PageHeader } from '../layout/AdminLayout';

interface Profile {
  guest: {
    id: string;
    guest_no: string;
    guest_type: string;
    name: string;
    phone: string;
    country_code: string;
    email: string;
    preferred_lang: string;
    consent_marketing: boolean;
    notes: string;
    created_at: string;
    last_activity_at: string;
    merged: boolean;
    anonymized: boolean;
    merged_into: string | null;
  };
  current_stay: Stay | null;
  stays: Stay[];
  summary: { total_orders: number; completed_orders: number; pending_orders: number; cancelled_orders: number; total_value: number; average_value: number | null; total_requests: number; last_activity: string | null };
  service_history: { order_type: string; department: string; n: number; completed: number; cancelled: number; value: number }[];
  most_used: { name_en: string; qty: number; orders: number }[];
  orders: { id: string; reference: string; order_type: string; department: string; status: string; title_en: string; total: number | null; currency: string; financial_status: string; created_at: string }[];
  relations: { complaints: Rel[]; suggestions: Rel[]; reviews: { id: string; rating: number; title: string; body: string; status: string; created_at: string }[]; notes: string };
  timeline: { at: string; kind: string; title: string; reference?: string; request_id?: string; detail?: string }[];
  commission: { reference: string; entry_type: string; commission_minor: number; earned_at: string }[];
}
interface Stay {
  id: string;
  guest_type: string;
  room: string;
  check_in: string | null;
  check_out: string | null;
  stay_reference: string;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
}
interface Rel {
  id: string;
  reference: string;
  title_en: string;
  status: string;
  feedback_type: string;
  subject: string;
  notes: string;
  created_at: string;
}

const KIND_DOT: Record<string, string> = { session: 'bg-sky-500', stay: 'bg-violet-500', created: 'bg-zinc-800', status: 'bg-zinc-400', financial: 'bg-emerald-500', refunded: 'bg-amber-500', adjusted: 'bg-amber-500', review: 'bg-pink-500' };

export function GuestProfilePage({ hid }: { hid: string }) {
  const { gid = '' } = useParams();
  const me = useMe();
  const fb = useFeedback();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['guest', hid, gid], queryFn: () => api<Profile>(`/admin/hotels/${hid}/guests/${gid}`) });
  const [editing, setEditing] = useState(false);
  const [stayEdit, setStayEdit] = useState<Stay | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const canErase = me.data?.user && ['SUPER_ADMIN', 'HOTEL_ADMIN'].includes(me.data.user.role);
  const canOrders = me.data?.permissions?.modules.includes('orders');

  if (q.isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (q.error) return <ErrorState title="Could not load this guest" description={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const p = q.data!;
  const g = p.guest;
  const locked = g.anonymized || g.merged;

  return (
    <>
      <Link to={`/admin/h/${hid}/guests`} className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Guests
      </Link>
      <PageHeader
        title={g.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{g.guest_no}</span>
            <Badge tone={g.guest_type === 'IN_HOUSE' ? 'brand' : 'neutral'}>{g.guest_type === 'IN_HOUSE' ? 'In-house' : 'External visitor'}</Badge>
            {g.anonymized && <Badge tone="danger">Anonymised</Badge>}
            {g.merged && <Badge tone="warning">Merged into another profile</Badge>}
          </span>
        }
        actions={
          <>
            {!locked && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
              </Button>
            )}
            <a className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium hover:bg-zinc-50" href={`/api/admin/hotels/${hid}/guests/${gid}/export`} download>
              <Download className="h-4 w-4" aria-hidden="true" /> Export data
            </a>
            {canErase && !g.anonymized && (
              <Button size="sm" variant="secondary" onClick={() => setErasing(true)}>
                <ShieldOff className="h-4 w-4" aria-hidden="true" /> Anonymise
              </Button>
            )}
          </>
        }
      />
      {g.merged && g.merged_into && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          This profile was merged. <Link className="font-medium underline" to={`/admin/h/${hid}/guests/${g.merged_into}`}>Open the current profile</Link>.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <Card title="Overview">
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <Item label="Mobile"><span dir="ltr">{g.phone || '—'}</span>{g.country_code && <span className="text-xs text-zinc-500"> (+{g.country_code})</span>}</Item>
              <Item label="Email">{g.email || '—'}</Item>
              <Item label="Language">{g.preferred_lang === 'ar' ? 'العربية' : 'English'}</Item>
              <Item label="Current stay">
                {p.current_stay ? (
                  <span>
                    {p.current_stay.guest_type === 'IN_HOUSE' ? `Room ${p.current_stay.room}` : 'Visit'}
                    {p.current_stay.check_in && ` · ${dateOnly(p.current_stay.check_in)}`}
                    {p.current_stay.check_out && ` → ${dateOnly(p.current_stay.check_out)}`}
                  </span>
                ) : (
                  '—'
                )}
              </Item>
              <Item label="Guest since">{dateTime(g.created_at)}</Item>
              <Item label="Last activity">{dateTime(g.last_activity_at)}</Item>
              <Item label="Marketing consent">{g.consent_marketing ? 'Given' : 'Not given'}</Item>
            </dl>
          </Card>

          <KpiGrid>
            <Kpi label="Total orders" value={p.summary.total_orders} />
            <Kpi label="Completed" value={p.summary.completed_orders} />
            <Kpi label="Pending" value={p.summary.pending_orders} />
            <Kpi label="Cancelled / declined" value={p.summary.cancelled_orders} />
            <Kpi label="Total order value" value={major(p.summary.total_value)} />
            <Kpi label="Average order value" value={major(p.summary.average_value)} />
            <Kpi label="All requests" value={p.summary.total_requests} hint="Including free services and feedback" />
            {p.commission.length > 0 && <Kpi label="Commission generated" value={money(p.commission.reduce((s, c) => s + c.commission_minor, 0))} />}
          </KpiGrid>

          <Card title="Service history">
            {p.service_history.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-zinc-500">
                    <tr>
                      <th className="py-1.5 font-medium">Service</th>
                      <th className="py-1.5 font-medium">Department</th>
                      <th className="py-1.5 text-right font-medium">Requests</th>
                      <th className="py-1.5 text-right font-medium">Completed</th>
                      <th className="py-1.5 text-right font-medium">Cancelled</th>
                      <th className="py-1.5 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {p.service_history.map((s, i) => (
                      <tr key={i}>
                        <td className="py-2">{typeLabel(s.order_type)}</td>
                        <td className="py-2">{deptLabel(s.department)}</td>
                        <td className="py-2 text-right tabular-nums">{s.n}</td>
                        <td className="py-2 text-right tabular-nums">{s.completed}</td>
                        <td className="py-2 text-right tabular-nums">{s.cancelled}</td>
                        <td className="py-2 text-right tabular-nums">{major(s.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No orders or service requests yet.</p>
            )}
            {p.most_used.length > 0 && (
              <p className="mt-4 text-sm">
                <span className="text-zinc-500">Most used: </span>
                {p.most_used.map((m) => `${m.name_en} (${m.orders})`).join(' · ')}
              </p>
            )}
          </Card>

          <Card title="Orders & requests">
            {p.orders.length ? (
              <ul className="divide-y divide-black/[0.06]">
                {p.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      {canOrders ? (
                        <button type="button" className="font-mono font-semibold hover:underline" onClick={() => setOrderId(o.id)}>{o.reference}</button>
                      ) : (
                        <span className="font-mono font-semibold">{o.reference}</span>
                      )}
                      <p className="truncate text-zinc-600">{o.title_en} · {typeLabel(o.order_type)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OrderStatus status={o.status} />
                      {o.financial_status !== 'NOT_APPLICABLE' && <FinancialStatus status={o.financial_status} />}
                      <span className="w-24 text-right tabular-nums">{major(o.total, o.currency)}</span>
                      <span className="hidden text-xs text-zinc-500 sm:inline">{dateTime(o.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No orders yet" />
            )}
          </Card>

          <Card title="Guest relations">
            <div className="grid gap-4 sm:grid-cols-3">
              <RelList title="Complaints" items={p.relations.complaints} />
              <RelList title="Suggestions & compliments" items={p.relations.suggestions} />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Reviews ({p.relations.reviews.length})</h3>
                {p.relations.reviews.length ? (
                  <ul className="space-y-2 text-sm">
                    {p.relations.reviews.map((r) => (
                      <li key={r.id}>
                        <span className="font-medium">{'★'.repeat(r.rating)}</span> {r.title}
                        <p className="text-xs text-zinc-500">{r.status.toLowerCase()} · {dateOnly(r.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">None</p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm">
              <p className="text-xs font-medium text-zinc-500">Staff notes</p>
              <p className="whitespace-pre-wrap">{p.relations.notes || '—'}</p>
            </div>
          </Card>

          <Card title="Stays & visits">
            <ul className="divide-y divide-black/[0.06] text-sm">
              {p.stays.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {s.guest_type === 'IN_HOUSE' ? `Room ${s.room}` : 'Visit'}
                    {s.stay_reference && <span className="text-zinc-500"> · ref {s.stay_reference}</span>}
                    <span className="block text-xs text-zinc-500">
                      {s.check_in ? `${dateOnly(s.check_in)} → ${dateOnly(s.check_out)}` : `Seen ${dateTime(s.started_at)} – ${dateTime(s.last_seen_at)}`}
                      {s.ended_at ? ' · ended' : ' · current'}
                    </span>
                  </span>
                  {!locked && <Button size="sm" variant="secondary" onClick={() => setStayEdit(s)}>Edit stay</Button>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="Timeline" className="h-fit xl:sticky xl:top-6">
          {p.timeline.length ? (
            <ol className="relative max-h-[70vh] space-y-3 overflow-y-auto border-s border-zinc-200 ps-4">
              {[...p.timeline].reverse().map((t, i) => (
                <li key={i} className="text-sm">
                  <span className={cx('absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white', KIND_DOT[t.kind] ?? 'bg-zinc-300')} aria-hidden="true" />
                  <p className="text-xs text-zinc-500 tabular-nums">{dateTime(t.at)}</p>
                  <p className="font-medium">{t.title}</p>
                  {t.detail && <p className="text-xs text-zinc-500">{t.detail}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-zinc-500">No activity yet.</p>
          )}
        </Card>
      </div>

      <EditGuest hid={hid} open={editing} onClose={() => setEditing(false)} guest={g} onSaved={() => q.refetch()} />
      <EditStay hid={hid} gid={gid} stay={stayEdit} onClose={() => setStayEdit(null)} onSaved={() => q.refetch()} />
      <OrderDetailSheet open={!!orderId} onClose={() => setOrderId(null)} apiPath={orderId ? `/admin/hotels/${hid}/orders/${orderId}` : null} />
      <EraseSheet
        open={erasing}
        onClose={() => setErasing(false)}
        onConfirm={async (reason) => {
          try {
            await api(`/admin/hotels/${hid}/guests/${gid}/anonymize`, { method: 'POST', body: { reason, confirm: true } });
            fb.success('Personal data erased');
            qc.invalidateQueries({ queryKey: ['guests', hid] });
            setErasing(false);
            q.refetch();
          } catch (e) {
            fb.error(errorMessage(e));
          }
        }}
      />
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function RelList({ title, items }: { title: string; items: Rel[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title} ({items.length})</h3>
      {items.length ? (
        <ul className="space-y-2 text-sm">
          {items.map((c) => (
            <li key={c.id}>
              <p className="font-medium">{c.subject || c.title_en}</p>
              <p className="text-xs text-zinc-500"><span className="font-mono">{c.reference}</span> · {c.status.toLowerCase().replace('_', ' ')} · {dateOnly(c.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">None</p>
      )}
    </div>
  );
}

function EditGuest({ hid, open, onClose, guest, onSaved }: { hid: string; open: boolean; onClose: () => void; guest: Profile['guest']; onSaved: () => void }) {
  const fb = useFeedback();
  const [v, setV] = useState({ name: guest.name, phone: guest.phone, email: guest.email, preferred_lang: guest.preferred_lang, consent_marketing: guest.consent_marketing, notes: guest.notes });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api<{ changed: boolean }>(`/admin/hotels/${hid}/guests/${guest.id}`, { method: 'PATCH', body: v }),
    onSuccess: (r) => {
      fb.success(r.changed ? 'Guest updated' : 'No changes to save');
      onSaved();
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      if (!(e instanceof ApiError) || !Object.keys(e.fields).length) fb.error(errorMessage(e));
    },
  });
  return (
    <Sheet open={open} onClose={onClose} title="Edit guest" size="md" footer={<div className="flex justify-end"><Button loading={m.isPending} onClick={() => m.mutate()}>Save</Button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="eg-name" error={errors.name}><TextInput id="eg-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Mobile" htmlFor="eg-phone" error={errors.phone}><TextInput id="eg-phone" dir="ltr" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
        <Field label="Email" htmlFor="eg-email" error={errors.email}><TextInput id="eg-email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
        <Field label="Language" htmlFor="eg-lang">
          <Select id="eg-lang" value={v.preferred_lang} onChange={(e) => setV({ ...v, preferred_lang: e.target.value })}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Toggle checked={v.consent_marketing} onChange={(c) => setV({ ...v, consent_marketing: c })} label="Guest agreed to receive offers" description="Record only what the guest has explicitly agreed to." />
        </div>
        <div className="sm:col-span-2">
          <Field label="Staff notes" htmlFor="eg-notes" hint="Preferences and service notes. No passport, ID or card details." error={errors.notes}>
            <TextArea id="eg-notes" rows={4} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

function EditStay({ hid, gid, stay, onClose, onSaved }: { hid: string; gid: string; stay: Stay | null; onClose: () => void; onSaved: () => void }) {
  const fb = useFeedback();
  const [v, setV] = useState({ room: '', check_in: '', check_out: '', stay_reference: '', ended: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState<string | null>(null);
  if (stay && loaded !== stay.id) {
    setLoaded(stay.id);
    setV({ room: stay.room, check_in: stay.check_in ?? '', check_out: stay.check_out ?? '', stay_reference: stay.stay_reference, ended: !!stay.ended_at });
  }
  const m = useMutation({
    mutationFn: () => api(`/admin/hotels/${hid}/guests/${gid}/stays/${stay!.id}`, { method: 'PATCH', body: { ...v, check_in: v.check_in || null, check_out: v.check_out || null } }),
    onSuccess: () => {
      fb.success('Stay updated');
      onSaved();
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      if (!(e instanceof ApiError) || !Object.keys(e.fields).length) fb.error(errorMessage(e));
    },
  });
  return (
    <Sheet open={!!stay} onClose={onClose} title="Edit stay" size="sm" footer={<div className="flex justify-end"><Button loading={m.isPending} onClick={() => m.mutate()}>Save</Button></div>}>
      <div className="grid gap-4">
        <Field label="Room" htmlFor="es-room" error={errors.room}><TextInput id="es-room" value={v.room} onChange={(e) => setV({ ...v, room: e.target.value })} /></Field>
        <Field label="Check-in" htmlFor="es-in" error={errors.check_in}><TextInput id="es-in" type="date" value={v.check_in} onChange={(e) => setV({ ...v, check_in: e.target.value })} /></Field>
        <Field label="Check-out" htmlFor="es-out" error={errors.check_out}><TextInput id="es-out" type="date" value={v.check_out} onChange={(e) => setV({ ...v, check_out: e.target.value })} /></Field>
        <Field label="Stay / PMS reference" htmlFor="es-ref"><TextInput id="es-ref" value={v.stay_reference} onChange={(e) => setV({ ...v, stay_reference: e.target.value })} /></Field>
        <Toggle checked={v.ended} onChange={(c) => setV({ ...v, ended: c })} label="Stay has ended" />
      </div>
    </Sheet>
  );
}

function EraseSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Anonymise guest"
      description="Erases name, phone, email, notes and free-text answers from this profile and its orders. Order records and financial figures stay, without personal data."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            disabled={!ok || reason.trim().length < 3}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm(reason);
              setBusy(false);
            }}
          >
            Erase personal data
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Legal basis / request reference" htmlFor="er-reason" required>
          <TextArea id="er-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Erasure request received by email on …" />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1" />
          I understand this cannot be undone.
        </label>
      </div>
    </Sheet>
  );
}
