import React, { useState } from 'react';
import {
  BellRing,
  Sparkles,
  Wrench,
  ConciergeBell,
  Wifi,
  Clock,
  CheckCircle,
  MessageSquare,
  Send,
  Plus,
  Minus,
  X,
} from 'lucide-react';
import { GuestServiceCatalogItem, GuestServiceRequest } from '../../types/department';
import { Language } from '../../types/hotel';
import { generateOperationalReference, saveOperationalRequest } from '../../utils/requestStore';
import { buildBilingualWhatsAppMessage, buildEncodedWhatsAppUrl } from '../../utils/whatsappMessageBuilder';
import { submitProductionRequest, normalizeDepartmentCode } from '../../services/requestService';

interface GuestServicesHubPageProps {
  hotelId?: string;
  hotelNameEn?: string;
  hotelNameAr?: string;
  services: GuestServiceCatalogItem[];
  currency: string;
  language: Language;
  roomNumber: string;
}

export const GuestServicesHubPage: React.FC<GuestServicesHubPageProps> = ({
  hotelId,
  hotelNameEn,
  hotelNameAr,
  services,
  currency: _currency,
  language,
  roomNumber,
}) => {
  const isAr = language === 'ar';
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<GuestServiceCatalogItem | null>(null);

  // Request form state
  const [guestName, setGuestName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [preferredTime, setPreferredTime] = useState(isAr ? 'في أقرب وقت ممكن' : 'As soon as possible');
  const [notes, setNotes] = useState('');
  const [confirmedReq, setConfirmedReq] = useState<GuestServiceRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = [
    { id: 'all', label_en: 'All Services', label_ar: 'كافة الخدمات', icon: BellRing },
    { id: 'housekeeping', label_en: 'Housekeeping', label_ar: 'خدمة الغرف والنظافة', icon: Sparkles },
    { id: 'engineering', label_en: 'Maintenance & AC', label_ar: 'الصيانة والتكييف', icon: Wrench },
    { id: 'front_office', label_en: 'Front Office & Luggage', label_ar: 'الاستقبال ونقل الحقائب', icon: ConciergeBell },
    { id: 'connectivity', label_en: 'Tech & Connectivity', label_ar: 'التقنية والشبكات', icon: Wifi },
  ];

  const filteredServices = services.filter((svc) => {
    if (!svc.is_active) return false;
    if (activeCategory === 'all') return true;
    return svc.department === activeCategory;
  });

  const handleOpenModal = (svc: GuestServiceCatalogItem) => {
    setSelectedService(svc);
    setQuantity(1);
    setNotes('');
    setConfirmedReq(null);
  };

  const handleConfirmRequest = () => {
    if (!selectedService) return;

    const prefix =
      selectedService.department === 'housekeeping'
        ? 'HKP'
        : selectedService.department === 'engineering'
        ? 'ENG'
        : 'GST';

    const refId = generateOperationalReference(prefix);
    const guestDisplayName = guestName.trim() || (isAr ? 'نزيل الفندق' : 'In-House Guest');
    const deptText = isAr ? selectedService.responsible_department_ar : selectedService.responsible_department_en;

    const effectiveHotelId = hotelId || selectedService.hotel_id || '11';
    const effectiveHotelNameEn = hotelNameEn || 'Swiss Flora Royal Hotel Riyadh';
    const effectiveHotelNameAr = hotelNameAr || 'فندق سويس فلورا رويال الرياض';

    // 1. Build standardized bilingual WhatsApp message (English first, separator, Arabic second)
    const { englishText, arabicText, fullMessage } = buildBilingualWhatsAppMessage({
      requestTypeEn: `Guest Service Request (${deptText})`,
      requestTypeAr: `طلب خدمة نزيل (${deptText})`,
      referenceNumber: refId,
      hotelNameEn: effectiveHotelNameEn,
      hotelNameAr: effectiveHotelNameAr,
      outletOrServiceNameEn: selectedService.title_en,
      outletOrServiceNameAr: selectedService.title_ar,
      roomNumber: roomNumber || undefined,
      customerType: roomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      guestName: guestDisplayName,
      time: preferredTime,
      services: [
        {
          id: selectedService.id,
          name_en: `${selectedService.title_en}${selectedService.requires_quantity ? ` (Qty: ${quantity})` : ''}`,
          name_ar: `${selectedService.title_ar}${selectedService.requires_quantity ? ` (العدد: ${quantity})` : ''}`,
          time: preferredTime,
        },
      ],
      estimatedTotal: 0,
      currency: 'SAR',
      notes: notes.trim() || undefined,
    });

    // 2. Critical Rule: SAVE TO SYSTEM BEFORE WHATSAPP!
    saveOperationalRequest({
      id: refId,
      hotel_id: effectiveHotelId,
      hotel_name_en: effectiveHotelNameEn,
      hotel_name_ar: effectiveHotelNameAr,
      department: selectedService.department === 'housekeeping' ? 'housekeeping' : selectedService.department === 'engineering' ? 'engineering' : 'guest_services',
      department_name_en: selectedService.responsible_department_en,
      department_name_ar: selectedService.responsible_department_ar,
      outlet_or_service_name_en: selectedService.title_en,
      outlet_or_service_name_ar: selectedService.title_ar,
      customer_type: roomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      room_number: roomNumber || '',
      guest_name: guestDisplayName,
      guest_phone: '',
      estimated_total: 0,
      currency: 'SAR',
      notes: notes.trim() || undefined,
      target_whatsapp: selectedService.whatsapp_number,
      whatsapp_message_en: englishText,
      whatsapp_message_ar: arabicText,
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    submitProductionRequest({
      id: refId,
      reference: refId,
      hotelId: effectiveHotelId,
      hotelNameEn: effectiveHotelNameEn,
      hotelNameAr: effectiveHotelNameAr,
      department: normalizeDepartmentCode(selectedService.department),
      requestType: selectedService.title_en,
      customerType: roomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      roomNumber: roomNumber || undefined,
      guestName: guestDisplayName,
      services: [
        {
          id: selectedService.id,
          nameEn: `${selectedService.title_en}${selectedService.requires_quantity ? ` (Qty: ${quantity})` : ''}`,
          nameAr: `${selectedService.title_ar}${selectedService.requires_quantity ? ` (العدد: ${quantity})` : ''}`,
          time: preferredTime,
        },
      ],
      total: 0,
      currency: 'SAR',
      notes: notes.trim() || undefined,
      status: 'NEW',
      channel: 'WHATSAPP',
      targetWhatsApp: selectedService.whatsapp_number,
      whatsappMessageEn: englishText,
      whatsappMessageAr: arabicText,
    }).catch((err) => console.error('[GuestServicesHubPage] Production request failed:', err));

    const req: GuestServiceRequest = {
      id: refId,
      hotel_id: selectedService.hotel_id,
      service_id: selectedService.id,
      service_title_en: selectedService.title_en,
      service_title_ar: selectedService.title_ar,
      department: selectedService.department,
      quantity: selectedService.requires_quantity ? quantity : undefined,
      notes: notes.trim() || undefined,
      preferred_time: preferredTime,
      room_number: roomNumber || (isAr ? 'نزيل بالفندق' : 'In-House Guest'),
      guest_name: guestName.trim() || undefined,
      created_at: new Date().toISOString(),
      status: 'dispatched',
    };

    // 3. Open WhatsApp with pre-filled bilingual message
    const cleanNum = selectedService.whatsapp_number.replace(/[^0-9]/g, '');
    const waUrl = buildEncodedWhatsAppUrl(cleanNum, fullMessage);
    window.open(waUrl, '_blank');

    setConfirmedReq(req);
    setToastMessage(
      isAr
        ? `تم إرسال طلب ${selectedService.title_ar} بنجاح`
        : `Service request for ${selectedService.title_en} dispatched`
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20 text-stone-900" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 start-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-stone-800 animate-slide-up">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Services Hub Hero */}
      <div className="relative bg-stone-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=85"
            alt=""
            className="w-full h-full object-cover opacity-30 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <BellRing size={14} />
              <span>{isAr ? 'مركز خدمات الغرف والنزلاء' : 'Guest Operations & Rapid Services'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif leading-tight">
              {isAr ? 'الخدمات الفندقية والطلبات السريعة' : 'Guest Services & Instant Requests'}
            </h1>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              {services.length > 0
                ? (isAr ? 'اختر إحدى الخدمات المنشورة وأرسل طلبك مباشرة إلى القسم المسؤول.' : 'Choose a published service and send your request directly to the responsible department.')
                : (isAr ? 'لم تنشر إدارة الفندق خدمات للطلب المباشر بعد.' : 'The hotel has not published any direct-request services yet.')}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Department Category Filter Chips */}
      <div className="bg-white border-b border-stone-200 sticky top-28 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                  }`}
                >
                  <Icon size={14} />
                  <span>{isAr ? cat.label_ar : cat.label_en}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Services Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900">
              {isAr ? 'دليل الخدمات المتاحة للغرفة' : 'Catalog of Rapid Suite Services'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {isAr
                ? `عرض ${filteredServices.length} خدمة سريعة مرتبطة بأنظمة التشغيل`
                : `Showing ${filteredServices.length} direct guest services with live SLA tracking`}
            </p>
          </div>

          {roomNumber && (
            <div className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{isAr ? `الغرفة: ${roomNumber}` : `Room: ${roomNumber}`}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((svc) => {
            return (
              <div
                key={svc.id}
                className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar with Department & SLA */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md">
                      {isAr ? svc.responsible_department_ar : svc.responsible_department_en}
                    </span>

                    <div className="flex items-center gap-1 text-[11px] font-medium text-stone-500">
                      <Clock size={12} className="text-amber-600" />
                      <span>{isAr ? svc.sla_target_ar : svc.sla_target_en}</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-base font-serif text-stone-900">
                      {isAr ? svc.title_ar : svc.title_en}
                    </h3>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {isAr ? svc.description_ar : svc.description_en}
                    </p>
                  </div>
                </div>

                {/* Price and Action Button */}
                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    {svc.is_free ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {isAr ? 'خدمة مجانية' : 'Complimentary'}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-900">
                        {svc.price_display || (isAr ? 'رسوم إضافية' : 'Nominal Fee')}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenModal(svc)}
                    className="bg-stone-900 hover:bg-stone-800 text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send size={12} />
                    <span>{isAr ? 'طلب الخدمة' : 'Request Service'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Request Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
              <div>
                <span className="text-xs text-amber-400 font-semibold block">
                  {isAr ? selectedService.responsible_department_ar : selectedService.responsible_department_en}
                </span>
                <h3 className="font-bold text-base font-serif mt-0.5">
                  {isAr ? selectedService.title_ar : selectedService.title_en}
                </h3>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            {confirmedReq ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} />
                </div>
                <h4 className="font-bold text-stone-900 text-base">
                  {isAr ? 'تم إرسال طلب الخدمة للقسم بنجاح!' : 'Service Ticket Dispatched!'}
                </h4>
                <div className="bg-stone-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-stone-800 inline-block">
                  {confirmedReq.id}
                </div>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  {isAr
                    ? `فريق ${selectedService.responsible_department_ar} استلم طلبك وسيتم تنفيذه خلال ${selectedService.sla_target_ar} تقريباً.`
                    : `The team has logged your ticket and is dispatched to fulfill it (${selectedService.sla_target_en}).`}
                </p>
                <button
                  onClick={() => setSelectedService(null)}
                  className="mt-3 bg-stone-900 text-white text-xs font-semibold px-5 py-2 rounded-xl cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4 text-xs">
                {/* Room preservation */}
                <div className="bg-amber-50 border border-amber-200/80 p-2.5 rounded-xl flex items-center justify-between text-amber-900">
                  <span className="font-semibold">
                    {isAr ? 'الغرفة المستهدفة:' : 'Target Suite:'}
                  </span>
                  <span className="font-bold bg-amber-200/80 px-2 py-0.5 rounded">
                    {roomNumber ? `${isAr ? 'غرفة رقم' : 'Room'} ${roomNumber}` : isAr ? 'نزيل بالفندق' : 'In-House Guest'}
                  </span>
                </div>

                {/* Quantity selector if applicable */}
                {selectedService.requires_quantity && (
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      {isAr ? 'العدد المطلوب' : 'Quantity Needed'}
                    </label>
                    <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl p-1 w-fit">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-200 disabled:opacity-30 cursor-pointer"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center font-bold">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                        disabled={quantity >= 10}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-200 disabled:opacity-30 cursor-pointer"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Preferred time */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    {isAr ? 'التوقيت المفضل للتنفيذ' : 'Preferred Timing'}
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  >
                    <option value={isAr ? 'في أقرب وقت ممكن (فوراً)' : 'As soon as possible'}>
                      {isAr ? 'في أقرب وقت ممكن (فوراً)' : 'As soon as possible'}
                    </option>
                    <option value={isAr ? 'خلال 30 دقيقة' : 'Within 30 minutes'}>
                      {isAr ? 'خلال 30 دقيقة' : 'Within 30 minutes'}
                    </option>
                    <option value={isAr ? 'خلال ساعة واحدة' : 'Within 1 hour'}>
                      {isAr ? 'خلال ساعة واحدة' : 'Within 1 hour'}
                    </option>
                    <option value={isAr ? 'عند المساء (بعد 6 مساءً)' : 'Evening (After 6 PM)'}>
                      {isAr ? 'عند المساء (بعد 6 مساءً)' : 'Evening (After 6 PM)'}
                    </option>
                  </select>
                </div>

                {/* Guest Name */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    {isAr ? 'اسم النزيل' : 'Guest Name'}
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={isAr ? 'الاسم الكريم' : 'Resident Name'}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>

                {/* Additional instructions */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    {isAr ? 'تفاصيل إضافية أو مكان وضع المستلزمات' : 'Details or Placement Instructions'}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder={
                      isAr
                        ? 'مثال: وضع المناشف الإضافية على رف الحمام الرئيسي...'
                        : 'E.g., Place extra towels in primary master bathroom...'
                    }
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            {!confirmedReq && (
              <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-stone-500 text-xs">
                  <Clock size={13} className="text-amber-600" />
                  <span>{isAr ? selectedService.sla_target_ar : selectedService.sla_target_en}</span>
                </div>

                <button
                  onClick={handleConfirmRequest}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <MessageSquare size={14} />
                  <span>{isAr ? 'إرسال الطلب عبر واتساب' : 'Transmit via WhatsApp'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
