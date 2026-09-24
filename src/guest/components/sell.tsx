import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock, Plus, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GUEST_PAGE_LABELS } from '@shared/domain';
import { MERCH_BADGES } from '@shared/fields';
import { Icon } from '../../lib/icons';
import { useI18n } from '../../lib/i18n';
import { Img, cx } from '../../components/ui';
import { useQuickAction } from '../actions';
import { useHotel } from '../hotel';
import { track, trackOnce } from '../track';
import type { Rec, ServiceRec } from '../types';
import { DUR, EASE } from './motion';

// ------------------------------------------------------------------------------------
// Merchandising
// ------------------------------------------------------------------------------------
/** Popular / Best seller / New … labels configured per record by the hotel. */
export function MerchBadges({ rec, dark, max = 2, className }: { rec: Rec; dark?: boolean; max?: number; className?: string }) {
  const { lang } = useI18n();
  const list = (Array.isArray(rec.badges) ? (rec.badges as string[]) : []).slice(0, max);
  if (!list.length) return null;
  return (
    <span className={cx('flex flex-wrap gap-1.5', className)}>
      {list.map((b) => {
        const o = MERCH_BADGES.find((x) => x.value === b);
        if (!o) return null;
        return (
          <span
            key={b}
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-bold tracking-wide uppercase',
              dark ? 'bg-white/90 text-neutral-900' : b === 'limited' ? 'bg-[color-mix(in_oklab,var(--c-error)_12%,white)] text-[var(--c-error)]' : 'bg-[color-mix(in_oklab,var(--c-accent)_16%,white)] text-[color-mix(in_oklab,var(--c-accent)_70%,black)]'
            )}
          >
            {b === 'best_seller' || b === 'popular' ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : null}
            {o[lang]}
          </span>
        );
      })}
    </span>
  );
}

/** Original price struck through next to the promotional price, plus the saving. */
export function PriceBlock({ original, price, label, dark, size = 'md' }: { original?: number | null; price?: number | null; label?: string; dark?: boolean; size?: 'md' | 'lg' }) {
  const { money, t } = useI18n();
  if (price == null && !label) return null;
  const save = original && price != null && original > price ? Math.round(((original - price) / original) * 100) : 0;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={cx('font-semibold tabular-nums', size === 'lg' ? 'text-2xl' : 'text-lg', dark ? 'text-white' : 'text-fg')}>{label || money(price!)}</span>
      {save > 0 && (
        <>
          <s className={cx('text-sm tabular-nums', dark ? 'text-white/60' : 'text-muted')}>{money(original!)}</s>
          <span className="rounded-full bg-[var(--c-success)] px-2 py-0.5 text-[0.7rem] font-bold text-white">{t('savePct', { n: save })}</span>
        </>
      )}
    </p>
  );
}

