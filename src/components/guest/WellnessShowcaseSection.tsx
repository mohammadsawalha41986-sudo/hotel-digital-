import React from 'react';
import {
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { WellnessFacility, Language } from '../../types/hotel';
import { getTranslation } from '../../utils/i18n';

interface WellnessShowcaseSectionProps {
  facilities: WellnessFacility[];
  language: Language;
  hotelWhatsapp: string;
}

export const WellnessShowcaseSection: React.FC<WellnessShowcaseSectionProps> = ({
  facilities,
  language,
  hotelWhatsapp,
}) => {
  const isAr = language === 'ar';
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  return (
    <section id="wellness-spa" className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full mb-2">
              <Sparkles size={13} />
              <span>{isAr ? 'النادي الصحي والسبا' : 'WELLNESS & SPA SANCTUARY'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
              {t('wellness_section_title')}
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl mt-1.5 leading-relaxed">
              {t('wellness_section_subtitle')}
            </p>
          </div>

          <div className="text-xs text-stone-500">
            <span className="font-semibold text-stone-800">{isAr ? 'مواعيد العمل: ' : 'Hours: '}</span>
            06:00 AM – 11:00 PM
          </div>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {facilities.map((fac) => (
            <div
              key={fac.id}
              className="bg-stone-50/70 rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-60 overflow-hidden bg-stone-200">
                  <img
                    src={fac.image_url}
                    alt={isAr ? fac.name_ar : fac.name_en}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-stone-900/80 text-amber-300 backdrop-blur-md border border-stone-700">
                      {isAr ? fac.type_ar : fac.type_en}
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/90 text-stone-800">
                      {isAr ? fac.hours_ar : fac.hours_en}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">
                    {isAr ? fac.name_ar : fac.name_en}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-3 mb-5">
                    {isAr ? fac.description_ar : fac.description_en}
                  </p>

                  <div className="space-y-2 mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                      {isAr ? 'العلاجات والطقوس المتوفرة' : 'Signature Rituals & Services'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(isAr ? fac.signature_treatments_ar : fac.signature_treatments_en).map((treatment: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-medium"
                        >
                          {treatment}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-stone-200/60 mt-2 flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">
                  {isAr ? 'أجنحة خاصة للرجال والنساء' : 'Dedicated Private Ladies & Men Suites'}
                </span>

                <a
                  href={`https://wa.me/${hotelWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    isAr
                      ? `مرحباً، أود الاستفسار وحجز جلسة سبا في ${fac.name_ar}`
                      : `Hello, I would like to inquire about spa treatments at ${fac.name_en}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <MessageSquare size={13} />
                  <span>{t('wellness_book_session')}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
