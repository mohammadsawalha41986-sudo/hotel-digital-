import React from 'react';
import {
  Info,
  Clock,
  Wifi,
  Car,
  CreditCard,
} from 'lucide-react';
import { Language } from '../../types/hotel';
import { getTranslation } from '../../utils/i18n';

interface HotelInfoSectionProps {
  language: Language;
}

export const HotelInfoSection: React.FC<HotelInfoSectionProps> = ({ language }) => {
  const isAr = language === 'ar';
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  return (
    <section id="hotel-info" className="py-16 sm:py-20 bg-stone-50 border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full mb-2">
            <Info size={13} />
            <span>{isAr ? 'دليل النزيل والإقامة' : 'PROPERTY ESSENTIALS & POLICIES'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
            {t('info_section_title')}
          </h2>
          <p className="text-sm text-stone-600 max-w-2xl mt-1.5 leading-relaxed">
            {t('info_section_subtitle')}
          </p>
        </div>

        {/* 4 Cards Grid for Key Hotel Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Check-in / Check-out */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900">
              {isAr ? 'مواعيد الدخول والمغادرة' : 'Check-In & Check-Out'}
            </h3>
            <div className="text-xs text-stone-600 space-y-1">
              <p>
                <strong>{isAr ? 'تسجيل الوصول:' : 'Check-in:'}</strong> 03:00 PM
              </p>
              <p>
                <strong>{isAr ? 'تسجيل المغادرة:' : 'Check-out:'}</strong> 12:00 PM (Noon)
              </p>
              <p className="text-[11px] text-stone-400 pt-1">
                {isAr ? 'تتوفر مغادرة متأخرة مجانية لأعضاء النخبة' : 'Complimentary late checkout upon availability'}
              </p>
            </div>
          </div>

          {/* Card 2: High-Speed WiFi */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center">
              <Wifi size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900">
              {isAr ? 'الإنترنت والواي فاي فائق السرعة' : 'High-Speed Wi-Fi'}
            </h3>
            <div className="text-xs text-stone-600 space-y-1">
              <p>
                <strong>{isAr ? 'الشبكة:' : 'Network:'}</strong> GrandPalace-Guest
              </p>
              <p>
                <strong>{isAr ? 'السرعة:' : 'Bandwidth:'}</strong> 500 Mbps Fiber
              </p>
              <p className="text-[11px] text-stone-400 pt-1">
                {isAr ? 'اتصال تلقائي بمجرد مسح رمز الغرفة' : 'Auto-connects via in-room QR code scan'}
              </p>
            </div>
          </div>

          {/* Card 3: Parking & Valet */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
              <Car size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900">
              {isAr ? 'المواقف وشواحن المركبات' : 'Valet & EV Superchargers'}
            </h3>
            <div className="text-xs text-stone-600 space-y-1">
              <p>
                <strong>{isAr ? 'المواقف:' : 'Valet:'}</strong> {isAr ? 'مجانية لجميع النزلاء' : 'Complimentary for residents'}
              </p>
              <p>
                <strong>{isAr ? 'شواحن السيارات:' : 'EV Plugs:'}</strong> 8 Tesla / Type 2
              </p>
              <p className="text-[11px] text-stone-400 pt-1">
                {isAr ? 'مواقف آمنة ومراقبة بالكاميرات 24/7' : '24/7 CCTV surveillance & covered bays'}
              </p>
            </div>
          </div>

          {/* Card 4: Folio & Guarantee */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900">
              {isAr ? 'سياسة الدفع والإلغاء' : 'Payment & Cancellation'}
            </h3>
            <div className="text-xs text-stone-600 space-y-1">
              <p>
                <strong>{isAr ? 'الدفع المسبق:' : 'Upfront charge:'}</strong> {isAr ? 'بدون دفع إلكتروني' : 'No online deposit'}
              </p>
              <p>
                <strong>{isAr ? 'الإلغاء:' : 'Cancellation:'}</strong> {isAr ? 'مجاني حتى 24 ساعة' : 'Free up to 24h prior'}
              </p>
              <p className="text-[11px] text-stone-400 pt-1">
                {isAr ? 'يتم الدفع بالاستقبال عند الوصول' : 'Settlement at front desk upon arrival'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