// ------------------------------------------------------------------------------------
// Offers
// ------------------------------------------------------------------------------------
export function OfferCard({ offer, onOpen }: { offer: Rec; onOpen: () => void }) {
  const { pick, date, t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const code = String(offer.code ?? '');
  // An impression counts when at least half the card is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && trackOnce('offer_impression', { target_type: 'offer', target_code: code }), { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [code]);
  const ends = typeof offer.ends_at === 'string' && offer.ends_at ? date(offer.ends_at, { day: 'numeric', month: 'short' }) : '';
  const badge = pick(offer, 'badge');
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        track('offer_click', { target_type: 'offer', target_code: code });
        onOpen();
      }}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] bg-surface text-start shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-12px_rgb(0_0_0/0.18)] ring-1 ring-line transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-16px_rgb(0_0_0/0.28)] active:scale-[0.99]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Img src={offer.image as string} alt="" fallbackIcon={<Icon name="sparkles" />} className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute inset-x-0 top-0 flex flex-wrap items-start gap-1.5 p-3.5">
          {badge && <span className="rounded-full bg-accent px-2.5 py-1 text-[0.7rem] font-bold text-white shadow-sm">{badge}</span>}
          <MerchBadges rec={offer} dark />
        </div>
        {ends && (
          <span className="absolute bottom-3 start-3.5 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[0.72rem] font-medium text-white backdrop-blur">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {t('validUntil', { date: ends })}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="display text-[1.55rem] leading-tight sm:text-[1.75rem]">{pick(offer, 'title')}</h3>
        {pick(offer, 'subtitle') && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{pick(offer, 'subtitle')}</p>}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <PriceBlock original={offer.original_price as number | null} price={offer.offer_price as number | null} label={pick(offer, 'price_label')} />
          <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-cta px-4 text-sm font-semibold text-cta-ink transition group-hover:bg-cta-hover">
            {pick(offer, 'cta_label') || t('viewOffer')}
            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Swipeable offer carousel: native scroll-snap (fast, accessible, no layout
 * shift) with autoplay that pauses on touch, hover and focus, and never runs
 * when the guest prefers reduced motion.
 */
export function OfferCarousel({ offers, onOpen, autoplay = 6 }: { offers: Rec[]; onOpen: (o: Rec) => void; autoplay?: number }) {
  const { t, dir } = useI18n();
  const track_ = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  const goTo = (i: number) => {
    const el = track_.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft - (dir === 'rtl' ? el.clientWidth - card.clientWidth : 0) * 0, behavior: reduce ? 'auto' : 'smooth' });
  };
  // Track the card nearest the start edge.
  useEffect(() => {
    const el = track_.current;
    if (!el) return;
    const onScroll = () => {
      const kids = [...el.children] as HTMLElement[];
      const start = el.getBoundingClientRect()[dir === 'rtl' ? 'right' : 'left'];
      let best = 0;
      let dist = Infinity;
      kids.forEach((k, i) => {
        const d = Math.abs(k.getBoundingClientRect()[dir === 'rtl' ? 'right' : 'left'] - start);
        if (d < dist) (dist = d), (best = i);
      });
      setIndex(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [dir]);
  useEffect(() => {
    if (reduce || paused || offers.length < 2 || !autoplay) return;
    const id = window.setInterval(() => goTo((index + 1) % offers.length), autoplay * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, reduce, offers.length, autoplay]);

  if (offers.length === 1) {
    return (
      <div className="px-5 sm:px-8">
        <div className="mx-auto max-w-xl lg:max-w-2xl">
          <OfferCard offer={offers[0]} onOpen={() => onOpen(offers[0])} />
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div ref={track_} className="snap-row no-scrollbar gap-4 px-5 pb-3 sm:px-8">
        {offers.map((o, i) => (
          <div key={o.id} className="w-[86%] shrink-0 sm:w-[58%] lg:w-[40%]" aria-roledescription="slide" aria-label={`${i + 1} / ${offers.length}`}>
            <OfferCard offer={o} onOpen={() => onOpen(o)} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 px-5 sm:px-8">
        <div className="flex items-center gap-1.5">
          {offers.map((o, i) => (
            <button key={o.id} type="button" aria-label={t('goToSlide', { n: i + 1 })} aria-current={i === index ? 'true' : undefined} onClick={() => goTo(i)} className="flex h-8 items-center">
              <span className={cx('block h-1.5 rounded-full transition-all duration-300', i === index ? 'w-7 bg-brand' : 'w-2.5 bg-black/15')} />
            </button>
          ))}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button type="button" aria-label={t('prevSlide')} onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface ring-1 ring-line transition hover:shadow-md disabled:opacity-40">
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <button type="button" aria-label={t('nextSlide')} onClick={() => goTo(Math.min(offers.length - 1, index + 1))} disabled={index >= offers.length - 1} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface ring-1 ring-line transition hover:shadow-md disabled:opacity-40">
            <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------
// Experience tiles (homepage discovery)
// ------------------------------------------------------------------------------------
export interface Tile {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  image: string;
  icon: string;
  badges?: string[];
  to?: string;
  onClick?: () => void;
}

/** Admin-managed experiences, or tiles derived from the hotel's services when none are configured. */
export function useExperienceTiles(onOffer: (o: Rec) => void): Tile[] {
  const { bundle, path } = useHotel();
  const { pick, t, lang } = useI18n();
  const { openService } = useQuickAction();
  const page = (p: keyof typeof GUEST_PAGE_LABELS) => GUEST_PAGE_LABELS[p][lang];
  const c = bundle.catalog;
  return useMemo(() => {
    const spaPath = (id: string) => `${path('spa')}${path('spa').includes('?') ? '&' : '?'}category=${id}`;
    const configured = (c.experiences ?? [])
      .map((e): Tile | null => {
        const base = { id: e.id, code: String(e.code ?? ''), title: pick(e, 'title'), subtitle: pick(e, 'subtitle'), image: String(e.image ?? ''), icon: String(e.icon || 'sparkles'), badges: e.badges as string[] };
        switch (e.target) {
          case 'page':
            return { ...base, to: path(String(e.page)) };
          case 'outlet': {
            const o = c.outlets.find((x) => x.id === e.outlet_id);
            return o ? { ...base, image: base.image || String(o.cover ?? ''), to: path(`dining/${o.id}`) } : null;
          }
          case 'spa_category': {
            const s = c.spa_categories.find((x) => x.id === e.spa_category_id);
            return s ? { ...base, image: base.image || String(s.image ?? ''), to: spaPath(s.id) } : null;
          }
          case 'room_service': {
            const s = c.room_services.find((x) => x.id === e.room_service_id) as ServiceRec | undefined;
            return s ? { ...base, onClick: () => openService('room_services', s) } : null;
          }
          case 'hotel_service': {
            const s = c.hotel_services.find((x) => x.id === e.hotel_service_id) as ServiceRec | undefined;
            return s ? { ...base, onClick: () => openService('hotel_services', s) } : null;
          }
          case 'offer': {
            const o = c.offers.find((x) => x.id === e.offer_id);
            return o ? { ...base, image: base.image || String(o.image ?? ''), onClick: () => onOffer(o) } : null;
          }
          default:
            return null;
        }
      })
      .filter((x): x is Tile => !!x && !!x.title);
    if (configured.length) return configured;

    // Derived from what the hotel actually offers — never a tile without content behind it.
    const tiles: Tile[] = [];
    const inRoom = c.outlets.find((o) => o.type === 'room_service' || (o.room_delivery && o.accepts_orders));
    const firstImage = (list: Rec[], key: string) => String(list.find((x) => x[key])?.[key] ?? '');
    if (c.outlets.length) tiles.push({ id: 'dining', code: 'AUTO-DINING', title: page('dining'), subtitle: t('tileDiningSub'), image: firstImage(c.outlets.filter((o) => o !== inRoom), 'cover'), icon: 'utensils', to: path('dining') });
    if (inRoom) tiles.push({ id: 'inroom', code: 'AUTO-INROOM', title: pick(inRoom, 'name'), subtitle: t('tileInRoomSub'), image: String(inRoom.cover ?? ''), icon: 'concierge-bell', to: path(`dining/${inRoom.id}`) });
    if (c.spa_categories.length) tiles.push({ id: 'spa', code: 'AUTO-SPA', title: page('spa'), subtitle: t('tileSpaSub'), image: firstImage(c.spa_categories, 'image'), icon: 'flower', to: path('spa') });
    if (c.room_services.length) tiles.push({ id: 'room', code: 'AUTO-ROOM', title: page('room_services'), subtitle: t('tileRoomSub'), image: firstImage(c.room_services, 'image'), icon: 'bed-double', to: path('room_services') });
    if (c.laundry_items.length) tiles.push({ id: 'laundry', code: 'AUTO-LAUNDRY', title: page('laundry'), subtitle: t('tileLaundrySub'), image: firstImage(c.laundry_categories ?? [], 'image'), icon: 'shirt', to: path('laundry') });
    if (c.hotel_services.length) tiles.push({ id: 'services', code: 'AUTO-SERVICES', title: page('services'), subtitle: t('tileServicesSub'), image: firstImage(c.hotel_services, 'image'), icon: 'car', to: path('services') });
    if (c.offers.length > 1) tiles.push({ id: 'offers', code: 'AUTO-OFFERS', title: page('offers'), subtitle: t('tileOffersSub'), image: firstImage(c.offers, 'image'), icon: 'tag', to: path('offers') });
    return tiles;
  }, [c, path, pick, t, openService, onOffer, lang]);
}

function TileInner({ tile, big, tone }: { tile: Tile; big?: boolean; tone: number }) {
  return (
    <>
      <Img src={tile.image} alt="" tone={tone} fallbackIcon={<Icon name={tile.icon} />} className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-[1.05]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
          <Icon name={tile.icon} className="h-5 w-5" />
        </span>
        {tile.badges?.length ? <MerchBadges rec={{ badges: tile.badges } as unknown as Rec} dark max={1} /> : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className={cx('display leading-tight', big ? 'text-[1.9rem] sm:text-4xl' : 'text-[1.3rem] sm:text-2xl')}>{tile.title}</p>
        {tile.subtitle && <p className="mt-1 line-clamp-2 text-[0.8rem] text-white/80 sm:text-sm">{tile.subtitle}</p>}
      </div>
    </>
  );
}

/** Bento grid of experiences: the first tile is large, the rest square-ish. */
export function ExperienceGrid({ tiles }: { tiles: Tile[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid grid-cols-2 gap-3 px-5 sm:gap-4 sm:px-8 lg:grid-cols-4">
      {tiles.map((tile, i) => {
        const big = i === 0 && tiles.length > 2;
        // The last tile widens to close gaps: 2 columns on phones, 4 on desktop (the first tile takes 2×2 there).
        const last = i === tiles.length - 1 && i > 0;
        const small = tiles.length - (big ? 1 : 0);
        const mobileWide = last && small % 2 === 1;
        const lgCells = (big ? 4 : 0) + small;
        const lgGap = (4 - (lgCells % 4)) % 4;
        const lgSpan = last && lgGap ? { 1: 'lg:col-span-2', 2: 'lg:col-span-3', 3: 'lg:col-span-4' }[lgGap] : '';
        const cls = cx(
          'group relative block w-full overflow-hidden rounded-[1.5rem] bg-ink text-start shadow-sm transition active:scale-[0.98]',
          big ? 'aspect-[16/10] lg:aspect-auto lg:h-full' : mobileWide || lgSpan ? cx(mobileWide ? 'aspect-[16/9]' : 'aspect-[4/5]', lgSpan && 'lg:aspect-auto lg:h-full') : 'aspect-[4/5]'
        );
        const onClick = () => {
          track('experience_click', { target_type: 'experience', target_code: tile.code });
          tile.onClick?.();
        };
        return (
          <motion.li
            key={tile.id}
            className={cx(big && 'col-span-2 lg:row-span-2', mobileWide && 'col-span-2', lgSpan, !mobileWide && lgSpan && 'col-span-1')}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ duration: DUR.base, ease: EASE, delay: Math.min(i, 6) * 0.05 }}
          >
            {tile.to ? (
              <Link to={tile.to} className={cls} onClick={onClick}>
                <TileInner tile={tile} big={big} tone={i} />
              </Link>
            ) : (
              <button type="button" className={cls} onClick={onClick}>
                <TileInner tile={tile} big={big} tone={i} />
              </button>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------------------------
// Popular items (merchandised menu items across outlets)
// ------------------------------------------------------------------------------------
export function PopularItems({ items }: { items: Rec[] }) {
  const { pick, money } = useI18n();
  const { path, bundle } = useHotel();
  const navigate = useNavigate();
  return (
    <div className="snap-row no-scrollbar gap-3 px-5 pb-2 sm:px-8">
      {items.map((i) => {
        const outlet = bundle.catalog.outlets.find((o) => o.id === i.outlet_id);
        return (
          <button
            key={i.id}
            type="button"
            onClick={() => navigate(`${path(`dining/${i.outlet_id}`)}${path('dining').includes('?') ? '&' : '?'}item=${i.id}`)}
            className="group w-[44%] shrink-0 text-start sm:w-[30%] lg:w-[18%]"
          >
            <div className="relative aspect-square overflow-hidden rounded-[1.35rem] bg-ink shadow-sm">
              <Img src={i.image as string} alt="" fallbackIcon={<Icon name="utensils" />} className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-[1.05]" />
              <MerchBadges rec={i} dark max={1} className="absolute start-2.5 top-2.5" />
              <span className="absolute end-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-brand shadow-md transition group-active:scale-90" aria-hidden="true">
                <Plus className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 line-clamp-1 font-semibold leading-snug">{pick(i, 'name')}</p>
            <p className="text-sm text-muted">
              <span className="font-semibold text-fg tabular-nums">{money(i.price as number)}</span>
              {outlet && <span> · {pick(outlet, 'name')}</span>}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/** Small cross-fading label (e.g. rotating hero subtitle). */
export function FadeText({ text, className }: { text: ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={String(text)} className={className} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: DUR.base, ease: EASE }}>
        {text}
      </motion.span>
    </AnimatePresence>
  );
}
