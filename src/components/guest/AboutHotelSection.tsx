import React from 'react';
import {
  Building2,
  Sparkles,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';

interface AboutHotelSectionProps {
  hotel: Hotel;
  language: Language;
  onExploreFacilities?: () => void;
  onExploreDepartments?: () => void;
  onExploreServices?: () => void;
}

export const AboutHotelSection: React.FC<AboutHotelSectionProps> = ({
  hotel,
  language,
  onExploreFacilities,
  onExploreDepartments,
  onExploreServices,
}) => {
  const isAr = language === 'ar';
  const NextIcon = isAr ? ArrowLeft : ArrowRight;
  const handleExploreServices = onExploreServices || onExploreDepartments;

  const highlights = isAr
    ? [
        { title: 'موقع استراتيجي مرموق', desc: 'يقع في قلب العاصمة الرياض بالقرب من المعالم الدبلوماسية والتجارية' },
        { title: 'ضيافة سويسرية أصيلة', desc: 'معايير عالمية للجودة والنظافة والراحة الملكية المطلقة' },
        { title: 'مرافق متكاملة للنزيل', desc: 'مسبح داخلي، نادٍ صحي، مطعم بوفيه، مقهى لاونج، ومغسلة سريعة' },
        { title: 'خدمات ذكية للغرف', desc: 'خدمة الكونسيرج وطلب المأكولات والمستلزمات فورياً للغرفة' },
      ]
    : [
        { title: 'Prestigious Prime Location', desc: 'Centrally situated in Riyadh close to business and diplomatic hubs' },
        { title: 'Authentic Swiss Hospitality', desc: 'Swiss precision and royal luxury standards crafted for supreme comfort' },
        { title: 'Comprehensive Guest Amenities', desc: 'Indoor lap pool, wellness spa, gourmet dining, and valet laundry' },
        { title: 'Seamless Digital Concierge', desc: 'In-room QR dining, housekeeping dispatch, and personalized assistance' },
      ];

  return (
    <section
      id="about-hotel"
      className="py-16 sm:py-24 bg-white border-b border-stone-200/80 text-stone-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Story & Identity */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200">
              <Building2 size={13} className="text-amber-700" />
              <span>{isAr ? 'عن الفندق وهوية الضيافة' : 'ABOUT THE HOTEL'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
              {isAr ? hotel.name_ar : hotel.name_en}
            </h2>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-amber-800 font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles size={15} />
                <span>{isAr ? hotel.classification_label_ar : hotel.classification_label_en}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <MapPin size={15} />
                <span>{isAr ? `${hotel.city_ar}، ${hotel.country_ar}` : `${hotel.city_en}, ${hotel.country_en}`}</span>
              </span>
            </div>

            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              {isAr ? hotel.description_ar : hotel.description_en}
            </p>

            {/* Editorial Highlight Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900">{item.title}</h4>
                      <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 leading-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action Navigation */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              {onExploreFacilities && (
                <button
                  onClick={onExploreFacilities}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-900 hover:text-amber-700 transition-colors cursor-pointer group"
                >
                  <span>{isAr ? 'استكشف كافة المرافق' : 'Explore All Hotel Facilities'}</span>
                  <NextIcon size={15} className="group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1" />
                </button>
              )}

              {handleExploreServices && (
                <button
                  onClick={handleExploreServices}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer group"
                >
                  <span>{isAr ? 'دليل الخدمات والإدارات' : 'Hotel Department Directory'}</span>
                  <NextIcon size={15} className="group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Authentic Editorial Imagery Collage */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="h-64 rounded-2xl overflow-hidden shadow-md border border-stone-200/60">
                <img
                  src={hotel.hero_images && hotel.hero_images.length > 0 ? hotel.hero_images[0].url : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'}
                  alt={isAr ? hotel.name_ar : hotel.name_en}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
              <div className="h-44 rounded-2xl overflow-hidden shadow-md border border-stone-200/60">
                <img
                  src={hotel.hero_images && hotel.hero_images.length > 1 ? hotel.hero_images[1].url : 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80'}
                  alt="Swiss Flora Interior"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="space-y-4 pt-8">
              <div className="h-44 rounded-2xl overflow-hidden shadow-md border border-stone-200/60">
                <img
                  src={hotel.hero_images && hotel.hero_images.length > 2 ? hotel.hero_images[2].url : 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1000&q=80'}
                  alt="Swiss Flora Restaurant"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
              <div className="h-64 rounded-2xl overflow-hidden shadow-md border border-stone-200/60">
                <img
                  src={hotel.hero_images && hotel.hero_images.length > 3 ? hotel.hero_images[3].url : 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'}
                  alt="Swiss Flora Suites"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
