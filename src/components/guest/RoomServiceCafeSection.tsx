import React from 'react';
import {
  Coffee,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
} from 'lucide-react';
import { Language } from '../../types/hotel';
import { getTranslation } from '../../utils/i18n';

interface RoomServiceCafeSectionProps {
  language: Language;
  hotelPhone: string;
  hotelWhatsapp: string;
  roomNumber?: string;
}

export const RoomServiceCafeSection: React.FC<RoomServiceCafeSectionProps> = ({
  language,
  hotelPhone,
  hotelWhatsapp,
  roomNumber,
}) => {
  const isAr = language === 'ar';
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  return (
    <section id="room-service-cafe" className="py-16 sm:py-20 bg-stone-100/60 border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: 24/7 In-Room Dining */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
                  <UtensilsCrossed size={22} />
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>24/7 Live Room Service</span>
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mb-2">
                  {t('room_service_title')}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {t('room_service_desc')}
                </p>
              </div>

              <div className="space-y-2 text-xs text-stone-700 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{isAr ? 'قائمة إفطار صباحي تفتح من 06:00 إلى 11:30' : 'Breakfast served from 06:00 to 11:30 AM'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{isAr ? 'أطباق ساخنة ومقبلات وحلويات على مدار الساعة' : 'All-day hot savories, pastas & desserts'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{isAr ? 'عربة تقديم فضية وتجهيز متكامل داخل الجناح' : 'White-glove in-suite trolley staging'}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 mt-4">
              <span className="text-xs text-stone-500 font-medium">
                {roomNumber ? `${t('room_number')}: ${roomNumber}` : t('scan_qr')}
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${hotelPhone}`}
                  className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer"
                  title="Call In-Room Dining"
                >
                  <PhoneCall size={16} />
                </a>

                <a
                  href={`https://wa.me/${hotelWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    isAr
                      ? `مرحباً، أود طلب خدمة الغرف ${roomNumber ? `للغرفة رقم ${roomNumber}` : ''}`
                      : `Hello, I'd like to place an In-Room Dining order ${roomNumber ? `for Room ${roomNumber}` : ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <MessageSquare size={14} />
                  <span>{isAr ? 'طلب عبر الواتساب' : 'Order via WhatsApp'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Card 2: Lobby Lounge & Artisan Café */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center">
                  <Coffee size={22} />
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  07:00 AM – Midnight
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mb-2">
                  {t('cafe_title')}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {t('cafe_desc')}
                </p>
              </div>

              <div className="space-y-2 text-xs text-stone-700 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-amber-600" />
                  <span>{isAr ? 'قهوة مختصة حبوب أرابيكا 100% وتحضير V60' : 'Single-origin specialty coffee & V60 pourover'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-amber-600" />
                  <span>{isAr ? 'جلسات شاي ما بعد الظهيرة البريطانية الفاخرة' : 'Traditional afternoon high tea service'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-amber-600" />
                  <span>{isAr ? 'كرواسون ومخبوزات فرنسية طازجة يومياً' : 'Daily artisanal French viennoiseries & pastries'}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100 flex items-center justify-between mt-4">
              <span className="text-xs text-stone-500 font-medium">
                {isAr ? 'موقع الكافيه: ردهة الفندق الرئيسية' : 'Location: Grand Lobby Ground Floor'}
              </span>

              <a
                href={`https://wa.me/${hotelWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  isAr ? 'مرحباً، أود الاستفسار عن حجز شاي بعد الظهيرة في الكافيه' : 'Hello, I would like to inquire about afternoon tea at the lounge'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span>{isAr ? 'الاستفسار والحجز' : 'Inquire & Reserve'}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
