import { useQuery } from '@tanstack/react-query';
import { ChefHat, Clock, Flame, MapPin, Phone, Plus, Sparkles, Utensils } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ALLERGENS, DIETARY } from '@shared/fields';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Badge, EmptyState, ErrorState, Img, Skeleton, cx } from '../../components/ui';
import { useBasket } from '../basket';
import { HoursLine, OfferCard, OpenPill, OutletCard, SectionHeader, useOpenState } from '../components/cards';
import { ItemSheet } from '../sheets/ItemSheet';
import { OfferSheet } from '../sheets/OfferSheet';
import { useHotel } from '../hotel';
import type { Menu, MenuItem, Rec } from '../types';
import { GuestNotFound } from './GuestNotFound';
import { usePageTitle } from '../components/usePageTitle';

export function Dining() {
  const { bundle } = useHotel();
  const { t } = useI18n();
  const title = usePageTitle('dining');
  const [offer, setOffer] = useState<Rec | null>(null);
  const offers = bundle.catalog.offers.filter((o) => (o.placement as string[] | undefined)?.includes('dining'));
  const outlets = bundle.catalog.outlets;
  return (
    <div className="mx-auto max-w-6xl pt-8 pb-10">
      <SectionHeader as="h1" title={title} />
      {offers.length > 0 && (
        <div className="snap-row no-scrollbar mb-10 gap-4 px-5 sm:px-8">
          {offers.map((o) => (
            <div key={o.id} className={cx('shrink-0', offers.length > 1 ? 'w-[88%] sm:w-[70%]' : 'w-full')}>
              <OfferCard offer={o} onOpen={() => setOffer(o)} />
            </div>
          ))}
        </div>
      )}
      {outlets.length ? (
        <div className="grid gap-4 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {outlets.map((o) => (
            <OutletCard key={o.id} outlet={o} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Utensils className="h-6 w-6" />} title={t('noResults')} description={t('comingSoon')} />
      )}
      <OfferSheet offer={offer} onClose={() => setOffer(null)} />
    </div>
  );
}

