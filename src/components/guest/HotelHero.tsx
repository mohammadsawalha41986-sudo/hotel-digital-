import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  ArrowRight,
  ArrowLeft,
  Tag,
  Compass,
  Languages,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';

interface HotelHeroProps {
  hotel: Hotel;
  language: Language;
  roomNumber?: string;
  onToggleLanguage?: () => void;
  onExploreOffers: () => void;
  onExploreServices: () => void;
  primaryCtaLabel?: string;
}

export const HotelHero: React.FC<HotelHeroProps> = ({
  hotel,
  language,
  roomNumber,
  onToggleLanguage,
  onExploreOffers,
  onExploreServices,
  primaryCtaLabel,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const isAr = language === 'ar';

  // Auto-advance hero slides every 7 seconds
  useEffect(() => {
    if (!hotel.hero_images || hotel.hero_images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % hotel.hero_images.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [hotel.hero_images]);

  const NextIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <section
      id="top"
      aria-label="Hotel Hero and Property Highlights"
      className="relative min-h-[580px] sm:min-h-[660px] flex items-end justify-start overflow-hidden bg-stone-950 text-white"
    >
      {/* Background Image Carousel with Cinematic Overlay */}
      {hotel.hero_images.map((slide, idx) => (
        <div
          key={slide.url}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentSlideIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          style={{
            transitionProperty: 'opacity, transform',
            transitionDuration: '1.4s',
          }}
        >
          <img
            src={slide.url}
            alt={isAr ? slide.caption_ar : slide.caption_en}
            className="w-full h-full object-cover object-center brightness-75"
          />
        </div>
      ))}

      {/* Multi-tier Gradient Overlay for Superior Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-900/30" />
      <div className="absolute inset-0 bg-radial-at-c from-transparent via-stone-950/30 to-stone-950/70" />

      {/* Hero Top Controls: Language Switch & Slide Controls */}
      <div className="absolute top-6 left-4 right-4 sm:left-6 sm:right-6 z-20 flex items-center justify-between pointer-events-auto">
        {/* Language Switch Button */}
        {onToggleLanguage ? (
          <button
            onClick={onToggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer shadow-sm hover:scale-105"
            aria-label="Toggle language"
          >
            <Languages size={14} className="text-amber-400" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>
        ) : (
          <div />
        )}

        {/* Slide Controls if Multiple Slides exist */}
        {hotel.hero_images.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCurrentSlideIndex((prev) => (prev - 1 + hotel.hero_images.length) % hotel.hero_images.length)
              }
              className="p-2 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono text-white/90 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
              {currentSlideIndex + 1} / {hotel.hero_images.length}
            </span>
            <button
              onClick={() =>
                setCurrentSlideIndex((prev) => (prev + 1) % hotel.hero_images.length)
              }
              className="p-2 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Viewport */}
      <div className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-3xl space-y-4">
          {/* Room Context Personalized Banner (If Room QR was Scanned or Set) */}
          {roomNumber && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-md text-amber-200 border border-amber-400/40 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
              <DoorClosed size={16} className="text-amber-300 shrink-0" />
              <span>
                {isAr ? 'أهلاً وسهلاً بك في' : 'Welcome to'}{' '}
                <strong className="text-white font-bold tracking-wide">
                  {isAr ? `الغرفة ${roomNumber}` : `Room ${roomNumber}`}
                </strong>
              </span>
            </div>
          )}

          {/* Hotel Logo & Classification Header */}
          <div className="flex items-center gap-3 pt-1">
            {hotel.logo_url && (
              <div className="bg-white/95 p-1.5 rounded-xl shadow-md border border-white/20 backdrop-blur-xs shrink-0">
                <img
                  src={hotel.logo_url}
                  alt={isAr ? hotel.name_ar : hotel.name_en}
                  className="h-9 sm:h-11 w-auto max-w-[130px] object-contain"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-amber-300 border border-white/20">
                <Sparkles size={11} className="text-amber-400" />
                {isAr ? hotel.classification_label_ar : hotel.classification_label_en}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/40 backdrop-blur-md text-stone-300 border border-white/10">
                <MapPin size={11} className="text-stone-400" />
                {isAr ? `${hotel.city_ar}، ${hotel.country_ar}` : `${hotel.city_en}, ${hotel.country_en}`}
              </span>
            </div>
          </div>

          {/* Hotel Name & Hero Title */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              {isAr ? hotel.name_ar : hotel.name_en}
            </h1>
            <p className="text-sm sm:text-base font-serif italic text-amber-200/90 font-medium">
              {isAr ? hotel.tagline_ar : hotel.tagline_en}
            </p>
          </div>

          {/* Short Welcome Message (Concise, not overloaded) */}
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl font-normal line-clamp-3 sm:line-clamp-none">
            {isAr ? hotel.description_ar : hotel.description_en}
          </p>

          {/* Clean Primary Action Buttons (No Room Booking) */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {/* 1. Explore Hotel Services */}
            <button
              id="hero-explore-services-btn"
              onClick={onExploreServices}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer touch-target group"
              style={{
                backgroundColor: 'var(--hotel-button, #8b6f4e)',
              }}
            >
              <Compass size={16} />
              <span>{primaryCtaLabel || (isAr ? 'استكشف أقسام الفندق' : 'Explore Hotel Departments')}</span>
              <NextIcon size={14} className="group-hover:translate-x-0.5 transition-transform rtl:group-hover:-translate-x-0.5" />
            </button>

            {/* 2. Hotel Offers */}
            <button
              id="hero-explore-offers-btn"
              onClick={onExploreOffers}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-md text-white border border-white/25 text-xs sm:text-sm font-semibold transition-all cursor-pointer touch-target"
            >
              <Tag size={15} className="text-amber-300" />
              <span>{isAr ? 'عروض الفندق الحصرية' : 'Exclusive Hotel Offers'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
