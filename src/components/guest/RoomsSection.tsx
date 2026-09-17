import React from 'react';
import {
  Bed,
  Maximize2,
  Users,
  Eye,
  Coffee,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  Phone,
} from 'lucide-react';
import { RoomType, Language } from '../../types/hotel';
import { buildWhatsAppLink } from '../../utils/operatingStatus';

interface RoomsSectionProps {
  rooms: RoomType[];
  currency: string;
  language: Language;
  hotelWhatsApp?: string;
  hotelPhone?: string;
  hotelNameEn?: string;
  hotelNameAr?: string;
  showPrice?: boolean;
  onViewRoomDetails?: (room: RoomType) => void;
  onSelectRoom?: (room: RoomType) => void;
  onContactReservations?: (room: RoomType) => void;
}

export const RoomsSection: React.FC<RoomsSectionProps> = ({
  rooms,
  currency,
  language,
  hotelWhatsApp,
  hotelPhone,
  hotelNameEn = 'Swiss Flora Hotel',
  hotelNameAr = 'فندق سويس فلورا',
  showPrice = false,
  onViewRoomDetails,
  onSelectRoom,
  onContactReservations,
}) => {
  const isAr = language === 'ar';
  const NextIcon = isAr ? ArrowLeft : ArrowRight;
  const handleViewRoom = onViewRoomDetails || onSelectRoom;

  const handleContactReservationsDirect = (room: RoomType) => {
    if (onContactReservations) {
      onContactReservations(room);
      return;
    }
    const roomName = isAr ? room.name_ar : room.name_en;
    const msg = isAr
      ? `مرحباً قسم الحجوزات في ${hotelNameAr}، أود الاستفسار عن توفر وإمكانية حجز: ${roomName}`
      : `Hello Reservations at ${hotelNameEn}, I would like to inquire about availability and details for: ${roomName}`;
    const cleanNumber = (hotelWhatsApp || '+966112349999').replace(/[^0-9]/g, '');
    window.open(buildWhatsAppLink(cleanNumber, msg), '_blank');
  };

  return (
    <section id="rooms-suites" className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full mb-2">
              <Bed size={13} />
              <span>{isAr ? 'أجنحة وغرف الفندق' : 'ROOMS & SUITES SHOWCASE'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
              {isAr ? 'أجنحة وغرف الإقامة الفاخرة' : 'Signature Rooms & Executive Suites'}
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl mt-1.5 leading-relaxed">
              {isAr
                ? 'استكشف التنوع المعماري والراحة الفائقة لأجنحة وغرف الإقامة الفاخرة مع قائمة المزايا والتجهيزات المتكاملة.'
                : 'Explore our curated collection of luxury sanctuaries and executive suites designed for supreme relaxation.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200/70 self-start md:self-auto">
            <Sparkles size={15} className="text-amber-700" />
            <span>{isAr ? 'استعراض فندقي فاخر' : 'Verified Luxury Showcase'}</span>
          </div>
        </div>

        {/* Room Cards Stack (Pure Showcase - No Booking Engine) */}
        <div className="space-y-8">
          {rooms.map((room) => {
            const currentPrice = room.offer_price || room.base_price;

            return (
              <div
                key={room.id}
                id={`room-card-${room.slug}`}
                className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-2xs hover:shadow-lg hover:border-amber-400/40 transition-all grid grid-cols-1 lg:grid-cols-12 gap-0"
              >
                {/* Photo Preview */}
                <div
                  onClick={() => handleViewRoom && handleViewRoom(room)}
                  className="lg:col-span-5 relative min-h-[260px] sm:min-h-[320px] bg-stone-100 overflow-hidden group cursor-pointer"
                >
                  <img
                    src={room.images[0]}
                    alt={isAr ? room.name_ar : room.name_en}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25 pointer-events-none" />

                  {/* Top Category Badge */}
                  <div className="absolute top-4 start-4 end-4 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-stone-900/90 text-amber-300 backdrop-blur-md border border-stone-700">
                      {isAr ? room.category_ar : room.category_en}
                    </span>
                  </div>

                  {/* View Indicator & Size */}
                  <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between text-xs text-white">
                    {room.view_en && (
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                        <Eye size={13} className="text-amber-400" />
                        <span className="text-[11px]">{isAr ? room.view_ar : room.view_en}</span>
                      </div>
                    )}
                    <span className="text-[11px] text-amber-300 font-semibold bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                      {room.size_sqm} m²
                    </span>
                  </div>
                </div>

                {/* Center / Specifications & Amenities */}
                <div className="lg:col-span-4 p-6 sm:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-e border-stone-200/80">
                  <div className="space-y-4">
                    <div>
                      <h3
                        onClick={() => handleViewRoom && handleViewRoom(room)}
                        className="text-xl sm:text-2xl font-serif font-bold text-stone-900 hover:text-amber-800 transition-colors cursor-pointer"
                      >
                        {isAr ? room.name_ar : room.name_en}
                      </h3>
                      <p className="text-xs text-stone-600 mt-2 line-clamp-3 leading-relaxed">
                        {isAr ? room.description_ar : room.description_en}
                      </p>
                    </div>

                    {/* Room Attributes Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-stone-700 border-t border-stone-100">
                      <div className="flex items-center gap-2">
                        <Bed size={15} className="text-amber-700 shrink-0" />
                        <span>{isAr ? room.bed_type_ar : room.bed_type_en}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-amber-700 shrink-0" />
                        <span>
                          {room.occupancy.max_guests} {isAr ? 'ضيوف كحد أقصى' : 'Max Guests'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Maximize2 size={15} className="text-amber-700 shrink-0" />
                        <span>{room.size_sqm} m²</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coffee size={15} className="text-amber-700 shrink-0" />
                        <span>{room.breakfast_included ? (isAr ? 'إفطار مجاني' : 'Breakfast Incl.') : (isAr ? 'إفطار اختياري' : 'Room Only')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amenities Chips */}
                  <div className="pt-4 mt-4 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
                    {room.amenities.slice(0, 3).map((am) => (
                      <span
                        key={am.id}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700"
                      >
                        {isAr ? am.name_ar : am.name_en}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="text-[10px] text-stone-400 font-medium">
                        +{room.amenities.length - 3} {isAr ? 'مزايا إضافية' : 'more'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right / Showcase Actions (No Booking Engine Language) */}
                <div className="lg:col-span-3 p-6 sm:p-7 bg-stone-50/70 flex flex-col justify-between">
                  <div>
                    {showPrice ? (
                      <div className="mb-4">
                        <span className="text-[11px] text-stone-500 font-medium block mb-1">
                          {isAr ? 'القيمة التقديرية' : 'Estimated Value'}
                        </span>
                        <div className="flex items-baseline gap-1.5 mb-2">
                          <span className="text-2xl sm:text-3xl font-bold font-serif text-stone-900">
                            {currentPrice.toLocaleString()} {currency}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6 space-y-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                          <Sparkles size={13} />
                          <span>{isAr ? 'إقامة فندقية فاخرة' : 'Signature Comfort'}</span>
                        </span>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          {isAr
                            ? 'عزل صوتي فائق، مفارش سويسرية فاخرة، وتجهيزات ذكية مصممة لضمان نوم هادئ ومريح.'
                            : 'Acoustic soundproofing, luxury Egyptian linens, and smart climate controls crafted for serene rest.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pure Showcase Actions */}
                  <div className="space-y-2.5">
                    {/* Primary CTA: View Room & Details */}
                    <button
                      id={`view-room-details-btn-${room.slug}`}
                      onClick={() => handleViewRoom && handleViewRoom(room)}
                      className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 group"
                      style={{
                        backgroundColor: 'var(--hotel-button, #8b6f4e)',
                      }}
                    >
                      <span>{isAr ? 'عرض الغرفة والتفاصيل' : 'View Room & Details'}</span>
                      <NextIcon size={15} className="group-hover:translate-x-0.5 transition-transform rtl:group-hover:-translate-x-0.5" />
                    </button>

                    {/* Secondary CTA: Contact Reservations */}
                    <div className="flex items-center gap-2">
                      <button
                        id={`contact-reservations-btn-${room.slug}`}
                        onClick={() => handleContactReservationsDirect(room)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200/90 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={14} className="text-emerald-600 shrink-0" />
                        <span>{isAr ? 'تواصل مع الحجوزات' : 'Contact Reservations'}</span>
                      </button>

                      {hotelPhone && (
                        <a
                          href={`tel:${hotelPhone}`}
                          className="py-2.5 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/90 text-xs font-semibold transition-all flex items-center justify-center"
                          title={isAr ? 'اتصال هاتفي' : 'Call Reservations'}
                        >
                          <Phone size={14} className="text-stone-600" />
                        </a>
                      )}
                    </div>
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
