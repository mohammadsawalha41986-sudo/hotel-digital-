import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSignature, History, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  CANCELLATION_POLICIES,
  COMMISSION_BASES,
  COMMISSION_BASIS_LABELS,
  COMMISSION_TYPES,
  HOTEL_FINANCE_ACCESS,
  ORDER_TYPES,
  ORDER_TYPE_LABELS,
  RULE_LEVELS,
  RULE_LEVEL_LABELS,
  SETTLEMENT_PERIODS,
  TAX_TREATMENTS,
  TAX_TREATMENT_LABELS,
  type RuleLevel,
} from '@shared/commerce';
import { ApiError, api, errorMessage } from '../../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Field, Select, Sheet, Skeleton, TextArea, TextInput, cx } from '../../../components/ui';
import { dateTime, deptLabel, money, pct } from '../../commerce/kit';
import { useFeedback } from '../../feedback';
import { Card, PageHeader } from '../../layout/AdminLayout';
import { tr, L } from '../../i18n';

interface HotelRow {
  id: string;
  name_en: string;
  currency: string;
  hotel_finance_access: string;
  settlement_frequency: string;
  guest_retention_days: number | null;
  active_rules: number;
}
interface Agreement {
  id: string;
  hotel_id: string | null;
  hotel_name: string | null;
  agreement_no: string;
  name: string;
  contract_reference: string;
  currency: string;
  notes: string;
  is_active: boolean;
  rule_versions: number;
}
interface Rule {
  id: string;
  rule_key: string;
  version: number;
  scope_level: RuleLevel;
  scope_value: string;
  commission_type: string;
  rate_bps: number;
  fixed_fee_minor: number;
  basis: string;
  eligible_status: string;
  cancellation_policy: string;
  included_codes: string[];
  excluded_codes: string[];
  tax_treatment: string;
  tax_rate_bps: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string;
  created_by_name: string | null;
  created_at: string;
  orders_using: number;
}

