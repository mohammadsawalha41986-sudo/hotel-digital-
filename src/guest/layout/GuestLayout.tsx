import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  BedDouble, ClipboardList, ConciergeBell, Flower2, Home as HomeIcon, Info, Languages, Menu as MenuIcon, MessageSquareHeart,
  Shirt, ShoppingBag, Sparkles, Tag, UserRound, Utensils, type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { GUEST_PAGE_LABELS, OPEN_STATUSES, type GuestPage } from '@shared/domain';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Button, IconButton, Img, Sheet, cx } from '../../components/ui';
import { useBasket } from '../basket';
import { useFlow } from '../flow';
import { PAGE_SEGMENT, useHotel } from '../hotel';
import { guestToken, useGuestSession } from '../session';
import type { GuestRequestRow } from '../types';
import { GuestSheets } from '../sheets/GuestSheets';

export const PAGE_ICONS: Record<GuestPage, LucideIcon> = {
  home: HomeIcon,
  dining: Utensils,
  room_services: BedDouble,
  spa: Flower2,
  laundry: Shirt,
  services: ConciergeBell,
  info: Info,
  feedback: MessageSquareHeart,
  requests: ClipboardList,
  offers: Tag,
};

export function useNavItems() {
  const { bundle } = useHotel();
  const { lang } = useI18n();
  return bundle.site.navigation
    .filter((n) => n.visible)
    .map((n) => ({ ...n, label: (lang === 'ar' ? n.label_ar : n.label_en) || GUEST_PAGE_LABELS[n.page][lang] }));
}

export function useMyRequests() {
  const { slug } = useHotel();
  return useQuery({
    queryKey: ['my-requests', slug],
    queryFn: () => api<{ requests: GuestRequestRow[] }>(`/public/hotels/${slug}/requests`, { headers: { 'x-guest-token': guestToken() } }),
    refetchInterval: 20_000,
  });
}

export function GuestLayout({ children }: { children: ReactNode }) {
  const { bundle } = useHotel();
  const { t } = useI18n();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const isHome = location.pathname.replace(/\/$/, '') === `/h/${bundle.hotel.slug}`;

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setDrawer(false);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow">
        {t('skipToContent')}
      </a>
      {bundle.preview && (
        <div className="sticky top-0 z-[60] bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950" role="status">
          {t('previewBanner')}
        </div>
      )}
      <Header overlay={isHome} onMenu={() => setDrawer(true)} />
      <main id="main" className="pb-28 lg:pb-12">
        {children}
      </main>
      <Footer />
      <BasketBar />
      <BottomNav />
      <NavDrawer open={drawer} onClose={() => setDrawer(false)} />
      <GuestSheets />
    </div>
  );
}

