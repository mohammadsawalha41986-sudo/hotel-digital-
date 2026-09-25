import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { SETTLEMENT_TRANSITIONS, type SettlementStatus as Status } from '@shared/commerce';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Button, ErrorState, Field, Sheet, Skeleton, TextInput } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { ExportLinks, Kpi, KpiGrid, SettlementStatus, dateOnly, dateTime, money, pct, typeLabel } from './kit';
import { tr } from '../i18n';

interface Detail {
  settlement: Record<string, any>;
  lines: Record<string, any>[];
}

const SUCCESS: Partial<Record<Status, string>> = { REVIEWED: 'Settlement reviewed', APPROVED: 'Settlement approved', SETTLED: 'Settlement settled', DRAFT: 'Settlement reopened as draft', VOID: 'Settlement voided' };
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
  const me = useMe();
  const myId = me.data?.user?.id;
  /** Maker–checker: the preparer or reviewer cannot approve (enforced by the API too). */
  const selfCheck = !!myId && !!s && (s.created_by === myId || s.reviewed_by === myId);
  const invalidate = () => {
    q.refetch();
    qc.invalidateQueries({ queryKey: ['platform'] });
  };
  const transition = useMutation({
    mutationFn: (status: Status) => api(`/admin/platform/settlements/${s!.id}/status`, { method: 'POST', body: { status, payment_reference: paymentRef } }),
    onSuccess: (_, status) => {
      fb.success(tr(SUCCESS[status] ?? 'Settlement updated'));
      setErrors({});
      invalidate();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  /** Hotel side: confirm an approved statement once (platform staff cannot do this for the hotel). */
  const [ackNote, setAckNote] = useState('');
  const platformUser = me.data?.user?.role === 'SUPER_ADMIN' || me.data?.user?.role === 'PLATFORM_FINANCE';
  const canAcknowledge = !manage && !platformUser && !!s && !s.acknowledged_at && (s.status === 'APPROVED' || s.status === 'SETTLED');
  const acknowledge = useMutation({
    mutationFn: () => api(`${apiPath}/acknowledge`, { method: 'POST', body: { note: ackNote } }),
    onSuccess: () => {
      fb.success(tr('Settlement acknowledged'));
      setAckNote('');
      invalidate();
      qc.invalidateQueries({ queryKey: ['hotel-finance'] });
    },
    onError: (e) => fb.error(errorMessage(e)),
  });
  const refresh = useMutation({
    mutationFn: () => api<{ entries: number }>(`/admin/platform/settlements/${s!.id}/refresh`, { method: 'POST' }),
    onSuccess: (r) => {
      fb.success(tr('Refreshed: {0} ledger entries', { 0: r.entries }));
      invalidate();
    },
    onError: (e) => fb.error(errorMessage(e)),
  });

  return (
    <Sheet open={open} onClose={onClose} title={s ? tr('Settlement {0}', { 0: s.settlement_no }) : tr('Settlement')} description={s ? `${s.hotel_name} · ${dateOnly(s.period_start)} → ${dateOnly(s.period_end)} · ${String(s.period_type).toLowerCase()}` : undefined} size="xl" side="right">
      {q.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : q.error ? (
        <ErrorState title={tr('Could not load the settlement')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : s ? (
        <div className="space-y-5 print:space-y-3" id="settlement-statement">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SettlementStatus status={s.status} />
            <div className="flex flex-wrap gap-2 print:hidden">
              <ExportLinks href={apiPath!} label={tr('Download statement')} />
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" />{' '}{tr('Print / PDF')}</Button>
            </div>
          </div>
          <KpiGrid>
            <Kpi label={tr('Eligible orders')} value={s.order_count} hint={tr('{0} ledger entries', { 0: s.entry_count })} />
            <Kpi label={tr('Gross order value')} value={money(s.gross_minor, cur)} />
            <Kpi label={tr('Refunds')} value={money(s.refunds_minor, cur)} />
            <Kpi label={tr('Commission adjustments')} value={money(s.adjustments_minor, cur)} />
            <Kpi label={tr('Commission base')} value={money(s.base_minor, cur)} />
            <Kpi label={tr('Platform commission')} value={money(s.commission_minor, cur)} />
            <Kpi label={tr('Commission tax')} value={money(s.commission_tax_minor, cur)} />
            <Kpi label={tr('Hotel amount')} value={money(s.hotel_amount_minor, cur)} />
            <Kpi label={tr('Due to platform')} value={money(s.amount_due_minor, cur)} tone="success" />
          </KpiGrid>
          <p className="text-xs text-zinc-500">{tr('Every total is the sum of the lines below; each line is an immutable ledger entry tied to an order, its lines and the commission rule in force when it was placed.')}{s.created_by_name && tr(' Created by {0} on {1}.', { 0: s.created_by_name, 1: dateTime(s.created_at) })}
            {s.approved_by_name && tr(' Approved by {0} on {1}.', { 0: s.approved_by_name, 1: dateTime(s.approved_at) })}
            {s.settled_by_name && tr(' Settled by {0} on {1} (ref {2}).', { 0: s.settled_by_name, 1: dateTime(s.settled_at), 2: s.payment_reference })}
          </p>

          <div className="overflow-x-auto rounded-xl border border-black/[0.07]">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="bg-zinc-50 text-start text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{tr('Ledger entry')}</th>
                  <th className="px-3 py-2 font-medium">{tr('Order')}</th>
                  <th className="px-3 py-2 font-medium">{tr('Rule')}</th>
                  <th className="px-3 py-2 text-end font-medium">{tr('Order value')}</th>
                  <th className="px-3 py-2 text-end font-medium">{tr('Base')}</th>
                  <th className="px-3 py-2 text-end font-medium">{tr('Rate')}</th>
                  <th className="px-3 py-2 text-end font-medium">{tr('Commission')}</th>
                  <th className="px-3 py-2 text-end font-medium">{tr('Tax')}</th>
                  <th className="px-3 py-2 text-end font-medium">{tr('Hotel amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {q.data!.lines.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="px-3 py-2">
                      <p className="whitespace-nowrap font-mono text-xs">{l.entry_no}</p>
                      <p className="text-xs text-zinc-500">{l.entry_type === 'COMMISSION' ? tr('Commission') : `${l.adjustment_no} · ${String(l.adjustment_type).replaceAll('_', ' ').toLowerCase()}`}</p>
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
                    <td className="px-3 py-2 text-end tabular-nums">{money(l.gross_minor, cur)}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{money(l.base_minor, cur)}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{l.commission_type === 'FIXED' ? 'fixed' : pct(l.rate_bps)}</td>
                    <td className="px-3 py-2 text-end font-semibold tabular-nums">{money(l.commission_minor, cur)}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{money(l.commission_tax_minor, cur)}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{money(l.hotel_amount_minor, cur)}</td>
                  </tr>
                ))}
                {!q.data!.lines.length && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-zinc-500">{tr('No eligible ledger entries in this period.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {s.acknowledged_at ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
              {tr('Acknowledged by the hotel: {0} on {1}.', { 0: s.acknowledged_by_name ?? '—', 1: dateTime(s.acknowledged_at) })}
              {s.hotel_note && <span className="mt-1 block text-emerald-800">“{s.hotel_note}”</span>}
            </p>
          ) : (
            manage && (s.status === 'APPROVED' || s.status === 'SETTLED') && <p className="text-sm text-zinc-500">{tr('Awaiting the hotel’s acknowledgement.')}</p>
          )}
          {canAcknowledge && (
            <div className="rounded-xl border border-black/[0.07] p-4 print:hidden">
              <h3 className="text-sm font-semibold">{tr('Acknowledge this settlement')}</h3>
              <p className="mt-1 text-sm text-zinc-500">{tr('Confirm that your team has reviewed the orders, commission and hotel amount above. This is recorded once and cannot be undone.')}</p>
              <div className="mt-3">
                <Field label={tr('Note for the platform (optional)')} htmlFor="stl-ack-note">
                  <TextInput id="stl-ack-note" value={ackNote} maxLength={1000} onChange={(e) => setAckNote(e.target.value)} placeholder={tr('e.g. Checked against our POS totals')} />
                </Field>
              </div>
              <Button size="sm" className="mt-3" loading={acknowledge.isPending} onClick={() => acknowledge.mutate()}>
                {tr('Acknowledge settlement')}
              </Button>
            </div>
          )}
          {manage && s.status === 'REVIEWED' && selfCheck && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden" role="status">
              {tr('You prepared or reviewed this settlement, so another finance user must approve it (maker–checker).')}
            </p>
          )}
          {manage && SETTLEMENT_TRANSITIONS[s.status as Status].length > 0 && (
            <div className="rounded-xl border border-black/[0.07] p-4 print:hidden">
              <h3 className="mb-3 text-sm font-semibold">{tr('Settlement workflow')}</h3>
              {s.status === 'APPROVED' && (
                <Field label={tr('Payment reference')} htmlFor="stl-ref" error={errors.payment_reference} required>
                  <TextInput id="stl-ref" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder={tr('Bank transfer / invoice reference')} />
                </Field>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {s.status === 'DRAFT' && (
                  <Button size="sm" variant="secondary" loading={refresh.isPending} onClick={() => refresh.mutate()}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />{' '}{tr('Refresh from ledger')}</Button>
                )}
                {SETTLEMENT_TRANSITIONS[s.status as Status].map((to) => (
                  <Button
                    key={to}
                    size="sm"
                    variant={to === 'VOID' ? 'danger' : to === 'DRAFT' ? 'secondary' : 'primary'}
                    loading={transition.isPending && transition.variables === to}
                    disabled={to === 'APPROVED' && selfCheck}
                    title={to === 'APPROVED' && selfCheck ? tr('Another finance user must approve (maker–checker).') : undefined}
                    onClick={() => transition.mutate(to)}
                  >
                    {tr(ACTION[to] ?? to)}
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
