import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Receipt } from 'lucide-react';
import { useState } from 'react';
import { ADJUSTMENT_LABELS, ADJUSTMENT_TYPES, COMMISSION_BASIS_LABELS, type AdjustmentType } from '@shared/commerce';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Button, ErrorState, Field, Select, Sheet, Skeleton, TextArea, TextInput, cx } from '../../components/ui';
import { useFeedback } from '../feedback';
import { FinancialStatus, LedgerStatus, OrderStatus, dateTime, deptLabel, major, money, pct, sourceLabel, typeLabel } from './kit';

interface Detail {
  order: Record<string, any>;
  lines: Record<string, any>[];
  events: { event_type: string; from_status: string | null; to_status: string | null; note: string; reason: string; actor: string | null; actor_type: string; created_at: string }[];
  finance_access: 'NONE' | 'SETTLEMENTS' | 'FULL';
  snapshot: Record<string, any> | null;
  ledger: Record<string, any>[];
  adjustments: Record<string, any>[];
}

const EVENT_TITLE: Record<string, string> = { CREATED: 'Created', STATUS: 'Status', NOTE: 'Internal note', GUEST_MESSAGE: 'Message to guest', FINANCIAL: 'Financial', REFUNDED: 'Refund', ADJUSTED: 'Adjustment' };

/**
 * Order record: lines as ordered, immutable status history, and — for users
 * with finance access — the locked snapshot, ledger entries and adjustments.
 * `apiPath` is the order endpoint (hotel-scoped or platform).
 */
