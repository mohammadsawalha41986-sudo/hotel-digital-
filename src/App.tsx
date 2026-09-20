import { useState, useMemo, useEffect, useCallback } from 'react';
import { RouteDefinition, ROUTE_REGISTRY } from './routes/routeRegistry';
import { Header } from './components/Header';
import { ParamSimulator } from './components/ParamSimulator';
import { DepartmentTabs } from './components/DepartmentTabs';
import { RouteCard } from './components/RouteCard';
import { HierarchyTreeView } from './components/HierarchyTreeView';
import { WhatsAppRoutingMatrix } from './components/WhatsAppRoutingMatrix';
import { LegacyMigrationView } from './components/LegacyMigrationView';
import { Search, Filter, Sparkles, Check, Home, Shield, QrCode, Building2, EyeOff, Loader2 } from 'lucide-react';
import { MOCK_HOTELS } from './data/mockHotels';
import { Hotel, Language } from './types/hotel';
import { TopLevelDepartment } from './types/department';
import { applyHotelTheme } from './utils/theme';
import { GuestPortalPage } from './pages/GuestPortalPage';
import { AdminControlCenterPage } from './pages/AdminControlCenterPage';
import { AdminLoginPage } from './components/admin/AdminLoginPage';
import { parseCurrentRoute, pushAppRoute, buildGuestUrl, buildAdminUrl, findHotelBySlug } from './utils/urlRouter';
import { RouteQRCodeModal } from './components/RouteQRCodeModal';
import { AdminUser, canAccessHotel } from './types/auth';
import { getCurrentAdminUser, onAuthStateChangedListener, signOutAdminUser } from './services/authService';
import {
  getHotelBySlug,
  subscribeToHotelsForAdmin,
  updateHotel as updateFirestoreHotel,
} from './services/hotelService';
import { isFirebaseConfigured, defaultHotelSlug } from './services/firebase';

const STORAGE_KEY_ACTIVE = 'hotel_hub_active_hotel_id_v4_swissflora';
const STORAGE_KEY_HOTELS = 'hotel_hub_hotels_list_v4';

