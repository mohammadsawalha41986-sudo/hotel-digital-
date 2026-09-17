import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, MessageSquare, Check, Sparkles } from 'lucide-react';
import { OrderBasketItem, FBOutlet } from '../../types/department';
import { Language } from '../../types/hotel';
import { generateOperationalReference, saveOperationalRequest } from '../../utils/requestStore';
import { buildBilingualWhatsAppMessage, buildEncodedWhatsAppUrl } from '../../utils/whatsappMessageBuilder';
import { submitProductionRequest } from '../../services/requestService';

interface OrderBasketDrawerProps {
  outlet: FBOutlet;
  hotelNameEn?: string;
  hotelNameAr?: string;
  items: OrderBasketItem[];
  currency: string;
  language: Language;
  roomNumber: string;
  onUpdateQuantity: (basketItemId: string, newQuantity: number) => void;
  onRemoveItem: (basketItemId: string) => void;
  onClearBasket: () => void;
  onClose: () => void;
  onOrderSuccess: (orderRef: string) => void;
}

export const OrderBasketDrawer: React.FC<OrderBasketDrawerProps> = ({
  outlet,
  hotelNameEn,
  hotelNameAr,
  items,
  currency,
  language,
  roomNumber,
  onUpdateQuantity,
  onRemoveItem,
  onClearBasket,
  onClose,
  onOrderSuccess,
}) => {
  const isAr = language === 'ar';
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [guestName, setGuestName] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState<string | null>(null);

  // Financial calculations
  const subtotal = items.reduce((acc, item) => acc + item.total_price, 0);
  const vatRate = 0.15; // 15% VAT in Saudi Arabia
  // Note: If menu prices include VAT, compute the breakdown:
  const vatAmount = Math.round(((subtotal * vatRate) / (1 + vatRate)) * 100) / 100;
  const netAmount = Math.round((subtotal - vatAmount) * 100) / 100;
  const estimatedTotal = subtotal;

  const handlePlaceOrderWhatsApp = () => {
    const refCode = generateOperationalReference('FNB');

    const formattedItems = items.map((it) => {
      const optStr = it.selected_options.map((o) => `${o.group_title}: ${o.choice_name}`).join(', ');
      return {
        id: it.id,
        name_en: it.name_en,
        name_ar: it.name_ar,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price,
        options: optStr,
        notes: it.notes,
      };
    });

    const effectiveHotelNameEn = hotelNameEn || 'Swiss Flora Royal Hotel Riyadh';
    const effectiveHotelNameAr = hotelNameAr || 'فندق سويس فلورا رويال الرياض';
    const effectiveHotelId = outlet.hotel_id || '11';

    // 1. Build standardized bilingual WhatsApp message (English first, separator, Arabic second)
    const { englishText, arabicText, fullMessage } = buildBilingualWhatsAppMessage({
      requestTypeEn: 'New Food & Beverage Order',
      requestTypeAr: 'طلب أطعمة ومشروبات جديد',
      referenceNumber: refCode,
      hotelNameEn: effectiveHotelNameEn,
      hotelNameAr: effectiveHotelNameAr,
      outletOrServiceNameEn: outlet.name_en,
      outletOrServiceNameAr: outlet.name_ar,
      roomNumber: roomNumber || undefined,
      customerType: roomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      guestName: guestName.trim() || undefined,
      items: formattedItems,
      estimatedTotal,
      currency,
      notes: deliveryNotes.trim() || undefined,
    });

    // 2. Critical Rule: SAVE TO SYSTEM BEFORE WHATSAPP!
    saveOperationalRequest({
      id: refCode,
      hotel_id: effectiveHotelId,
      hotel_name_en: effectiveHotelNameEn,
      hotel_name_ar: effectiveHotelNameAr,
      department: 'fnb',
      department_name_en: 'Food & Beverage',
      department_name_ar: 'الأغذية والمشروبات',
      outlet_or_service_name_en: outlet.name_en,
      outlet_or_service_name_ar: outlet.name_ar,
      customer_type: roomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      room_number: roomNumber || '',
      guest_name: guestName.trim() || (isAr ? 'نزيل الفندق' : 'Hotel Resident'),
      guest_phone: '',
      items: formattedItems,
      estimated_total: estimatedTotal,
      currency,
      notes: deliveryNotes.trim() || undefined,
      target_whatsapp: outlet.contact.whatsapp_number,
      whatsapp_message_en: englishText,
      whatsapp_message_ar: arabicText,
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    submitProductionRequest({
      id: refCode,
      reference: refCode,
      hotelId: effectiveHotelId,
      hotelNameEn: effectiveHotelNameEn,
      hotelNameAr: effectiveHotelNameAr,
      department: 'FNB',
      requestType: outlet.name_en,
      customerType: roomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      roomNumber: roomNumber || undefined,
      guestName: guestName.trim() || (isAr ? 'نزيل الفندق' : 'Hotel Resident'),
      items: formattedItems.map((it) => ({
        id: it.id,
        nameEn: it.name_en,
        nameAr: it.name_ar,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        totalPrice: it.total_price,
        options: it.options,
        notes: it.notes,
      })),
      total: estimatedTotal,
      currency,
      notes: deliveryNotes.trim() || undefined,
      status: 'NEW',
      channel: 'WHATSAPP',
      targetWhatsApp: outlet.contact.whatsapp_number,
      whatsappMessageEn: englishText,
      whatsappMessageAr: arabicText,
    }).catch((err) => console.error('[OrderBasketDrawer] Production request failed:', err));

    // 3. Open WhatsApp with pre-filled bilingual message
    const waUrl = buildEncodedWhatsAppUrl(outlet.contact.whatsapp_number, fullMessage);
    window.open(waUrl, '_blank');

    setOrderConfirmed(refCode);
    onOrderSuccess(refCode);
    setTimeout(() => {
      onClearBasket();
    }, 1500);
  };

  const handlePlaceOrderDigital = () => {
    const refCode = generateOperationalReference('FNB');
    const effectiveHotelNameEn = hotelNameEn || 'Swiss Flora Royal Hotel Riyadh';
    const effectiveHotelNameAr = hotelNameAr || 'فندق سويس فلورا رويال الرياض';
    const effectiveHotelId = outlet.hotel_id || '11';

    const formattedItems = items.map((it) => ({
      id: it.id,
      name_en: it.name_en,
      name_ar: it.name_ar,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total_price: it.total_price,
      options: it.selected_options.map((o) => `${o.group_title}: ${o.choice_name}`).join(', '),
      notes: it.notes,
    }));

    // Save directly to system as NEW order
    saveOperationalRequest({
      id: refCode,
      hotel_id: effectiveHotelId,
      hotel_name_en: effectiveHotelNameEn,
      hotel_name_ar: effectiveHotelNameAr,
      department: 'fnb',
      department_name_en: 'Food & Beverage',
      department_name_ar: 'الأغذية والمشروبات',
      outlet_or_service_name_en: outlet.name_en,
      outlet_or_service_name_ar: outlet.name_ar,
      customer_type: roomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      room_number: roomNumber || '',
      guest_name: guestName.trim() || (isAr ? 'نزيل الفندق' : 'Hotel Resident'),
      guest_phone: '',
      items: formattedItems,
      estimated_total: estimatedTotal,
      currency,
      notes: deliveryNotes.trim() || undefined,
      target_whatsapp: outlet.contact.whatsapp_number,
      whatsapp_message_en: `NEW ROOM SERVICE ORDER\nReference: ${refCode}\nRoom: ${roomNumber || 'N/A'}`,
      whatsapp_message_ar: `طلب خدمة غرف جديد\nالمرجع: ${refCode}\nالغرفة: ${roomNumber || 'N/A'}`,
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    submitProductionRequest({
      id: refCode,
      reference: refCode,
      hotelId: effectiveHotelId,
      hotelNameEn: effectiveHotelNameEn,
      hotelNameAr: effectiveHotelNameAr,
      department: 'FNB',
      requestType: outlet.name_en,
      customerType: roomNumber ? 'IN_HOUSE' : 'EXTERNAL',
      roomNumber: roomNumber || undefined,
      guestName: guestName.trim() || (isAr ? 'نزيل الفندق' : 'Hotel Resident'),
      items: formattedItems.map((it) => ({
        id: it.id,
        nameEn: it.name_en,
        nameAr: it.name_ar,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        totalPrice: it.total_price,
        options: it.options,
        notes: it.notes,
      })),
      total: estimatedTotal,
      currency,
      notes: deliveryNotes.trim() || undefined,
      status: 'NEW',
      channel: 'DIRECT_PORTAL',
      targetWhatsApp: outlet.contact.whatsapp_number,
      whatsappMessageEn: `NEW ROOM SERVICE ORDER\nReference: ${refCode}\nRoom: ${roomNumber || 'N/A'}`,
      whatsappMessageAr: `طلب خدمة غرف جديد\nالمرجع: ${refCode}\nالغرفة: ${roomNumber || 'N/A'}`,
    }).catch((err) => console.error('[OrderBasketDrawer] Production request failed:', err));

    setOrderConfirmed(refCode);
    onOrderSuccess(refCode);
    setTimeout(() => {
      onClearBasket();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-s border-stone-200"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <h3 className="font-bold text-sm sm:text-base">
                {isAr ? 'سلة الطلبات' : 'Order Basket'}
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {isAr ? outlet.name_ar : outlet.name_en}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={onClearBasket}
                className="text-stone-400 hover:text-rose-400 text-xs px-2 py-1 rounded transition-colors cursor-pointer"
              >
                {isAr ? 'تفريغ السلة' : 'Clear'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close Drawer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Room Context Ribbon */}
        <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {isAr ? 'وجهة التسليم:' : 'Delivery Target:'}
            </span>
            <span className="bg-amber-200/80 font-bold px-2 py-0.5 rounded-md">
              {roomNumber ? `${isAr ? 'غرفة رقم' : 'Room'} ${roomNumber}` : isAr ? 'نزيل بالفندق' : 'In-House Guest'}
            </span>
          </div>
          <span className="text-[11px] text-amber-800">
            {isAr ? 'حفظ تلقائي للغرفة' : 'Auto-preserved Context'}
          </span>
        </div>

        {/* Order Confirmed State */}
        {orderConfirmed ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <Check size={32} strokeWidth={2.5} />
            </div>
            <h4 className="text-xl font-bold font-serif text-stone-900">
              {isAr ? 'تم إرسال طلبك للمطبخ بنجاح!' : 'Order Transmitted to Kitchen!'}
            </h4>
            <div className="bg-stone-100 px-4 py-2 rounded-xl text-xs font-mono font-bold text-stone-700">
              {isAr ? 'رقم مرجع الطلب: ' : 'Order Reference: '}
              {orderConfirmed}
            </div>
            <p className="text-xs text-stone-600 max-w-xs">
              {isAr
                ? 'فريق المطبخ بصدد تحضير أطباقك الآن وتوصيلها بأغطية فضية ساخنة إلى غرفتك.'
                : 'The culinary team is preparing your gourmet meal. Silver-dome delivery to your room is underway.'}
            </p>
            <button
              onClick={onClose}
              className="mt-4 bg-stone-900 text-white font-semibold text-xs px-6 py-2.5 rounded-xl hover:bg-stone-800 cursor-pointer"
            >
              {isAr ? 'العودة للقائمة' : 'Return to Menu'}
            </button>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-3 text-stone-500">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <Sparkles size={24} />
            </div>
            <h4 className="font-semibold text-sm text-stone-700">
              {isAr ? 'سلة الطلبات فارغة' : 'Your Basket is Empty'}
            </h4>
            <p className="text-xs max-w-xs">
              {isAr
                ? 'تصفح قائمة الطعام واختر أطباقك المفضلة لإضافتها وتخصيص خياراتها.'
                : 'Browse the menu categories and select items to add to your room order.'}
            </p>
          </div>
        ) : (
          /* Items List */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-stone-900 text-xs">
                      {isAr ? item.name_ar : item.name_en}
                    </h5>
                    <span className="text-[11px] text-amber-900 font-semibold">
                      {item.unit_price} {currency} {isAr ? 'للقطعة' : 'each'}
                    </span>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Selected Options */}
                {item.selected_options.length > 0 && (
                  <div className="bg-white/80 rounded-lg p-2 space-y-0.5 text-[11px] text-stone-600 border border-stone-100">
                    {item.selected_options.map((opt, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>
                          {opt.group_title}: <strong className="text-stone-800">{opt.choice_name}</strong>
                        </span>
                        {opt.price_delta > 0 && (
                          <span className="text-amber-800 font-semibold">
                            +{opt.price_delta} {currency}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <p className="text-[11px] text-amber-800 italic bg-amber-50/60 px-2 py-1 rounded">
                    "{item.notes}"
                  </p>
                )}

                {/* Quantity and Line Total */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                  <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <span className="font-bold text-stone-900 text-xs">
                    {item.total_price} {currency}
                  </span>
                </div>
              </div>
            ))}

            {/* Guest Name Input */}
            <div className="space-y-1 pt-2">
              <label className="text-[11px] font-semibold text-stone-700">
                {isAr ? 'اسم النزيل' : 'Guest Name'}
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={isAr ? 'اسم المستلم' : 'E.g., Mr. Faisal'}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-stone-50/50"
              />
            </div>

            {/* Delivery Instructions */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">
                {isAr ? 'تعليمات التوصيل أو توقيت التقديم' : 'Delivery Timing or Instructions'}
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder={isAr ? 'مثال: يرجى التوصيل خلال 45 دقيقة مع طاولة إضافية' : 'E.g., Deliver in 30 mins with extra linen'}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-stone-50/50"
              />
            </div>
          </div>
        )}

        {/* Drawer Footer Calculations */}
        {!orderConfirmed && items.length > 0 && (
          <div className="p-4 bg-stone-50 border-t border-stone-200/80 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>{isAr ? 'المجموع قبل الضريبة' : 'Net Amount (Excl. VAT)'}</span>
                <span>{netAmount} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15% Included)'}</span>
                <span>{vatAmount} {currency}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                <span>{isAr ? 'الإجمالي التقديري' : 'Estimated Total'}</span>
                <span className="text-amber-900">{estimatedTotal} {currency}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {outlet.contact.whatsapp_enabled && (
                <button
                  onClick={handlePlaceOrderWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10 transition-all cursor-pointer"
                >
                  <MessageSquare size={15} />
                  <span>
                    {isAr
                      ? `إرسال الطلب لواتساب ${outlet.name_ar}`
                      : `Transmit Order via WhatsApp`}
                  </span>
                </button>
              )}

              <button
                onClick={handlePlaceOrderDigital}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Check size={15} />
                <span>{isAr ? 'تأكيد الطلب المباشر للمطبخ' : 'Direct Digital Room Order'}</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-stone-400">
              {isAr
                ? 'لا يتم الدفع عبر الإنترنت. يتم ترحيل المبلغ إلى حساب الغرفة عند التوصيل.'
                : 'No online pre-payment required. Charges are posted directly to your room folio upon delivery.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