function Header({ overlay, onMenu }: { overlay: boolean; onMenu: () => void }) {
  const { bundle, path } = useHotel();
  const { t, lang } = useI18n();
  const { setLang } = useGuestSession();
  const [scrolled, setScrolled] = useState(false);
  const my = useMyRequests();
  const openCount = my.data?.requests.filter((r) => OPEN_STATUSES.includes(r.status as never)).length ?? 0;
  const b = bundle.hotel.branding;
  const both = bundle.hotel.profile.language_mode === 'both';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const transparent = overlay && !scrolled;
  const name = lang === 'ar' ? bundle.hotel.profile.name_ar : bundle.hotel.profile.name_en;
  const logo = transparent ? b.logo_inverse || b.logo : b.logo;

  return (
    <header
      className={cx(
        'z-50 transition-colors duration-300',
        overlay ? 'fixed inset-x-0 top-0' : 'sticky top-0',
        transparent ? 'bg-gradient-to-b from-black/45 to-transparent text-white' : 'border-b border-line bg-surface/90 text-fg backdrop-blur-xl'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-5">
        <IconButton label={t('openMenu')} onClick={onMenu} className={transparent ? 'hover:bg-white/15' : ''}>
          <MenuIcon className="h-5 w-5" aria-hidden="true" />
        </IconButton>
        <Link to={path('home')} className="flex min-w-0 flex-1 items-center justify-center gap-2 lg:justify-start" aria-label={name}>
          {logo ? (
            <Img src={logo} alt={name} className="h-9 w-auto max-w-[9rem] bg-transparent [&_img]:object-contain" />
          ) : (
            <span className="display truncate text-lg leading-none sm:text-xl">{name}</span>
          )}
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {['dining', 'room_services', 'spa', 'services', 'info'].map((p) => (
            <NavLink key={p} to={path(p as GuestPage)} className={({ isActive }) => cx('rounded-full px-3 py-2 text-sm font-medium transition', transparent ? 'hover:bg-white/15' : 'hover:bg-black/5', isActive && (transparent ? 'bg-white/15' : 'bg-black/5'))}>
              {GUEST_PAGE_LABELS[p as GuestPage][lang]}
            </NavLink>
          ))}
        </nav>
        {both && (
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            aria-label={t('switchLanguage')}
            className={cx('inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition', transparent ? 'hover:bg-white/15' : 'hover:bg-black/5')}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            <span lang={lang === 'ar' ? 'en' : 'ar'}>{lang === 'ar' ? 'EN' : 'ع'}</span>
          </button>
        )}
        <Link
          to={path('requests')}
          aria-label={`${t('myRequests')}${openCount ? ` (${openCount})` : ''}`}
          className={cx('relative inline-flex h-10 w-10 items-center justify-center rounded-full transition', transparent ? 'hover:bg-white/15' : 'hover:bg-black/5')}
        >
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
          {openCount > 0 && (
            <span className="absolute end-1 top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-white">{openCount}</span>
          )}
        </Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const items = useNavItems().filter((n) => n.in_bottom_bar).slice(0, 5);
  const { path, bundle } = useHotel();
  const location = useLocation();
  if (items.length < 2) return null;
  const current = location.pathname.replace(`/h/${bundle.hotel.slug}`, '').replace(/^\//, '').split('/')[0];
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg">
        {items.map((n) => {
          const Icon = PAGE_ICONS[n.page];
          const active = current === PAGE_SEGMENT[n.page];
          return (
            <li key={n.id} className="flex-1">
              <Link to={path(n.page)} aria-current={active ? 'page' : undefined} className={cx('flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition', active ? 'text-brand' : 'text-muted')}>
                <Icon className={cx('h-5 w-5', active && 'stroke-[2.2]')} aria-hidden="true" />
                <span className="max-w-full truncate px-1">{n.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function BasketBar() {
  const basket = useBasket();
  const { open, sheet } = useFlow();
  const { t, money, lang } = useI18n();
  const hasBottomNav = useNavItems().filter((n) => n.in_bottom_bar).length >= 2;
  return (
    <AnimatePresence>
      {basket.count > 0 && sheet?.kind !== 'basket' && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className={cx('fixed inset-x-0 z-40 px-3 lg:bottom-6', hasBottomNav ? 'bottom-[calc(4.25rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]')}
        >
          <button
            type="button"
            onClick={() => open({ kind: 'basket' })}
            className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 rounded-full bg-ink px-5 text-white shadow-2xl shadow-black/25 transition active:scale-[0.99]"
          >
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white/15 px-2 text-sm font-bold">{basket.count}</span>
            <span className="flex-1 truncate text-start font-semibold">
              {t('viewOrder')} · <span className="font-normal opacity-80">{basket.outletName ? (lang === 'ar' ? basket.outletName.ar : basket.outletName.en) : ''}</span>
            </span>
            <span className="font-semibold tabular-nums">{money(basket.totals.total)}</span>
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useNavItems();
  const { path, bundle } = useHotel();
  const { t, lang } = useI18n();
  const { identity } = useGuestSession();
  const flow = useFlow();
  const name = lang === 'ar' ? bundle.hotel.profile.name_ar : bundle.hotel.profile.name_en;
  return (
    <Sheet open={open} onClose={onClose} title={name} closeLabel={t('close')} size="sm">
      {identity && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-black/[0.035] p-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-brand-ink">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{identity.name}</p>
            <p className="text-sm text-muted">{identity.type === 'IN_HOUSE' ? `${t('room')} ${identity.room}` : t('visitor')}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onClose();
              flow.open({ kind: 'identity' });
            }}
          >
            {t('edit')}
          </Button>
        </div>
      )}
      <nav aria-label="All pages">
        <ul className="divide-y divide-line">
          {items.map((n) => {
            const Icon = PAGE_ICONS[n.page] ?? Sparkles;
            return (
              <li key={n.id}>
                <Link to={path(n.page)} onClick={onClose} className="flex min-h-14 items-center gap-4 py-2 text-[1.02rem] font-medium">
                  <Icon className="h-5 w-5 text-muted" aria-hidden="true" />
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </Sheet>
  );
}

function Footer() {
  const { bundle } = useHotel();
  const { lang, t } = useI18n();
  const p = bundle.hotel.profile;
  return (
    <footer className="bg-ink pb-32 text-white/80 lg:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2">
        <div>
          <p className="display text-2xl text-white">{lang === 'ar' ? p.name_ar : p.name_en}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed">{lang === 'ar' ? p.address_ar : p.address_en}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm sm:items-end">
          {p.phone && (
            <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="ltr-nums hover:text-white">
              {p.phone}
            </a>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`} className="hover:text-white">
              {p.email}
            </a>
          )}
          <p className="mt-4 text-xs text-white/45">{t('poweredBy')}</p>
        </div>
      </div>
    </footer>
  );
}
