import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { SETTLEMENT_TRANSITIONS, type SettlementStatus as Status } from '@shared/commerce';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Button, ErrorState, Field, Sheet, Skeleton, TextInput } from '../../components/ui';
import { useFeedback } from '../feedback';
import { ExportLinks, Kpi, KpiGrid, SettlementStatus, dateOnly, dateTime, money, pct, typeLabel } from './kit';

interface Detail {
  settlement: Record<string, any>;
  lines: Record<string, any>[];
}

const ACTION: Partial<Record<Status, string>> = { REVIEWED: 'Mark reviewed', APPROVED: 'Approve', SETTLED: 'Mark settled', DRAFT: 'Reopen as draft', VOID: 'Void' };

/**
 * Settlement statement with full drill-down. `apiPath` is the hotel or
 * platform endpoint; `manage` enables the lifecycle actions (platform only).
 */
export function SettlementSheet({ apiPath, open, onClose, manage, onOrder }: { apiPath: string | null; open: boolean; onClose: () => void; manage?: boolean; onOrder?: (orderId: string) => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['settlement', apiPath], queryFn: () => api<Detail>(apiPath!), enabled: open && !!apiPath });
  const [paymentRef, setPaymentRef] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const s = q.data?.settlement;
  const cur = s?.currency ?? 'SAR';
  const invalidate = () => {
    q.refetch();
    qc.invalidateQueries({ queryKey: ['platform'] });
  };
  const transition = useMutation({
    mutationFn: (status: Status) => api(`/admin/platform/settlements/${s!.id}/status`, { method: 'POST', body: { status, payment_reference: paymentRef } }),
    onSuccess: (_, status) => {
      fb.success(`Settlement ${status.toLowerCase()}`);
      setErrors({});
      invalidate();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  const refresh = useMutation({
    mutationFn: () => api<{ entries: number }>(`/admin/platform/settlements/${s!.id}/refresh`, { method: 'POST' }),
    onSuccess: (r) => {
      fb.success(`Refreshed: ${r.entries} ledger entries`);
      invalidate();
    },
    onError: (e) => fb.error(errorMessage(e)),
  });

  return (
    <Sheet open={open} onClose={onClose} title={s ? `Settlement ${s.settlement_no}` : 'Settlement'} description={s ? `${s.hotel_name} · ${dateOnly(s.period_start)} → ${dateOnly(s.period_end)} · ${String(s.period_type).toLowerCase()}` : undefined} size="xl" side="right">
      {q.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : q.error ? (
        <ErrorState title="Could not load the settlement" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : s ? (
        <div className="space-y-5 print:space-y-3" id="settlement-statement">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SettlementStatus status={s.status} />
            <div className="flex flex-wrap gap-2 print:hidden">
              <ExportLinks href={apiPath!} label="Download statement" />
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF
              </Button>
            </div>
          </div>
          <KpiGrid>
            <Kpi label="Eligible orders" value={s.order_count} hint={`${s.entry_count} ledger entries`} />
            <Kpi label="Gross order value" value={money(s.gross_minor, cur)} />
            <Kpi label="Refunds" value={money(s.refunds_minor, cur)} />
            <Kpi label="Commission adjustments" value={money(s.adjustments_minor, cur)} />
            <Kpi label="Commission base" value={money(s.base_minor, cur)} />
            <Kpi label="Platform commission" value={money(s.commission_minor, cur)} />
            <Kpi label="Commission tax" value={money(s.commission_tax_minor, cur)} />
            <Kpi label="Hotel amount" value={money(s.hotel_amount_minor, cur)} />
            <Kpi label="Due to platform" value={money(s.amount_due_minor, cur)} tone="success" />
          </KpiGrid>
          <p className="text-xs text-zinc-500">
            Every total is the sum of the lines below; each line is an immutable ledger entry tied to an order, its lines and the commission rule in force when it was placed.
            {s.created_by_name && ` Created by ${s.created_by_name} on ${dateTime(s.created_at)}.`}
            {s.approved_by_name && ` Approved by ${s.approved_by_name} on ${dateTime(s.approved_at)}.`}
            {s.settled_by_name && ` Settled by ${s.settled_by_name} on ${dateTime(s.settled_at)} (ref ${s.payment_reference}).`}
          </p>

          <div className="overflow-x-auto rounded-xl border border-black/[0.07]">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Ledger entry</th>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Rule</th>
                  <th className="px-3 py-2 text-right font-medium">Order value</th>
                  <th className="px-3 py-2 text-right font-medium">Base</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Commission</th>
                  <th className="px-3 py-2 text-right font-medium">Tax</th>
                  <th className="px-3 py-2 text-right font-medium">Hotel amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {q.data!.lines.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="px-3 py-2">
                      <p className="whitespace-nowrap font-mono text-xs">{l.entry_no}</p>
                      <p className="text-xs text-zinc-500">{l.entry_type === 'COMMISSION' ? 'Commission' : `${l.adjustment_no} · ${String(l.adjustment_type).replaceAll('_', ' ').toLowerCase()}`}</p>
                      {l.adjustment_reason && <p className="max-w-[14rem] text-xs text-zinc-500">{l.adjustment_reason}</p>}
                    </td>
                    <td className="px-3 py-2">
                      {onOrder ? (
                        <button type="button" onClick={() => onOrder(l.request_id)} className="whitespace-nowrap font-mono font-semibold hover:underline">{l.reference}</button>
                      ) : (
                        <span className="whitespace-nowrap font-mono font-semibold">{l.reference}</span>
                      )}
                      <p className="text-xs text-zinc-500">{typeLabel(l.order_type)}{l.guest_no ? ` · ${l.guest_no}` : ''}</p>
                      <p className="text-xs text-zinc-500">{dateTime(l.earned_at)}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {l.rule_level} v{l.rule_version}
                      <p className="max-w-[16rem] font-mono text-[0.7rem] text-zinc-500">{l.formula}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(l.gross_minor, cur)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(l.base_minor, cur)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.commission_type === 'FIXED' ? 'fixed' : pct(l.rate_bps)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(l.commission_minor, cur)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(l.commission_tax_minor, cur)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(l.hotel_amount_minor, cur)}</td>
                  </tr>
                ))}
                {!q.data!.lines.length && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-zinc-500">No eligible ledger entries in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {manage && SETTLEMENT_TRANSITIONS[s.status as Status].length > 0 && (
            <div className="rounded-xl border border-black/[0.07] p-4 print:hidden">
              <h3 className="mb-3 text-sm font-semibold">Settlement workflow</h3>
              {s.status === 'APPROVED' && (
                <Field label="Payment reference" htmlFor="stl-ref" error={errors.payment_reference} required>
                  <TextInput id="stl-ref" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Bank transfer / invoice reference" />
                </Field>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {s.status === 'DRAFT' && (
                  <Button size="sm" variant="secondary" loading={refresh.isPending} onClick={() => refresh.mutate()}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh from ledger
                  </Button>
                )}
                {SETTLEMENT_TRANSITIONS[s.status as Status].map((to) => (
                  <Button key={to} size="sm" variant={to === 'VOID' ? 'danger' : to === 'DRAFT' ? 'secondary' : 'primary'} loading={transition.isPending && transition.variables === to} onClick={() => transition.mutate(to)}>
                    {ACTION[to]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Sheet>
  );
}