export function OutletPage() {
  const { outletId } = useParams();
  const { bundle, slug } = useHotel();
  const { t, pick } = useI18n();
  const outlet = bundle.catalog.outlets.find((o) => o.id === outletId);
  const menuQ = useQuery({
    queryKey: ['menu', slug, outletId, bundle.preview, bundle.version],
    queryFn: () => api<{ menus: Menu[] }>(`/public/hotels/${slug}/outlets/${outletId}/menu${bundle.preview ? '?preview=1' : ''}`),
    enabled: !!outlet,
  });
  const [menuIdx, setMenuIdx] = useState(0);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [activeCat, setActiveCat] = useState<string>('');
  const catNav = useRef<HTMLDivElement>(null);
  const state = useOpenState(outlet ?? {});

  const menus = menuQ.data?.menus ?? [];
  const menu = menus[Math.min(menuIdx, menus.length - 1)];
  const cats = useMemo(() => (menu?.categories ?? []).filter((c) => c.items.length), [menu]);

  // Highlight the category in view.
  useEffect(() => {
    if (!cats.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.id.replace('cat-', ''));
      },
      { rootMargin: '-140px 0px -60% 0px' }
    );
    cats.forEach((c) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [cats]);

  useEffect(() => {
    const btn = catNav.current?.querySelector<HTMLElement>(`[data-cat="${activeCat}"]`);
    btn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeCat]);

  if (!outlet) return <GuestNotFound />;
  const name = pick(outlet, 'name');
  const canOrder = outlet.accepts_orders && state.open;

  return (
    <div className="pb-10">
      <div className="relative h-[38vh] min-h-[260px] overflow-hidden bg-ink text-white sm:h-[46vh]">
        <Img src={outlet.cover} alt="" eager className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-6 sm:px-8">
          <OpenPill rec={outlet} dark />
          <h1 className="display mt-3 text-[2.4rem] leading-tight sm:text-5xl">{name}</h1>
          {pick(outlet, 'tagline') && <p className="mt-1 text-white/80">{pick(outlet, 'tagline')}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line py-4 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <HoursLine rec={outlet} />
          </span>
          {pick(outlet, 'location') && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {pick(outlet, 'location')}
            </span>
          )}
          {outlet.phone && (
            <a href={`tel:${outlet.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 font-medium text-fg">
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span className="ltr-nums">{outlet.phone}</span>
            </a>
          )}
        </div>
        {pick(outlet, 'description') && <p className="mt-4 max-w-3xl leading-relaxed text-muted">{pick(outlet, 'description')}</p>}
        {!state.open && outlet.accepts_orders && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="status">
            {t('unavailableClosed')}
            {state.opensAt ? ` · ${t('opensAt', { time: state.opensAt })}` : ''}
          </p>
        )}
      </div>

      {menuQ.isLoading ? (
        <div className="mx-auto max-w-6xl space-y-3 px-5 pt-6 sm:px-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : menuQ.error ? (
        <ErrorState title={t('errorTitle')} description={(menuQ.error as Error).message} onRetry={() => menuQ.refetch()} retryLabel={t('retry')} />
      ) : !cats.length ? (
        <EmptyState icon={<ChefHat className="h-6 w-6" />} title={t('noMenu')} description={t('noMenuHint')} />
      ) : (
        <>
          <div className="sticky top-16 z-30 mt-4 border-b border-line bg-canvas/95 backdrop-blur-xl">
            <div className="mx-auto max-w-6xl">
              {menus.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-5 pt-3 no-scrollbar sm:px-8" role="tablist" aria-label={t('menu')}>
                  {menus.map((m, i) => (
                    <button key={m.id} type="button" role="tab" aria-selected={i === menuIdx} onClick={() => setMenuIdx(i)} className={cx('h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition', i === menuIdx ? 'bg-ink text-white' : 'bg-black/[0.05]')}>
                      {pick(m, 'name')}
                    </button>
                  ))}
                </div>
              )}
              <nav ref={catNav} aria-label={t('menuCategories')} className="flex gap-1 overflow-x-auto px-3 py-2 no-scrollbar sm:px-6">
                {cats.map((c) => (
                  <a
                    key={c.id}
                    data-cat={c.id}
                    href={`#cat-${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(`cat-${c.id}`);
                      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' });
                    }}
                    aria-current={activeCat === c.id ? 'true' : undefined}
                    className={cx('shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition', activeCat === c.id ? 'bg-brand text-brand-ink' : 'text-muted hover:text-fg')}
                  >
                    {pick(c, 'name')}
                  </a>
                ))}
              </nav>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            {cats.map((c) => (
              <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`cat-h-${c.id}`} className="scroll-mt-36 pt-8">
                <h2 id={`cat-h-${c.id}`} className="display text-[1.9rem]">
                  {pick(c, 'name')}
                </h2>
                {pick(c, 'description') && <p className="mt-1 text-sm text-muted">{pick(c, 'description')}</p>}
                <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                  {c.items.map((i) => (
                    <li key={i.id}>
                      <MenuItemRow item={i} canOrder={canOrder} onOpen={() => setItem(i)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
      <ItemSheet item={item} outlet={outlet} canOrder={canOrder} onClose={() => setItem(null)} />
    </div>
  );
}

function MenuItemRow({ item, canOrder, onOpen }: { item: MenuItem; canOrder: boolean; onOpen: () => void }) {
  const { t, pick, money, lang } = useI18n();
  const basket = useBasket();
  const inBasket = basket.lines.filter((l) => l.item_id === item.id).reduce((s, l) => s + l.quantity, 0);
  const off = item.available === false;
  const diet = (item.dietary ?? []).map((d) => DIETARY.find((x) => x.value === d)?.[lang]).filter(Boolean);
  return (
    <button type="button" onClick={onOpen} className={cx('flex w-full gap-4 rounded-[1.35rem] bg-surface p-3.5 text-start ring-1 ring-line transition hover:shadow-md active:scale-[0.995]', off && 'opacity-60')}>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.featured && (
            <Badge tone="brand">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {t('featured')}
            </Badge>
          )}
          {item.recommended && <Badge tone="warning">{t('recommended')}</Badge>}
          {off && <Badge>{t('unavailable')}</Badge>}
        </div>
        <h3 className="mt-1 font-semibold leading-snug">{pick(item, 'name')}</h3>
        {pick(item, 'description') && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{pick(item, 'description')}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="text-[0.95rem] font-semibold text-fg tabular-nums">{money(item.price)}</span>
          {item.calories ? <span>{t('calories', { n: item.calories })}</span> : null}
          {Number(item.spicy) > 0 && (
            <span className="inline-flex items-center text-red-600" aria-label={`Spicy ${item.spicy}/3`}>
              {Array.from({ length: Number(item.spicy) }).map((_, i) => (
                <Flame key={i} className="h-3.5 w-3.5" aria-hidden="true" />
              ))}
            </span>
          )}
          {diet.length > 0 && <span>{diet.join(' · ')}</span>}
          {item.allergens?.length ? <span className="sr-only">{t('allergens')}: {item.allergens.map((a) => ALLERGENS.find((x) => x.value === a)?.[lang]).join(', ')}</span> : null}
        </div>
      </div>
      <div className="relative shrink-0">
        <Img src={item.image} alt="" className="h-24 w-24 rounded-2xl sm:h-28 sm:w-28" />
        {canOrder && !off && (
          <span className="absolute -bottom-2 left-1/2 flex h-9 min-w-9 -translate-x-1/2 items-center justify-center gap-1 rounded-full bg-surface px-2.5 text-sm font-bold text-brand shadow-md ring-1 ring-line" aria-hidden="true">
            {inBasket > 0 ? inBasket : <Plus className="h-4 w-4" />}
          </span>
        )}
      </div>
    </button>
  );
}
