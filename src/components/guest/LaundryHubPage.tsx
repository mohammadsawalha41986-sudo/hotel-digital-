import React, { useState, useMemo, useRef } from 'react';
import {
  Shirt,
  WashingMachine,
  Scissors,
  Briefcase,
  Crown,
  Sparkles,
  Heart,
  Gem,
  Package,
  Clock,
  Zap,
  Plus,
  Minus,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  X,
  Check,
  Sparkle,
} from 'lucide-react';
import {
  LaundryCatalogItem,
  LaundryServiceType,
  DepartmentContact,
  OperatingInfo,
} from '../../types/department';
import { Language } from '../../types/hotel';
import {
  LaundryGarmentCategory,
  LaundryGarmentCategoryId,
  LaundryGarmentItem,
  LaundryOffer,
  LaundrySelectedGarment,
} from '../../types/laundry';
import {
  DEFAULT_LAUNDRY_CATEGORIES,
  DEFAULT_LAUNDRY_GARMENTS,
  DEFAULT_LAUNDRY_OFFERS,
  DEFAULT_CARE_TAGS,
  DEFAULT_PICKUP_SLOTS,
} from '../../data/laundryHubData';
import { generateOperationalReference, saveOperationalRequest } from '../../utils/requestStore';
import {
  buildBilingualWhatsAppMessage,
  buildEncodedWhatsAppUrl,
} from '../../utils/whatsappMessageBuilder';
import { submitProductionRequest } from '../../services/requestService';

interface LaundryHubPageProps {
  hotelId?: string;
  hotelNameEn?: string;
  hotelNameAr?: string;
  items?: LaundryCatalogItem[];
  contact?: DepartmentContact;
  operatingInfo?: OperatingInfo;
  currency?: string;
  language: Language;
  roomNumber?: string;
  onBackToHome?: () => void;
}

