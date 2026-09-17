import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Clock,
  MapPin,
  MessageSquare,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Phone,
  ShieldCheck,
  Dumbbell,
  Waves,
  Flame,
  Droplets,
  Heart,
  Info,
  X,
  Footprints,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { WellnessService, WellnessBookingRequest } from '../../types/department';
import { Language, HotelOffer } from '../../types/hotel';
import {
  WellnessServiceItem,
  WellnessOffer,
} from '../../types/wellness';
import {
  DEFAULT_WELLNESS_CATEGORIES,
  DEFAULT_WELLNESS_SERVICES,
  DEFAULT_WELLNESS_OFFERS,
} from '../../data/wellnessHubData';
import { WellnessBookingModal } from './WellnessBookingModal';
import { buildEncodedWhatsAppUrl } from '../../utils/whatsappMessageBuilder';

interface WellnessHubPageProps {
  hotelId?: string;
  hotelNameEn?: string;
  hotelNameAr?: string;
  services?: WellnessService[];
  currency?: string;
  language: Language;
  roomNumber?: string;
  onSelectOffer?: (offer: HotelOffer) => void;
  onBackToHome?: () => void;
}

export const WellnessHubPage: React.FC<WellnessHubPageProps> = ({
  hotelId,
  hotelNameEn,
  hotelNameAr,
  currency = 'SAR',
  language,
  roomNumber = '',
  onSelectOffer: _onSelectOffer,
  onBackToHome,
}) => {
  const isAr = language === 'ar';

  // Navigation State: Category first!
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<any | null>(null);
  const [selectedFacilityForInfo, setSelectedFacilityForInfo] = useState<WellnessServiceItem | null>(null);
  const [bookingToast, setBookingToast] = useState<string | null>(null);

  // Offers Slider Ref
  const offersSliderRef = useRef<HTMLDivElement>(null);

  const categories = DEFAULT_WELLNESS_CATEGORIES.filter((c) => c.active);
  const allServices = DEFAULT_WELLNESS_SERVICES.filter((s) => s.active);
  const offers = DEFAULT_WELLNESS_OFFERS.filter((o) => o.active);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const categoryServices = allServices.filter(
    (s) => s.categoryId === selectedCategoryId
  );

  const scrollOffers = (direction: 'left' | 'right') => {
    if (offersSliderRef.current) {
      const scrollAmount = isAr
        ? direction === 'left' ? 360 : -360
        : direction === 'left' ? -360 : 360;
      offersSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHub = () => {
    setSelectedCategoryId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOfferClick = (offer: WellnessOffer) => {
    if (offer.ctaAction === 'book') {
      const targetService = allServices.find((s) => s.id === offer.targetServiceId);
      if (targetService) {
        setSelectedServiceForBooking({
          ...targetService,
          price: offer.price ?? targetService.price,
          oldPrice: offer.oldPrice ?? targetService.oldPrice,
          offer_price: offer.price,
          nameEn: `${offer.titleEn} (${targetService.nameEn})`,
          nameAr: `${offer.titleAr} (${targetService.nameAr})`,
        });
      } else {
        setSelectedServiceForBooking({
          id: offer.id,
          nameEn: offer.titleEn,
          nameAr: offer.titleAr,
          price: offer.price ?? 0,
          oldPrice: offer.oldPrice,
          durationMinutes: 60,
          whatsappNumber: '+966555072806',
        });
      }
    } else {
      handleCategorySelect(offer.categoryId);
    }
  };

  const handleDirectWhatsApp = (whatsappNumber?: string, prefillEn?: string, prefillAr?: string) => {
    const targetWa = whatsappNumber || '+966555072806';
    const text = isAr
      ? (prefillAr || 'مرحباً بمركز السبا والعافية في سويس فلورا، أود الاستفسار عن المواعيد والخدمات المتاحة.')
      : (prefillEn || 'Hello Swiss Flora Wellness & Spa, I would like to inquire about appointments and facilities.');
    const url = buildEncodedWhatsAppUrl(targetWa, text);
    window.open(url, '_blank');
  };

  const handleBookingSuccess = (booking: WellnessBookingRequest) => {
    setBookingToast(
      isAr
        ? `تم تأكيد حجز ${booking.service_name_ar} برقم مرجع: ${booking.id}`
        : `Booking confirmed for ${booking.service_name_en} (${booking.id})`
    );
    setTimeout(() => setBookingToast(null), 5000);
  };

  // Helper for rendering category icons
  const renderCategoryIcon = (iconName: string, className: string = 'w-6 h-6') => {
    switch (iconName) {
      case 'massage':
        return <Sparkles className={className} />;
      case 'manicure':
        return <Footprints className={className} />;
      case 'pool':
        return <Waves className={className} />;
      case 'jacuzzi':
        return <Droplets className={className} />;
      case 'gym':
        return <Dumbbell className={className} />;
      case 'sauna':
        return <Flame className={className} />;
      case 'spa':
        return <Heart className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-900" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {bookingToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 text-emerald-100 px-5 py-3 rounded-2xl shadow-2xl border border-emerald-700/50 flex items-center gap-3 text-xs font-semibold animate-fade-in max-w-md w-[92%]">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="flex-1">{bookingToast}</span>
          <button
            onClick={() => setBookingToast(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      <div className="bg-stone-900 text-stone-200 px-4 sm:px-6 py-3.5 sticky top-0 z-40 shadow-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {selectedCategory ? (
            <button
              onClick={handleBackToHub}
              className="flex items-center gap-2 text-xs font-medium text-amber-200 hover:text-white transition-colors cursor-pointer bg-stone-800/80 hover:bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700"
            >
              {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              <span>{isAr ? 'رجوع إلى السبا والعافية' : 'Back to Wellness & Spa'}</span>
            </button>
          ) : (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-2 text-xs font-medium text-stone-400 hover:text-white transition-colors cursor-pointer bg-stone-800/80 hover:bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700"
            >
              {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              <span>{isAr ? 'الرجوع إلى الرئيسية' : 'Back to Home'}</span>
            </button>
          )}

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-stone-800 text-stone-300 px-2.5 py-1 rounded-full border border-stone-700">
              <Clock size={12} className="text-amber-400" />
              <span>{isAr ? '07:00 ص - 11:00 م يومياً' : '07:00 - 23:00 Daily'}</span>
            </span>

            <button
              onClick={() => handleDirectWhatsApp('+966555072806')}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium transition-all shadow-sm cursor-pointer"
            >
              <MessageSquare size={13} />
              <span>{isAr ? 'واتساب السبا' : 'Spa Desk'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ROOT VIEW: HERO -> OFFERS SLIDER -> EXPLORE WELLNESS CATEGORIES */}
      {/* ========================================================================= */}
      {!selectedCategory ? (
        <div className="space-y-10">
          {/* WELLNESS & SPA HERO */}
          <div className="relative bg-stone-900 text-white overflow-hidden py-14 sm:py-20 border-b border-stone-800">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 transition-transform duration-1000"
              style={{
                backgroundImage: `url('https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-stone-900/80" />

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                <Sparkles size={13} />
                <span>{isAr ? 'واحة العافية والاسترخاء الفاخرة' : 'Luxury Wellness & Thermal Sanctuary'}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
                {isAr ? 'السبا والنادي الصحي' : 'Wellness & Spa'}
              </h1>

              <p className="text-sm sm:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed font-light">
                {isAr
                  ? 'جدد حيوية حواسك بتجارب استشفائية فاخرة، جلسات تدليك متخصصة، مرافق حرارية ومائية، ونادٍ رياضي متكامل بإشراف مدربين معتمدين.'
                  : 'Rejuvenate your senses with bespoke massage rituals, thermal Finnish saunas, climate-controlled waters, and state-of-the-art fitness equipment.'}
              </p>

              {/* Status pills */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-xs text-stone-300">
                <span className="flex items-center gap-1.5 bg-stone-800/80 backdrop-blur-sm border border-stone-700/80 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{isAr ? 'مفتوح الآن للنزلاء' : 'Open Now for Residents'}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-stone-800/80 backdrop-blur-sm border border-stone-700/80 px-3 py-1.5 rounded-full">
                  <MapPin size={13} className="text-amber-400" />
                  <span>{isAr ? 'الطابق الثالث - طابق العافية' : '3rd Floor - Wellness Deck'}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-stone-800/80 backdrop-blur-sm border border-stone-700/80 px-3 py-1.5 rounded-full">
                  <Phone size={13} className="text-amber-400" />
                  <span>{isAr ? 'تحويلة 330 / 332' : 'Ext. 330 / 332'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. FEATURED WELLNESS OFFERS SLIDER (MANDATORY: BEFORE CATEGORIES) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  <Sparkles size={14} />
                  <span>{isAr ? 'عروض وباقات استثنائية' : 'Signature Spa Promotions'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-1">
                  {isAr ? 'عروض العافية والسبا الحصرية' : 'Featured Wellness Offers'}
                </h2>
              </div>

              {/* Slider Arrow Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollOffers('left')}
                  className="w-9 h-9 rounded-full bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 flex items-center justify-center shadow-sm transition-all cursor-pointer"
                  aria-label="Previous offers"
                >
                  {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
                <button
                  onClick={() => scrollOffers('right')}
                  className="w-9 h-9 rounded-full bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 flex items-center justify-center shadow-sm transition-all cursor-pointer"
                  aria-label="Next offers"
                >
                  {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>
            </div>

            {/* Slider Container */}
            <div
              ref={offersSliderRef}
              className="flex gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar snap-x snap-mandatory"
            >
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="min-w-[290px] sm:min-w-[340px] md:min-w-[370px] max-w-[370px] bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-md hover:shadow-lg transition-all flex flex-col snap-start shrink-0 group"
                >
                  <div className="relative h-44 overflow-hidden bg-stone-900">
                    <img
                      src={offer.image}
                      alt={isAr ? offer.titleAr : offer.titleEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/30" />

                    <div className="absolute top-3 start-3">
                      <span className="bg-amber-600 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-md">
                        {isAr ? offer.badgeAr : offer.badgeEn}
                      </span>
                    </div>

                    <div className="absolute bottom-3 start-3 end-3 flex items-end justify-between text-white">
                      <div>
                        <span className="text-[10px] text-amber-200 font-medium block">
                          {isAr ? offer.validityAr : offer.validityEn}
                        </span>
                      </div>
                      {offer.price && (
                        <div className="text-end">
                          <span className="text-lg font-bold text-amber-300">
                            {offer.price} {currency}
                          </span>
                          {offer.oldPrice && (
                            <span className="text-xs text-stone-300 line-through block font-light">
                              {offer.oldPrice} {currency}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-serif font-bold text-base text-stone-900 group-hover:text-amber-800 transition-colors">
                        {isAr ? offer.titleAr : offer.titleEn}
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed line-clamp-2">
                        {isAr ? offer.descriptionAr : offer.descriptionEn}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOfferClick(offer)}
                        className="flex-1 bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles size={13} />
                        <span>{isAr ? offer.ctaLabelAr : offer.ctaLabelEn}</span>
                      </button>

                      <button
                        onClick={() =>
                          handleDirectWhatsApp(
                            '+966555072806',
                            `Hello, I would like to inquire about the offer: ${offer.titleEn}`,
                            `مرحباً، أود الاستفسار عن عرض: ${offer.titleAr}`
                          )
                        }
                        className="p-2 rounded-xl bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 transition-colors cursor-pointer border border-stone-200"
                        title={isAr ? 'استفسار عبر واتساب' : 'WhatsApp Inquiry'}
                      >
                        <MessageSquare size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. EXPLORE WELLNESS CATEGORIES (CATEGORY CARDS GRID) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-widest">
                <SlidersHorizontal size={13} />
                <span>{isAr ? 'أقسام ومرافق الاستشفاء' : 'Wellness Directory'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                {isAr ? 'استكشف أقسام ومرافق العافية' : 'Explore Wellness Categories'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {isAr
                  ? 'اختر القسم المطلوب لعرض الجلسات والعلاجات التخصصية، أو الاطلاع على مواعيد وقواعد الدخول للمرافق'
                  : 'Select a category to view specialized treatments, thermal suites, and fitness facilities.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className="group bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1"
                >
                  <div className="relative h-52 overflow-hidden bg-stone-900">
                    <img
                      src={category.image}
                      alt={isAr ? category.nameAr : category.nameEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent" />

                    {/* Category Icon Badge */}
                    <div className="absolute top-4 start-4 w-11 h-11 rounded-xl bg-stone-900/80 backdrop-blur-md border border-white/20 text-amber-300 flex items-center justify-center shadow-lg">
                      {renderCategoryIcon(category.icon, 'w-5 h-5')}
                    </div>

                    {/* Service Count Tag */}
                    <div className="absolute top-4 end-4">
                      <span className="bg-white/90 backdrop-blur-md text-stone-800 font-semibold text-[11px] px-3 py-1 rounded-full border border-white/40 shadow-sm">
                        {isAr ? category.serviceCountLabelAr : category.serviceCountLabelEn}
                      </span>
                    </div>

                    {/* Category Title on image bottom */}
                    <div className="absolute bottom-3 start-4 end-4">
                      <h3 className="text-xl font-serif font-bold text-white group-hover:text-amber-200 transition-colors">
                        {isAr ? category.nameAr : category.nameEn}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {isAr ? category.descriptionAr : category.descriptionEn}
                    </p>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-amber-900 group-hover:text-amber-700">
                      <span>{isAr ? 'عرض الخدمات والمرافق' : 'Explore Category'}</span>
                      <div className="w-7 h-7 rounded-full bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                        {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. CATEGORY-SPECIFIC SERVICES VIEW */
        /* ========================================================================= */
        <div className="space-y-8 animate-fade-in">
          {/* CATEGORY HERO BANNER */}
          <div className="relative bg-stone-900 text-white overflow-hidden py-12 sm:py-16 border-b border-stone-800">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
              style={{ backgroundImage: `url('${selectedCategory.image}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-stone-900/80" />

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                    {renderCategoryIcon(selectedCategory.icon, 'w-4 h-4')}
                    <span>{isAr ? selectedCategory.serviceCountLabelAr : selectedCategory.serviceCountLabelEn}</span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
                    {isAr ? selectedCategory.nameAr : selectedCategory.nameEn}
                  </h1>

                  <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed font-light">
                    {isAr ? selectedCategory.descriptionAr : selectedCategory.descriptionEn}
                  </p>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={() =>
                      handleDirectWhatsApp(
                        selectedCategory.whatsappNumber,
                        `Hello, I would like to inquire about ${selectedCategory.nameEn}`,
                        `مرحباً، أود الاستفسار عن خدمات وقسم: ${selectedCategory.nameAr}`
                      )
                    }
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    <MessageSquare size={14} />
                    <span>{isAr ? 'واتساب هذا القسم' : 'WhatsApp Desk'}</span>
                  </button>

                  <button
                    onClick={handleBackToHub}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-stone-700 cursor-pointer transition-all"
                  >
                    {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                    <span>{isAr ? 'كافة الأقسام' : 'All Categories'}</span>
                  </button>
                </div>
              </div>

              {/* QUICK CATEGORY SWITCHER PILLS */}
              <div className="mt-8 pt-6 border-t border-stone-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-[11px] text-stone-400 font-semibold shrink-0 uppercase tracking-wider me-1">
                  {isAr ? 'الانتقال السريع:' : 'Jump to:'}
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      cat.id === selectedCategoryId
                        ? 'bg-amber-400 text-stone-950 font-bold shadow-md'
                        : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700/60'
                    }`}
                  >
                    {renderCategoryIcon(cat.icon, 'w-3 h-3')}
                    <span>{isAr ? cat.nameAr : cat.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SERVICES & FACILITIES LIST INSIDE CATEGORY */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  {isAr ? `الخدمات والمرافق في ${selectedCategory.nameAr}` : `Services & Offerings in ${selectedCategory.nameEn}`}
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  {isAr
                    ? 'اختر الخدمة لحجز موعد أو استعراض التفاصيل الكاملة'
                    : 'Select a treatment to book an appointment or view detailed facility info.'}
                </p>
              </div>

              <span className="text-xs bg-stone-200/80 text-stone-700 px-3 py-1 rounded-full font-semibold">
                {categoryServices.length} {isAr ? 'عنصر' : 'Items'}
              </span>
            </div>

            {/* SERVICES GRID */}
            <div className="space-y-6">
              {categoryServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row"
                >
                  {/* Photo Column */}
                  <div className="md:w-80 h-52 md:h-auto relative overflow-hidden bg-stone-900 shrink-0">
                    <img
                      src={service.image}
                      alt={isAr ? service.nameAr : service.nameEn}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />

                    {/* Booking Mode Badge */}
                    <div className="absolute top-3 start-3">
                      {service.bookingMode === 'BOOKING_REQUIRED' && (
                        <span className="bg-amber-900/90 backdrop-blur-sm text-amber-100 font-semibold text-[10px] px-2.5 py-1 rounded-full border border-amber-700">
                          {isAr ? 'حجز مسبق مطلوب' : 'Appointment Required'}
                        </span>
                      )}
                      {service.bookingMode === 'INFORMATION_ONLY' && (
                        <span className="bg-emerald-900/90 backdrop-blur-sm text-emerald-100 font-semibold text-[10px] px-2.5 py-1 rounded-full border border-emerald-700">
                          {isAr ? 'مرفق مفتوح للنزلاء' : 'Facility Access'}
                        </span>
                      )}
                      {service.bookingMode === 'REQUEST_ACCESS' && (
                        <span className="bg-sky-900/90 backdrop-blur-sm text-sky-100 font-semibold text-[10px] px-2.5 py-1 rounded-full border border-sky-700">
                          {isAr ? 'طلب دخول مسبق' : 'Access Request'}
                        </span>
                      )}
                    </div>

                    {/* Duration badge if applicable */}
                    {service.durationMinutes && (
                      <div className="absolute bottom-3 start-3">
                        <span className="bg-black/70 backdrop-blur-sm text-white font-medium text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Clock size={12} className="text-amber-400" />
                          <span>{service.durationMinutes} {isAr ? 'دقيقة' : 'Mins'}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-serif font-bold text-stone-900">
                            {isAr ? service.nameAr : service.nameEn}
                          </h3>
                          {service.locationAr && (
                            <span className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} className="text-amber-800 shrink-0" />
                              <span>{isAr ? service.locationAr : service.locationEn}</span>
                            </span>
                          )}
                        </div>

                        {/* Price Display */}
                        <div className="text-end shrink-0">
                          {service.complimentary || service.price === 0 ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-lg block">
                              {isAr ? 'مجاني للنزلاء' : 'Complimentary'}
                            </span>
                          ) : (
                            <div>
                              <span className="text-lg font-bold text-amber-900 font-serif">
                                {service.price} {currency}
                              </span>
                              {service.oldPrice && (
                                <span className="block text-xs text-stone-400 line-through">
                                  {service.oldPrice} {currency}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">
                        {isAr ? service.descriptionAr : service.descriptionEn}
                      </p>

                      {/* Extra info pills */}
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-stone-600">
                        {service.openingHoursAr && (
                          <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                            <Clock size={11} className="text-stone-500" />
                            <span>{isAr ? service.openingHoursAr : service.openingHoursEn}</span>
                          </span>
                        )}
                        {service.temperatureAr && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                            <Flame size={11} className="text-amber-700" />
                            <span>{isAr ? service.temperatureAr : service.temperatureEn}</span>
                          </span>
                        )}
                        {service.guestEligibilityAr && (
                          <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                            <ShieldCheck size={11} className="text-stone-500" />
                            <span>{isAr ? service.guestEligibilityAr : service.guestEligibilityEn}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons based on Booking Mode */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {service.bookingMode === 'BOOKING_REQUIRED' && (
                          <button
                            onClick={() => setSelectedServiceForBooking(service)}
                            className="bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                          >
                            <Calendar size={14} />
                            <span>{isAr ? 'حجز موعد الجلسة' : 'Book Appointment'}</span>
                          </button>
                        )}

                        {service.bookingMode === 'REQUEST_ACCESS' && (
                          <button
                            onClick={() =>
                              handleDirectWhatsApp(
                                service.whatsappNumber,
                                `Hello, I would like to request access for: ${service.nameEn} (Room: ${roomNumber})`,
                                `مرحباً، أود طلب استخدام وتجهيز: ${service.nameAr} (الغرفة: ${roomNumber})`
                              )
                            }
                            className="bg-sky-900 hover:bg-sky-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                          >
                            <MessageSquare size={14} />
                            <span>{isAr ? 'طلب الدخول عبر واتساب' : 'Request Access via WhatsApp'}</span>
                          </button>
                        )}

                        {(service.rulesAr || service.childrenPolicyAr) && (
                          <button
                            onClick={() => setSelectedFacilityForInfo(service)}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-stone-300 flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Info size={13} />
                            <span>{isAr ? 'إرشادات وقواعد المرفق' : 'Facility Guidelines'}</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          handleDirectWhatsApp(
                            service.whatsappNumber,
                            `Hello, I have an inquiry about ${service.nameEn}.`,
                            `مرحباً، لدي استفسار بخصوص خدمة: ${service.nameAr}.`
                          )
                        }
                        className="text-stone-500 hover:text-emerald-700 text-xs font-medium flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        <MessageSquare size={13} className="text-emerald-600" />
                        <span>{isAr ? 'استفسار سريع' : 'Inquire'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FACILITY GUIDELINES & INFORMATION MODAL */}
      {/* ========================================================================= */}
      {selectedFacilityForInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif">
                    {isAr ? selectedFacilityForInfo.nameAr : selectedFacilityForInfo.nameEn}
                  </h3>
                  <span className="text-[11px] text-stone-400">
                    {isAr ? 'إرشادات السلامة وقواعد الاستخدام' : 'Safety Guidelines & Facility Etiquette'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedFacilityForInfo(null)}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Image & Quick Info */}
              <div className="relative h-36 rounded-xl overflow-hidden bg-stone-900">
                <img
                  src={selectedFacilityForInfo.image}
                  alt={isAr ? selectedFacilityForInfo.nameAr : selectedFacilityForInfo.nameEn}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 start-3 end-3 text-white flex items-center justify-between">
                  <span className="font-semibold text-amber-200">
                    {isAr ? selectedFacilityForInfo.openingHoursAr : selectedFacilityForInfo.openingHoursEn}
                  </span>
                  <span className="text-[11px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded">
                    {isAr ? selectedFacilityForInfo.locationAr : selectedFacilityForInfo.locationEn}
                  </span>
                </div>
              </div>

              {/* Guest Eligibility */}
              {selectedFacilityForInfo.guestEligibilityAr && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-950">
                  <span className="font-bold block mb-0.5">
                    {isAr ? 'أهلية الدخول والاستخدام:' : 'Access & Eligibility:'}
                  </span>
                  <p className="text-[11px]">
                    {isAr ? selectedFacilityForInfo.guestEligibilityAr : selectedFacilityForInfo.guestEligibilityEn}
                  </p>
                </div>
              )}

              {/* Rules List */}
              {selectedFacilityForInfo.rulesAr && selectedFacilityForInfo.rulesAr.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-amber-800" />
                    <span>{isAr ? 'قواعد وإرشادات السلامة:' : 'Safety & Cleanliness Rules:'}</span>
                  </h4>
                  <ul className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    {(isAr ? selectedFacilityForInfo.rulesAr : selectedFacilityForInfo.rulesEn)?.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-stone-700 text-[11px] leading-relaxed">
                        <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Children Policy */}
              {selectedFacilityForInfo.childrenPolicyAr && (
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl text-stone-700 space-y-1">
                  <span className="font-bold text-stone-900 block text-[11px]">
                    {isAr ? 'سياسة الأطفال والمرافقين:' : 'Children & Guardians Policy:'}
                  </span>
                  <p className="text-[11px]">
                    {isAr ? selectedFacilityForInfo.childrenPolicyAr : selectedFacilityForInfo.childrenPolicyEn}
                  </p>
                </div>
              )}

              {/* Equipment summary if gym */}
              {selectedFacilityForInfo.equipmentSummaryAr && (
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl text-stone-700 space-y-1">
                  <span className="font-bold text-stone-900 block text-[11px]">
                    {isAr ? 'المعدات والأجهزة المتوفرة:' : 'Equipment Summary:'}
                  </span>
                  <p className="text-[11px]">
                    {isAr ? selectedFacilityForInfo.equipmentSummaryAr : selectedFacilityForInfo.equipmentSummaryEn}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() =>
                  handleDirectWhatsApp(
                    selectedFacilityForInfo.whatsappNumber,
                    `Hello, I would like to inquire about ${selectedFacilityForInfo.nameEn}.`,
                    `مرحباً، أود الاستفسار عن ${selectedFacilityForInfo.nameAr}.`
                  )
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <MessageSquare size={14} />
                <span>{isAr ? 'مراسلة النادي الصحي عبر واتساب' : 'WhatsApp Health Club'}</span>
              </button>

              <button
                onClick={() => setSelectedFacilityForInfo(null)}
                className="bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. WELLNESS BOOKING MODAL (APPOINTMENTS) */}
      {/* ========================================================================= */}
      {selectedServiceForBooking && (
        <WellnessBookingModal
          service={selectedServiceForBooking}
          hotelId={hotelId}
          hotelNameEn={hotelNameEn}
          hotelNameAr={hotelNameAr}
          currency={currency}
          language={language}
          roomNumber={roomNumber}
          onClose={() => setSelectedServiceForBooking(null)}
          onBookingSuccess={(booking) => {
            handleBookingSuccess(booking);
            setSelectedServiceForBooking(null);
          }}
        />
      )}
    </div>
  );
};
