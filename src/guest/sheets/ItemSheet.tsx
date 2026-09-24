import { Check, Flame } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ALLERGENS, DIETARY, type ModifierGroup } from '@shared/fields';
import { useI18n } from '../../lib/i18n';
import { Badge, Button, Field, Img, Sheet, Stepper, TextArea, cx } from '../../components/ui';
import { unitPrice, useBasket } from '../basket';
import { embedUrl } from '../components/MediaBackground';
import type { MenuItem, Outlet } from '../types';

function defaultSelection(groups: ModifierGroup[]) {
  // Pre-select the first available option of required single-choice groups (e.g. size).
  const sel: Record<string, string[]> = {};
  for (const g of groups) {
    if (g.min === 1 && g.max === 1) {
      const first = g.options.find((o) => o.available);
      if (first) sel[g.id] = [first.id];
    }
  }
  return sel;
}

export function ItemSheet({ item, outlet, canOrder, onClose }: { item: MenuItem | null; outlet: Outlet; canOrder: boolean; onClose: () => void }) {
  const { t, pick, money, lang } = useI18n();
  const basket = useBasket();
  const groups = useMemo(() => item?.modifiers ?? [], [item]);
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  useEffect(() => {
    setQty(1);
    setNote('');
    setMissing([]);
    setConfirmSwitch(false);
    setSel(defaultSelection(groups));
  }, [item?.id, groups]);

  if (!item) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const off = item.available === false;
  const price = unitPrice({ base_price: item.price, groups, modifiers: sel });

  const toggle = (g: ModifierGroup, optId: string) => {
    setSel((s) => {
      const cur = s[g.id] ?? [];
      if (g.max === 1) return { ...s, [g.id]: cur[0] === optId && g.min === 0 ? [] : [optId] };
      if (cur.includes(optId)) return { ...s, [g.id]: cur.filter((x) => x !== optId) };
      if (cur.length >= g.max) return s;
      return { ...s, [g.id]: [...cur, optId] };
    });
    setMissing((m) => m.filter((x) => x !== g.id));
  };

  const add = (force = false) => {
    const miss = groups.filter((g) => (sel[g.id]?.length ?? 0) < g.min).map((g) => g.id);
    setMissing(miss);
    if (miss.length) {
      document.getElementById(`grp-${miss[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!force && basket.outletId && basket.outletId !== outlet.id && basket.lines.length) {
      setConfirmSwitch(true);
      return;
    }
    basket.add(
      { id: outlet.id, name_en: String(outlet.name_en), name_ar: String(outlet.name_ar || outlet.name_en) },
      { item_id: item.id, name_en: String(item.name_en), name_ar: String(item.name_ar || item.name_en), image: item.image, base_price: item.price, vat_mode: item.vat_mode, quantity: qty, modifiers: sel, groups, note: note.trim() }
    );
    onClose();
  };

  const embed = item.video ? embedUrl(item.video) : null;
  const diet = (item.dietary ?? []).map((d) => DIETARY.find((x) => x.value === d)?.[lang]).filter(Boolean) as string[];
  const allergens = (item.allergens ?? []).map((a) => ALLERGENS.find((x) => x.value === a)?.[lang]).filter(Boolean) as string[];

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={pick(item, 'name')}
      closeLabel={t('close')}
      footer={
        canOrder && !off ? (
          confirmSwitch ? (
            <div className="space-y-3">
              <p className="text-sm">{t('otherOutlet', { outlet: basket.outletName ? (lang === 'ar' ? basket.outletName.ar : basket.outletName.en) : '' })}</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setConfirmSwitch(false)}>
                  {t('keep')}
                </Button>
                <Button
                  onClick={() => {
                    basket.clear();
                    add(true);
                  }}
                >
                  {t('startNew')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Stepper value={qty} onChange={setQty} label={t('quantity')} />
              <Button size="lg" className="flex-1 whitespace-nowrap px-4" onClick={() => add()} data-testid="add-to-order" aria-label={`${t('addToOrder')} · ${money(price * qty)}`}>
                <span className="hidden min-[420px]:inline">{t('addToOrder')}</span>
                <span className="min-[420px]:hidden">{t('add')}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{money(price * qty)}</span>
              </Button>
            </div>
          )
        ) : undefined
      }
    >
      {embed ? (
        <div className="relative mb-5 aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe src={embed.replace('autoplay=1', 'autoplay=0').replace('controls=0', 'controls=1')} title={pick(item, 'name')} allow="encrypted-media" className="absolute inset-0 h-full w-full border-0" />
        </div>
      ) : item.video ? (
        <video src={item.video} poster={item.image || undefined} controls playsInline className="mb-5 aspect-video w-full rounded-2xl bg-black" />
      ) : item.image ? (
        <Img src={item.image} alt={pick(item, 'name')} className="mb-5 aspect-[4/3] w-full rounded-2xl" />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xl font-semibold tabular-nums">{money(item.price)}</span>
        {item.calories ? <Badge>{t('calories', { n: item.calories })}</Badge> : null}
        {item.prep_minutes ? <Badge>{t('prep', { n: item.prep_minutes })}</Badge> : null}
        {Number(item.spicy) > 0 && (
          <Badge tone="danger">
            {Array.from({ length: Number(item.spicy) }).map((_, i) => (
              <Flame key={i} className="h-3 w-3" aria-hidden="true" />
            ))}
          </Badge>
        )}
        {diet.map((d) => (
          <Badge key={d} tone="success">
            {d}
          </Badge>
        ))}
      </div>
      {pick(item, 'description') && <p className="mt-4 leading-relaxed text-muted">{pick(item, 'description')}</p>}
      {allergens.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">{t('allergens')}:</span> <span className="text-muted">{allergens.join('، ')}</span>
        </p>
      )}
      {off && <p className="mt-4 rounded-2xl bg-black/[0.04] px-4 py-3 text-sm font-medium">{t('unavailable')}</p>}

      {canOrder && !off && (
        <div className="mt-6 space-y-6">
          {groups.map((g) => {
            const chosen = sel[g.id] ?? [];
            const isMissing = missing.includes(g.id);
            return (
              <fieldset key={g.id} id={`grp-${g.id}`} aria-describedby={`grp-${g.id}-hint`}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <legend className="font-semibold">{lang === 'ar' ? g.name_ar || g.name_en : g.name_en}</legend>
                  <span id={`grp-${g.id}-hint`} className={cx('text-xs font-medium', isMissing ? 'text-red-600' : 'text-muted')}>
                    {g.min > 0 ? `${t('requiredBadge')} · ` : ''}
                    {g.min === g.max ? t('chooseExactly', { n: g.max }) : t('chooseUpTo', { n: g.max })}
                  </span>
                </div>
                <div className={cx('divide-y divide-line overflow-hidden rounded-2xl ring-1', isMissing ? 'ring-red-400' : 'ring-line')}>
                  {g.options.map((o) => {
                    const on = chosen.includes(o.id);
                    const disabled = !o.available || (!on && g.max > 1 && chosen.length >= g.max);
                    return (
                      <label key={o.id} className={cx('flex min-h-13 cursor-pointer items-center gap-3 px-4 py-3 transition', on && 'bg-[color-mix(in_oklab,var(--c-primary)_6%,transparent)]', disabled && 'cursor-not-allowed opacity-50')}>
                        <input type={g.max === 1 ? 'radio' : 'checkbox'} name={`grp-${g.id}`} checked={on} disabled={disabled} onChange={() => toggle(g, o.id)} className="sr-only" />
                        <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center border-2 transition', g.max === 1 ? 'rounded-full' : 'rounded-md', on ? 'border-brand bg-brand text-brand-ink' : 'border-black/25')} aria-hidden="true">
                          {on && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span className="flex-1">{lang === 'ar' ? o.name_ar || o.name_en : o.name_en}</span>
                        {o.price > 0 && <span className="text-sm text-muted tabular-nums">+{money(o.price)}</span>}
                        {!o.available && <span className="text-xs text-muted">{t('unavailable')}</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          <Field label={t('specialInstructions')} optionalLabel={t('optional')} htmlFor={`note-${item.id}`}>
            <TextArea id={`note-${item.id}`} rows={2} maxLength={300} value={note} placeholder={t('specialPlaceholder')} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      )}
    </Sheet>
  );
}
