// src/components/guest/GuestReviewsSection.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  ShieldCheck,
  Quote,
  ThumbsUp,
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  Calendar,
} from 'lucide-react';
import { Language } from '../../types/hotel';
import { GuestReview } from '../../types/reviews';
import {
  getPublicReviewsForHotel,
  calculatePublicRating,
  getCategoryLabel,
} from '../../utils/reviewStorage';
import { SubmitReviewModal } from './SubmitReviewModal';

interface GuestReviewsSectionProps {
  hotelId: string;
  hotelName: string;
  language: Language;
  roomNumber?: string;
  isVerifiedContext?: boolean;
}

type ReviewSort = 'featured' | 'recent' | 'highest';

export const GuestReviewsSection: React.FC<GuestReviewsSectionProps> = ({
  hotelId,
  hotelName,
  language,
  roomNumber,
  isVerifiedContext,
}) => {
  const isAr = language === 'ar';
  const [reviews, setReviews] = useState<GuestReview[]>([]);
  const [ratingStats, setRatingStats] = useState({
    averageRating: '5.0',
    totalCount: 0,
    starDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
  });
  const [sortBy, setSortBy] = useState<ReviewSort>('featured');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Load reviews strictly matching approved + published
  const refreshReviews = () => {
    const pubReviews = getPublicReviewsForHotel(hotelId);
    setReviews(pubReviews);
    const stats = calculatePublicRating(hotelId);
    setRatingStats(stats);
  };

  useEffect(() => {
    refreshReviews();
  }, [hotelId]);

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'featured') {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    }
    if (sortBy === 'highest') {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    }
    // recent
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  // Carousel navigation
  const checkScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // In RTL, scrollLeft can be negative or positive depending on browser implementation
    const isAtStart = Math.abs(scrollLeft) < 10;
    const isAtEnd = Math.abs(scrollLeft) + clientWidth >= scrollWidth - 10;
    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScrollState();
    el.addEventListener('scroll', checkScrollState);
    window.addEventListener('resize', checkScrollState);
    return () => {
      el.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [sortedReviews]);

  const handleScroll = (direction: 'prev' | 'next') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.review-card-item')?.clientWidth || 320;
    const scrollOffset = (direction === 'next' ? 1 : -1) * (cardWidth + 24);
    el.scrollBy({
      left: isAr ? -scrollOffset : scrollOffset,
      behavior: 'smooth',
    });
  };

  return (
    <section
      id="guest-reviews"
      aria-label="Guest Reviews"
      className="py-16 sm:py-24 bg-stone-100/60 border-b border-stone-200/80"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold uppercase tracking-wider mb-3">
              <ThumbsUp size={13} />
              <span>{isAr ? 'تقييمات وتجارب النزلاء' : 'GUEST REVIEWS & FEEDBACK'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
              {isAr ? 'ماذا يقول نزلاؤنا الكرام' : 'Guest Reviews & Experiences'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
              {isAr
                ? 'تجارب حقيقية وموثقة من ضيوفنا الكرام بعد اعتمادها من إدارة الفندق.'
                : 'Verified reflections on hospitality, dining, comfort, and service excellence.'}
            </p>
          </div>

          {/* Right Action & Rating Bar */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Dynamic Average Rating Badge */}
            {ratingStats.totalCount > 0 && (
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-stone-200/90 shadow-2xs shrink-0">
                <div className="text-3xl font-serif font-bold text-stone-900">
                  {ratingStats.averageRating}
                </div>
                <div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < Math.round(Number(ratingStats.averageRating))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-300'
                        }
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                    {isAr
                      ? `بناءً على ${ratingStats.totalCount} تقييم معتمد`
                      : `Based on ${ratingStats.totalCount} verified guest reviews`}
                  </div>
                </div>
              </div>
            )}

            {/* MANDATORY CTA: Share Your Experience Button */}
            <button
              id="share-experience-btn"
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold transition-all shadow-sm hover:shadow-md cursor-pointer shrink-0"
            >
              <MessageSquarePlus size={16} className="text-amber-300" />
              <span>{isAr ? 'شاركنا تجربتك' : 'Share Your Experience'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Slider Controls Bar */}
        {sortedReviews.length > 0 && (
          <div className="flex items-center justify-between gap-4 mb-6 pt-2 border-t border-stone-200/70">
            {/* Sorting Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSortBy('featured')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  sortBy === 'featured'
                    ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                {isAr ? 'المميزة أولاً' : 'Featured First'}
              </button>

              <button
                onClick={() => setSortBy('recent')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  sortBy === 'recent'
                    ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                {isAr ? 'الأحدث' : 'Most Recent'}
              </button>

              <button
                onClick={() => setSortBy('highest')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  sortBy === 'highest'
                    ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                {isAr ? 'الأعلى تقييماً' : 'Highest Rated'}
              </button>
            </div>

            {/* Slider Next/Prev Arrows */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleScroll('prev')}
                disabled={isAr ? !canScrollRight : !canScrollLeft}
                aria-label="Previous Reviews"
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shadow-2xs ${
                  (isAr ? !canScrollRight : !canScrollLeft)
                    ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700 cursor-pointer'
                }`}
              >
                {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
              <button
                onClick={() => handleScroll('next')}
                disabled={isAr ? !canScrollLeft : !canScrollRight}
                aria-label="Next Reviews"
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shadow-2xs ${
                  (isAr ? !canScrollLeft : !canScrollRight)
                    ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700 cursor-pointer'
                }`}
              >
                {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* Reviews Horizontal Track / Responsive Slider */}
        {sortedReviews.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="flex items-stretch gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none scroll-smooth"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {sortedReviews.map((rev) => (
              <div
                key={rev.id}
                id={`public-review-${rev.id}`}
                className="review-card-item w-[84%] sm:w-[48%] lg:w-[31.8%] shrink-0 snap-start bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top Row: Stars + Category & Verified Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={15}
                          className={
                            i < rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-200'
                          }
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {rev.featured && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                          <Sparkles size={10} />
                          <span>{isAr ? 'تقييم مميز' : 'Featured'}</span>
                        </span>
                      )}

                      {/* Verified Badge ONLY if genuinely verified */}
                      {rev.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={11} />
                          <span>{isAr ? 'نزيل موثق' : 'Verified Stay'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Pill */}
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-md">
                      {getCategoryLabel(rev.category, isAr)}
                    </span>
                  </div>

                  {/* Review Title & Content */}
                  <div className="relative pt-1 space-y-1.5">
                    {rev.title && (
                      <h4 className="text-sm font-bold text-stone-900 leading-snug">
                        {rev.title}
                      </h4>
                    )}
                    <div className="relative">
                      <Quote
                        size={16}
                        className="text-stone-200 absolute -start-1 -top-1 -scale-x-100 opacity-60 pointer-events-none"
                      />
                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal ps-3">
                        {rev.comment}
                      </p>
                    </div>
                  </div>

                  {/* Official Management Response (If Published) */}
                  {rev.managementResponse && rev.managementResponse.isPublished && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-1.5 text-xs text-stone-800">
                      <div className="flex items-center gap-2 font-bold text-amber-900 text-[11px]">
                        <Building2 size={13} className="text-amber-700" />
                        <span>
                          {isAr
                            ? rev.managementResponse.responderTitle_ar
                            : rev.managementResponse.responderTitle_en}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-stone-700 leading-relaxed ps-1 border-s-2 border-amber-400">
                        {rev.managementResponse.text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Guest Public Display Name & Stay Date */}
                <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-stone-900 block">
                      {rev.publicDisplayName}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {rev.source === 'ROOM_QR'
                        ? isAr
                          ? 'تقييم عبر باركود الغرفة'
                          : 'Room QR Stay'
                        : isAr
                        ? 'موقع الفندق الإلكتروني'
                        : 'Direct Web Guest'}
                    </span>
                  </div>

                  {rev.stayDate && (
                    <div className="flex items-center gap-1 text-[11px] text-stone-500 font-mono">
                      <Calendar size={12} className="text-stone-400" />
                      <span>{rev.stayDate}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state when no published reviews yet */
          <div className="text-center py-12 px-4 rounded-3xl bg-white border border-stone-200/80 space-y-4 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
              <MessageSquarePlus size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-serif font-bold text-stone-900">
                {isAr ? 'كن أول من يشاركنا تجربته' : 'Be the First to Share Your Experience'}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {isAr
                  ? 'تسعد إدارة الفندق باستقبال آرائكم ومقترحاتكم لتطوير أرقى معايير الضيافة.'
                  : 'We cherish your genuine feedback and strive to offer an exquisite stay experience.'}
              </p>
            </div>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <MessageSquarePlus size={14} />
              <span>{isAr ? 'شاركنا تجربتك الآن' : 'Share Your Experience Now'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Guest Review Submission Modal */}
      {isSubmitModalOpen && (
        <SubmitReviewModal
          hotelId={hotelId}
          hotelName={hotelName}
          language={language}
          defaultRoomNumber={roomNumber}
          isVerifiedContext={isVerifiedContext}
          onClose={() => setIsSubmitModalOpen(false)}
          onReviewSubmitted={() => {
            refreshReviews();
          }}
        />
      )}
    </section>
  );
};
