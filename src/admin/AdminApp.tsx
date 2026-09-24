import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { roleCan, type Module } from '@shared/domain';
import { FullPageMessage } from '../components/ErrorBoundary';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ErrorState, Spinner } from '../components/ui';
import { errorMessage } from '../lib/api';
import { useMe } from './data';
import { FeedbackProvider } from './feedback';
import { AdminI18n } from './i18n';
import { AdminLayout } from './layout/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Requests } from './pages/Requests';
import { Reviews } from './pages/Reviews';
import { Website } from './pages/Website';
import { EntityPage } from './pages/EntityPage';
import { Dining, OutletDetail } from './pages/Dining';
import { LaundryAdmin } from './pages/LaundryAdmin';
import { SpaAdmin } from './pages/SpaAdmin';
import { HotelProfilePage } from './pages/HotelProfile';
import { BrandingPage } from './pages/Branding';
import { Departments } from './pages/Departments';
import { MediaLibrary } from './pages/MediaLibrary';
import { QrCodes } from './pages/QrCodes';
import { ImportCenter } from './pages/ImportCenter';
import { Users } from './pages/Users';
import { AuditLog } from './pages/AuditLog';
import { Hotels } from './pages/Hotels';
import { Guests } from './pages/Guests';
import { PublishingHistory } from './pages/Publishing';
import { GuestProfilePage } from './pages/GuestProfile';
import { Orders } from './pages/Orders';
import { HotelFinance } from './pages/HotelFinance';
import { Reports } from './pages/Reports';
import { PlatformDashboard } from './pages/platform/PlatformDashboard';
import { Agreements } from './pages/platform/Agreements';
import { PlatformSettlements } from './pages/platform/Settlements';
import { PlatformLedger } from './pages/platform/Ledger';
import { tr } from './i18n';

const ADMIN_VARS: Record<string, string> = {
  '--c-primary': '#1f2a24',
  '--c-primary-ink': '#ffffff',
  '--c-secondary': '#111714',
  '--c-accent': '#a68633',
  '--c-bg': '#f5f5f3',
  '--c-surface': '#ffffff',
  '--c-text': '#18181b',
  '--c-muted': '#6b6b73',
  '--c-cta': '#1f2a24',
  '--c-cta-hover': '#111714',
  '--c-cta-ink': '#ffffff',
  '--font-body': "'Inter', system-ui, sans-serif",
};

export default function AdminApp() {
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(ADMIN_VARS)) root.style.setProperty(k, v);
    document.title = 'Guest Hub Admin';
  }, []);

  return (
    <AdminI18n>
      <FeedbackProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="*" element={<Authed />} />
        </Routes>
      </FeedbackProvider>
    </AdminI18n>
  );
}

function Authed() {
  const me = useMe();
  if (me.isLoading)
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label={tr('Loading')}>
        <Spinner className="h-7 w-7 text-zinc-400" />
      </div>
    );
  if (me.error) return <ErrorState title={tr('Could not reach the server')} description={errorMessage(me.error)} onRetry={() => me.refetch()} />;
  if (!me.data?.user) return <Navigate to={`/admin/login?next=${encodeURIComponent(window.location.pathname)}`} replace />;
  const hotels = me.data.hotels ?? [];
  return (
    <Routes>
      <Route
        index
        element={
          me.data.user.role === 'PLATFORM_FINANCE' ? (
            <Navigate to="/admin/platform/dashboard" replace />
          ) : hotels.length ? (
            <Navigate to={`/admin/h/${hotels[0].id}/dashboard`} replace />
          ) : me.data.user.global ? (
            <Navigate to="/admin/hotels" replace />
          ) : (
            <NoHotel />
          )
        }
      />
      <Route path="hotels" element={<AdminLayout><Hotels /></AdminLayout>} />
      <Route path="platform/*" element={<PlatformScope />} />
      <Route path="h/:hid/*" element={<HotelScope />} />
      <Route path="*" element={<FullPageMessage code="404" title={tr('Page not found')} action={{ href: '/admin', label: tr('Back to dashboard') }} />} />
    </Routes>
  );
}

function NoHotel() {
  return <FullPageMessage code="403" title={tr('No hotel assigned')} description={tr('Your account is not assigned to any hotel yet. Ask your administrator for access.')} />;
}

function Guard({ module, children }: { module: Module; children: ReactNode }) {
  const me = useMe();
  if (!me.data?.user || !roleCan(me.data.user.role, module)) {
    return <FullPageMessage code="403" title={tr('Access restricted')} description={tr('Your role does not include this section.')} action={{ href: '/admin', label: tr('Back to dashboard') }} />;
  }
  return <>{children}</>;
}