export const LaundryHubPage: React.FC<LaundryHubPageProps> = ({
  hotelId,
  hotelNameEn,
  hotelNameAr,
  items: propItems,
  contact,
  operatingInfo: _operatingInfo,
  currency = 'SAR',
  language,
  roomNumber = '',
  onBackToHome,
}) => {
  const isAr = language === 'ar';
  const offersScrollRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // 1. DATA MERGING & CATEGORY NORMALIZATION
  // -------------------------------------------------------------------------
  const allGarments: LaundryGarmentItem[] = useMemo(() => {
    // A provided collection is authoritative, including an explicitly empty
    // collection. Static fixtures are only used when the prop is omitted.
    if (propItems !== undefined) {
      const mergedMap = new Map<string, LaundryGarmentItem>();

      // Overwrite or add prop items
      propItems.forEach((pi) => {
        let catId: LaundryGarmentCategoryId = 'other_items';
        const cLower = (pi.category_en || '').toLowerCase();
        if (cLower.includes('top') || cLower.includes('shirt')) catId = 'shirts_tops';
        else if (cLower.includes('bottom') || cLower.includes('trouser')) catId = 'trousers_bottoms';
        else if (cLower.includes('suit') || cLower.includes('formal')) catId = 'suits_formalwear';
        else if (cLower.includes('thobe') || cLower.includes('traditional')) catId = 'thobes_traditional';
        else if (cLower.includes('abaya')) catId = 'abayas';
        else if (cLower.includes('under') || cLower.includes('sleep') || cLower.includes('sock')) catId = 'underwear_sleepwear';
        else if (cLower.includes('dress') || cLower.includes('gown')) catId = 'dresses_special';

        mergedMap.set(pi.id, {
          ...pi,
          category_id: catId,
          category_en: pi.category_en || 'Other Items',
          category_ar: pi.category_ar || 'أصناف أخرى',
        } as LaundryGarmentItem);
      });

      return Array.from(mergedMap.values()).filter((g) => g.is_active);
    }
    return DEFAULT_LAUNDRY_GARMENTS.filter((g) => g.is_active);
  }, [propItems]);

  const categories: LaundryGarmentCategory[] = useMemo(() => {
    return DEFAULT_LAUNDRY_CATEGORIES.filter((cat) => cat.active).map((cat) => {
      const count = allGarments.filter((g) => g.category_id === cat.id).length;
      return {
        ...cat,
        itemCountLabelEn: `${count} Items`,
        itemCountLabelAr: `${count} قطع`,
      };
    });
  }, [allGarments]);

  // -------------------------------------------------------------------------
  // 2. STATE ENGINE
  // -------------------------------------------------------------------------
  // Selected Service Type (default: 'wash_press')
  const [selectedService, setSelectedService] = useState<LaundryServiceType>('wash_press');

  // Selected Garment Category (null = Category Directory view, string = Item View)
  const [selectedCategoryId, setSelectedCategoryId] = useState<LaundryGarmentCategoryId | null>(null);

  // Express Service upgrade toggle (+50%)
  const [isExpress, setIsExpress] = useState<boolean>(false);

  // Order selections: key = `${item.id}-${serviceType}`
  const [selections, setSelections] = useState<Record<string, LaundrySelectedGarment>>({});

  // Item comparison toggle per item id
  const [comparingItemId, setComparingItemId] = useState<string | null>(null);

  // Logistics & Preferences
  const todayStr = new Date().toISOString().split('T')[0];
  const [pickupDate, setPickupDate] = useState<string>(todayStr);
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>('01:00 PM – 03:00 PM');
  const [guestName, setGuestName] = useState<string>('');
  const [customRoomNumber, setCustomRoomNumber] = useState<string>(roomNumber);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [selectedCareTags, setSelectedCareTags] = useState<string[]>(['hanger']);

  // Modal / Bottom Sheet State
  const [isMobileBagOpen, setIsMobileBagOpen] = useState<boolean>(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [orderConfirmedRef, setOrderConfirmedRef] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize roomNumber prop if present
  React.useEffect(() => {
    if (roomNumber) {
      setCustomRoomNumber(roomNumber);
    }
  }, [roomNumber]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------------------
  // 3. SERVICE TYPES DEFINITION
  // -------------------------------------------------------------------------
  const serviceDefinitions = [
    {
      type: 'wash_press' as LaundryServiceType,
      titleEn: 'Wash & Press',
      titleAr: 'غسيل وكي',
      descEn: 'Full hygienic wash & razor-sharp steam pressing',
      descAr: 'غسيل تعقيمي كامل مع كي احترافي بالبخار',
      icon: WashingMachine,
      accent: 'emerald',
      turnaroundEn: '12–24 Hours',
      turnaroundAr: '12–24 ساعة',
    },
    {
      type: 'press' as LaundryServiceType,
      titleEn: 'Pressing Only',
      titleAr: 'كي فقط',
      descEn: 'Crease setting, collar styling & hanger preparation',
      descAr: 'كي أقمشة وإعادة تثبيت الكسرات والياقات',
      icon: Shirt,
      accent: 'amber',
      turnaroundEn: '6–12 Hours',
      turnaroundAr: '6–12 ساعة',
    },
    {
      type: 'dry_clean' as LaundryServiceType,
      titleEn: 'Dry Clean',
      titleAr: 'تنظيف جاف',
      descEn: 'Gentle hydrocarbon care for silks, wool & suits',
      descAr: 'عناية خاصة للأقمشة الحساسة والبدل والحرير',
      icon: Sparkles,
      accent: 'indigo',
      turnaroundEn: '24 Hours',
      turnaroundAr: '24 ساعة',
    },
    {
      type: 'wash' as LaundryServiceType,
      titleEn: 'Wash Only',
      titleAr: 'غسيل فقط',
      descEn: 'Gentle detergent cycle, spin dry & neat flat fold',
      descAr: 'غسيل ناعم وتجفيف وطيّ أنيق للملابس اليومية',
      icon: WashingMachine,
      accent: 'cyan',
      turnaroundEn: '12 Hours',
      turnaroundAr: '12 ساعة',
    },
  ];

  // -------------------------------------------------------------------------
  // 4. QUANTITY & CART MANIPULATION
  // -------------------------------------------------------------------------
  const handleUpdateQuantity = (
    item: LaundryGarmentItem,
    svcType: LaundryServiceType,
    delta: number
  ) => {
    const key = `${item.id}-${svcType}`;
    const current = selections[key]?.quantity || 0;
    const nextQty = Math.max(0, current + delta);

    setSelections((prev) => {
      const updated = { ...prev };
      if (nextQty === 0) {
        delete updated[key];
      } else {
        const unitBase = item.prices[svcType] || item.prices.press || 15;
        updated[key] = {
          item,
          serviceType: svcType,
          quantity: nextQty,
          unitPrice: unitBase,
        };
      }
      return updated;
    });
  };

  // Add Package from Featured Offers
  const handleAddOfferPackage = (offer: LaundryOffer) => {
    if (offer.packageItems && offer.packageItems.length > 0) {
      setSelections((prev) => {
        const updated = { ...prev };
        offer.packageItems?.forEach((pkg) => {
          const matchedItem = allGarments.find((g) => g.id === pkg.itemId);
          if (matchedItem) {
            const key = `${matchedItem.id}-${pkg.serviceType}`;
            const curQty = updated[key]?.quantity || 0;
            const unitBase = matchedItem.prices[pkg.serviceType] || 15;
            updated[key] = {
              item: matchedItem,
              serviceType: pkg.serviceType,
              quantity: curQty + pkg.quantity,
              unitPrice: unitBase,
            };
          }
        });
        return updated;
      });
      showToast(
        isAr
          ? `تمت إضافة ${offer.titleAr} إلى حقيبة الغسيل`
          : `Added "${offer.titleEn}" to your Laundry Bag`
      );
    } else if (offer.id === 'off-express-laundry') {
      setIsExpress(true);
      showToast(
        isAr
          ? 'تم تفعيل الخدمة السريعة الفائقة (استلام خلال 4 ساعات)'
          : 'Express Valet 4-Hour Service Activated (+50%)'
      );
    } else if (offer.targetServiceType) {
      setSelectedService(offer.targetServiceType);
      if (offer.targetCategoryId) {
        setSelectedCategoryId(offer.targetCategoryId);
      }
      showToast(
        isAr
          ? `تم اختيار الخدمة: ${offer.titleAr}`
          : `Selected Service: ${offer.titleEn}`
      );
    }
  };

  // Care Tag toggle
  const toggleCareTag = (tagId: string) => {
    setSelectedCareTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // -------------------------------------------------------------------------
  // 5. FINANCIAL CALCULATIONS
  // -------------------------------------------------------------------------
  const selectionList = Object.values(selections);
  const totalItemCount = selectionList.reduce((acc, s) => acc + s.quantity, 0);

  const subtotal = useMemo(() => {
    return selectionList.reduce((acc, s) => acc + s.unitPrice * s.quantity, 0);
  }, [selectionList]);

  // Express surcharge is exactly 50% of the subtotal
  const expressSurcharge = isExpress ? Math.round(subtotal * 0.5) : 0;
  const grandTotal = subtotal + expressSurcharge;

  // Selected Category Object
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  const currentCategoryGarments = useMemo(() => {
    if (!selectedCategoryId) return [];
    return allGarments.filter((g) => g.category_id === selectedCategoryId);
  }, [allGarments, selectedCategoryId]);

  // Items count per category in current bag
  const getCategoryCountInBag = (catId: LaundryGarmentCategoryId) => {
    return selectionList
      .filter((s) => s.item.category_id === catId)
      .reduce((acc, s) => acc + s.quantity, 0);
  };

  // -------------------------------------------------------------------------
  // 6. WHATSAPP & OPERATIONAL SUBMISSION
  // -------------------------------------------------------------------------
  const valetWhatsApp = contact?.whatsapp_number || '';

  const handlePlaceLaundryRequest = () => {
    if (totalItemCount === 0) return;

    const refCode = generateOperationalReference('LDY');

    const serviceNameMap: Record<LaundryServiceType, { en: string; ar: string }> = {
      wash_press: { en: 'Wash & Press', ar: 'غسيل وكي' },
      press: { en: 'Pressing', ar: 'كي فقط' },
      wash: { en: 'Wash Only', ar: 'غسيل فقط' },
      dry_clean: { en: 'Dry Clean', ar: 'تنظيف جاف' },
    };

    const formattedItems = selectionList.map((sel) => {
      const svc = serviceNameMap[sel.serviceType];
      return {
        id: `${sel.item.id}-${sel.serviceType}`,
        name_en: `${sel.item.name_en} (${svc.en})`,
        name_ar: `${sel.item.name_ar} (${svc.ar})`,
        quantity: sel.quantity,
        unit_price: sel.unitPrice,
        total_price: sel.unitPrice * sel.quantity,
        options: isExpress ? 'Express 4-Hour Valet (+50%)' : 'Standard Turnaround',
      };
    });

    const guestDisplayName = guestName.trim() || (isAr ? 'نزيل الفندق' : 'Hotel Resident');
    const effectiveRoom = customRoomNumber.trim() || (isAr ? 'غرفة غير محددة' : 'Room Not Specified');

    // Build Care tags text
    const selectedCareTagLabelsEn = selectedCareTags
      .map((id) => DEFAULT_CARE_TAGS.find((t) => t.id === id)?.labelEn)
      .filter(Boolean)
      .join(', ');
    const selectedCareTagLabelsAr = selectedCareTags
      .map((id) => DEFAULT_CARE_TAGS.find((t) => t.id === id)?.labelAr)
      .filter(Boolean)
      .join('، ');

    const combinedNotes = [
      selectedCareTagLabelsEn ? `Care Preferences: ${selectedCareTagLabelsEn}` : '',
      selectedCareTagLabelsAr ? `تعليمات العناية: ${selectedCareTagLabelsAr}` : '',
      specialInstructions.trim() ? `Special Notes: ${specialInstructions.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const effectiveHotelId = hotelId || '11';
    const effectiveHotelNameEn = hotelNameEn || 'Swiss Flora Royal Hotel Riyadh';
    const effectiveHotelNameAr = hotelNameAr || 'فندق سويس فلورا رويال الرياض';

    // 1. Build standardized bilingual WhatsApp message (English first, divider, Arabic second)
    const { englishText, arabicText, fullMessage } = buildBilingualWhatsAppMessage({
      requestTypeEn: `Valet Laundry & Garment Care (${isExpress ? 'Express 4-Hour' : 'Standard'})`,
      requestTypeAr: `طلب استلام ملابس للغسيل والمصبغة (${isExpress ? 'خدمة سريعة 4 ساعات' : 'خدمة قياسية'})`,
      referenceNumber: refCode,
      hotelNameEn: effectiveHotelNameEn,
      hotelNameAr: effectiveHotelNameAr,
      outletOrServiceNameEn: 'Valet Laundry Service',
      outletOrServiceNameAr: 'خدمة المغسلة والمصبغة الملكية',
      roomNumber: effectiveRoom,
      customerType: effectiveRoom !== 'Room Not Specified' ? 'IN_HOUSE' : 'EXTERNAL',
      guestName: guestDisplayName,
      date: pickupDate,
      time: pickupTimeSlot,
      items: formattedItems,
      estimatedTotal: grandTotal,
      currency,
      notes: combinedNotes || undefined,
    });

    // 2. Persist to system operational request store
    saveOperationalRequest({
      id: refCode,
      hotel_id: effectiveHotelId,
      hotel_name_en: effectiveHotelNameEn,
      hotel_name_ar: effectiveHotelNameAr,
      department: 'laundry',
      department_name_en: 'Valet Laundry',
      department_name_ar: 'المغسلة والمصبغة',
      outlet_or_service_name_en: isExpress ? 'Express Valet Laundry (4-Hr)' : 'Standard Valet Laundry',
      outlet_or_service_name_ar: isExpress ? 'خدمة المغسلة السريعة (4 ساعات)' : 'خدمة المغسلة القياسية',
      customer_type: effectiveRoom !== 'Room Not Specified' ? 'IN_HOUSE' : 'EXTERNAL',
      room_number: effectiveRoom,
      guest_name: guestDisplayName,
      guest_phone: '',
      items: formattedItems,
      estimated_total: grandTotal,
      currency,
      notes: combinedNotes || undefined,
      target_whatsapp: valetWhatsApp,
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
      department: 'LDY',
      requestType: isExpress ? 'Express Valet Laundry (4-Hr)' : 'Standard Valet Laundry',
      customerType: effectiveRoom !== 'Room Not Specified' ? 'IN_HOUSE' : 'EXTERNAL',
      roomNumber: effectiveRoom !== 'Room Not Specified' ? effectiveRoom : undefined,
      guestName: guestDisplayName,
      items: formattedItems.map((it) => ({
        id: it.id,
        nameEn: it.name_en,
        nameAr: it.name_ar,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        totalPrice: it.total_price,
        options: it.options,
      })),
      total: grandTotal,
      currency,
      notes: combinedNotes || undefined,
      status: 'NEW',
      channel: 'WHATSAPP',
      targetWhatsApp: valetWhatsApp,
      whatsappMessageEn: englishText,
      whatsappMessageAr: arabicText,
    }).catch((err) => console.error('[LaundryHubPage] Production request failed:', err));

    // 3. Open WhatsApp pre-filled
    const waUrl = buildEncodedWhatsAppUrl(valetWhatsApp, fullMessage);
    window.open(waUrl, '_blank');

    setOrderConfirmedRef(refCode);
    setIsSummaryModalOpen(false);
    setIsMobileBagOpen(false);
  };

  // Reset entire request
  const handleResetRequest = () => {
    setSelections({});
    setOrderConfirmedRef(null);
    setSelectedCategoryId(null);
    setIsExpress(false);
  };

  // Icon Helper for Categories
  const getCategoryLucideIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shirt':
        return Shirt;
      case 'Scissors':
        return Scissors;
      case 'Briefcase':
        return Briefcase;
      case 'Crown':
        return Crown;
      case 'Sparkles':
        return Sparkles;
      case 'Heart':
        return Heart;
      case 'Gem':
        return Gem;
      case 'Package':
      default:
        return Package;
    }
  };

  // Helper for scroll buttons
  const scrollOffers = (direction: 'left' | 'right') => {
    if (!offersScrollRef.current) return;
    const offset = direction === 'left' ? -340 : 340;
    offersScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // =========================================================================
  // RENDER: ORDER CONFIRMATION SCREEN
  // =========================================================================
  if (orderConfirmedRef) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div
          id="laundry-order-confirmation-card"
          className="max-w-lg w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center shadow-2xl space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-stone-800 text-stone-300 text-xs font-mono font-bold rounded-full border border-stone-700">
              {orderConfirmedRef}
            </span>
            <h1 className="text-2xl font-serif font-bold text-white">
              {isAr ? 'تم استلام طلب الغسيل بنجاح' : 'Laundry Request Dispatched'}
            </h1>
            <p className="text-sm text-stone-400 leading-relaxed">
              {isAr
                ? 'تم إرسال تفاصيل طلبك مباشرة لمكتب خدمة المغسلة والمصبغة. سيقوم موظف الخدمة بالقدوم لغرفتكم لاستلام الملابس في الموعد المحدد.'
                : 'Your pickup request has been routed to our Valet Master. A dedicated team member will attend your room to collect your garments at the scheduled time.'}
            </p>
          </div>

          <div className="bg-stone-950 border border-stone-800/80 rounded-2xl p-4 text-start space-y-2 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>{isAr ? 'الغرفة:' : 'Room Number:'}</span>
              <span className="text-white font-bold">{customRoomNumber || (isAr ? 'غير محدد' : 'General')}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>{isAr ? 'موعد الاستلام:' : 'Pickup Slot:'}</span>
              <span className="text-white font-bold">{pickupDate} · {pickupTimeSlot}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>{isAr ? 'الخدمة السريعة (4 ساعات):' : 'Express Valet:'}</span>
              <span className={isExpress ? 'text-amber-400 font-bold' : 'text-stone-300'}>
                {isExpress ? (isAr ? 'مفعلة (+50%)' : 'Active (+50%)') : (isAr ? 'خدمة عادية' : 'Standard')}
              </span>
            </div>
            <div className="flex justify-between text-stone-400 pt-2 border-t border-stone-800/80">
              <span className="text-stone-300 font-medium">{isAr ? 'الإجمالي التقديري:' : 'Estimated Total:'}</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">
                {grandTotal} {currency}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300/90 text-xs">
            {isAr
              ? 'ملاحظة: لا يُشترط الدفع المسبق؛ تُضاف الرسوم المقدرة لحساب الغرفة عند إعادة تسليم الملابس.'
              : 'Notice: Charges will be automatically posted to your room folio upon garment return.'}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              id="laundry-confirmation-new-request-btn"
              onClick={handleResetRequest}
              className="flex-1 py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold transition-colors"
            >
              {isAr ? 'طلب جديد للمغسلة' : 'New Laundry Request'}
            </button>
            {onBackToHome && (
              <button
                id="laundry-confirmation-home-btn"
                onClick={onBackToHome}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/30 transition-colors"
              >
                {isAr ? 'العودة للرئيسية' : 'Back to Home'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN LAUNDRY HUB VIEW
  // =========================================================================
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-28 md:pb-16 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-stone-800/95 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          1. LAUNDRY HERO BANNER
      ====================================================================== */}
      <section id="laundry-hero-banner" className="relative bg-stone-900 border-b border-stone-800/80 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 opacity-25">
          <img
            src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=2000&q=80"
            alt="Luxury Valet Laundry"
            className="w-full h-full object-cover object-center scale-105 filter blur-xs"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/85 to-stone-900/60" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Top Navigation Row */}
          <div className="flex items-center justify-between gap-4 mb-6">
            {selectedCategoryId !== null ? (
              <button
                id="laundry-back-to-categories-hero-btn"
                onClick={() => setSelectedCategoryId(null)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/90 border border-stone-700/80 text-stone-200 text-xs sm:text-sm font-medium hover:bg-stone-800 hover:text-white transition-all shadow-md group"
              >
                {isAr ? (
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                ) : (
                  <ArrowLeft className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                )}
                <span>{isAr ? 'الرجوع إلى أقسام الملابس' : 'Back to Garment Categories'}</span>
              </button>
            ) : onBackToHome ? (
              <button
                id="laundry-back-to-home-hero-btn"
                onClick={onBackToHome}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/90 border border-stone-700/80 text-stone-200 text-xs sm:text-sm font-medium hover:bg-stone-800 hover:text-white transition-all shadow-md group"
              >
                {isAr ? (
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                ) : (
                  <ArrowLeft className="w-4 h-4 text-stone-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                )}
                <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
              </button>
            ) : (
              <div />
            )}

            {/* Valet Concierge Direct Contact */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${contact?.phone || '+966112349999'}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700 text-xs text-stone-300 hover:text-white transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{isAr ? 'مغسلة الفندق: تحويلة 4' : 'Valet Desk: Ext. 4'}</span>
              </a>

              <a
                href={buildEncodedWhatsAppUrl(
                  valetWhatsApp,
                  isAr
                    ? `مرحباً، أود الاستفسار عن خدمة المغسلة للغرفة ${customRoomNumber || ''}`
                    : `Hello, inquiring regarding Valet Laundry Service for Room ${customRoomNumber || ''}`
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 hover:bg-emerald-500/25 transition-colors font-medium"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isAr ? 'واتساب المغسلة' : 'Valet WhatsApp'}</span>
              </a>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold tracking-wide uppercase">
                {isAr ? 'خدمة الغسيل والمصبغة الملكية' : 'Royal Valet Laundry & Dry Clean'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-stone-800/80 border border-stone-700/80 text-stone-300 text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isAr ? 'حماية الأزرار والأقمشة الحساسة' : 'Button Protection & Eco-Wash'}
              </span>
              {customRoomNumber && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-semibold">
                  {isAr ? `غرفة ${customRoomNumber}` : `Room ${customRoomNumber}`}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight">
              {isAr ? 'خدمات الغسيل والكي الفاخر' : 'Valet Laundry & Garment Care'}
            </h1>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              {isAr
                ? 'اختر القطع والخدمة المطلوبة من قائمة المغسلة المنشورة من إدارة الفندق.'
                : 'Choose garments and services from the laundry catalog published by the hotel.'}
            </p>

            {/* Quick Status Badges */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-stone-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? `${allGarments.length.toLocaleString('ar-SA')} قطعة منشورة` : `${allGarments.length} published items`}</span>
              </div>
              {contact?.hours_en && <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{isAr ? contact.hours_ar : contact.hours_en}</span>
              </div>}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. FEATURED LAUNDRY OFFERS FIRST (SLIDER / BANNER)
      ====================================================================== */}
      {propItems === undefined && <section id="laundry-featured-offers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkle className="w-4 h-4 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-mono">
                {isAr ? 'عروض وباقات الغسيل المميزة' : 'Featured Laundry Offers'}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {isAr
                ? 'باقات مخصصة لرجال الأعمال، الثياب التراثية، والخدمة السريعة بأسعار تفضيلية'
                : 'Curated garment care packages for executives, traditional thobes, and express turnaround'}
            </p>
          </div>

          {/* Slider Controls */}
          <div className="flex items-center gap-1.5">
            <button
              id="laundry-offers-prev-btn"
              onClick={() => scrollOffers('left')}
              className="p-1.5 rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
              aria-label="Previous Offer"
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <button
              id="laundry-offers-next-btn"
              onClick={() => scrollOffers('right')}
              className="p-1.5 rounded-full bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
              aria-label="Next Offer"
            >
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Scrollable Offers Track */}
        <div
          ref={offersScrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {(propItems === undefined ? DEFAULT_LAUNDRY_OFFERS.filter((off) => off.active) : []).map((offer) => (
            <div
              key={offer.id}
              id={`laundry-offer-card-${offer.id}`}
              className="snap-start shrink-0 w-[290px] sm:w-[320px] bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-stone-700 transition-all shadow-lg group"
            >
              {/* Offer Image & Badge */}
              <div className="relative h-36 w-full overflow-hidden bg-stone-950">
                <img
                  src={offer.image}
                  alt={isAr ? offer.titleAr : offer.titleEn}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                <span className="absolute top-2.5 start-2.5 px-2.5 py-0.5 bg-stone-900/90 backdrop-blur-sm border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {isAr ? offer.badgeAr : offer.badgeEn}
                </span>
                {offer.discountPercent && (
                  <span className="absolute top-2.5 end-2.5 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                    {offer.discountPercent}% {isAr ? 'خصم' : 'OFF'}
                  </span>
                )}
              </div>

              {/* Offer Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors line-clamp-1">
                    {isAr ? offer.titleAr : offer.titleEn}
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
                    {isAr ? offer.descriptionAr : offer.descriptionEn}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                  <div>
                    {offer.price ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-emerald-400 font-bold font-mono text-sm">
                          {offer.price} {currency}
                        </span>
                        {offer.oldPrice && (
                          <span className="text-stone-500 line-through text-[11px] font-mono">
                            {offer.oldPrice} {currency}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-400 text-[11px]">
                        {isAr ? offer.validityAr : offer.validityEn}
                      </span>
                    )}
                  </div>

                  <button
                    id={`laundry-offer-cta-${offer.id}`}
                    onClick={() => handleAddOfferPackage(offer)}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-emerald-600 text-stone-200 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span>{isAr ? offer.ctaLabelAr : offer.ctaLabelEn}</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>}

      {/* =====================================================================
          MAIN LAYOUT: 70% INTERACTIVE FLOW + 30% STICKY LAUNDRY BAG
      ====================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* =================================================================
              LEFT COLUMN (70%): SERVICE TYPES + CATEGORIES / ITEMS
          ================================================================== */}
          <div className="lg:col-span-8 space-y-8">
            {/* ===============================================================
                3. CHOOSE SERVICE TYPE
            ================================================================ */}
            <section id="laundry-choose-service-type" className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-mono font-bold">
                      1
                    </span>
                    {isAr ? 'اختر نوع الخدمة المطلوب' : 'Choose a Service'}
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {isAr
                      ? 'يتم تحديث أسعار قطع الملابس تلقائياً بناءً على نوع الخدمة التي تختارها'
                      : 'Garment item prices adapt automatically to the selected service type'}
                  </p>
                </div>

                {/* Optional Express Surcharge Pill */}
                <button
                  id="laundry-express-toggle-pill"
                  onClick={() => setIsExpress(!isExpress)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isExpress
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40'
                      : 'bg-stone-850 border-stone-700 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${isExpress ? 'text-amber-400 fill-amber-400' : 'text-stone-500'}`} />
                  <span>
                    {isAr ? 'خدمة سريعة (+50%)' : 'Express Service (+50%)'}
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {isAr ? '4 ساعات' : '4-Hour Return'}
                  </span>
                </button>
              </div>

              {/* Service Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {serviceDefinitions.map((svc) => {
                  const SvcIcon = svc.icon;
                  const isSelected = selectedService === svc.type;
                  return (
                    <button
                      key={svc.type}
                      id={`laundry-service-card-${svc.type}`}
                      onClick={() => setSelectedService(svc.type)}
                      className={`p-3.5 rounded-xl border text-start transition-all flex flex-col justify-between space-y-2 relative group ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/30'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-850'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-emerald-400" />
                      )}

                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-stone-800 text-stone-400 group-hover:text-stone-200'
                        }`}
                      >
                        <SvcIcon className="w-5 h-5" />
                      </div>

                      <div>
                        <span className="font-bold text-xs sm:text-sm block">
                          {isAr ? svc.titleAr : svc.titleEn}
                        </span>
                        <span className="text-[10px] text-stone-400 line-clamp-1 mt-0.5">
                          {isAr ? svc.descAr : svc.descEn}
                        </span>
                      </div>

                      <div className="pt-1.5 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-400">
                        <span>{isAr ? svc.turnaroundAr : svc.turnaroundEn}</span>
                        {isSelected && (
                          <span className="text-emerald-400 font-bold font-mono">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ===============================================================
                4. GARMENT CATEGORIES VIEW OR CATEGORY ITEM VIEW
            ================================================================ */}
            {selectedCategoryId === null ? (
              // -------------------------------------------------------------
              // 4.A CATEGORY DIRECTORY (8 CATEGORIES)
              // -------------------------------------------------------------
              <section id="laundry-garment-categories-directory" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-mono font-bold">
                        2
                      </span>
                      {isAr ? 'اختر قسم الملابس' : 'Choose Garment Category'}
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {isAr
                        ? 'اختر القسم لعرض القطع والأسعار الخاصة بالخدمة المحددة'
                        : 'Select a category to view individual garments and specific service prices'}
                    </p>
                  </div>
                </div>

                {/* 8 Categories Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5">
                  {categories.map((cat) => {
                    const CatIcon = getCategoryLucideIcon(cat.icon);
                    const inBagCount = getCategoryCountInBag(cat.id);

                    return (
                      <button
                        key={cat.id}
                        id={`laundry-category-card-${cat.id}`}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 hover:border-emerald-500/60 hover:bg-stone-850/80 transition-all text-start flex items-center justify-between gap-4 group shadow-md"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-stone-800/90 border border-stone-700/80 flex items-center justify-center text-stone-300 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
                            <CatIcon className="w-6 h-6" />
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                                {isAr ? cat.nameAr : cat.nameEn}
                              </h3>
                              {inBagCount > 0 && (
                                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-full">
                                  {inBagCount} {isAr ? 'في الحقيبة' : 'in bag'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-400 line-clamp-1">
                              {isAr ? cat.descriptionAr : cat.descriptionEn}
                            </p>
                            <span className="text-[11px] text-stone-500 block font-mono">
                              {isAr ? cat.itemCountLabelAr : cat.itemCountLabelEn}
                            </span>
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-white group-hover:bg-emerald-600 transition-colors shrink-0">
                          {isAr ? (
                            <ChevronLeft className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : (
              // -------------------------------------------------------------
              // 4.B CATEGORY ITEM VIEW WITH ALTERNATIVE SERVICE SWITCHER
              // -------------------------------------------------------------
              <section id="laundry-category-items-view" className="space-y-6">
                {/* Back Button & Category Header */}
                <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        id="laundry-back-to-categories-btn"
                        onClick={() => setSelectedCategoryId(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold transition-colors border border-stone-700"
                      >
                        {isAr ? (
                          <ArrowRight className="w-4 h-4" />
                        ) : (
                          <ArrowLeft className="w-4 h-4" />
                        )}
                        <span>{isAr ? 'الرجوع للأقسام' : 'Garment Categories'}</span>
                      </button>

                      <div>
                        <h2 className="text-lg font-bold text-white">
                          {isAr ? currentCategory?.nameAr : currentCategory?.nameEn}
                        </h2>
                        <p className="text-xs text-stone-400">
                          {isAr ? currentCategory?.descriptionAr : currentCategory?.descriptionEn}
                        </p>
                      </div>
                    </div>

                    {/* Category Switcher Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-stone-400 hidden sm:inline">
                        {isAr ? 'تغيير القسم:' : 'Category:'}
                      </label>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value as LaundryGarmentCategoryId)}
                        className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {isAr ? c.nameAr : c.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 5. ALTERNATIVE SERVICE SWITCHER (COMPACT PILLS) */}
                  <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 font-medium">
                        {isAr ? 'نوع المعالجة:' : 'Active Treatment:'}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {serviceDefinitions.map((svc) => {
                          const active = selectedService === svc.type;
                          return (
                            <button
                              key={svc.type}
                              id={`laundry-pill-switcher-${svc.type}`}
                              onClick={() => setSelectedService(svc.type)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                active
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-750'
                              }`}
                            >
                              {isAr ? svc.titleAr : svc.titleEn}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Express Indicator Pill */}
                    <button
                      onClick={() => setIsExpress(!isExpress)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors ${
                        isExpress
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-300'
                      }`}
                    >
                      <Zap className={`w-3 h-3 ${isExpress ? 'text-amber-400 fill-amber-400' : 'text-stone-500'}`} />
                      <span>{isAr ? 'خدمة سريعة (+50%)' : 'Express (+50%)'}</span>
                    </button>
                  </div>
                </div>

                {/* Garments List in Category */}
                <div className="space-y-3">
                  {currentCategoryGarments.map((item) => {
                    const activePrice = item.prices[selectedService] || item.prices.press || 15;
                    const expressPrice = Math.round(activePrice * 1.5);
                    const effectivePrice = isExpress ? expressPrice : activePrice;

                    const currentKey = `${item.id}-${selectedService}`;
                    const currentQty = selections[currentKey]?.quantity || 0;
                    const isComparing = comparingItemId === item.id;

                    const ItemIcon = getCategoryLucideIcon(item.icon);

                    return (
                      <div
                        key={item.id}
                        id={`laundry-garment-item-${item.id}`}
                        className={`rounded-2xl border transition-all p-4 space-y-3 ${
                          currentQty > 0
                            ? 'bg-stone-900/95 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                            : 'bg-stone-900/70 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Garment Title & Description */}
                          <div className="flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-stone-800/90 border border-stone-700/80 flex items-center justify-center text-stone-300 shrink-0 mt-0.5">
                              <ItemIcon className="w-5 h-5" />
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white text-sm sm:text-base">
                                  {isAr ? item.name_ar : item.name_en}
                                </h3>
                                {currentQty > 0 && (
                                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-full">
                                    {currentQty} {isAr ? 'محدد' : 'selected'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-400">
                                {isAr ? item.description_ar : item.description_en}
                              </p>
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="text-[11px] text-stone-400">
                                  {isAr
                                    ? `الخدمة المحددة: ${serviceDefinitions.find((s) => s.type === selectedService)?.titleAr}`
                                    : `Selected: ${serviceDefinitions.find((s) => s.type === selectedService)?.titleEn}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setComparingItemId(isComparing ? null : item.id)}
                                  className="text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                                >
                                  {isComparing
                                    ? (isAr ? 'إخفاء المقارنة' : 'Hide Comparison')
                                    : (isAr ? 'عرض مقارنة الأسعار' : 'Compare Services')}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Price Display & Quantity Stepper */}
                          <div className="flex items-center justify-between sm:justify-end gap-4 self-end sm:self-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800">
                            <div className="text-end">
                              <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-bold text-white font-mono">
                                  {effectivePrice}
                                </span>
                                <span className="text-xs text-stone-400">{currency}</span>
                              </div>
                              {isExpress && (
                                <span className="text-[10px] text-amber-400 block font-mono">
                                  {isAr ? `(الأساسي: ${activePrice} + 50% سريع)` : `(${activePrice} + 50% Express)`}
                                </span>
                              )}
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-xl p-1">
                              <button
                                id={`laundry-item-minus-${item.id}`}
                                onClick={() => handleUpdateQuantity(item, selectedService, -1)}
                                disabled={currentQty === 0}
                                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-stone-800 text-white flex items-center justify-center transition-colors"
                                aria-label="Decrease Quantity"
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <span className="w-8 text-center text-sm font-bold font-mono text-white">
                                {currentQty}
                              </span>

                              <button
                                id={`laundry-item-plus-${item.id}`}
                                onClick={() => handleUpdateQuantity(item, selectedService, 1)}
                                className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors shadow-sm"
                                aria-label="Increase Quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Optional Compare Services Drawer for this garment */}
                        {isComparing && (
                          <div className="mt-3 pt-3 border-t border-stone-800/80 bg-stone-950/60 rounded-xl p-3 animate-in fade-in">
                            <div className="text-xs font-semibold text-stone-300 mb-2 flex items-center justify-between">
                              <span>{isAr ? 'مقارنة أسعار الخدمات لهذا العنصر:' : 'Price Comparison for this Item:'}</span>
                              <span className="text-[10px] text-stone-500">{isAr ? 'اختر الخدمة للتبديل' : 'Click to switch service'}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              {serviceDefinitions.map((svc) => {
                                const svcPrice = item.prices[svc.type] || 15;
                                const isCurrentSvc = selectedService === svc.type;
                                const key = `${item.id}-${svc.type}`;
                                const qty = selections[key]?.quantity || 0;

                                return (
                                  <button
                                    key={svc.type}
                                    onClick={() => {
                                      setSelectedService(svc.type);
                                    }}
                                    className={`p-2 rounded-lg border text-start flex flex-col justify-between transition-all ${
                                      isCurrentSvc
                                        ? 'bg-emerald-950/60 border-emerald-500 text-white'
                                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                                    }`}
                                  >
                                    <span className="text-[11px] font-semibold block">
                                      {isAr ? svc.titleAr : svc.titleEn}
                                    </span>
                                    <div className="flex items-baseline justify-between mt-1 font-mono">
                                      <span className="font-bold text-emerald-400">
                                        {svcPrice} {currency}
                                      </span>
                                      {qty > 0 && (
                                        <span className="text-[10px] bg-stone-800 px-1 rounded text-stone-300">
                                          x{qty}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* =================================================================
              RIGHT COLUMN (30%): STICKY YOUR LAUNDRY / LAUNDRY BAG (DESKTOP)
          ================================================================== */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-6 space-y-6">
              {/* Laundry Bag Container */}
              <div
                id="laundry-desktop-bag-card"
                className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">
                        {isAr ? 'طلب الغسيل / حقيبة الغسيل' : 'Your Laundry Bag'}
                      </h3>
                      <span className="text-xs text-stone-400">
                        {totalItemCount} {isAr ? 'قطع مختارة' : 'garments selected'}
                      </span>
                    </div>
                  </div>

                  {totalItemCount > 0 && (
                    <button
                      onClick={() => setSelections({})}
                      className="text-xs text-stone-400 hover:text-rose-400 transition-colors"
                    >
                      {isAr ? 'تفريغ' : 'Clear'}
                    </button>
                  )}
                </div>

                {/* Selected Items List */}
                {totalItemCount === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Shirt className="w-10 h-10 text-stone-700 mx-auto" />
                    <p className="text-xs text-stone-400">
                      {isAr
                        ? 'حقيبة الغسيل فارغة. اختر الخدمات والقطع لبدء الطلب.'
                        : 'Your laundry bag is empty. Select services and garments to proceed.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectionList.map((sel) => {
                      const svc = serviceDefinitions.find((s) => s.type === sel.serviceType);
                      const lineTotal = sel.unitPrice * sel.quantity;

                      return (
                        <div
                          key={`${sel.item.id}-${sel.serviceType}`}
                          className="p-3 bg-stone-950/80 border border-stone-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <h4 className="font-semibold text-white truncate">
                              {isAr ? sel.item.name_ar : sel.item.name_en}
                            </h4>
                            <div className="text-stone-400 text-[11px] flex items-center gap-1.5">
                              <span className="text-amber-300">
                                {isAr ? svc?.titleAr : svc?.titleEn}
                              </span>
                              <span>·</span>
                              <span className="font-mono">
                                {sel.unitPrice} {currency} / {isAr ? 'قطعة' : 'pc'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-stone-900 rounded-lg p-0.5 border border-stone-800">
                              <button
                                onClick={() => handleUpdateQuantity(sel.item, sel.serviceType, -1)}
                                className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-mono font-bold text-white">
                                {sel.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(sel.item, sel.serviceType, 1)}
                                className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="text-end font-mono font-bold text-white min-w-[50px]">
                              {lineTotal} {currency}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pickup Logistics & Options */}
                <div className="space-y-3 pt-3 border-t border-stone-800 text-xs">
                  {/* Room Number Notice */}
                  <div className="flex items-center justify-between text-stone-300">
                    <span className="text-stone-400">{isAr ? 'رقم الغرفة:' : 'Room Number:'}</span>
                    <span className="font-bold text-white font-mono bg-stone-800 px-2 py-0.5 rounded">
                      {customRoomNumber || (isAr ? 'نزيل مقيم' : 'Resident')}
                    </span>
                  </div>

                  {/* Pickup Slot Select */}
                  <div className="space-y-1">
                    <label className="text-stone-400 block text-[11px]">
                      {isAr ? 'فترة الاستلام المفضلة:' : 'Preferred Pickup Slot:'}
                    </label>
                    <select
                      value={pickupTimeSlot}
                      onChange={(e) => setPickupTimeSlot(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      {DEFAULT_PICKUP_SLOTS.map((slot) => (
                        <option key={slot.id} value={slot.timeRangeEn}>
                          {isAr ? slot.timeRangeAr : slot.timeRangeEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Express Upgrade Checkbox */}
                  <label className="flex items-start gap-2 p-2.5 bg-stone-950/70 border border-stone-800/90 rounded-xl cursor-pointer hover:border-amber-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={isExpress}
                      onChange={(e) => setIsExpress(e.target.checked)}
                      className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 bg-stone-900 border-stone-700"
                    />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white flex items-center gap-1 text-[11px]">
                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {isAr ? 'خدمة سريعة (استلام خلال 4 ساعات)' : 'Express Valet (4-Hour Return)'}
                      </div>
                      <p className="text-[10px] text-stone-400">
                        {isAr ? 'إضافة 50% لرسوم الخدمة السريعة' : '+50% surcharge applies'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Financial Totals Summary */}
                <div className="space-y-2 pt-3 border-t border-stone-800 text-xs">
                  <div className="flex justify-between text-stone-400">
                    <span>{isAr ? 'المجموع الأساسي:' : 'Subtotal:'}</span>
                    <span className="font-mono text-stone-200">{subtotal} {currency}</span>
                  </div>

                  {isExpress && (
                    <div className="flex justify-between text-amber-300">
                      <span>{isAr ? 'رسوم الخدمة السريعة (+50%):' : 'Express Surcharge (+50%):'}</span>
                      <span className="font-mono font-semibold">+{expressSurcharge} {currency}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-2 border-t border-stone-800/80">
                    <span className="text-sm font-bold text-white">
                      {isAr ? 'الإجمالي التقديري:' : 'Estimated Total:'}
                    </span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      {grandTotal} {currency}
                    </span>
                  </div>
                </div>

                {/* No Online Payment Required Callout */}
                <div className="p-3 bg-stone-950/90 border border-stone-800 rounded-xl text-[11px] text-stone-400 leading-relaxed">
                  <span className="font-semibold text-stone-300 block mb-0.5">
                    {isAr ? 'الدفع على حساب الغرفة' : 'Room Folio Billing'}
                  </span>
                  {isAr
                    ? 'لا يتطلب دفعاً إلكترونياً الآن. يتم احتساب التكلفة وإضافتها لغرفتكم بعد الفحص والتسليم.'
                    : 'No prepayment required. Estimated charge will be posted to your room folio upon garment inspection and delivery.'}
                </div>

                {/* Submit / Proceed to Details Button */}
                <button
                  id="laundry-desktop-submit-btn"
                  onClick={() => setIsSummaryModalOpen(true)}
                  disabled={totalItemCount === 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-950/40 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {isAr
                      ? `متابعة وتأكيد الطلب (${grandTotal} ${currency})`
                      : `Review & Send Request (${grandTotal} ${currency})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MOBILE BOTTOM FLOATING BAR
      ====================================================================== */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-stone-900/95 border-t border-stone-800 backdrop-blur-md px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400">
                {isAr ? 'المجموع التقديري:' : 'Estimated Total:'}
              </span>
              <span className="font-bold text-emerald-400 font-mono text-sm">
                {grandTotal} {currency}
              </span>
            </div>
            <span className="text-[11px] text-stone-400 block font-mono">
              {totalItemCount} {isAr ? 'قطع في حقيبة الغسيل' : 'items in laundry bag'}
            </span>
          </div>

          <button
            id="laundry-mobile-open-bag-btn"
            onClick={() => setIsMobileBagOpen(true)}
            disabled={totalItemCount === 0}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{isAr ? 'عرض الحقيبة والطلب' : 'View Bag & Order'}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MOBILE SLIDE-OVER LAUNDRY BAG
      ====================================================================== */}
      {isMobileBagOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
          <div className="bg-stone-900 border-t border-stone-800 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  {isAr ? 'طلب الغسيل / حقيبة الغسيل' : 'Your Laundry Bag'}
                </h3>
              </div>
              <button
                onClick={() => setIsMobileBagOpen(false)}
                className="p-1 rounded-full bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Items */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {selectionList.map((sel) => {
                const svc = serviceDefinitions.find((s) => s.type === sel.serviceType);
                return (
                  <div
                    key={`${sel.item.id}-${sel.serviceType}`}
                    className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 truncate">
                      <span className="font-semibold text-white block truncate">
                        {isAr ? sel.item.name_ar : sel.item.name_en}
                      </span>
                      <span className="text-[11px] text-amber-400">
                        {isAr ? svc?.titleAr : svc?.titleEn} · {sel.unitPrice} {currency}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(sel.item, sel.serviceType, -1)}
                        className="w-6 h-6 rounded bg-stone-800 text-white flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-white">
                        {sel.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(sel.item, sel.serviceType, 1)}
                        className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pickup Slot & Express */}
            <div className="space-y-3 pt-2 border-t border-stone-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">{isAr ? 'رقم الغرفة:' : 'Room:'}</span>
                <span className="font-bold text-white font-mono bg-stone-800 px-2 py-0.5 rounded">
                  {customRoomNumber || (isAr ? 'نزيل مقيم' : 'Resident')}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-stone-400 text-[11px] block">
                  {isAr ? 'فترة الاستلام:' : 'Pickup Slot:'}
                </label>
                <select
                  value={pickupTimeSlot}
                  onChange={(e) => setPickupTimeSlot(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {DEFAULT_PICKUP_SLOTS.map((slot) => (
                    <option key={slot.id} value={slot.timeRangeEn}>
                      {isAr ? slot.timeRangeAr : slot.timeRangeEn}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-stone-950 border border-stone-800 rounded-xl">
                <input
                  type="checkbox"
                  checked={isExpress}
                  onChange={(e) => setIsExpress(e.target.checked)}
                  className="rounded text-amber-500 bg-stone-900 border-stone-700"
                />
                <span className="text-xs text-stone-200">
                  {isAr ? 'خدمة سريعة (+50% - استلام خلال 4 ساعات)' : 'Express 4-Hour Valet (+50%)'}
                </span>
              </label>

              <div className="flex justify-between items-baseline pt-2 border-t border-stone-800">
                <span className="font-bold text-white">{isAr ? 'الإجمالي التقديري:' : 'Estimated Total:'}</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {grandTotal} {currency}
                </span>
              </div>
            </div>

            <button
              id="laundry-mobile-proceed-btn"
              onClick={() => {
                setIsMobileBagOpen(false);
                setIsSummaryModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40"
            >
              {isAr ? 'متابعة تفاصيل الطلب والإرسال' : 'Continue to Pickup Details'}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          ORDER SUMMARY & PICKUP DETAILS MODAL (STEP 8 & 9 & 11)
      ====================================================================== */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div
            id="laundry-order-summary-modal"
            className="bg-stone-900 border border-stone-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block font-mono">
                  {isAr ? 'ملخص طلب الغسيل' : 'Laundry Request Summary'}
                </span>
                <h3 className="text-xl font-serif font-bold text-white mt-0.5">
                  {isAr ? 'تأكيد موعد واستلام الملابس' : 'Confirm Valet Pickup Details'}
                </h3>
              </div>
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                className="p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room & Guest Details Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-400 block font-medium">
                  {isAr ? 'رقم الغرفة:' : 'Room Number:'}
                </label>
                <input
                  type="text"
                  value={customRoomNumber}
                  onChange={(e) => setCustomRoomNumber(e.target.value)}
                  placeholder="e.g. 508"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-400 block font-medium">
                  {isAr ? 'اسم النزيل (اختياري):' : 'Guest Name (Optional):'}
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={isAr ? 'نزيل الفندق' : 'Hotel Resident'}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-400 block font-medium">
                  {isAr ? 'تاريخ الاستلام:' : 'Pickup Date:'}
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  min={todayStr}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-400 block font-medium">
                  {isAr ? 'فترة الاستلام:' : 'Pickup Time Slot:'}
                </label>
                <select
                  value={pickupTimeSlot}
                  onChange={(e) => setPickupTimeSlot(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  {DEFAULT_PICKUP_SLOTS.map((slot) => (
                    <option key={slot.id} value={slot.timeRangeEn}>
                      {isAr ? slot.timeRangeAr : slot.timeRangeEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Special Instructions & Expandable Tags */}
            <div className="space-y-2 text-xs">
              <label className="text-stone-300 font-semibold block">
                {isAr ? 'تعليمات العناية والتفضيلات:' : 'Garment Care Preferences:'}
              </label>

              {/* Clickable Quick Tags */}
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_CARE_TAGS.map((tag) => {
                  const isSelected = selectedCareTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleCareTag(tag.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
                      }`}
                    >
                      {isAr ? tag.labelAr : tag.labelEn}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder={
                  isAr
                    ? 'أي ملاحظات خاصة أخرى؟ (مثلاً: تنظيف بقع معينة، عدم لمس الأزرار التراثية...)'
                    : 'Any additional instructions? (e.g. delicate buttons, collar fold...)'
                }
                rows={2}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Selected Items Snapshot */}
            <div className="bg-stone-950 border border-stone-800/80 rounded-2xl p-3.5 space-y-2 text-xs max-h-36 overflow-y-auto">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                {isAr ? 'القطع المحددة:' : 'Items Summary:'}
              </span>
              {selectionList.map((sel) => {
                const svc = serviceDefinitions.find((s) => s.type === sel.serviceType);
                return (
                  <div
                    key={`${sel.item.id}-${sel.serviceType}`}
                    className="flex items-center justify-between text-stone-300"
                  >
                    <span>
                      {sel.quantity} × {isAr ? sel.item.name_ar : sel.item.name_en} ({isAr ? svc?.titleAr : svc?.titleEn})
                    </span>
                    <span className="font-mono text-white">
                      {sel.unitPrice * sel.quantity} {currency}
                    </span>
                  </div>
                );
              })}
              {isExpress && (
                <div className="flex items-center justify-between text-amber-400 pt-1 border-t border-stone-800">
                  <span>{isAr ? 'الخدمة السريعة (4 ساعات):' : 'Express Valet Surcharge (+50%):'}</span>
                  <span className="font-mono font-bold">+{expressSurcharge} {currency}</span>
                </div>
              )}
            </div>

            {/* Total Display */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-400 block">
                  {isAr ? 'الإجمالي التقديري للدفع على الغرفة:' : 'Estimated Total (Billed to Room):'}
                </span>
                <span className="text-xs text-stone-500">
                  {isAr ? 'لا يتطلب دفعاً إلكترونياً' : 'No online payment required'}
                </span>
              </div>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {grandTotal} {currency}
              </span>
            </div>

            {/* Submission CTA */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-semibold transition-colors"
              >
                {isAr ? 'تعديل' : 'Modify'}
              </button>
              <button
                id="laundry-submit-pickup-request-btn"
                type="button"
                onClick={handlePlaceLaundryRequest}
                className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/40 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isAr ? 'إرسال طلب الاستلام عبر واتساب' : 'Request Laundry Pickup'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
