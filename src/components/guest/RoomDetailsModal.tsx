import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Bed,
  Users,
  Eye,
  Coffee,
  Sparkles,
  Bath,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Star,
  Cigarette,
  CigaretteOff,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Volume2,
  Tv,
  Wine,
  UserCheck,
  Moon,
  Laptop,
  Sliders,
  Waves,
  Utensils,
  Compass,
} from 'lucide-react';
import { RoomType, Language } from '../../types/hotel';
import { getTranslation } from '../../utils/i18n';
import { buildWhatsAppLink } from '../../utils/operatingStatus';
import { MessageSquare, Phone } from 'lucide-react';

interface RoomDetailsModalProps {
  room: RoomType | null;
  currency: string;
  language: Language;
  hotelWhatsApp?: string;
  hotelPhone?: string;
  hotelNameEn?: string;
  hotelNameAr?: string;
  onClose: () => void;
}

export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  room,
  currency,
  language,
  hotelWhatsApp,
  hotelPhone = '+966112349999',
  hotelNameEn = 'Swiss Flora Hotel',
  hotelNameAr = 'فندق سويس فلورا',
  onClose,
}) => {
  if (!room) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const isAr = language === 'ar';
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);
  const NextIcon = isAr ? ArrowLeft : ArrowRight;

  const handleContactReservations = () => {
    const roomName = isAr ? room.name_ar : room.name_en;
    const msg = isAr
      ? `مرحباً قسم الحجوزات في ${hotelNameAr}، أود الاستفسار عن توفر وإمكانية حجز: ${roomName}`
      : `Hello Reservations at ${hotelNameEn}, I would like to inquire about availability and reservation details for: ${roomName}`;
    const cleanNumber = (hotelWhatsApp || '+966112349999').replace(/[^0-9]/g, '');
    window.open(buildWhatsAppLink(cleanNumber, msg), '_blank');
  };

  const currentPrice = room.offer_price || room.base_price;
  const hasOffer = room.offer_price && room.old_price && room.offer_price < room.old_price;

  // Icon mapping for amenities
  const getAmenityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bath':
        return <Bath size={16} className="text-amber-800" />;
      case 'UserCheck':
        return <UserCheck size={16} className="text-amber-800" />;
      case 'Coffee':
        return <Coffee size={16} className="text-amber-800" />;
      case 'Volume2':
        return <Volume2 size={16} className="text-amber-800" />;
      case 'Sparkles':
        return <Sparkles size={16} className="text-amber-800" />;
      case 'Wifi':
        return <Wifi size={16} className="text-amber-800" />;
      case 'Moon':
        return <Moon size={16} className="text-amber-800" />;
      case 'Wine':
        return <Wine size={16} className="text-amber-800" />;
      case 'Laptop':
        return <Laptop size={16} className="text-amber-800" />;
      case 'Sliders':
        return <Sliders size={16} className="text-amber-800" />;
      case 'Tv':
        return <Tv size={16} className="text-amber-800" />;
      case 'Waves':
        return <Waves size={16} className="text-amber-800" />;
      case 'Utensils':
        return <Utensils size={16} className="text-amber-800" />;
      case 'Compass':
        return <Compass size={16} className="text-amber-800" />;
      default:
        return <Sparkles size={16} className="text-amber-800" />;
    }
  };

  return (
    <div
      id="room-details-dialog"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex justify-center p-3 sm:p-6"
    >
      <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Sticky Modal Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
              {isAr ? room.category_ar : room.category_en}
            </span>
            <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 tracking-tight line-clamp-1">
              {isAr ? room.name_ar : room.name_en}
            </h2>
          </div>

          <button
            id="close-room-details-btn"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close suite details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          {/* 1. Large Image Gallery with Interactive Thumbnails */}
          <div className="space-y-3">
            <div className="relative h-[320px] sm:h-[460px] rounded-2xl overflow-hidden bg-stone-900 group">
              <img
                src={room.images[activeImageIndex] || room.images[0]}
                alt={isAr ? room.name_ar : room.name_en}
                className="w-full h-full object-cover transition-all duration-300"
              />

              {/* Prev / Next controls */}
              {room.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev - 1 + room.images.length) % room.images.length)
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md cursor-pointer transition-opacity"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev + 1) % room.images.length)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md cursor-pointer transition-opacity"
                    aria-label="Next photo"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Photo Index Indicator */}
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono">
                {activeImageIndex + 1} / {room.images.length}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {room.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {room.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-amber-700 ring-2 ring-amber-700/30'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Top Overview & Pricing Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-stone-50 border border-stone-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {room.rating && (
                  <div className="flex items-center gap-1 text-xs font-bold text-stone-900">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    <span>{room.rating}</span>
                    <span className="text-stone-400 font-normal">({room.reviews_count} reviews)</span>
                  </div>
                )}
                {hasOffer && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {isAr ? room.offer_badge_ar : room.offer_badge_en}
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                {isAr ? room.name_ar : room.name_en}
              </h3>
            </div>

            <div className="text-left sm:text-right">
              {hasOffer && (
                <span className="text-xs text-stone-400 line-through font-mono block">
                  {room.old_price?.toLocaleString()} {currency}
                </span>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                  {currentPrice.toLocaleString()} {currency}
                </span>
                <span className="text-xs text-stone-500">{t('room_per_night')}</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium block">
                {isAr ? 'شامل الإفطار والضرائب' : 'Breakfast & Taxes Included'}
              </span>
            </div>
          </div>

          {/* 3. Detailed Specifications Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
              {t('room_overview')}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                  <Maximize2 size={14} />
                  <span>{t('room_size')}</span>
                </div>
                <span className="font-bold text-stone-900 text-sm">{room.size_sqm} m²</span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                  <Bed size={14} />
                  <span>{t('room_bed')}</span>
                </div>
                <span className="font-bold text-stone-900 truncate block" title={isAr ? room.bed_type_ar : room.bed_type_en}>
                  {isAr ? room.bed_type_ar : room.bed_type_en}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                  <Users size={14} />
                  <span>{t('room_occupancy')}</span>
                </div>
                <span className="font-bold text-stone-900">
                  {isAr ? `حتى ${room.occupancy.max_guests} نزلاء` : `Max ${room.occupancy.max_guests} Guests`}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-1.5 text-stone-500 mb-1">
                  <Eye size={14} />
                  <span>{t('room_view')}</span>
                </div>
                <span className="font-bold text-stone-900 truncate block" title={isAr ? room.view_ar : room.view_en}>
                  {isAr ? room.view_ar : room.view_en}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Full Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {isAr ? 'الوصف الكامل للجناح' : 'Suite Experience & Design'}
            </h4>
            <p className="text-sm text-stone-700 leading-relaxed font-normal">
              {isAr ? room.description_ar : room.description_en}
            </p>
          </div>

          {/* 5. Breakfast and Smoking Policies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-start gap-3">
              <Coffee size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900 block mb-0.5">{t('room_breakfast')}</span>
                <span className="text-emerald-800">
                  {isAr ? room.breakfast_info_ar : room.breakfast_info_en}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
              {room.smoking_policy_en.toLowerCase().includes('non-smoking') ? (
                <CigaretteOff size={18} className="text-stone-600 shrink-0 mt-0.5" />
              ) : (
                <Cigarette size={18} className="text-stone-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-stone-900 block mb-0.5">{t('smoking_policy')}</span>
                <span className="text-stone-600">
                  {isAr ? room.smoking_policy_ar : room.smoking_policy_en}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Comprehensive Amenities Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
              {t('room_amenities')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.amenities.map((am) => (
                <div
                  key={am.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-stone-50/80 border border-stone-200/60 text-xs text-stone-800 font-medium"
                >
                  <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/70">
                    {getAmenityIcon(am.icon)}
                  </div>
                  <span>{isAr ? am.name_ar : am.name_en}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Key Features / Privileges */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
              {isAr ? 'الامتيازات الإضافية المشمولة' : 'Included Residency Privileges'}
            </h4>
            <div className="space-y-2 text-xs text-stone-700">
              {(isAr ? room.features_ar : room.features_en).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 8. Policies & Check-in Details */}
          <div className="p-4 rounded-xl bg-stone-100/70 border border-stone-200 text-xs text-stone-600 space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-stone-800">
              <Calendar size={14} className="text-stone-500" />
              <span>{t('check_in_out')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>{t('cancel_policy')}</span>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-5 sm:p-6 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-start w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
              {isAr ? 'مواصفات وتجهيزات الجناح' : 'SANCTUARY SPECIFICATIONS'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base sm:text-lg font-serif font-bold text-stone-900">
                {room.size_sqm} m²
              </span>
              <span className="text-xs text-stone-500">•</span>
              <span className="text-xs text-stone-600 font-medium">
                {isAr ? room.bed_type_ar : room.bed_type_en}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="py-3 px-5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              {t('back_to_rooms')}
            </button>

            {hotelPhone && (
              <a
                href={`tel:${hotelPhone}`}
                className="p-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 flex items-center justify-center transition-colors"
                title={isAr ? 'اتصال هاتفي' : 'Direct Call'}
              >
                <Phone size={16} />
              </a>
            )}

            <button
              id="modal-contact-reservations-btn"
              onClick={handleContactReservations}
              className="flex-1 sm:flex-none py-3 px-7 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--hotel-button, #8b6f4e)',
              }}
            >
              <MessageSquare size={16} />
              <span>{isAr ? 'تواصل مع الحجوزات' : 'Contact Reservations'}</span>
              <NextIcon size={16} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
