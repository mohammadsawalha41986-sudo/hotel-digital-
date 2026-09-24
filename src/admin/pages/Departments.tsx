import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DepartmentCode } from '@shared/domain';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, ErrorState, Field, Sheet, Skeleton, TextInput, Toggle } from '../../components/ui';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';
import { tr } from '../i18n';

interface Dept {
  code: DepartmentCode | string;
  is_custom?: boolean;
  name_en: string;
  name_ar: string;
  whatsapp: string;
  phone: string;
  email: string;
  is_active: boolean;
  sla_minutes: number | null;
}

const ROUTES: Record<DepartmentCode, string> = {
  FNB: 'Food orders from all outlets (unless an outlet has its own WhatsApp)',
  HOUSEKEEPING: 'Cleaning, linen, towels, amenities',
  MAINTENANCE: 'A/C, electrical, bathroom and other repairs',
  FRONT_OFFICE: 'Luggage, wake-up calls, parking, “other” requests',
  CONCIERGE: 'Airport transfer, transport, concierge',
  LAUNDRY: 'Laundry pickups',
  SPA: 'Spa & wellness booking requests',
  MANAGEMENT: 'Complaints, service recovery and urgent feedback',
  FEEDBACK: 'Suggestions and compliments',
};

export function Departments({ hid }: { hid: string }) {
  const qc = useQueryClient();
  const fb = useFeedback();
  const q = useQuery({ queryKey: ['departments', hid], queryFn: () => api<{ departments: Dept[] }>(`/admin/hotels/${hid}/departments`).then((r) => r.departments) });
  const [rows, setRows] = useState<Dept[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data) setRows(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => api(`/admin/hotels/${hid}/departments`, { method: 'PUT', body: { departments: rows } }),
    onSuccess: () => {
      setErrors({});
      fb.success(tr('Routing saved — new requests use these numbers'));
      qc.invalidateQueries({ queryKey: ['departments', hid] });
      qc.invalidateQueries({ queryKey: ['bundle'] });
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });

  const set = (i: number, d: Dept) => setRows(rows.map((x, j) => (j === i ? d : x)));
  const [adding, setAdding] = useState(false);
  const remove = async (d: Dept) => {
    const ok = await fb.confirm({ title: tr('Delete {0}?', { 0: d.name_en }), message: tr('Only possible while no service and no open request uses it.'), confirmLabel: tr('Delete'), danger: true });
    if (!ok) return;
    try {
      await api(`/admin/hotels/${hid}/departments/${d.code}`, { method: 'DELETE' });
      fb.success(tr('Department deleted'));
      qc.invalidateQueries({ queryKey: ['departments', hid] });
      qc.invalidateQueries({ queryKey: ['department-options', hid] });
    } catch (e) {
      fb.error(errorMessage(e));
    }
  };
  const dirty = JSON.stringify(rows) !== JSON.stringify(q.data ?? []);

  return (
    <>
      <PageHeader
        title={tr('Departments & WhatsApp routing')}
        description={tr('Every guest request is stored in the Requests queue and, when a WhatsApp number is set, the guest can also send a pre-filled message to that department.')}
        actions={
          <>
            <Button size="sm" variant="secondary" className="rounded-lg" onClick={() => setAdding(true)} disabled={dirty}>
              <Plus className="h-4 w-4" aria-hidden="true" />{' '}{tr('Add department')}</Button>
            <Button size="sm" className="rounded-lg" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>{tr('Save routing')}</Button>
          </>
        }
      />
      <AddDepartment hid={hid} open={adding} onClose={() => setAdding(false)} />
      {q.isLoading ? (
        <Skeleton className="h-96" />
      ) : q.error ? (
        <ErrorState title={tr('Could not load departments')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="border-b border-black/[0.07] bg-zinc-50 text-start text-xs text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{tr('Department')}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{tr('WhatsApp number')}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{tr('Phone / extension')}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{tr('Target (min)')}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{tr('Active')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {rows.map((d, i) => (
                <tr key={d.code} className="align-top">
                  <td className="px-4 py-3">
                    <div className="grid gap-1.5">
                      <TextInput aria-label={tr('{0} name (English)', { 0: d.code })} value={d.name_en} onChange={(e) => set(i, { ...d, name_en: e.target.value })} className="h-9 rounded-lg text-sm font-medium" />
                      <TextInput aria-label={tr('{0} name (Arabic)', { 0: d.code })} dir="rtl" value={d.name_ar} onChange={(e) => set(i, { ...d, name_ar: e.target.value })} className="h-9 rounded-lg text-sm" />
                      <p className="max-w-xs text-xs text-zinc-500">{d.is_custom ? tr('Hotel-defined · code {0}', { 0: d.code }) : ROUTES[d.code as DepartmentCode]}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TextInput aria-label={tr('{0} WhatsApp', { 0: d.name_en })} type="tel" dir="ltr" placeholder={tr('+9665XXXXXXXX')} value={d.whatsapp} onChange={(e) => set(i, { ...d, whatsapp: e.target.value })} invalid={!!errors[`departments.${i}.whatsapp`]} className="h-9 rounded-lg text-sm" />
                    {errors[`departments.${i}.whatsapp`] && <p className="mt-1 text-xs text-red-600">{errors[`departments.${i}.whatsapp`]}</p>}
                    {d.whatsapp.replace(/\D/g, '').length >= 7 ? (
                      <a href={`https://wa.me/${d.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Test message from Guest Hub routing')}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />{' '}{tr('Send test')}</a>
                    ) : (
                      <Badge tone="warning" className="mt-1">{tr('No WhatsApp')}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TextInput aria-label={tr('{0} phone', { 0: d.name_en })} type="tel" dir="ltr" value={d.phone} onChange={(e) => set(i, { ...d, phone: e.target.value })} invalid={!!errors[`departments.${i}.phone`]} className="h-9 rounded-lg text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <TextInput aria-label={tr('{0} response target', { 0: d.name_en })} type="number" min={1} value={d.sla_minutes ?? ''} onChange={(e) => set(i, { ...d, sla_minutes: e.target.value ? Number(e.target.value) : null })} className="h-9 w-24 rounded-lg text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <Toggle label={<span className="sr-only">{d.name_en}{' '}{tr('active')}</span>} checked={d.is_active} onChange={(v) => set(i, { ...d, is_active: v })} />
                    {d.is_custom && (
                      <Button size="sm" variant="ghost" className="mt-2" onClick={() => remove(d)} aria-label={tr('Delete {0}', { 0: d.name_en })}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Hotel-defined routing target, e.g. Kids Club or Butler service. */
function AddDepartment({ hid, open, onClose }: { hid: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fb = useFeedback();
  const blank = { code: '', name_en: '', name_ar: '', whatsapp: '', phone: '' };
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api(`/admin/hotels/${hid}/departments`, { method: 'POST', body: v }),
    onSuccess: () => {
      fb.success(tr('Department added — it can now be chosen on services'));
      qc.invalidateQueries({ queryKey: ['departments', hid] });
      qc.invalidateQueries({ queryKey: ['department-options', hid] });
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
    <Sheet open={open} onClose={onClose} title={tr('Add department')} description={tr('Requests for services assigned to this department are routed to its WhatsApp number.')} size="sm" footer={<div className="flex justify-end"><Button loading={m.isPending} onClick={() => m.mutate()}>{tr('Add')}</Button></div>}>
      <div className="grid gap-4">
        <Field label={tr('Code')} htmlFor="ad-code" error={errors.code} hint={tr('Capital letters, digits and _, e.g. KIDS_CLUB. Cannot be changed later.')} required>
          <TextInput id="ad-code" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })} />
        </Field>
        <Field label={tr('Name (English)')} htmlFor="ad-en" error={errors.name_en} required>
          <TextInput id="ad-en" value={v.name_en} onChange={set('name_en')} />
        </Field>
        <Field label={tr('Name (Arabic)')} htmlFor="ad-ar" error={errors.name_ar} required>
          <TextInput id="ad-ar" dir="rtl" value={v.name_ar} onChange={set('name_ar')} />
        </Field>
        <Field label={tr('WhatsApp')} htmlFor="ad-wa" error={errors.whatsapp}>
          <TextInput id="ad-wa" type="tel" dir="ltr" placeholder={tr('+9665XXXXXXXX')} value={v.whatsapp} onChange={set('whatsapp')} />
        </Field>
        <Field label={tr('Phone / extension')} htmlFor="ad-ph" error={errors.phone}>
          <TextInput id="ad-ph" type="tel" dir="ltr" value={v.phone} onChange={set('phone')} />
        </Field>
      </div>
    </Sheet>
  );
}
