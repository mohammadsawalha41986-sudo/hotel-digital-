import React, { useState } from 'react';
import {
  Hotel,
  HotelOffer,
  Language,
} from '../types/hotel';
import {
  TopLevelDepartment,
  FBOutlet,
} from '../types/department';
import {
  getHotelFBOutlets,
  getHotelWellnessServices,
  getHotelLaundryItems,
  getHotelGuestServices,
  getHotelDepartmentContacts,
} from '../data/departmentData';
import { MOCK_OFFERS } from '../data/mockHotels';
import { GuestHeader } from '../components/guest/GuestHeader';
import { DepartmentTabBar } from '../components/guest/DepartmentTabBar';
import { BreadcrumbNav, BreadcrumbItem } from '../components/guest/BreadcrumbNav';
import { HotelHero } from '../components/guest/HotelHero';
import { HotelOffersSection } from '../components/guest/HotelOffersSection';
import { HotelDepartmentGridSection } from '../components/guest/HotelDepartmentGridSection';
import { GuestReviewsSection } from '../components/guest/GuestReviewsSection';
import { HotelGallerySection } from '../components/guest/HotelGallerySection';
import { HotelInfoContactSection } from '../components/guest/HotelInfoContactSection';
import { GeneralWhatsAppSection } from '../components/guest/GeneralWhatsAppSection';
import { GuestFooter } from '../components/guest/GuestFooter';
import { MobileBottomNav } from '../components/guest/MobileBottomNav';
// Phase 2 Department Hub Components
import { FoodAndBeverageHubPage } from '../components/guest/FoodAndBeverageHubPage';
import { FBOutletDetailPage } from '../components/guest/FBOutletDetailPage';
import { WellnessHubPage } from '../components/guest/WellnessHubPage';
import { LaundryHubPage } from '../components/guest/LaundryHubPage';
import { GuestServicesHubPage } from '../components/guest/GuestServicesHubPage';
import { OffersHubPage } from '../components/guest/OffersHubPage';
import { InRoomServicesHubPage } from '../components/guest/InRoomServicesHubPage';

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

  // 2. Department Data for the active hotel (configuration driven)
  const hotelOffers: HotelOffer[] =
    currentHotel.offers && currentHotel.offers.length > 0
      ? currentHotel.offers
      : MOCK_OFFERS.filter((o: HotelOffer) => o.hotel_id === currentHotel.id);

  // Filter outlets, wellness, laundry, guest services
  const hotelFBOutlets = getHotelFBOutlets(currentHotel.id);
  const hotelWellnessServices = getHotelWellnessServices(currentHotel.id);
  const hotelLaundryItems = getHotelLaundryItems(currentHotel.id);
  const hotelGuestServices = getHotelGuestServices(currentHotel.id);
  const hotelContacts = getHotelDepartmentContacts(currentHotel.id);
  const laundryContact = hotelContacts.find((c) => c.department_code === 'laundry' || c.department_code === 'housekeeping');

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
    setActiveDepartment(dept);
    setSelectedFBOutlet(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-amber-200 selection:text-stone-900 pb-16 md:pb-0">
      {/* 1. Header (Branding, language toggle, room session) */}
      <GuestHeader
        currentHotel={currentHotel}
        language={language}
        onToggleLanguage={onToggleLanguage}
        roomNumber={roomNumber}
        onSetRoomNumber={onSetRoomNumber}
      />

      {/* 2. Top-Level Department Navigation Bar (Desktop & Tablet) */}
      <DepartmentTabBar
        activeDepartment={activeDepartment}
        onSelectDepartment={handleSelectDepartment}
        language={language}
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

      {/* ========================================================================= */}
      {/* DEPARTMENT ROUTING & VIEW RENDERER                                        */}
      {/* ========================================================================= */}

      {/* VIEW: OVERVIEW (Comprehensive QR Hotel Digital Hub Architecture) */}
      {activeDepartment === 'overview' && (
        <main className="flex-1">
          {/* 1. HERO / BANNER */}
          <HotelHero
            hotel={currentHotel}
            language={language}
            roomNumber={roomNumber}
            onToggleLanguage={onToggleLanguage}
            onExploreOffers={() => {
              const el = document.getElementById('hotel-offers');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onExploreServices={() => {
              const el = document.getElementById('hotel-departments');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* 2. HOTEL OFFERS (Redesigned Full-Width Animated Hero Slider) */}
          <HotelOffersSection
            hotel={currentHotel}
            offers={hotelOffers}
            language={language}
            roomNumber={roomNumber}
            onViewAllOffers={() => {
              setActiveDepartment('offers');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* 3. FOUR MAIN DEPARTMENTS */}
          <HotelDepartmentGridSection
            hotel={currentHotel}
            language={language}
            onSelectDepartment={handleSelectDepartment}
          />

          {/* 4. GUEST REVIEWS (Moderated review system) */}
          <GuestReviewsSection
            hotelId={currentHotel.id}
            hotelName={isAr ? currentHotel.name_ar : currentHotel.name_en}
            language={language}
            roomNumber={roomNumber}
            isVerifiedContext={Boolean(roomNumber)}
          />

          {/* 5. HOTEL GALLERY (Visual tour & lightbox) */}
          <HotelGallerySection
            language={language}
            heroImages={currentHotel.hero_images}
          />

          {/* 6. HOTEL INFORMATION & GUEST ASSISTANCE (Information, Contacts, Feedback, Safety) */}
          <HotelInfoContactSection
            hotel={currentHotel}
            language={language}
            roomNumber={roomNumber}
          />

          {/* 7. GENERAL WHATSAPP (Reception & Concierge helpline with room context) */}
          <GeneralWhatsAppSection
            hotel={currentHotel}
            language={language}
            roomNumber={roomNumber}
          />
        </main>
      )}

      {/* VIEW: STAY (In-Room Services Hub) */}
      {activeDepartment === 'stay' && (
        <main className="flex-1">
          <InRoomServicesHubPage
            hotel={currentHotel}
            language={language}
            roomNumber={roomNumber}
            onSetRoomNumber={onSetRoomNumber}
            onNavigateToDining={() => handleSelectDepartment('dining')}
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
      />

      {/* 11. Mobile Bottom Navigation Bar (Persistent on QR/Mobile Viewports) */}
      <MobileBottomNav
        activeTab={activeDepartment}
        onSelectTab={handleSelectDepartment}
        language={language}
        offersCount={hotelOffers.length}
      />
    </div>
  );
};
