import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitMerge, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Field, Segmented, Select, Sheet, Skeleton, TextArea, TextInput } from '../../components/ui';
import { dateTime, major, useDebounced } from '../commerce/kit';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';
import { tr } from '../i18n';

interface GuestRow {
  id: string;
  guest_no: string;
  guest_type: 'IN_HOUSE' | 'EXTERNAL';
  name: string;
  phone: string;
  email: string;
  room: string | null;
  orders: number;
  value: number;
  last_activity_at: string;
  anonymized: boolean;
}

interface DuplicatePair {
  a_id: string;
  a_no: string;
  a_name: string;
  a_phone: string;
  b_id: string;
  b_no: string;
  b_name: string;
  b_phone: string;
  reasons: string[];
}

const REASON: Record<string, string> = { same_phone: 'Same phone', same_email: 'Same email', same_name_and_room: 'Same name and room' };

export function Guests({ hid }: { hid: string }) {
  const [tab, setTab] = useState<'all' | 'duplicates'>('all');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [adding, setAdding] = useState(false);
  const s = useDebounced(search);
  const q = useQuery({
    queryKey: ['guests', hid, s, type],
    queryFn: () => api<{ guests: GuestRow[]; total: number }>(`/admin/hotels/${hid}/guests?${new URLSearchParams({ search: s, type, limit: '100' })}`),
    enabled: tab === 'all',
  });
  return (
    <>
      <PageHeader
        title={tr('Guests')}
        description={tr('One profile per guest, built from QR sessions, orders and requests. Profiles are matched on phone number and name — never on a similar name alone.')}
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />{' '}{tr('Add guest')}</Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-72">
          <Segmented label={tr('View')} value={tab} onChange={setTab} options={[{ value: 'all', label: tr('All guests') }, { value: 'duplicates', label: tr('Possible duplicates') }]} />
        </div>
        {tab === 'all' && (
          <>
            <TextInput aria-label={tr('Search guests')} placeholder={tr('Name, phone, room, guest ID, stay reference…')} value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 max-w-md rounded-lg text-sm" />
            <Select aria-label={tr('Guest type')} value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-44 rounded-lg text-sm">
              <option value="ALL">{tr('All guests')}</option>
              <option value="IN_HOUSE">{tr('In-house')}</option>
              <option value="EXTERNAL">{tr('External visitors')}</option>
            </Select>
          </>
        )}
      </div>
      {tab === 'duplicates' ? (
        <Duplicates hid={hid} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
          {q.isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : q.error ? (
            <ErrorState title={tr('Could not load guests')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : !q.data!.guests.length ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title={s ? tr('No guest matches this search') : tr('No guests yet')} description={s ? undefined : tr('Profiles appear when guests identify themselves through the QR portal or when staff add them.')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="border-b border-black/[0.06] bg-zinc-50 text-start text-xs text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">{tr('Guest')}</th>
                    <th className="px-4 py-2.5 font-medium">{tr('Contact')}</th>
                    <th className="px-4 py-2.5 font-medium">{tr('Stay')}</th>
                    <th className="px-4 py-2.5 text-end font-medium">{tr('Orders')}</th>
                    <th className="px-4 py-2.5 text-end font-medium">{tr('Completed value')}</th>
                    <th className="px-4 py-2.5 font-medium">{tr('Last activity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {q.data!.guests.map((g) => (
                    <tr key={g.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5">
                        <Link to={`/admin/h/${hid}/guests/${g.id}`} className="font-medium underline-offset-2 hover:underline">{g.name}</Link>
                        <p className="font-mono text-xs text-zinc-500">{g.guest_no}{g.anonymized && tr(' · anonymised')}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p dir="ltr" className="text-start">{g.phone || '—'}</p>
                        <p className="truncate text-xs text-zinc-500">{g.email}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={g.guest_type === 'IN_HOUSE' ? 'brand' : 'neutral'}>{g.guest_type === 'IN_HOUSE' ? tr('In-house{0}', { 0: g.room ? ` · ${g.room}` : '' }) : tr('Visitor')}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-end tabular-nums">{g.orders}</td>
                      <td className="px-4 py-2.5 text-end tabular-nums">{major(g.value)}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500">{dateTime(g.last_activity_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <AddGuest hid={hid} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function Duplicates({ hid }: { hid: string }) {
  const q = useQuery({ queryKey: ['guest-duplicates', hid], queryFn: () => api<{ pairs: DuplicatePair[] }>(`/admin/hotels/${hid}/guests/duplicates`) });
  const [merging, setMerging] = useState<DuplicatePair | null>(null);
  if (q.isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (q.error) return <ErrorState title={tr('Could not check for duplicates')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data!.pairs.length) return <EmptyState icon={<GitMerge className="h-6 w-6" />} title={tr('No possible duplicates')} description={tr('Profiles that share a phone, an email, or a name and room are listed here for review.')} />;
  return (
    <>
      <p className="mb-3 text-sm text-zinc-500">{tr('Nothing is merged automatically. People can share a phone (family members); merge only when you have confirmed it is the same person.')}</p>
      <ul className="space-y-2">
        {q.data!.pairs.map((p) => (
          <li key={`${p.a_id}-${p.b_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.07] bg-white p-4">
            <div className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
              {[['a', p.a_id, p.a_no, p.a_name, p.a_phone], ['b', p.b_id, p.b_no, p.b_name, p.b_phone]].map(([k, id, no, name, phone]) => (
                <div key={k}>
                  <Link to={`/admin/h/${hid}/guests/${id}`} className="font-medium hover:underline">{name}</Link>
                  <p className="text-xs text-zinc-500"><span className="font-mono">{no}</span> · <span dir="ltr">{phone || tr('no phone')}</span></p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {p.reasons.map((r) => <Badge key={r} tone="warning">{REASON[r] ?? r}</Badge>)}
              <Button size="sm" variant="secondary" onClick={() => setMerging(p)}>
                <GitMerge className="h-4 w-4" aria-hidden="true" />{' '}{tr('Review merge')}</Button>
            </div>
          </li>
        ))}
      </ul>
      <MergeSheet hid={hid} pair={merging} onClose={() => setMerging(null)} />
    </>
  );
}

function MergeSheet({ hid, pair, onClose }: { hid: string; pair: DuplicatePair | null; onClose: () => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const [keep, setKeep] = useState<'a' | 'b'>('a');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const m = useMutation({
    mutationFn: () =>
      api(`/admin/hotels/${hid}/guests/merge`, {
        method: 'POST',
        body: { primary_id: keep === 'a' ? pair!.a_id : pair!.b_id, secondary_id: keep === 'a' ? pair!.b_id : pair!.a_id, reason, confirm: true },
      }),
    onSuccess: () => {
      fb.success(tr('Profiles merged'));
      qc.invalidateQueries({ queryKey: ['guest-duplicates', hid] });
      qc.invalidateQueries({ queryKey: ['guests', hid] });
      setReason('');
      setConfirm(false);
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.fields.reason ?? e.message : errorMessage(e)),
  });
  return (
    <Sheet
      open={!!pair}
      onClose={onClose}
      title={tr('Merge guest profiles')}
      description={tr('Orders, stays, sessions and reviews move to the profile you keep. The other profile remains as a pointer for the audit trail.')}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tr('Cancel')}</Button>
          <Button disabled={!confirm || reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate()}>{tr('Merge profiles')}</Button>
        </div>
      }
    >
      {pair && (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{tr('Keep this profile')}</legend>
            {(['a', 'b'] as const).map((k) => (
              <label key={k} className="mb-2 flex items-center gap-3 rounded-xl border border-black/10 p-3 text-sm">
                <input type="radio" name="keep" checked={keep === k} onChange={() => setKeep(k)} />
                <span>
                  <span className="font-medium">{k === 'a' ? pair.a_name : pair.b_name}</span>{' '}
                  <span className="font-mono text-xs text-zinc-500">{k === 'a' ? pair.a_no : pair.b_no}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Field label={tr('How did you confirm it is the same person?')} htmlFor="merge-reason" error={error} required>
            <TextArea id="merge-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('e.g. Confirmed with the guest at the front desk')} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" />{tr('I have verified these profiles belong to the same guest. This cannot be undone automatically.')}</label>
        </div>
      )}
    </Sheet>
  );
}

function AddGuest({ hid, open, onClose }: { hid: string; open: boolean; onClose: () => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const blank = { type: 'IN_HOUSE', name: '', phone: '', email: '', lang: 'en', room: '', stay_reference: '', check_in: '', check_out: '' };
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () =>
      api<{ guest: { id: string; guest_no: string }; created: boolean; matched_by: string }>(`/admin/hotels/${hid}/guests`, {
        method: 'POST',
        body: { ...v, check_in: v.check_in || null, check_out: v.check_out || null },
      }),
    onSuccess: (r) => {
      fb.success(r.created ? tr('Guest {0} created', { 0: r.guest.guest_no }) : tr('Matched existing guest {0} ({1})', { 0: r.guest.guest_no, 1: r.matched_by }));
      qc.invalidateQueries({ queryKey: ['guests', hid] });
      setV(blank);
      setErrors({});
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      if (!(e instanceof ApiError) || !Object.keys(e.fields).length) fb.error(errorMessage(e));
    },
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <Sheet open={open} onClose={onClose} title={tr('Add guest')} description={tr('If a guest with the same phone and a compatible name exists, that profile is updated instead.')} size="md" footer={<div className="flex justify-end"><Button loading={m.isPending} onClick={() => m.mutate()}>{tr('Save guest')}</Button></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr('Guest type')} htmlFor="ag-type">
          <Select id="ag-type" value={v.type} onChange={set('type')}>
            <option value="IN_HOUSE">{tr('In-house')}</option>
            <option value="EXTERNAL">{tr('External visitor')}</option>
          </Select>
        </Field>
        <Field label={tr('Preferred language')} htmlFor="ag-lang">
          <Select id="ag-lang" value={v.lang} onChange={set('lang')}>
            <option value="en">{tr('English')}</option>
            <option value="ar">العربية</option>
          </Select>
        </Field>
        <Field label={tr('Full name')} htmlFor="ag-name" error={errors.name} required>
          <TextInput id="ag-name" value={v.name} onChange={set('name')} invalid={!!errors.name} />
        </Field>
        <Field label={tr('Mobile')} htmlFor="ag-phone" error={errors.phone}>
          <TextInput id="ag-phone" type="tel" dir="ltr" placeholder={tr('05XXXXXXXX or +CC…')} value={v.phone} onChange={set('phone')} invalid={!!errors.phone} />
        </Field>
        <Field label={tr('Email (optional)')} htmlFor="ag-email" error={errors.email}>
          <TextInput id="ag-email" type="email" value={v.email} onChange={set('email')} invalid={!!errors.email} />
        </Field>
        {v.type === 'IN_HOUSE' && (
          <>
            <Field label={tr('Room')} htmlFor="ag-room" error={errors.room} required>
              <TextInput id="ag-room" value={v.room} onChange={set('room')} invalid={!!errors.room} />
            </Field>
            <Field label={tr('Check-in')} htmlFor="ag-in" error={errors.check_in}>
              <TextInput id="ag-in" type="date" value={v.check_in} onChange={set('check_in')} />
            </Field>
            <Field label={tr('Check-out')} htmlFor="ag-out" error={errors.check_out}>
              <TextInput id="ag-out" type="date" value={v.check_out} onChange={set('check_out')} />
            </Field>
            <Field label={tr('Stay / PMS reference')} htmlFor="ag-ref">
              <TextInput id="ag-ref" value={v.stay_reference} onChange={set('stay_reference')} />
            </Field>
          </>
        )}
      </div>
      <p className="mt-4 text-xs text-zinc-500">{tr('Do not record passport, ID or payment card details here.')}</p>
    </Sheet>
  );
}
