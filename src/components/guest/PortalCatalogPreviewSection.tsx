import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Language } from '../../types/hotel';

export interface PortalPreviewItem {
  id: string;
  title_en: string;
  title_ar: string;
  description_en?: string;
  description_ar?: string;
  image?: string;
  badge_en?: string;
  badge_ar?: string;
}

interface PortalCatalogPreviewSectionProps {
  id: string;
  language: Language;
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  items: PortalPreviewItem[];
  onViewAll: () => void;
}

export const PortalCatalogPreviewSection: React.FC<PortalCatalogPreviewSectionProps> = ({
  id,
  language,
  title_en,
  title_ar,
  subtitle_en,
  subtitle_ar,
  items,
  onViewAll,
}) => {
  const isAr = language === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  if (items.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-28 border-b border-stone-200/80 bg-white py-14 sm:py-20" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              {isAr ? title_ar : title_en}
            </h2>
            {(subtitle_en || subtitle_ar) && (
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {isAr ? subtitle_ar : subtitle_en}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition hover:border-amber-500 hover:text-amber-800"
          >
            {isAr ? 'عرض كل التفاصيل' : 'View all details'}
            <Arrow size={16} />
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-sm">
              {item.image ? (
                <img
                  src={item.image}
                  alt={isAr ? item.title_ar : item.title_en}
                  className="aspect-[16/10] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-[16/10] w-full bg-gradient-to-br from-stone-200 via-amber-50 to-stone-100" />
              )}
              <div className="p-5">
                {(item.badge_en || item.badge_ar) && (
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-amber-800">
                    {isAr ? item.badge_ar : item.badge_en}
                  </p>
                )}
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  {isAr ? item.title_ar : item.title_en}
                </h3>
                {(item.description_en || item.description_ar) && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
                    {isAr ? item.description_ar : item.description_en}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