export default function App() {
  // Dynamic Multi-Hotel State driven by Firestore (with dev fallback when unconfigured)
  const [hotelsList, setHotelsList] = useState<Hotel[]>(() => {
    if (!isFirebaseConfigured) return MOCK_HOTELS;
    return [];
  });

  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(() => {
    if (!isFirebaseConfigured) return MOCK_HOTELS[0];
    return null;
  });

  const [isHotelLoading, setIsHotelLoading] = useState<boolean>(isFirebaseConfigured);
  const [isHotelUnpublished, setIsHotelUnpublished] = useState<boolean>(false);
  const [isHotelNotFound, setIsHotelNotFound] = useState<boolean>(false);

  // Language & Direction State (Bilingual AR / EN with dynamic RTL / LTR)
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const l = params.get('lang');
      if (l === 'ar' || l === 'en') return l;
    }
    return 'en';
  });

  // Initial department state (from QR scan / deep link)
  const [initialDepartment, setInitialDepartment] = useState<TopLevelDepartment>(() => {
    const parsed = parseCurrentRoute();
    if (parsed.subDepartment) return parsed.subDepartment;
    return 'overview';
  });

  // Active in-room session context (e.g. simulated from desk QR scan or blank for external guests)
  const [roomNumber, setRoomNumber] = useState<string>(() => {
    const parsed = parseCurrentRoute();
    return parsed.roomNumber || '';
  });
  const [orderId, setOrderId] = useState<string>('ORD-8821');

  // Admin Authentication State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getCurrentAdminUser());

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setAdminUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Primary Application View: 'guest_portal' | 'admin_portal' | 'route_registry'
  const [appView, setAppView] = useState<'guest_portal' | 'admin_portal' | 'route_registry'>(() => {
    const parsed = parseCurrentRoute();
    if (parsed.type === 'admin') return 'admin_portal';
    if (parsed.type === 'dev_routes') return 'route_registry';
    return 'guest_portal';
  });

  // Route Registry Filter and View State (Preserved for Dev/Ops)
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [registrySubView, setRegistrySubView] = useState<'directory' | 'tree' | 'whatsapp' | 'migration'>('directory');
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedRouteForQR, setSelectedRouteForQR] = useState<RouteDefinition | null>(null);

  // Synchronize route and load active hotel dynamically
  const syncRouteAndHotel = useCallback(async () => {
    const parsed = parseCurrentRoute();

    if (parsed.type === 'admin') {
      setAppView('admin_portal');
      return;
    }

    if (parsed.type === 'dev_routes') {
      setAppView('route_registry');
      return;
    }

    setAppView('guest_portal');
    const targetSlug = parsed.hotelSlug || defaultHotelSlug;

    setIsHotelLoading(true);
    setIsHotelUnpublished(false);
    setIsHotelNotFound(false);

    if (!isFirebaseConfigured) {
      const localMatch = findHotelBySlug(MOCK_HOTELS, targetSlug);
      if (localMatch) {
        setCurrentHotel(localMatch);
        const hasAccess = localMatch.is_published || (adminUser && canAccessHotel(adminUser, localMatch.id));
        if (!hasAccess) {
          setIsHotelUnpublished(true);
        }
      } else {
        setIsHotelNotFound(true);
        setCurrentHotel(null);
      }
      setIsHotelLoading(false);
      return;
    }

    try {
      const hotel = await getHotelBySlug(targetSlug);

      if (!hotel) {
        setIsHotelNotFound(true);
        setCurrentHotel(null);
      } else {
        const hasAccess = hotel.is_published || (adminUser && canAccessHotel(adminUser, hotel.id));
        if (!hasAccess) {
          setIsHotelUnpublished(true);
          setCurrentHotel(hotel);
        } else {
          setCurrentHotel(hotel);
          setIsHotelUnpublished(false);
          setIsHotelNotFound(false);
        }
      }
    } catch (err) {
      console.warn('Failed to load hotel from Firestore:', err);
      setIsHotelNotFound(true);
    } finally {
      setIsHotelLoading(false);
    }
  }, [adminUser]);

  useEffect(() => {
    syncRouteAndHotel();

    const handleUrlChange = () => {
      const parsed = parseCurrentRoute();
      if (parsed.roomNumber !== undefined) {
        setRoomNumber(parsed.roomNumber);
      }
      if (parsed.subDepartment) {
        setInitialDepartment(parsed.subDepartment);
      }
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const l = params.get('lang');
        if (l === 'ar' || l === 'en') setLanguage(l);
      }
      syncRouteAndHotel();
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [syncRouteAndHotel]);

  // Subscribe to real-time hotel portfolio for authenticated admin
  useEffect(() => {
    if (!adminUser) return;
    if (!isFirebaseConfigured) {
      setHotelsList(MOCK_HOTELS);
      return;
    }

    const unsubscribe = subscribeToHotelsForAdmin(adminUser, (hotels) => {
      setHotelsList(hotels);
      setCurrentHotel((prev) => {
        if (prev && hotels.some((h) => h.id === prev.id)) {
          return hotels.find((h) => h.id === prev.id) || prev;
        }
        return hotels[0] || null;
      });
    });

    return () => unsubscribe();
  }, [adminUser]);

  // Persist hotelsList to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HOTELS, JSON.stringify(hotelsList));
    } catch (e) {
      console.warn('Failed to persist hotels list to storage', e);
    }
  }, [hotelsList]);

  // Persist active property selection to localStorage
  useEffect(() => {
    if (!currentHotel) return;
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, currentHotel.id);
    } catch (e) {
      // ignore
    }
  }, [currentHotel?.id]);

  // Apply dynamic theme branding variables, typography, and document direction
  useEffect(() => {
    if (currentHotel) {
      applyHotelTheme(currentHotel.branding, currentHotel.typography);
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [currentHotel, language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelectHotel = (hotel: Hotel) => {
    setCurrentHotel(hotel);
    showToast(`Switched active property to: ${language === 'ar' ? hotel.name_ar : hotel.name_en}`);
  };

  const handleUpdateHotel = async (updated: Hotel) => {
    setHotelsList((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    setCurrentHotel(updated);
    if (isFirebaseConfigured) {
      try {
        await updateFirestoreHotel(updated.id, updated);
      } catch (err) {
        console.warn('Failed to update hotel in Firestore:', err);
      }
    }
    showToast(`Saved configuration for: ${updated.name_en}`);
  };

  const handleHotelCreated = (newHotel: Hotel) => {
    setHotelsList((prev) => {
      const filtered = prev.filter((h) => h.id !== newHotel.id);
      return [newHotel, ...filtered];
    });
    setCurrentHotel(newHotel);
    showToast(`Successfully onboarded property: ${newHotel.name_en}`);
  };

  const handleViewLivePortal = () => {
    const targetSlug = currentHotel?.slug || currentHotel?.id || defaultHotelSlug;
    pushAppRoute(buildGuestUrl(targetSlug, roomNumber || undefined));
    setAppView('guest_portal');
  };

  const handleOpenAdmin = () => {
    if (currentHotel?.id) {
      pushAppRoute(buildAdminUrl(currentHotel.id));
    } else {
      pushAppRoute('/admin');
    }
    setAppView('admin_portal');
  };

  // Department counts for Route Registry
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: ROUTE_REGISTRY.length };
    for (const r of ROUTE_REGISTRY) {
      map[r.department] = (map[r.department] || 0) + 1;
    }
    return map;
  }, []);

  // Filtered routes for Route Registry
  const filteredRoutes = useMemo(() => {
    return ROUTE_REGISTRY.filter((route) => {
      if (selectedDept !== 'all' && route.department !== selectedDept) {
        return false;
      }
      if (methodFilter !== 'all' && route.httpMethod !== methodFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPath = route.path.toLowerCase().includes(q);
        const matchesName = route.name.toLowerCase().includes(q);
        const matchesDesc = route.description.toLowerCase().includes(q);
        const matchesTeam = route.targetTeam.toLowerCase().includes(q);
        const matchesSub = route.subCategory.toLowerCase().includes(q);
        return matchesPath || matchesName || matchesDesc || matchesTeam || matchesSub;
      }
      return true;
    });
  }, [selectedDept, methodFilter, searchQuery]);

  // Export Markdown format of all routes
  const handleCopyMarkdown = () => {
    const mdRows = ROUTE_REGISTRY.map(
      (r) =>
        `| **${r.department.toUpperCase()}** | \`${r.path}\` | **${r.name}** | ${r.httpMethod} | ${r.targetTeam} | ${r.slaTarget || 'N/A'} |`
    ).join('\n');

    const markdownDoc = `# Hotel Digital Guest Hub — Department-Based URL Map
*Generated on ${new Date().toISOString()}*

### Route Hierarchy Alignment:
- **Rooms Department**: In-room amenities, housekeeping, urgent engineering, minibar, express check-out
- **Dining Department**: In-room dining menu, kitchen tracking, tray clearance, restaurant directory, table booking, breakfast pre-order
- **Services Department**: Chief concierge, spa & wellness rituals, laundry & valet, luxury transfers, luggage bell desk
- **WhatsApp Gateway**: Contextual metadata deep-links & bi-directional webhooks
- **Staff Operations**: Department dispatch queues & Kitchen Display Systems (KDS)

---

| Department | Canonical Route Template | Route Name | Method | Assigned Team | SLA Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
${mdRows}
`;

    navigator.clipboard.writeText(markdownDoc);
    setCopiedMarkdown(true);
    showToast('Comprehensive Markdown route specification copied to clipboard!');
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  // Export JSON specification
  const handleExportJson = () => {
    const jsonBlob = new Blob([JSON.stringify(ROUTE_REGISTRY, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hotel-guest-hub-routes.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded hotel-guest-hub-routes.json');
  };

  // 1. Hotel Admin Control Center View (Dedicated for staff)
  if (appView === 'admin_portal') {
    if (!adminUser) {
      return (
        <AdminLoginPage
          onLoginSuccess={(user) => setAdminUser(user)}
          onBackToGuestPortal={handleViewLivePortal}
        />
      );
    }

    return (
      <div className="relative min-h-screen bg-stone-950">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-stone-800 flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <AdminControlCenterPage
          hotels={hotelsList}
          currentHotel={currentHotel}
          currentUser={adminUser}
          onSelectHotel={handleSelectHotel}
          onUpdateHotel={handleUpdateHotel}
          onHotelCreated={handleHotelCreated}
          onViewLivePortal={handleViewLivePortal}
          onSignOut={async () => {
            await signOutAdminUser();
            setAdminUser(null);
          }}
        />
      </div>
    );
  }

  // 2. Pure Guest Portal View (Strictly separated: No Admin, No Hotel Switcher, No Dev tools)
  if (appView === 'guest_portal') {
    if (isHotelLoading) {
      return (
        <div
          className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <Loader2 size={36} className="text-amber-400 animate-spin mb-4" />
          <p className="text-stone-400 text-sm font-medium">
            {language === 'ar' ? 'جاري تحميل بوابة النزيل...' : 'Loading Guest Portal...'}
          </p>
        </div>
      );
    }

    if (isHotelUnpublished) {
      return (
        <div
          className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 shadow-inner">
            <EyeOff size={32} />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <Shield size={13} />
            <span>{language === 'ar' ? 'مسودة غير منشورة' : 'Unpublished Staging Property'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
            {language === 'ar'
              ? currentHotel?.name_ar || 'الفندق غير منشور حالياً'
              : currentHotel?.name_en || 'Property Currently Unpublished'}
          </h1>
          <p className="text-stone-400 text-sm max-w-md mb-8 leading-relaxed">
            {language === 'ar'
              ? 'هذه المنشأة الفندقية لا تزال في مرحلة الإعداد المسبق ولم يتم نشرها للضيوف بعد. إذا كنت من موظفي الفندق أو الإدارة، يرجى تسجيل الدخول للوصول إلى لوحة التحكم والمعاينة.'
              : 'This hotel property is currently in pre-launch staging and has not been published to guests yet. If you are authorized hotel staff or an administrator, please sign in to access the control center and preview.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleOpenAdmin}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all cursor-pointer shadow-lg inline-flex items-center justify-center gap-2"
            >
              <Shield size={16} />
              <span>{language === 'ar' ? 'تسجيل دخول الموظفين / الإدارة' : 'Staff / Admin Sign In'}</span>
            </button>
            <button
              onClick={() => {
                setIsHotelUnpublished(false);
                setIsHotelNotFound(false);
                pushAppRoute(buildGuestUrl(defaultHotelSlug));
              }}
              className="px-6 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-sm transition-all cursor-pointer border border-stone-700 inline-flex items-center justify-center gap-2"
            >
              <Home size={16} />
              <span>{language === 'ar' ? 'العودة للفندق الافتراضي' : 'Return to Default Hotel'}</span>
            </button>
          </div>
        </div>
      );
    }

    if (isHotelNotFound || !currentHotel) {
      return (
        <div
          className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
            {language === 'ar' ? 'الفندق غير مسجل' : 'Hotel Not Found'}
          </h1>
          <p className="text-stone-400 text-sm max-w-md mb-8 leading-relaxed">
            {language === 'ar'
              ? 'معرّف الفندق المطلوب غير متوفر في النظام. يرجى التأكد من مسح رمز الاستجابة السريعة (QR) الصحيح أو الرجوع للفندق الافتراضي.'
              : 'The requested hotel identifier does not exist in the system. Please verify the QR link or navigate to an available property.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setIsHotelNotFound(false);
                pushAppRoute(buildGuestUrl(defaultHotelSlug));
              }}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all cursor-pointer shadow-lg"
            >
              {language === 'ar' ? 'الانتقال إلى الفندق الافتراضي' : 'Go to Default Hotel'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-stone-800 flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <GuestPortalPage
          currentHotel={currentHotel}
          language={language}
          onToggleLanguage={toggleLanguage}
          roomNumber={roomNumber}
          onSetRoomNumber={setRoomNumber}
          initialDepartment={initialDepartment}
        />
      </div>
    );
  }

  // 3. Developer & Operations Route Architecture View (Preserved completely)
  const activeHotel = currentHotel || hotelsList[0] || null;

  if (!activeHotel) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 size={36} className="text-amber-400 animate-spin mb-4" />
        <p className="text-stone-400 text-sm font-medium">Loading Route Explorer...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col text-stone-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-stone-800 flex items-center gap-2 animate-bounce">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Switch to Guest Portal & Admin Sticky Floating Bar */}
      <div className="bg-stone-900 text-white py-2 px-4 border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-amber-300 font-semibold">
              Developer & Operations Route Architecture Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-semibold shadow-xs cursor-pointer border border-stone-700"
            >
              <Shield size={13} />
              <span>Admin Control Center</span>
            </button>
            <button
              onClick={handleViewLivePortal}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Home size={13} />
              <span>Live Guest Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header for Route Explorer */}
      <Header
        onCopyAllMarkdown={handleCopyMarkdown}
        onExportJson={handleExportJson}
        copiedMarkdown={copiedMarkdown}
        onOpenQRGenerator={() => setSelectedRouteForQR(filteredRoutes[0] || ROUTE_REGISTRY[0])}
      />

      {/* Content Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Architecture Overview Banner */}
        <div
          id="architecture-banner"
          className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl p-6 sm:p-8 mb-6 shadow-md border border-stone-800"
        >
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-stone-700/60 text-amber-300 border border-stone-600 mb-3">
              <Sparkles size={13} />
              <span>Inspection & Restructuring Complete</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight text-white mb-2">
              New Department-Based URL Hierarchy
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed mb-5">
              Every route is explicitly partitioned into dedicated operational departments:
              <strong className="text-white"> Rooms</strong> (Housekeeping & Maintenance),
              <strong className="text-white"> Dining</strong> (In-Room Culinary & Venues), and
              <strong className="text-white"> Services</strong> (Concierge, Spa, Laundry & Transfers), with
              native WhatsApp deep-link handoff and internal staff dispatch queues.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-stone-800/80 px-3 py-1.5 rounded-lg border border-stone-700">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span className="font-mono text-stone-200">/hotels/:slug/rooms/*</span>
              </div>
              <div className="flex items-center gap-1.5 bg-stone-800/80 px-3 py-1.5 rounded-lg border border-stone-700">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="font-mono text-stone-200">/hotels/:slug/dining/*</span>
              </div>
              <div className="flex items-center gap-1.5 bg-stone-800/80 px-3 py-1.5 rounded-lg border border-stone-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-mono text-stone-200">/hotels/:slug/services/*</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Parameter Simulator */}
        <ParamSimulator
          hotelSlug={activeHotel.slug}
          setHotelSlug={(slug) => {
            const found = hotelsList.find((h) => h.slug === slug);
            if (found) setCurrentHotel(found);
          }}
          roomNumber={roomNumber}
          setRoomNumber={setRoomNumber}
          orderId={orderId}
          setOrderId={setOrderId}
        />

        {/* Navigation Tabs & Views */}
        <DepartmentTabs
          selectedDept={selectedDept}
          setSelectedDept={setSelectedDept}
          viewMode={registrySubView}
          setViewMode={setRegistrySubView}
          counts={counts}
        />

        {/* View Mode Switching */}
        {registrySubView === 'tree' && <HierarchyTreeView hotelSlug={activeHotel.slug} />}

        {registrySubView === 'whatsapp' && (
          <WhatsAppRoutingMatrix
            hotelSlug={activeHotel.slug}
            roomNumber={roomNumber}
            orderId={orderId}
          />
        )}

        {registrySubView === 'migration' && <LegacyMigrationView />}

        {/* Directory View (Filters + Route Cards) */}
        {registrySubView === 'directory' && (
          <div>
            {/* Search and Filters Bar */}
            <div
              id="search-filter-bar"
              className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-white p-3 rounded-xl border border-stone-200"
            >
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  id="search-route-input"
                  type="text"
                  placeholder="Filter by route path, team, keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <Filter size={14} />
                  <span>Method:</span>
                </div>
                <select
                  id="method-filter-select"
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-stone-800 font-semibold focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
                >
                  <option value="all">All Methods</option>
                  <option value="VIEW">VIEW (Guest Screens)</option>
                  <option value="GET">GET (Redirects/Data)</option>
                  <option value="POST">POST (Orders/Webhooks)</option>
                </select>

                <button
                  id="open-route-qr-modal-bar-btn"
                  onClick={() => setSelectedRouteForQR(filteredRoutes[0] || ROUTE_REGISTRY[0])}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                  title="Generate downloadable mobile deep-link QR code for routes"
                >
                  <QrCode size={14} className="text-amber-700" />
                  <span className="hidden sm:inline">Route QR Generator</span>
                  <span className="sm:hidden">QR</span>
                </button>

                <span className="text-xs text-stone-500 ml-1 font-mono">
                  {filteredRoutes.length} of {ROUTE_REGISTRY.length}
                </span>
              </div>
            </div>

            {/* Route Cards Grid */}
            {filteredRoutes.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
                <p className="text-sm font-semibold text-stone-700 mb-1">No routes matched your query</p>
                <p className="text-xs text-stone-500 mb-4">
                  Try clearing your search query or choosing another department tab.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDept('all');
                    setMethodFilter('all');
                  }}
                  className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRoutes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    hotelSlug={activeHotel.slug}
                    roomNumber={roomNumber}
                    orderId={orderId}
                    onGenerateQR={(selectedRoute) => setSelectedRouteForQR(selectedRoute)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-stone-200 bg-white py-6 text-stone-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">Hotel Digital Guest Hub</span>
            <span>•</span>
            <span>Enterprise Hospitality Route Architecture v2.4</span>
          </div>
          <div className="flex items-center gap-4 text-stone-500">
            <span>Aligned with Rooms, Dining, and Services Division Standard</span>
          </div>
        </div>
      </footer>

      {/* Route QR Code Modal */}
      {selectedRouteForQR && (
        <RouteQRCodeModal
          initialRoute={selectedRouteForQR}
          hotel={activeHotel}
          hotelsList={hotelsList}
          defaultRoomNumber={roomNumber || '402'}
          defaultOrderId={orderId}
          onClose={() => setSelectedRouteForQR(null)}
          onSelectHotel={(h) => setCurrentHotel(h)}
        />
      )}
    </div>
  );
}
