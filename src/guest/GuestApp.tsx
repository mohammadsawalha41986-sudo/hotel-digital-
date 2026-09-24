import { useQuery } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import type { Lang } from '@shared/domain';
import { ApiError, api } from '../lib/api';
import { I18nProvider, useI18n } from '../lib/i18n';
import { themeVars } from '../lib/theme';
import { ErrorBoundary, FullPageMessage } from '../components/ErrorBoundary';
import { ErrorState, Skeleton } from '../components/ui';
import { BasketProvider } from './basket';
import { FlowProvider } from './flow';
import { HotelContext, PAGE_SEGMENT, useHotel, type HotelCtx } from './hotel';
import { GuestSessionProvider, useGuestSession } from './session';
import { initTracking } from './track';
import type { PublicBundle } from './types';
import { GuestLayout } from './layout/GuestLayout';
import { Welcome } from './pages/Welcome';
import { Home } from './pages/Home';
import { Dining, OutletPage } from './pages/Dining';
import { RoomServices } from './pages/RoomServices';
import { Spa } from './pages/Spa';
import { Laundry } from './pages/Laundry';
import { HotelServices } from './pages/HotelServices';
import { Info } from './pages/Info';
import { Feedback } from './pages/Feedback';
import { MyRequests, RequestDetail } from './pages/MyRequests';
import { Offers } from './pages/Offers';
import { GuestNotFound } from './pages/GuestNotFound';

export default function GuestApp() {
  const { slug = '' } = useParams();
  const preview = new URLSearchParams(window.location.search).get('preview') === '1';
  const q = useQuery({
    queryKey: ['bundle', slug, preview],
    queryFn: () => api<PublicBundle>(`/public/hotels/${slug}${preview ? '?preview=1' : ''}`),
    staleTime: preview ? 0 : 60_000,
  });

  if (q.isLoading) return <BootSkeleton />;
  if (q.error) {
    if (q.error instanceof ApiError && q.error.status === 404) {
      return <FullPageMessage code="404" title="This hotel is not available · هذا الفندق غير متاح" description="Please scan the QR code again or ask reception for help. · يرجى مسح رمز QR مرة أخرى أو التواصل مع الاستقبال." />;
    }
    return (
      <div className="min-h-dvh bg-[#f7f4ee]">
        <ErrorState title="We could not load the hotel · تعذر تحميل بيانات الفندق" description={q.error.message} onRetry={() => q.refetch()} />
      </div>
    );
  }
  return <GuestRoot bundle={q.data!} slug={slug} preview={preview} />;
}

function GuestRoot({ bundle, slug, preview }: { bundle: PublicBundle; slug: string; preview: boolean }) {
  const p = bundle.hotel.profile;
  const allowed: Lang[] = p.language_mode === 'both' ? ['ar', 'en'] : [p.language_mode];
  const ctx = useMemo<HotelCtx>(() => {
    const base = `/h/${slug}`;
    return {
      bundle,
      slug,
      base,
      path: (page) => {
        const seg = page in PAGE_SEGMENT ? PAGE_SEGMENT[page as keyof typeof PAGE_SEGMENT] : page;
        return `${base}${seg ? `/${seg}` : ''}${preview ? '?preview=1' : ''}`;
      },
    };
  }, [bundle, slug, preview]);

  useEffect(() => initTracking(slug, bundle.preview), [slug, bundle.preview]);

  return (
    <HotelContext.Provider value={ctx}>
      {/* Motion collapses to instant changes for guests who prefer reduced motion. */}
      <MotionConfig reducedMotion="user">
        <GuestSessionProvider slug={slug} defaultLang={p.default_language} allowed={allowed} preview={bundle.preview}>
          <Localized bundle={bundle} slug={slug} />
        </GuestSessionProvider>
      </MotionConfig>
    </HotelContext.Provider>
  );
}

function Localized({ bundle, slug }: { bundle: PublicBundle; slug: string }) {
  const { lang } = useGuestSession();
  const vat = useMemo(() => ({ vat_rate: bundle.hotel.profile.vat_rate, prices_include_vat: bundle.hotel.profile.prices_include_vat }), [bundle]);
  const vars = useMemo(() => themeVars(bundle.hotel.branding), [bundle.hotel.branding]);

  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bundle.hotel.branding.colors.secondary);
    const fav = bundle.hotel.branding.favicon || bundle.hotel.branding.mark || bundle.hotel.branding.logo;
    if (fav) document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', fav);
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k);
    };
  }, [vars, bundle.hotel.branding]);

  return (
    <I18nProvider lang={lang} currency={bundle.hotel.profile.currency}>
      <TitleSync />
      <BasketProvider slug={slug} vat={vat}>
        <FlowProvider>
          <Gate />
        </FlowProvider>
      </BasketProvider>
    </I18nProvider>
  );
}

/** Browser tab title follows the hotel name in the active language. */
function TitleSync() {
  const { lang } = useI18n();
  const { bundle } = useHotel();
  useEffect(() => {
    document.title = lang === 'ar' ? bundle.hotel.profile.name_ar : bundle.hotel.profile.name_en;
  }, [lang, bundle]);
  return null;
}

/** Welcome + identification happen once per device and stay editable later. */
function Gate() {
  const { identity, langChosen } = useGuestSession();
  const { bundle } = useHotel();
  // Staff previews skip identification; submissions are blocked in preview (see flow.tsx).
  if (!bundle.preview && (!identity || !langChosen)) return <Welcome />;
  return (
    <ErrorBoundary fallback={(reset) => <GuestCrash onReset={reset} />}>
      <GuestLayout>
        <Routes>
          <Route index element={<Home />} />
          <Route path="dining" element={<Dining />} />
          <Route path="dining/:outletId" element={<OutletPage />} />
          <Route path="room-services" element={<RoomServices />} />
          <Route path="spa" element={<Spa />} />
          <Route path="laundry" element={<Laundry />} />
          <Route path="services" element={<HotelServices />} />
          <Route path="info" element={<Info />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="offers" element={<Offers />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="requests/:reference" element={<RequestDetail />} />
          <Route path="*" element={<GuestNotFound />} />
        </Routes>
      </GuestLayout>
    </ErrorBoundary>
  );
}

function GuestCrash({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  return <ErrorState title={t('errorTitle')} description={t('errorLead')} onRetry={onReset} retryLabel={t('retry')} />;
}

function BootSkeleton() {
  return (
    <div className="min-h-dvh bg-[#f7f4ee]" role="status" aria-label="Loading">
      <Skeleton className="h-[68vh] rounded-none" />
      <div className="mx-auto max-w-5xl space-y-4 p-5">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    </div>
  );
}
