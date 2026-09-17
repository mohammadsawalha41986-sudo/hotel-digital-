import React from 'react';
import {
  ConciergeBell,
  Sparkles,
  Car,
  Shirt,
  Luggage,
  Wrench,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { Language } from '../../types/hotel';
import { getTranslation } from '../../utils/i18n';

interface HotelServicesSectionProps {
  language: Language;
  hotelWhatsapp: string;
  hotelPhone: string;
  roomNumber?: string;
}

export const HotelServicesSection: React.FC<HotelServicesSectionProps> = ({
  language,
  hotelWhatsapp,
  hotelPhone,
  roomNumber,
}) => {
  const isAr = language === 'ar';
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const services = [
    {
      id: 'concierge',
      icon: ConciergeBell,
      title_en: 'Les Clefs d’Or Concierge',
      title_ar: 'خدمة الكونسيرج الذهبية',
      desc_en: 'Private city tours, luxury yacht charters, private jet coordination, and sold-out event bookings.',
      desc_ar: 'حجوزات اليخوت الفاخرة، الجولات السياحية الخاصة، وتنظيم الفعاليات وكبار الشخصيات.',
      badge_en: '24/7 Desk',
      badge_ar: 'مكتب على مدار الساعة',
    },
    {
      id: 'valet',
      icon: Car,
      title_en: 'VIP Valet & Limousine',
      title_ar: 'خدمة صف السيارات والليموزين',
      desc_en: 'Complimentary covered valet parking, EV supercharging, and private chauffeur transfers.',
      desc_ar: 'مواقف مغطاة مجانية، شواحن فائقة للسيارات الكهربائية، وسيارات ليموزين مع سائق خاص.',
      badge_en: 'Express Delivery',
      badge_ar: 'استلام فوري',
    },
    {
      id: 'laundry',
      icon: Shirt,
      title_en: 'Express Dry Cleaning & Laundry',
      title_ar: 'المغسلة السريعة والتنظيف الجاف',
      desc_en: 'Same-day delicate garment care, suit pressing within 60 minutes, and eco-friendly wash.',
      desc_ar: 'تنظيف جاف متطور، كي البدل الرسمية خلال 60 دقيقة، وعناية فائقة بالأقمشة الحساسة.',
      badge_en: '60 Min Pressing',
      badge_ar: 'كي سريع 60 دقيقة',
    },
    {
      id: 'housekeeping',
      icon: Sparkles,
      title_en: 'Turndown & Housekeeping',
      title_ar: 'التدبير الفندقي وخدمة المساء',
      desc_en: 'Evening aromatherapy turndown, pillow menu selection, and extra hypoallergenic linens.',
      desc_ar: 'خدمة المساء العطرية، قائمة اختيار الوسائد، وتوفير أغطية ومستلزمات إضافية حسب الطلب.',
      badge_en: 'On Demand',
      badge_ar: 'حسب الطلب',
    },
    {
      id: 'luggage',
      icon: Luggage,
      title_en: 'Luggage Storage & Porterage',
      title_ar: 'حفظ الحقائب والمساعد الشخصي',
      desc_en: 'Secure luggage sanctuary before check-in or after check-out with express delivery to room.',
      desc_ar: 'مستودع آمن لحفظ الأمتعة قبل الدخول أو بعد المغادرة مع التوصيل الفوري للجناح.',
      badge_en: 'Complimentary',
      badge_ar: 'خدمة مجانية',
    },
    {
      id: 'maintenance',
      icon: Wrench,
      title_en: 'Fast In-Suite Assistance',
      title_ar: 'الصيانة الفورية للدعم الفني',
      desc_en: 'Rapid in-room technical support for climate control, high-speed WiFi, or multimedia setups.',
      desc_ar: 'دعم فني سريع لأجهزة التكييف والإنترنت وأنظمة الترفيه والصوتيات داخل الجناح.',
      badge_en: '10 Min Dispatch',
      badge_ar: 'استجابة خلال 10 دقائق',
    },
  ];

  return (
    <section id="hotel-services" className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full mb-2">
              <ConciergeBell size={13} />
              <span>{isAr ? 'خدمات النزلاء الحصرية' : 'GUEST RECEPTION & SERVICES'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
              {t('services_section_title')}
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl mt-1.5 leading-relaxed">
              {t('services_section_subtitle')}
            </p>
          </div>

          <div className="text-xs text-stone-500">
            {roomNumber ? (
              <span className="font-semibold text-stone-900">
                {t('room_number')}: {roomNumber}
              </span>
            ) : (
              <span>{t('scan_qr')}</span>
            )}
          </div>
        </div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.id}
                className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/90 hover:border-stone-300 hover:bg-stone-50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-white border border-stone-200/90 text-stone-900 flex items-center justify-center group-hover:bg-amber-900 group-hover:text-white transition-colors">
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-700">
                      {isAr ? svc.badge_ar : svc.badge_en}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 mb-2">
                    {isAr ? svc.title_ar : svc.title_en}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {isAr ? svc.desc_ar : svc.desc_en}
                  </p>
                </div>

                <div className="pt-5 border-t border-stone-200/60 mt-4 flex items-center justify-between">
                  <a
                    href={`tel:${hotelPhone}`}
                    className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 transition-colors"
                  >
                    <Phone size={11} />
                    <span>{hotelPhone}</span>
                  </a>

                  <a
                    href={`https://wa.me/${hotelWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      isAr
                        ? `مرحباً، أود طلب خدمة ${svc.title_ar} ${roomNumber ? `للغرفة رقم ${roomNumber}` : ''}`
                        : `Hello, I'd like to request ${svc.title_en} ${roomNumber ? `for Room ${roomNumber}` : ''}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-stone-900 hover:text-amber-800 transition-colors cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>{isAr ? 'طلب الخدمة' : 'Request'}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
