import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, BedDouble, BookOpen, History, Building2, ClipboardList, ConciergeBell, ExternalLink, FileSignature, FileSpreadsheet, Flower2, Image, Info, KeyRound, Landmark, LayoutTemplate,
  LineChart, LogOut, Menu, Compass, Bell, Languages, MessageSquareQuote, Palette, PhoneForwarded, QrCode, ReceiptText, ScrollText, Settings2, Shirt, ShoppingBag, Tag, UserRound, Users as UsersIcon, Utensils, Zap, type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABELS, roleCan, type Module } from '@shared/domain';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Button, Field, IconButton, Select, Sheet, TextInput, cx } from '../../components/ui';
import { useMe } from '../data';
import { PublishControls } from '../components/Publish';
import { useFeedback } from '../feedback';
import { L, fmtDate, pickLang, setAdminLang, tr, useAdminLang } from '../i18n';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  module: Module;
}

/** Platform-wide finance (not hotel-scoped). */
const PLATFORM_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: 'dashboard', label: 'Commercial dashboard', icon: BarChart3 },
  { to: 'agreements', label: 'Agreements & rules', icon: FileSignature },
  { to: 'orders', label: 'All orders', icon: ShoppingBag },
  { to: 'settlements', label: 'Settlements', icon: ReceiptText },
  { to: 'ledger', label: 'Commission ledger', icon: BookOpen },
  { to: 'reports', label: 'Reports', icon: LineChart },
];

/** Sidebar structure. Labels are English source strings, localised at render. */
const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'Overview', items: [{ to: 'dashboard', label: 'Dashboard', icon: BarChart3, module: 'dashboard' }] },
  {
    label: 'Operations',
    items: [
      { to: 'requests', label: 'Requests', icon: ClipboardList, module: 'requests' },
      { to: 'reviews', label: 'Guest relations & reviews', icon: MessageSquareQuote, module: 'reviews' },
    ],
  },
  {
    label: 'Guests & orders',
    items: [
      { to: 'guests', label: 'Guests', icon: UserRound, module: 'guests' },
      { to: 'orders', label: 'Orders', icon: ShoppingBag, module: 'orders' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: 'finance', label: 'Finance', icon: Landmark, module: 'finance' },
      { to: 'reports', label: 'Reports', icon: LineChart, module: 'orders' },
    ],
  },
  {
    label: 'Guest experience',
    items: [
      { to: 'website', label: 'Website & homepage', icon: LayoutTemplate, module: 'hotel' },
      { to: 'experiences', label: 'Experience categories', icon: Compass, module: 'hotel' },
      { to: 'offers', label: 'Offers & packages', icon: Tag, module: 'offers' },
      { to: 'quick-actions', label: 'Quick actions', icon: Zap, module: 'hotel' },
      { to: 'publishing', label: 'Publishing history', icon: History, module: 'hotel' },
    ],
  },
  {
    label: 'Services',
    items: [
      { to: 'dining', label: 'Dining & menus', icon: Utensils, module: 'dining' },
      { to: 'room-services', label: 'Room services', icon: BedDouble, module: 'room_services' },
      { to: 'hotel-services', label: 'Guest services', icon: ConciergeBell, module: 'hotel_services' },
      { to: 'spa', label: 'Wellness & spa', icon: Flower2, module: 'spa' },
      { to: 'laundry', label: 'Laundry', icon: Shirt, module: 'laundry' },
      { to: 'info', label: 'Hotel information', icon: Info, module: 'hotel' },
    ],
  },
  {
    label: 'Hotel setup',
    items: [
      { to: 'profile', label: 'Hotel profile & settings', icon: Settings2, module: 'hotel' },
      { to: 'branding', label: 'Brand & theme', icon: Palette, module: 'hotel' },
      { to: 'departments', label: 'Departments & WhatsApp', icon: PhoneForwarded, module: 'hotel' },
      { to: 'media', label: 'Media library', icon: Image, module: 'hotel' },
      { to: 'qr', label: 'QR codes', icon: QrCode, module: 'hotel' },
      { to: 'import', label: 'Data import & export', icon: FileSpreadsheet, module: 'import' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: 'users', label: 'Users & permissions', icon: UsersIcon, module: 'users' },
      { to: 'audit', label: 'Audit log', icon: ScrollText, module: 'audit' },
    ],
  },
];