const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/** Platform → Commercial agreements → hotel → commission rules (effective-dated versions). */
export function Agreements() {
  const [hotelId, setHotelId] = useState<string>('platform');
  const hotels = useQuery({ queryKey: ['platform', 'hotels'], queryFn: () => api<{ hotels: HotelRow[] }>('/admin/platform/hotels').then((r) => r.hotels) });
  const hotel = hotels.data?.find((h) => h.id === hotelId);
  return (
    <>
      <PageHeader
        title={tr('Commercial agreements')}
        description={tr('Commission rules are effective-dated versions. A rate change creates a new version; historical orders keep the version that applied when they were placed.')}
      />
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card title={tr('Scope')} className="h-fit">
          {hotels.error && <p className="text-sm text-red-700">{errorMessage(hotels.error)}</p>}
          <ul className="space-y-1 text-sm">
            <li>
              <button type="button" onClick={() => setHotelId('platform')} className={cx('w-full rounded-lg px-3 py-2 text-start', hotelId === 'platform' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100')}>{tr('Platform default')}</button>
            </li>
            {hotels.data?.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setHotelId(h.id)}
                  className={cx('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start', hotelId === h.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100')}
                >
                  <span className="truncate">{h.name_en}</span>
                  <span className={cx('shrink-0 text-xs', hotelId === h.id ? 'text-white/70' : h.active_rules ? 'text-zinc-500' : 'text-red-600')}>{h.active_rules ? `${h.active_rules} rules` : tr('no rules')}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-4">
          {hotel && <CommercialSettings hotel={hotel} />}
          <AgreementList hotelId={hotelId} />
        </div>
      </div>
    </>
  );
}

function CommercialSettings({ hotel }: { hotel: HotelRow }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const fromHotel = (h: HotelRow) => ({ hotel_finance_access: h.hotel_finance_access, settlement_frequency: h.settlement_frequency, guest_retention_days: h.guest_retention_days?.toString() ?? '' });
  const [v, setV] = useState(() => fromHotel(hotel));
  const [loadedFor, setLoadedFor] = useState(hotel.id);
  if (loadedFor !== hotel.id) {
    setLoadedFor(hotel.id);
    setV(fromHotel(hotel));
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api(`/admin/platform/hotels/${hotel.id}/commercial`, { method: 'PUT', body: { ...v, guest_retention_days: v.guest_retention_days ? Number(v.guest_retention_days) : null } }),
    onSuccess: () => {
      fb.success(tr('Commercial settings saved'));
      setErrors({});
      qc.invalidateQueries({ queryKey: ['platform', 'hotels'] });
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  return (
    <Card title={tr('{0} — commercial settings', { 0: hotel.name_en })} actions={<Button size="sm" loading={m.isPending} onClick={() => m.mutate()}>{tr('Save')}</Button>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tr('Hotel access to financial data')} htmlFor="cs-access" hint={tr('What the hotel\'s admin and finance roles may see.')}>
          <Select id="cs-access" value={v.hotel_finance_access} onChange={(e) => setV({ ...v, hotel_finance_access: e.target.value })}>
            {HOTEL_FINANCE_ACCESS.map((a) => (
              <option key={a} value={a}>{a === 'NONE' ? tr('None') : a === 'SETTLEMENTS' ? tr('Settlement statements only') : tr('Full (commission per order)')}</option>
            ))}
          </Select>
        </Field>
        <Field label={tr('Settlement frequency')} htmlFor="cs-freq">
          <Select id="cs-freq" value={v.settlement_frequency} onChange={(e) => setV({ ...v, settlement_frequency: e.target.value })}>
            {SETTLEMENT_PERIODS.map((p) => (
              <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
            ))}
          </Select>
        </Field>
        <Field label={tr('Guest data retention (days)')} htmlFor="cs-ret" hint={tr('Empty = keep until an erasure request. Minimum 30.')} error={errors.guest_retention_days}>
          <TextInput id="cs-ret" inputMode="numeric" value={v.guest_retention_days} onChange={(e) => setV({ ...v, guest_retention_days: e.target.value.replace(/\D/g, '') })} />
        </Field>
      </div>
    </Card>
  );
}

function AgreementList({ hotelId }: { hotelId: string }) {
  const q = useQuery({ queryKey: ['platform', 'agreements', hotelId], queryFn: () => api<{ agreements: Agreement[] }>(`/admin/platform/agreements?hotel_id=${hotelId}`).then((r) => r.agreements) });
  const [creating, setCreating] = useState(false);
  if (q.isLoading) return <Skeleton className="h-48 rounded-2xl" />;
  if (q.error) return <ErrorState title={tr('Could not load agreements')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  return (
    <>
      {q.data!.length ? (
        q.data!.map((a) => <AgreementCard key={a.id} agreement={a} />)
      ) : (
        <EmptyState
          icon={<FileSignature className="h-6 w-6" />}
          title={tr('No agreement yet')}
          description={
            hotelId === 'platform'
              ? tr('Without a platform default, orders of hotels without their own rules show “commission rule missing”.')
              : tr('Orders of this hotel fall back to the platform default, or show “commission rule missing”. Nothing is assumed.')
          }
          action={<Button size="sm" onClick={() => setCreating(true)}>{tr('Create agreement')}</Button>}
        />
      )}
      {q.data!.length > 0 && (
        <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />{' '}{tr('Another agreement')}</Button>
      )}
      <NewAgreement hotelId={hotelId === 'platform' ? null : hotelId} open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function AgreementCard({ agreement }: { agreement: Agreement }) {
  const q = useQuery({ queryKey: ['platform', 'rules', agreement.id], queryFn: () => api<{ rules: Rule[] }>(`/admin/platform/agreements/${agreement.id}/rules`).then((r) => r.rules) });
  const [editor, setEditor] = useState<{ supersedes?: Rule } | null>(null);
  const [action, setAction] = useState<{ rule: Rule; kind: 'close' | 'toggle' } | null>(null);
  const now = Date.now();
  const groups = new Map<string, Rule[]>();
  for (const r of q.data ?? []) groups.set(r.rule_key, [...(groups.get(r.rule_key) ?? []), r]);
  return (
    <Card
      title={`${agreement.agreement_no} · ${agreement.name}`}
      description={[agreement.contract_reference && tr('Contract {0}', { 0: agreement.contract_reference }), agreement.currency, !agreement.is_active && tr('inactive')].filter(Boolean).join(' · ')}
      actions={
        agreement.is_active && (
          <Button size="sm" onClick={() => setEditor({})}>
            <Plus className="h-4 w-4" aria-hidden="true" />{' '}{tr('Add rule')}</Button>
        )
      }
    >
      {agreement.notes && <p className="mb-3 text-sm text-zinc-600">{agreement.notes}</p>}
      {q.isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : q.error ? (
        <ErrorState title={tr('Could not load rules')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : groups.size ? (
        <div className="space-y-4">
          {[...groups.values()].map((versions) => {
            const latest = versions[0];
            return (
              <div key={latest.rule_key} className="rounded-xl border border-black/[0.07]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-2.5">
                  <p className="text-sm font-semibold">
                    {L(RULE_LEVEL_LABELS[latest.scope_level])}
                    {latest.scope_value && <span className="ms-1 font-mono text-xs text-zinc-500">{latest.scope_level === 'DEPARTMENT' ? deptLabel(latest.scope_value) : latest.scope_value}</span>}
                  </p>
                  {agreement.is_active && (
                    <Button size="sm" variant="secondary" onClick={() => setEditor({ supersedes: latest })}>
                      <History className="h-4 w-4" aria-hidden="true" />{' '}{tr('New version')}</Button>
                  )}
                </div>
                <ul className="divide-y divide-black/[0.06] text-sm">
                  {versions.map((r) => {
                    const live = r.is_active && Date.parse(r.effective_from) <= now && (!r.effective_to || Date.parse(r.effective_to) > now);
                    return (
                      <li key={r.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[5rem_1fr_auto] sm:items-center">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">v{r.version}</span>
                          {live && <Badge tone="success">{tr('Live')}</Badge>}
                          {!r.is_active && <Badge tone="neutral">{tr('Off')}</Badge>}
                        </span>
                        <span>
                          <span className="font-semibold tabular-nums">
                            {r.commission_type === 'FIXED' ? money(r.fixed_fee_minor, agreement.currency) : pct(r.rate_bps)}
                            {r.commission_type === 'PERCENTAGE_PLUS_FIXED' && ` + ${money(r.fixed_fee_minor, agreement.currency)}`}
                          </span>{' '}
                          · {L(COMMISSION_BASIS_LABELS[r.basis as keyof typeof COMMISSION_BASIS_LABELS]) || r.basis}{' '}{tr('· earned when')}{' '}{r.eligible_status.toLowerCase()} · {L(TAX_TREATMENT_LABELS[r.tax_treatment as keyof typeof TAX_TREATMENT_LABELS]).toLowerCase()}
                          {r.tax_rate_bps > 0 && ` (${pct(r.tax_rate_bps)})`}
                          {r.cancellation_policy === 'CHARGE_IF_ACCEPTED' && tr(' · charged on cancellation after acceptance')}
                          {(r.included_codes.length > 0 || r.excluded_codes.length > 0) && (
                            <span className="block text-xs text-zinc-500">
                              {r.included_codes.length > 0 && tr('Only: {0}. ', { 0: r.included_codes.join(', ') })}
                              {r.excluded_codes.length > 0 && tr('Excludes: {0}.', { 0: r.excluded_codes.join(', ') })}
                            </span>
                          )}
                          <span className="block text-xs text-zinc-500">
                            {dateTime(r.effective_from)} → {r.effective_to ? dateTime(r.effective_to) : 'open-ended'}{tr('· used by {0} order(s) · by {1}', { 0: r.orders_using, 1: r.created_by_name ?? 'system' })}</span>
                          {r.notes && <span className="block text-xs text-zinc-500">{r.notes}</span>}
                        </span>
                        {agreement.is_active && (
                          <span className="flex gap-1">
                            {!r.effective_to && r.is_active && (
                              <Button size="sm" variant="ghost" onClick={() => setAction({ rule: r, kind: 'close' })}>{tr('Close')}</Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setAction({ rule: r, kind: 'toggle' })}>{r.is_active ? tr('Deactivate') : tr('Reactivate')}</Button>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{tr('No rules yet. Add the commission rule agreed in the contract.')}</p>
      )}
      <RuleEditor agreement={agreement} open={!!editor} supersedes={editor?.supersedes} onClose={() => setEditor(null)} />
      <RuleAction action={action} onClose={() => setAction(null)} />
    </Card>
  );
}

/** Close a version at a date, or switch it off/on — always with a reason (audited). */
function RuleAction({ action, onClose }: { action: { rule: Rule; kind: 'close' | 'toggle' } | null; onClose: () => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const [when, setWhen] = useState(localInput(new Date()));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const r = action?.rule;
  const m = useMutation({
    mutationFn: () =>
      action!.kind === 'close'
        ? api(`/admin/platform/rules/${r!.id}/close`, { method: 'POST', body: { effective_to: new Date(when).toISOString(), reason } })
        : api(`/admin/platform/rules/${r!.id}/active`, { method: 'POST', body: { is_active: !r!.is_active, reason } }),
    onSuccess: () => {
      fb.success(action!.kind === 'close' ? tr('Version closed') : r!.is_active ? tr('Version deactivated') : tr('Version reactivated'));
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
  const title = !action ? '' : action.kind === 'close' ? `Close v${r!.version}` : `${r!.is_active ? 'Deactivate' : 'Reactivate'} v${r!.version}`;
  return (
    <Sheet
      open={!!action}
      onClose={onClose}
      title={title}
      description={
        action?.kind === 'close'
          ? tr('Orders placed from this moment no longer use this version. Orders already calculated keep their snapshot.')
          : tr('An inactive version is skipped when resolving new orders. Existing snapshots are unaffected.')
      }
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tr('Cancel')}</Button>
          <Button disabled={reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate()}>{tr('Confirm')}</Button>
        </div>
      }
    >
      <div className="grid gap-4">
        {action?.kind === 'close' && (
          <Field label={tr('Close at')} htmlFor="ra-when" error={errors.effective_to} required>
            <TextInput id="ra-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        )}
        <Field label={tr('Reason')} htmlFor="ra-reason" error={errors.reason} required>
          <TextArea id="ra-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

function NewAgreement({ hotelId, open, onClose }: { hotelId: string | null; open: boolean; onClose: () => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const blank = { name: '', contract_reference: '', currency: 'SAR', notes: '' };
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/admin/platform/agreements', { method: 'POST', body: { ...v, hotel_id: hotelId } }),
    onSuccess: () => {
      fb.success(tr('Agreement created'));
      qc.invalidateQueries({ queryKey: ['platform'] });
      setV(blank);
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
      open={open}
      onClose={onClose}
      title={hotelId ? tr('New hotel agreement') : tr('New platform default agreement')}
      size="md"
      footer={<div className="flex justify-end"><Button loading={m.isPending} onClick={() => m.mutate()}>{tr('Create')}</Button></div>}
    >
      <div className="grid gap-4">
        <Field label={tr('Name')} htmlFor="na-name" error={errors.name} required>
          <TextInput id="na-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label={tr('Contract reference')} htmlFor="na-ref">
          <TextInput id="na-ref" value={v.contract_reference} onChange={(e) => setV({ ...v, contract_reference: e.target.value })} />
        </Field>
        <Field label={tr('Currency')} htmlFor="na-cur" error={errors.currency}>
          <TextInput id="na-cur" value={v.currency} maxLength={3} onChange={(e) => setV({ ...v, currency: e.target.value.toUpperCase() })} />
        </Field>
        <Field label={tr('Notes')} htmlFor="na-notes">
          <TextArea id="na-notes" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        </Field>
      </div>
    </Sheet>
  );
}

function RuleEditor({ agreement, open, onClose, supersedes }: { agreement: Agreement; open: boolean; onClose: () => void; supersedes?: Rule }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const initial = () => ({
    scope_level: (supersedes?.scope_level ?? (agreement.hotel_id ? 'HOTEL' : 'PLATFORM')) as RuleLevel,
    scope_value: supersedes?.scope_value ?? '',
    commission_type: supersedes?.commission_type ?? 'PERCENTAGE',
    rate: supersedes && supersedes.rate_bps ? String(supersedes.rate_bps / 100) : '',
    fixed: supersedes && supersedes.fixed_fee_minor ? String(supersedes.fixed_fee_minor / 100) : '',
    basis: supersedes?.basis ?? '',
    eligible_status: supersedes?.eligible_status ?? 'COMPLETED',
    cancellation_policy: supersedes?.cancellation_policy ?? 'NO_COMMISSION',
    included: supersedes?.included_codes.join(', ') ?? '',
    excluded: supersedes?.excluded_codes.join(', ') ?? '',
    tax_treatment: supersedes?.tax_treatment ?? '',
    tax_rate: supersedes && supersedes.tax_rate_bps ? String(supersedes.tax_rate_bps / 100) : '',
    effective_from: localInput(new Date(Date.now() + 60_000)),
    effective_to: '',
    notes: '',
  });
  const [v, setV] = useState(initial);
  const [key, setKey] = useState<string | null>(null);
  const current = `${open}-${supersedes?.id ?? 'new'}`;
  if (open && key !== current) {
    setKey(current);
    setV(initial());
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const levels = agreement.hotel_id ? RULE_LEVELS.filter((l) => l !== 'PLATFORM') : (['PLATFORM', 'ORDER_TYPE', 'DEPARTMENT'] as RuleLevel[]);
  const codes = (s: string) => s.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
  const m = useMutation({
    mutationFn: () =>
      api(`/admin/platform/agreements/${agreement.id}/rules`, {
        method: 'POST',
        body: {
          supersedes: supersedes?.rule_key ?? null,
          scope_level: v.scope_level,
          scope_value: ['HOTEL', 'PLATFORM'].includes(v.scope_level) ? '' : v.scope_value.trim(),
          commission_type: v.commission_type,
          rate_bps: v.commission_type === 'FIXED' ? 0 : Math.round(Number(v.rate || 0) * 100),
          fixed_fee_minor: v.commission_type === 'PERCENTAGE' ? 0 : Math.round(Number(v.fixed || 0) * 100),
          basis: v.basis || undefined,
          eligible_status: v.eligible_status,
          cancellation_policy: v.cancellation_policy,
          included_codes: codes(v.included),
          excluded_codes: codes(v.excluded),
          tax_treatment: v.tax_treatment || undefined,
          tax_rate_bps: v.tax_treatment && v.tax_treatment !== 'NOT_APPLICABLE' ? Math.round(Number(v.tax_rate || 0) * 100) : 0,
          effective_from: new Date(v.effective_from).toISOString(),
          effective_to: v.effective_to ? new Date(v.effective_to).toISOString() : null,
          notes: v.notes,
        },
      }),
    onSuccess: () => {
      fb.success(supersedes ? tr('v{0} created. v{1} applies until it takes effect.', { 0: supersedes.version + 1, 1: supersedes.version }) : tr('Rule created'));
      qc.invalidateQueries({ queryKey: ['platform'] });
      setErrors({});
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  const set = (k: keyof ReturnType<typeof initial>) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const needsValue = !['HOTEL', 'PLATFORM'].includes(v.scope_level);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={supersedes ? tr('New version of v{0}', { 0: supersedes.version }) : tr('New commission rule')}
      description={supersedes ? tr('The current version stays on record and applies to every order placed before the new effective date.') : tr('Every term is explicit — nothing is assumed.')}
      size="lg"
      side="right"
      footer={<div className="flex justify-end"><Button loading={m.isPending} onClick={() => m.mutate()}>{supersedes ? tr('Create version') : tr('Create rule')}</Button></div>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr('Applies to')} htmlFor="re-level" error={errors.scope_level}>
          <Select id="re-level" value={v.scope_level} onChange={set('scope_level')} disabled={!!supersedes}>
            {levels.map((l) => (
              <option key={l} value={l}>{L(RULE_LEVEL_LABELS[l])}</option>
            ))}
          </Select>
        </Field>
        {needsValue && (
          <Field
            label={v.scope_level === 'ORDER_TYPE' ? tr('Order type') : v.scope_level === 'DEPARTMENT' ? tr('Department code') : tr('Code')}
            htmlFor="re-value"
            error={errors.scope_value}
            hint={
              v.scope_level === 'SERVICE'
                ? tr('Item / service code, e.g. SPA-MASSAGE-60')
                : v.scope_level === 'CATEGORY'
                  ? tr('Category code, e.g. CAT-COFFEE or SPACAT-MASSAGE')
                  : v.scope_level === 'OUTLET'
                    ? tr('Outlet code, e.g. OUTLET-FLORA')
                    : v.scope_level === 'DEPARTMENT'
                      ? tr('e.g. FNB, SPA, LAUNDRY')
                      : undefined
            }
          >
            {v.scope_level === 'ORDER_TYPE' ? (
              <Select id="re-value" value={v.scope_value} onChange={set('scope_value')} disabled={!!supersedes}>
                <option value="">{tr('Choose…')}</option>
                {ORDER_TYPES.map((t) => (
                  <option key={t} value={t}>{L(ORDER_TYPE_LABELS[t])}</option>
                ))}
              </Select>
            ) : (
              <TextInput id="re-value" value={v.scope_value} onChange={(e) => setV({ ...v, scope_value: e.target.value.toUpperCase() })} disabled={!!supersedes} />
            )}
          </Field>
        )}
        <Field label={tr('Commission type')} htmlFor="re-type">
          <Select id="re-type" value={v.commission_type} onChange={set('commission_type')}>
            {COMMISSION_TYPES.map((t) => (
              <option key={t} value={t}>{t === 'PERCENTAGE' ? tr('Percentage') : t === 'FIXED' ? tr('Fixed fee per order') : tr('Percentage + fixed fee')}</option>
            ))}
          </Select>
        </Field>
        {v.commission_type !== 'FIXED' && (
          <Field label={tr('Rate (%)')} htmlFor="re-rate" error={errors.rate_bps} required>
            <TextInput id="re-rate" inputMode="decimal" value={v.rate} onChange={set('rate')} />
          </Field>
        )}
        {v.commission_type !== 'PERCENTAGE' && (
          <Field label={tr('Fixed fee ({0})', { 0: agreement.currency })} htmlFor="re-fixed" error={errors.fixed_fee_minor} required>
            <TextInput id="re-fixed" inputMode="decimal" value={v.fixed} onChange={set('fixed')} />
          </Field>
        )}
        <Field label={tr('Commission basis')} htmlFor="re-basis" error={errors.basis} required>
          <Select id="re-basis" value={v.basis} onChange={set('basis')}>
            <option value="">{tr('Choose explicitly…')}</option>
            {COMMISSION_BASES.map((b) => (
              <option key={b} value={b}>{L(COMMISSION_BASIS_LABELS[b])}</option>
            ))}
          </Select>
        </Field>
        <Field label={tr('Earned when the order is')} htmlFor="re-elig">
          <Select id="re-elig" value={v.eligible_status} onChange={set('eligible_status')}>
            <option value="COMPLETED">{tr('Completed')}</option>
            <option value="ACCEPTED">{tr('Accepted')}</option>
          </Select>
        </Field>
        <Field label={tr('If cancelled')} htmlFor="re-cancel">
          <Select id="re-cancel" value={v.cancellation_policy} onChange={set('cancellation_policy')}>
            {CANCELLATION_POLICIES.map((c) => (
              <option key={c} value={c}>{c === 'NO_COMMISSION' ? tr('No commission') : tr('Charge if cancelled after acceptance')}</option>
            ))}
          </Select>
        </Field>
        <Field label={tr('Tax on commission')} htmlFor="re-tax" error={errors.tax_treatment} required>
          <Select id="re-tax" value={v.tax_treatment} onChange={set('tax_treatment')}>
            <option value="">{tr('Choose explicitly…')}</option>
            {TAX_TREATMENTS.map((t) => (
              <option key={t} value={t}>{L(TAX_TREATMENT_LABELS[t])}</option>
            ))}
          </Select>
        </Field>
        {v.tax_treatment && v.tax_treatment !== 'NOT_APPLICABLE' && (
          <Field label={tr('Tax rate (%)')} htmlFor="re-taxrate" error={errors.tax_rate_bps} required>
            <TextInput id="re-taxrate" inputMode="decimal" value={v.tax_rate} onChange={set('tax_rate')} />
          </Field>
        )}
        <Field label={tr('Only these codes (optional)')} htmlFor="re-inc" error={errors.included_codes} hint={tr('Item or category codes, comma separated. Empty = every line.')}>
          <TextInput id="re-inc" value={v.included} onChange={set('included')} />
        </Field>
        <Field label={tr('Exclude these codes (optional)')} htmlFor="re-exc" error={errors.excluded_codes}>
          <TextInput id="re-exc" value={v.excluded} onChange={set('excluded')} />
        </Field>
        <Field label={tr('Effective from')} htmlFor="re-from" error={errors.effective_from} required>
          <TextInput id="re-from" type="datetime-local" value={v.effective_from} onChange={set('effective_from')} />
        </Field>
        <Field label={tr('Effective to (optional)')} htmlFor="re-to" error={errors.effective_to} hint={tr('Exclusive. Empty = until a new version replaces it.')}>
          <TextInput id="re-to" type="datetime-local" value={v.effective_to} onChange={set('effective_to')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={tr('Notes')} htmlFor="re-notes">
            <TextArea id="re-notes" value={v.notes} onChange={set('notes')} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