/** Platform finance area (global roles with the commercial module). */
function PlatformScope() {
  const g = (el: ReactNode) => <Guard module="commercial">{el}</Guard>;
  return (
    <AdminLayout>
      <ErrorBoundary fallback={(reset) => <ErrorState title={tr('This screen failed to load')} description={tr('The error was logged in the browser console.')} onRetry={reset} />}>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={g(<PlatformDashboard />)} />
          <Route path="agreements" element={g(<Agreements />)} />
          <Route path="orders" element={g(<Orders platform />)} />
          <Route path="settlements" element={g(<PlatformSettlements />)} />
          <Route path="ledger" element={g(<PlatformLedger />)} />
          <Route path="reports" element={g(<Reports platform />)} />
          <Route path="*" element={<FullPageMessage code="404" title={tr('Page not found')} action={{ href: '/admin/platform/dashboard', label: tr('Back') }} />} />
        </Routes>
      </ErrorBoundary>
    </AdminLayout>
  );
}

function HotelScope() {
  const { hid = '' } = useParams();
  const me = useMe();
  const allowed = me.data?.user?.global || me.data?.hotels?.some((h) => h.id === hid);
  if (!allowed) return <FullPageMessage code="404" title={tr('Hotel not found')} description={tr('This hotel does not exist or you do not have access to it.')} action={{ href: '/admin', label: tr('Back') }} />;
  const g = (module: Module, el: ReactNode) => <Guard module={module}>{el}</Guard>;
  return (
    <AdminLayout hid={hid}>
      <ErrorBoundary fallback={(reset) => <ErrorState title={tr('This screen failed to load')} description={tr('The error was logged in the browser console.')} onRetry={reset} />}>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={g('dashboard', <Dashboard hid={hid} />)} />
          <Route path="requests" element={g('requests', <Requests hid={hid} />)} />
          <Route path="reviews" element={g('reviews', <Reviews hid={hid} />)} />
          <Route path="website" element={g('hotel', <Website hid={hid} />)} />
          <Route path="offers" element={g('offers', <EntityPage hid={hid} entity="offers" description={tr('Promotions shown on the homepage, dining and spa pages. Scheduled offers appear and disappear automatically.')} />)} />
 <Route path="experiences" element={g('hotel', <EntityPage hid={hid} entity="experiences" description={tr('Discovery tiles on the guest homepage — Dining, Spa, Pool, Concierge… Each opens a page, outlet, service or offer. Without any, the homepage builds tiles from your services automatically.')} />)} />
          <Route path="quick-actions" element={g('hotel', <EntityPage hid={hid} entity="quick_actions" description={tr('One-tap shortcuts on the guest homepage. Order sets their position.')} />)} />
          <Route path="dining" element={g('dining', <Dining hid={hid} />)} />
          <Route path="dining/:outletId" element={g('dining', <OutletDetail hid={hid} />)} />
          <Route path="room-services" element={g('room_services', <EntityPage hid={hid} entity="room_services" description={tr('Services for the guest\'s existing room. Requests are routed to the selected department.')} />)} />
          <Route path="hotel-services" element={g('hotel_services', <EntityPage hid={hid} entity="hotel_services" description={tr('Transport, concierge and other services. Turn off “Guests can request it” for information-only entries.')} />)} />
          <Route path="spa" element={g('spa', <SpaAdmin hid={hid} />)} />
          <Route path="laundry" element={g('laundry', <LaundryAdmin hid={hid} />)} />
          <Route path="info" element={g('hotel', <EntityPage hid={hid} entity="info_items" description={tr('Check-in/out, Wi-Fi, policies, prayer, emergency and nearby information.')} />)} />
          <Route path="profile" element={g('hotel', <HotelProfilePage hid={hid} />)} />
          <Route path="branding" element={g('hotel', <BrandingPage hid={hid} />)} />
          <Route path="departments" element={g('hotel', <Departments hid={hid} />)} />
          <Route path="media" element={g('hotel', <MediaLibrary hid={hid} />)} />
          <Route path="qr" element={g('hotel', <QrCodes hid={hid} />)} />
          <Route path="import" element={g('import', <ImportCenter hid={hid} />)} />
          <Route path="users" element={g('users', <Users hid={hid} />)} />
          <Route path="audit" element={g('audit', <AuditLog hid={hid} />)} />
          <Route path="publishing" element={g('hotel', <PublishingHistory hid={hid} />)} />
          <Route path="guests" element={g('guests', <Guests hid={hid} />)} />
          <Route path="guests/:gid" element={g('guests', <GuestProfilePage hid={hid} />)} />
          <Route path="orders" element={g('orders', <Orders hid={hid} />)} />
          <Route path="finance" element={g('finance', <HotelFinance hid={hid} />)} />
          <Route path="reports" element={g('orders', <Reports hid={hid} />)} />
          <Route path="*" element={<FullPageMessage code="404" title={tr('Page not found')} action={{ href: `/admin/h/${hid}/dashboard`, label: tr('Back to dashboard') }} />} />
        </Routes>
      </ErrorBoundary>
    </AdminLayout>
  );
}
