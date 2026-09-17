import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Clock,
  MessageSquare,
  DoorClosed,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import {
  InRoomServiceItem,
  InRoomServiceCategoryItem,
} from '../../types/inRoomServices';
import {
  INITIAL_IN_ROOM_CATEGORIES,
  INITIAL_IN_ROOM_SERVICES,
  DEFAULT_DEPARTMENT_WHATSAPP_CONFIG,
} from '../../data/inRoomServicesData';
import { InRoomServiceRequestModal } from './InRoomServiceRequestModal';
import { ServiceIcon } from '../../utils/serviceIcons';

interface InRoomServicesHubPageProps {
  hotel: Hotel;
  language: Language;
  roomNumber: string;
  onSetRoomNumber: (room: string) => void;
  onNavigateToDining?: () => void;
}

export const InRoomServicesHubPage: React.FC<InRoomServicesHubPageProps> = ({
  hotel,
  language,
  roomNumber,
  onSetRoomNumber,
  onNavigateToDining,
}) => {
  const isAr = language === 'ar';
  const NextArrow = isAr ? ArrowLeft : ArrowRight;
  const BackArrow = isAr ? ArrowRight : ArrowLeft;
  const ChevronNext = isAr ? ChevronLeft : ChevronRight;

  // State: selected category ID (null = Category selection screen)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<InRoomServiceItem | null>(null);
  const [showRoomNumberPrompt, setShowRoomNumberPrompt] = useState(false);
  const [tempRoomInput, setTempRoomInput] = useState(roomNumber);
  const [recentRequestId, setRecentRequestId] = useState<string | null>(null);

  // All active services
  const allServices: InRoomServiceItem[] = useMemo(() => {
    return INITIAL_IN_ROOM_SERVICES.filter((s) => s.active);
  }, []);

  // All active categories with at least 1 active service (Requirement 18: Hide empty categories)
  const activeCategories: InRoomServiceCategoryItem[] = useMemo(() => {
    return INITIAL_IN_ROOM_CATEGORIES.filter((category) => {
      if (!category.active) return false;
      const count = allServices.filter(
        (s) => s.categoryId === category.id || s.category === category.id
      ).length;
      return count > 0;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [allServices]);

  // Map category ID to category object
  const categoryMap = useMemo(() => {
    const map = new Map<string, InRoomServiceCategoryItem>();
    INITIAL_IN_ROOM_CATEGORIES.forEach((c) => map.set(c.id, c));
    return map;
  }, []);

  // Calculate dynamic service count per category
  const getCategoryServiceCount = (categoryId: string): number => {
    return allServices.filter(
      (s) => s.categoryId === categoryId || s.category === categoryId
    ).length;
  };

  // Selected category object
  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categoryMap.get(selectedCategoryId) || null;
  }, [selectedCategoryId, categoryMap]);

  // Services inside selected category
  const categoryServices = useMemo(() => {
    if (!selectedCategoryId) return [];
    return allServices.filter(
      (s) => s.categoryId === selectedCategoryId || s.category === selectedCategoryId
    );
  }, [selectedCategoryId, allServices]);

  // Search results across all categories
  const isSearchActive = searchQuery.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];
    const q = searchQuery.toLowerCase().trim();
    return allServices.filter((item) => {
      const cat = categoryMap.get(item.categoryId) || categoryMap.get(item.category);
      const catNameEn = cat?.nameEn.toLowerCase() || '';
      const catNameAr = cat?.nameAr || '';
      return (
        item.nameEn.toLowerCase().includes(q) ||
        item.nameAr.includes(q) ||
        item.descriptionEn.toLowerCase().includes(q) ||
        item.descriptionAr.includes(q) ||
        catNameEn.includes(q) ||
        catNameAr.includes(q)
      );
    });
  }, [isSearchActive, searchQuery, allServices, categoryMap]);

  // 6 Common Quick Requests (Requirement 10)
  const quickRequestShortcuts = useMemo(() => {
    const desiredIds = [
      'hk-room-cleaning', // Clean My Room
      'hk-towel-replacement', // Fresh Towels
      'amen-water-restock', // Bottled Water
      'dining-room-service', // Room Service
      'maint-ac', // Maintenance
      'fo-wakeup-call', // Wake-Up Call
    ];
    return desiredIds
      .map((id) => allServices.find((s) => s.id === id))
      .filter((s): s is InRoomServiceItem => Boolean(s))
      .slice(0, 6);
  }, [allServices]);

  // Handle service request trigger
  const handleOpenServiceModal = (service: InRoomServiceItem) => {
    if (service.categoryId === 'room_service' && onNavigateToDining) {
      // Direct access to dining experience if available, or open modal
    }
    setSelectedServiceForModal(service);
  };

  const handleSaveRoomNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempRoomInput.trim()) {
      onSetRoomNumber(tempRoomInput.trim());
      setShowRoomNumberPrompt(false);
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSearchQuery('');
    window.scrollTo({ top: 220, behavior: 'smooth' });
  };

  const handleBackToCategories = () => {
    setSelectedCategoryId(null);
    setSearchQuery('');
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24 selection:bg-amber-200 selection:text-stone-900" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Header Banner & Room Session Info */}
      <section className="bg-stone-900 text-stone-100 py-10 sm:py-14 border-b border-stone-800 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/20 via-stone-900 to-amber-950/10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium mb-3">
                <Sparkles size={13} className="text-amber-400" />
                <span>{isAr ? 'مركز خدمات الغرفة الرقمي' : 'Digital In-Room Services'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
                {isAr ? 'خدمات الغرفة والضيافة' : 'In-Room Services'}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-stone-300 max-w-2xl leading-relaxed">
                {isAr
                  ? 'اختر فئة الخدمة لطلب احتياجات غرفتك أو التدبير المنزلي والصيانة بسهولة وسرعة.'
                  : 'Select a category below to request housekeeping, room comfort, maintenance, or front desk support.'}
              </p>
            </div>

            {/* Room Number Session Widget */}
            <div className="bg-stone-800/80 backdrop-blur-sm border border-stone-700/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 max-w-sm shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <DoorClosed size={20} />
                </div>
                <div>
                  <span className="block text-[11px] text-stone-400 font-medium">
                    {isAr ? 'رقم الغرفة المسجل' : 'Your Room Number'}
                  </span>
                  <span className="text-base sm:text-lg font-bold font-mono text-white">
                    {roomNumber ? `${roomNumber}` : isAr ? 'غير محدد' : 'Not set'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setTempRoomInput(roomNumber);
                  setShowRoomNumberPrompt(true);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer px-2 py-1"
              >
                {roomNumber ? (isAr ? 'تغيير' : 'Change') : isAr ? 'تحديد' : 'Set'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        {/* Dispatched Notification Banner */}
        {recentRequestId && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-emerald-600 shrink-0" size={18} />
              <span>
                {isAr
                  ? `تم إرسال طلبك بنجاح! رقم المرجع: ${recentRequestId}`
                  : `Your request was dispatched successfully! Reference: ${recentRequestId}`}
              </span>
            </div>
            <button
              onClick={() => setRecentRequestId(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-1 text-[11px] cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        )}

        {/* Global Search Bar (Requirement 9) */}
        <div className="relative mb-8">
          <div className="relative">
            <Search
              className={`absolute ${
                isAr ? 'right-4' : 'left-4'
              } top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none`}
              size={19}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث عن خدمة… (مثل: مناشف، تكييف، وسادة، مكواة)' : 'Search hotel services… (e.g. towel, AC, pillow, iron)'}
              className={`w-full h-13 ${
                isAr ? 'pr-12 pl-12' : 'pl-12 pr-12'
              } rounded-2xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 text-sm sm:text-base shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute ${
                  isAr ? 'left-4' : 'right-4'
                } top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer`}
                title={isAr ? 'مسح البحث' : 'Clear search'}
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SCENARIO A: SEARCH ACTIVE                                                 */}
        {/* ========================================================================= */}
        {isSearchActive && (
          <section className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-200">
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  {isAr ? `نتائج البحث لـ "${searchQuery}"` : `Search Results for "${searchQuery}"`}
                </h2>
                <span className="text-xs text-stone-500">
                  {isAr
                    ? `تم العثور على ${searchResults.length} خدمة متطابقة عبر جميع الفئات`
                    : `Found ${searchResults.length} matching services across categories`}
                </span>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-amber-700 hover:text-amber-900 font-medium px-3 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                {isAr ? 'العودة إلى الفئات' : 'Back to Categories'}
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
                  <Search size={26} />
                </div>
                <h3 className="text-base font-bold text-stone-800">
                  {isAr ? 'لم نتمكن من العثور على نتائج' : 'No matching services found'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mt-1">
                  {isAr
                    ? 'جرب البحث بكلمات أخرى مثل "مناشف"، "تنظيف"، "صيانة" أو تصفح الفئات الرئيسية.'
                    : 'Try searching with different terms like "towel", "cleaning", "maintenance", or browse the categories.'}
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  {isAr ? 'عرض جميع الفئات' : 'Browse All Categories'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {searchResults.map((service) => {
                  const cat = categoryMap.get(service.categoryId) || categoryMap.get(service.category);

                  return (
                    <div
                      key={service.id}
                      className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-amber-400/70"
                    >
                      <div>
                        {/* Category Breadcrumb Tag */}
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 mb-2.5">
                          <span>{isAr ? cat?.nameAr : cat?.nameEn}</span>
                          <ChevronNext size={12} className="text-stone-400" />
                          <span className="text-stone-500">{isAr ? service.nameAr : service.nameEn}</span>
                        </div>

                        {/* Service Header */}
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-100/70 transition-colors">
                            <ServiceIcon name={service.icon} size={22} className="text-amber-700" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
                              {isAr ? service.nameAr : service.nameEn}
                            </h3>
                            <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                              {isAr ? service.descriptionAr : service.descriptionEn}
                            </p>
                          </div>
                        </div>

                        {/* Estimated Response Time */}
                        <div className="mt-3.5 flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
                          <Clock size={13} className="text-stone-400 shrink-0" />
                          <span>
                            {isAr
                              ? `الاستجابة التقديرية: ${service.responseTime || `~${service.slaMinutes || 15} دقيقة`}`
                              : `Estimated response: ${service.responseTime || `~${service.slaMinutes || 15} min`}`}
                          </span>
                        </div>
                      </div>

                      {/* Request Action Button */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          WhatsApp
                        </span>
                        <button
                          onClick={() => handleOpenServiceModal(service)}
                          className="px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 active:scale-95 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <MessageSquare size={13} className="text-amber-400" />
                          <span>{isAr ? 'طلب الخدمة' : 'Request'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* SCENARIO B: CATEGORY SELECTED VIEW (Requirement 5)                        */}
        {/* ========================================================================= */}
        {!isSearchActive && selectedCategory && (
          <section className="space-y-6 animate-in fade-in duration-200">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleBackToCategories}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition-all text-xs sm:text-sm font-semibold shadow-xs cursor-pointer group"
              >
                <BackArrow size={16} className="text-amber-600 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
                <span>{isAr ? 'العودة إلى جميع الفئات' : 'Back to Categories'}</span>
              </button>

              <span className="text-xs font-medium text-stone-500">
                {isAr
                  ? `${categoryServices.length} خدمة متوفرة`
                  : `${categoryServices.length} services available`}
              </span>
            </div>

            {/* Category Banner Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                  <ServiceIcon name={selectedCategory.icon} size={30} className="text-amber-700" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                      {isAr ? selectedCategory.nameAr : selectedCategory.nameEn}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                      {isAr ? `${categoryServices.length} خدمات` : `${categoryServices.length} Services`}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
                    {isAr ? selectedCategory.descriptionAr : selectedCategory.descriptionEn}
                  </p>
                </div>
              </div>
            </div>

            {/* Services Grid Inside Selected Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {categoryServices.map((service) => {
                return (
                  <div
                    key={service.id}
                    className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-amber-400/80"
                  >
                    <div>
                      {/* Service Header: Icon + Name */}
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-100/70 transition-colors">
                          <ServiceIcon name={service.icon} size={22} className="text-amber-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
                            {isAr ? service.nameAr : service.nameEn}
                          </h3>
                          <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                            {isAr ? service.descriptionAr : service.descriptionEn}
                          </p>
                        </div>
                      </div>

                      {/* Availability & Response Time (Requirement 7) */}
                      <div className="mt-3.5 flex items-center justify-between gap-2 text-[11px] text-stone-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-stone-400 shrink-0" />
                          <span>
                            {isAr
                              ? service.responseTime || `~${service.slaMinutes || 15} دقيقة`
                              : service.responseTime || `~${service.slaMinutes || 15} min`}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60">
                          {isAr ? (service.availableHoursAr || 'متاح 24/7') : (service.availableHoursEn || '24/7 Available')}
                        </span>
                      </div>
                    </div>

                    {/* Footer Action Button */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        WhatsApp
                      </span>
                      <button
                        onClick={() => handleOpenServiceModal(service)}
                        className="px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 active:scale-95 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <MessageSquare size={13} className="text-amber-400" />
                        <span>{isAr ? 'طلب' : 'Request'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SCENARIO C: DEFAULT CATEGORY-FIRST SCREEN (Requirement 1 & 2)             */}
        {/* ========================================================================= */}
        {!isSearchActive && !selectedCategory && (
          <section className="space-y-8 animate-in fade-in duration-200">
            {/* Quick Requests Section (Requirement 10) */}
            {quickRequestShortcuts.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>{isAr ? 'طلبات سريعة بنقرة واحدة' : 'Quick Requests'}</span>
                  </div>
                  <span className="text-[11px] text-stone-400 hidden sm:inline">
                    {isAr ? 'أكثر الطلبات طلباً للنزلاء' : 'Most common in-room requests'}
                  </span>
                </div>

                {/* Quick Request Compact Shortcut Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {quickRequestShortcuts.map((service) => (
                    <button
                      key={`quick-${service.id}`}
                      onClick={() => handleOpenServiceModal(service)}
                      className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-stone-50 hover:bg-amber-50/80 border border-stone-200/80 hover:border-amber-300 transition-all text-start cursor-pointer group active:scale-98 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-amber-700 flex items-center justify-center shrink-0 group-hover:border-amber-400 group-hover:bg-amber-100/50 transition-colors">
                        <ServiceIcon name={service.icon} size={16} className="text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-stone-900 truncate group-hover:text-amber-900">
                          {isAr ? service.nameAr : service.nameEn}
                        </span>
                        <span className="block text-[10px] text-stone-400 truncate">
                          {isAr ? service.responseTime || '~15 دقيقة' : service.responseTime || '~15 min'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Section Header: Choose a Category */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                  {isAr ? 'اختر فئة الخدمة' : 'Choose a Service Category'}
                </h2>
                <span className="text-xs font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
                  {isAr ? `${activeCategories.length} فئات رئيسية` : `${activeCategories.length} Main Categories`}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500">
                {isAr
                  ? 'انقر على الفئة المطلوبة لعرض وتخصيص كافة الخدمات المتوفرة بداخلها'
                  : 'Tap any category below to view all available services and submit requests directly'}
              </p>
            </div>

            {/* Category Cards Grid (Requirement 3 & 4) */}
            {/* Desktop: 3 cols, Tablet: 2 cols, Mobile: 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              {activeCategories.map((category) => {
                const count = getCategoryServiceCount(category.id);

                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category.id)}
                    className="relative text-start p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:shadow-md transition-all hover:border-amber-400 group cursor-pointer active:scale-98 min-h-[130px] sm:min-h-[145px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        {/* 48-52px square, subtle warm cream/beige background with gold/amber accent icon */}
                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-100 group-hover:border-amber-300 transition-colors shadow-xs">
                          <ServiceIcon name={category.icon} size={24} className="text-amber-700" />
                        </div>

                        {/* Dynamic Count Badge (Requirement 15) */}
                        <span className="text-[11px] font-bold text-stone-600 bg-stone-100 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors px-2.5 py-1 rounded-full">
                          {isAr ? `${count} خدمات` : `${count} Services`}
                        </span>
                      </div>

                      {/* Category Name */}
                      <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                        {isAr ? category.nameAr : category.nameEn}
                      </h3>

                      {/* Short Description */}
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {isAr ? category.descriptionAr : category.descriptionEn}
                      </p>
                    </div>

                    {/* Card Action Footer with Arrow */}
                    <div className="mt-4 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-700 group-hover:text-amber-800 transition-colors">
                      <span className="text-[11px]">
                        {isAr ? 'عرض الخدمات' : 'View Services'}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-stone-100 group-hover:bg-amber-200/60 flex items-center justify-center text-stone-600 group-hover:text-amber-900 transition-all group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                        <NextArrow size={13} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* 3. In-Room Service Request Parameter Modal */}
      {selectedServiceForModal && (
        <InRoomServiceRequestModal
          service={selectedServiceForModal}
          hotel={hotel}
          departmentConfigs={DEFAULT_DEPARTMENT_WHATSAPP_CONFIG}
          language={language}
          roomNumber={roomNumber}
          onSetRoomNumber={onSetRoomNumber}
          onClose={() => setSelectedServiceForModal(null)}
          onSuccess={(reqId) => {
            setSelectedServiceForModal(null);
            setRecentRequestId(reqId);
          }}
        />
      )}

      {/* 4. Room Number Prompt Modal */}
      {showRoomNumberPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {isAr ? 'تأكيد رقم الغرفة' : 'Confirm Room Number'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {isAr
                ? 'يرجى إدخال رقم غرفتك الفندقية لربط جميع طلبات الخدمة بشكل فوري.'
                : 'Please enter your hotel room number so our staff can attend to you promptly.'}
            </p>

            <form onSubmit={handleSaveRoomNumber} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {isAr ? 'رقم الغرفة' : 'Room Number'}
                </label>
                <input
                  type="text"
                  value={tempRoomInput}
                  onChange={(e) => setTempRoomInput(e.target.value)}
                  placeholder={isAr ? 'مثال: 402' : 'e.g. 402'}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRoomNumberPrompt(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {isAr ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
