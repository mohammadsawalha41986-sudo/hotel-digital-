import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus } from 'lucide-react';
import { useState } from 'react';
import { SETTLEMENT_PERIODS, SETTLEMENT_STATUSES } from '@shared/commerce';
import { ApiError, api, errorMessage } from '../../../lib/api';
import { Button, EmptyState, ErrorState, Field, Select, Sheet, Skeleton, TextArea, TextInput } from '../../../components/ui';
import { SettlementStatus, dateOnly, money } from '../../commerce/kit';
import { OrderDetailSheet } from '../../commerce/OrderDetail';
import { SettlementSheet } from '../../commerce/SettlementDetail';
import { useMe } from '../../data';
import { useFeedback } from '../../feedback';
import { PageHeader } from '../../layout/AdminLayout';
import { HotelPicker } from '../Orders';

interface Row {
  id: string;
  hotel_id: string;
  hotel_name: string;
  settlement_no: string;
  period_type: string;
  period_start: string;
  period_end: string;
  status: string;
  order_count: number;
  gross_minor: number;
  commission_minor: number;
  amount_due_minor: number;
  currency: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/** Period end implied by the period type (the server validates the same rule). */
export function periodEnd(type: string, start: string) {
  if (!start) return '';
  if (type === 'WEEKLY') return addDays(start, 6);
  if (type === 'BIWEEKLY') return addDays(start, 13);
  if (type === 'MONTHLY') {
    const d = new Date(`${start}T00:00:00Z`);
    return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  }
  return '';
}

export function PlatformSettlements() {
  const [hotelId, setHotelId] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const qs = new URLSearchParams({ ...(hotelId ? { hotel_id: hotelId } : {}), ...(status ? { status } : {}) }).toString();
  const q = useQuery({ queryKey: ['platform', 'settlements', qs], queryFn: () => api<{ settlements: Row[] }>(`/admin/platform/settlements?${qs}`).then((r) => r.settlements) });
  return (
    <>
      <PageHeader
        title="Settlements"
        description="Draft → reviewed → approved → settled. A settlement contains exactly the unsettled ledger entries of its period; every total is traceable to orders."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New settlement
          </Button>
        }
      />
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <HotelPicker value={hotelId} onChange={setHotelId} />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg text-sm">
          <option value="">All statuses</option>
          {SETTLEMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </Select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        {q.isLoading ? (
          <Skeleton className="m-4 h-40 rounded-xl" />
        ) : q.error ? (
          <ErrorState title="Could not load settlements" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data!.length ? (
          <EmptyState icon={<Landmark className="h-6 w-6" />} title="No settlements" description="Create one for a hotel and period; it collects that period's unsettled ledger entries." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-b border-black/[0.06] bg-zinc-50 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Settlement</th>
                  <th className="px-4 py-2.5 font-medium">Hotel</th>
                  <th className="px-4 py-2.5 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gross value</th>
                  <th className="px-4 py-2.5 text-right font-medium">Commission</th>
                  <th className="px-4 py-2.5 text-right font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {q.data!.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5">
                      <button type="button" className="font-mono font-semibold hover:underline" onClick={() => setOpen(s.id)}>{s.settlement_no}</button>
                    </td>
                    <td className="px-4 py-2.5">{s.hotel_name}</td>
                    <td className="px-4 py-2.5">
                      {dateOnly(s.period_start)} → {dateOnly(s.period_end)}
                      <p className="text-xs text-zinc-500">{s.period_type.toLowerCase()}</p>
                    </td>
                    <td className="px-4 py-2.5"><SettlementStatus status={s.status} /></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.order_count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{money(s.gross_minor, s.currency)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{money(s.commission_minor, s.currency)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{money(s.amount_due_minor, s.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SettlementSheet open={!!open} onClose={() => setOpen(null)} apiPath={open ? `/admin/platform/settlements/${open}` : null} manage onOrder={setOrderId} />
      <OrderDetailSheet open={!!orderId} onClose={() => setOrderId(null)} apiPath={orderId ? `/admin/platform/orders/${orderId}` : null} canAdjust />
      <NewSettlement open={creating} onClose={() => setCreating(false)} onCreated={(id) => setOpen(id)} />
    </>
  );
}

function NewSettlement({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const me = useMe();
  const firstOfMonth = (() => {
    const d = new Date();
    return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)));
  })();
  const [v, setV] = useState({ hotel_id: '', period_type: 'MONTHLY', period_start: firstOfMonth, period_end: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const end = v.period_type === 'CUSTOM' ? v.period_end : periodEnd(v.period_type, v.period_start);
  const m = useMutation({
    mutationFn: () => api<{ id: string; settlement_no: string; entries: number }>('/admin/platform/settlements', { method: 'POST', body: { ...v, period_end: end } }),
    onSuccess: (r) => {
      fb.success(`${r.settlement_no} created with ${r.entries} ledger entries`);
      qc.invalidateQueries({ queryKey: ['platform'] });
      setErrors({});
      onClose();
      onCreated(r.id);
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New settlement"
      description="Collects every unsettled, undisputed ledger entry earned in the period (hotel local dates). Periods of one hotel cannot overlap."
      size="md"
      footer={<div className="flex justify-end"><Button disabled={!v.hotel_id || !end} loading={m.isPending} onClick={() => m.mutate()}>Create draft</Button></div>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Hotel" htmlFor="ns-hotel" error={errors.hotel_id} required>
            <Select id="ns-hotel" value={v.hotel_id} onChange={(e) => setV({ ...v, hotel_id: e.target.value })}>
              <option value="">Choose a hotel…</option>
              {(me.data?.hotels ?? []).map((h) => (
                <option key={h.id} value={h.id}>{h.name_en}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Period" htmlFor="ns-type">
          <Select id="ns-type" value={v.period_type} onChange={(e) => setV({ ...v, period_type: e.target.value })}>
            {SETTLEMENT_PERIODS.map((p) => (
              <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
            ))}
          </Select>
        </Field>
        <Field label="Start" htmlFor="ns-start" error={errors.period_start} required>
          <TextInput id="ns-start" type="date" value={v.period_start} onChange={(e) => setV({ ...v, period_start: e.target.value })} />
        </Field>
        <Field label="End (inclusive)" htmlFor="ns-end" error={errors.period_end} hint={v.period_type === 'CUSTOM' ? undefined : 'Set by the period type'}>
          <TextInput id="ns-end" type="date" value={end} disabled={v.period_type !== 'CUSTOM'} onChange={(e) => setV({ ...v, period_end: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="ns-notes">
            <TextArea id="ns-notes" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
