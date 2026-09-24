import { useQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import { useState } from 'react';
import { COMMISSION_BASIS_LABELS } from '@shared/commerce';
import { api, errorMessage } from '../../lib/api';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { LedgerStatus, SettlementStatus, dateOnly, dateTime, money, pct } from '../commerce/kit';
import { OrderDetailSheet } from '../commerce/OrderDetail';
import { SettlementSheet } from '../commerce/SettlementDetail';
import { Card, PageHeader } from '../layout/AdminLayout';
import { tr, L } from '../i18n';

interface Summary {
  access: 'SETTLEMENTS' | 'FULL';
  settlements: Record<string, any>[];
  rules: Record<string, any>[];
  ledger: Record<string, any>[];
}

/** This hotel's settlements, and — with full access — its commission terms and ledger. */
export function HotelFinance({ hid }: { hid: string }) {
  const q = useQuery({ queryKey: ['hotel-finance', hid], queryFn: () => api<Summary>(`/admin/hotels/${hid}/finance/summary`), retry: false });
  const [sid, setSid] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  if (q.isLoading) return <Skeleton className="h-80 rounded-2xl" />;
  if (q.error)
    return (
      <>
        <PageHeader title={tr('Finance')} />
        <ErrorState title={tr('Financial information is not available')} description={errorMessage(q.error)} />
      </>
    );
  const d = q.data!;
  return (
    <>
      <PageHeader title={tr('Finance')} description={tr('Settlements between the hotel and the platform. Every amount traces back to individual orders.')} />
      <div className="space-y-4">
        {d.access === 'FULL' && (
          <Card title={tr('Commission terms in force')} description={tr('Set by the platform under your commercial agreement. Past orders keep the terms that applied when they were placed.')}>
            {d.rules.length ? (
              <ul className="divide-y divide-black/[0.06] text-sm">
                {d.rules.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      {r.scope_level.toLowerCase().replace('_', ' ')}{r.scope_value ? ` · ${r.scope_value}` : ''} <span className="text-xs text-zinc-500">v{r.version}</span>
                    </span>
                    <span className="tabular-nums">
                      {r.commission_type === 'FIXED' ? money(r.fixed_fee_minor) : pct(r.rate_bps)}
                      {r.commission_type === 'PERCENTAGE_PLUS_FIXED' ? ` + ${money(r.fixed_fee_minor)}` : ''} · {L(COMMISSION_BASIS_LABELS[r.basis as keyof typeof COMMISSION_BASIS_LABELS]) || r.basis}
                    </span>
                    <span className="text-xs text-zinc-500">{tr('from {0}', { 0: dateOnly(r.effective_from) })}{r.effective_to ? ` to ${dateOnly(r.effective_to)}` : ''}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">{tr('No commission terms are configured yet.')}</p>
            )}
          </Card>
        )}
        <Card title={tr('Settlements')}>
          {d.settlements.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="text-start text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 font-medium">{tr('Settlement')}</th>
                    <th className="py-2 font-medium">{tr('Period')}</th>
                    <th className="py-2 font-medium">{tr('Status')}</th>
                    <th className="py-2 text-end font-medium">{tr('Orders')}</th>
                    <th className="py-2 text-end font-medium">{tr('Gross value')}</th>
                    <th className="py-2 text-end font-medium">{tr('Commission')}</th>
                    <th className="py-2 text-end font-medium">{tr('Due to platform')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {d.settlements.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2">
                        <button type="button" className="font-mono font-semibold hover:underline" onClick={() => setSid(s.id)}>{s.settlement_no}</button>
                      </td>
                      <td className="py-2">{dateOnly(s.period_start)} → {dateOnly(s.period_end)}</td>
                      <td className="py-2"><SettlementStatus status={s.status} /></td>
                      <td className="py-2 text-end tabular-nums">{s.order_count}</td>
                      <td className="py-2 text-end tabular-nums">{money(s.gross_minor, s.currency)}</td>
                      <td className="py-2 text-end tabular-nums">{money(s.commission_minor, s.currency)}</td>
                      <td className="py-2 text-end font-semibold tabular-nums">{money(s.amount_due_minor, s.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Landmark className="h-6 w-6" />} title={tr('No settlements yet')} description={tr('The platform prepares a statement for each settlement period.')} />
          )}
        </Card>
        {d.access === 'FULL' && (
          <Card title={tr('Commission ledger')} description={tr('Most recent 200 entries. Adjustments appear as separate entries; original entries never change.')}>
            {d.ledger.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="text-start text-xs text-zinc-500">
                    <tr>
                      <th className="py-2 font-medium">{tr('Entry')}</th>
                      <th className="py-2 font-medium">{tr('Order')}</th>
                      <th className="py-2 text-end font-medium">{tr('Order value')}</th>
                      <th className="py-2 text-end font-medium">{tr('Commission')}</th>
                      <th className="py-2 ps-4 font-medium">{tr('Status')}</th>
                      <th className="py-2 font-medium">{tr('Settlement')}</th>
                      <th className="py-2 font-medium">{tr('Date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {d.ledger.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 font-mono text-xs">{l.entry_no}</td>
                        <td className="py-2">
                          <button type="button" className="font-mono hover:underline" onClick={() => setOrderId(l.request_id)}>{l.reference}</button>
                        </td>
                        <td className="py-2 text-end tabular-nums">{money(l.gross_minor)}</td>
                        <td className="py-2 text-end tabular-nums">{money(l.commission_minor)}</td>
                        <td className="py-2 ps-4"><LedgerStatus status={l.status} /></td>
                        <td className="py-2 text-xs">{l.settlement_no ?? '—'}</td>
                        <td className="py-2 text-xs text-zinc-500">{dateTime(l.earned_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">{tr('No commission entries yet.')}</p>
            )}
          </Card>
        )}
      </div>
      <SettlementSheet open={!!sid} onClose={() => setSid(null)} apiPath={sid ? `/admin/hotels/${hid}/finance/settlements/${sid}` : null} onOrder={d.access === 'FULL' ? setOrderId : undefined} />
      <OrderDetailSheet open={!!orderId} onClose={() => setOrderId(null)} apiPath={orderId ? `/admin/hotels/${hid}/orders/${orderId}` : null} />
    </>
  );
}
