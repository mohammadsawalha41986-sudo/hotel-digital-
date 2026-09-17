import React, { useState } from 'react';
import {
  X,
  Clock,
  Plus,
  Minus,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import {
  InRoomServiceItem,
  resolveServiceWhatsApp,
  generateServiceWhatsAppMessage,
} from '../../types/inRoomServices';
import { saveOperationalRequest } from '../../utils/requestStore';
import { OperationalRequest } from '../../types/requests';
import { buildWhatsAppLink } from '../../utils/operatingStatus';
import { ServiceIcon } from '../../utils/serviceIcons';
import { submitProductionRequest, normalizeDepartmentCode } from '../../services/requestService';

interface InRoomServiceRequestModalProps {
  service: InRoomServiceItem | null;
  hotel: Hotel;
  departmentConfigs?: Record<string, string>;
  language: Language;
  roomNumber: string;
  onSetRoomNumber: (room: string) => void;
  onClose: () => void;
  onSuccess?: (requestId: string) => void;
}

export const InRoomServiceRequestModal: React.FC<InRoomServiceRequestModalProps> = ({
  service,
  hotel,
  departmentConfigs,
  language,
  roomNumber,
  onSetRoomNumber,
  onClose,
  onSuccess,
}) => {
  if (!service) return null;

  const isAr = language === 'ar';
  const [currentRoom, setCurrentRoom] = useState(roomNumber || '');
  const [guestName, setGuestName] = useState('');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<string>(
    service.options && service.options.length > 0 ? (isAr ? service.optionsAr?.[0] || service.options[0] : service.options[0]) : ''
  );
  const [wakeUpDate, setWakeUpDate] = useState<'today' | 'tomorrow' | 'custom'>('tomorrow');
  const [wakeUpTime, setWakeUpTime] = useState('07:00');
  const [luggageType, setLuggageType] = useState<'pickup' | 'delivery'>('pickup');
  const [luggageTime, setLuggageTime] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReqId, setSubmittedReqId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Target WhatsApp number resolved via strict priority:
  // service.whatsappNumber -> department.whatsappNumber -> hotel.defaultWhatsApp
  const targetWhatsApp = resolveServiceWhatsApp(service, departmentConfigs, hotel);

  // Department display names
  const departmentLabels: Record<string, { en: string; ar: string }> = {
    housekeeping: { en: 'Housekeeping Department', ar: 'قسم الإشراف الداخلي' },
    room_comfort: { en: 'Housekeeping & Comfort', ar: 'العناية بالنزلاء والنظافة' },
    front_office: { en: 'Front Office & Reception', ar: 'الاستقبال والمكتب الأمامي' },
    bell_desk: { en: 'Bell Desk & Luggage Porter', ar: 'قسم الأمانات وحمل الحقائب' },
    concierge: { en: 'Concierge Services', ar: 'مكتب الكونسيرج' },
    maintenance: { en: 'Engineering & Maintenance', ar: 'الهندسة والصيانة الفنية' },
    room_service: { en: 'In-Room Dining Kitchen', ar: 'مطبخ خدمة الغرف' },
  };

  const currentDeptLabel = departmentLabels[service.departmentId] || departmentLabels[service.category] || {
    en: 'Guest Services',
    ar: 'خدمات النزلاء',
  };

  // Pre-fill toiletries options if empty
  const handleToggleItem = (item: string) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSelectAllToiletries = () => {
    const all = isAr && service.optionsAr ? service.optionsAr : service.options || [];
    if (selectedItems.length === all.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...all]);
    }
  };

  // Compile pre-filled bilingual WhatsApp message
  const getPreparedWhatsAppMessage = () => {
    let finalTime = undefined;
    let finalDate = undefined;

    if (service.requestType === 'wake_up') {
      finalDate = wakeUpDate === 'today' ? 'Today' : wakeUpDate === 'tomorrow' ? 'Tomorrow' : 'Scheduled';
      finalTime = wakeUpTime;
    } else if (service.requestType === 'luggage' && luggageTime === 'scheduled') {
      finalTime = scheduledTime;
    }

    return generateServiceWhatsAppMessage({
      hotelNameEn: hotel.name_en,
      hotelNameAr: hotel.name_ar,
      service,
      roomNumber: currentRoom,
      guestName,
      quantity: service.requestType === 'simple_quantity' || service.requestType === 'luggage' ? quantity : undefined,
      selectedItems: service.requestType === 'toiletries_kit' ? selectedItems : undefined,
      issueType: service.requestType === 'maintenance_issue' ? selectedIssue : undefined,
      luggageType: service.requestType === 'luggage' ? luggageType : undefined,
      date: finalDate,
      time: finalTime,
      notes,
    });
  };

  // Validation
  const validate = (): boolean => {
    if (!currentRoom.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال رقم الغرفة لإكمال الطلب' : 'Please provide your room number to proceed');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // 1. Submit in-app dispatch
  const handleSendInApp = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const generatedMsg = getPreparedWhatsAppMessage();
    const reqId = `REQ-${Date.now().toString().slice(-5)}`;

    const newRequest: OperationalRequest = {
      id: reqId,
      hotel_id: hotel.id,
      hotel_name_en: hotel.name_en,
      hotel_name_ar: hotel.name_ar,
      department:
        service.category === 'maintenance'
          ? 'engineering'
          : service.category === 'room_service'
          ? 'fnb'
          : 'housekeeping',
      department_name_en: currentDeptLabel.en,
      department_name_ar: currentDeptLabel.ar,
      outlet_or_service_name_en: service.nameEn,
      outlet_or_service_name_ar: service.nameAr,
      customer_type: 'IN_HOUSE',
      room_number: currentRoom.trim(),
      guest_name: guestName.trim() || (isAr ? 'نزيل الغرفة' : 'In-House Guest'),
      guest_phone: '',
      estimated_total: 0,
      currency: 'SAR',
      notes: notes.trim(),
      target_whatsapp: targetWhatsApp,
      whatsapp_message_en: generatedMsg.textEn,
      whatsapp_message_ar: generatedMsg.textAr,
      status: 'RECEIVED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveOperationalRequest(newRequest);

    submitProductionRequest({
      id: reqId,
      reference: reqId,
      hotelId: hotel.id,
      hotelNameEn: hotel.name_en,
      hotelNameAr: hotel.name_ar,
      department: normalizeDepartmentCode(service.category || service.departmentId),
      requestType: isAr ? service.nameAr : service.nameEn,
      customerType: 'IN_HOUSE',
      roomNumber: currentRoom.trim(),
      guestName: guestName.trim() || (isAr ? 'نزيل الغرفة' : 'In-House Guest'),
      total: 0,
      currency: 'SAR',
      notes: notes.trim() || undefined,
      status: 'NEW',
      channel: 'DIRECT_PORTAL',
      targetWhatsApp: targetWhatsApp,
      whatsappMessageEn: generatedMsg.textEn,
      whatsappMessageAr: generatedMsg.textAr,
    }).catch((err) => console.error('[InRoomServiceRequestModal] Production request failed:', err));

    onSetRoomNumber(currentRoom.trim());

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedReqId(reqId);
      if (onSuccess) onSuccess(reqId);
    }, 400);
  };

  // 2. Direct WhatsApp Launch
  const handleLaunchWhatsApp = () => {
    if (!validate()) return;
    onSetRoomNumber(currentRoom.trim());

    const generatedMsg = getPreparedWhatsAppMessage();
    const reqId = `REQ-${Date.now().toString().slice(-5)}`;

    const newRequest: OperationalRequest = {
      id: reqId,
      hotel_id: hotel.id,
      hotel_name_en: hotel.name_en,
      hotel_name_ar: hotel.name_ar,
      department:
        service.category === 'maintenance'
          ? 'engineering'
          : service.category === 'room_service'
          ? 'fnb'
          : 'housekeeping',
      department_name_en: currentDeptLabel.en,
      department_name_ar: currentDeptLabel.ar,
      outlet_or_service_name_en: service.nameEn,
      outlet_or_service_name_ar: service.nameAr,
      customer_type: 'IN_HOUSE',
      room_number: currentRoom.trim(),
      guest_name: guestName.trim() || (isAr ? 'نزيل الغرفة' : 'In-House Guest'),
      guest_phone: '',
      estimated_total: 0,
      currency: 'SAR',
      notes: notes.trim(),
      target_whatsapp: targetWhatsApp,
      whatsapp_message_en: generatedMsg.textEn,
      whatsapp_message_ar: generatedMsg.textAr,
      status: 'RECEIVED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveOperationalRequest(newRequest);

    submitProductionRequest({
      id: reqId,
      reference: reqId,
      hotelId: hotel.id,
      hotelNameEn: hotel.name_en,
      hotelNameAr: hotel.name_ar,
      department: normalizeDepartmentCode(service.category || service.departmentId),
      requestType: isAr ? service.nameAr : service.nameEn,
      customerType: 'IN_HOUSE',
      roomNumber: currentRoom.trim(),
      guestName: guestName.trim() || (isAr ? 'نزيل الغرفة' : 'In-House Guest'),
      total: 0,
      currency: 'SAR',
      notes: notes.trim() || undefined,
      status: 'NEW',
      channel: 'WHATSAPP',
      targetWhatsApp: targetWhatsApp,
      whatsappMessageEn: generatedMsg.textEn,
      whatsappMessageAr: generatedMsg.textAr,
    }).catch((err) => console.error('[InRoomServiceRequestModal] Production request failed:', err));

    const cleanNumber = targetWhatsApp.replace(/[^0-9]/g, '');
    const url = buildWhatsAppLink(cleanNumber, isAr ? generatedMsg.textAr : generatedMsg.textEn);
    window.open(url, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <ServiceIcon name={service.icon} size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                <Building2 size={12} />
                <span>{isAr ? currentDeptLabel.ar : currentDeptLabel.en}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-serif leading-tight">
                {isAr ? service.nameAr : service.nameEn}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-stone-800 text-sm">
          {/* Success State Screen */}
          {submittedReqId ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-stone-900">
                  {isAr ? 'تم استلام طلبك بنجاح' : 'Request Received Successfully'}
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {isAr
                    ? `رقم المرجع ${submittedReqId} لغرفة ${currentRoom}. تم توجيه الطلب إلى ${currentDeptLabel.ar}.`
                    : `Reference ${submittedReqId} for Room ${currentRoom}. Dispatched directly to ${currentDeptLabel.en}.`}
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock size={14} className="text-amber-600" />
                  <span>{isAr ? 'وقت الاستجابة المتوقع:' : 'Estimated response:'}</span>
                </span>
                <span className="font-bold text-stone-900">
                  {service.slaMinutes || 15} {isAr ? 'دقيقة' : 'minutes'}
                </span>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={handleLaunchWhatsApp}
                  className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 text-sm shadow-sm transition-all cursor-pointer"
                >
                  <MessageSquare size={16} />
                  <span>{isAr ? 'متابعة عبر واتساب مباشرة' : 'Open in WhatsApp Directly'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full h-11 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm transition-all cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Description & SLA Notice */}
              <div className="flex items-start justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs">
                <p className="text-stone-600 leading-relaxed font-normal">
                  {isAr ? service.descriptionAr : service.descriptionEn}
                </p>
                <div className="flex items-center gap-1 font-semibold text-amber-700 shrink-0 bg-amber-500/10 px-2 py-1 rounded-lg">
                  <Clock size={12} />
                  <span>
                    ~{service.slaMinutes || 15} {isAr ? 'د' : 'min'}
                  </span>
                </div>
              </div>

              {/* Room Number Input & Guest Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {isAr ? 'رقم الغرفة' : 'Room Number'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: 402' : 'e.g. 402'}
                    value={currentRoom}
                    onChange={(e) => {
                      setCurrentRoom(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-stone-900 bg-stone-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {isAr ? 'اسم النزيل (اختياري)' : 'Guest Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'الاسم الكريم' : 'Your name'}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 bg-stone-50/50"
                  />
                </div>
              </div>

              {/* DYNAMIC FORM SECTION: Simple Quantity */}
              {service.requestType === 'simple_quantity' && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-stone-800 text-xs sm:text-sm">
                      {isAr ? 'الكمية المطلوبة' : 'Requested Quantity'}
                    </span>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {isAr ? 'حدد عدد القطع الإضافية المطلوبة' : 'Specify number of items to deliver'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-bold text-stone-900 text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* DYNAMIC FORM SECTION: Toiletries Kit Multi-Select */}
              {service.requestType === 'toiletries_kit' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-800">
                      {isAr ? 'حدد المستلزمات المطلوبة' : 'Select Amenities Needed'}
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllToiletries}
                      className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      {selectedItems.length === (service.options?.length || 0)
                        ? isAr
                          ? 'إلغاء التحديد'
                          : 'Deselect All'
                        : isAr
                        ? 'تحديد الكل'
                        : 'Select All'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(isAr && service.optionsAr ? service.optionsAr : service.options || []).map((item, idx) => {
                      const isChecked = selectedItems.includes(item);
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleToggleItem(item)}
                          className={`p-2.5 rounded-xl border text-xs text-start font-medium transition-all flex items-center gap-2 cursor-pointer ${
                            isChecked
                              ? 'bg-amber-50/80 border-amber-500/50 text-amber-900 font-semibold'
                              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                              isChecked
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isChecked && '✓'}
                          </div>
                          <span className="truncate">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DYNAMIC FORM SECTION: Maintenance Issue Selection */}
              {service.requestType === 'maintenance_issue' && service.options && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-800">
                    {isAr ? 'نوع المشكلة الفنية' : 'Select Issue Type'}
                  </label>
                  <div className="space-y-1.5">
                    {(isAr && service.optionsAr ? service.optionsAr : service.options).map((opt, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          selectedIssue === opt
                            ? 'bg-amber-50/80 border-amber-500/50 text-amber-900 font-semibold'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="maintenance-opt"
                          checked={selectedIssue === opt}
                          onChange={() => setSelectedIssue(opt)}
                          className="accent-amber-600"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* DYNAMIC FORM SECTION: Wake-Up Call */}
              {service.requestType === 'wake_up' && (
                <div className="space-y-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-800">
                      {isAr ? 'يوم الإيقاظ' : 'Wake-Up Day'}
                    </span>
                    <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-white text-xs">
                      <button
                        type="button"
                        onClick={() => setWakeUpDate('today')}
                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                          wakeUpDate === 'today' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600'
                        }`}
                      >
                        {isAr ? 'اليوم' : 'Today'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWakeUpDate('tomorrow')}
                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                          wakeUpDate === 'tomorrow' ? 'bg-stone-900 text-white font-semibold' : 'text-stone-600'
                        }`}
                      >
                        {isAr ? 'غداً' : 'Tomorrow'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {isAr ? 'وقت الإيقاظ المطلوب' : 'Wake-Up Time'}
                    </label>
                    <input
                      type="time"
                      value={wakeUpTime}
                      onChange={(e) => setWakeUpTime(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-stone-300 font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* DYNAMIC FORM SECTION: Luggage */}
              {service.requestType === 'luggage' && (
                <div className="space-y-3.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLuggageType('pickup')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                        luggageType === 'pickup'
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {isAr ? 'استلام من الغرفة (مغادرة)' : 'Pickup from Room (Departure)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLuggageType('delivery')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                        luggageType === 'delivery'
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {isAr ? 'توصيل إلى الغرفة' : 'Delivery to Room'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-semibold text-stone-800 text-xs">
                        {isAr ? 'عدد الحقائب' : 'Number of Bags'}
                      </span>
                      <p className="text-[11px] text-stone-500">
                        {isAr ? 'الحقائب الكبيرة أو الصغيرة' : 'Suitcases or parcel items'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-stone-900 text-sm">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200/80">
                    <span className="block text-xs font-semibold text-stone-800 mb-1.5">
                      {isAr ? 'وقت الخدمة المطلوبة' : 'Timing Preference'}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                        <input
                          type="radio"
                          name="luggage-time"
                          checked={luggageTime === 'immediate'}
                          onChange={() => setLuggageTime('immediate')}
                          className="accent-amber-600"
                        />
                        <span>{isAr ? 'في أقرب وقت ممكن (فوري)' : 'Immediately (ASAP)'}</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                        <input
                          type="radio"
                          name="luggage-time"
                          checked={luggageTime === 'scheduled'}
                          onChange={() => setLuggageTime('scheduled')}
                          className="accent-amber-600"
                        />
                        <span>{isAr ? 'تحديد موعد' : 'Schedule Time'}</span>
                      </label>
                    </div>
                    {luggageTime === 'scheduled' && (
                      <div className="mt-2">
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-stone-300 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {isAr ? 'ملاحظات إضافية أو تفاصيل' : 'Additional Notes or Instructions'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isAr
                      ? 'اكتب أي ملاحظة أو وقت مفضل للتوصيل...'
                      : 'Any specific instructions or delivery timing...'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 text-xs leading-relaxed bg-stone-50/50 resize-none"
                />
              </div>

              {/* Routing Notice */}
              <div className="flex items-center justify-between text-[11px] text-stone-500 bg-stone-100/70 p-2.5 rounded-xl">
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-stone-400" />
                  <span>{isAr ? 'توجيه مباشر للقسم المختص:' : 'Routed directly to:'}</span>
                </span>
                <span className="font-semibold text-stone-700 font-mono">
                  {isAr ? currentDeptLabel.ar : currentDeptLabel.en} ({targetWhatsApp})
                </span>
              </div>

              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                {/* Send In-App Request */}
                <button
                  type="button"
                  onClick={handleSendInApp}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 h-12 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white font-semibold flex items-center justify-center gap-2 text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--hotel-button, #8b6f4e)' }}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? (isAr ? 'جارِ الإرسال...' : 'Sending...') : isAr ? 'إرسال الطلب' : 'Send Request'}</span>
                </button>

                {/* Send via WhatsApp */}
                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  className="w-full sm:w-auto h-12 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 text-sm shadow-sm transition-all cursor-pointer"
                >
                  <MessageSquare size={16} />
                  <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
