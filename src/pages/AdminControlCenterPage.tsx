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
import { HotelContentView, ContentSubTab } from '../components/admin/HotelContentView';
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
import { ShieldAlert } from 'lucide-react';
import { AdminUser, canAccessHotel } from '../types/auth';
import { subscribeToHotelRequests } from '../services/requestService';

interface AdminControlCenterPageProps {
  hotels: Hotel[];
  currentHotel: Hotel;
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
  const [activeTab, setActiveTab] = useState<AdminSectionTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<StaffRole>(currentUser?.role || 'SUPER_ADMIN');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [requests, setRequests] = useState<OperationalRequest[]>([]);

  // Multi-Hotel Tenant Security Guard:
  // If an authenticated user enters another hotel's URL or parameter without permission, block access immediately
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

  // Load operational requests for the current hotel with real-time sync
  const refreshRequests = () => {
    const all = getStoredRequests();
    const hotelRequests = all.filter((r) => r.hotel_id === currentHotel.id || !r.hotel_id);
    setRequests(hotelRequests);
  };

  useEffect(() => {
    // Connect to real-time subscription (Firestore onSnapshot or localStorage polling)
    const unsubscribe = subscribeToHotelRequests(currentHotel.id, (hotelRequests) => {
      setRequests(hotelRequests);
    });
    return () => unsubscribe();
  }, [currentHotel.id]);

  const handlePublishChanges = () => {
    setHasUnpublishedChanges(false);
    // In production, sync draft JSON schema to live storage
  };

  const handleImportCompleted = (templateKey: ImportTemplateType, importedRows: Record<string, any>[]) => {
    if (!importedRows || importedRows.length === 0) return;

    const updatedHotel = { ...currentHotel };

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
        images: [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        ],
        amenities: [],
        features_en: ['High-speed WiFi', 'Smart TV', 'Espresso Machine'],
        features_ar: ['واي فاي فائق السرعة', 'شاشة ذكية', 'ماكينة إسبريسو'],
        available_count: Number(r.available_count) || 5,
      }));

      const existingRooms = currentHotel.rooms || [];
      const mergedRooms = [...existingRooms];
      newRooms.forEach((nr) => {
        const matchIdx = mergedRooms.findIndex((ex) => ex.slug === nr.slug || ex.id === nr.id);
        if (matchIdx >= 0) {
          mergedRooms[matchIdx] = nr;
        } else {
          mergedRooms.push(nr);
        }
      });

      updatedHotel.rooms = mergedRooms;
      onUpdateHotel(updatedHotel);
      setHasUnpublishedChanges(true);
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
        image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        terms_en: 'Subject to availability. Terms and conditions apply.',
        terms_ar: 'يخضع للتوفر. تطبق الشروط والأحكام.',
        is_active: true,
      }));

      const existingOffers = currentHotel.offers || [];
      updatedHotel.offers = [...existingOffers, ...newOffers];
      onUpdateHotel(updatedHotel);
      setHasUnpublishedChanges(true);
    }

    refreshRequests();
  };

  // Map subtabs for Content View
  const getContentSubTab = (): ContentSubTab => {
    switch (activeTab) {
      case 'rooms_content':
        return 'rooms';
      case 'fnb_content':
        return 'fnb';
      case 'wellness_content':
        return 'wellness';
      case 'laundry_content':
        return 'laundry';
      case 'services_content':
        return 'services';
      case 'offers_content':
        return 'offers';
      default:
        return 'rooms';
    }
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

            {/* 3. WEBSITE & CMS: SECTIONS, HOMEPAGE, NAVIGATION */}
            {(activeTab === 'website_manager' ||
              activeTab === 'homepage_sections' ||
              activeTab === 'navigation' ||
              activeTab === 'custom_sections') && (
              <WebsiteManagerView
                hotel={currentHotel}
                onUpdateHotel={onUpdateHotel}
                onMarkUnpublishedChanges={() => setHasUnpublishedChanges(true)}
              />
            )}

            {/* 4. CONTENT: ROOMS, FNB, WELLNESS, LAUNDRY, SERVICES, OFFERS */}
            {(activeTab === 'rooms_content' ||
              activeTab === 'fnb_content' ||
              activeTab === 'wellness_content' ||
              activeTab === 'laundry_content' ||
              activeTab === 'services_content' ||
              activeTab === 'offers_content') && (
              <HotelContentView
                hotel={currentHotel}
                activeSubTab={getContentSubTab()}
                onSelectSubTab={(sub) => {
                  setActiveTab(`${sub}_content` as AdminSectionTab);
                }}
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
