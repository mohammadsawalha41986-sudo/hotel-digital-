// src/components/guest/GuestAssistanceModal.tsx
import React, { useState } from 'react';
import {
  X,
  MessageSquareWarning,
  Lightbulb,
  Heart,
  MessageSquare,
  Briefcase,
  Phone,
  MessageCircle,
  Building,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Loader2,
  Star,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import {
  FeedbackType,
  PreferredContactMethod,
} from '../../types/feedback';
import {
  submitGuestFeedback,
  COMPLAINT_CATEGORIES,
  SUGGESTION_CATEGORIES,
} from '../../utils/feedbackStorage';

export type AssistanceFormMode =
  | 'complaint'
  | 'suggestion'
  | 'compliment'
  | 'feedback'
  | 'duty_manager';

interface GuestAssistanceModalProps {
  hotel: Hotel;
  language: Language;
  initialMode?: AssistanceFormMode;
  roomNumber?: string;
  onClose: () => void;
  onSubmitted?: (refId: string) => void;
}

export const GuestAssistanceModal: React.FC<GuestAssistanceModalProps> = ({
  hotel,
  language,
  initialMode = 'complaint',
  roomNumber: initialRoom,
  onClose,
  onSubmitted,
}) => {
  const isAr = language === 'ar';
  const [activeMode, setActiveMode] = useState<AssistanceFormMode>(initialMode);

  // Common form fields
  const [roomNumber, setRoomNumber] = useState<string>(initialRoom || '');
  const [guestName, setGuestName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // Mode-specific fields
  const [category, setCategory] = useState<string>('room');
  const [preferredContact, setPreferredContact] =
    useState<PreferredContactMethod>('whatsapp');
  const [callbackTime, setCallbackTime] = useState<string>('Immediately');
  const [urgency, setUrgency] = useState<'normal' | 'high' | 'urgent'>('normal');

  // Compliment
  const [staffName, setStaffName] = useState<string>('');
  const [department, setDepartment] = useState<string>('Front Desk & Concierge');

  // Feedback rating
  const [rating, setRating] = useState<number>(5);

  // Statuses
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionReference, setSubmissionReference] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!message.trim() || message.trim().length < 5) {
      setErrorMessage(
        isAr
          ? 'يرجى كتابة رسالة توضيحية لا تقل عن 5 أحرف.'
          : 'Please enter a message of at least 5 characters.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let type: FeedbackType = 'COMPLAINT';
      if (activeMode === 'suggestion') type = 'SUGGESTION';
      else if (activeMode === 'compliment') type = 'COMPLIMENT';
      else if (activeMode === 'feedback') type = 'FEEDBACK';
      else if (activeMode === 'duty_manager') type = 'MANAGEMENT_REQUEST';

      const result = submitGuestFeedback({
        hotelId: hotel.id,
        type,
        category,
        roomNumber: roomNumber.trim() || undefined,
        guestName: guestName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        preferredContactMethod: preferredContact,
        preferredCallbackTime: callbackTime,
        staffName: staffName.trim() || undefined,
        department: department.trim() || undefined,
        rating: activeMode === 'feedback' ? rating : undefined,
        message: message.trim(),
        urgency: activeMode === 'duty_manager' ? 'urgent' : urgency,
        isAnonymous: !guestName.trim(),
      });

      if (result.success) {
        setSubmissionReference(result.reference);
        if (onSubmitted) onSubmitted(result.reference);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage(
        isAr
          ? 'تعذر إرسال رسالتك. يرجى التواصل مباشرة مع الاستقبال.'
          : 'We could not send your message. Please contact the Front Desk.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const frontDeskPhone = hotel.phone || '+966112349999';
  const frontDeskWhatsapp = hotel.whatsapp_number || frontDeskPhone;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guest Relations & Assistance"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-stone-900 text-white flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              {activeMode === 'complaint' && <MessageSquareWarning size={20} />}
              {activeMode === 'suggestion' && <Lightbulb size={20} />}
              {activeMode === 'compliment' && <Heart size={20} />}
              {activeMode === 'feedback' && <MessageSquare size={20} />}
              {activeMode === 'duty_manager' && <Briefcase size={20} />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                {activeMode === 'complaint' && (isAr ? 'تقديم شكوى أو مشكلة خدمة' : 'Submit a Complaint / Service Issue')}
                {activeMode === 'suggestion' && (isAr ? 'تقديم مقترح أو فكرة تطوير' : 'Share a Suggestion / Improvement')}
                {activeMode === 'compliment' && (isAr ? 'شكر وتقدير موظف' : 'Compliment a Staff Member')}
                {activeMode === 'feedback' && (isAr ? 'ملاحظات وتقييم عام للإدارة' : 'General Guest Feedback')}
                {activeMode === 'duty_manager' && (isAr ? 'طلب المدير المناوب / مساعدة الإدارة' : 'Request Duty Manager Assistance')}
              </h3>
              <p className="text-xs text-stone-400">
                {isAr ? hotel.name_ar : hotel.name_en} • {isAr ? 'علاقات النزلاء والمتابعة الفورية' : 'Guest Relations Desk'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs (only if not submitted yet) */}
        {!submissionReference && (
          <div className="flex items-center gap-1.5 p-2 bg-stone-100/80 border-b border-stone-200 overflow-x-auto text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveMode('complaint');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeMode === 'complaint'
                  ? 'bg-white text-red-900 font-bold shadow-2xs border border-red-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {isAr ? 'تقديم شكوى' : 'Complaint'}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('suggestion');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeMode === 'suggestion'
                  ? 'bg-white text-amber-900 font-bold shadow-2xs border border-amber-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {isAr ? 'تقديم مقترح' : 'Suggestion'}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('compliment');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeMode === 'compliment'
                  ? 'bg-white text-emerald-900 font-bold shadow-2xs border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {isAr ? 'شكر موظف' : 'Compliment Staff'}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('duty_manager');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeMode === 'duty_manager'
                  ? 'bg-white text-indigo-900 font-bold shadow-2xs border border-indigo-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {isAr ? 'طلب المدير المناوب' : 'Duty Manager'}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('feedback');
                setErrorMessage(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeMode === 'feedback'
                  ? 'bg-white text-stone-900 font-bold shadow-2xs border border-stone-300'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {isAr ? 'ملاحظات عامة' : 'General Feedback'}
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {submissionReference ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="py-8 text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                  {isAr ? 'شكراً لك. تم استلام رسالتك.' : 'Thank You. Your Message Has Been Received.'}
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {isAr
                    ? 'سيقوم فريق علاقات النزلاء وإدارة الفندق بمراجعة طلبك والتواصل معك فوراً عند الحاجة.'
                    : 'Our guest relations and management team will review your request and contact you directly if follow-up is required.'}
                </p>
              </div>

              {/* Reference Number */}
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 font-mono text-sm shadow-2xs">
                <span className="text-xs text-stone-500 font-sans">
                  {isAr ? 'رقم المرجع:' : 'Reference:'}
                </span>
                <span className="font-bold text-amber-800 font-mono">{submissionReference}</span>
              </div>

              {/* Direct helpline buttons in confirmation */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`tel:${frontDeskPhone}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
                >
                  <Phone size={14} className="text-amber-700" />
                  <span>{isAr ? 'الاتصال بالاستقبال' : 'Call Front Desk'}</span>
                </a>

                <a
                  href={`https://wa.me/${frontDeskWhatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  <MessageCircle size={14} />
                  <span>{isAr ? 'محادثة واتساب' : 'WhatsApp Front Desk'}</span>
                </a>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  {isAr ? 'العودة للفندق' : 'Back to Hotel'}
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Notice with Fallback Contact */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1 border-t border-red-200/60 text-[11px]">
                    <a
                      href={`tel:${frontDeskPhone}`}
                      className="inline-flex items-center gap-1 font-bold text-red-800 hover:underline"
                    >
                      <Phone size={12} />
                      <span>{isAr ? 'اتصال بالاستقبال' : 'Call Front Desk'}</span>
                    </a>
                    <span>•</span>
                    <a
                      href={`https://wa.me/${frontDeskWhatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline"
                    >
                      <MessageCircle size={12} />
                      <span>{isAr ? 'واتساب الاستقبال' : 'WhatsApp Front Desk'}</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Duty Manager Direct Banner */}
              {activeMode === 'duty_manager' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <Briefcase size={14} className="text-amber-700" />
                    <span>
                      {isAr
                        ? 'طلب مساعدة فورية من المدير المناوب'
                        : 'Direct Duty Manager Assistance'}
                    </span>
                  </div>
                  <p className="text-stone-600 leading-relaxed text-[11px]">
                    {isAr
                      ? 'المدير المناوب متاح على مدار الساعة للتعامل مع الحالات الخاصة وضمان راحتكم التامة.'
                      : 'The Duty Manager is available 24/7 to resolve urgent guest matters and oversee your personalized comfort.'}
                  </p>
                </div>
              )}

              {/* Category Selection (For complaint or suggestion) */}
              {activeMode === 'complaint' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {isAr ? 'تصنيف الشكوى / المشكلة *' : 'Complaint Category *'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500 font-medium"
                  >
                    {COMPLAINT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isAr ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeMode === 'suggestion' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {isAr ? 'تصنيف المقترح *' : 'Suggestion Category *'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500 font-medium"
                  >
                    {SUGGESTION_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isAr ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Compliment Fields */}
              {activeMode === 'compliment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {isAr ? 'اسم الموظف (إن عُرف)' : 'Staff Member Name (If Known)'}
                    </label>
                    <input
                      type="text"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder={isAr ? 'مثال: زياد أو أحمد' : 'e.g., Ziyad or Ahmed'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {isAr ? 'القسم / الإدارة' : 'Department'}
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="Front Desk & Concierge">{isAr ? 'الاستقبال والكونسيرج' : 'Front Desk & Concierge'}</option>
                      <option value="Housekeeping">{isAr ? 'خدمة الغرف والنظافة' : 'Housekeeping'}</option>
                      <option value="Restaurant & Dining">{isAr ? 'المطاعم والأغذية' : 'Restaurant & Dining'}</option>
                      <option value="Room Service">{isAr ? 'خدمة توصيل الغرف' : 'Room Service'}</option>
                      <option value="Spa & Fitness">{isAr ? 'السبا والنادي الصحي' : 'Spa & Fitness'}</option>
                      <option value="Valet & Bell Desk">{isAr ? 'المواقف وحمل الحقائب' : 'Valet & Bell Desk'}</option>
                      <option value="Maintenance & Security">{isAr ? 'الصيانة والأمن' : 'Maintenance & Security'}</option>
                      <option value="General Management">{isAr ? 'الإدارة العامة' : 'General Management'}</option>
                    </select>
                  </div>
                </div>
              )}

              {/* General Feedback Rating Stars */}
              {activeMode === 'feedback' && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2">
                  <label className="block text-xs font-bold text-stone-700">
                    {isAr ? 'تقييمك لمستوى الخدمة (داخلي للإدارة)' : 'Service Rating (Internal Management Feedback)'}
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1.5 focus:outline-hidden cursor-pointer"
                      >
                        <Star
                          size={28}
                          className={
                            star <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-300'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Room & Guest Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {isAr ? 'رقم الغرفة (للنزلاء المقيمين)' : 'Room Number (In-House Guests)'}
                  </label>
                  <div className="relative">
                    <Building
                      size={15}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder={isAr ? 'مثال: 504' : 'e.g., 504'}
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {isAr ? 'اسم النزيل الكريم' : 'Guest Name'}
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder={isAr ? 'اسمك الكريم' : 'Your Name'}
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Message Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {activeMode === 'complaint' && (isAr ? 'تفاصيل الشكوى أو الملاحظة *' : 'Complaint Details *')}
                  {activeMode === 'suggestion' && (isAr ? 'اقتراحك لتطوير الخدمة *' : 'Your Suggestion *')}
                  {activeMode === 'compliment' && (isAr ? 'رسالة الشكر والتقدير *' : 'Commendation Message *')}
                  {activeMode === 'duty_manager' && (isAr ? 'موضوع طلب مساعدة المدير *' : 'Topic / Assistance Needed *')}
                  {activeMode === 'feedback' && (isAr ? 'ملاحظاتك ومقترحاتك *' : 'Your Comments & Feedback *')}
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isAr
                      ? 'يرجى كتابة كافة التفاصيل التي تساعدنا على معالجة طلبك بدقة وسرعة...'
                      : 'Please provide full details so our management team can assist promptly...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500 leading-relaxed resize-none"
                />
              </div>

              {/* Follow-up & Contact Preferences (For Complaints & Duty Manager) */}
              {(activeMode === 'complaint' || activeMode === 'duty_manager') && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                    <Clock size={14} className="text-amber-700" />
                    <span>{isAr ? 'تفضيل التواصل ومعاودة الاتصال' : 'Follow-up & Callback Preference'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Phone
                        size={14}
                        className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                      />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={isAr ? 'هاتف / واتساب للمتابعة' : 'Phone / WhatsApp'}
                        className="w-full ps-8 pe-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div className="relative">
                      <Mail
                        size={14}
                        className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={isAr ? 'البريد الإلكتروني' : 'Email'}
                        className="w-full ps-8 pe-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Preferred contact channel & time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="block text-[11px] font-medium text-stone-600 mb-1">
                        {isAr ? 'طريقة التواصل المفضلة:' : 'Preferred Contact:'}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setPreferredContact('whatsapp')}
                          className={`p-2 rounded-lg border text-center transition-colors cursor-pointer ${
                            preferredContact === 'whatsapp'
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                              : 'bg-white border-stone-200 text-stone-600'
                          }`}
                        >
                          {isAr ? 'واتساب' : 'WhatsApp'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreferredContact('phone')}
                          className={`p-2 rounded-lg border text-center transition-colors cursor-pointer ${
                            preferredContact === 'phone'
                              ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                              : 'bg-white border-stone-200 text-stone-600'
                          }`}
                        >
                          {isAr ? 'مكالمة هاتفية' : 'Phone Call'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreferredContact('room_visit')}
                          className={`p-2 rounded-lg border text-center transition-colors cursor-pointer ${
                            preferredContact === 'room_visit'
                              ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                              : 'bg-white border-stone-200 text-stone-600'
                          }`}
                        >
                          {isAr ? 'زيارة الغرفة' : 'In-Room Visit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreferredContact('email')}
                          className={`p-2 rounded-lg border text-center transition-colors cursor-pointer ${
                            preferredContact === 'email'
                              ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                              : 'bg-white border-stone-200 text-stone-600'
                          }`}
                        >
                          {isAr ? 'البريد' : 'Email'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-stone-600 mb-1">
                        {isAr ? 'الوقت المفضل للتواصل:' : 'Preferred Callback Time:'}
                      </span>
                      <select
                        value={callbackTime}
                        onChange={(e) => setCallbackTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
                      >
                        <option value="Immediately">{isAr ? 'فوراً بأسرع وقت' : 'Immediately / Urgent'}</option>
                        <option value="Morning (09:00 - 12:00)">{isAr ? 'صباحاً (09:00 - 12:00)' : 'Morning (09:00 - 12:00)'}</option>
                        <option value="Afternoon (12:00 - 17:00)">{isAr ? 'ظهراً (12:00 - 17:00)' : 'Afternoon (12:00 - 17:00)'}</option>
                        <option value="Evening (17:00 - 22:00)">{isAr ? 'مساءً (17:00 - 22:00)' : 'Evening (17:00 - 22:00)'}</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-[11px] font-medium text-stone-600 mb-1">
                        {isAr ? 'درجة الأولوية:' : 'Priority Level:'}
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setUrgency('normal')}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                            urgency === 'normal'
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {isAr ? 'عادية' : 'Normal'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUrgency('high')}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                            urgency === 'high'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {isAr ? 'عالية' : 'High'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUrgency('urgent')}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                            urgency === 'urgent'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {isAr ? 'عاجلة جداً' : 'Urgent'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{isAr ? 'جاري الإرسال...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{isAr ? 'إرسال الرسالة للإدارة' : 'Send to Management'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
