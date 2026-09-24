import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DepartmentCode } from '@shared/domain';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, ErrorState, Skeleton, TextInput, Toggle } from '../../components/ui';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';

interface Dept {
  code: DepartmentCode;
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
      fb.success('Routing saved — new requests use these numbers');
      qc.invalidateQueries({ queryKey: ['departments', hid] });
      qc.invalidateQueries({ queryKey: ['bundle'] });
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });

  const set = (i: number, d: Dept) => setRows(rows.map((x, j) => (j === i ? d : x)));
  const dirty = JSON.stringify(rows) !== JSON.stringify(q.data ?? []);

  return (
    <>
      <PageHeader
        title="Departments & WhatsApp routing"
        description="Every guest request is stored in the Requests queue and, when a WhatsApp number is set, the guest can also send a pre-filled message to that department."
        actions={
          <Button size="sm" className="rounded-lg" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
            Save routing
          </Button>
        }
      />
      {q.isLoading ? (
        <Skeleton className="h-96" />
      ) : q.error ? (
        <ErrorState title="Could not load departments" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="border-b border-black/[0.07] bg-zinc-50 text-start text-xs text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-semibold">Department</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">WhatsApp number</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">Phone / extension</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">Target (min)</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {rows.map((d, i) => (
                <tr key={d.code} className="align-top">
                  <td className="px-4 py-3">
                    <div className="grid gap-1.5">
                      <TextInput aria-label={`${d.code} name (English)`} value={d.name_en} onChange={(e) => set(i, { ...d, name_en: e.target.value })} className="h-9 rounded-lg text-sm font-medium" />
                      <TextInput aria-label={`${d.code} name (Arabic)`} dir="rtl" value={d.name_ar} onChange={(e) => set(i, { ...d, name_ar: e.target.value })} className="h-9 rounded-lg text-sm" />
                      <p className="max-w-xs text-xs text-zinc-500">{ROUTES[d.code]}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TextInput aria-label={`${d.name_en} WhatsApp`} type="tel" dir="ltr" placeholder="+9665XXXXXXXX" value={d.whatsapp} onChange={(e) => set(i, { ...d, whatsapp: e.target.value })} invalid={!!errors[`departments.${i}.whatsapp`]} className="h-9 rounded-lg text-sm" />
                    {errors[`departments.${i}.whatsapp`] && <p className="mt-1 text-xs text-red-600">{errors[`departments.${i}.whatsapp`]}</p>}
                    {d.whatsapp.replace(/\D/g, '').length >= 7 ? (
                      <a href={`https://wa.me/${d.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Test message from Guest Hub routing')}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> Send test
                      </a>
                    ) : (
                      <Badge tone="warning" className="mt-1">No WhatsApp</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TextInput aria-label={`${d.name_en} phone`} type="tel" dir="ltr" value={d.phone} onChange={(e) => set(i, { ...d, phone: e.target.value })} invalid={!!errors[`departments.${i}.phone`]} className="h-9 rounded-lg text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <TextInput aria-label={`${d.name_en} response target`} type="number" min={1} value={d.sla_minutes ?? ''} onChange={(e) => set(i, { ...d, sla_minutes: e.target.value ? Number(e.target.value) : null })} className="h-9 w-24 rounded-lg text-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <Toggle label={<span className="sr-only">{d.name_en} active</span>} checked={d.is_active} onChange={(v) => set(i, { ...d, is_active: v })} />
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
