import { Shirt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LAUNDRY_SERVICES, type LaundryService } from '@shared/domain';
import { lineAmounts, sumLines } from '@shared/pricing';
import { ApiError, errorMessage } from '../../lib/api';
import { useI18n, type DictKey } from '../../lib/i18n';
import { Button, EmptyState, Field, Select, Sheet, Stepper, TextArea, Toggle, cx } from '../../components/ui';
import { SectionHeader } from '../components/cards';
import { usePageTitle } from '../components/usePageTitle';
import { useFlow } from '../flow';
import { useHotel } from '../hotel';
import { useGuestSession } from '../session';
import type { LaundryItem } from '../types';

const SERVICE_KEY: Record<LaundryService, DictKey> = { wash: 'washPress', dry_clean: 'dryClean', press: 'pressOnly' };
const priceOf = (i: LaundryItem, s: LaundryService) => i[`${s}_price` as const];

export function Laundry() {
  const { bundle } = useHotel();
  const { t, pick, money } = useI18n();
  const title = usePageTitle('laundry');
  const flow = useFlow();
  const { identity } = useGuestSession();
  const items = bundle.catalog.laundry_items.filter((i) => i.available !== false && LAUNDRY_SERVICES.some((s) => priceOf(i, s) != null));
  const [qty, setQty] = useState<Record<string, number>>({});
  const [review, setReview] = useState(false);
  const [express, setExpress] = useState(false);
  const [pickup, setPickup] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const vat = { vat_rate: bundle.hotel.profile.vat_rate, prices_include_vat: bundle.hotel.profile.prices_include_vat };

  const selected = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => {
          const [id, service] = k.split(':') as [string, LaundryService];
          return { item: items.find((i) => i.id === id)!, service, quantity: n };
        })
        .filter((l) => l.item),
    [qty, items]
  );
  const expressAvailable = selected.length > 0 && selected.every((l) => l.item.express_pct != null);
  const expressPct = selected.length ? Math.max(...selected.map((l) => l.item.express_pct ?? 0)) : 0;
  const totals = sumLines(
    selected.map((l) => {
      const base = Number(priceOf(l.item, l.service));
      const unit = express && expressAvailable ? Math.round(base * (1 + (l.item.express_pct ?? 0) / 100) * 100) / 100 : base;
      return lineAmounts(unit, l.quantity, 'inherit', vat);
    })
  );
  const count = selected.reduce((s, l) => s + l.quantity, 0);

  // Categories arrive in their configured order; empty ones are skipped.
  const groups = useMemo(
    () => bundle.catalog.laundry_categories.map((c) => ({ cat: c, list: items.filter((i) => i.parent_id === c.id) })).filter((g) => g.list.length),
    [bundle.catalog.laundry_categories, items]
  );

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!pickup) errs.pickup = t('required');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    try {
      await flow.submit({ kind: 'LAUNDRY', lines: selected.map((l) => ({ item_id: l.item.id, service: l.service, quantity: l.quantity })), express: express && expressAvailable, pickup, notes });
      setQty({});
      setReview(false);
      setNotes('');
      setExpress(false);
    } catch (e) {
      if ((e as Error).message === 'identity required') return;
      setErrors(e instanceof ApiError ? e.fields : {});
      setError(e);
    }
  };

  if (!items.length) {
    return (
      <div className="mx-auto max-w-6xl pt-8">
        <SectionHeader as="h1" title={title} />
        <EmptyState icon={<Shirt className="h-6 w-6" />} title={t('laundryEmpty')} description={t('laundryEmptyHint')} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pt-8 pb-16">
      <SectionHeader as="h1" title={title} subtitle={t('laundryLead')} />
      {identity?.type !== 'IN_HOUSE' && (
        <div className="mx-5 mb-6 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-8">
          <span>{t('inHouseOnly')}</span>
          <Button size="sm" variant="secondary" onClick={() => flow.open({ kind: 'identity', reason: 'in_house_required' })}>
            {t('changeDetails')}
          </Button>
        </div>
      )}
      <div className="space-y-10 px-5 sm:px-8">
        {groups.map(({ cat, list }) => (
          <section key={cat.id} aria-labelledby={`ldy-${cat.id}`}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id={`ldy-${cat.id}`} className="eyebrow text-muted">
                {pick(cat, 'name')}
              </h2>
              {pick(cat, 'turnaround') && <p className="text-xs text-muted">{pick(cat, 'turnaround')}</p>}
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-[1.4rem] bg-surface ring-1 ring-line">
              {list.map((i) => (
                <li key={i.id} className="p-4">
                  <p className="font-semibold">{pick(i, 'name')}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {LAUNDRY_SERVICES.filter((s) => priceOf(i, s) != null).map((s) => {
                      const k = `${i.id}:${s}`;
                      const n = qty[k] ?? 0;
                      return (
                        <div key={s} className={cx('flex items-center justify-between gap-2 rounded-2xl px-3 py-2 ring-1 transition', n ? 'bg-[color-mix(in_oklab,var(--c-primary)_6%,transparent)] ring-brand/40' : 'ring-line')}>
                          <span className="min-w-0 text-sm">
                            <span className="block truncate">{t(SERVICE_KEY[s])}</span>
                            <span className="font-semibold tabular-nums">{money(Number(priceOf(i, s)))}</span>
                          </span>
                          <Stepper incLabel={t('increase')} decLabel={t('decrease')} size="sm" min={0} max={100} value={n} onChange={(v) => setQty((q) => ({ ...q, [k]: v }))} label={`${pick(i, 'name')} — ${t(SERVICE_KEY[s])}`} />
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-3 lg:bottom-6">
          <button type="button" onClick={() => setReview(true)} className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 rounded-full bg-ink px-5 text-white shadow-2xl">
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white/15 px-2 text-sm font-bold">{count}</span>
            <span className="flex-1 text-start font-semibold">{t('requestPickup')}</span>
            <span className="font-semibold tabular-nums">{money(totals.total)}</span>
          </button>
        </div>
      )}

      <Sheet
        open={review}
        onClose={() => setReview(false)}
        title={t('laundryTitle')}
        description={identity?.type === 'IN_HOUSE' ? `${t('room')} ${identity.room}` : undefined}
        closeLabel={t('close')}
        footer={
          <div className="space-y-3">
            <div className="flex justify-between text-base font-semibold">
              <span>{t('estimatedTotal')}</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
            <Button size="lg" block loading={flow.submitting} onClick={submit}>
              {t('requestPickup')}
            </Button>
          </div>
        }
      >
        {error ? (
          <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage(error)}
          </p>
        ) : null}
        <ul className="mb-5 divide-y divide-line">
          {selected.map((l) => (
            <li key={`${l.item.id}:${l.service}`} className="flex justify-between gap-3 py-2.5 text-sm">
              <span>
                {l.quantity} × {pick(l.item, 'name')} <span className="text-muted">· {t(SERVICE_KEY[l.service])}</span>
              </span>
              <span className="tabular-nums">{money(Number(priceOf(l.item, l.service)) * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-5">
          {expressAvailable && <Toggle label={t('express')} description={t('expressHint', { pct: expressPct })} checked={express} onChange={setExpress} />}
          <Field label={t('pickupTime')} required htmlFor="ldy-pickup" error={errors.pickup}>
            <Select id="ldy-pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} invalid={!!errors.pickup}>
              <option value="">{t('choose')}…</option>
              <option value={t('pickupNow')}>{t('pickupNow')}</option>
              <option value={t('pickupEvening')}>{t('pickupEvening')}</option>
              <option value={t('pickupMorning')}>{t('pickupMorning')}</option>
            </Select>
          </Field>
          <Field label={t('notes')} optionalLabel={t('optional')} htmlFor="ldy-notes">
            <TextArea id="ldy-notes" value={notes} maxLength={1000} placeholder={t('notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <p className="text-xs text-muted">{bundle.hotel.profile.prices_include_vat ? t('pricesIncludeVat') : t('pricesExcludeVat')}</p>
        </div>
      </Sheet>
    </div>
  );
}
