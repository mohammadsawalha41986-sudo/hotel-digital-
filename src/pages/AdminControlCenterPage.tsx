import React, { useState, useEffect } from 'react';
import { Hotel, RoomType, HotelOffer } from '../types/hotel';
import { OperationalRequest } from '../types/requests';
import { ImportTemplateType } from '../utils/excelTemplates';
import { getStoredRequests } from '../utils/requestStore';
import { AdminSidebar, AdminSectionTab } from '../components/admin/AdminSidebar';
import { AdminHeader, StaffRole } from '../components/admin/AdminHeader';
import { DashboardView } from '../components/admin/DashboardView';
import { OperationsView } from '../components/admin/OperationsView';
import { WebsiteManagerView } from '../components/admin/WebsiteManagerView';
import { RoomsManagerView } from '../components/admin/content/RoomsManagerView';
import { FnbManagerView } from '../components/admin/content/FnbManagerView';
import { WellnessManagerView } from '../components/admin/content/WellnessManagerView';
import { LaundryManagerView } from '../components/admin/content/LaundryManagerView';
import { GuestServicesManagerView } from '../components/admin/content/GuestServicesManagerView';
import { OffersManagerView } from '../components/admin/content/OffersManagerView';
import { HomepageSectionsView } from '../components/admin/cms/HomepageSectionsView';
import { NavigationMenuView } from '../components/admin/cms/NavigationMenuView';
import { CustomSectionsView } from '../components/admin/cms/CustomSectionsView';
import { WhatsAppRoutingView } from '../components/admin/WhatsAppRoutingView';
import { QRCodeStudioView } from '../components/admin/QRCodeStudioView';
import { MediaLibraryView } from '../components/admin/MediaLibraryView';
import { ImportCenterView } from '../components/admin/ImportCenterView';
import { BrandingDesignView } from '../components/admin/BrandingDesignView';
import { GovernanceView } from '../components/admin/GovernanceView';
import { LivePreviewModal } from '../components/admin/LivePreviewModal';
import { HotelCreationWizard } from '../components/admin/HotelCreationWizard';
import { AdminReviewsManager } from '../components/admin/AdminReviewsManager';
import { AdminFeedbackManager } from '../components/admin/AdminFeedbackManager';
import { HotelPortfolioView } from '../components/admin/HotelPortfolioView';
import { HotelInformationView } from '../components/admin/HotelInformationView';
import { ShieldAlert, Building2 } from 'lucide-react';
import { AdminUser, canAccessHotel } from '../types/auth';
import { subscribeToHotelRequests } from '../services/requestService';
import {
  getOutlets,
  saveDepartmentRouting,
  saveGuestService,
  saveLaundry,
  saveOffer,
  saveOutlet,
  saveRoom,
  saveRoomInventory,
  saveWellness,
} from '../services/hotelService';

interface AdminControlCenterPageProps {
  hotels: Hotel[];
  currentHotel: Hotel | null;
  currentUser?: AdminUser | null;
  onSelectHotel: (hotel: Hotel) => void;
  onUpdateHotel: (hotel: Hotel) => void;
  onHotelCreated: (hotel: Hotel) => void;
  onViewLivePortal: () => void;
  onSignOut?: () => void;
}

