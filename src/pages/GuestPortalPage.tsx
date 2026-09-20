import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Hotel,
  HotelOffer,
  Language,
  PortalSectionCode,
} from '../types/hotel';
import {
  TopLevelDepartment,
  FBOutlet,
  GuestServiceCatalogItem,
  LaundryCatalogItem,
  WellnessService,
  DepartmentContact,
} from '../types/department';
import { getRooms, getOutlets, getOffers, getWellness, getLaundry, getGuestServices } from '../services/hotelService';
import { InRoomServiceItem } from '../types/inRoomServices';
import { GuestHeader } from '../components/guest/GuestHeader';
import { DepartmentTabBar } from '../components/guest/DepartmentTabBar';
import { BreadcrumbNav, BreadcrumbItem } from '../components/guest/BreadcrumbNav';
import { HotelHero } from '../components/guest/HotelHero';
import { HotelOffersSection } from '../components/guest/HotelOffersSection';
import { GuestReviewsSection } from '../components/guest/GuestReviewsSection';
import { HotelGallerySection } from '../components/guest/HotelGallerySection';
import { HotelInfoContactSection } from '../components/guest/HotelInfoContactSection';
import { GeneralWhatsAppSection } from '../components/guest/GeneralWhatsAppSection';
import { GuestFooter } from '../components/guest/GuestFooter';
import { MobileBottomNav } from '../components/guest/MobileBottomNav';
// Phase 2 Department Hub Components
import { RoomsSection } from '../components/guest/RoomsSection';
import { PortalCatalogPreviewSection, PortalPreviewItem } from '../components/guest/PortalCatalogPreviewSection';

const FoodAndBeverageHubPage = lazy(() => import('../components/guest/FoodAndBeverageHubPage').then((module) => ({ default: module.FoodAndBeverageHubPage })));
const FBOutletDetailPage = lazy(() => import('../components/guest/FBOutletDetailPage').then((module) => ({ default: module.FBOutletDetailPage })));
const WellnessHubPage = lazy(() => import('../components/guest/WellnessHubPage').then((module) => ({ default: module.WellnessHubPage })));
const LaundryHubPage = lazy(() => import('../components/guest/LaundryHubPage').then((module) => ({ default: module.LaundryHubPage })));
const GuestServicesHubPage = lazy(() => import('../components/guest/GuestServicesHubPage').then((module) => ({ default: module.GuestServicesHubPage })));
const OffersHubPage = lazy(() => import('../components/guest/OffersHubPage').then((module) => ({ default: module.OffersHubPage })));
const InRoomServicesHubPage = lazy(() => import('../components/guest/InRoomServicesHubPage').then((module) => ({ default: module.InRoomServicesHubPage })));

interface GuestPortalPageProps {
  currentHotel: Hotel;
  language: Language;
  onToggleLanguage: () => void;
  roomNumber: string;
  onSetRoomNumber: (num: string) => void;
  initialDepartment?: TopLevelDepartment;
}