export function OrderDetailSheet({ apiPath, open, onClose, canAdjust }: { apiPath: string | null; open: boolean; onClose: () => void; canAdjust?: boolean }) {
  const q = useQuery({ queryKey: ['order', apiPath], queryFn: () => api<Detail>(apiPath!), enabled: open && !!apiPath });
  const d = q.data;
  const cur = d?.order.currency ?? 'SAR';
  return (
    <Sheet open={open} onClose={onClose} title={d ? `Order ${d.order.reference}` : 'Order'} description={d ? `${d.order.hotel_name || ''} · ${typeLabel(d.order.order_type)} · ${deptLabel(d.order.department)}` : undefined} size="lg" side="right">
      {q.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : q.error ? (
        <ErrorState title="Could not load the order" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : d ? (
        <div className="space-y-6">
          <section className="grid gap-3 rounded-xl bg-zinc-50 p-4 text-sm sm:grid-cols-2">
            <Info label="Status"><OrderStatus status={d.order.status} /></Info>
            <Info label="Financial"><FinancialStatus status={d.order.financial_status} /></Info>
            <Info label="Guest">{d.order.guest_name || '—'} {d.order.guest_no && <span className="text-zinc-500">({d.order.guest_no})</span>}</Info>
            <Info label="Phone"><span dir="ltr">{d.order.guest_phone || '—'}</span></Info>
            <Info label="Room / type">{d.order.room || 'Visitor'} · {d.order.guest_type === 'IN_HOUSE' ? 'In-house' : 'External'}</Info>
            <Info label="Source">{sourceLabel(d.order.source)}</Info>
            <Info label="Created">{dateTime(d.order.created_at)}</Info>
            <Info label="Completed">{dateTime(d.order.completed_at)}</Info>
            {d.order.financial_note && <p className="sm:col-span-2 text-xs text-zinc-600">{d.order.financial_note}</p>}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Order lines (as ordered)</h3>
            {d.lines.length ? (
              <div className="overflow-x-auto rounded-xl border border-black/[0.07]">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Unit</th>
                      <th className="px-3 py-2 text-right font-medium">VAT</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {d.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{l.name_en}</p>
                          <p className="text-xs text-zinc-500" dir="rtl" lang="ar">{l.name_ar}</p>
                          {(l.modifiers ?? []).map((m: any, i: number) => (
                            <p key={i} className="text-xs text-zinc-500">{m.group_en}: {m.options?.map((o: any) => o.en).join(', ')}</p>
                          ))}
                          {l.service && <p className="text-xs text-zinc-500">{l.service.replace(':express', ' · express')}</p>}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{l.item_code || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(l.unit_price_minor, cur)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(l.vat_minor, cur)}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(l.gross_minor, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-50 text-sm">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right text-zinc-500">Subtotal {major(d.order.subtotal, cur)} · VAT {major(d.order.vat, cur)} · Total</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{major(d.order.total, cur)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">This request has no billable lines.</p>
            )}
          </section>

          {d.finance_access === 'FULL' && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Commission</h3>
              {d.snapshot ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Info label="Rule">{d.snapshot.rule_level} · v{d.snapshot.rule_version}</Info>
                    <Info label="Rate">{d.snapshot.commission_type === 'FIXED' ? money(d.snapshot.fixed_fee_minor, cur) : pct(d.snapshot.rate_bps)}{d.snapshot.commission_type === 'PERCENTAGE_PLUS_FIXED' ? ` + ${money(d.snapshot.fixed_fee_minor, cur)}` : ''}</Info>
                    <Info label="Basis">{COMMISSION_BASIS_LABELS[d.snapshot.basis as keyof typeof COMMISSION_BASIS_LABELS] ?? d.snapshot.basis}</Info>
                    <Info label="Commission base">{money(d.snapshot.eligible_base_minor, cur)}</Info>
                    <Info label="Commission">{money(d.snapshot.commission_minor, cur)}</Info>
                    <Info label="Hotel amount">{money(d.snapshot.hotel_amount_minor, cur)}</Info>
                  </div>
                  <p className="mt-3 rounded-lg bg-white/70 p-2 font-mono text-xs text-zinc-700">{d.snapshot.formula}</p>
                  <p className="mt-2 text-xs text-zinc-500">Locked {dateTime(d.snapshot.locked_at)} when the order was {String(d.snapshot.trigger_status).toLowerCase()}. It never changes; corrections are separate adjustments.</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No financial snapshot yet.</p>
              )}
              {d.ledger.length > 0 && (
                <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.07] text-sm">
                  {d.ledger.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="font-mono text-xs">{l.entry_no}</span>
                      <span className="text-zinc-500">{l.entry_type === 'COMMISSION' ? 'Commission' : 'Adjustment'}</span>
                      <span className="tabular-nums">{money(l.commission_minor, cur)}</span>
                      <LedgerStatus status={l.status} />
                      <span className="text-xs text-zinc-500">{l.settlement_no ?? 'Not settled'}</span>
                    </li>
                  ))}
                </ul>
              )}
              {d.adjustments.map((a) => (
                <div key={a.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm">
                  <p className="font-medium">{a.adjustment_no} · {ADJUSTMENT_LABELS[a.adjustment_type as AdjustmentType] ?? a.adjustment_type}</p>
                  <p className="text-zinc-600">{a.reason}{a.reference ? ` · ref ${a.reference}` : ''}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-600">{a.calculation}</p>
                  <p className="text-xs text-zinc-500">{a.created_by_name} · {dateTime(a.created_at)}</p>
                </div>
              ))}
              {canAdjust && d.ledger.some((l) => l.entry_type === 'COMMISSION') && <AdjustmentForm orderId={d.order.id} currency={cur} onDone={() => q.refetch()} />}
              {canAdjust && ['RULE_UNAVAILABLE', 'HISTORICAL_RULE_UNAVAILABLE'].includes(d.order.financial_status) && <Reevaluate orderId={d.order.id} onDone={() => q.refetch()} />}
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">History</h3>
            <ol className="relative space-y-3 border-s border-zinc-200 ps-4">
              {d.events.map((e, i) => (
                <li key={i} className="text-sm">
                  <span className={cx('absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white', e.event_type === 'FINANCIAL' || e.event_type === 'REFUNDED' || e.event_type === 'ADJUSTED' ? 'bg-emerald-500' : e.event_type === 'STATUS' || e.event_type === 'CREATED' ? 'bg-zinc-800' : 'bg-zinc-300')} aria-hidden="true" />
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    {EVENT_TITLE[e.event_type] ?? e.event_type}
                    {e.from_status && e.to_status && (
                      <span className="inline-flex items-center gap-1 text-zinc-600">
                        {e.from_status.toLowerCase().replace('_', ' ')} <ArrowRight className="h-3 w-3" aria-hidden="true" /> {e.to_status.toLowerCase().replace('_', ' ')}
                      </span>
                    )}
                  </p>
                  {e.note && <p className="text-zinc-700">{e.note}</p>}
                  {e.reason && e.reason !== e.note && <p className="text-xs text-zinc-500">Reason: {e.reason}</p>}
                  <p className="text-xs text-zinc-500">{dateTime(e.created_at)} · {e.actor ?? (e.actor_type === 'system' ? 'System' : 'Guest')}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </Sheet>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="truncate">{children}</div>
    </div>
  );
}

function AdjustmentForm({ orderId, currency, onDone }: { orderId: string; currency: string; onDone: () => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const [type, setType] = useState<(typeof ADJUSTMENT_TYPES)[number]>('PARTIAL_REFUND');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'DECREASE' | 'INCREASE'>('DECREASE');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () =>
      api(`/admin/platform/orders/${orderId}/adjustments`, {
        method: 'POST',
        body: { adjustment_type: type, amount_minor: Math.round(Number(amount || 0) * 100), direction, reason, reference },
      }),
    onSuccess: () => {
      fb.success('Adjustment posted');
      setAmount('');
      setReason('');
      setReference('');
      setErrors({});
      qc.invalidateQueries({ queryKey: ['platform'] });
      onDone();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  const needsAmount = type !== 'FULL_REFUND';
  return (
    <details className="rounded-xl border border-black/[0.07] p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <Receipt className="h-4 w-4" aria-hidden="true" /> Post an adjustment
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Type" htmlFor="adj-type">
          <Select id="adj-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {ADJUSTMENT_TYPES.map((t) => (
              <option key={t} value={t}>{ADJUSTMENT_LABELS[t]}</option>
            ))}
          </Select>
        </Field>
        {needsAmount && (
          <Field label={type.includes('REFUND') ? `Refunded to guest (${currency})` : `Commission amount (${currency})`} htmlFor="adj-amount" error={errors.amount_minor}>
            <TextInput id="adj-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errors.amount_minor} />
          </Field>
        )}
        {type === 'COMMISSION_CORRECTION' && (
          <Field label="Direction" htmlFor="adj-dir">
            <Select id="adj-dir" value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
              <option value="DECREASE">Decrease commission</option>
              <option value="INCREASE">Increase commission</option>
            </Select>
          </Field>
        )}
        <Field label="Reference (optional)" htmlFor="adj-ref">
          <TextInput id="adj-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Reason" htmlFor="adj-reason" error={errors.reason} required>
            <TextArea id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!errors.reason} />
          </Field>
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-500">The original order, snapshot and ledger entry stay unchanged. The adjustment is a new ledger entry that lands in the next settlement.</p>
      <div className="mt-3 flex justify-end">
        <Button size="sm" loading={m.isPending} onClick={() => m.mutate()}>Post adjustment</Button>
      </div>
    </details>
  );
}

function Reevaluate({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const fb = useFeedback();
  const m = useMutation({
    mutationFn: () => api(`/admin/platform/orders/${orderId}/evaluate`, { method: 'POST' }),
    onSuccess: () => {
      fb.success('Commission calculated');
      onDone();
    },
    onError: (e) => fb.error(errorMessage(e)),
  });
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-sm">
      <p>No commission rule applied when this order was placed. After configuring the correct agreement, re-run the calculation — later rules are never applied retroactively.</p>
      <Button size="sm" variant="secondary" className="mt-2" loading={m.isPending} onClick={() => m.mutate()}>Re-evaluate</Button>
    </div>
  );
}
