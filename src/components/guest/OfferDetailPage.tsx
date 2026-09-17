import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ShieldCheck,
  Tag,
  MessageSquare,
  Sparkles,
  UtensilsCrossed,
  HeartHandshake,
  Shirt,
  BedDouble,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { HotelOffer, Language, Hotel } from '../../types/hotel';
import { TopLevelDepartment } from '../../types/department';
import { buildWhatsAppLink } from '../../utils/operatingStatus';

interface OfferDetailPageProps {
  offer: HotelOffer;
  hotel: Hotel;
  language: Language;
  currency: string;
  roomNumber?: string;
  onBack: () => void;
  onNavigateDepartment: (dept: TopLevelDepartment) => void;
}

export const OfferDetailPage: React.FC<OfferDetailPageProps> = ({
  offer,
  hotel,
  language,
  currency,
  roomNumber = '',
  onBack,
  onNavigateDepartment,
}) => {
  const isAr = language === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState(0);

  // Combine main image and any gallery photos
  const galleryImages = [
    offer.image_url,
    ...(offer.gallery || []),
  ].filter(Boolean);

  const activeImage = galleryImages[selectedGalleryIdx] || offer.image_url;

  const savings =
    offer.original_price && offer.offer_price && offer.original_price > offer.offer_price
      ? offer.original_price - offer.offer_price
      : 0;

  const discountPercent =
    offer.original_price && offer.offer_price && offer.original_price > offer.offer_price
      ? Math.round(((offer.original_price - offer.offer_price) / offer.original_price) * 100)
      : 0;

  // Determine parent department info
  const getParentDeptInfo = () => {
    switch (offer.department) {
      case 'restaurant':
      case 'cafe':
      case 'room_service':
        return {
          deptKey: 'dining' as TopLevelDepartment,
          label_en: 'Food & Beverage',
          label_ar: 'المأكولات والمشروبات',
          icon: UtensilsCrossed,
          whatsapp: hotel.departments.find((d) => d.code === 'dining')?.whatsapp_number || hotel.whatsapp_number,
        };
      case 'health_club':
        return {
          deptKey: 'wellness' as TopLevelDepartment,
          label_en: 'Health Club & Spa',
          label_ar: 'النادي الصحي والسبا',
          icon: HeartHandshake,
          whatsapp: hotel.departments.find((d) => d.code === 'wellness')?.whatsapp_number || hotel.whatsapp_number,
        };
      case 'laundry':
        return {
          deptKey: 'laundry' as TopLevelDepartment,
          label_en: 'Laundry & Dry Cleaning',
          label_ar: 'المغسلة والعناية بالملابس',
          icon: Shirt,
          whatsapp: hotel.departments.find((d) => d.code === 'housekeeping')?.whatsapp_number || hotel.whatsapp_number,
        };
      case 'rooms':
        return {
          deptKey: 'stay' as TopLevelDepartment,
          label_en: 'Guest Rooms & Suites',
          label_ar: 'الغرف والأجنحة الفندقية',
          icon: BedDouble,
          whatsapp: hotel.departments.find((d) => d.code === 'rooms')?.whatsapp_number || hotel.whatsapp_number,
        };
      default:
        return {
          deptKey: 'dining' as TopLevelDepartment,
          label_en: 'Hotel Guest Services',
          label_ar: 'خدمات النزلاء',
          icon: Sparkles,
          whatsapp: hotel.whatsapp_number,
        };
    }
  };

  const parentDept = getParentDeptInfo();
  const DeptIcon = parentDept.icon;

  const handleWhatsAppBooking = () => {
    const cleanNumber = (parentDept.whatsapp || hotel.whatsapp_number || '+966112349999').replace(/[^0-9]/g, '');
    const offerTitle = isAr ? offer.title_ar : offer.title_en;
    const hotelName = isAr ? hotel.name_ar : hotel.name_en;

    const message = isAr
      ? `مرحباً ${hotelName}، أود الاستفادة من العرض الخاص:\n` +
        `*${offerTitle}*\n` +
        `السعر: ${offer.offer_price} ${currency}\n` +
        (roomNumber ? `رقم الغرفة: ${roomNumber}\n` : '') +
        `أرجو تأكيد التفاصيل وحجز الموعد.`
      : `Hello ${hotelName}, I would like to redeem the special offer:\n` +
        `*${offerTitle}*\n` +
        `Offer Price: ${offer.offer_price} ${currency}\n` +
        (roomNumber ? `Room Number: ${roomNumber}\n` : '') +
        `Please confirm details and arrange my request.`;

    window.open(buildWhatsAppLink(cleanNumber, message), '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-900" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Sticky Header */}
      <div className="bg-white border-b border-stone-200/90 sticky top-16 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer py-1"
          >
            <BackIcon size={16} />
            <span>{isAr ? 'العودة إلى كافة العروض' : 'Back to All Offers'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="hidden sm:inline">{isAr ? hotel.name_ar : hotel.name_en}</span>
            <span className="hidden sm:inline">•</span>
            <span className="font-semibold text-amber-800">{isAr ? parentDept.label_ar : parentDept.label_en}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Visual & Gallery (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Primary Image Viewport */}
            <div className="relative h-72 sm:h-96 rounded-3xl overflow-hidden bg-stone-900 shadow-md border border-stone-200/80 group">
              <img
                src={activeImage}
                alt={isAr ? offer.title_ar : offer.title_en}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Department Badge */}
              <div className="absolute top-4 start-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                  <DeptIcon size={13} className="text-amber-400" />
                  <span>{isAr ? parentDept.label_ar : parentDept.label_en}</span>
                </span>

                {discountPercent > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
                    {isAr ? `خصم ${discountPercent}%` : `${discountPercent}% OFF`}
                  </span>
                )}
              </div>

              {/* Tag / Badge */}
              <div className="absolute bottom-4 start-4 text-white">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-600/90 backdrop-blur-xs text-white">
                  {isAr ? offer.badge_ar : offer.badge_en}
                </span>
              </div>

              {/* Gallery Controls if > 1 Image */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-4 end-4 flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setSelectedGalleryIdx((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
                    }
                    className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-mono text-white/90 px-2 py-0.5 bg-black/50 rounded-full">
                    {selectedGalleryIdx + 1}/{galleryImages.length}
                  </span>
                  <button
                    onClick={() =>
                      setSelectedGalleryIdx((prev) => (prev + 1) % galleryImages.length)
                    }
                    className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Gallery Thumbnails (if multiple images exist) */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedGalleryIdx(i)}
                    className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedGalleryIdx === i ? 'border-amber-600 scale-105 shadow-xs' : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Full Detailed Description */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                {isAr ? 'تفاصيل ومميزات العرض' : 'Offer Details & Privileges'}
              </h2>
              <p className="text-sm text-stone-700 leading-relaxed font-normal">
                {isAr ? offer.description_ar : offer.description_en}
              </p>

              {/* Validity & Terms */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-stone-600">
                  <Calendar size={15} className="text-amber-700 shrink-0" />
                  <span>
                    {isAr ? 'فترة سريان العرض: ' : 'Validity Period: '}
                    <strong className="text-stone-900 font-semibold">{offer.valid_until}</strong>
                  </span>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-stone-600">
                  <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-stone-900 block mb-0.5">
                      {isAr ? 'الشروط والأحكام المطبقة:' : 'Terms & Conditions:'}
                    </span>
                    <span className="text-stone-600 leading-relaxed">
                      {isAr ? offer.terms_ar : offer.terms_en}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing, Action Box & Department Anchor (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Main Action & Pricing Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full mb-2">
                  <Tag size={12} />
                  <span>{isAr ? offer.badge_ar : offer.badge_en}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-stone-900 leading-snug">
                  {isAr ? offer.title_ar : offer.title_en}
                </h1>
              </div>

              {/* Price Display */}
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/70">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block mb-1">
                      {isAr ? 'سعر العرض الحصري' : 'Special Offer Price'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-serif font-bold text-stone-900">
                        {offer.offer_price.toLocaleString()}
                      </span>
                      <span className="text-sm font-semibold text-stone-600">{currency}</span>
                      {offer.department === 'rooms' && (
                        <span className="text-xs text-stone-500">{isAr ? '/ ليلة' : '/ night'}</span>
                      )}
                    </div>
                  </div>

                  {offer.original_price > offer.offer_price && (
                    <div className="text-end">
                      <span className="text-xs text-stone-400 line-through block">
                        {offer.original_price.toLocaleString()} {currency}
                      </span>
                      {savings > 0 && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {isAr ? `توفير ${savings} ${currency}` : `Save ${savings} ${currency}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Relevant CTA Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleWhatsAppBooking}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer touch-target"
                >
                  <MessageSquare size={16} />
                  <span>
                    {offer.department === 'restaurant' || offer.department === 'cafe' || offer.department === 'room_service'
                      ? isAr ? 'حجز وحفظ العرض عبر الواتساب' : 'Claim Offer via Dining WhatsApp'
                      : offer.department === 'health_club'
                      ? isAr ? 'حجز جلسة السبا عبر الواتساب' : 'Book Wellness Ritual on WhatsApp'
                      : isAr ? 'طلب الاستفادة من العرض عبر الواتساب' : 'Inquire & Claim via WhatsApp'}
                  </span>
                </button>

                <button
                  onClick={() => onNavigateDepartment(parentDept.deptKey)}
                  className="w-full py-3 px-5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <DeptIcon size={15} className="text-stone-600" />
                  <span>
                    {isAr ? `استكشف قسم ${parentDept.label_ar}` : `Explore ${parentDept.label_en}`}
                  </span>
                </button>
              </div>

              {/* Guarantees */}
              <div className="space-y-2 pt-4 border-t border-stone-100 text-xs text-stone-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{isAr ? 'تأكيد فوري عبر كونسيرج الفندق المعتمد' : 'Instant confirmation via official concierge'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{isAr ? 'أسعار رسمية شاملة لضريبة القيمة المضافة' : 'Official rates inclusive of VAT'}</span>
                </div>
              </div>
            </div>

            {/* Related Department Context Card */}
            <div className="bg-stone-100/70 rounded-3xl p-5 border border-stone-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <DeptIcon size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    {isAr ? 'القسم المسؤول' : 'OPERATIONAL DEPARTMENT'}
                  </span>
                  <h4 className="text-sm font-bold text-stone-900">
                    {isAr ? parentDept.label_ar : parentDept.label_en}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-stone-600 mt-3 leading-relaxed">
                {isAr
                  ? 'هذا العرض مقدم ومُدار مباشرة بواسطة فريق القسم الفندقي المختص لضمان أرقى معايير الضيافة والخدمة.'
                  : 'This offer is managed directly by the dedicated hotel department team to ensure premier hospitality standards.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