export const GuestPortalPage: React.FC<GuestPortalPageProps> = ({
  currentHotel,
  language,
  onToggleLanguage,
  roomNumber,
  onSetRoomNumber,
  initialDepartment = 'overview',
}) => {
  const isAr = language === 'ar';
  const currency = isAr ? 'ر.س' : 'SAR';

  // 1. Hierarchical Navigation State
  const [activeDepartment, setActiveDepartment] = useState<TopLevelDepartment>(initialDepartment);
  const [selectedFBOutlet, setSelectedFBOutlet] = useState<FBOutlet | null>(null);

  const [portalRooms, setPortalRooms] = useState(currentHotel.rooms || []);
  const [portalOffers, setPortalOffers] = useState<HotelOffer[]>([]);
  const [portalOutlets, setPortalOutlets] = useState<FBOutlet[]>([]);
  const [portalWellness, setPortalWellness] = useState<WellnessService[]>([]);
  const [portalLaundry, setPortalLaundry] = useState<LaundryCatalogItem[]>([]);
  const [portalServices, setPortalServices] = useState<GuestServiceCatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCatalogError(null);
    // Clear the previous tenant immediately so a slow request can never flash
    // content belonging to another hotel after a property switch.
    setPortalRooms([]);
    setPortalOffers([]);
    setPortalOutlets([]);
    setPortalWellness([]);
    setPortalLaundry([]);
    setPortalServices([]);
    Promise.all([
      getRooms(currentHotel.id),
      getOffers(currentHotel.id),
      getOutlets(currentHotel.id),
      getWellness(currentHotel.id),
      getLaundry(currentHotel.id),
      getGuestServices(currentHotel.id),
    ])
      .then(([rooms, offers, outlets, wellness, laundry, services]) => {
        if (!active) return;
        setPortalRooms(rooms.filter((room) => room.available_count === undefined || room.available_count > 0));
        setPortalOffers(offers.filter((offer) => offer.is_active !== false));
        setPortalOutlets(outlets.filter((outlet) => outlet.is_active !== false && outlet.is_visible !== false));
        setPortalWellness(wellness.filter((service) => service.is_active !== false));
        setPortalLaundry(laundry.filter((item) => item.is_active !== false).map((item) => ({
          id: item.id,
          item_code: item.item_code || item.id,
          name_en: item.name_en || '',
          name_ar: item.name_ar || '',
          category_en: item.category_en || item.category || 'Other Items',
          category_ar: item.category_ar || item.category || 'أصناف أخرى',
          icon: item.icon || 'shirt',
          prices: item.prices || {
            wash: Number(item.wash_price ?? item.price ?? 0),
            dry_clean: Number(item.dry_clean_price ?? 0),
            press: Number(item.press_price ?? 0),
            wash_press: Number(item.wash_press_price ?? item.wash_price ?? item.price ?? 0),
            express_surcharge: Number(item.express_surcharge ?? 0),
          },
          is_active: item.is_active !== false,
          sort_order: Number(item.sort_order ?? 0),
        })));
        setPortalServices(services.filter((item) => item.is_active !== false).map((item) => ({
          id: item.id,
          hotel_id: currentHotel.id,
          service_code: item.service_code || item.id,
          department: item.department || item.department_code || 'front_office',
          category_en: item.category_en || item.department_code || 'Guest Services',
          category_ar: item.category_ar || item.department_code || 'خدمات النزلاء',
          title_en: item.title_en || item.name_en || '',
          title_ar: item.title_ar || item.name_ar || '',
          description_en: item.description_en || '',
          description_ar: item.description_ar || '',
          icon: item.icon || 'sparkles',
          image: item.image || item.image_url,
          responsible_department_en: item.responsible_department_en || item.department_code || '',
          responsible_department_ar: item.responsible_department_ar || item.department_code || '',
          sla_target_en: item.sla_target_en || item.sla_target || '',
          sla_target_ar: item.sla_target_ar || item.sla_target || '',
          phone: item.phone || currentHotel.phone || '',
          extension: item.extension || '',
          whatsapp_number: item.whatsapp_number || currentHotel.whatsapp_number || '',
          requires_quantity: Boolean(item.requires_quantity),
          requires_date: Boolean(item.requires_date),
          requires_time: Boolean(item.requires_time),
          requires_notes: item.requires_notes !== false,
          audience: item.audience || 'BOTH',
          is_free: item.is_free !== false,
          price_display: item.price_display,
          is_active: item.is_active !== false,
          sort_order: Number(item.sort_order ?? 0),
        } as GuestServiceCatalogItem)));
      })
      .catch((error) => {
        console.error('[GuestPortalPage] Failed to load Firestore catalogs:', error);
        if (active) setCatalogError('Guest content is temporarily unavailable. Please try again.');
      });
    return () => { active = false; };
  }, [currentHotel.id, currentHotel.phone, currentHotel.whatsapp_number]);

  // 2. Department Data for the active hotel (configuration driven)
  const hotelOffers = portalOffers;
  const hotelFBOutlets = portalOutlets;
  const hotelWellnessServices = portalWellness;
  const hotelLaundryItems = portalLaundry;
  const hotelGuestServices = portalServices;
  const laundryContact: DepartmentContact = {
    id: `${currentHotel.id}-laundry-contact`,
    department_code: 'laundry',
    name_en: 'Hotel Laundry',
    name_ar: 'مغسلة الفندق',
    phone: currentHotel.phone || '',
    extension: '',
    whatsapp_number: currentHotel.whatsapp_number || '',
    whatsapp_enabled: Boolean(currentHotel.whatsapp_number),
    default_message_en: 'Hello, I would like to request laundry service.',
    default_message_ar: 'مرحباً، أود طلب خدمة المغسلة.',
    email: currentHotel.email,
    hours_en: '',
    hours_ar: '',
    is_active: true,
  };

  const inRoomServices = useMemo<InRoomServiceItem[]>(() => portalServices.map((service) => ({
    id: service.id,
    hotelId: currentHotel.id,
    categoryId: service.department,
    departmentId: service.department,
    category: service.department,
    nameEn: service.title_en,
    nameAr: service.title_ar,
    descriptionEn: service.description_en,
    descriptionAr: service.description_ar,
    icon: service.icon,
    image: service.image,
    whatsappNumber: service.whatsapp_number,
    phoneNumber: service.phone,
    responseTime: service.sla_target_en,
    requestType: service.requires_quantity ? 'simple_quantity' : 'standard',
    active: service.is_active,
    sortOrder: service.sort_order,
  })), [currentHotel.id, portalServices]);

  const sectionConfig = currentHotel.portal_config?.sections || [];
  const getSection = (code: PortalSectionCode) =>
    sectionConfig.find((item) => item.code === code);
  const isSectionEnabled = (code: PortalSectionCode) => {
    const section = sectionConfig.find((item) => item.code === code || item.id === code);
    return section ? section.is_enabled : true;
  };
  const sectionOrder = (code: PortalSectionCode, fallback: number) =>
    sectionConfig.find((item) => item.code === code || item.id === code)?.order ?? fallback;

  const diningPreview: PortalPreviewItem[] = portalOutlets
    .filter((outlet) => outlet.outlet_type !== 'room_service')
    .map((outlet) => ({
      id: outlet.id,
      title_en: outlet.name_en,
      title_ar: outlet.name_ar,
      description_en: outlet.short_description_en,
      description_ar: outlet.short_description_ar,
      image: outlet.hero_image,
      badge_en: outlet.cuisine_en || outlet.outlet_type,
      badge_ar: outlet.cuisine_ar || outlet.outlet_type,
    }));
  const roomServicePreview: PortalPreviewItem[] = portalOutlets
    .filter((outlet) => outlet.outlet_type === 'room_service')
    .map((outlet) => ({
      id: outlet.id,
      title_en: outlet.name_en,
      title_ar: outlet.name_ar,
      description_en: outlet.short_description_en,
      description_ar: outlet.short_description_ar,
      image: outlet.hero_image,
      badge_en: outlet.operating_info?.opening_hours_en,
      badge_ar: outlet.operating_info?.opening_hours_ar,
    }));
  const wellnessPreview: PortalPreviewItem[] = portalWellness.map((service) => ({
    id: service.id,
    title_en: service.name_en,
    title_ar: service.name_ar,
    description_en: service.short_description_en,
    description_ar: service.short_description_ar,
    image: service.hero_image,
    badge_en: service.availability_en,
    badge_ar: service.availability_ar,
  }));
  const servicesPreview: PortalPreviewItem[] = portalServices.map((service) => ({
    id: service.id,
    title_en: service.title_en,
    title_ar: service.title_ar,
    description_en: service.description_en,
    description_ar: service.description_ar,
    image: service.image,
    badge_en: service.sla_target_en,
    badge_ar: service.sla_target_ar,
  }));

  const availableDepartments = useMemo<TopLevelDepartment[]>(() => {
    const departments: TopLevelDepartment[] = ['overview'];
    if (portalServices.length > 0) departments.push('stay', 'services');
    if (portalOutlets.length > 0) departments.push('dining');
    if (portalWellness.length > 0) departments.push('wellness');
    if (portalLaundry.length > 0) departments.push('laundry');
    if (portalOffers.length > 0) departments.push('offers');
    return departments;
  }, [portalLaundry.length, portalOffers.length, portalOutlets.length, portalServices.length, portalWellness.length]);

  const availableSectionIds = useMemo(() => {
    const ids = ['top', 'hotel-info', 'contact-location'];
    if (portalOffers.length > 0) ids.push('hotel-offers');
    if (portalRooms.length > 0) ids.push('rooms-suites');
    if (diningPreview.length > 0) ids.push('dining-venues');
    if (wellnessPreview.length > 0) ids.push('wellness-spa');
    if (roomServicePreview.length > 0) ids.push('room-service-cafe');
    if (servicesPreview.length > 0) ids.push('hotel-services');
    return ids;
  }, [diningPreview.length, portalOffers.length, portalRooms.length, roomServicePreview.length, servicesPreview.length, wellnessPreview.length]);

  const heroCustom = currentHotel.portal_config?.hero_custom;
  const portalHotel: Hotel = {
    ...currentHotel,
    name_en: heroCustom?.headline_en || currentHotel.name_en,
    name_ar: heroCustom?.headline_ar || currentHotel.name_ar,
    tagline_en: heroCustom?.sub_en || currentHotel.tagline_en,
    tagline_ar: heroCustom?.sub_ar || currentHotel.tagline_ar,
    hero_images: heroCustom?.bg_url
      ? [{ url: heroCustom.bg_url, caption_en: '', caption_ar: '', tag_en: '', tag_ar: '' }, ...(currentHotel.hero_images || []).filter((image) => image.url !== heroCustom.bg_url)]
      : currentHotel.hero_images,
    rooms: portalRooms,
    offers: portalOffers,
  };

  // Breadcrumb items calculation
  const departmentNames: Record<TopLevelDepartment, { en: string; ar: string }> = {
    overview: { en: 'Overview', ar: 'الرئيسية' },
    stay: { en: 'In-Room Services', ar: 'خدمات الغرفة' },
    dining: { en: 'Food & Beverage', ar: 'المطاعم والمقاهي' },
    wellness: { en: 'Wellness & Spa', ar: 'الصحة والسبا' },
    laundry: { en: 'Laundry & Valet', ar: 'المغسلة والعناية' },
    services: { en: 'Guest Services', ar: 'خدمات النزلاء' },
    offers: { en: 'Special Offers', ar: 'العروض والباقات' },
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label_en: 'Hotel Home',
      label_ar: 'الرئيسية',
      onClick: () => {
        setActiveDepartment('overview');
        setSelectedFBOutlet(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      isActive: activeDepartment === 'overview',
    },
  ];

  if (activeDepartment !== 'overview') {
    breadcrumbItems.push({
      label_en: departmentNames[activeDepartment].en,
      label_ar: departmentNames[activeDepartment].ar,
      onClick: selectedFBOutlet
        ? () => {
            setSelectedFBOutlet(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        : undefined,
      isActive: !selectedFBOutlet,
    });
  }

  if (activeDepartment === 'dining' && selectedFBOutlet) {
    breadcrumbItems.push({
      label_en: selectedFBOutlet.name_en,
      label_ar: selectedFBOutlet.name_ar,
      isActive: true,
    });
  }

  const handleSelectDepartment = (dept: TopLevelDepartment) => {
    if (!availableDepartments.includes(dept)) return;
    setActiveDepartment(dept);
    setSelectedFBOutlet(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateSection = (href: string) => {
    const sectionId = href.replace(/^#/, '');
    setActiveDepartment('overview');
    setSelectedFBOutlet(null);
    window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const handleSelectOffer = (offer: HotelOffer) => {
    if (offer.department === 'rooms') {
      const el = document.getElementById('rooms-showcase');
      if (el && activeDepartment === 'overview') {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        setActiveDepartment('stay');
      }
    } else if (
      offer.department === 'restaurant' ||
      offer.department === 'cafe' ||
      offer.department === 'room_service'
    ) {
      if (offer.department === 'restaurant') {
        const restOutlet = hotelFBOutlets.find((o) => o.outlet_type === 'restaurant');
        if (restOutlet) setSelectedFBOutlet(restOutlet);
      } else if (offer.department === 'cafe') {
        const cafeOutlet = hotelFBOutlets.find((o) => o.outlet_type === 'cafe');
        if (cafeOutlet) setSelectedFBOutlet(cafeOutlet);
      }
      setActiveDepartment('dining');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (offer.department === 'health_club') {
      setActiveDepartment('wellness');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (offer.department === 'laundry') {
      setActiveDepartment('laundry');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveDepartment('offers');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-stone-50 text-stone-600">{isAr ? 'جاري تحميل القسم...' : 'Loading section...'}</div>}>
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-amber-200 selection:text-stone-900 pb-16 md:pb-0">
      {/* 1. Header (Branding, language toggle, room session) */}
      <GuestHeader
        currentHotel={portalHotel}
        language={language}
        onToggleLanguage={onToggleLanguage}
        roomNumber={roomNumber}
        onSetRoomNumber={onSetRoomNumber}
        onNavigateSection={handleNavigateSection}
        availableSectionIds={availableSectionIds}
      />

      {/* 2. Top-Level Department Navigation Bar (Desktop & Tablet) */}
      <DepartmentTabBar
        activeDepartment={activeDepartment}
        onSelectDepartment={handleSelectDepartment}
        language={language}
        availableDepartments={availableDepartments}
        counts={{
          stay: portalServices.length,
          dining: portalOutlets.length,
          wellness: portalWellness.length,
          laundry: portalLaundry.length,
          services: portalServices.length,
          offers: portalOffers.length,
        }}
      />

      {/* 3. Breadcrumb Navigation (Showing full hierarchy) */}
      {activeDepartment !== 'overview' && (
        <BreadcrumbNav items={breadcrumbItems} language={language} />
      )}

      {/* Dynamic Portal Announcement Banner (if configured) */}
      {currentHotel.portal_config?.announcement_banner?.enabled && (
        <div className="bg-amber-500 text-stone-900 px-4 py-2 text-center text-xs font-semibold shadow-xs">
          {isAr
            ? currentHotel.portal_config.announcement_banner.text_ar
            : currentHotel.portal_config.announcement_banner.text_en}
        </div>
      )}

      {catalogError && (
        <div role="alert" className="bg-rose-50 border-y border-rose-200 text-rose-800 px-4 py-3 text-center text-sm">
          {isAr ? 'تعذر تحميل محتوى الفندق مؤقتاً. يرجى المحاولة مرة أخرى.' : catalogError}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEPARTMENT ROUTING & VIEW RENDERER                                        */}
      {/* ========================================================================= */}

      {/* VIEW: OVERVIEW (Comprehensive QR Hotel Digital Hub Architecture) */}
      {activeDepartment === 'overview' && (
        <main className="flex-1 flex flex-col">
          {/* 1. HERO / BANNER */}
          {isSectionEnabled('hero') && (
            <div style={{ order: sectionOrder('hero', 1) }}>
              <HotelHero
                hotel={portalHotel}
                language={language}
                roomNumber={roomNumber}
                onToggleLanguage={onToggleLanguage}
                onExploreOffers={() => {
                  const el = document.getElementById('hotel-offers');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onExploreServices={() => {
                  const configuredTarget = heroCustom?.cta_target?.replace(/^#/, '') || 'hotel-services';
                  const target = availableSectionIds.includes(configuredTarget)
                    ? configuredTarget
                    : availableSectionIds.find((id) => !['top', 'hotel-info', 'contact-location'].includes(id)) || 'hotel-info';
                  const el = document.getElementById(target);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                primaryCtaLabel={isAr ? heroCustom?.cta_ar : heroCustom?.cta_en}
                showServicesCta={servicesPreview.length + diningPreview.length + wellnessPreview.length + roomServicePreview.length > 0}
                showOffersCta={hotelOffers.length > 0}
              />
            </div>
          )}

          {/* 2. HOTEL OFFERS (Redesigned Full-Width Animated Hero Slider) */}
          {isSectionEnabled('offers') && hotelOffers.length > 0 && (
            <div style={{ order: sectionOrder('offers', 2) }}>
              <HotelOffersSection
                hotel={portalHotel}
                offers={hotelOffers}
                language={language}
                roomNumber={roomNumber}
                onViewAllOffers={() => {
                  setActiveDepartment('offers');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}

          {isSectionEnabled('rooms') && portalRooms.length > 0 && (
            <div style={{ order: sectionOrder('rooms', 3) }}>
              <RoomsSection
                rooms={portalRooms}
                currency={currency}
                language={language}
                hotelWhatsApp={currentHotel.whatsapp_number}
                hotelPhone={currentHotel.phone}
                hotelNameEn={currentHotel.name_en}
                hotelNameAr={currentHotel.name_ar}
                showPrice={currentHotel.show_room_price === true}
              />
            </div>
          )}

          {isSectionEnabled('dining') && diningPreview.length > 0 && (
            <div style={{ order: sectionOrder('dining', 4) }}>
              <PortalCatalogPreviewSection
                id="dining-venues"
                language={language}
                title_en={getSection('dining')?.title_en || 'Dining & Café'}
                title_ar={getSection('dining')?.title_ar || 'المطاعم والمقهى'}
                subtitle_en={getSection('dining')?.subtitle_en}
                subtitle_ar={getSection('dining')?.subtitle_ar}
                items={diningPreview}
                onViewAll={() => handleSelectDepartment('dining')}
              />
            </div>
          )}

          {isSectionEnabled('wellness') && wellnessPreview.length > 0 && (
            <div style={{ order: sectionOrder('wellness', 5) }}>
              <PortalCatalogPreviewSection
                id="wellness-spa"
                language={language}
                title_en={getSection('wellness')?.title_en || 'Wellness & Spa'}
                title_ar={getSection('wellness')?.title_ar || 'العافية والسبا'}
                subtitle_en={getSection('wellness')?.subtitle_en}
                subtitle_ar={getSection('wellness')?.subtitle_ar}
                items={wellnessPreview}
                onViewAll={() => handleSelectDepartment('wellness')}
              />
            </div>
          )}

          {isSectionEnabled('room_service_cafe') && roomServicePreview.length > 0 && (
            <div style={{ order: sectionOrder('room_service_cafe', 6) }}>
              <PortalCatalogPreviewSection
                id="room-service-cafe"
                language={language}
                title_en={getSection('room_service_cafe')?.title_en || 'Room Service'}
                title_ar={getSection('room_service_cafe')?.title_ar || 'خدمة الغرف'}
                subtitle_en={getSection('room_service_cafe')?.subtitle_en}
                subtitle_ar={getSection('room_service_cafe')?.subtitle_ar}
                items={roomServicePreview}
                onViewAll={() => handleSelectDepartment('dining')}
              />
            </div>
          )}

          {isSectionEnabled('services') && servicesPreview.length > 0 && (
            <div style={{ order: sectionOrder('services', 7) }}>
              <PortalCatalogPreviewSection
                id="hotel-services"
                language={language}
                title_en={getSection('services')?.title_en || 'Guest Services'}
                title_ar={getSection('services')?.title_ar || 'خدمات النزلاء'}
                subtitle_en={getSection('services')?.subtitle_en}
                subtitle_ar={getSection('services')?.subtitle_ar}
                items={servicesPreview}
                onViewAll={() => handleSelectDepartment('stay')}
              />
            </div>
          )}

          {/* 4. GUEST REVIEWS (Moderated review system) */}
          <div style={{ order: 80 }}>
              <GuestReviewsSection
                hotelId={currentHotel.id}
                hotelName={isAr ? currentHotel.name_ar : currentHotel.name_en}
                language={language}
                roomNumber={roomNumber}
                isVerifiedContext={Boolean(roomNumber)}
              />
          </div>

          {/* 5. HOTEL GALLERY (Visual tour & lightbox) */}
          {portalHotel.hero_images.length > 0 && (
            <div style={{ order: 90 }}>
              <HotelGallerySection language={language} heroImages={portalHotel.hero_images} />
            </div>
          )}

          {/* 6. HOTEL INFORMATION & GUEST ASSISTANCE (Information, Contacts, Feedback, Safety) */}
          {isSectionEnabled('info') && (
            <div style={{ order: 100 }}>
              <div id="hotel-info" className="scroll-mt-28">
                <HotelInfoContactSection hotel={portalHotel} language={language} roomNumber={roomNumber} />
              </div>
            </div>
          )}

          {/* 7. GENERAL WHATSAPP (Reception & Concierge helpline with room context) */}
          {isSectionEnabled('contact') && (
            <div style={{ order: 110 }}>
              <div id="contact-location" className="scroll-mt-28">
                <GeneralWhatsAppSection hotel={portalHotel} language={language} roomNumber={roomNumber} />
              </div>
            </div>
          )}

          {(currentHotel.portal_config?.custom_sections || [])
            .filter((section) => section.is_enabled)
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <section
                key={section.id}
                id={section.id}
                style={{ order: section.order }}
                className="py-16 bg-white border-b border-stone-200"
              >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    {section.badge_en && <p className="text-xs font-bold tracking-widest text-amber-700 uppercase mb-2">{isAr ? section.badge_ar : section.badge_en}</p>}
                    <h2 className="text-3xl font-serif font-bold text-stone-900">{isAr ? section.title_ar : section.title_en}</h2>
                    {section.subtitle_en && <p className="text-lg text-stone-600 mt-2">{isAr ? section.subtitle_ar : section.subtitle_en}</p>}
                    {(section.custom_content_en || section.custom_content_ar) && <p className="text-sm leading-7 text-stone-600 mt-4">{isAr ? section.custom_content_ar : section.custom_content_en}</p>}
                    {section.cta_url && section.cta_label_en && /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(section.cta_url) && (
                      <a href={section.cta_url} className="inline-flex mt-6 px-5 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold">
                        {isAr ? section.cta_label_ar : section.cta_label_en}
                      </a>
                    )}
                  </div>
                  {section.image_url && <img src={section.image_url} alt={isAr ? section.title_ar : section.title_en} className="w-full aspect-[4/3] object-cover rounded-2xl" />}
                </div>
              </section>
            ))}
        </main>
      )}

      {/* VIEW: STAY (In-Room Services Hub) */}
      {activeDepartment === 'stay' && (
        <main className="flex-1">
          <InRoomServicesHubPage
            hotel={portalHotel}
            language={language}
            roomNumber={roomNumber}
            onSetRoomNumber={onSetRoomNumber}
            onNavigateToDining={() => handleSelectDepartment('dining')}
            services={inRoomServices}
          />
        </main>
      )}

      {/* VIEW: DINING (Food & Beverage Department) */}
      {activeDepartment === 'dining' && (
        <main className="flex-1">
          {!selectedFBOutlet ? (
            <FoodAndBeverageHubPage
              outlets={hotelFBOutlets}
              currency={currency}
              language={language}
              onBackToHome={() => handleSelectDepartment('overview')}
              onSelectOutlet={(outlet) => {
                setSelectedFBOutlet(outlet);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectOffer={handleSelectOffer}
            />
          ) : (
            <FBOutletDetailPage
              outlet={selectedFBOutlet}
              hotelNameEn={currentHotel.name_en}
              hotelNameAr={currentHotel.name_ar}
              currency={currency}
              language={language}
              roomNumber={roomNumber}
              onBackToHub={() => {
                setSelectedFBOutlet(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectOffer={handleSelectOffer}
            />
          )}
        </main>
      )}

      {/* VIEW: WELLNESS (Wellness & Spa Department) */}
      {activeDepartment === 'wellness' && (
        <main className="flex-1">
          <WellnessHubPage
            hotelId={currentHotel.id}
            hotelNameEn={currentHotel.name_en}
            hotelNameAr={currentHotel.name_ar}
            services={hotelWellnessServices}
            currency={currency}
            language={language}
            roomNumber={roomNumber}
            onSelectOffer={handleSelectOffer}
            onBackToHome={() => handleSelectDepartment('overview')}
          />
        </main>
      )}

      {/* VIEW: LAUNDRY (Valet Laundry Department) */}
      {activeDepartment === 'laundry' && (
        <main className="flex-1">
          <LaundryHubPage
            hotelId={currentHotel.id}
            hotelNameEn={currentHotel.name_en}
            hotelNameAr={currentHotel.name_ar}
            items={hotelLaundryItems}
            contact={laundryContact}
            currency={currency}
            language={language}
            roomNumber={roomNumber}
            onBackToHome={() => handleSelectDepartment('overview')}
          />
        </main>
      )}

      {/* VIEW: GUEST SERVICES (Housekeeping & Rapid Concierge) */}
      {activeDepartment === 'services' && (
        <main className="flex-1">
          <GuestServicesHubPage
            hotelId={currentHotel.id}
            hotelNameEn={currentHotel.name_en}
            hotelNameAr={currentHotel.name_ar}
            services={hotelGuestServices}
            currency={currency}
            language={language}
            roomNumber={roomNumber}
          />
        </main>
      )}

      {/* VIEW: OFFERS (All Hotel Packages & Privileges) */}
      {activeDepartment === 'offers' && (
        <main className="flex-1">
          <OffersHubPage
            hotel={currentHotel}
            offers={hotelOffers}
            currency={currency}
            language={language}
            roomNumber={roomNumber}
            onNavigateDepartment={handleSelectDepartment}
          />
        </main>
      )}

      {/* 10. Global Guest Footer */}
      <GuestFooter
        hotel={currentHotel}
        language={language}
        onToggleLanguage={onToggleLanguage}
        onNavigateSection={handleNavigateSection}
        availableSectionIds={availableSectionIds}
      />

      {/* 11. Mobile Bottom Navigation Bar (Persistent on QR/Mobile Viewports) */}
      <MobileBottomNav
        activeTab={activeDepartment}
        onSelectTab={handleSelectDepartment}
        language={language}
        offersCount={hotelOffers.length}
        availableDepartments={availableDepartments.filter((department) =>
          ['overview', 'stay', 'dining', 'wellness', 'offers'].includes(department)
        )}
      />
    </div>
    </Suspense>
  );
};
