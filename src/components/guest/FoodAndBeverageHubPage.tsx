import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UtensilsCrossed,
  Clock,
  MapPin,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Tag,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Sparkles,
  BedDouble,
  Refrigerator,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FBOutlet } from '../../types/department';
import { Language, HotelOffer } from '../../types/hotel';
import { getOperatingStatus, buildWhatsAppLink } from '../../utils/operatingStatus';
import { DEFAULT_DINING_OFFERS } from '../../data/diningOffersData';

interface FoodAndBeverageHubPageProps {
  outlets: FBOutlet[];
  currency: string;
  language: Language;
  onBackToHome?: () => void;
  onSelectOutlet: (outlet: FBOutlet) => void;
  onSelectOffer?: (offer: HotelOffer) => void;
}

export const FoodAndBeverageHubPage: React.FC<FoodAndBeverageHubPageProps> = ({
  outlets,
  currency,
  language,
  onBackToHome,
  onSelectOutlet,
}) => {
  const isAr = language === 'ar';
  const [filterType, setFilterType] = useState<string>('all');

  // Featured F&B Offers Slider State
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeOffers = useMemo(() => {
    return DEFAULT_DINING_OFFERS.filter((o) => o.active);
  }, []);

  // Autoplay for offers slider (pauses on hover)
  useEffect(() => {
    if (activeOffers.length <= 1 || isSliderHovered) return;

    autoplayTimerRef.current = setInterval(() => {
      setCurrentOfferIndex((prev) => (prev + 1) % activeOffers.length);
    }, 5500);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [activeOffers.length, isSliderHovered]);

  const handlePrevOffer = () => {
    setCurrentOfferIndex((prev) => (prev - 1 + activeOffers.length) % activeOffers.length);
  };

  const handleNextOffer = () => {
    setCurrentOfferIndex((prev) => (prev + 1) % activeOffers.length);
  };

  // Simple filter tabs as required: All, Restaurant, Café, Shisha, Room Service, Mini Bar
  const filterTabs = [
    { id: 'all', label_en: 'All Outlets', label_ar: 'الكل' },
    { id: 'restaurant', label_en: 'Restaurant', label_ar: 'المطعم' },
    { id: 'cafe', label_en: 'Café', label_ar: 'الكافيه' },
    { id: 'shisha', label_en: 'Shisha Lounge', label_ar: 'الشيشة' },
    { id: 'room_service', label_en: 'Room Service', label_ar: 'خدمة الغرف' },
    { id: 'mini_bar', label_en: 'Mini Bar', label_ar: 'الميني بار' },
  ];

  // Specific canonical order requested:
  // 1. Main Restaurant
  // 2. Lobby Café
  // 3. Café & Shisha Lounge
  // 4. Room Service
  // 5. Mini Bar
  // 6. Any other outlets (e.g. Banquet/Events)
  const orderedOutlets = useMemo(() => {
    const typePriority: Record<string, number> = {
      restaurant: 1,
      cafe: 2,
      shisha: 3,
      room_service: 4,
      mini_bar: 5,
      banquet: 6,
    };

    return [...outlets].sort((a, b) => {
      const orderA = a.sort_order ?? typePriority[a.outlet_type] ?? 99;
      const orderB = b.sort_order ?? typePriority[b.outlet_type] ?? 99;
      return orderA - orderB;
    });
  }, [outlets]);

  const filteredOutlets = useMemo(() => {
    return orderedOutlets.filter((outlet) => {
      if (!outlet.is_active) return false;
      if (filterType === 'all') return true;
      return outlet.outlet_type === filterType;
    });
  }, [orderedOutlets, filterType]);

  const currentOffer = activeOffers[currentOfferIndex] || activeOffers[0];

  // Resolve outlet referenced by current offer
  const matchedOfferOutlet = useMemo(() => {
    if (!currentOffer) return null;
    return (
      outlets.find((o) => o.id === currentOffer.outletId || o.slug === currentOffer.outletId) ||
      null
    );
  }, [currentOffer, outlets]);

  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-900" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Back Button Navigation Bar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs font-semibold transition-all cursor-pointer group"
          >
            {isAr ? (
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            ) : (
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            )}
            <span>{isAr ? 'رجوع إلى الرئيسية' : 'Back to Home'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>{isAr ? 'خدمات الطعام والشراب متوفرة' : 'F&B Services Active'}</span>
          </div>
        </div>
      </div>

      {/* 2. Section Hero / Page Title */}
      <div className="bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 text-white relative overflow-hidden py-10 sm:py-14 px-4">
        {/* Subtle background ambient overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
            <UtensilsCrossed size={13} />
            <span>{isAr ? 'قسم الأغذية والمشروبات' : 'Food & Beverage Hub'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif tracking-tight leading-tight">
            {isAr ? 'الطعام والشراب' : 'Dining & Beverage'}
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            {isAr
              ? 'اكتشف المطعم الرئيسي والكافيه والشيشة وخدمة الغرف والميني بار داخل الفندق.'
              : 'Discover the hotel’s restaurants, café, shisha lounge, room service and minibar offerings.'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 space-y-10 relative z-10">
        {/* 3. FIRST THING ON THE PAGE = FEATURED F&B OFFERS BANNER / SLIDER */}
        {activeOffers.length > 0 && currentOffer && (
          <div
            className="bg-stone-900 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-stone-800 text-white relative group/slider"
            onMouseEnter={() => setIsSliderHovered(true)}
            onMouseLeave={() => setIsSliderHovered(false)}
          >
            <div className="relative min-h-[320px] sm:min-h-[360px] lg:min-h-[390px] flex items-end">
              {/* Background Image with Crossfade */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentOffer.id}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0"
                >
                  <img
                    src={currentOffer.image}
                    alt={isAr ? currentOffer.titleAr : currentOffer.titleEn}
                    className="w-full h-full object-cover filter brightness-[0.78]"
                  />
                  {/* Multi-layer gradient overlays for pristine readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-transparent to-stone-950/40" />
                </motion.div>
              </AnimatePresence>

              {/* Slider Content */}
              <div className="relative z-10 p-5 sm:p-8 lg:p-10 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="max-w-2xl space-y-3">
                  {/* Outlet & Offer Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-amber-500 text-stone-950 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                      <Sparkles size={12} />
                      <span>{isAr ? currentOffer.badgeAr : currentOffer.badgeEn}</span>
                    </span>

                    <span className="bg-stone-900/80 backdrop-blur-md border border-white/20 text-stone-200 text-xs px-3 py-1 rounded-full font-medium">
                      {isAr ? currentOffer.outletNameAr : currentOffer.outletNameEn}
                    </span>

                    {currentOffer.price && (
                      <span className="bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Tag size={12} />
                        <span>
                          {isAr ? currentOffer.pricePrefixAr : currentOffer.pricePrefixEn}{' '}
                          {currentOffer.price} {currentOffer.currency}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Offer Title */}
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif leading-snug drop-shadow-sm">
                    {isAr ? currentOffer.titleAr : currentOffer.titleEn}
                  </h2>

                  {/* Offer Description */}
                  <p className="text-stone-200 text-xs sm:text-sm leading-relaxed max-w-xl drop-shadow-sm">
                    {isAr ? currentOffer.descriptionAr : currentOffer.descriptionEn}
                  </p>
                </div>

                {/* Offer Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                  {matchedOfferOutlet && (
                    <button
                      onClick={() => onSelectOutlet(matchedOfferOutlet)}
                      className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer group/cta"
                    >
                      <span>{isAr ? currentOffer.ctaLabelAr : currentOffer.ctaLabelEn}</span>
                      {isAr ? (
                        <ArrowLeft
                          size={15}
                          className="group-hover/cta:-translate-x-1 transition-transform"
                        />
                      ) : (
                        <ArrowRight
                          size={15}
                          className="group-hover/cta:translate-x-1 transition-transform"
                        />
                      )}
                    </button>
                  )}

                  {matchedOfferOutlet?.contact.whatsapp_enabled && (
                    <a
                      href={buildWhatsAppLink(
                        matchedOfferOutlet.contact.whatsapp_number,
                        isAr
                          ? `مرحباً، أود الاستفسار عن عرض: ${currentOffer.titleAr}`
                          : `Hello, I would like to inquire about the offer: ${currentOffer.titleEn}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer border border-emerald-400/40"
                    >
                      <MessageSquare size={15} />
                      <span>{isAr ? 'حجز عبر واتساب' : 'WhatsApp Reserve'}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Slider Navigation Arrows */}
              {activeOffers.length > 1 && (
                <>
                  <button
                    onClick={handlePrevOffer}
                    className="absolute top-1/2 -translate-y-1/2 left-3 sm:left-4 z-20 w-10 h-10 rounded-full bg-stone-950/60 hover:bg-stone-900/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer opacity-80 hover:opacity-100"
                    aria-label="Previous Offer"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    onClick={handleNextOffer}
                    className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 z-20 w-10 h-10 rounded-full bg-stone-950/60 hover:bg-stone-900/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer opacity-80 hover:opacity-100"
                    aria-label="Next Offer"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Pagination Dots */}
              {activeOffers.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                  {activeOffers.map((offer, idx) => (
                    <button
                      key={offer.id}
                      onClick={() => setCurrentOfferIndex(idx)}
                      className={`transition-all h-1.5 rounded-full cursor-pointer ${
                        idx === currentOfferIndex ? 'w-6 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/70'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. MAIN F&B OUTLETS SECTION */}
        <div className="space-y-6">
          {/* Header & Filter Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold uppercase tracking-wider">
                <UtensilsCrossed size={14} />
                <span>{isAr ? 'منافذ الضيافة' : 'Hotel Outlets'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 mt-1">
                {isAr ? 'منافذ الطعام والشراب بالفندق' : 'Main Dining & Beverage Outlets'}
              </h2>
              <p className="text-stone-500 text-xs mt-1">
                {isAr
                  ? 'اختر المنفذ للاطلاع على القائمة الكاملة، مواعيد العمل، والحجز أو الطلب المباشر.'
                  : 'Select an outlet to explore its complete menu, operating hours, and ordering options.'}
              </p>
            </div>

            {/* Simple Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {filterTabs.map((tab) => {
                const isActive = filterType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
                    }`}
                  >
                    {isAr ? tab.label_ar : tab.label_en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outlets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutlets.map((outlet, index) => {
              const status = getOperatingStatus(outlet.operating_info, language);
              const isRoomService = outlet.outlet_type === 'room_service';
              const isMiniBar = outlet.outlet_type === 'mini_bar';
              const isShisha = outlet.outlet_type === 'shisha';
              const isCafe = outlet.outlet_type === 'cafe';

              const waUrl = buildWhatsAppLink(
                outlet.contact.whatsapp_number,
                isAr ? outlet.contact.default_message_ar : outlet.contact.default_message_en
              );

              // Distinctive Badge Styling
              const getCategoryBadge = () => {
                if (isRoomService) {
                  return {
                    icon: <BedDouble size={13} />,
                    label: isAr ? 'خدمة الغرف 24 ساعة' : '24/7 Room Service',
                    classes: 'bg-blue-50 text-blue-800 border-blue-200',
                  };
                }
                if (isMiniBar) {
                  return {
                    icon: <Refrigerator size={13} />,
                    label: isAr ? 'الميني بار وثلاجة الغرفة' : 'In-Room Mini Bar',
                    classes: 'bg-teal-50 text-teal-800 border-teal-200',
                  };
                }
                if (isShisha) {
                  return {
                    icon: <Flame size={13} />,
                    label: isAr ? 'شيشة وتراس خارجي' : 'Shisha & Terrace',
                    classes: 'bg-purple-50 text-purple-800 border-purple-200',
                  };
                }
                if (isCafe) {
                  return {
                    icon: <Coffee size={13} />,
                    label: isAr ? 'قهوة مختصة ومعجنات' : 'Specialty Café',
                    classes: 'bg-amber-50 text-amber-800 border-amber-200',
                  };
                }
                return {
                  icon: <UtensilsCrossed size={13} />,
                  label: isAr ? 'مطعم وبوفيه دولي' : 'Restaurant & Buffet',
                  classes: 'bg-stone-100 text-stone-800 border-stone-200',
                };
              };

              const badge = getCategoryBadge();

              return (
                <div
                  key={outlet.id}
                  className="bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Outlet Real Photography Image Banner */}
                  <div className="relative h-48 sm:h-52 overflow-hidden bg-stone-100">
                    <img
                      src={outlet.hero_image}
                      alt={isAr ? outlet.name_ar : outlet.name_en}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient for badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                    {/* Top Status & Sequence */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                      {/* Sequence number */}
                      <span className="bg-stone-900/80 backdrop-blur-md text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg border border-white/20">
                        0{index + 1}
                      </span>

                      {/* Status indicator */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5 ${
                          status.isOpen
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-900/90 text-stone-200 border border-white/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            status.isOpen ? 'bg-white animate-pulse' : 'bg-rose-400'
                          }`}
                        />
                        <span>{isAr ? status.badge_ar : status.badge_en}</span>
                      </span>
                    </div>

                    {/* Bottom Category Badge inside Image */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-md flex items-center gap-1.5 shadow-xs ${badge.classes}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      {outlet.menu_categories.length > 0 && (
                        <span className="text-[10px] font-medium text-white/90 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20">
                          {outlet.menu_categories.length}{' '}
                          {isAr ? 'أقسام بالقائمة' : 'Categories'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold font-serif text-stone-900 group-hover:text-amber-800 transition-colors">
                          {isAr ? outlet.name_ar : outlet.name_en}
                        </h3>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                        {isAr ? outlet.short_description_ar : outlet.short_description_en}
                      </p>

                      {/* Info Chips */}
                      <div className="pt-2 space-y-1.5 text-xs text-stone-500">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-stone-400 shrink-0" />
                          <span className="truncate">
                            {isAr
                              ? outlet.operating_info.opening_hours_ar
                              : outlet.operating_info.opening_hours_en}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-stone-400 shrink-0" />
                          <span className="truncate">
                            {isAr ? outlet.location.floor_ar : outlet.location.floor_en}
                          </span>
                        </div>
                      </div>

                      {/* Featured Special for this outlet if available */}
                      {outlet.featured_offer && (
                        <div className="mt-2.5 bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-xl flex items-center justify-between text-xs text-amber-900">
                          <div className="flex items-center gap-1.5">
                            <Tag size={12} className="text-amber-700 shrink-0" />
                            <span className="font-semibold truncate">
                              {isAr
                                ? outlet.featured_offer.title_ar
                                : outlet.featured_offer.title_en}
                            </span>
                          </div>
                          <span className="font-bold text-amber-950 shrink-0">
                            {outlet.featured_offer.offer_price} {currency}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions Strip */}
                    <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
                      {/* Primary CTA: View Outlet & Menu */}
                      <button
                        onClick={() => onSelectOutlet(outlet)}
                        className={`flex-1 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group/btn ${
                          isRoomService
                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                            : isMiniBar
                            ? 'bg-stone-900 hover:bg-stone-800 text-white'
                            : 'bg-stone-900 hover:bg-stone-800 text-white'
                        }`}
                      >
                        <span>
                          {isRoomService
                            ? isAr
                              ? 'طلب خدمة الغرف والقائمة'
                              : 'Order Room Service'
                            : isMiniBar
                            ? isAr
                              ? 'محتويات وطلب الميني بار'
                              : 'View Mini Bar & Refill'
                            : isAr
                            ? 'دخول المنفذ والقائمة'
                            : 'View Outlet & Menu'}
                        </span>
                        {isAr ? (
                          <ArrowLeft
                            size={13}
                            className="group-hover/btn:-translate-x-1 transition-transform"
                          />
                        ) : (
                          <ArrowRight
                            size={13}
                            className="group-hover/btn:translate-x-1 transition-transform"
                          />
                        )}
                      </button>

                      {/* Quick WhatsApp button with data-driven outlet number */}
                      {outlet.contact.whatsapp_enabled && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors shrink-0 border border-emerald-200"
                          title={isAr ? 'محادثة واتساب مباشرة' : 'Direct WhatsApp'}
                        >
                          <MessageSquare size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
