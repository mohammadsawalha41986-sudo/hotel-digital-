import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, BedDouble, Building2, ClipboardList, ConciergeBell, ExternalLink, FileSpreadsheet, Flower2, Image, Info, KeyRound, LayoutTemplate,
  LogOut, Menu, MessageSquareQuote, Palette, PhoneForwarded, QrCode, ScrollText, Settings2, Shirt, Tag, Users as UsersIcon, Utensils, Zap, type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABELS, roleCan, type Module } from '@shared/domain';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Button, Field, IconButton, Select, Sheet, TextInput, cx } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  module: Module;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { to: 'dashboard', label: 'Dashboard', icon: BarChart3, module: 'dashboard' },
      { to: 'requests', label: 'Requests', icon: ClipboardList, module: 'requests' },
      { to: 'reviews', label: 'Guest reviews', icon: MessageSquareQuote, module: 'reviews' },
    ],
  },
  {
    label: 'Guest website',
    items: [
      { to: 'website', label: 'Website manager', icon: LayoutTemplate, module: 'hotel' },
      { to: 'offers', label: 'Offers', icon: Tag, module: 'offers' },
      { to: 'quick-actions', label: 'Quick actions', icon: Zap, module: 'hotel' },
      { to: 'dining', label: 'Dining & menus', icon: Utensils, module: 'dining' },
      { to: 'room-services', label: 'Room services', icon: BedDouble, module: 'room_services' },
      { to: 'hotel-services', label: 'Hotel services', icon: ConciergeBell, module: 'hotel_services' },
      { to: 'spa', label: 'Wellness & spa', icon: Flower2, module: 'spa' },
      { to: 'laundry', label: 'Laundry', icon: Shirt, module: 'laundry' },
      { to: 'info', label: 'Guest information', icon: Info, module: 'hotel' },
    ],
  },
  {
    label: 'Property',
    items: [
      { to: 'profile', label: 'Hotel profile', icon: Settings2, module: 'hotel' },
      { to: 'branding', label: 'Branding', icon: Palette, module: 'hotel' },
      { to: 'departments', label: 'Departments & WhatsApp', icon: PhoneForwarded, module: 'hotel' },
      { to: 'media', label: 'Media library', icon: Image, module: 'hotel' },
      { to: 'qr', label: 'QR codes', icon: QrCode, module: 'hotel' },
      { to: 'import', label: 'Import / export', icon: FileSpreadsheet, module: 'import' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: 'users', label: 'Users & roles', icon: UsersIcon, module: 'users' },
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

  return (
    <div className="min-h-dvh bg-canvas font-sans text-fg lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-e border-black/[0.07] bg-white lg:block">
        <Sidebar hid={hid} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-black/[0.07] bg-white/90 px-3 backdrop-blur lg:hidden">
          <IconButton label="Open navigation" onClick={() => setDrawer(true)}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </IconButton>
          <span className="truncate font-semibold">{hotel?.name_en ?? 'Guest Hub'}</span>
        </header>
        <main id="admin-main" className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
      <Sheet open={drawer} onClose={() => setDrawer(false)} title="Navigation" size="sm" hideHeader>
        <Sidebar hid={hid} />
      </Sheet>
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
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          Hotel
        </p>
        {hotels.length > 1 || user.global ? (
          <Select
            aria-label="Switch hotel"
            value={hid ?? ''}
            onChange={(e) => {
              if (e.target.value === '__all') navigate('/admin/hotels');
              else if (e.target.value) navigate(`/admin/h/${e.target.value}/dashboard`);
            }}
            className="h-10 rounded-lg text-sm"
          >
            {!hid && <option value="">Select a hotel…</option>}
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name_en}
              </option>
            ))}
            {user.global && <option value="__all">All hotels (portfolio)…</option>}
          </Select>
        ) : (
          <p className="font-semibold">{hotel?.name_en}</p>
        )}
        {hotel && (
          <a href={`/h/${hotel.slug}${hotel.is_published ? '' : '?preview=1'}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open guest site {hotel.is_published ? '' : '(unpublished)'}
          </a>
        )}
      </div>
      <nav aria-label="Admin" className="flex-1 space-y-5 px-3 py-4">
        {hid &&
          GROUPS.map((g) => {
            const items = g.items.filter((i) => roleCan(user.role, i.module));
            if (!items.length) return null;
            return (
              <div key={g.label}>
                <p className="px-2 pb-1.5 text-[0.7rem] font-semibold tracking-wider text-zinc-400 uppercase">{g.label}</p>
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
                        {i.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        {user.global && (
          <NavLink to="/admin/hotels" className={({ isActive }) => cx('flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium', isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100')}>
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Hotel portfolio
          </NavLink>
        )}
      </nav>
      <div className="border-t border-black/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">{user.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <IconButton label="Sign out" onClick={logout} size="sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
        <button type="button" onClick={() => setPw(true)} className="mt-1 inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          Change password
        </button>
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
      fb.success('Password changed. Other devices were signed out.');
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
      title="Change password"
      description="At least 10 characters with letters and numbers."
      size="sm"
      footer={
        <div className="flex justify-end">
          <Button loading={m.isPending} onClick={() => m.mutate()}>
            Update password
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Current password" htmlFor="pw-current" error={errors.current}>
          <TextInput id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="pw-next" error={errors.next}>
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
