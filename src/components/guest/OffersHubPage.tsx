import React, { useState } from 'react';
import { Calendar, ArrowRight, ArrowLeft, Gift, ShieldCheck, Sparkles } from 'lucide-react';
import { Hotel, HotelOffer, Language } from '../../types/hotel';
import { TopLevelDepartment } from '../../types/department';
import { OfferDetailPage } from './OfferDetailPage';

interface OffersHubPageProps {
  hotel: Hotel;
  offers: HotelOffer[];
  currency: string;
  language: Language;
  roomNumber?: string;
  initialOfferId?: string;
  onNavigateDepartment: (dept: TopLevelDepartment) => void;
}

export const OffersHubPage: React.FC<OffersHubPageProps> = ({
  hotel,
  offers,
  currency,
  language,
  roomNumber,
  initialOfferId,
  onNavigateDepartment,
}) => {
  const isAr = language === 'ar';
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedOffer, setSelectedOffer] = useState<HotelOffer | null>(() => {
    if (initialOfferId) {
      return offers.find((o) => o.id === initialOfferId) || null;
    }
    return null;
  });

  const categories = [
    { id: 'all', label_en: 'All Offers', label_ar: 'كافة العروض الحصرية' },
    { id: 'dining', label_en: 'Food & Beverage', label_ar: 'المطاعم والمقاهي' },
    { id: 'wellness', label_en: 'Health Club & Spa', label_ar: 'النادي الصحي والسبا' },
    { id: 'stay', label_en: 'Rooms & Suites', label_ar: 'الغرف والأجنحة' },
    { id: 'laundry', label_en: 'Laundry & Valet', label_ar: 'المغسلة والعناية' },
  ];

  // If an offer is actively selected, show the complete OfferDetailPage
  if (selectedOffer) {
    return (
      <OfferDetailPage
        offer={selectedOffer}
        hotel={hotel}
        language={language}
        currency={currency}
        roomNumber={roomNumber}
        onBack={() => setSelectedOffer(null)}
        onNavigateDepartment={onNavigateDepartment}
      />
    );
  }

  // Filter active, non-expired offers
  const activeOffers = offers.filter((offer) => {
    if (!offer.is_active) return false;
    if (activeCategory === 'all') return true;
    if (activeCategory === 'stay') return offer.department === 'rooms';
    if (activeCategory === 'dining')
      return offer.department === 'restaurant' || offer.department === 'cafe' || offer.department === 'room_service';
    if (activeCategory === 'wellness') return offer.department === 'health_club';
    if (activeCategory === 'laundry') return offer.department === 'laundry';
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-900" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Offers Hero Banner */}
      <div className="relative bg-stone-950 text-white overflow-hidden py-12 sm:py-16">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2000&q=85"
            alt=""
            className="w-full h-full object-cover opacity-25 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
              <Gift size={13} />
              <span>{isAr ? 'عروض الفندق الحصرية' : 'HOTEL EXCLUSIVE PRIVILEGES'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif leading-tight">
              {isAr ? 'عروض وباقات الفندق' : 'Hotel Offers & Packages'}
            </h1>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              {isAr
                ? `استمتع بأفضل العروض الحصرية لنزلاء ${hotel.name_ar}: وجبات إفطار مجانية، خصومات استثنائية على جلسات السبا، وعروض البوفيه الفاخر.`
                : `Enjoy curated exclusive privileges at ${hotel.name_en}: dining promotions, wellness & spa rituals, and special seasonal offerings.`}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Filter Navigation Chips */}
      <div className="bg-white border-b border-stone-200 sticky top-16 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                  }`}
                >
                  {isAr ? cat.label_ar : cat.label_en}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Offers Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900">
              {isAr ? 'العروض النشطة المتاحة' : 'Active Hotel Offers'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {isAr
                ? `عرض ${activeOffers.length} من العروض المعتمدة للفندق`
                : `Showing ${activeOffers.length} active verified hotel promotions`}
            </p>
          </div>
        </div>

        {activeOffers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-md mx-auto my-12">
            <Sparkles size={32} className="mx-auto text-amber-500 mb-3" />
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {isAr ? 'لا توجد عروض في هذا التصنيف حالياً' : 'No Offers Currently in this Category'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {isAr
                ? 'يرجى اختيار تصنيف آخر أو العودة لكافة عروض الفندق.'
                : 'Select another filter category or view all promotions.'}
            </p>
            <button
              onClick={() => setActiveCategory('all')}
              className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl cursor-pointer"
            >
              {isAr ? 'عرض كافة العروض' : 'View All Offers'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOffers.map((offer) => {
              const savings =
                offer.original_price && offer.offer_price && offer.original_price > offer.offer_price
                  ? offer.original_price - offer.offer_price
                  : null;

              return (
                <div
                  key={offer.id}
                  id={`offer-card-${offer.id}`}
                  onClick={() => setSelectedOffer(offer)}
                  className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs hover:shadow-lg hover:border-amber-400/60 transition-all duration-300 overflow-hidden flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    {/* Hero Image with Badge */}
                    <div className="relative h-56 bg-stone-100 overflow-hidden">
                      <img
                        src={offer.image_url}
                        alt={isAr ? offer.title_ar : offer.title_en}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Department Tag */}
                      <div className="absolute top-3.5 start-3.5">
                        <span className="bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/20">
                          {offer.department}
                        </span>
                      </div>

                      {/* Savings tag */}
                      {savings && savings > 0 && (
                        <div className="absolute top-3.5 end-3.5">
                          <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            {isAr ? `توفير ${savings} ${currency}` : `Save ${savings} ${currency}`}
                          </span>
                        </div>
                      )}

                      {/* Badge on image */}
                      <div className="absolute bottom-3 start-3.5 end-3.5 text-white">
                        <span className="text-[11px] font-semibold text-amber-300 bg-black/50 px-2 py-0.5 rounded-md inline-block mb-1">
                          {isAr ? offer.badge_ar : offer.badge_en}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <h3 className="text-base font-bold font-serif text-stone-900 leading-snug group-hover:text-amber-800 transition-colors">
                        {isAr ? offer.title_ar : offer.title_en}
                      </h3>

                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                        {isAr ? offer.description_ar : offer.description_en}
                      </p>

                      {/* Validity */}
                      <div className="pt-2 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
                        <Calendar size={13} className="text-amber-700 shrink-0" />
                        <span>
                          {isAr ? 'ساري حتى: ' : 'Valid until: '}
                          <strong className="text-stone-700">{offer.valid_until}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action Footer */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-stone-100 flex items-end justify-between gap-3">
                      <div>
                        {offer.original_price > offer.offer_price && (
                          <span className="text-[11px] text-stone-400 block line-through">
                            {offer.original_price} {currency}
                          </span>
                        )}
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold font-serif text-stone-900">
                            {offer.offer_price.toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-stone-600">{currency}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOffer(offer);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 group-hover:bg-amber-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span>{isAr ? 'عرض التفاصيل' : 'View Details'}</span>
                        {isAr ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                      </button>
                    </div>

                    {offer.terms_en && (
                      <div className="mt-2.5 flex items-center gap-1 text-[10px] text-stone-500 truncate">
                        <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
                        <span>{isAr ? offer.terms_ar : offer.terms_en}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