export function AdminLayout({ hid, children }: { hid?: string; children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [location.pathname]);
  const hotel = me.data?.hotels?.find((h) => h.id === hid);
  const user = me.data?.user;

  return (
    <div className="min-h-dvh bg-canvas font-sans text-fg lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">{tr('Skip to content')}</a>
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-e border-black/[0.07] bg-white lg:block">
        <Sidebar hid={hid} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-black/[0.07] bg-white/90 px-3 backdrop-blur lg:hidden">
          <IconButton label={tr('Open navigation')} onClick={() => setDrawer(true)}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </IconButton>
          <span className="truncate font-semibold">{pickLang(hotel, 'name') || tr('Guest Hub')}</span>
        </header>
        {user && <TopBar hid={hid} />}
        <main id="admin-main" className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
      <Sheet open={drawer} onClose={() => setDrawer(false)} title={tr('Navigation')} size="sm" hideHeader>
        <Sidebar hid={hid} />
      </Sheet>
    </div>
  );
}

/** Language switch (English ⇄ العربية); remounts the admin in the chosen direction. */
export function LanguageSwitch({ compact }: { compact?: boolean }) {
  const lang = useAdminLang();
  const next = lang === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      onClick={() => void setAdminLang(next).catch(() => undefined) /* stays in the current language if the dictionary cannot load */}
      lang={next}
      aria-label={next === 'ar' ? 'التبديل إلى العربية' : 'Switch to English'} // i18n-exempt: named in the target language
      className={cx('inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100', compact && 'px-2')}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      {next === 'ar' ? 'العربية' : 'English' /* i18n-exempt */}
    </button>
  );
}

