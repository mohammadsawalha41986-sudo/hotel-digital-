// src/components/guest/HotelInfoContactSection.tsx
import React, { useState } from 'react';
import {
  Info,
  MapPin,
  Clock,
  Wifi,
  Car,
  Utensils,
  Shield,
  Phone,
  MessageCircle,
  ExternalLink,
  MessageSquareWarning,
  Lightbulb,
  Heart,
  Briefcase,
  AlertTriangle,
  FileText,
  VolumeX,
  CigaretteOff,
  UserCheck,
  Lock,
  Headphones,
  CheckCircle2,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import { getContactsForHotel } from '../../data/swissFloraData';
import { GuestAssistanceModal, AssistanceFormMode } from './GuestAssistanceModal';

interface HotelInfoContactSectionProps {
  hotel: Hotel;
  language: Language;
  roomNumber?: string;
}

type InfoTab = 'essentials' | 'directory' | 'feedback_hub' | 'safety';

export const HotelInfoContactSection: React.FC<HotelInfoContactSectionProps> = ({
  hotel,
  language,
  roomNumber,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<InfoTab>('essentials');

  // Modal State for Complaints / Feedback / Suggestions
  const [modalMode, setModalMode] = useState<AssistanceFormMode | null>(null);

  const contacts = getContactsForHotel(hotel.id);

  const mapSearchQuery = encodeURIComponent(
    `${hotel.name_en} ${hotel.address_en || hotel.city_en || 'Riyadh'}`
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapSearchQuery}`;

  const frontDeskPhone = hotel.phone || '+966112349999';
  const frontDeskWhatsapp = hotel.whatsapp_number || frontDeskPhone;

  return (
    <section
      id="hotel-info-contact"
      aria-label="Hotel Information and Guest Assistance"
      className="py-16 sm:py-24 bg-stone-50/70 border-b border-stone-200/80"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Main Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/70 border border-amber-300 px-3.5 py-1.5 rounded-full mb-3">
            <Info size={13} />
            <span>{isAr ? 'مركز الاستعلامات وعلاقات النزلاء' : 'GUEST RELATIONS & INFORMATION DESK'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
            {isAr ? 'معلومات الفندق ومساعدة النزيل' : 'Hotel Information & Guest Assistance'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
            {isAr
              ? 'كل ما تحتاجه خلال إقامتك، بما في ذلك معلومات الفندق، جهات الاتصال المباشرة، المساعدة، والملاحظات، وعلاقات النزلاء.'
              : 'Everything you need during your stay, including hotel information, direct contacts, assistance, feedback, and guest relations.'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto pb-3 mb-8">
          <button
            onClick={() => setActiveTab('essentials')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'essentials'
                ? 'bg-stone-900 text-white shadow-md'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Info size={16} className={activeTab === 'essentials' ? 'text-amber-300' : 'text-stone-400'} />
            <span>{isAr ? 'معلومات أساسية' : 'Essential Information'}</span>
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'directory'
                ? 'bg-stone-900 text-white shadow-md'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Phone size={16} className={activeTab === 'directory' ? 'text-amber-300' : 'text-stone-400'} />
            <span>{isAr ? 'دليل الهاتف والأقسام' : 'Hotel Directory & Contacts'}</span>
          </button>

          <button
            onClick={() => setActiveTab('feedback_hub')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'feedback_hub'
                ? 'bg-stone-900 text-white shadow-md'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <MessageSquareWarning
              size={16}
              className={activeTab === 'feedback_hub' ? 'text-amber-300' : 'text-stone-400'}
            />
            <span>{isAr ? 'علاقات النزلاء والشكاوى' : 'Guest Relations & Feedback'}</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'safety'
                ? 'bg-stone-900 text-white shadow-md'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Shield size={16} className={activeTab === 'safety' ? 'text-amber-300' : 'text-stone-400'} />
            <span>{isAr ? 'السلامة والطوارئ' : 'Safety & Assistance'}</span>
          </button>
        </div>

        {/* TAB 1: ESSENTIAL INFORMATION */}
        {activeTab === 'essentials' && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Grid: Location + Direct Reception Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Location Card */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-900 flex items-center justify-center shrink-0">
                      <MapPin size={22} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                        {isAr ? 'موقع الفندق والعنوان الرسمي' : 'PROPERTY LOCATION & ADDRESS'}
                      </span>
                      <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-900">
                        {isAr ? hotel.name_ar : hotel.name_en}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pt-1">
                    {isAr ? hotel.address_ar : hotel.address_en}
                  </p>
                  <p className="text-xs text-stone-500">
                    {isAr
                      ? `${hotel.city_ar}، ${hotel.country_ar} • موقع استراتيجي بالقرب من مراكز الأعمال والمطاعم`
                      : `${hotel.city_en}, ${hotel.country_en} • Conveniently located near prime business and leisure hubs`}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-xs text-stone-500 font-medium">
                    {isAr ? 'مواقف خاصة واستقبال على مدار 24 ساعة' : '24/7 reception & dedicated parking bays'}
                  </span>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <MapPin size={14} className="text-amber-300" />
                    <span>{isAr ? 'عرض الموقع على خرائط جوجل' : 'Open in Google Maps'}</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Direct Reception Card */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                    {isAr ? 'قنوات الاستقبال الرسمية' : 'FRONT DESK CHANNELS'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-900 mb-4">
                    {isAr ? 'مكتب الاستقبال والكونسيرج (24/7)' : 'Front Desk & Concierge (24/7)'}
                  </h3>

                  <div className="space-y-3">
                    <a
                      href={`tel:${hotel.phone}`}
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-amber-400 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white text-stone-800 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                        <Phone size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                          {isAr ? 'هاتف الفندق' : 'HOTEL PHONE'}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-stone-900 font-mono group-hover:text-amber-900 block truncate">
                          {hotel.phone}
                        </span>
                      </div>
                    </a>

                    <a
                      href={`https://wa.me/${frontDeskWhatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 hover:border-emerald-400 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <MessageCircle size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block">
                          {isAr ? 'خدمة واتساب النزلاء' : 'GUEST WHATSAPP'}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-stone-900 font-mono block truncate">
                          {hotel.whatsapp_number || hotel.phone}
                        </span>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-100 flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>
                    {isAr
                      ? 'طاقم الاستقبال متاح في خدمتكم على مدار الساعة دون انقطاع'
                      : 'Front desk associates on duty 24 hours daily'}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Grid: Check-in, WiFi, Parking, Breakfast */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* 1. Check-In & Check-Out */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100/70 text-amber-900 flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <h4 className="text-base font-bold font-serif text-stone-900">
                  {isAr ? 'الدخول والمغادرة' : 'Check-In & Check-Out'}
                </h4>
                <div className="space-y-1.5 text-xs pt-1 border-t border-stone-100">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">{isAr ? 'تسجيل الوصول:' : 'Check-in:'}</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {hotel.policies?.checkInTime || '14:00'} (2:00 PM)
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">{isAr ? 'تسجيل المغادرة:' : 'Check-out:'}</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {hotel.policies?.checkOutTime || '12:00'} (12:00 PM)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  {isAr
                    ? 'إمكانية الدخول المبكر أو المغادرة المتأخرة حسب التوفر بالتنسيق مع الاستقبال.'
                    : 'Early check-in and late check-out subject to availability.'}
                </p>
              </div>

              {/* 2. Wi-Fi Details */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-900 flex items-center justify-center">
                  <Wifi size={20} />
                </div>
                <h4 className="text-base font-bold font-serif text-stone-900">
                  {isAr ? 'شبكة الواي فاي' : 'High-Speed Wi-Fi'}
                </h4>
                <div className="space-y-1.5 text-xs pt-1 border-t border-stone-100">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">{isAr ? 'الشبكة:' : 'SSID:'}</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {hotel.policies?.wifiSsid || 'SwissFlora-Guest'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">{isAr ? 'كلمة المرور:' : 'Password:'}</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {hotel.policies?.wifiPassword || (isAr ? 'دخول مباشر' : 'Direct Login')}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  {isAr
                    ? 'إنترنت مجاني غير محدود وسريع متاح في كافة الغرف والمرافق.'
                    : 'Complimentary high-speed fiber internet throughout the property.'}
                </p>
              </div>

              {/* 3. Parking */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
                  <Car size={20} />
                </div>
                <h4 className="text-base font-bold font-serif text-stone-900">
                  {isAr ? 'المواقف والصف' : 'Parking & Valet'}
                </h4>
                <div className="space-y-1.5 text-xs pt-1 border-t border-stone-100">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">{isAr ? 'الرسوم:' : 'Fee:'}</span>
                    <span className="font-bold text-emerald-700">{isAr ? 'مجانية للنزلاء' : 'Free for Guests'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">{isAr ? 'النوع:' : 'Type:'}</span>
                    <span className="font-semibold text-stone-800">{isAr ? 'مواقف مغطاة' : 'Covered Bays'}</span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  {isAr
                    ? 'مواقف خاصة مظللة ومراقبة بالكاميرات مع خدمة المساعدة في حمل الحقائب.'
                    : 'Secure on-site covered parking with valet assistance.'}
                </p>
              </div>

              {/* 4. Breakfast Times & Venue */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100/90 text-amber-900 flex items-center justify-center">
                  <Utensils size={20} />
                </div>
                <h4 className="text-base font-bold font-serif text-stone-900">
                  {isAr ? 'بوفيه الإفطار' : 'Breakfast Buffet'}
                </h4>
                <div className="space-y-1.5 text-xs pt-1 border-t border-stone-100">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">{isAr ? 'المواعيد:' : 'Hours:'}</span>
                    <span className="font-bold text-stone-900 font-mono">06:30 - 10:30 AM</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">{isAr ? 'المطعم:' : 'Venue:'}</span>
                    <span className="font-semibold text-amber-900">
                      {hotel.id === '12'
                        ? isAr
                          ? 'لاونج الإفطار'
                          : 'Express Breakfast Lounge'
                        : isAr
                        ? 'مطعم فلورا الدولي'
                        : 'Flora Restaurant'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  {isAr
                    ? 'بوفيه دولي غني بمحطات طهي حية وخيارات صحية وقهوة مختصة طازجة.'
                    : 'Daily gourmet international buffet with live cooking and specialty coffee.'}
                </p>
              </div>
            </div>

            {/* Hotel Policies Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-serif font-bold text-stone-900">
                    {isAr ? 'سياسات وتعليمات الفندق' : 'Hotel Policies & Guest Guidelines'}
                  </h4>
                  <p className="text-xs text-stone-500">
                    {isAr ? 'لضمان أعلى درجات الراحة والسكينة لكافة النزلاء' : 'Designed to ensure optimal comfort and tranquility for all patrons'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-800">
                    <CigaretteOff size={15} className="text-amber-800" />
                    <span>{isAr ? 'سياسة التدخين' : 'Smoking Policy'}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    {isAr
                      ? 'جميع الغرف لغير المدخنين. تتوفر مساحات وتراسات خارجية مخصصة للمدخنين.'
                      : 'All indoor rooms and public areas are 100% smoke-free. Designated outdoor terraces available.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-800">
                    <VolumeX size={15} className="text-amber-800" />
                    <span>{isAr ? 'ساعات الهدوء والسكينة' : 'Quiet Hours'}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    {isAr
                      ? 'تبدأ ساعات الهدوء من 11:00 مساءً حتى 07:00 صباحاً حرصاً على راحة النزلاء.'
                      : 'Observed from 23:00 to 07:00 daily to ensure restful slumber for all guests.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-800">
                    <UserCheck size={15} className="text-amber-800" />
                    <span>{isAr ? 'سياسة الزوار' : 'Visitors Policy'}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    {isAr
                      ? 'يرجى تسجيل الزوار بهوية رسمية في مكتب الاستقبال قبل الصعود للغرف.'
                      : 'All room visitors must present official identification at the front desk before ascending.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-800">
                    <Lock size={15} className="text-amber-800" />
                    <span>{isAr ? 'الخزنة والمقتنيات' : 'In-Room Safe & Valuables'}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    {isAr
                      ? 'تتوفر خزنة إلكترونية في كل غرفة. الفندق غير مسؤول عن المقتنيات المتروكة خارجها.'
                      : 'Digital electronic safes provided in each room. Management liability restricted for unsecured items.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOTEL DIRECTORY & CONTACTS */}
        {activeTab === 'directory' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">
                  {isAr ? 'دليل الاتصال المباشر بأقسام الفندق' : 'Direct Department Phone Directory'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isAr
                    ? 'يمكنكم الاتصال فوراً من هاتف الغرفة باستخدام التحويلة، أو عبر الهاتف الخارجي والواتساب.'
                    : 'Dial internal extensions directly from room telephone, or connect via mobile phone & WhatsApp.'}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold font-mono shrink-0">
                <Phone size={14} />
                <span>{isAr ? 'تحويلة الاستقبال السريع: 0' : 'Front Desk Fast Dial: 0'}</span>
              </div>
            </div>

            {/* Department Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold font-serif text-stone-900">
                          {isAr ? contact.name_ar : contact.name_en}
                        </h4>
                        <span className="text-[11px] text-stone-500 block mt-0.5">
                          {(isAr ? contact.hours_ar : contact.hours_en) || (isAr ? 'متاح 24 ساعة' : '24/7 Available')}
                        </span>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold font-mono">
                        {isAr ? `تحويلة ${contact.extension}` : `Ext ${contact.extension}`}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      {isAr ? contact.default_message_ar : contact.default_message_en}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-stone-100 flex items-center gap-2.5">
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
                      >
                        <Phone size={13} className="text-amber-700" />
                        <span>{isAr ? 'اتصال مباشر' : 'Direct Call'}</span>
                      </a>
                    )}

                    {contact.whatsapp_number && (
                      <a
                        href={`https://wa.me/${contact.whatsapp_number.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        title={isAr ? 'محادثة واتساب' : 'WhatsApp'}
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GUEST RELATIONS & FEEDBACK HUB */}
        {activeTab === 'feedback_hub' && (
          <div className="space-y-6 animate-fade-in">
            {/* Resolution Promise Banner */}
            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-stone-900 to-stone-800 text-white shadow-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                  <Heart size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    {isAr ? 'تعهد الإدارة وضمان جودة الإقامة' : 'SERVICE RECOVERY PROMISE'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                    {isAr
                      ? 'نحرص على معالجة أي ملاحظة فوراً أثناء إقامتك'
                      : 'We Strive to Resolve Any Discomfort Immediately During Your Stay'}
                  </h3>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 max-w-3xl leading-relaxed">
                {isAr
                  ? 'هدفنا أن تكون إقامتكم استثنائية بكل المقاييس. إن واجهتكم أي مشكلة في التكييف، النظافة، جودة الطعام، أو تعامل الطاقم، يرجى إبلاغنا فوراً لنتمكن من تصحيح الأمر وإسعادكم قبل مغادرتكم.'
                  : 'Your satisfaction is our absolute priority. If you encounter any inconvenience with air conditioning, cleanliness, dining, or service speed, please alert us right away so our management can resolve it during your stay.'}
              </p>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. Submit Complaint */}
              <div
                onClick={() => setModalMode('complaint')}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-red-100 hover:border-red-300 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageSquareWarning size={22} />
                  </div>
                  <h4 className="text-base font-bold font-serif text-stone-900 group-hover:text-red-900 transition-colors">
                    {isAr ? 'تقديم شكوى أو ملاحظة' : 'Submit a Complaint'}
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {isAr
                      ? 'أبلغ عن مشكلة في الغرفة، الصيانة، النظافة أو جودة الخدمة مع متابعة إدارية مباشرة.'
                      : 'Report an issue regarding room comfort, maintenance, housekeeping or service for swift resolution.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-red-800">
                  <span>{isAr ? 'فتح نموذج الشكوى' : 'Open Complaint Form'}</span>
                  <ChevronRight size={16} className={isAr ? 'rotate-180' : ''} />
                </div>
              </div>

              {/* 2. Share Suggestion */}
              <div
                onClick={() => setModalMode('suggestion')}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-amber-100 hover:border-amber-300 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Lightbulb size={22} />
                  </div>
                  <h4 className="text-base font-bold font-serif text-stone-900 group-hover:text-amber-900 transition-colors">
                    {isAr ? 'تقديم مقترح أو فكرة تطوير' : 'Share a Suggestion'}
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {isAr
                      ? 'يسعدنا سماع أفكاركم ومقترحاتكم لتطوير مرافق وخدمات الفندق وقوائم الطعام.'
                      : 'Share your creative ideas to enhance our guest facilities, dining menus, or hospitality offerings.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-800">
                  <span>{isAr ? 'تقديم مقترحك' : 'Submit Suggestion'}</span>
                  <ChevronRight size={16} className={isAr ? 'rotate-180' : ''} />
                </div>
              </div>

              {/* 3. Compliment Staff */}
              <div
                onClick={() => setModalMode('compliment')}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Heart size={22} />
                  </div>
                  <h4 className="text-base font-bold font-serif text-stone-900 group-hover:text-emerald-900 transition-colors">
                    {isAr ? 'شكر وتقدير موظف' : 'Compliment a Staff Member'}
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {isAr
                      ? 'قدّم كلمة شكر للموظف الذي تميز في خدمتك لتكريمه وإيصال تقديرك لإدارة الفندق.'
                      : 'Recognize a dedicated team member who provided exemplary service and hospitality during your stay.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>{isAr ? 'إرسال كلمة شكر' : 'Send Commendation'}</span>
                  <ChevronRight size={16} className={isAr ? 'rotate-180' : ''} />
                </div>
              </div>

              {/* 4. Duty Manager Request */}
              <div
                onClick={() => setModalMode('duty_manager')}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 hover:border-stone-400 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Briefcase size={22} />
                  </div>
                  <h4 className="text-base font-bold font-serif text-stone-900">
                    {isAr ? 'طلب مساعدة المدير المناوب' : 'Request Duty Manager Assistance'}
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {isAr
                      ? 'للموضوعات العاجلة أو عند الرغبة في التحدث مباشرة مع المدير المناوب أو طلب زيارة للغرفة.'
                      : 'For urgent matters requiring management attention or an immediate consultation in-room or by phone.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-900">
                  <span>{isAr ? 'طلب المدير الآن' : 'Request Manager Now'}</span>
                  <ChevronRight size={16} className={isAr ? 'rotate-180' : ''} />
                </div>
              </div>

              {/* 5. General Feedback */}
              <div
                onClick={() => setModalMode('feedback')}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 hover:border-stone-400 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Headphones size={22} />
                  </div>
                  <h4 className="text-base font-bold font-serif text-stone-900">
                    {isAr ? 'ملاحظات وتقييم عام للإدارة' : 'General Management Feedback'}
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {isAr
                      ? 'شارك انطباعاتك وملاحظاتك العامة مباشرة مع الإدارة التنفيذية لضمان التطوير المستمر.'
                      : 'Direct feedback to executive management regarding overall property experience and stay impression.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-900">
                  <span>{isAr ? 'إرسال ملاحظات عامة' : 'Share Feedback'}</span>
                  <ChevronRight size={16} className={isAr ? 'rotate-180' : ''} />
                </div>
              </div>

              {/* 6. Direct Front Desk Call fallback */}
              <div className="bg-stone-100 rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white text-stone-900 flex items-center justify-center shadow-2xs">
                    <Phone size={22} />
                  </div>
                  <h4 className="text-base font-bold font-serif text-stone-900">
                    {isAr ? 'الاتصال الهاتفي الفوري' : 'Instant Phone Assistance'}
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {isAr
                      ? 'يمكنك دائماً رفع سماعة هاتف الغرفة والضغط على (0) للتحدث فوراً مع موظف الاستقبال.'
                      : 'Pick up your room telephone and dial 0 to speak directly with an on-duty front desk agent.'}
                  </p>
                </div>
                <a
                  href={`tel:${frontDeskPhone}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors"
                >
                  <Phone size={13} className="text-amber-300" />
                  <span>{isAr ? 'اتصل الآن بالاستقبال' : 'Call Front Desk Now'}</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SAFETY & ASSISTANCE */}
        {activeTab === 'safety' && (
          <div className="space-y-6 animate-fade-in">
            {/* National Emergency Numbers in Saudi Arabia */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-900 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-serif font-bold text-stone-900">
                    {isAr ? 'أرقام الطوارئ الرسمية في المملكة العربية السعودية' : 'Official Emergency Numbers in Saudi Arabia'}
                  </h4>
                  <p className="text-xs text-stone-500">
                    {isAr ? 'أرقام الاتصال المجانية المباشرة للطوارئ الوطنية' : 'Direct toll-free national emergency response contacts'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <a
                  href="tel:911"
                  className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 hover:border-red-400 transition-colors text-center group"
                >
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-red-700 block group-hover:scale-105 transition-transform">
                    911
                  </span>
                  <span className="text-xs font-bold text-stone-900 block mt-1">
                    {isAr ? 'مركز العمليات الموحد' : 'Unified Emergency'}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {isAr ? 'شرطة وطوارئ شاملة' : 'General Emergency Police'}
                  </span>
                </a>

                <a
                  href="tel:997"
                  className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 hover:border-red-400 transition-colors text-center group"
                >
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-red-700 block group-hover:scale-105 transition-transform">
                    997
                  </span>
                  <span className="text-xs font-bold text-stone-900 block mt-1">
                    {isAr ? 'الهلال الأحمر السعودي' : 'Red Crescent Ambulance'}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {isAr ? 'إسعاف الحالات الطبية' : 'Medical Ambulance'}
                  </span>
                </a>

                <a
                  href="tel:998"
                  className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 hover:border-amber-400 transition-colors text-center group"
                >
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-800 block group-hover:scale-105 transition-transform">
                    998
                  </span>
                  <span className="text-xs font-bold text-stone-900 block mt-1">
                    {isAr ? 'الدفاع المدني' : 'Civil Defense / Fire'}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {isAr ? 'مكافحة الحرائق والإنقاذ' : 'Fire & Rescue Operations'}
                  </span>
                </a>

                <a
                  href="tel:993"
                  className="p-4 rounded-2xl bg-stone-50 border border-stone-200 hover:border-stone-400 transition-colors text-center group"
                >
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-stone-800 block group-hover:scale-105 transition-transform">
                    993
                  </span>
                  <span className="text-xs font-bold text-stone-900 block mt-1">
                    {isAr ? 'المرور والحوادث' : 'Traffic Police'}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {isAr ? 'حوادث الطرق والسلامة' : 'Traffic Safety & Incidents'}
                  </span>
                </a>
              </div>
            </div>

            {/* Hotel Internal Safety & Escalation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hotel Security & Medical Aid */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <h4 className="text-base font-bold font-serif text-stone-900">
                  {isAr ? 'أمن الفندق والمساعدة الطبية' : 'Hotel Security & Medical Assistance'}
                </h4>
                <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
                  <p>
                    {isAr
                      ? '• يتواجد فريق الأمن والسلامة بالفندق على مدار الساعة لمراقبة المداخل والمخارج وضمان سلامة الضيوف.'
                      : '• Professional security team monitors property perimeters and entrances 24/7.'}
                  </p>
                  <p>
                    {isAr
                      ? '• تتوفر حقيبة إسعافات أولية متكاملة في مكتب الاستقبال، ويمكن ترتيب طبيب مناوب عند الحاجة بالتنسيق مع الكونسيرج.'
                      : '• Comprehensive first aid kit available at front desk; on-call private doctor coordination upon request.'}
                  </p>
                  <p>
                    {isAr
                      ? '• جميع الغرف والممرات مجهزة بأنظمة استشعار الدخان ورشاشات الإطفاء التلقائي ومخارج طوارئ مضاءة.'
                      : '• All suites and corridors equipped with advanced smoke detectors, fire sprinklers, and emergency exits.'}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <a
                    href={`tel:${frontDeskPhone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors"
                  >
                    <Phone size={13} className="text-amber-300" />
                    <span>{isAr ? 'اتصال بأمن الفندق (0)' : 'Call Security / Reception (0)'}</span>
                  </a>
                </div>
              </div>

              {/* Management Escalation Guarantee */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-amber-200/90 shadow-2xs space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Flame size={20} />
                </div>
                <h4 className="text-base font-bold font-serif text-stone-900">
                  {isAr ? 'مسار التصعيد الإداري المباشر' : 'Management Escalation Guarantee'}
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {isAr
                    ? 'في حال لم يتم حل طلبك أو استفسارك بما يرضيك من قبل موظفي الأقسام، يحق لك تصعيد الأمر فوراً إلى المدير المناوب أو إدارة علاقات النزلاء للحسم الفوري.'
                    : 'If your inquiry or service request has not been addressed to your complete satisfaction by department staff, you have direct recourse to escalate immediately to the Duty Manager.'}
                </p>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1 text-xs text-amber-950">
                  <span className="font-bold block">
                    {isAr ? 'التزامنا بالاستجابة الفورية:' : 'Our Immediate Response Commitment:'}
                  </span>
                  <span className="text-[11px] text-amber-900/90 leading-relaxed block">
                    {isAr
                      ? 'يتم التواصل معك خلال 15 دقيقة كحد أقصى للتعامل مع الحالات المصعدة.'
                      : 'A dedicated manager will contact or visit you within 15 minutes for escalated cases.'}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setModalMode('duty_manager')}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Briefcase size={14} />
                    <span>{isAr ? 'تصعيد المشكلة للمدير المناوب' : 'Escalate to Duty Manager'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guest Assistance / Complaint / Suggestion Modal */}
      {modalMode && (
        <GuestAssistanceModal
          hotel={hotel}
          language={language}
          initialMode={modalMode}
          roomNumber={roomNumber}
          onClose={() => setModalMode(null)}
        />
      )}
    </section>
  );
};
