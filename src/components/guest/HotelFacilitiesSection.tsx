import React from 'react';
import {
  Sparkles,
  UtensilsCrossed,
  Coffee,
  Waves,
  Dumbbell,
  Users,
  Shirt,
  Wifi,
  Car,
  BellRing,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import { TopLevelDepartment } from '../../types/department';
import { buildWhatsAppLink } from '../../utils/operatingStatus';

interface HotelFacilitiesSectionProps {
  hotel?: Hotel;
  language: Language;
  hotelWhatsApp?: string;
  onNavigateDepartment?: (dept: TopLevelDepartment) => void;
  onSelectDepartment?: (dept: TopLevelDepartment) => void;
  onContactConcierge?: () => void;
}

export const HotelFacilitiesSection: React.FC<HotelFacilitiesSectionProps> = ({
  hotel,
  language,
  hotelWhatsApp,
  onNavigateDepartment,
  onSelectDepartment,
  onContactConcierge,
}) => {
  const isAr = language === 'ar';
  const NextIcon = isAr ? ArrowLeft : ArrowRight;
  const handleNavDept = onSelectDepartment || onNavigateDepartment;

  const targetWhatsApp = hotelWhatsApp || hotel?.whatsapp_number || '+966112349999';

  const defaultContactConcierge = () => {
    const msg = isAr
      ? `مرحباً، أود الاستفسار عن مواعيد وحجوزات مرافق الفندق في ${hotel?.name_ar || 'سويس فلورا'}`
      : `Hello, I would like to inquire about hotel facilities and schedules at ${hotel?.name_en || 'Swiss Flora'}`;
    const cleanNumber = targetWhatsApp.replace(/[^0-9]/g, '');
    window.open(buildWhatsAppLink(cleanNumber, msg), '_blank');
  };

  const handleConcierge = onContactConcierge || defaultContactConcierge;

  const facilities = [
    {
      id: 'pool',
      name_en: 'Indoor Swimming Pool',
      name_ar: 'المسبح الداخلي المدفأ',
      desc_en: 'Climate-controlled luxury lap pool & relaxation deck.',
      desc_ar: 'مسبح مدفأ ذو إضاءة هادئة للاسترخاء والسباحة.',
      image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/84352dbf-9708-4e81-b174-03156b9bb95b/Pool%204.jpg',
      icon: Waves,
      dept: 'wellness' as TopLevelDepartment,
      tag_en: 'Level B1 • Heated',
      tag_ar: 'طابق B1 • مدفأ',
    },
    {
      id: 'fitness',
      name_en: 'Technogym Fitness Studio',
      name_ar: 'مركز اللياقة البدنية',
      desc_en: 'Advanced cardiovascular equipment & strength weights.',
      desc_ar: 'أحدث أجهزة اللياقة البدنية والأوزان المتطورة.',
      image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/4d53ec60-8e37-4d3b-9111-3cbd6e5b66e3/Gym%20Area%202.jpg',
      icon: Dumbbell,
      dept: 'wellness' as TopLevelDepartment,
      tag_en: 'Open 24/7',
      tag_ar: 'مفتوح 24/7',
    },
    {
      id: 'spa',
      name_en: 'Spa & Massage Sanctuary',
      name_ar: 'السبا والمساج المتخصص',
      desc_en: 'Therapeutic Swedish massages by certified specialists.',
      desc_ar: 'جلسات مساج استرخائي وعلاجي بأيدي خبراء معتمدين.',
      image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg',
      icon: Sparkles,
      dept: 'wellness' as TopLevelDepartment,
      tag_en: 'Daily Booking',
      tag_ar: 'حجز يومي',
    },
    {
      id: 'restaurant',
      name_en: 'Flora All-Day Restaurant',
      name_ar: 'مطعم فلورا العالمي',
      desc_en: 'Rich international breakfast, lunch, and dinner buffets.',
      desc_ar: 'بوفيه مفتوح فاخر لوجبات الإفطار والغداء والعشاء.',
      image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/b999a510-6e27-4992-95f0-dfb78a82d4c0/downloadk.png',
      icon: UtensilsCrossed,
      dept: 'dining' as TopLevelDepartment,
      tag_en: 'Level 1',
      tag_ar: 'الطابق الأول',
    },
    {
      id: 'cafe',
      name_en: 'Swiss Flora Café & Lounge',
      name_ar: 'مقهى ولاونج سويس فلورا',
      desc_en: 'Specialty coffee, Saudi coffee & fresh pastries.',
      desc_ar: 'قهوة مختصة، قهوة سعودية، ومخبوزات طازجة.',
      image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-2.jpg',
      icon: Coffee,
      dept: 'dining' as TopLevelDepartment,
      tag_en: 'Lobby Level',
      tag_ar: 'طابق اللوبي',
    },
    {
      id: 'meetings',
      name_en: 'Eventura Meeting & Banquets',
      name_ar: 'قاعات إيفنتورا للمؤتمرات',
      desc_en: 'High-tech audio/visual conference & banquet suites.',
      desc_ar: 'قاعات مجهزة بأحدث التقنيات للمؤتمرات والمناسبات.',
      image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Meeting/6b930953-98c8-43fb-ad8b-a05847209738/WhatsApp%20Image%202024-08-01%20at%2016.37.07%20(1).jpg',
      icon: Users,
      dept: 'services' as TopLevelDepartment,
      tag_en: 'Mezzanine',
      tag_ar: 'الميزانين',
    },
    {
      id: 'room_service',
      name_en: '24/7 In-Room Dining',
      name_ar: 'خدمة الغرف على مدار الساعة',
      desc_en: 'Fresh hot meals & refreshments delivered to your suite.',
      desc_ar: 'قائمة طعام شاملة تصل لغرفتك في أي وقت.',
      image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/1a2e0441-b476-489c-9b4f-dc74811d67e5/traytracker.jpg',
      icon: BellRing,
      dept: 'dining' as TopLevelDepartment,
      tag_en: '24 Hours',
      tag_ar: '24 ساعة',
    },
    {
      id: 'laundry',
      name_en: 'Express Valet & Dry Cleaning',
      name_ar: 'خدمة الغسيل والتنظيف الجاف',
      desc_en: 'Delicate care, crisp steaming, and fast 4h return.',
      desc_ar: 'عناية احترافية بالملابس وكي سريع مع استلام من الغرفة.',
      image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80',
      icon: Shirt,
      dept: 'laundry' as TopLevelDepartment,
      tag_en: 'Express 4h',
      tag_ar: 'خدمة سريعة',
    },
    {
      id: 'valet_parking',
      name_en: 'Complimentary Valet & Parking',
      name_ar: 'مواقف خاصة وصف السيارات',
      desc_en: 'Secure indoor basement parking with valet attendants.',
      desc_ar: 'مواقف آمنة ومظللة مع خدمة صف مجانية للنزلاء.',
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
      icon: Car,
      dept: 'services' as TopLevelDepartment,
      tag_en: 'Free for Guests',
      tag_ar: 'مجاناً للنزلاء',
    },
    {
      id: 'wifi',
      name_en: 'High-Speed Wi-Fi Everywhere',
      name_ar: 'إنترنت ألياف ضوئية فائق السرعة',
      desc_en: 'Seamless gigabit fiber coverage in suites and public areas.',
      desc_ar: 'تغطية واي فاي سريعة ومجانية في الغرف والمرافق.',
      image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
      icon: Wifi,
      dept: 'services' as TopLevelDepartment,
      tag_en: 'Gigabit Fiber',
      tag_ar: 'ألياف ضوئية',
    },
  ];

  return (
    <section id="hotel-facilities" className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/70 px-3 py-1 rounded-full mb-3">
              <Sparkles size={13} />
              <span>{isAr ? 'مرافق ومساحات الفندق' : 'FACILITIES & GUEST SPACES'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
              {isAr ? 'مرافق فندقية تلبي كافة تطلعاتك' : 'Distinctive Facilities & Guest Spaces'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
              {isAr
                ? 'استمتع بمجموعة متكاملة من المرافق الفاخرة المجهزة لراحتك واستجمامك طوال فترة إقامتك.'
                : 'Experience an array of premium leisure, wellness, and lifestyle spaces crafted for supreme relaxation.'}
            </p>
          </div>

          <button
            onClick={handleConcierge}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 text-xs font-semibold border border-stone-200 shadow-2xs transition-colors cursor-pointer"
          >
            <BellRing size={15} className="text-amber-700" />
            <span>{isAr ? 'استفسر من الكونسيرج' : 'Concierge Assistance'}</span>
          </button>
        </div>

        {/* Visual Thumbnail Grid: Image -> Title -> Short Line -> View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {facilities.map((facility) => {
            const IconComp = facility.icon;

            return (
              <div
                key={facility.id}
                id={`facility-card-${facility.id}`}
                onClick={() => {
                  if (handleNavDept) {
                    handleNavDept(facility.dept);
                  }
                }}
                className="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-2xs hover:shadow-lg hover:border-amber-400/50 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                {/* Visual Thumbnail Image */}
                <div className="relative aspect-16/10 w-full overflow-hidden bg-stone-100">
                  <img
                    src={facility.image}
                    alt={isAr ? facility.name_ar : facility.name_en}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Icon floating badge */}
                  <div className="absolute top-2.5 start-2.5 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md text-amber-300 flex items-center justify-center border border-white/20 shadow-xs">
                    <IconComp size={15} />
                  </div>

                  {/* Location/Status tag */}
                  <div className="absolute bottom-2 start-2.5">
                    <span className="text-[10px] font-semibold text-white bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10">
                      {isAr ? facility.tag_ar : facility.tag_en}
                    </span>
                  </div>
                </div>

                {/* Content: Title -> One Short Line */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 font-serif leading-snug group-hover:text-amber-800 transition-colors">
                      {isAr ? facility.name_ar : facility.name_en}
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-1 leading-relaxed line-clamp-2">
                      {isAr ? facility.desc_ar : facility.desc_en}
                    </p>
                  </div>

                  {/* View Action Link */}
                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-[11px] font-semibold text-amber-900">
                    <span>{isAr ? 'عرض التفاصيل' : 'View Details'}</span>
                    <NextIcon size={13} className="group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1" />
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