export const AdminControlCenterPage: React.FC<AdminControlCenterPageProps> = ({
  hotels,
  currentHotel,
  currentUser,
  onSelectHotel,
  onUpdateHotel,
  onHotelCreated,
  onViewLivePortal,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<AdminSectionTab>(
    currentUser?.role === 'SUPER_ADMIN' ? 'portfolio' : 'dashboard'
  );
  const [currentRole, setCurrentRole] = useState<StaffRole>(currentUser?.role || 'SUPER_ADMIN');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [requests, setRequests] = useState<OperationalRequest[]>([]);

  // Load operational requests for the current hotel with real-time sync
  useEffect(() => {
    if (!currentHotel?.id) return;
    const unsubscribe = subscribeToHotelRequests(currentHotel.id, (hotelRequests) => {
      setRequests(hotelRequests);
    });
    return () => unsubscribe();
  }, [currentHotel?.id]);

  const refreshRequests = () => {
    if (!currentHotel) return;
    const all = getStoredRequests();
    const hotelRequests = all.filter((r) => r.hotel_id === currentHotel.id || !r.hotel_id);
    setRequests(hotelRequests);
  };

  // Guard 1: No property selected / empty portfolio
  if (!currentHotel) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
          <Building2 size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
          Select or Onboard a Property
        </h1>
        <p className="text-stone-400 text-sm max-w-md mb-8 leading-relaxed">
          No hotel property is currently selected. Choose a property from your portfolio or onboard a new hotel tenant.
        </p>
        <div className="flex gap-3">
          {currentUser?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => setShowCreationWizard(true)}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all cursor-pointer shadow-lg"
            >
              Onboard New Property
            </button>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm transition-all cursor-pointer border border-stone-700"
            >
              Sign Out
            </button>
          )}
        </div>
        {showCreationWizard && (
          <HotelCreationWizard
            language="en"
            onClose={() => setShowCreationWizard(false)}
            onHotelCreated={(newHotel) => {
              setShowCreationWizard(false);
              onHotelCreated(newHotel);
            }}
          />
        )}
      </div>
    );
  }

  // Guard 2: Multi-Hotel Tenant Security Guard
  if (currentUser && !canAccessHotel(currentUser, currentHotel.id)) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-6">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
          Access Restricted / غير مصرح بالدخول
        </h1>
        <p className="text-stone-400 text-sm max-w-md mb-8 leading-relaxed">
          You do not have staff authorization to manage <strong>{currentHotel.name_en}</strong>. Please switch to your authorized property.
        </p>
        <button
          onClick={() => {
            const authorized = hotels.find((h) => canAccessHotel(currentUser, h.id));
            if (authorized) onSelectHotel(authorized);
            else onSignOut?.();
          }}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all cursor-pointer shadow-lg"
        >
          Return to Authorized Property
        </button>
      </div>
    );
  }

  const handlePublishChanges = () => {
    setHasUnpublishedChanges(false);
    // Content writes are immediate. Public visibility is controlled only by
    // the hotel's explicit is_published setting.
  };

  const handleImportCompleted = async (templateKey: ImportTemplateType, importedRows: Record<string, any>[]) => {
    if (!importedRows || importedRows.length === 0) return;

    const asBoolean = (value: unknown) =>
      value === true || String(value).trim().toUpperCase() === 'TRUE';
    const makeId = (value: unknown, prefix: string, index: number) =>
      String(value || `${prefix}-${Date.now()}-${index}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-');

    if (templateKey === 'rooms-template.xlsx') {
      const newRooms: RoomType[] = importedRows.map((r, idx) => ({
        id: r.slug ? String(r.slug) : `room-${Date.now()}-${idx}`,
        hotel_id: currentHotel.id,
        slug: r.slug ? String(r.slug) : `room-type-${idx + 1}`,
        name_en: r.name_en || 'Luxury Suite',
        name_ar: r.name_ar || 'جناح فاخر',
        category_en: r.category_en || 'Suite',
        category_ar: r.category_ar || 'جناح',
        description_en: r.description_en || `${r.name_en || 'Room'} with comprehensive amenities.`,
        description_ar: r.description_ar || `${r.name_ar || 'غرفة'} مع مرافق فندقية متكاملة.`,
        size_sqm: Number(r.size_sqm) || 50,
        bed_type_en: r.bed_type_en || '1 King Bed',
        bed_type_ar: r.bed_type_ar || 'سرير كينغ',
        occupancy: {
          adults: Number(r.max_adults) || 2,
          children: 1,
          max_guests: Number(r.max_adults) ? Number(r.max_adults) + 1 : 3,
        },
        view_en: 'Panoramic View',
        view_ar: 'إطلالة بانورامية',
        smoking_policy_en: 'Non-Smoking',
        smoking_policy_ar: 'غير مسموح بالتدخين',
        breakfast_included: true,
        breakfast_info_en: 'Complimentary Artisanal Breakfast',
        breakfast_info_ar: 'إفطار حرفي مشمول',
        base_price: Number(r.base_price) || 600,
        currency: 'SAR',
        images: r.image_url ? [String(r.image_url)] : [],
        amenities: [],
        features_en: ['High-speed WiFi', 'Smart TV', 'Espresso Machine'],
        features_ar: ['واي فاي فائق السرعة', 'شاشة ذكية', 'ماكينة إسبريسو'],
        available_count: Number(r.available_count) || 5,
      }));

      await Promise.all(newRooms.map((room) => saveRoom(currentHotel.id, room)));
    } else if (templateKey === 'offers-template.xlsx') {
      const newOffers: HotelOffer[] = importedRows.map((r, idx) => ({
        id: `offer-${Date.now()}-${idx}`,
        hotel_id: currentHotel.id,
        title_en: r.title_en || 'Exclusive Privilege',
        title_ar: r.title_ar || 'عرض حصري',
        description_en: r.description_en || 'Special seasonal stay and dining offer.',
        description_ar: r.description_ar || 'عرض إقامة وتذوق موسمي خاص.',
        department: (r.department || 'rooms') as any,
        badge_en: r.badge_en || 'SPECIAL',
        badge_ar: r.badge_ar || 'خاص',
        original_price: Number(r.original_price) || 800,
        offer_price: Number(r.offer_price) || 650,
        currency: 'SAR',
        valid_until: r.valid_until || '2026-12-31',
        image_url: r.image_url ? String(r.image_url) : '',
        terms_en: 'Subject to availability. Terms and conditions apply.',
        terms_ar: 'يخضع للتوفر. تطبق الشروط والأحكام.',
        is_active: true,
      }));

      await Promise.all(newOffers.map((offer) => saveOffer(currentHotel.id, offer)));
    } else if (templateKey === 'health-club-template.xlsx') {
      await Promise.all(importedRows.map((row, index) => saveWellness(currentHotel.id, {
        id: makeId(row.code, 'wellness', index),
        hotel_id: currentHotel.id,
        service_code: String(row.code || ''),
        slug: makeId(row.code, 'wellness', index),
        service_type: 'spa',
        name_en: String(row.name_en || ''),
        name_ar: String(row.name_ar || ''),
        short_description_en: '', short_description_ar: '', full_description_en: '', full_description_ar: '',
        hero_image: row.image_url ? String(row.image_url) : '', gallery: [],
        location: { building_en: '', building_ar: '', floor_en: '', floor_ar: '', internal_text_en: '', internal_text_ar: '' },
        operating_info: { opening_hours_en: '', opening_hours_ar: '', periods: [] },
        contact: { phone: '', extension: '', whatsapp_number: '', whatsapp_enabled: false, default_message_en: '', default_message_ar: '' },
        price: Number(row.price || 0), currency: currentHotel.currency || 'SAR',
        duration_minutes: Number(row.duration_minutes || 0),
        availability_en: String(row.gender_policy || ''), availability_ar: String(row.gender_policy || ''),
        booking_enabled: true, audience: 'BOTH', is_active: true, sort_order: index,
      })));
    } else if (templateKey === 'laundry-template.xlsx') {
      await Promise.all(importedRows.map((row, index) => saveLaundry(currentHotel.id, {
        id: makeId(row.item_code, 'laundry', index), item_code: String(row.item_code || ''),
        category_en: String(row.category || ''), category_ar: String(row.category || ''),
        name_en: String(row.name_en || ''), name_ar: String(row.name_ar || ''), icon: 'shirt',
        prices: {
          wash: Number(row.wash_press_price || 0), dry_clean: Number(row.dry_clean_price || 0),
          press: Number(row.press_only_price || 0), wash_press: Number(row.wash_press_price || 0), express_surcharge: 0,
        },
        is_active: true, sort_order: index,
      })));
    } else if (templateKey === 'guest-services-template.xlsx') {
      await Promise.all(importedRows.map((row, index) => saveGuestService(currentHotel.id, {
        id: makeId(row.service_code, 'service', index), service_code: String(row.service_code || ''),
        department: String(row.department || 'front_office'), category_en: String(row.department || ''), category_ar: String(row.department || ''),
        title_en: String(row.title_en || ''), title_ar: String(row.title_ar || ''), description_en: '', description_ar: '', icon: 'sparkles',
        responsible_department_en: String(row.department || ''), responsible_department_ar: String(row.department || ''),
        sla_target_en: String(row.sla_target || ''), sla_target_ar: String(row.sla_target || ''), phone: '', extension: '', whatsapp_number: '',
        requires_quantity: false, requires_date: false, requires_time: false, requires_notes: true,
        audience: 'BOTH', is_free: asBoolean(row.is_free), is_active: true, sort_order: index,
      })));
    } else if (templateKey === 'departments-template.xlsx') {
      const routes = importedRows.reduce<Record<string, any>>((acc, row) => {
        const code = String(row.code || '').trim();
        if (code) acc[code] = { ...row, accept_external_guests: asBoolean(row.accept_external_guests) };
        return acc;
      }, {});
      await saveDepartmentRouting(currentHotel.id, { routes });
    } else if (templateKey === 'room-numbers-template.xlsx') {
      await Promise.all(importedRows.map((row, index) => saveRoomInventory(currentHotel.id, {
        id: makeId(row.room_number, 'room-number', index), room_number: String(row.room_number || ''),
        room_type_slug: String(row.room_type_slug || ''), floor: Number(row.floor || 0), wing: String(row.wing || ''),
        qr_key_code: String(row.qr_key_code || ''),
      })));
    } else if (['fnb-menu-template.xlsx', 'room-service-template.xlsx', 'mini-bar-template.xlsx'].includes(templateKey)) {
      const outlets = await getOutlets(currentHotel.id);
      const changed = new Map<string, typeof outlets[number]>();
      for (const [index, row] of importedRows.entries()) {
        const desiredSlug = String(row.outlet_slug || '');
        const type = templateKey === 'room-service-template.xlsx' ? 'room_service' : templateKey === 'mini-bar-template.xlsx' ? 'mini_bar' : null;
        const outlet = outlets.find((item) => desiredSlug ? item.slug === desiredSlug : item.outlet_type === type);
        if (!outlet) throw new Error(`No matching outlet found for imported row ${index + 1}.`);
        const working = changed.get(outlet.id) || { ...outlet, menu_categories: [...(outlet.menu_categories || [])] };
        const categoryName = String(row.category_en || row.section_en || row.category || 'Menu');
        const categoryId = makeId(`${outlet.id}-${categoryName}`, 'category', index);
        let category = working.menu_categories.find((item) => item.id === categoryId);
        if (!category) {
          category = { id: categoryId, outlet_id: outlet.id, code: categoryId, name_en: categoryName, name_ar: String(row.category_ar || categoryName), is_active: true, sort_order: working.menu_categories.length, items: [] };
          working.menu_categories.push(category);
        }
        category.items = [...(category.items || []), {
          id: makeId(row.item_code || row.sku, 'menu-item', index), item_code: String(row.item_code || row.sku || ''), category_id: categoryId,
          name_en: String(row.name_en || ''), name_ar: String(row.name_ar || ''), description_en: '', description_ar: '', image: row.image_url ? String(row.image_url) : '',
          price: Number(row.price || 0), currency: currentHotel.currency || 'SAR', calories: Number(row.calories || 0),
          preparation_time_en: row.preparation_time_min ? `${row.preparation_time_min} min` : '',
          preparation_time_ar: row.preparation_time_min ? `${row.preparation_time_min} دقيقة` : '',
          is_vegetarian: asBoolean(row.is_vegetarian), is_spicy: asBoolean(row.is_spicy), is_available: true, sort_order: category.items?.length || 0,
        }];
        changed.set(outlet.id, working);
      }
      await Promise.all([...changed.values()].map((outlet) => saveOutlet(currentHotel.id, outlet)));
    } else {
      throw new Error(`Import template ${templateKey} is not supported.`);
    }

    setHasUnpublishedChanges(true);
    refreshRequests();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Top Admin Header */}
      <AdminHeader
        hotels={hotels}
        currentHotel={currentHotel}
        onSelectHotel={onSelectHotel}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        currentUser={currentUser}
        onSignOut={onSignOut}
        hasUnpublishedChanges={hasUnpublishedChanges}
        onPublishChanges={handlePublishChanges}
        onViewLivePortal={onViewLivePortal}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Main Admin Workspace with Responsive Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar
          currentHotel={currentHotel}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'live_preview') {
              setShowLivePreviewModal(true);
            } else {
              setActiveTab(tab);
            }
          }}
          pendingRequestsCount={
            requests.filter((r) => r.status === 'NEW' || r.status === 'RECEIVED').length
          }
          onViewLivePortal={onViewLivePortal}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Center Stage Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-stone-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 0. HOTEL PORTFOLIO & MULTI-PROPERTY GOVERNANCE */}
            {activeTab === 'portfolio' && (
              <HotelPortfolioView
                hotels={hotels}
                currentHotel={currentHotel}
                currentUser={currentUser}
                onSelectHotel={(h) => {
                  onSelectHotel(h);
                  setActiveTab('dashboard');
                }}
                onOpenCreateWizard={() => setShowCreationWizard(true)}
                onViewLivePortal={() => onViewLivePortal()}
                onHotelUpdated={(updated) => onUpdateHotel(updated)}
              />
            )}

            {/* 1. DASHBOARD */}
            {activeTab === 'dashboard' && (
              <DashboardView
                hotel={currentHotel}
                requests={requests}
                onNavigateTab={(tab) => {
                  if (tab === 'live_preview') setShowLivePreviewModal(true);
                  else setActiveTab(tab);
                }}
                onViewLivePortal={onViewLivePortal}
              />
            )}

            {/* 2. OPERATIONS: ORDERS & REQUESTS QUEUE */}
            {activeTab === 'operations_requests' && (
              <OperationsView
                hotel={currentHotel}
                requests={requests}
                onRefreshRequests={refreshRequests}
              />
            )}

            {/* HOTEL INFORMATION CMS VIEW */}
            {activeTab === 'hotel_info' && (
              <HotelInformationView
                hotel={currentHotel}
                currentUser={currentUser}
                onUpdateHotel={onUpdateHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {/* 3. WEBSITE & CMS: SECTIONS, HOMEPAGE, NAVIGATION */}
            {activeTab === 'website_manager' && (
              <WebsiteManagerView
                hotel={currentHotel}
                onUpdateHotel={onUpdateHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {activeTab === 'homepage_sections' && (
              <HomepageSectionsView
                hotel={currentHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {activeTab === 'navigation' && (
              <NavigationMenuView
                hotel={currentHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {activeTab === 'custom_sections' && (
              <CustomSectionsView
                hotel={currentHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {/* 4. CONTENT: ROOMS, FNB, WELLNESS, LAUNDRY, SERVICES, OFFERS */}
            {activeTab === 'rooms_content' && (
              <RoomsManagerView
                hotel={currentHotel}
                currentUser={currentUser}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {activeTab === 'fnb_content' && (
              <FnbManagerView
                hotel={currentHotel}
                currentUser={currentUser}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {activeTab === 'wellness_content' && (
              <WellnessManagerView
                hotel={currentHotel}
                currentUser={currentUser}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {activeTab === 'laundry_content' && (
              <LaundryManagerView
                hotel={currentHotel}
                currentUser={currentUser}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {activeTab === 'services_content' && (
              <GuestServicesManagerView
                hotel={currentHotel}
                currentUser={currentUser}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {activeTab === 'offers_content' && (
              <OffersManagerView
                hotel={currentHotel}
                currentUser={currentUser}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {/* 5. COMMUNICATION: WHATSAPP ROUTING MATRIX */}
            {(activeTab === 'departments_routing' || activeTab === 'whatsapp_settings') && (
              <WhatsAppRoutingView
                hotel={currentHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {/* GUEST REVIEWS MODERATION */}
            {activeTab === 'guest_reviews' && (
              <AdminReviewsManager currentHotel={currentHotel} />
            )}

            {/* GUEST RELATIONS & FEEDBACK HUB */}
            {activeTab === 'guest_feedback' && (
              <AdminFeedbackManager currentHotel={currentHotel} />
            )}

            {/* 6. DIGITAL: QR CODE STUDIO */}
            {activeTab === 'qr_codes' && <QRCodeStudioView hotel={currentHotel} />}

            {/* 7. DIGITAL: MEDIA LIBRARY */}
            {activeTab === 'media_library' && (
              <MediaLibraryView
                hotel={currentHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {/* 8. DIGITAL: IMPORT CENTER */}
            {activeTab === 'import_center' && (
              <ImportCenterView
                hotel={currentHotel}
                onImportCompleted={handleImportCompleted}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {/* 9. DESIGN: BRANDING & TYPOGRAPHY */}
            {(activeTab === 'branding_design' || activeTab === 'typography_design') && (
              <BrandingDesignView
                hotel={currentHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {/* 10. GOVERNANCE: ANALYTICS, RBAC & AUDIT LOG */}
            {(activeTab === 'analytics' || activeTab === 'users_rbac' || activeTab === 'audit_log') && (
              <GovernanceView
                hotel={currentHotel}
                requests={requests}
                currentRole={currentRole}
                onChangeRole={setCurrentRole}
                onOpenHotelWizard={() => setShowCreationWizard(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Live Device Simulator Modal */}
      {showLivePreviewModal && (
        <LivePreviewModal
          hotel={currentHotel}
          onClose={() => setShowLivePreviewModal(false)}
        />
      )}

      {/* New Hotel Onboarding Wizard (Accessible exclusively in Admin!) */}
      {showCreationWizard && (
        <HotelCreationWizard
          language="en"
          onClose={() => setShowCreationWizard(false)}
          onHotelCreated={(newHotel) => {
            onHotelCreated(newHotel);
            setShowCreationWizard(false);
          }}
        />
      )}
    </div>
  );
};
