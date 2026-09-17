import React, { useState } from 'react';
import { X, CheckCircle, Sparkles, MessageSquare, Clock } from 'lucide-react';
import { WellnessBookingRequest } from '../../types/department';
import { Language } from '../../types/hotel';
import { generateOperationalReference, saveOperationalRequest } from '../../utils/requestStore';
import { buildBilingualWhatsAppMessage, buildEncodedWhatsAppUrl } from '../../utils/whatsappMessageBuilder';

export interface BookingTargetItem {
  id: string;
  hotel_id?: string;
  hotelId?: string;
  name_en?: string;
  name_ar?: string;
  nameEn?: string;
  nameAr?: string;
  price: number;
  oldPrice?: number;
  offer_price?: number;
  currency?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  availableDurations?: number[];
  contact?: {
    whatsapp_number?: string;
    phone?: string;
  };
  whatsappNumber?: string;
  image?: string;
}

interface WellnessBookingModalProps {
  service: BookingTargetItem | any;
  currency: string;
  language: Language;
  roomNumber: string;
  onClose: () => void;
  onBookingSuccess?: (booking: WellnessBookingRequest) => void;
}

export const WellnessBookingModal: React.FC<WellnessBookingModalProps> = ({
  service,
  currency,
  language,
  roomNumber: initialRoomNumber,
  onClose,
  onBookingSuccess,
}) => {
  const isAr = language === 'ar';

  const nameEn = service.nameEn || service.name_en || 'Wellness Service';
  const nameAr = service.nameAr || service.name_ar || 'خدمة سبا واستشفاء';
  const hotelId = service.hotelId || service.hotel_id || '11';
  const targetWhatsApp =
    service.whatsappNumber || service.contact?.whatsapp_number || '+966555072806';

  const availableDurations: number[] =
    service.availableDurations ||
    (service.durationMinutes ? [service.durationMinutes] : [60]);

  const [selectedDuration, setSelectedDuration] = useState<number>(
    availableDurations[0] || 60
  );
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [guestsCount, setGuestsCount] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [activeRoomNumber, setActiveRoomNumber] = useState(initialRoomNumber || '');
  const [notes, setNotes] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<WellnessBookingRequest | null>(null);

  // Calculate base price and duration multiplier if 90 min vs 60 min
  const basePrice = service.offer_price ?? service.price;
  const durationMultiplier = selectedDuration === 90 && availableDurations.includes(60) ? 1.35 : 1;
  const pricePerGuest = Math.round(basePrice * durationMultiplier);
  const estimatedTotal = pricePerGuest * guestsCount;

  const handleConfirmBooking = () => {
    const refId = generateOperationalReference('SPA');
    const guestDisplayName = guestName.trim() || (isAr ? 'نزيل الفندق' : 'Hotel Resident');
    const serviceLabelEn = `${nameEn} (${selectedDuration} mins)`;
    const serviceLabelAr = `${nameAr} (${selectedDuration} دقيقة)`;

    // 1. Build standardized bilingual WhatsApp message
    const { englishText, arabicText, fullMessage } = buildBilingualWhatsAppMessage({
      requestTypeEn: 'Wellness & Spa Reservation Request',
      requestTypeAr: 'طلب حجز جلسة سبا واستشفاء',
      referenceNumber: refId,
      hotelNameEn: 'Swiss Flora Royal Hotel Riyadh',
      hotelNameAr: 'فندق سويس فلورا رويال الرياض',
      outletOrServiceNameEn: serviceLabelEn,
      outletOrServiceNameAr: serviceLabelAr,
      roomNumber: activeRoomNumber || undefined,
      customerType: activeRoomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      guestName: guestDisplayName,
      guestPhone: guestMobile.trim() || undefined,
      date,
      time,
      services: [
        {
          id: service.id,
          name_en: serviceLabelEn,
          name_ar: serviceLabelAr,
          date,
          time,
          guests_count: guestsCount,
          price: estimatedTotal,
        },
      ],
      estimatedTotal,
      currency,
      notes: notes.trim() || undefined,
    });

    // 2. Critical Rule: SAVE TO SYSTEM BEFORE WHATSAPP!
    saveOperationalRequest({
      id: refId,
      hotel_id: hotelId,
      hotel_name_en: 'Swiss Flora Royal Hotel Riyadh',
      hotel_name_ar: 'فندق سويس فلورا رويال الرياض',
      department: 'spa',
      department_name_en: 'Wellness & Spa',
      department_name_ar: 'النادي الصحي والسبا',
      outlet_or_service_name_en: serviceLabelEn,
      outlet_or_service_name_ar: serviceLabelAr,
      customer_type: activeRoomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      room_number: activeRoomNumber || '',
      guest_name: guestDisplayName,
      guest_phone: guestMobile.trim(),
      services: [
        {
          id: service.id,
          name_en: serviceLabelEn,
          name_ar: serviceLabelAr,
          date,
          time,
          guests_count: guestsCount,
          price: estimatedTotal,
        },
      ],
      estimated_total: estimatedTotal,
      currency,
      notes: notes.trim() || undefined,
      target_whatsapp: targetWhatsApp,
      whatsapp_message_en: englishText,
      whatsapp_message_ar: arabicText,
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const newBooking: WellnessBookingRequest = {
      id: refId,
      hotel_id: hotelId,
      service_id: service.id,
      service_name_en: serviceLabelEn,
      service_name_ar: serviceLabelAr,
      date,
      time,
      guests_count: guestsCount,
      guest_name: guestDisplayName,
      guest_mobile: guestMobile.trim(),
      room_number: activeRoomNumber || undefined,
      notes: notes.trim() || undefined,
      estimated_price: estimatedTotal,
      currency,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    };

    // 3. Open WhatsApp with pre-filled bilingual message
    const waUrl = buildEncodedWhatsAppUrl(targetWhatsApp, fullMessage);
    window.open(waUrl, '_blank');

    setConfirmedBooking(newBooking);
    if (onBookingSuccess) {
      onBookingSuccess(newBooking);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold uppercase tracking-wider">
              <Sparkles size={13} />
              <span>{isAr ? 'حجز جلسة استشفاء وتدليك' : 'Wellness Reservation'}</span>
            </div>
            <h3 className="text-lg font-bold font-serif mt-0.5">
              {isAr ? nameAr : nameEn}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        {confirmedBooking ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>
            <h4 className="text-xl font-bold font-serif text-stone-900">
              {isAr ? 'تم تأكيد طلب الحجز المبدئي بنجاح!' : 'Spa Booking Confirmed!'}
            </h4>
            <div className="bg-stone-100 text-stone-800 px-4 py-2 rounded-xl text-xs font-mono font-bold inline-block">
              {isAr ? 'رقم مرجع الحجز: ' : 'Booking Reference: '}
              {confirmedBooking.id}
            </div>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              {isAr
                ? 'فريق السبا والكونسيرج بانتظارك في الموعد المحدد. يرجى التواجد قبل الجلسة بـ 15 دقيقة للاستمتاع بغرف البخار والساونا والتحضير المريح.'
                : 'The wellness team has reserved your private treatment suite. Please arrive 15 minutes early to indulge in our thermal suites and relax.'}
            </p>
            <button
              onClick={onClose}
              className="mt-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-6 py-2.5 rounded-xl cursor-pointer"
            >
              {isAr ? 'إغلاق ومتابعة الاستكشاف' : 'Close & Continue'}
            </button>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* Service quick info */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between text-amber-950">
              <div>
                <span className="font-bold block">
                  {selectedDuration} {isAr ? 'دقيقة' : 'Minutes'}
                </span>
                <span className="text-[11px] text-amber-800">
                  {service.location?.internal_text_ar ||
                    service.locationAr ||
                    (isAr ? 'فلورا سبا، الطابق الثالث' : 'Flora Spa, 3rd Floor')}
                </span>
              </div>
              <div className="text-end">
                <span className="text-base font-bold text-amber-900">
                  {pricePerGuest > 0 ? `${pricePerGuest} ${currency}` : isAr ? 'مجاني للنزلاء' : 'Complimentary'}
                </span>
                {service.oldPrice && (
                  <span className="block text-[10px] text-stone-400 line-through">
                    {service.oldPrice} {currency}
                  </span>
                )}
              </div>
            </div>

            {/* Duration Selector if multiple durations available */}
            {availableDurations.length > 1 && (
              <div>
                <label className="font-semibold text-stone-700 block mb-1.5 flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-800" />
                  <span>{isAr ? 'مدة الجلسة المطلوبة' : 'Select Treatment Duration'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableDurations.map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setSelectedDuration(dur)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                        selectedDuration === dur
                          ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      <span>{dur} {isAr ? 'دقيقة' : 'Mins'}</span>
                      <span className="text-[11px] opacity-90">
                        {dur === 90 ? `+${Math.round(basePrice * 0.35)} ${currency}` : `${basePrice} ${currency}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* In-House room alert / input */}
            <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-stone-800 block text-[11px]">
                    {isAr ? 'رقم الغرفة للنزلاء' : 'In-House Room Number'}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    {isAr ? 'لربط الموعد وتنسيق الدخول' : 'For booking verification'}
                  </span>
                </div>
                <input
                  type="text"
                  value={activeRoomNumber}
                  onChange={(e) => setActiveRoomNumber(e.target.value)}
                  placeholder={isAr ? 'رقم الغرفة' : 'Room #'}
                  className="w-28 p-2 rounded-lg border border-stone-300 bg-white text-xs font-mono text-center focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  {isAr ? 'تاريخ الجلسة' : 'Appointment Date'}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  {isAr ? 'وقت الجلسة' : 'Time Slot'}
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:30">03:30 PM</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="18:30">06:30 PM</option>
                  <option value="20:00">08:00 PM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  {isAr ? 'عدد الضيوف' : 'Guests Count'}
                </label>
                <select
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs"
                >
                  <option value={1}>1 {isAr ? 'ضيف (فردي)' : 'Guest (Solo)'}</option>
                  <option value={2}>2 {isAr ? 'ضيوف (جلسة أزواج)' : 'Guests (Couples)'}</option>
                  <option value={3}>3 {isAr ? 'ضيوف' : 'Guests'}</option>
                  <option value={4}>4 {isAr ? 'ضيوف' : 'Guests'}</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  {isAr ? 'اسم الضيف' : 'Guest Name'}
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={isAr ? 'الاسم الكريم' : 'Full Name'}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                {isAr ? 'رقم الهاتف للتأكيد' : 'Mobile Number'}
              </label>
              <input
                type="tel"
                value={guestMobile}
                onChange={(e) => setGuestMobile(e.target.value)}
                placeholder="+966 5x xxx xxxx"
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                {isAr ? 'ملاحظات صحية أو تفضيلات التدليك' : 'Health Notes & Pressure Preferences'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={
                  isAr
                    ? 'مثال: تفضيل ضغط متوسط، حساسية من زيت اللافندر، تركيز على الظهر...'
                    : 'E.g., Medium pressure, avoid lavender oils, focus on lower back...'
                }
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs resize-none"
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {!confirmedBooking && (
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-[11px] text-stone-500 block">
                {isAr ? 'المجموع التقديري' : 'Estimated Total'}
              </span>
              <span className="text-base font-bold text-amber-900">
                {estimatedTotal > 0 ? `${estimatedTotal} ${currency}` : isAr ? 'دخول مجاني' : 'Complimentary'}
              </span>
            </div>

            <button
              onClick={handleConfirmBooking}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-900/10 cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>{isAr ? 'تأكيد الحجز عبر واتساب' : 'Confirm via WhatsApp'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
