import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  HelpCircle,
  Clock,
  Building,
  Sparkles,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import { buildWhatsAppLink } from '../../utils/operatingStatus';

interface HotelContactLocationSectionProps {
  hotel: Hotel;
  language: Language;
  roomNumber?: string;
}

export const HotelContactLocationSection: React.FC<HotelContactLocationSectionProps> = ({
  hotel,
  language,
  roomNumber = '',
}) => {
  const isAr = language === 'ar';

  // Configurable General Hotel WhatsApp (central hotel helpline / front office)
  const generalWhatsApp = hotel.general_guest_whatsapp || hotel.whatsapp_number || '+966112349999';
  const cleanGeneralWhatsApp = generalWhatsApp.replace(/[^0-9]/g, '');

  // Form State
  const [guestRoom, setGuestRoom] = useState(roomNumber);
  const [guestName, setGuestName] = useState('');
  const [requestType, setRequestType] = useState<string>('in_room_assistance');
  const [guestNotes, setGuestNotes] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  // Sync if roomNumber prop changes
  React.useEffect(() => {
    if (roomNumber && !guestRoom) {
      setGuestRoom(roomNumber);
    }
  }, [roomNumber, guestRoom]);

  const requestTypeOptions = [
    { value: 'in_room_assistance', label_en: 'In-Room Assistance', label_ar: 'مساعدة في الغرفة' },
    { value: 'inquiry', label_en: 'General Hotel Inquiry', label_ar: 'استفسار فندقي عام' },
    { value: 'luggage', label_en: 'Luggage & Bellman Assistance', label_ar: 'نقل الأمتعة والحقائب' },
    { value: 'cleaning', label_en: 'Extra Housekeeping / Cleaning', label_ar: 'تنظيف إضافي للغرفة' },
    { value: 'lost_found', label_en: 'Lost & Found Query', label_ar: 'مفقودات وموجودات' },
    { value: 'support', label_en: 'General Guest Support', label_ar: 'دعم ومساندة عامة' },
  ];

  const handleSendAssistanceRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestNotes.trim()) return;

    const selectedTypeObj = requestTypeOptions.find((opt) => opt.value === requestType);
    const typeLabel = isAr
      ? selectedTypeObj?.label_ar || 'مساعدة عامة'
      : selectedTypeObj?.label_en || 'General Assistance';

    const text = isAr
      ? `🛎️ *طلب مساعدة نزيل - ${hotel.name_ar}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `• الغرفة: ${guestRoom.trim() ? guestRoom.trim() : 'غير محددة'}\n` +
        `• اسم النزيل: ${guestName.trim()}\n` +
        `• نوع الطلب: ${typeLabel}\n` +
        `• التفاصيل: ${guestNotes.trim()}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `المرسل: بوابة النزيل الرقمية`
      : `🛎️ *Guest Assistance Request - ${hotel.name_en}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `• Room: ${guestRoom.trim() ? guestRoom.trim() : 'Not Specified'}\n` +
        `• Guest Name: ${guestName.trim()}\n` +
        `• Request Type: ${typeLabel}\n` +
        `• Details: ${guestNotes.trim()}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Sent via Digital Guest Hub`;

    window.open(buildWhatsAppLink(cleanGeneralWhatsApp, text), '_blank');
    setSentSuccess(true);
  };

  const handleQuickGeneralWhatsApp = () => {
    const text = isAr
      ? `مرحباً مكتب الاستقبال وخدمة النزلاء في ${hotel.name_ar}، أود المساعدة بخصوص إقامتي${
          guestRoom ? ` في الغرفة ${guestRoom}` : ''
        }.`
      : `Hello Front Desk & Guest Care at ${hotel.name_en}, I would like assistance regarding my stay${
          guestRoom ? ` in Room ${guestRoom}` : ''
        }.`;
    window.open(buildWhatsAppLink(cleanGeneralWhatsApp, text), '_blank');
  };

  return (
    <section id="guest-assistance" className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full mb-3">
            <HelpCircle size={13} />
            <span>{isAr ? 'مساعدة النزلاء — كيف يمكننا مساعدتك؟' : 'HOW CAN WE HELP YOU?'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-stone-900">
            {isAr ? 'مساعدة النزلاء والتواصل المباشر' : 'General Guest Assistance & Direct Contact'}
          </h2>
          <p className="text-sm text-stone-600 max-w-2xl mt-1.5 leading-relaxed">
            {isAr
              ? 'مكتب الاستقبال المركزي وخدمة النزلاء على أتم الاستعداد لخدمتك فوراً وتلبية كافة الاستفسارات والطلبات.'
              : 'Our central front desk and guest relations team are available 24/7 to resolve inquiries and support your stay.'}
          </p>
        </div>

        {/* Quick Communication Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* 1. General Hotel WhatsApp */}
          <button
            onClick={handleQuickGeneralWhatsApp}
            className="p-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 transition-all text-start flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <MessageSquare size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  {isAr ? 'واتساب الفندق العام' : 'GENERAL HOTEL WHATSAPP'}
                </span>
                <span className="text-sm font-bold text-stone-900 block mt-0.5 group-hover:text-emerald-900">
                  {generalWhatsApp}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {isAr ? 'محادثة فورية مع الاستقبال' : 'Chat with Front Office'}
                </span>
              </div>
            </div>
            <span className="text-emerald-700 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1">
              →
            </span>
          </button>

          {/* 2. Reception Direct Call */}
          <a
            href={`tel:${hotel.phone}`}
            className="p-5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 transition-all text-start flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
                <Phone size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  {isAr ? 'هاتف الاستقبال المباشر' : 'FRONT DESK CALL'}
                </span>
                <span className="text-sm font-bold text-stone-900 block mt-0.5 group-hover:text-amber-900 font-mono">
                  {hotel.phone}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  {isAr ? 'متاح على مدار 24 ساعة' : 'Available 24 Hours'}
                </span>
              </div>
            </div>
            <span className="text-stone-400 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1">
              →
            </span>
          </a>

          {/* 3. Direct Email / Official Inquiries */}
          <a
            href={`mailto:${hotel.email}`}
            className="p-5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 transition-all text-start flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-800 text-white flex items-center justify-center shadow-xs">
                <Mail size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  {isAr ? 'البريد الإلكتروني' : 'HOTEL EMAIL'}
                </span>
                <span className="text-xs font-bold text-stone-900 block mt-0.5 truncate max-w-[170px]">
                  {hotel.email}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  {isAr ? 'مراسلات رسمية' : 'Formal Concierge Desk'}
                </span>
              </div>
            </div>
            <span className="text-stone-400 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1">
              →
            </span>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Fast In-Room Assistance Form */}
          <div className="lg:col-span-7">
            <div className="bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold font-serif text-stone-900">
                    {isAr ? 'طلب مساعدة نزيل سريعة' : 'Quick Guest Assistance Request'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {isAr
                      ? 'املأ بيانات الطلب وسيتم توجيهه مباشرة إلى الواتساب المعتمد لمكتب الاستقبال.'
                      : 'Provide your details and your request will be instantly dispatched to the central hotel helpline.'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
              </div>

              {sentSuccess ? (
                <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 my-2">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
                  <h4 className="text-base font-bold text-stone-900">
                    {isAr ? 'تم تحويل طلبك بنجاح إلى الواتساب' : 'Request Prepared & Dispatched'}
                  </h4>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                    {isAr
                      ? 'تم فتح محادثة الواتساب مع رسالة الطلب المنسقة. فريق الاستقبال بانتظار رسالتك لتنفيذها فوراً.'
                      : 'Your request has been compiled and opened in WhatsApp. Our front desk team is ready to process it immediately.'}
                  </p>
                  <button
                    onClick={() => {
                      setSentSuccess(false);
                      setGuestNotes('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:underline cursor-pointer pt-2"
                  >
                    <span>{isAr ? 'إرسال طلب مساعدة إضافي' : 'Submit another assistance request'}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendAssistanceRequest} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Room Number Context */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                        {isAr ? 'رقم الغرفة أو الجناح:' : 'Room / Suite Number:'}
                      </label>
                      <input
                        type="text"
                        value={guestRoom}
                        onChange={(e) => setGuestRoom(e.target.value)}
                        placeholder={isAr ? 'مثال: 402' : 'e.g. 402'}
                        className="w-full text-xs bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700"
                      />
                      {roomNumber && (
                        <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                          {isAr ? '✓ تم التعرف على غرفتك تلقائياً' : '✓ Auto-filled from your room context'}
                        </span>
                      )}
                    </div>

                    {/* Guest Name */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                        {isAr ? 'اسم النزيل الكريم:' : 'Guest Name:'} *
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={isAr ? 'الاسم الثلاثي' : 'Your full name'}
                        required
                        className="w-full text-xs bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700"
                      />
                    </div>
                  </div>

                  {/* Request Type */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      {isAr ? 'نوع المساعدة المطلوبة:' : 'Request Category:'} *
                    </label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="w-full text-xs bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700 cursor-pointer"
                    >
                      {requestTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {isAr ? opt.label_ar : opt.label_en}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Details / Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      {isAr ? 'تفاصيل الطلب أو الملاحظات:' : 'Details & Notes:'} *
                    </label>
                    <textarea
                      value={guestNotes}
                      onChange={(e) => setGuestNotes(e.target.value)}
                      rows={3}
                      placeholder={
                        isAr
                          ? 'صف طلبك أو ما تحتاجه وسنقوم بتلبيته فوراً...'
                          : 'Describe your request, timing, or how we can best assist you...'
                      }
                      required
                      className="w-full text-xs bg-white border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700 leading-relaxed"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 px-5 rounded-xl bg-stone-900 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--hotel-button, #8b6f4e)',
                    }}
                  >
                    <Send size={15} />
                    <span>{isAr ? 'إرسال طلب المساعدة عبر الواتساب' : 'Send Assistance Request via WhatsApp'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Hotel Coordinates & Key Nearby Destinations */}
          <div className="lg:col-span-5 space-y-6">
            {/* Address & Hours */}
            <div className="bg-stone-50 rounded-3xl p-6 sm:p-7 border border-stone-200/90 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-200/70 text-stone-800 flex items-center justify-center">
                  <Building size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900 font-serif">
                    {isAr ? hotel.name_ar : hotel.name_en}
                  </h4>
                  <span className="text-xs text-stone-500">
                    {isAr ? `${hotel.city_ar}، ${hotel.country_ar}` : `${hotel.city_en}, ${hotel.country_en}`}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs text-stone-600 border-t border-stone-200/70">
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-amber-800 shrink-0 mt-0.5" />
                  <span>{isAr ? hotel.address_ar : hotel.address_en}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock size={15} className="text-amber-800 shrink-0" />
                  <span>{isAr ? 'خدمة النزلاء ومكتب الاستقبال: 24 ساعة يومياً' : 'Front Desk & Guest Support: 24/7 Daily'}</span>
                </div>
              </div>
            </div>

            {/* Nearby Highlights */}
            <div className="bg-stone-50 rounded-3xl p-6 sm:p-7 border border-stone-200/90 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <MapPin size={13} className="text-amber-700" />
                <span>{isAr ? 'معالم ومواقع حيوية قريبة' : 'Key Nearby Destinations'}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div className="bg-white p-3 rounded-xl border border-stone-200/80">
                  <span className="font-semibold text-stone-900 block">{isAr ? 'مطار الملك خالد' : 'KKIA Airport'}</span>
                  <span className="text-amber-800 font-medium">{isAr ? '15 دقيقة' : '15 min drive'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200/80">
                  <span className="font-semibold text-stone-900 block">{isAr ? 'بوليفارد سيتي' : 'Boulevard World'}</span>
                  <span className="text-amber-800 font-medium">{isAr ? '4 دقائق' : '4 min drive'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200/80">
                  <span className="font-semibold text-stone-900 block">{isAr ? 'مركز الملك عبدالله (كافد)' : 'KAFD District'}</span>
                  <span className="text-amber-800 font-medium">{isAr ? '6 دقائق' : '6 min drive'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200/80">
                  <span className="font-semibold text-stone-900 block">{isAr ? 'مول الرياض بارك' : 'Riyadh Park Mall'}</span>
                  <span className="text-amber-800 font-medium">{isAr ? '7 دقائق' : '7 min drive'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
