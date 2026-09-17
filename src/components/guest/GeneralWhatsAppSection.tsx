import React, { useState } from 'react';
import { MessageSquare, ArrowLeft, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import { buildWhatsAppLink } from '../../utils/operatingStatus';

interface GeneralWhatsAppSectionProps {
  hotel: Hotel;
  language: Language;
  roomNumber?: string;
}

export const GeneralWhatsAppSection: React.FC<GeneralWhatsAppSectionProps> = ({
  hotel,
  language,
  roomNumber = '',
}) => {
  const isAr = language === 'ar';
  const NextIcon = isAr ? ArrowLeft : ArrowRight;

  const [guestRoom, setGuestRoom] = useState(roomNumber);
  const [selectedTopic, setSelectedTopic] = useState<string>('general');
  const [customNote, setCustomNote] = useState<string>('');

  React.useEffect(() => {
    if (roomNumber && !guestRoom) {
      setGuestRoom(roomNumber);
    }
  }, [roomNumber, guestRoom]);

  const targetWhatsApp =
    hotel.general_guest_whatsapp || hotel.whatsapp_number || '+966112349999';
  const cleanNumber = targetWhatsApp.replace(/[^0-9]/g, '');

  const topics = [
    {
      id: 'general',
      label_en: 'General Inquiry',
      label_ar: 'استفسار عام',
      text_en: 'I have a general inquiry regarding hotel services.',
      text_ar: 'لدي استفسار عام بخصوص خدمات ومرافق الفندق.',
    },
    {
      id: 'luggage',
      label_en: 'Luggage Assistance',
      label_ar: 'المساعدة في الأمتعة',
      text_en: 'I would like bellman assistance with my luggage.',
      text_ar: 'أحتاج مساعدة حامل الحقائب لنقل الأمتعة.',
    },
    {
      id: 'late_checkout',
      label_en: 'Late Check-out',
      label_ar: 'طلب تمديد المغادرة',
      text_en: 'I would like to inquire about late check-out availability.',
      text_ar: 'أود الاستفسار عن إمكانية تمديد وقت تسجيل المغادرة.',
    },
    {
      id: 'housekeeping',
      label_en: 'Room Refresh / Amenities',
      label_ar: 'تنظيف الغرفة أو مستلزمات',
      text_en: 'I would like to request extra room amenities.',
      text_ar: 'أود طلب مستلزمات إضافية للغرفة أو تنظيف إضافي.',
    },
  ];

  const handleStartWhatsApp = () => {
    const selectedObj = topics.find((t) => t.id === selectedTopic);
    const topicText = isAr
      ? selectedObj?.text_ar || 'استفسار عام'
      : selectedObj?.text_en || 'General inquiry';

    const roomText = guestRoom.trim()
      ? isAr
        ? `• رقم الغرفة: ${guestRoom.trim()}`
        : `• Room Number: ${guestRoom.trim()}`
      : isAr
      ? '• رقم الغرفة: لم يتم التحديد'
      : '• Room: Not Specified';

    const noteText = customNote.trim()
      ? isAr
        ? `\n• تفاصيل: ${customNote.trim()}`
        : `\n• Notes: ${customNote.trim()}`
      : '';

    const message = isAr
      ? `🛎️ *محادثة مع الاستقبال العام - ${hotel.name_ar}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `${roomText}\n` +
        `• موضوع التواصل: ${selectedObj?.label_ar}\n` +
        `• الرسالة: ${topicText}${noteText}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `المرسل: بوابة النزيل الرقمية`
      : `🛎️ *General Reception Assistance - ${hotel.name_en}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `${roomText}\n` +
        `• Topic: ${selectedObj?.label_en}\n` +
        `• Message: ${topicText}${noteText}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Sent via Digital Guest Hub`;

    window.open(buildWhatsAppLink(cleanNumber, message), '_blank');
  };

  return (
    <section
      id="general-whatsapp"
      aria-label="General Hotel WhatsApp Assistance"
      className="py-16 sm:py-24 bg-stone-900 text-white relative overflow-hidden"
    >
      {/* Decorative backdrop glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="bg-stone-950/80 rounded-3xl p-7 sm:p-12 border border-stone-800 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
                <MessageSquare size={13} className="text-emerald-400" />
                <span>{isAr ? 'خدمة واتساب الاستقبال العام' : 'GENERAL HOTEL WHATSAPP'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                {isAr ? 'تواصل فوري ومباشر مع مكتب الاستقبال' : 'Direct Reception & Concierge Helpline'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 mt-1.5 leading-relaxed max-w-2xl">
                {isAr
                  ? 'قناة اتصال رسمية ومخصصة للاستفسارات العامة، طلبات الإقامة، والمساعدة الفورية من فريق الاستقبال على مدار 24 ساعة.'
                  : 'Official guest channel dedicated for general hotel inquiries, front desk coordination, and round-the-clock support.'}
              </p>
            </div>

            {/* Verified Badge */}
            <div className="inline-flex items-center gap-2 bg-stone-900 px-4 py-2 rounded-2xl border border-stone-800 shrink-0 self-start sm:self-auto text-xs text-stone-300">
              <Shield size={14} className="text-emerald-400" />
              <span>{isAr ? 'خدمة معتمدة 24/7' : '24/7 Verified Service'}</span>
            </div>
          </div>

          {/* Configuration Form / Options */}
          <div className="space-y-6 pt-2">
            {/* Room Context Input */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  {isAr ? 'رقم الغرفة أو الجناح:' : 'Your Room / Suite Number:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={guestRoom}
                    onChange={(e) => setGuestRoom(e.target.value)}
                    placeholder={isAr ? 'مثال: 305' : 'e.g. 305'}
                    className="w-full text-xs bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {roomNumber && (
                    <span className="absolute end-3 top-2.5 text-emerald-400">
                      <CheckCircle2 size={16} />
                    </span>
                  )}
                </div>
                {roomNumber && (
                  <span className="text-[10px] text-emerald-400 mt-1 block">
                    {isAr ? 'تم استيراد رقم الغرفة من رمز الباركود' : 'Auto-detected from your Room QR'}
                  </span>
                )}
              </div>

              {/* Topic Preset Selection */}
              <div className="sm:col-span-8">
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  {isAr ? 'موضوع التواصل السريع:' : 'Select Topic for Quick Routing:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {topics.map((top) => {
                    const isSelected = selectedTopic === top.id;
                    return (
                      <button
                        key={top.id}
                        type="button"
                        onClick={() => setSelectedTopic(top.id)}
                        className={`text-start px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-xs'
                            : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {isAr ? top.label_ar : top.label_en}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Optional Additional Note */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                {isAr ? 'ملاحظة إضافية (اختياري):' : 'Additional Note (Optional):'}
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب أي توضيح ترغب بإرفاقه مع الرسالة...'
                    : 'Add any specific detail or question...'
                }
                className="w-full text-xs bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Launch Action Button & Helpline Info */}
            <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-stone-400">
                <span className="block text-stone-500 text-[10px] uppercase font-bold tracking-wider">
                  {isAr ? 'رقم الواتساب المعتمد' : 'OFFICIAL HELPLINE NUMBER'}
                </span>
                <span className="font-mono text-sm text-stone-200 font-bold">{targetWhatsApp}</span>
              </div>

              <button
                type="button"
                id="start-general-whatsapp-btn"
                onClick={handleStartWhatsApp}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg hover:shadow-emerald-900/40"
              >
                <MessageSquare size={16} />
                <span>{isAr ? 'فتح المحادثة في واتساب' : 'Open WhatsApp Chat'}</span>
                <NextIcon size={14} className="rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
