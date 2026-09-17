// src/components/guest/SubmitReviewModal.tsx
import React, { useState } from 'react';
import {
  Star,
  X,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Building,
  User,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { Language } from '../../types/hotel';
import {
  ReviewCategory,
  DisplayNamePreference,
  ReviewSource,
} from '../../types/reviews';
import {
  submitGuestReview,
  REVIEW_CATEGORIES,
} from '../../utils/reviewStorage';

interface SubmitReviewModalProps {
  hotelId: string;
  hotelName: string;
  language: Language;
  onClose: () => void;
  onReviewSubmitted?: (refId: string) => void;
  defaultRoomNumber?: string;
  isVerifiedContext?: boolean;
}

export const SubmitReviewModal: React.FC<SubmitReviewModalProps> = ({
  hotelId,
  hotelName,
  language,
  onClose,
  onReviewSubmitted,
  defaultRoomNumber,
  isVerifiedContext = false,
}) => {
  const isAr = language === 'ar';

  // Star Rating: MUST NOT be preselected! Guest must choose actively (0 = unselected).
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const [guestName, setGuestName] = useState<string>('');
  const [displayNamePreference, setDisplayNamePreference] =
    useState<DisplayNamePreference>('full_name');

  const [roomNumber, setRoomNumber] = useState<string>(defaultRoomNumber || '');
  const [stayDate, setStayDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [category, setCategory] = useState<ReviewCategory>('Overall Stay');
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [consentToPublish, setConsentToPublish] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReference, setSuccessReference] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Strict validation
    if (rating === 0) {
      setErrorMsg(
        isAr
          ? 'يرجى اختيار التقييم بالنجوم (من 1 إلى 5 نجوم) للمتابعة.'
          : 'Please select a star rating (1 to 5 stars) to proceed.'
      );
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMsg(
        isAr
          ? 'يرجى كتابة تعليق لا يقل عن 5 أحرف يوضح تجربتك.'
          : 'Please enter a review comment of at least 5 characters describing your stay.'
      );
      return;
    }

    if (!consentToPublish) {
      setErrorMsg(
        isAr
          ? 'يرجى الموافقة على نشر التقييم وفق سياسة الفندق.'
          : 'Please confirm consent to publish your review in accordance with hotel policy.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const source: ReviewSource = isVerifiedContext || defaultRoomNumber ? 'ROOM_QR' : 'WEBSITE';
      const result = submitGuestReview({
        hotelId,
        rating,
        category,
        guestName: guestName.trim() || (isAr ? 'نزيل الفندق' : 'Hotel Guest'),
        displayNamePreference,
        roomNumber: roomNumber.trim() || undefined,
        stayDate: stayDate || undefined,
        title: title.trim() || undefined,
        comment: comment.trim(),
        guestPhone: guestPhone.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
        consentToPublish,
        source,
        isVerified: Boolean(isVerifiedContext || roomNumber.trim()),
      });

      if (result.success) {
        setSuccessReference(result.referenceId);
        if (onReviewSubmitted) {
          onReviewSubmitted(result.referenceId);
        }
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setErrorMsg(
        isAr
          ? 'حدث خطأ أثناء إرسال التقييم. يرجى المحاولة مرة أخرى.'
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Your Experience"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-stone-900 text-white flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                {isAr ? 'شاركنا تجربتك وتقييمك' : 'Share Your Experience'}
              </h3>
              <p className="text-xs text-stone-400">
                {hotelName} • {isAr ? 'نظام التقييم المعتمد' : 'Guest Feedback Desk'}
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

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {successReference ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="py-8 text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200/80 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                  {isAr ? 'شكراً لمشاركتنا رأيك' : 'Thank You For Your Feedback'}
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {isAr
                    ? 'تم إرسال تقييمك وسيتم مراجعته من قبل فريق الفندق قبل النشر على الموقع.'
                    : 'Your review has been submitted for review by our hotel team. Management verifies all guest reflections before public display.'}
                </p>
              </div>

              {/* Reference Number Badge */}
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-stone-100 border border-stone-200/80 text-stone-800 font-mono text-sm shadow-2xs">
                <span className="text-xs text-stone-500 font-sans">
                  {isAr ? 'رقم مرجع التقييم:' : 'Review Reference:'}
                </span>
                <span className="font-bold text-amber-700 font-mono">{successReference}</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-500 max-w-md mx-auto text-start leading-relaxed space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-stone-700">
                  <ShieldCheck size={14} className="text-amber-600" />
                  <span>{isAr ? 'ضمانات الخصوصية والشفافية' : 'Guest Privacy & Trust'}</span>
                </div>
                <p>
                  {isAr
                    ? 'لن يتم إظهار رقم غرفتك أو وسيلة اتصالك للعامة أبداً. جميع التقييمات تخضع لسياسة التحقق المعتمدة.'
                    : 'Your room number and contact details remain strictly private for management follow-up and are never shared publicly.'}
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition-colors cursor-pointer shadow-sm"
                >
                  {isAr ? 'العودة للفندق' : 'Back to Hotel'}
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Notice */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. STAR RATING (Active choice, not preselected) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-stone-50 border border-stone-200/90 text-center space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  {isAr ? 'اختر تقييمك العام للإقامة *' : 'Select Your Rating *'}
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-2 transition-transform hover:scale-115 focus:outline-hidden cursor-pointer"
                      aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                    >
                      <Star
                        size={32}
                        className={
                          (hoverRating || rating) >= star
                            ? 'fill-amber-400 text-amber-400 filter drop-shadow-xs'
                            : 'text-stone-300'
                        }
                      />
                    </button>
                  ))}
                </div>
                <div className="text-xs font-medium text-stone-500 h-4">
                  {(hoverRating || rating) === 5 && (isAr ? 'استثنائي (5 نجوم)' : 'Exceptional (5 Stars)')}
                  {(hoverRating || rating) === 4 && (isAr ? 'جيد جداً (4 نجوم)' : 'Very Good (4 Stars)')}
                  {(hoverRating || rating) === 3 && (isAr ? 'متوسط (3 نجوم)' : 'Average (3 Stars)')}
                  {(hoverRating || rating) === 2 && (isAr ? 'أقل من المتوقع (نجمتان)' : 'Below Expectation (2 Stars)')}
                  {(hoverRating || rating) === 1 && (isAr ? 'غير مرضي (نجمة واحدة)' : 'Unsatisfactory (1 Star)')}
                  {(hoverRating || rating) === 0 && (
                    <span className="text-amber-700 font-medium">
                      {isAr ? 'اضغط على النجوم لاختيار تقييمك' : 'Click stars to select rating'}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. CATEGORY & STAY DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {isAr ? 'فئة التقييم *' : 'Review Category *'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ReviewCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500 font-medium cursor-pointer"
                  >
                    {REVIEW_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {isAr ? cat.ar : cat.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {isAr ? 'تاريخ الإقامة (اختياري)' : 'Stay Date (Optional)'}
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                    <input
                      type="date"
                      value={stayDate}
                      onChange={(e) => setStayDate(e.target.value)}
                      className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. TITLE & COMMENT */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {isAr ? 'عنوان التقييم (اختياري)' : 'Review Title (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مثال: إقامة فاخرة وخدمة استثنائية'
                        : 'e.g., Outstanding stay and impeccable hospitality'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {isAr ? 'تفاصيل تجربتك ورأيك *' : 'Your Review & Comments *'}
                  </label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      isAr
                        ? 'شاركنا ما أعجبك في الفندق، الغرفة، طاقم العمل، أو أي ملاحظات لتطوير خدماتنا...'
                        : 'Tell us about your stay, dining experience, staff hospitality, or any reflections...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:border-amber-500 leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* 4. GUEST IDENTITY & DISPLAY PREFERENCE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                  <User size={14} className="text-amber-700" />
                  <span>{isAr ? 'بيانات النزيل وتفضيل الاسم' : 'Guest Identity & Display Preference'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      {isAr ? 'اسم النزيل' : 'Guest Name'}
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder={isAr ? 'مثال: محمد القحطاني' : 'e.g., Mohammed Al-Qahtani'}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      {isAr ? 'رقم الغرفة (اختياري - للتحقق فقط)' : 'Room Number (Optional - Verification Only)'}
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
                        placeholder={isAr ? 'مثال: 402' : 'e.g., 402'}
                        className="w-full ps-9 pe-3 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Name Preference */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    {isAr ? 'كيف تود ظهور اسمك في التقييم المنشور؟' : 'Public Display Name Preference:'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDisplayNamePreference('full_name')}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                        displayNamePreference === 'full_name'
                          ? 'bg-amber-100/70 border-amber-400 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {isAr ? 'الاسم الكامل' : 'Full Name'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDisplayNamePreference('first_name')}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                        displayNamePreference === 'first_name'
                          ? 'bg-amber-100/70 border-amber-400 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {isAr ? 'الاسم الأول فقط' : 'First Name Only'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDisplayNamePreference('anonymous')}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                        displayNamePreference === 'anonymous'
                          ? 'bg-amber-100/70 border-amber-400 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {isAr ? 'نزيل مجهول' : 'Anonymous'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. OPTIONAL CONTACT DETAILS (Private management follow-up only) */}
              <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Lock size={13} className="text-amber-700" />
                  <span>
                    {isAr
                      ? 'قنوات التواصل للمتابعة الخاصة من إدارة الفندق (اختياري)'
                      : 'Optional Contact For Management Follow-up'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 leading-relaxed">
                  {isAr
                    ? 'هذه المعلومات للاستخدام الداخلي ولن تظهر للعامة أبداً. يتيح لإدارة الفندق التواصل معك عند الحاجة.'
                    : 'For internal hotel management follow-up only. Will NEVER appear publicly on the website.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="relative">
                    <Phone
                      size={14}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-amber-700/60 pointer-events-none"
                    />
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder={isAr ? 'هاتف / واتساب' : 'Phone / WhatsApp'}
                      className="w-full ps-8 pe-3 py-2 rounded-xl bg-white border border-amber-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div className="relative">
                    <Mail
                      size={14}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-amber-700/60 pointer-events-none"
                    />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder={isAr ? 'البريد الإلكتروني' : 'Email Address'}
                      className="w-full ps-8 pe-3 py-2 rounded-xl bg-white border border-amber-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* 6. CONSENT CHECKBOX & MODERATION NOTICE */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentToPublish}
                    onChange={(e) => setConsentToPublish(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs text-stone-600 leading-relaxed">
                    {isAr
                      ? 'أؤكد أن هذا التقييم يعكس تجربتي الحقيقية، وأوافق على مراجعة الفندق له ونشر التعليق بالاسم المختار.'
                      : 'I confirm this reflects my genuine stay experience and agree to hotel team review and publishing in accordance with policy.'}
                  </span>
                </label>

                <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-stone-100/80 px-3 py-2 rounded-xl border border-stone-200">
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                  <span>
                    {isAr
                      ? 'ملاحظة: تخضع جميع التقييمات للمراجعة والاعتماد الإداري قبل نشرها علناً.'
                      : 'Note: All reviews undergo administrative verification prior to public publication.'}
                  </span>
                </div>
              </div>

              {/* ACTIONS */}
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
                  className="inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{isAr ? 'جاري الإرسال...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <span>{isAr ? 'إرسال التقييم للمراجعة' : 'Submit Review'}</span>
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
