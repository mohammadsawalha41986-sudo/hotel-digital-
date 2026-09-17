import React from 'react';
import {
  UtensilsCrossed,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { DiningVenue, Language } from '../../types/hotel';
import { getTranslation } from '../../utils/i18n';

interface DiningShowcaseSectionProps {
  diningVenues: DiningVenue[];
  language: Language;
  onSelectVenue?: (venue: DiningVenue) => void;
  hotelWhatsapp: string;
}

export const DiningShowcaseSection: React.FC<DiningShowcaseSectionProps> = ({
  diningVenues,
  language,
  hotelWhatsapp,
}) => {
  const isAr = language === 'ar';
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  return (
    <section id="dining-venues" className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full mb-2">
              <UtensilsCrossed size={13} />
              <span>{isAr ? 'المطاعم وتجارب الطهي' : 'GASTRONOMY & DINING'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
              {t('dining_section_title')}
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl mt-1.5 leading-relaxed">
              {t('dining_section_subtitle')}
            </p>
          </div>

          <div className="text-xs text-stone-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>{isAr ? 'حجوزات الطاولات والطلبات متاحة رقمياً' : 'Table bookings & in-room orders active'}</span>
          </div>
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {diningVenues.map((venue) => (
            <div
              key={venue.id}
              id={`venue-card-${venue.slug}`}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-stone-300 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Photo & Cuisine Badge */}
                <div className="relative h-64 overflow-hidden bg-stone-100">
                  <img
                    src={venue.image_url}
                    alt={isAr ? venue.name_ar : venue.name_en}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-stone-900/80 text-amber-300 backdrop-blur-md border border-stone-700">
                      {isAr ? venue.cuisine_ar : venue.cuisine_en}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-stone-800 backdrop-blur-md">
                      {isAr ? venue.dress_code_ar : venue.dress_code_en}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                      <Clock size={13} className="text-amber-400" />
                      <span>{isAr ? venue.opening_hours_ar : venue.opening_hours_en}</span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6">
                  <h3 className="text-xl font-serif font-bold text-stone-900 tracking-tight mb-2 group-hover:text-amber-800 transition-colors">
                    {isAr ? venue.name_ar : venue.name_en}
                  </h3>

                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-3 mb-5">
                    {isAr ? venue.description_ar : venue.description_en}
                  </p>

                  {/* Signature Dishes */}
                  <div className="space-y-2 mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                      {isAr ? 'أطباق مميزة مختارة' : 'Signature Chef Creations'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(isAr ? venue.menu_highlights_ar : venue.menu_highlights_en).map((dish: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-medium"
                        >
                          {dish}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 pt-0 border-t border-stone-100 mt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-stone-500">
                  <span className="font-semibold text-stone-800">
                    {isAr ? venue.type_ar : venue.type_en}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${hotelWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      isAr
                        ? `مرحباً، أود حجز طاولة في ${venue.name_ar}`
                        : `Hello, I would like to reserve a table at ${venue.name_en}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--hotel-button, #8b6f4e)',
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>{t('dining_reserve_table')}</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