/** New requests waiting for this user's departments (polled; opens the queue). */
function RequestBell({ hid }: { hid: string }) {
  const q = useQuery({
    queryKey: ['bell', hid],
    queryFn: () => api<{ requests: { id: string; reference: string; title_en: string; title_ar: string; room: string | null; created_at: string }[]; open_counts: Record<string, number> }>(`/admin/hotels/${hid}/requests?status=NEW&limit=5`),
    refetchInterval: 30_000,
  });
  const [open, setOpen] = useState(false);
  const n = q.data?.open_counts.NEW ?? 0;
  const navigate = useNavigate();
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);
  return (
    <div className="relative">
      <IconButton label={n ? tr('{0} new requests', { 0: n }) : tr('No new requests')} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {n > 0 && <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[0.65rem] font-bold text-white">{n > 99 ? '99+' : n}</span>}
      </IconButton>
      {open && (
        <>
          <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
            <p className="border-b border-black/[0.06] px-4 py-3 text-sm font-semibold">{n ? tr('{0} new requests', { 0: n }) : tr('No new requests')}</p>
            <ul className="max-h-80 overflow-auto">
              {(q.data?.requests ?? []).map((r) => (
                <li key={r.id} role="none">
                  <button role="menuitem" type="button" className="block w-full px-4 py-2.5 text-start text-sm hover:bg-zinc-50" onClick={() => { setOpen(false); navigate(`/admin/h/${hid}/requests?open=${r.id}`); }}>
                    <span className="block font-medium">{pickLang(r, 'title') || r.reference}</span>
                    <span className="block text-xs text-zinc-500">{r.reference}{r.room ? ` · ${tr('Room')} ${r.room}` : ''} · {fmtDate(r.created_at, { timeStyle: 'short' })}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" role="menuitem" className="w-full border-t border-black/[0.06] px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50" onClick={() => { setOpen(false); navigate(`/admin/h/${hid}/requests`); }}>
              {tr('Open the request queue')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TopBar({ hid }: { hid?: string }) {
  const me = useMe();
  const user = me.data?.user;
  if (!user) return null;
  return (
    <div className="sticky top-14 z-30 flex h-14 items-center gap-1.5 border-b border-black/[0.07] bg-white/90 px-4 backdrop-blur sm:px-6 lg:top-0 lg:px-10">
      <span className="me-auto hidden truncate rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 sm:inline">{L(ROLE_LABELS[user.role])}</span>
      <span className="me-auto sm:hidden" />
      {hid && roleCan(user.role, 'requests') && <RequestBell hid={hid} />}
      <LanguageSwitch />
      {hid && roleCan(user.role, 'hotel') && <PublishControls hid={hid} />}
    </div>
  );
}

function Sidebar({ hid }: { hid?: string }) {
  const me = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = me.data?.user;
  const hotels = me.data?.hotels ?? [];
  const hotel = hotels.find((h) => h.id === hid);
  const [pw, setPw] = useState(false);
  if (!user) return null;

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.clear();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-black/[0.06] px-4 py-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />{tr('Hotel')}</p>
        {hotels.length > 1 || user.global ? (
          <Select
            aria-label={tr('Switch hotel')}
            value={hid ?? ''}
            onChange={(e) => {
              if (e.target.value === '__all') navigate('/admin/hotels');
              else if (e.target.value) navigate(`/admin/h/${e.target.value}/dashboard`);
            }}
            className="h-10 rounded-lg text-sm"
          >
            {!hid && <option value="">{tr('Select a hotel…')}</option>}
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {pickLang(h, 'name')}
              </option>
            ))}
            {user.global && <option value="__all">{tr('All hotels (portfolio)…')}</option>}
          </Select>
        ) : (
          <p className="font-semibold">{pickLang(hotel, 'name')}</p>
        )}
        {hotel && (
          <a href={`/h/${hotel.slug}${hotel.is_published ? '' : '?preview=1'}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />{tr('Open guest site')}{' '}{hotel.is_published ? '' : '(unpublished)'}
          </a>
        )}
      </div>
      <nav aria-label={tr('Admin')} className="flex-1 space-y-5 px-3 py-4">
        {hid &&
          GROUPS.map((g) => {
            const items = g.items.filter((i) => roleCan(user.role, i.module));
            if (!items.length) return null;
            return (
              <div key={g.label}>
                <p className="px-2 pb-1.5 text-[0.7rem] font-semibold tracking-wider text-zinc-400 uppercase">{tr(g.label)}</p>
                <ul className="space-y-0.5">
                  {items.map((i) => (
                    <li key={i.to}>
                      <NavLink
                        to={`/admin/h/${hid}/${i.to}`}
                        className={({ isActive }) =>
                          cx('flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition', isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')
                        }
                      >
                        <i.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {tr(i.label)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        {user.global && roleCan(user.role, 'commercial') && (
          <div>
            <p className="px-2 pb-1.5 text-[0.7rem] font-semibold tracking-wider text-zinc-400 uppercase">{tr('Platform finance')}</p>
            <ul className="space-y-0.5">
              {PLATFORM_ITEMS.map((i) => (
                <li key={i.to}>
                  <NavLink
                    to={`/admin/platform/${i.to}`}
                    className={({ isActive }) => cx('flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition', isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')}
                  >
                    <i.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {tr(i.label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
        {user.global && roleCan(user.role, 'hotel') && (
          <NavLink to="/admin/hotels" className={({ isActive }) => cx('flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium', isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100')}>
            <Building2 className="h-4 w-4" aria-hidden="true" />{tr('Hotel portfolio')}</NavLink>
        )}
      </nav>
      <div className="border-t border-black/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">{user.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{L(ROLE_LABELS[user.role])}</p>
          </div>
          <IconButton label={tr('Sign out')} onClick={logout} size="sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
        <button type="button" onClick={() => setPw(true)} className="mt-1 inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />{tr('Change password')}</button>
      </div>
      <PasswordSheet open={pw} onClose={() => setPw(false)} />
    </div>
  );
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fb = useFeedback();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api('/auth/password', { method: 'POST', body: { current, next } }),
    onSuccess: () => {
      fb.success(tr('Password changed. Other devices were signed out.'));
      setCurrent('');
      setNext('');
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      if (!(e instanceof ApiError) || !Object.keys(e.fields).length) fb.error(errorMessage(e));
    },
  });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={tr('Change password')}
      description={tr('At least 10 characters with letters and numbers.')}
      size="sm"
      footer={
        <div className="flex justify-end">
          <Button loading={m.isPending} onClick={() => m.mutate()}>{tr('Update password')}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label={tr('Current password')} htmlFor="pw-current" error={errors.current}>
          <TextInput id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label={tr('New password')} htmlFor="pw-next" error={errors.next}>
          <TextInput id="pw-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-2xl border border-black/[0.07] bg-white', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div>
            {title && <h2 className="font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
