import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  ShoppingBag,
  ChefHat,
  Flame,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Calendar,
  Wine,
} from 'lucide-react';
import { FBOutlet, MenuItem, OrderBasketItem } from '../../types/department';
import { Language, HotelOffer } from '../../types/hotel';
import { getOperatingStatus, buildWhatsAppLink } from '../../utils/operatingStatus';
import { MenuItemModal } from './MenuItemModal';
import { OrderBasketDrawer } from './OrderBasketDrawer';

interface FBOutletDetailPageProps {
  outlet: FBOutlet;
  currency: string;
  language: Language;
  roomNumber: string;
  onBackToHub: () => void;
  onSelectOffer?: (offer: HotelOffer) => void;
}

export const FBOutletDetailPage: React.FC<FBOutletDetailPageProps> = ({
  outlet,
  currency,
  language,
  roomNumber,
  onBackToHub,
}) => {
  const isAr = language === 'ar';
  const status = getOperatingStatus(outlet.operating_info, language);

  // Selected Category tab in Menu
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>(() => {
    return outlet.menu_categories.length > 0 ? outlet.menu_categories[0].code : 'ALL';
  });

  // Modal states
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [basketItems, setBasketItems] = useState<OrderBasketItem[]>([]);
  const [orderToast, setOrderToast] = useState<string | null>(null);

  // Mini Bar refill notification state
  const [miniBarRequested, setMiniBarRequested] = useState<string | null>(null);

  // Table reservation modal state for restaurants
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableDate, setTableDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tableTime, setTableTime] = useState('20:00');
  const [tableGuests, setTableGuests] = useState(2);
  const [tableSpecialRequest, setTableSpecialRequest] = useState('');
  const [tableSuccessRef, setTableSuccessRef] = useState<string | null>(null);

  // Basket total items count
  const totalBasketCount = basketItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddToBasket = (newItem: OrderBasketItem) => {
    setBasketItems((prev) => {
      // Check if exact same item with same options exists
      const existingIndex = prev.findIndex(
        (i) =>
          i.menu_item_id === newItem.menu_item_id &&
          JSON.stringify(i.selected_options) === JSON.stringify(newItem.selected_options) &&
          i.notes === newItem.notes
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        updated[existingIndex].total_price += newItem.total_price;
        return updated;
      }
      return [...prev, newItem];
    });

    setOrderToast(
      isAr
        ? `تمت إضافة "${newItem.name_ar}" إلى السلة`
        : `Added "${newItem.name_en}" to order basket`
    );
    setTimeout(() => setOrderToast(null), 3000);
  };

  const handleUpdateQuantity = (basketItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(basketItemId);
      return;
    }
    setBasketItems((prev) =>
      prev.map((item) => {
        if (item.id === basketItemId) {
          return {
            ...item,
            quantity: newQty,
            total_price: item.unit_price * newQty,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (basketItemId: string) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== basketItemId));
  };

  const handleClearBasket = () => {
    setBasketItems([]);
  };

  // Direct WhatsApp general inquiry link
  const generalWhatsAppUrl = buildWhatsAppLink(
    outlet.contact.whatsapp_number,
    isAr ? outlet.contact.default_message_ar : outlet.contact.default_message_en
  );

  // Mini Bar instant restock
  const handleRequestMiniBarRefill = (actionType: 'restock' | 'ice_bucket' | 'snack_basket') => {
    const actionLabel =
      actionType === 'restock'
        ? isAr ? 'إعادة تعبئة الميني بار بالكامل' : 'Full Mini Bar Restock'
        : actionType === 'ice_bucket'
        ? isAr ? 'دلو مكعبات ثلج نقي' : 'Fresh Ice Bucket'
        : isAr ? 'سلة شوكولاتة وسناكات فاخرة' : 'Artisan Snack Basket';

    const msg = isAr
      ? `🛎️ طلب خدمة الغرفة [${roomNumber || 'نزيل'}]: يرجى توفير (${actionLabel}) إلى الغرفة.`
      : `🛎️ Room Request [${roomNumber || 'Resident'}]: Please dispatch (${actionLabel}) to our suite.`;

    const cleanNumber = outlet.contact.whatsapp_number.replace(/[^0-9]/g, '');
    window.open(buildWhatsAppLink(cleanNumber, msg), '_blank');
    setMiniBarRequested(actionLabel);
    setTimeout(() => setMiniBarRequested(null), 4000);
  };

  // Table reservation submission
  const handleConfirmTableReservation = () => {
    const refCode = `TB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const msg = isAr
      ? `🍽️ *طلب حجز طاولة - ${outlet.name_ar}*\n` +
        `رقم المرجع: *${refCode}*\n` +
        `التاريخ: ${tableDate}\n` +
        `الوقت: ${tableTime}\n` +
        `عدد الضيوف: ${tableGuests}\n` +
        `الغرفة: ${roomNumber || 'حجز خارجي'}\n` +
        (tableSpecialRequest ? `ملاحظات: ${tableSpecialRequest}\n` : '') +
        `يرجى تأكيد توفر الطاولة.`
      : `🍽️ *Table Reservation Request — ${outlet.name_en}*\n` +
        `Reference: *${refCode}*\n` +
        `Date: ${tableDate}\n` +
        `Time: ${tableTime}\n` +
        `Guests: ${tableGuests}\n` +
        `Room: ${roomNumber || 'Non-resident'}\n` +
        (tableSpecialRequest ? `Notes: ${tableSpecialRequest}\n` : '') +
        `Please confirm table availability.`;

    const cleanNumber = outlet.contact.whatsapp_number.replace(/[^0-9]/g, '');
    window.open(buildWhatsAppLink(cleanNumber, msg), '_blank');
    setTableSuccessRef(refCode);
  };

  // Filter items by category
  const activeCategory = outlet.menu_categories.find((c) => c.code === selectedCategoryCode);
  const displayedItems = activeCategory?.items || [];

  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-900" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {orderToast && (
        <div className="fixed bottom-6 start-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-stone-800 animate-slide-up">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <span>{orderToast}</span>
        </div>
      )}

      {/* Floating Order Basket Button (When items exist) */}
      {totalBasketCount > 0 && (
        <button
          onClick={() => setIsBasketOpen(true)}
          className="fixed bottom-6 end-6 z-40 bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-2xl shadow-xl shadow-amber-900/30 flex items-center gap-3 font-semibold text-sm transition-all transform hover:scale-105 cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag size={20} />
            <span className="absolute -top-2 -end-2 bg-stone-900 text-amber-300 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center border-2 border-amber-600">
              {totalBasketCount}
            </span>
          </div>
          <span>{isAr ? 'عرض سلة الطلبات' : 'View Order Basket'}</span>
        </button>
      )}

      {/* Top Breadcrumb & Return Bar */}
      <div className="bg-white border-b border-stone-200/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBackToHub}
            className="flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer group"
          >
            {isAr ? (
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            ) : (
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            )}
            <span>{isAr ? 'العودة لمركز المطاعم والمقاهي' : 'Back to Dining Hub'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                status.isOpen
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {isAr ? status.badge_ar : status.badge_en}
            </span>
            <span className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-medium">
              {outlet.audience === 'IN_HOUSE'
                ? isAr ? 'نزلاء الفندق فقط' : 'In-House Exclusive'
                : isAr ? 'متاح للجميع' : 'Public & Guests'}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Outlet Hero Section */}
      <div className="relative bg-stone-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={outlet.hero_image}
            alt={isAr ? outlet.name_ar : outlet.name_en}
            className="w-full h-full object-cover opacity-35 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-600/90 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {outlet.outlet_type.replace('_', ' ')}
              </span>
              {outlet.cuisine_en && (
                <span className="bg-white/10 backdrop-blur-md text-amber-200 text-xs px-3 py-1 rounded-full border border-white/10">
                  {isAr ? outlet.cuisine_ar : outlet.cuisine_en}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif leading-tight">
              {isAr ? outlet.name_ar : outlet.name_en}
            </h1>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              {isAr ? outlet.full_description_ar : outlet.full_description_en}
            </p>

            {/* Quick Action Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {outlet.contact.whatsapp_enabled && (
                <a
                  href={generalWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-900/20 transition-all"
                >
                  <MessageSquare size={16} />
                  <span>
                    {isAr
                      ? `محادثة واتساب ${outlet.name_ar}`
                      : `WhatsApp ${outlet.name_en}`}
                  </span>
                </a>
              )}

              {outlet.outlet_type === 'restaurant' && (
                <button
                  onClick={() => setShowTableModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-amber-900/20 transition-all cursor-pointer"
                >
                  <Calendar size={16} />
                  <span>{isAr ? 'طلب حجز طاولة' : 'Request Table Reservation'}</span>
                </button>
              )}

              {outlet.contact.phone && (
                <a
                  href={`tel:${outlet.contact.phone}`}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 border border-white/15 backdrop-blur-sm transition-all"
                >
                  <Phone size={15} />
                  <span>
                    {outlet.contact.phone} (Ext: {outlet.contact.extension})
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operational & Location Quick Information Banner */}
      <div className="bg-white border-b border-stone-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-700">
          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <MapPin size={16} />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-0.5">
                {isAr ? 'موقع المنفذ بالفندق' : 'Physical Location'}
              </h4>
              <p className="text-stone-600 font-medium">
                {isAr ? outlet.location.building_ar : outlet.location.building_en} •{' '}
                {isAr ? outlet.location.floor_ar : outlet.location.floor_en}
              </p>
              <p className="text-stone-500 mt-0.5">
                {isAr ? outlet.location.internal_text_ar : outlet.location.internal_text_en}
              </p>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-0.5">
                {isAr ? 'ساعات العمل وفترات الخدمة' : 'Service Periods & Hours'}
              </h4>
              <p className="text-stone-600 font-medium">
                {isAr ? outlet.operating_info.opening_hours_ar : outlet.operating_info.opening_hours_en}
              </p>
              {outlet.operating_info.periods && outlet.operating_info.periods.length > 0 && (
                <div className="mt-1 space-y-0.5 text-[11px] text-stone-500">
                  {outlet.operating_info.periods.map((p, idx) => (
                    <div key={idx} className="flex justify-between gap-4">
                      <span>{isAr ? p.name_ar : p.name_en}:</span>
                      <span className="font-mono">{isAr ? p.time_ar : p.time_en}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dress code / Guidelines */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 mb-0.5">
                {isAr ? 'الزي المعتمد وإرشادات الدخول' : 'Dress Code & Guidelines'}
              </h4>
              <p className="text-stone-600">
                {outlet.dress_code_en
                  ? isAr ? outlet.dress_code_ar : outlet.dress_code_en
                  : isAr ? 'كاجوال أنيق مريح' : 'Comfortable Smart Casual'}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {isAr
                  ? 'مرحب بجميع نزلاء الفندق وضيوف المدينة.'
                  : 'Welcoming hotel residents and outside patrons.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Bar Quick Refill Actions (Only for Mini Bar outlet) */}
      {outlet.outlet_type === 'mini_bar' && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  {isAr ? 'خدمة الغرف المباشرة' : 'Instant Suite Service'}
                </span>
                <h3 className="text-lg font-bold font-serif">
                  {isAr ? 'طلب إعادة تزويد أو مستلزمات إضافية للميني بار' : 'Request Mini Bar Restock or Special Amenities'}
                </h3>
                <p className="text-xs text-stone-300 max-w-xl">
                  {isAr
                    ? `هل ترغب في تجديد ثلاجة الغرفة رقم ${roomNumber || 'الغرفة'} بمشروبات إضافية أو مكعبات ثلج؟ انقر لتأكيد الطلب الفوري.`
                    : `Need your suite bar restocked or extra ice delivered to Room ${roomNumber || ''}? Request with one click.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleRequestMiniBarRefill('restock')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isAr ? 'إعادة تعبئة كاملة' : 'Request Full Restock'}
                </button>
                <button
                  onClick={() => handleRequestMiniBarRefill('ice_bucket')}
                  className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-4 py-2.5 rounded-xl border border-white/15 transition-all cursor-pointer"
                >
                  {isAr ? 'طلب دلو ثلج' : 'Request Ice Bucket'}
                </button>
                <button
                  onClick={() => handleRequestMiniBarRefill('snack_basket')}
                  className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-4 py-2.5 rounded-xl border border-white/15 transition-all cursor-pointer"
                >
                  {isAr ? 'سلة شوكولاتة وسناكات' : 'Snack Basket'}
                </button>
              </div>
            </div>

            {miniBarRequested && (
              <div className="mt-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2 rounded-xl flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                <span>
                  {isAr
                    ? `تم استلام طلب (${miniBarRequested}) وجاري التجهيز لغرفتك.`
                    : `Request for (${miniBarRequested}) dispatched to housekeeping valet.`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Outlet Body: Digital Menu Categories and Items */}
      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {/* If Outlet has Menu Categories */}
        {outlet.menu_categories.length > 0 ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  {isAr ? 'قائمة الطعام والمشروبات' : 'Culinary Repertoire'}
                </span>
                <h2 className="text-2xl font-bold font-serif text-stone-900 mt-0.5">
                  {isAr ? 'القائمة الرقمية الكاملة' : 'Full Digital Menu'}
                </h2>
              </div>

              {/* In-House Room preservation label */}
              {roomNumber && (
                <div className="bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl text-xs text-stone-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>
                    {isAr ? `نزيل نشط • غرفة ${roomNumber}` : `Resident • Room ${roomNumber}`}
                  </span>
                </div>
              )}
            </div>

            {/* Menu Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200">
              {outlet.menu_categories.map((category) => {
                const isSelected = category.code === selectedCategoryCode;
                const itemsCount = category.items?.length || 0;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryCode(category.code)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-amber-900 text-white shadow-sm'
                        : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200/80'
                    }`}
                  >
                    <span>{isAr ? category.name_ar : category.name_en}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-amber-800 text-amber-100' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {itemsCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Category Description */}
            {activeCategory?.description_en && (
              <p className="text-xs text-stone-500 mt-3 italic">
                {isAr ? activeCategory.description_ar : activeCategory.description_en}
              </p>
            )}

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {displayedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 justify-between"
                >
                  {/* Item Image */}
                  <div className="sm:w-36 h-36 rounded-xl overflow-hidden bg-stone-100 shrink-0 relative">
                    <img
                      src={item.image}
                      alt={isAr ? item.name_ar : item.name_en}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {item.is_chef_choice && (
                      <span className="absolute top-2 start-2 bg-stone-900/90 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ChefHat size={10} />
                        <span>{isAr ? 'الشيف' : 'Chef'}</span>
                      </span>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-stone-900 text-sm font-serif">
                          {isAr ? item.name_ar : item.name_en}
                        </h4>
                        <div className="text-end shrink-0">
                          <span className="font-bold text-amber-900 text-sm">
                            {item.offer_price ?? item.price} {currency}
                          </span>
                          {item.old_price && (
                            <span className="block text-[11px] text-stone-400 line-through">
                              {item.old_price} {currency}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-stone-600 text-xs mt-1 line-clamp-2 leading-relaxed">
                        {isAr ? item.description_ar : item.description_en}
                      </p>

                      {/* Dietary Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {item.calories && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                            {item.calories} {isAr ? 'سعرة' : 'kcal'}
                          </span>
                        )}
                        {item.is_vegetarian && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                            {isAr ? 'نباتي' : 'Vegetarian'}
                          </span>
                        )}
                        {item.is_spicy && (
                          <span className="text-[10px] bg-rose-50 text-rose-800 font-semibold px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Flame size={10} />
                            <span>{isAr ? 'حار' : 'Spicy'}</span>
                          </span>
                        )}
                        {item.option_groups && item.option_groups.length > 0 && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 font-medium px-2 py-0.5 rounded">
                            {isAr ? 'خيارات متعددة' : 'Customizable'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedItemForModal(item)}
                        className="text-xs font-semibold text-amber-900 hover:text-amber-700 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>{isAr ? 'التفاصيل والخيارات' : 'Details & Options'}</span>
                      </button>

                      <button
                        onClick={() => setSelectedItemForModal(item)}
                        className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <ShoppingBag size={13} />
                        <span>{isAr ? 'إضافة للطلب' : 'Add to Order'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Outlet with No Direct Menu items (e.g. Banquet, Rooftop Lounge with À La Carte service) */
          <div className="bg-white rounded-2xl p-8 border border-stone-200/80 shadow-2xs text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
              <Wine size={28} />
            </div>
            <h3 className="text-xl font-bold font-serif text-stone-900">
              {isAr ? 'حجوزات واستفسارات المناسبات الخاصة' : 'Inquiries & Private Table Reservations'}
            </h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
              {isAr
                ? 'يقدم هذا المنفذ قوائم طعام خاصة وموسمية ومشروبات راقية. يمكنك التواصل المباشر مع طاقم الضيافة للاطلاع على القائمة الحصرية وحجز طاولتك.'
                : 'This venue offers seasonal tasting menus, chef creations, and bespoke mocktails. Contact our hospitality hosts directly to reserve your experience.'}
            </p>
            {outlet.contact.whatsapp_enabled && (
              <a
                href={generalWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all"
              >
                <MessageSquare size={15} />
                <span>
                  {isAr ? 'مراسلة المنفذ عبر واتساب' : 'Inquire via WhatsApp'}
                </span>
              </a>
            )}
          </div>
        )}

        {/* Gallery Showcase */}
        {outlet.gallery && outlet.gallery.length > 0 && (
          <div className="pt-6 border-t border-stone-200">
            <h3 className="text-lg font-bold font-serif text-stone-900 mb-4">
              {isAr ? 'معرض صور المنفذ والأجواء' : 'Atmosphere & Gallery'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {outlet.gallery.map((img, idx) => (
                <div key={idx} className="h-48 rounded-xl overflow-hidden bg-stone-100 shadow-2xs">
                  <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Item Customization Modal */}
      {selectedItemForModal && (
        <MenuItemModal
          item={selectedItemForModal}
          currency={currency}
          language={language}
          onClose={() => setSelectedItemForModal(null)}
          onAddToBasket={handleAddToBasket}
        />
      )}

      {/* Order Basket Drawer */}
      {isBasketOpen && (
        <OrderBasketDrawer
          outlet={outlet}
          items={basketItems}
          currency={currency}
          language={language}
          roomNumber={roomNumber}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearBasket={handleClearBasket}
          onClose={() => setIsBasketOpen(false)}
          onOrderSuccess={(ref) => {
            setOrderToast(
              isAr
                ? `تم تأكيد الطلب بنجاح برقم مرجع: ${ref}`
                : `Order confirmed successfully with reference: ${ref}`
            );
          }}
        />
      )}

      {/* Table Reservation Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-base text-stone-900 font-serif">
                {isAr ? 'طلب حجز طاولة' : 'Table Reservation Request'}
              </h3>
              <button
                onClick={() => {
                  setShowTableModal(false);
                  setTableSuccessRef(null);
                }}
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {tableSuccessRef ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} />
                </div>
                <h4 className="font-bold text-stone-900 text-base">
                  {isAr ? 'تم إرسال طلب الحجز بنجاح' : 'Reservation Request Dispatched!'}
                </h4>
                <p className="text-xs font-mono font-bold text-stone-700 bg-stone-100 py-1.5 px-3 rounded-lg inline-block">
                  {tableSuccessRef}
                </p>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  {isAr
                    ? 'سيقوم فريق المطعم بتأكيد طاولتك وتجهيز الترتيبات الخاصة.'
                    : 'The restaurant host will review your request and confirm table placement.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    {isAr ? 'تاريخ الحجز' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={tableDate}
                    onChange={(e) => setTableDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      {isAr ? 'وقت الوصول' : 'Time'}
                    </label>
                    <select
                      value={tableTime}
                      onChange={(e) => setTableTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                    >
                      <option value="18:30">18:30</option>
                      <option value="19:00">19:00</option>
                      <option value="19:30">19:30</option>
                      <option value="20:00">20:00</option>
                      <option value="20:30">20:30</option>
                      <option value="21:00">21:00</option>
                      <option value="21:30">21:30</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      {isAr ? 'عدد الضيوف' : 'Guests'}
                    </label>
                    <select
                      value={tableGuests}
                      onChange={(e) => setTableGuests(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((num) => (
                        <option key={num} value={num}>
                          {num} {isAr ? 'أشخاص' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    {isAr ? 'ملاحظات أو مناسبة خاصة (ذكرى سنوية، طاولة هادئة)' : 'Special Requests or Occasion'}
                  </label>
                  <textarea
                    value={tableSpecialRequest}
                    onChange={(e) => setTableSpecialRequest(e.target.value)}
                    rows={2}
                    placeholder={isAr ? 'طاولة هادئة بجوار النافورة...' : 'Window seat, anniversary celebration...'}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleConfirmTableReservation}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>{isAr ? 'تأكيد الحجز عبر واتساب' : 'Confirm via WhatsApp'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
