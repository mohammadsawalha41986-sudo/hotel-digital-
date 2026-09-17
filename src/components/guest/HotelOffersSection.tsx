import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Calendar,
  MessageCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Coffee,
  Bed,
  UtensilsCrossed,
  Sparkle,
  CheckCircle2,
  Gift,
  Flame,
} from 'lucide-react';
import { HotelOffer, Language, Hotel } from '../../types/hotel';

interface HotelOffersSectionProps {
  hotel: Hotel;
  offers: HotelOffer[];
  language: Language;
  roomNumber?: string;
  onViewAllOffers: () => void;
}

// Fallback curated luxury offers if hotel offers are empty or insufficient
const DEFAULT_SLIDES: HotelOffer[] = [
  {
    id: 'slide-national-day',
    hotel_id: 'default',
    title_en: 'Saudi National Day Staycation',
    title_ar: 'إقامة اليوم الوطني السعودي',
    description_en: 'Includes daily gourmet breakfast buffet, signature welcome amenities, and late checkout until 4:00 PM.',
    description_ar: 'تشمل بوفيه إفطار دولي فاخر، ضيافة ترحيبية خاصة، وتأخير المغادرة حتى الرابعة عصراً.',
    department: 'seasonal',
    original_price: 610,
    offer_price: 396,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'SEASONAL OFFER',
    badge_ar: 'عرض موسمي',
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=85',
    terms_en: 'Special celebratory staycation package with complimentary breakfast and late checkout.',
    terms_ar: 'باقة إقامة احتفالية تشمل بوفيه الإفطار وتأخير تسجيل المغادرة.',
    target_action: 'book_room',
    is_active: true,
  },
  {
    id: 'slide-stay',
    hotel_id: 'default',
    title_en: 'Royal Stay Privilege',
    title_ar: 'مزايا الإقامة الملكية',
    description_en: 'Enjoy daily international breakfast buffet at Flora Restaurant, high-speed Wi-Fi, and wellness club access.',
    description_ar: 'بوفيه إفطار يومي فاخر في مطعم فلورا، إنترنت عالي السرعة، ودخول مجاني للمسبح والنادي.',
    department: 'rooms',
    original_price: 600,
    offer_price: 495,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'HOTEL STAY',
    badge_ar: 'إقامة فندقية',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/cb2a4062-6175-46e4-8c4c-c65714f26fc8/_22A7761.JPG',
    terms_en: 'Valid on direct reservations. Includes Flora Restaurant breakfast buffet.',
    terms_ar: 'صالح للحجوزات المباشرة. يشمل بوفيه الإفطار بمطعم فلورا.',
    target_action: 'book_room',
    is_active: true,
  },
  {
    id: 'slide-dining',
    hotel_id: 'default',
    title_en: 'Gourmet Half-Board Experience',
    title_ar: 'تجربة نصف الإقامة الفاخرة',
    description_en: 'An international breakfast buffet and a multi-course dinner with live chef cooking stations.',
    description_ar: 'بوفيه إفطار عالمي غني وعشاء راقٍ من عدة أطباق مع محطات طهي حية بمطعم فلورا.',
    department: 'restaurant',
    original_price: 950,
    offer_price: 780,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'DINING',
    badge_ar: 'تجارب الطهي',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/e62c936d-a986-4fec-90fa-618652baab0b/chef.jpg',
    terms_en: 'Dinner served daily from 6:30 PM to 11:30 PM at Flora Restaurant.',
    terms_ar: 'يقدم العشاء يومياً من 6:30 مساءً حتى 11:30 مساءً بمطعم فلورا.',
    target_action: 'reserve_dining',
    is_active: true,
  },
  {
    id: 'slide-spa',
    hotel_id: 'default',
    title_en: 'Flora Signature Spa Ritual',
    title_ar: 'طقوس فلورا سبا الاسترخائية',
    description_en: 'A 60-minute tailored relaxation massage with complimentary access to thermal sauna and heated pool.',
    description_ar: 'جلسة تدليك مخصصة لمدة 60 دقيقة مع دخول مجاني للساونا والبخار ومسبح فلورا الدافئ.',
    department: 'health_club',
    original_price: 450,
    offer_price: 320,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'SPA & WELLNESS',
    badge_ar: 'سبا واستجمام',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg',
    terms_en: 'Advance reservation recommended via Flora Spa desk or WhatsApp.',
    terms_ar: 'يلزم الحجز المسبق عبر كونسيرج السبا أو واتساب.',
    target_action: 'book_spa',
    is_active: true,
  },
  {
    id: 'slide-cafe',
    hotel_id: 'default',
    title_en: 'Artisanal Afternoon Tea',
    title_ar: 'شاي بعد الظهيرة الفاخر',
    description_en: 'Specialty single-origin coffee and artisanal tea served with French pastries and Swiss chocolates.',
    description_ar: 'قهوة مختصة وشاي فاخر مع تشكيلة من المعجنات الفرنسية والشوكولاتة السويسرية.',
    department: 'cafe',
    original_price: 140,
    offer_price: 95,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'CAFÉ',
    badge_ar: 'المقهى واللاونج',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/d047d924-8978-4e1a-819e-8e0062776e71/downloadc.png',
    terms_en: 'Served daily from 4:00 PM to 7:00 PM at Swiss Café Lounge.',
    terms_ar: 'يقدم يومياً من 4:00 عصراً حتى 7:00 مساءً بسويس كافيه.',
    target_action: 'request_service',
    is_active: true,
  },
];

