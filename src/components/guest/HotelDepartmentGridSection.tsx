import React from 'react';
import {
  BedDouble,
  UtensilsCrossed,
  HeartHandshake,
  Shirt,
  ArrowRight,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { TopLevelDepartment } from '../../types/department';
import { Hotel, Language } from '../../types/hotel';

interface HotelDepartmentGridSectionProps {
  hotel: Hotel;
  language: Language;
  onSelectDepartment: (dept: TopLevelDepartment) => void;
}

export const HotelDepartmentGridSection: React.FC<HotelDepartmentGridSectionProps> = ({
  hotel,
  language,
  onSelectDepartment,
}) => {
  const isAr = language === 'ar';
  const NextIcon = isAr ? ArrowLeft : ArrowRight;

  // Retrieve department cover images from configuration with distinct, high-res hospitality fallbacks
  const roomsCover =
    hotel.departments?.find((d) => d.code === 'rooms')?.department_cover_image ||
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85';

  const diningCover =
    hotel.departments?.find((d) => d.code === 'dining')?.department_cover_image ||
    'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=85';

  const wellnessCover =
    hotel.departments?.find((d) => d.code === 'wellness')?.department_cover_image ||
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85';

  const laundryCover =
    hotel.departments?.find((d) => d.code === 'housekeeping')?.department_cover_image ||
    'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=85';

  // EXACT FOUR MAIN EXPERIENCES (EDITORIAL LUXURY HOSPITALITY):
  // 1. Rooms & Suites
  // 2. Dining & Café
  // 3. Health Club & Spa
  // 4. Laundry & Valet
  const departments = [
    {
      id: 'stay' as TopLevelDepartment,
      icon: BedDouble,
      number: '01',
      title_en: 'In-Room Services',
      title_ar: 'خدمات الغرفة',
      desc_en:
        'Housekeeping, room comfort, maintenance, luggage, and in-room guest requests.',
      desc_ar:
        'خدمات التنظيف وراحة الغرفة والصيانة والأمتعة وطلبات النزيل داخل الغرفة.',
      image: roomsCover,
      working_hours_en: '24/7 Guest Service',
      working_hours_ar: 'خدمة الغرف على مدار الساعة',
      cta_en: 'Explore In-Room Services',
      cta_ar: 'استكشف خدمات الغرفة',
    },
    {
      id: 'dining' as TopLevelDepartment,
      icon: UtensilsCrossed,
      number: '02',
      title_en: 'Dining & Café',
      title_ar: 'المطعم والمقهى',
      desc_en:
        'Dining, specialty coffee, room service, and curated culinary experiences.',
      desc_ar:
        'تجارب طعام، قهوة مختصة، خدمة غرف، ومأكولات مميزة.',
      image: diningCover,
      working_hours_en: 'Open 24/7',
      working_hours_ar: 'متاح 24/7',
      cta_en: 'Explore Dining',
      cta_ar: 'استكشف المطاعم',
    },
    {
      id: 'wellness' as TopLevelDepartment,
      icon: HeartHandshake,
      number: '03',
      title_en: 'Health Club & Spa',
      title_ar: 'النادي الصحي والسبا',
      desc_en:
        'Spa treatments, fitness, sauna, steam room, and pool access.',
      desc_ar:
        'جلسات سبا، لياقة بدنية، ساونا، غرفة بخار، ودخول للمسبح.',
      image: wellnessCover,
      working_hours_en: 'Daily 07:00 – 23:00',
      working_hours_ar: 'يومياً 07:00 – 23:00',
      cta_en: 'Explore Wellness',
      cta_ar: 'استكشف العافية',
    },
    {
      id: 'laundry' as TopLevelDepartment,
      icon: Shirt,
      number: '04',
      title_en: 'Laundry & Valet',
      title_ar: 'المغسلة والعناية بالملابس',
      desc_en:
        'Laundry, dry cleaning, pressing, and convenient collection service.',
      desc_ar:
        'غسيل ملابس، تنظيف جاف، كي، وخدمة استلام وتسليم مريحة.',
      image: laundryCover,
      working_hours_en: 'Daily 08:00 – 22:00',
      working_hours_ar: 'يومياً 08:00 – 22:00',
      cta_en: 'Laundry Services',
      cta_ar: 'خدمات الغسيل',
    },
  ];

  return (
    <section
      id="hotel-departments"
      aria-label={isAr ? 'اكتشف سويس فلورا' : 'Explore Swiss Flora'}
      className="pt-8 sm:pt-10 md:pt-12 lg:pt-14 pb-14 sm:pb-16 md:pb-20 bg-stone-50/70 border-b border-stone-200/70"
    >
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        {/* 1. Section Header: Explore Swiss Flora with elegant luxury typography & reduced vertical gap */}
        <div className="mb-6 sm:mb-8 text-center max-w-xl mx-auto space-y-2 sm:space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-600/25 text-amber-800 text-[11px] sm:text-xs font-semibold uppercase tracking-widest">
            <span>{isAr ? 'تجارب سويس فلورا' : 'HOTEL EXPERIENCES'}</span>
          </div>
          <h2 className="text-[28px] sm:text-[34px] md:text-[38px] lg:text-[42px] xl:text-[44px] font-serif font-bold text-stone-900 tracking-tight leading-[1.1] [text-wrap:balance]">
            {isAr ? 'اكتشف سويس فلورا' : 'Explore Swiss Flora'}
          </h2>
          <p className="text-xs sm:text-sm md:text-[15px] text-stone-500 leading-relaxed font-sans font-normal [text-wrap:balance]">
            {isAr
              ? 'استكشف الغرف والمطاعم والعافية وخدمات الضيوف الأساسية.'
              : 'Discover our rooms, dining, wellness, and essential guest services.'}
          </p>
        </div>

        {/* 2. 2x2 Grid Desktop / 1-Col Mobile with equal card heights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-6 sm:gap-y-8 items-stretch">
          {departments.map((dept) => {
            const IconComp = dept.icon;

            return (
              <div
                key={dept.id}
                id={`department-card-${dept.id}`}
                className="bg-white rounded-[20px] overflow-hidden border border-stone-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)] hover:-translate-y-[3px] transition-all duration-300 ease-out flex flex-col h-full group"
              >
                {/* 3. Image Area: Equal height across all cards (280-310px desktop, 240-270px tablet, 210-240px mobile) */}
                <div className="relative w-full h-[220px] sm:h-[250px] md:h-[265px] lg:h-[295px] shrink-0 overflow-hidden bg-stone-900">
                  <img
                    src={dept.image}
                    alt={isAr ? dept.title_ar : dept.title_en}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-300 ease-out"
                    loading="lazy"
                  />

                  {/* Subtle bottom gradient only behind title (avoid darkening full image) */}
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent pointer-events-none" />

                  {/* 4. Top Badges: Simplified, compact metadata (01 / operating hours) */}
                  <div className="absolute top-3.5 sm:top-4 start-3.5 sm:start-4 end-3.5 sm:end-4 flex items-center justify-between pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider border border-white/15">
                      <IconComp size={13} className="text-amber-300" />
                      <span>{dept.number}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 bg-black/45 backdrop-blur-md text-stone-200 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium border border-white/15">
                      <Clock size={11} className="text-amber-300" />
                      <span>{isAr ? dept.working_hours_ar : dept.working_hours_en}</span>
                    </span>
                  </div>

                  {/* 5. Title Over Image: Prominent bold serif typography */}
                  <div className="absolute bottom-3.5 sm:bottom-4 start-4 sm:start-5 end-4 sm:end-5 text-white">
                    <h3 className="text-[25px] sm:text-[27px] lg:text-[30px] font-bold font-serif drop-shadow-sm leading-tight">
                      {isAr ? dept.title_ar : dept.title_en}
                    </h3>
                  </div>
                </div>

                {/* 6. Card Body: Equalized description height & uniform bottom-aligned CTAs */}
                <div className="p-4 sm:p-5 lg:p-6 flex-1 flex flex-col justify-between gap-4">
                  {/* Fixed min-height ensures identical baseline alignment across both columns */}
                  <div className="min-h-[44px] sm:min-h-[46px] flex items-center">
                    <p className="text-[14px] md:text-[14.5px] lg:text-[15px] text-stone-600 leading-[1.55] font-normal line-clamp-2">
                      {isAr ? dept.desc_ar : dept.desc_en}
                    </p>
                  </div>

                  {/* 7. Action CTA Button: 42-46px height, comfortable horizontal padding, 14-15px font */}
                  <div className="pt-3.5 border-t border-stone-100 flex items-center justify-end shrink-0">
                    <button
                      id={`enter-dept-btn-${dept.id}`}
                      onClick={() => onSelectDepartment(dept.id)}
                      className="w-full sm:w-auto h-[44px] px-5 sm:px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 text-white text-[14px] sm:text-[14.5px] font-semibold transition-all duration-300 cursor-pointer shadow-xs hover:opacity-95 group/btn"
                      style={{
                        backgroundColor: 'var(--hotel-button, #8b6f4e)',
                      }}
                    >
                      <span>{isAr ? dept.cta_ar : dept.cta_en}</span>
                      <NextIcon
                        size={14}
                        className="group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1 transition-transform duration-300"
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


