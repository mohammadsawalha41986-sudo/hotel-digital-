import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { LEDGER_STATUSES } from '@shared/commerce';
import { ApiError, api, errorMessage } from '../../../lib/api';
import { Button, EmptyState, ErrorState, Field, Select, Sheet, Skeleton, TextArea, Toggle } from '../../../components/ui';
import { LedgerStatus, dateTime, money, pct, typeLabel } from '../../commerce/kit';
import { OrderDetailSheet } from '../../commerce/OrderDetail';
import { useFeedback } from '../../feedback';
import { PageHeader } from '../../layout/AdminLayout';
import { HotelPicker } from '../Orders';

interface Entry {
  id: string;
  entry_no: string;
  entry_type: string;
  hotel_name: string;
  request_id: string;
  reference: string;
  order_type: string;
  earned_at: string;
  gross_minor: number;
  base_minor: number;
  rate_bps: number;
  commission_minor: number;
  commission_tax_minor: number;
  hotel_amount_minor: number;
  currency: string;
  status: string;
  settlement_no: string | null;
  settlement_id: string | null;
  rule_level: string;
  rule_version: number;
  formula: string;
  dispute_reason: string;
}

/** The platform commission ledger: append-only entries; disputes hold an entry out of settlements. */
export function PlatformLedger() {
  const [hotelId, setHotelId] = useState('');
  const [status, setStatus] = useState('');
  const [unsettled, setUnsettled] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [dispute, setDispute] = useState<Entry | null>(null);
  const qs = new URLSearchParams({ ...(hotelId ? { hotel_id: hotelId } : {}), ...(status ? { status } : {}), ...(unsettled ? { unsettled: '1' } : {}), limit: '300' }).toString();
  const q = useQuery({ queryKey: ['platform', 'ledger', qs], queryFn: () => api<{ entries: Entry[] }>(`/admin/platform/ledger?${qs}`).then((r) => r.entries) });
  return (
    <>
      <PageHeader title="Commission ledger" description="One entry per eligible order plus one per adjustment. Entries are never edited or deleted." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-56"><HotelPicker value={hotelId} onChange={setHotelId} /></div>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-44 rounded-lg text-sm">
          <option value="">All statuses</option>
          {LEDGER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </Select>
        <Toggle checked={unsettled} onChange={setUnsettled} label="Unsettled only" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        {q.isLoading ? (
          <Skeleton className="m-4 h-40 rounded-xl" />
        ) : q.error ? (
          <ErrorState title="Could not load the ledger" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data!.length ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No ledger entries" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b border-black/[0.06] bg-zinc-50 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Entry</th>
                  <th className="px-4 py-2.5 font-medium">Hotel / order</th>
                  <th className="px-4 py-2.5 font-medium">Rule</th>
                  <th className="px-4 py-2.5 text-right font-medium">Order value</th>
                  <th className="px-4 py-2.5 text-right font-medium">Base</th>
                  <th className="px-4 py-2.5 text-right font-medium">Rate</th>
                  <th className="px-4 py-2.5 text-right font-medium">Commission</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {q.data!.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-xs">{e.entry_no}</p>
                      <p className="text-xs text-zinc-500">{e.entry_type === 'COMMISSION' ? 'Commission' : 'Adjustment'} · {dateTime(e.earned_at)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p>{e.hotel_name}</p>
                      <button type="button" className="font-mono text-xs hover:underline" onClick={() => setOrderId(e.request_id)}>{e.reference}</button>
                      <span className="text-xs text-zinc-500"> · {typeLabel(e.order_type)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {e.rule_level} v{e.rule_version}
                      <p className="max-w-[18rem] font-mono text-[0.7rem] text-zinc-500">{e.formula}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{money(e.gross_minor, e.currency)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{money(e.base_minor, e.currency)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{pct(e.rate_bps)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{money(e.commission_minor, e.currency)}</td>
                    <td className="px-4 py-2.5">
                      <LedgerStatus status={e.status} />
                      <p className="text-xs text-zinc-500">{e.settlement_no ?? 'Not settled'}</p>
                      {e.dispute_reason && <p className="max-w-[12rem] text-xs text-red-700">{e.dispute_reason}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      {!e.settlement_id && (
                        <Button size="sm" variant="ghost" onClick={() => setDispute(e)}>{e.status === 'DISPUTED' ? 'Resolve' : 'Dispute'}</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <OrderDetailSheet open={!!orderId} onClose={() => setOrderId(null)} apiPath={orderId ? `/admin/platform/orders/${orderId}` : null} canAdjust />
      <DisputeSheet entry={dispute} onClose={() => setDispute(null)} />
    </>
  );
}

function DisputeSheet({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const disputing = entry?.status !== 'DISPUTED';
  const m = useMutation({
    mutationFn: () => api(`/admin/platform/ledger/${entry!.id}/dispute`, { method: 'POST', body: { disputed: disputing, reason } }),
    onSuccess: () => {
      fb.success(disputing ? 'Entry marked as disputed' : 'Dispute resolved');
      qc.invalidateQueries({ queryKey: ['platform'] });
      setReason('');
      setErrors({});
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  return (
    <Sheet
      open={!!entry}
      onClose={onClose}
      title={disputing ? `Dispute ${entry?.entry_no ?? ''}` : `Resolve dispute on ${entry?.entry_no ?? ''}`}
      description={disputing ? 'A disputed entry is excluded from new settlements until resolved. Amounts do not change — corrections are adjustments.' : 'The entry returns to the settlement queue.'}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate()}>Confirm</Button>
        </div>
      }
    >
      <Field label="Reason" htmlFor="dp-reason" error={errors.reason} required>
        <TextArea id="dp-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Sheet>
  );
}