const AUTOPLAY_INTERVAL = 5500; // 5.5 seconds per slide

export const HotelOffersSection: React.FC<HotelOffersSectionProps> = ({
  hotel,
  offers,
  language,
  roomNumber,
  onViewAllOffers,
}) => {
  const isAr = language === 'ar';
  const NextIcon = isAr ? ArrowLeft : ArrowRight;
  const PrevIcon = isAr ? ArrowRight : ArrowLeft;

  // Active slides (prefer hotel offers if active, otherwise fallback to curated luxury slides)
  const slides = offers && offers.filter((o) => o.is_active).length > 0
    ? offers.filter((o) => o.is_active)
    : DEFAULT_SLIDES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<HotelOffer | null>(null);
  const [copiedPromo, setCopiedPromo] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Current active slide
  const currentSlide = slides[currentIndex] || slides[0] || DEFAULT_SLIDES[0];

  // Advance to next slide
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setProgress(0);
  }, [slides.length]);

  // Go to previous slide
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  }, [slides.length]);

  // Jump to specific slide
  const handleSelectSlide = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (isAr) handlePrev();
        else handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (isAr) handleNext();
        else handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isAr]);

  // Handle document visibility change (pause autoplay when tab is inactive)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Autoplay and progress bar ticker
  useEffect(() => {
    if (!isPlaying || isHovered || slides.length <= 1) {
      return;
    }

    const intervalStep = 50; // update progress every 50ms
    const totalSteps = AUTOPLAY_INTERVAL / intervalStep;
    const progressIncrement = 100 / totalSteps;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + progressIncrement;
      });
    }, intervalStep);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, isHovered, slides.length, handleNext]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartXRef.current;
    if (Math.abs(deltaX) > 45) {
      if (deltaX > 0) {
        // Swipe Right
        if (isAr) handleNext();
        else handlePrev();
      } else {
        // Swipe Left
        if (isAr) handlePrev();
        else handleNext();
      }
    }
    touchStartXRef.current = null;
  };

  // Helper for Department Category Title and Icon
  const getCategoryMeta = (offer: HotelOffer) => {
    const dept = offer.department || 'rooms';
    switch (dept) {
      case 'seasonal':
        return {
          badgeEn: 'SEASONAL OFFER',
          badgeAr: 'عرض موسمي',
          name: isAr ? 'عرض موسمي' : 'SEASONAL OFFER',
          icon: <Flame size={12} className="text-amber-400" />,
        };
      case 'rooms':
        return {
          badgeEn: 'HOTEL STAY',
          badgeAr: 'إقامة فندقية',
          name: isAr ? 'إقامة فندقية' : 'HOTEL STAY',
          icon: <Bed size={12} className="text-amber-400" />,
        };
      case 'restaurant':
        return {
          badgeEn: 'DINING',
          badgeAr: 'تجارب الطهي',
          name: isAr ? 'تجارب الطهي' : 'DINING',
          icon: <UtensilsCrossed size={12} className="text-amber-400" />,
        };
      case 'health_club':
        return {
          badgeEn: 'SPA & WELLNESS',
          badgeAr: 'سبا واستجمام',
          name: isAr ? 'سبا واستجمام' : 'SPA & WELLNESS',
          icon: <Sparkle size={12} className="text-amber-400" />,
        };
      case 'cafe':
        return {
          badgeEn: 'CAFÉ',
          badgeAr: 'المقهى واللاونج',
          name: isAr ? 'المقهى واللاونج' : 'CAFÉ',
          icon: <Coffee size={12} className="text-amber-400" />,
        };
      default:
        return {
          badgeEn: 'HOTEL STAY',
          badgeAr: 'إقامة فندقية',
          name: isAr ? 'إقامة فندقية' : 'HOTEL STAY',
          icon: <Tag size={12} className="text-amber-400" />,
        };
    }
  };

  // Helper for Concise Price Display (Rule 3: “From SAR 320” or “SAR 320 per person”)
  const getOfferPriceText = (offer: HotelOffer) => {
    const isPerPerson =
      offer.department === 'restaurant' ||
      offer.department === 'health_club' ||
      offer.department === 'cafe';
    const price = offer.offer_price;
    if (isPerPerson) {
      return isAr ? `${price} ر.س للشخص` : `SAR ${price} per person`;
    }
    return isAr ? `ابتداءً من ${price} ر.س` : `From SAR ${price}`;
  };

  // Helper for Short, Direct Action CTA labels (Rule 5: View Offer, Book Now, Reserve Table, Book Spa, WhatsApp)
  const getSecondaryCta = (offer: HotelOffer) => {
    switch (offer.department) {
      case 'restaurant':
        return {
          label: isAr ? 'حجز طاولة' : 'Reserve Table',
          icon: <UtensilsCrossed size={15} className="text-emerald-300" />,
        };
      case 'health_club':
        return {
          label: isAr ? 'حجز السبا' : 'Book Spa',
          icon: <Sparkle size={15} className="text-emerald-300" />,
        };
      case 'rooms':
      case 'seasonal':
        return {
          label: isAr ? 'احجز الآن' : 'Book Now',
          icon: <Bed size={15} className="text-emerald-300" />,
        };
      case 'cafe':
      default:
        return {
          label: isAr ? 'واتساب' : 'WhatsApp',
          icon: <MessageCircle size={15} className="text-emerald-300" />,
        };
    }
  };

  // Calculate savings percentage
  const calculateSavings = (original: number, current: number) => {
    if (!original || original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  // WhatsApp Concierge Link Builder
  const getWhatsAppBookingUrl = (offer: HotelOffer) => {
    const phone = hotel.whatsapp_number || '+966555072806';
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const offerTitle = isAr ? offer.title_ar : offer.title_en;
    const roomText = roomNumber ? (isAr ? ` (غرفة: ${roomNumber})` : ` (Room: ${roomNumber})`) : '';
    const text = isAr
      ? `مرحباً كونسيرج ${hotel.name_ar}، أود الاستفسار والحجز لعرض: "${offerTitle}"${roomText}. السعر: ${offer.offer_price} ${offer.currency || 'SAR'}. شكراً لك.`
      : `Hello ${hotel.name_en} Concierge, I would like to book the offer: "${offerTitle}"${roomText}. Special Rate: ${offer.offer_price} ${offer.currency || 'SAR'}. Thank you.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const categoryMeta = getCategoryMeta(currentSlide);
  const savings = calculateSavings(currentSlide.original_price, currentSlide.offer_price);

  return (
    <section
      id="hotel-offers"
      aria-label={isAr ? 'العروض المميزة' : 'Featured Hotel Offers'}
      className="w-full bg-[#faf9f7] text-stone-900"
    >
      {/* 
        ========================================================================
        VISUAL SEPARATOR & SECTION HEADER
        ========================================================================
      */}
      <div className="w-full bg-white border-t border-black/[0.06] pt-6 sm:pt-8 md:pt-10 pb-5 sm:pb-6 md:pb-7 lg:pb-8 px-4 sm:px-6">
        <div className="max-w-[960px] mx-auto text-center space-y-2 sm:space-y-2.5">
          {/* Eyebrow / Badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-600/25 text-amber-800 text-[11px] sm:text-xs font-semibold uppercase tracking-widest shadow-2xs">
              <Sparkles size={11} className="text-amber-600" />
              <span>{isAr ? 'العروض المميزة' : 'FEATURED OFFERS'}</span>
            </span>
          </div>

          {/* Main section heading: 
              Desktop: 40-44px, line-height 1.08, max-width 900-1000px, on one line when viewport allows
              Tablet: 34-38px
              Mobile: 28-32px
              Balanced wrapping without awkward dangling words
          */}
          <h2 className="text-[28px] sm:text-[34px] md:text-[38px] lg:text-[42px] xl:text-[44px] font-serif font-bold text-stone-900 tracking-tight leading-[1.08] [text-wrap:balance]">
            {isAr ? 'تجارب وعروض صُممت لإقامتك' : 'Exceptional Offers, Curated for Your Stay'}
          </h2>

          {/* Subtitle: Concise & benefit-focused */}
          <p className="text-xs sm:text-sm md:text-[15px] text-stone-500 max-w-xl mx-auto leading-relaxed font-sans font-normal [text-wrap:balance]">
            {isAr
              ? 'اكتشف عروض الإقامة والمطاعم والاسترخاء المختارة خصيصاً لضيوف سويس فلورا.'
              : 'Discover exclusive stays, dining experiences and wellness privileges created for Swiss Flora guests.'}
          </p>
        </div>
      </div>

      {/* 
        ========================================================================
        1. FULL-WIDTH HERO SLIDER CONTAINER (Preserves 100% edge-to-edge width)
        Heights:
        - Mobile: 460px - 500px
        - Tablet: 500px - 550px
        - Desktop: 550px - 620px
        ========================================================================
      */}
      <div
        aria-label={isAr ? 'عروض الفندق الحصرية' : 'Hotel Offers Hero Slider'}
        className="w-full relative overflow-hidden bg-stone-950 text-white select-none group h-[460px] sm:h-[500px] md:h-[550px] lg:h-[620px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Animated Background Image Layer with Crossfade & Subtle Ken Burns Zoom */}
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
            className="absolute inset-0 w-full h-full overflow-hidden"
          >
            {/* Ken Burns Zoom Effect */}
            <motion.img
              src={currentSlide.image_url}
              alt={isAr ? currentSlide.title_ar : currentSlide.title_en}
              initial={{ scale: 1.0 }}
              animate={{ scale: 1.04 }}
              transition={{ duration: 7, ease: 'easeOut' }}
              className="w-full h-full object-cover object-center"
            />

            {/* 
              ==================================================================
              DARK IMAGE OVERLAY:
              Softened so hotel photography remains luminous and visible,
              while maintaining WCAG readability for text and badges.
              ==================================================================
            */}
            <div
              className={`absolute inset-0 pointer-events-none ${
                isAr ? 'bg-gradient-to-l' : 'bg-gradient-to-r'
              } from-stone-950/80 via-stone-950/50 sm:via-stone-950/35 to-stone-950/15`}
            />
            {/* Soft vertical gradient for top tracker and bottom category chips */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-stone-950/75 via-transparent to-stone-950/30" />
          </motion.div>
        </AnimatePresence>

        {/* 
          ======================================================================
          2. FOREGROUND CONTENT GRID (Constrained to max-w-7xl for readable hierarchy)
          ======================================================================
        */}
        <div className="relative z-20 max-w-7xl mx-auto h-full px-4 sm:px-8 lg:px-12 flex flex-col justify-between py-6 sm:py-10 pointer-events-none">
          {/* Top Bar: Slide Tracker & Auto-Play Control */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            {/* Property Identity Indicator */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[11px] font-medium text-stone-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>{hotel.name_en}</span>
              </span>
            </div>

            {/* Slide Index Counter & Autoplay Pause Button */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-xs font-mono text-stone-200">
                <span className="text-amber-400 font-bold">
                  {String(currentIndex + 1).padStart(2, '0')}
                </span>
                <span className="mx-1 text-stone-500">/</span>
                <span className="text-stone-400">
                  {String(slides.length).padStart(2, '0')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-stone-300 hover:text-white backdrop-blur-md border border-white/15 transition-colors cursor-pointer"
                title={isPlaying ? (isAr ? 'إيقاف التشغيل التلقائي' : 'Pause Autoplay') : (isAr ? 'تشغيل تلقائي' : 'Play Autoplay')}
                aria-label="Toggle Autoplay"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} className="text-amber-400" />}
              </button>
            </div>
          </div>

          {/* Central Main Content: Animated Title, Badges, Price, and CTAs */}
          <div className="max-w-2xl sm:max-w-3xl space-y-3 sm:space-y-4 my-auto pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                className="space-y-3 sm:space-y-3.5"
              >
                {/* 1. Category Badge & Sub-Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-xs font-semibold uppercase tracking-widest backdrop-blur-md shadow-xs">
                    {categoryMeta.icon}
                    <span>{categoryMeta.name}</span>
                  </div>

                  {savings > 0 && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] sm:text-xs font-semibold backdrop-blur-md">
                      <span>{isAr ? `توفير ${savings}%` : `Save ${savings}%`}</span>
                    </div>
                  )}
                </motion.div>

                {/* 2. Main Title: Desktop 42-48px, line-height 1.08, max-width 600px, Tablet 34-40px, Mobile 28-34px */}
                <motion.h3
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
                  className="text-[28px] sm:text-[34px] md:text-[38px] lg:text-[44px] xl:text-[46px] font-serif font-bold tracking-tight text-white leading-[1.08] drop-shadow-md line-clamp-2 max-w-[600px] [text-wrap:balance]"
                >
                  {isAr ? currentSlide.title_ar : currentSlide.title_en}
                </motion.h3>

                {/* 3. Short Description: Max 2 lines on desktop, max-width 540-600px, line-height 1.5-1.6 */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
                  className="text-stone-200/90 font-sans text-xs sm:text-sm md:text-base leading-[1.55] max-w-[560px] font-normal line-clamp-2"
                >
                  {isAr ? currentSlide.description_ar : currentSlide.description_en}
                </motion.p>

                {/* 4. Clean Unboxed Price & Validity Details */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
                  className="flex flex-wrap items-baseline gap-3 pt-0.5"
                >
                  {/* Price Block: Unboxed, typography-first */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs sm:text-sm text-stone-300/80 font-normal">
                      {currentSlide.department === 'restaurant' ||
                      currentSlide.department === 'health_club' ||
                      currentSlide.department === 'cafe'
                        ? isAr
                          ? 'للشخص'
                          : 'per person'
                        : isAr
                        ? 'ابتداءً من'
                        : 'From'}
                    </span>
                    <span className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-amber-300 tracking-tight drop-shadow-xs">
                      {isAr ? `${currentSlide.offer_price} ر.س` : `SAR ${currentSlide.offer_price}`}
                    </span>
                    {currentSlide.original_price > currentSlide.offer_price && (
                      <span className="text-xs sm:text-sm text-stone-400/75 line-through font-light">
                        {isAr ? `${currentSlide.original_price} ر.س` : `SAR ${currentSlide.original_price}`}
                      </span>
                    )}
                  </div>

                  {/* Validity Date */}
                  {currentSlide.valid_until && (
                    <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-stone-300/75 border-l rtl:border-r rtl:border-l-0 border-white/20 pl-3 rtl:pr-3 rtl:pl-0">
                      <Calendar size={12} className="text-amber-400/80 shrink-0" />
                      <span>
                        {isAr ? `صالح حتى ${currentSlide.valid_until}` : `Valid until ${currentSlide.valid_until}`}
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* 5. CTA Action Buttons: Compact & Premium */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
                  className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2"
                >
                  {/* Primary CTA: View Offer */}
                  <button
                    type="button"
                    id="hero-view-offer-btn"
                    onClick={() => setSelectedOfferForModal(currentSlide)}
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer touch-target group/btn"
                    style={{ backgroundColor: 'var(--hotel-button, #8b6f4e)' }}
                  >
                    <span>{isAr ? 'عرض التفاصيل' : 'View Offer'}</span>
                    <NextIcon size={14} className="group-hover/btn:translate-x-0.5 rtl:group-hover/btn:-translate-x-0.5 transition-transform" />
                  </button>

                  {/* Secondary CTA: Book Now */}
                  <a
                    id="hero-book-whatsapp-btn"
                    href={getWhatsAppBookingUrl(currentSlide)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold backdrop-blur-md border border-emerald-500/30 shadow-md transition-all cursor-pointer touch-target"
                  >
                    <MessageCircle size={14} className="text-emerald-300" />
                    <span>{isAr ? 'احجز الآن' : 'Book Now'}</span>
                  </a>

                  {/* Secondary Link: Browse all offers */}
                  <button
                    type="button"
                    onClick={onViewAllOffers}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white text-xs font-medium backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
                  >
                    <Gift size={13} className="text-amber-300" />
                    <span>{isAr ? `كافة العروض (${slides.length})` : `All Offers (${slides.length})`}</span>
                  </button>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 
            ====================================================================
            3. BOTTOM BAR: Visually Lighter Category Chips & Interactive Slide Selectors
            ====================================================================
          */}
          <div className="w-full pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
            {/* Quick Category Jump Tabs - Lighter, refined chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {slides.map((slide, idx) => {
                const isSelected = idx === currentIndex;
                const meta = getCategoryMeta(slide);
                return (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => handleSelectSlide(idx)}
                    className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs border border-amber-400/50'
                        : 'bg-black/30 hover:bg-black/50 text-stone-300 border border-white/10 hover:border-white/20 backdrop-blur-xs font-normal'
                    }`}
                  >
                    <span className="scale-75 text-amber-400/80">{meta.icon}</span>
                    <span className="truncate max-w-[120px] sm:max-w-[150px]">
                      {isAr ? meta.badgeAr : meta.badgeEn}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Next / Prev Arrow Navigation */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-stone-300 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title={isAr ? 'العرض التالي' : 'Previous Offer'}
                aria-label="Previous Slide"
              >
                <PrevIcon size={16} />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-stone-300 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title={isAr ? 'العرض السابق' : 'Next Offer'}
                aria-label="Next Slide"
              >
                <NextIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 
          ======================================================================
          4. SIDE NAV ARROWS (Visible on Large Screens)
          ======================================================================
        */}
        <div className="hidden lg:block">
          <button
            type="button"
            onClick={isAr ? handleNext : handlePrev}
            className={`absolute top-1/2 -translate-y-1/2 ${
              isAr ? 'right-4 sm:right-6' : 'left-4 sm:left-6'
            } z-30 w-11 h-11 rounded-full bg-black/35 hover:bg-black/75 text-stone-300 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all cursor-pointer active:scale-95 opacity-0 group-hover:opacity-100 duration-300`}
            aria-label="Previous Offer"
          >
            <ChevronLeft size={20} className={isAr ? 'rotate-180' : ''} />
          </button>

          <button
            type="button"
            onClick={isAr ? handlePrev : handleNext}
            className={`absolute top-1/2 -translate-y-1/2 ${
              isAr ? 'left-4 sm:left-6' : 'right-4 sm:right-6'
            } z-30 w-11 h-11 rounded-full bg-black/35 hover:bg-black/75 text-stone-300 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all cursor-pointer active:scale-95 opacity-0 group-hover:opacity-100 duration-300`}
            aria-label="Next Offer"
          >
            <ChevronRight size={20} className={isAr ? 'rotate-180' : ''} />
          </button>
        </div>

        {/* 
          ======================================================================
          5. AUTOPLAY PROGRESS BAR (Slim Golden Line along the Bottom)
          ======================================================================
        */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-900/60 z-30">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>
      </div>

      {/* 
        ========================================================================
        6. VIEW OFFER DETAIL MODAL (Opens when guest clicks 'View Offer')
        ========================================================================
      */}
      <AnimatePresence>
        {selectedOfferForModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md"
            onClick={() => setSelectedOfferForModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden text-stone-100 max-h-[90vh] flex flex-col"
            >
              {/* Modal Image Header */}
              <div className="relative h-56 sm:h-64 w-full shrink-0">
                <img
                  src={selectedOfferForModal.image_url}
                  alt={isAr ? selectedOfferForModal.title_ar : selectedOfferForModal.title_en}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />

                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setSelectedOfferForModal(null)}
                  className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>

                {/* Badge on Image */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-amber-500/90 text-stone-950 font-semibold text-xs uppercase tracking-wider">
                    {getCategoryMeta(selectedOfferForModal).name}
                  </span>
                  <span className="text-sm sm:text-base font-bold font-serif text-amber-300 bg-black/60 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                    {getOfferPriceText(selectedOfferForModal)}
                  </span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
                  {isAr ? selectedOfferForModal.title_ar : selectedOfferForModal.title_en}
                </h3>

                <p className="text-sm text-stone-300 leading-relaxed">
                  {isAr ? selectedOfferForModal.description_ar : selectedOfferForModal.description_en}
                </p>

                {/* Offer Inclusions / Terms */}
                <div className="p-4 rounded-xl bg-stone-800/70 border border-stone-700 space-y-2 text-xs">
                  <span className="font-bold text-stone-200 block uppercase tracking-wider">
                    {isAr ? 'الشروط والمزايا المشمولة:' : 'Package Terms & Inclusions:'}
                  </span>
                  <div className="flex items-start gap-2 text-stone-300">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      {isAr
                        ? selectedOfferForModal.terms_ar || 'يشمل الإفطار المجاني واستخدام مرافق الفندق.'
                        : selectedOfferForModal.terms_en || 'Includes complimentary breakfast and full facility access.'}
                    </span>
                  </div>
                  {selectedOfferForModal.valid_until && (
                    <div className="flex items-center gap-2 text-stone-400 pt-1">
                      <Calendar size={13} className="text-amber-400" />
                      <span>
                        {isAr
                          ? `العرض سارٍ حتى: ${selectedOfferForModal.valid_until}`
                          : `Valid until: ${selectedOfferForModal.valid_until}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Promo Code Copy */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-stone-800 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px]">
                      {isAr ? 'كود العرض الترويجي' : 'Exclusive Promo Code'}
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      SWISSROYAL-{selectedOfferForModal.id.substring(0, 6).toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`SWISSROYAL-${selectedOfferForModal.id.substring(0, 6).toUpperCase()}`);
                      setCopiedPromo(true);
                      setTimeout(() => setCopiedPromo(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
                  >
                    {copiedPromo ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}
                  </button>
                </div>
              </div>

              {/* Modal Footer CTAs */}
              <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOfferForModal(null)}
                  className="px-4 py-2.5 rounded-xl text-stone-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>

                <a
                  href={getWhatsAppBookingUrl(selectedOfferForModal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
                >
                  {getSecondaryCta(selectedOfferForModal).icon}
                  <span>{getSecondaryCta(selectedOfferForModal).label}</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
