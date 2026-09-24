import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Building2,
  Palette,
  Image,
  Phone,
  MessageSquare,
  Layers,
  Bed,
  UtensilsCrossed,
  HeartHandshake,
  ConciergeBell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Type,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import { createDefaultPortalConfig } from '../../utils/portalConfig';
import { createHotel } from '../../services/hotelService';

interface HotelCreationWizardProps {
  onClose: () => void;
  onHotelCreated: (newHotel: Hotel) => void;
  language: Language;
}

export const HotelCreationWizard: React.FC<HotelCreationWizardProps> = ({
  onClose,
  onHotelCreated,
  language,
}) => {
  const isAr = language === 'ar';
  const NextIcon = isAr ? ArrowLeft : ArrowRight;
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showMobilePreview, setShowMobilePreview] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Form State for initial onboarding
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name_en: 'The Royal Oasis Resort & Residences',
    name_ar: 'منتجع الواحة الملكية والأجنحة الفندقية',
    slug: 'royal-oasis-resort',
    stars: 5,
    classification_label_en: '5-Star Luxury Beachfront Resort',
    classification_label_ar: 'منتجع شاطئي فاخر 5 نجوم',
    tagline_en: 'Where Arabian Splendor Meets Coastal Tranquility',
    tagline_ar: 'حيث تلتقي الفخامة العربية مع سكينة الساحل',
    description_en:
      'An exclusive oceanfront haven offering bespoke butler suites, private white sand cabanas, award-winning Mediterranean fine dining, and thermal spa sanctuaries.',
    description_ar:
      'ملاذ ساحلي استثنائي يقدم أجنحة فاخرة مع خدمة نادل خاص، كبائن شاطئية بيضاء، وتجارب طهي متوسطية حاصلة على جوائز عالمية.',
    city_en: 'Jeddah',
    city_ar: 'جدة',
    country_en: 'Saudi Arabia',
    country_ar: 'المملكة العربية السعودية',

    // Step 2: Identity & Branding & Typography
    brand_primary: '#7c5a32',
    brand_secondary: '#1c1917',
    brand_accent: '#d97706',
    brand_background: '#fcfbf9',
    brand_card: '#ffffff',
    brand_text: '#1c1917',
    brand_button: '#8b6f4e',
    brand_radius: '14px',
    logo_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=160&q=80',
    arHeadingFont: 'Cairo',
    arBodyFont: 'Tajawal',
    enHeadingFont: 'Playfair Display',
    enBodyFont: 'Plus Jakarta Sans',

    // Step 3: Hero & Sliders
    hero_images: [
      {
        url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&q=80',
        caption_en: 'Infinite Azure Horizons and Private Beachfront Sanctuary',
        caption_ar: 'آفاق لازوردية رحبة وملاذ شاطئي خاص',
        tag_en: 'Beachfront Haven',
        tag_ar: 'ملاذ شاطئي',
      },
      {
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&q=80',
        caption_en: 'Masterpiece Oceanview Suites with Private Jacuzzi',
        caption_ar: 'أجنحة بانورامية شاهقة بإطلالات بحرية وجاكوزي خاص',
        tag_en: 'Presidential Luxury',
        tag_ar: 'فخامة ملكية',
      },
    ],

    // Step 4: Contact & Location
    address_en: 'Corniche Road, Waterfront District, Jeddah 23511',
    address_ar: 'طريق الكورنيش، الواجهة البحرية، جدة 23511',
    phone_number: '+966 12 600 8888',
    email_address: 'concierge@royaloasis-resort.com',

    // Step 5: WhatsApp Routing
    whatsapp_number: '+966558884422',
    whatsapp_welcome_message: 'Welcome to The Royal Oasis. How may our concierge team assist you today?',

    // Step 6: Departments & Sections Enabled
    has_rooms: true,
    has_offers: true,
    has_dining: true,
    has_wellness: true,
    has_cafe: true,
    has_room_service: true,
    has_laundry: true,
    has_concierge: true,
  });

  // Suggested Color Palettes
  const palettePresets = [
    { name: 'Royal Desert Sand', primary: '#7c5a32', secondary: '#1c1917', accent: '#d97706', button: '#8b6f4e' },
    { name: 'Imperial Emerald', primary: '#1e3a2f', secondary: '#0f172a', accent: '#059669', button: '#2d5a49' },
    { name: 'Riviera Sapphire', primary: '#1e293b', secondary: '#090d16', accent: '#3b82f6', button: '#2563eb' },
    { name: 'Midnight Onyx & Gold', primary: '#27272a', secondary: '#09090b', accent: '#eab308', button: '#ca8a04' },
    { name: 'Rose Gold Luxury', primary: '#885053', secondary: '#1d1a1b', accent: '#c68b59', button: '#a26769' },
  ];

  const stepsList = [
    { num: 1, title: isAr ? 'البيانات الأساسية' : 'Basic Info', icon: Building2 },
    { num: 2, title: isAr ? 'الهوية والخطوط' : 'Branding & Fonts', icon: Palette },
    { num: 3, title: isAr ? 'صور الغلاف' : 'Hero Slides', icon: Image },
    { num: 4, title: isAr ? 'العنوان والتواصل' : 'Contact & Location', icon: Phone },
    { num: 5, title: isAr ? 'بوابة واتساب' : 'WhatsApp Gateway', icon: MessageSquare },
    { num: 6, title: isAr ? 'الأقسام والخدمات' : 'Departments', icon: Layers },
    { num: 7, title: isAr ? 'قوالب الغرف' : 'Rooms', icon: Bed },
    { num: 8, title: isAr ? 'المطاعم' : 'Dining', icon: UtensilsCrossed },
    { num: 9, title: isAr ? 'السبا والصحة' : 'Wellness', icon: HeartHandshake },
    { num: 10, title: isAr ? 'خدمات النزلاء' : 'Services', icon: ConciergeBell },
    { num: 11, title: isAr ? 'المراجعة والتدشين' : 'Review & Publish', icon: CheckCircle2 },
  ];

  const handlePublish = async () => {
    setCreationError(null);

    // Validation 1: Required Bilingual Names
    if (!formData.name_en.trim()) {
      setCreationError(isAr ? 'يرجى إدخال اسم الفندق بالإنجليزية.' : 'English hotel name is required.');
      setCurrentStep(1);
      return;
    }
    if (!formData.name_ar.trim()) {
      setCreationError(isAr ? 'يرجى إدخال اسم الفندق بالعربية.' : 'Arabic hotel name is required.');
      setCurrentStep(1);
      return;
    }

    // Validation 2: Slug validation
    const cleanSlug = formData.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug || cleanSlug.length < 3) {
      setCreationError(
        isAr
          ? 'معرّف الرابط (Slug) يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط ولا يقل عن 3 أحرف.'
          : 'URL slug must be at least 3 characters and contain only lowercase letters, numbers, and hyphens.'
      );
      setCurrentStep(1);
      return;
    }

    // Validation 3: Contact details format
    if (formData.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_address.trim())) {
      setCreationError(isAr ? 'صيغة البريد الإلكتروني غير صحيحة.' : 'Invalid email address format.');
      setCurrentStep(4);
      return;
    }

    // Validation 4: Required location
    if (!formData.city_en.trim() || !formData.city_ar.trim()) {
      setCreationError(isAr ? 'يرجى إدخال المدينة باللغتين.' : 'Bilingual city name is required.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    // Build portal configuration reflecting initial department settings
    const portalConfig = createDefaultPortalConfig({
      offers: formData.has_offers,
      rooms: formData.has_rooms,
      dining: formData.has_dining,
      wellness: formData.has_wellness,
      room_service_cafe: formData.has_room_service || formData.has_cafe,
      services: formData.has_concierge || formData.has_laundry,
      info: true,
      contact: true,
    });

    try {
      const createdHotel = await createHotel({
        name_en: formData.name_en.trim(),
        name_ar: formData.name_ar.trim(),
        slug: cleanSlug,
        classification_stars: formData.stars || 5,
        currency: 'SAR',
        city_en: formData.city_en,
        city_ar: formData.city_ar,
        country_en: formData.country_en,
        country_ar: formData.country_ar,
        address_en: formData.address_en,
        address_ar: formData.address_ar,
        phone: formData.phone_number,
        whatsapp_number: formData.whatsapp_number,
        email: formData.email_address,
        tagline_en: formData.tagline_en,
        tagline_ar: formData.tagline_ar,
        description_en: formData.description_en,
        description_ar: formData.description_ar,
        logo_url: formData.logo_url,
        branding: {
          primary: formData.brand_primary,
          secondary: formData.brand_secondary,
          accent: formData.brand_accent,
          background: formData.brand_background,
          surface: formData.brand_card,
          text: formData.brand_text,
          button: formData.brand_button,
          muted: '#78716c',
          border: '#e7e5e4',
          radius: formData.brand_radius || '14px',
        },
        typography: {
          arHeadingFont: formData.arHeadingFont,
          arBodyFont: formData.arBodyFont,
          enHeadingFont: formData.enHeadingFont,
          enBodyFont: formData.enBodyFont,
        },
        portal_config: portalConfig,
      });

      onHotelCreated(createdHotel);
    } catch (err: any) {
      console.error('[HotelCreationWizard] Failed to create hotel:', err);
      setCreationError(err?.message || 'Failed to create hotel in Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addHeroSlide = () => {
    setFormData((prev) => ({
      ...prev,
      hero_images: [
        ...prev.hero_images,
        {
          url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600&q=80',
          caption_en: 'Sunlit Panoramic Terrace & Poolside Oasis',
          caption_ar: 'تراس مشمس ومسبح بانورامي ساحر',
          tag_en: 'Oasis View',
          tag_ar: 'إطلالة الواحة',
        },
      ],
    }));
  };

  return (
    <div
      id="hotel-creation-wizard-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-center p-0 sm:p-4 md:p-6"
    >
      <div className="bg-white w-full max-w-6xl h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 relative flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  {isAr ? 'معالج إعداد وتدشين الفندق الجديد' : 'Hotel Initial Onboarding Wizard'}
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                  Phase 1 Onboarding
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400">
                {isAr
                  ? `الخطوة ${currentStep} من 11: ${stepsList[currentStep - 1].title}`
                  : `Step ${currentStep} of 11: ${stepsList[currentStep - 1].title}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile preview toggle */}
            <button
              onClick={() => setShowMobilePreview(!showMobilePreview)}
              className="lg:hidden p-2 text-stone-300 hover:text-white rounded-lg hover:bg-stone-800 border border-stone-700 flex items-center gap-1 text-xs cursor-pointer"
              title="Toggle Live Preview"
            >
              {showMobilePreview ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-[11px]">{showMobilePreview ? 'Hide' : 'Preview'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Step Progress Bar (Scrollable on Mobile, Clear Active Highlight) */}
        <div className="bg-stone-100 px-3 sm:px-4 py-2 border-b border-stone-200 overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center gap-1.5 min-w-max">
            {stepsList.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[36px] ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-xs'
                      : isPast
                      ? 'text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80'
                      : 'text-stone-600 hover:bg-stone-200/80'
                  }`}
                >
                  <Icon size={13} />
                  <span>
                    {step.num}. {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Content: Form on Left, Live Brand Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1">
          {/* Form Fields Column */}
          <div className="lg:col-span-7 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
            {/* STEP 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    {isAr ? 'الملف التعريفي الأساسي وتصنيف الفندق' : 'Hotel Basic Profile & Classification'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr
                      ? 'أدخل بيانات الفندق باللغتين العربية والإنجليزية لضمان تجربة ثنائية اللغة متكاملة.'
                      : 'Enter core hotel identity in both English and Arabic for dynamic bilingual guest portal rendering.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Hotel Name (English) *</label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">اسم الفندق (العربية) *</label>
                    <input
                      type="text"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      dir="rtl"
                      className="w-full text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-stone-700">URL Identifier (Slug) *</label>
                      <button
                        type="button"
                        onClick={() => {
                          const generated = formData.name_en
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '');
                          if (generated) setFormData((prev) => ({ ...prev, slug: generated }));
                        }}
                        className="text-[10px] font-semibold text-amber-700 hover:text-amber-600 underline cursor-pointer"
                      >
                        {isAr ? 'توليد تلقائي من الاسم' : 'Auto-generate from name'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        })
                      }
                      placeholder="e.g. royal-oasis-resort"
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Star Rating</label>
                    <select
                      value={formData.stars}
                      onChange={(e) => setFormData({ ...formData, stars: Number(e.target.value) })}
                      className="w-full text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900"
                    >
                      <option value={5}>5-Star Luxury Resort & Hotel</option>
                      <option value={4}>4-Star Premium Boutique</option>
                      <option value={3}>3-Star Comfort & Business</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Classification Label (EN)</label>
                    <input
                      type="text"
                      value={formData.classification_label_en}
                      onChange={(e) => setFormData({ ...formData, classification_label_en: e.target.value })}
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">تصنيف المنشأة (AR)</label>
                    <input
                      type="text"
                      value={formData.classification_label_ar}
                      onChange={(e) => setFormData({ ...formData, classification_label_ar: e.target.value })}
                      dir="rtl"
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Tagline (English)</label>
                    <input
                      type="text"
                      value={formData.tagline_en}
                      onChange={(e) => setFormData({ ...formData, tagline_en: e.target.value })}
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">الشعار الترويجي (العربية)</label>
                    <input
                      type="text"
                      value={formData.tagline_ar}
                      onChange={(e) => setFormData({ ...formData, tagline_ar: e.target.value })}
                      dir="rtl"
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Full Description (EN)</label>
                    <textarea
                      value={formData.description_en}
                      onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                      rows={3}
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-stone-900 leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">الوصف التعريفي الكامل (AR)</label>
                    <textarea
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      dir="rtl"
                      rows={3}
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-stone-900 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Branding & Typography */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    {isAr ? 'الهوية البصرية، الألوان والخطوط' : 'Dynamic Branding, Colors & Typography'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr
                      ? 'اختر لوحة ألوان فاخرة وحدد خطوط العرض والنصوص. يتم تطبيقها فوراً عبر متغيرات CSS.'
                      : 'Select a curated luxury palette and font pairing. These apply dynamically via CSS variables.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">Curated Luxury Color Palettes:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {palettePresets.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            brand_primary: p.primary,
                            brand_secondary: p.secondary,
                            brand_accent: p.accent,
                            brand_button: p.button,
                          })
                        }
                        className="p-2.5 rounded-xl border border-stone-200 text-left hover:border-stone-400 bg-stone-50 flex items-center justify-between cursor-pointer min-h-[44px]"
                      >
                        <span className="text-xs font-medium text-stone-800">{p.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.primary }} />
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.accent }} />
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.secondary }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.brand_primary}
                        onChange={(e) => setFormData({ ...formData, brand_primary: e.target.value })}
                        className="w-9 h-9 rounded-lg border cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.brand_primary}
                        onChange={(e) => setFormData({ ...formData, brand_primary: e.target.value })}
                        className="text-xs font-mono bg-stone-50 border rounded-lg p-1.5 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Secondary / Dark</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.brand_secondary}
                        onChange={(e) => setFormData({ ...formData, brand_secondary: e.target.value })}
                        className="w-9 h-9 rounded-lg border cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.brand_secondary}
                        onChange={(e) => setFormData({ ...formData, brand_secondary: e.target.value })}
                        className="text-xs font-mono bg-stone-50 border rounded-lg p-1.5 w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Accent Gold</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.brand_accent}
                        onChange={(e) => setFormData({ ...formData, brand_accent: e.target.value })}
                        className="w-9 h-9 rounded-lg border cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.brand_accent}
                        onChange={(e) => setFormData({ ...formData, brand_accent: e.target.value })}
                        className="text-xs font-mono bg-stone-50 border rounded-lg p-1.5 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Typography Selection (Architected for Control Center) */}
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                    <Type size={14} className="text-amber-600" />
                    <span>Typography & Bilingual Fonts Pairing</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Arabic Heading Font</label>
                      <select
                        value={formData.arHeadingFont}
                        onChange={(e) => setFormData({ ...formData, arHeadingFont: e.target.value })}
                        className="w-full text-xs bg-white border border-stone-300 rounded-lg p-2 text-stone-800"
                      >
                        <option value="Cairo">Cairo (Classic Arabic Luxury)</option>
                        <option value="Tajawal">Tajawal (Modern Clean Arabic)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Arabic Body Font</label>
                      <select
                        value={formData.arBodyFont}
                        onChange={(e) => setFormData({ ...formData, arBodyFont: e.target.value })}
                        className="w-full text-xs bg-white border border-stone-300 rounded-lg p-2 text-stone-800"
                      >
                        <option value="Tajawal">Tajawal (High Legibility)</option>
                        <option value="Cairo">Cairo (Bold Architectural)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">English Heading Font</label>
                      <select
                        value={formData.enHeadingFont}
                        onChange={(e) => setFormData({ ...formData, enHeadingFont: e.target.value })}
                        className="w-full text-xs bg-white border border-stone-300 rounded-lg p-2 text-stone-800"
                      >
                        <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">English Body Font</label>
                      <select
                        value={formData.enBodyFont}
                        onChange={(e) => setFormData({ ...formData, enBodyFont: e.target.value })}
                        className="w-full text-xs bg-white border border-stone-300 rounded-lg p-2 text-stone-800"
                      >
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans (Ergonomic Sans)</option>
                        <option value="Cairo">Cairo (Unified Look)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Hotel Logo URL</label>
                  <input
                    type="text"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Hero Slides */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900">
                      {isAr ? 'صور الغلاف البانورامي (Hero Slider)' : 'Hero Slider Images & Captions'}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {isAr
                        ? 'أضف الصور البانورامية عالية الدقة مع العناوين التوضيحية.'
                        : 'Configure editorial photography displayed prominently at the top of the guest portal.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addHeroSlide}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 cursor-pointer min-h-[36px]"
                  >
                    <Plus size={14} />
                    <span>Add Slide</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.hero_images.map((slide, idx) => (
                    <div key={idx} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-stone-800">Slide #{idx + 1}</span>
                        {formData.hero_images.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                hero_images: formData.hero_images.filter((_, i) => i !== idx),
                              })
                            }
                            className="text-rose-600 hover:text-rose-800 text-xs flex items-center gap-1 p-1"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={slide.url}
                        onChange={(e) => {
                          const updated = [...formData.hero_images];
                          updated[idx].url = e.target.value;
                          setFormData({ ...formData, hero_images: updated });
                        }}
                        className="w-full text-xs bg-white border border-stone-300 rounded-lg p-2"
                        placeholder="Image URL"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={slide.caption_en}
                          onChange={(e) => {
                            const updated = [...formData.hero_images];
                            updated[idx].caption_en = e.target.value;
                            setFormData({ ...formData, hero_images: updated });
                          }}
                          className="w-full text-xs bg-white border border-stone-300 rounded-lg p-1.5"
                          placeholder="English Caption"
                        />
                        <input
                          type="text"
                          value={slide.caption_ar}
                          onChange={(e) => {
                            const updated = [...formData.hero_images];
                            updated[idx].caption_ar = e.target.value;
                            setFormData({ ...formData, hero_images: updated });
                          }}
                          dir="rtl"
                          className="w-full text-xs bg-white border border-stone-300 rounded-lg p-1.5"
                          placeholder="عنوان الغلاف بالعربية"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Contact & Location */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    {isAr ? 'بيانات الاتصال المباشر والعنوان' : 'Direct Contact Details & Location'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr
                      ? 'تمكّن النزلاء من التواصل الفوري مع الفندق بنقرة واحدة.'
                      : 'Enables guests to call the front desk, dispatch emails, or open GPS navigation.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email_address}
                      onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Physical Address (EN)</label>
                    <input
                      type="text"
                      value={formData.address_en}
                      onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">العنوان الفعلي (AR)</label>
                    <input
                      type="text"
                      value={formData.address_ar}
                      onChange={(e) => setFormData({ ...formData, address_ar: e.target.value })}
                      dir="rtl"
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: WhatsApp Routing */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    {isAr ? 'بوابة واتساب للكونسيرج والحجوزات' : 'WhatsApp Concierge Gateway'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr
                      ? 'الرقم المخصص لاستقبال طلبات حجز الغرف، طاولات الطعام، واستفسارات النزلاء.'
                      : 'All booking requests and inquiries generate pre-formatted WhatsApp dispatches to this number.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">WhatsApp Phone Number *</label>
                  <input
                    type="text"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="+966 5x xxx xxxx"
                    className="w-full text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Default Welcome Greeting</label>
                  <input
                    type="text"
                    value={formData.whatsapp_welcome_message}
                    onChange={(e) => setFormData({ ...formData, whatsapp_welcome_message: e.target.value })}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>
              </div>
            )}

            {/* STEP 6: Active Departments & Sections */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    {isAr ? 'أقسام الفندق والخدمات المتاحة' : 'Active Property Departments & Sections'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr
                      ? 'حدد الأقسام المفعلة لهذا العقار. يتم عكس هذا الإعداد تلقائياً في بوابة النزيل وقوائم التنقل.'
                      : 'Toggle which sections and service lines are active. The guest portal and navigation dynamically adapt.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'has_rooms', label: 'Rooms & Suites Stay', desc: 'Booking discovery & requests' },
                    { key: 'has_offers', label: 'Exclusive Hotel Offers', desc: 'Seasonal promotions & discounts' },
                    { key: 'has_dining', label: 'Fine Dining Venues', desc: 'Culinary menus & reservations' },
                    { key: 'has_wellness', label: 'Wellness & Spa Sanctuary', desc: 'Private suites & treatments' },
                    { key: 'has_cafe', label: 'Artisan Lobby Café', desc: 'Specialty coffee & pastries' },
                    { key: 'has_room_service', label: '24/7 Room Service', desc: 'In-room food delivery' },
                    { key: 'has_laundry', label: 'Express Valet & Laundry', desc: 'Dry cleaning & garment press' },
                    { key: 'has_concierge', label: 'Les Clefs d’Or Concierge', desc: 'Luggage, bellman & tours' },
                  ].map((dept) => (
                    <label
                      key={dept.key}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs font-medium cursor-pointer hover:bg-stone-100/70 transition-colors min-h-[48px]"
                    >
                      <div>
                        <span className="font-semibold text-stone-900 block">{dept.label}</span>
                        <span className="text-[10px] text-stone-500">{dept.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(formData[dept.key as keyof typeof formData])}
                        onChange={(e) => setFormData({ ...formData, [dept.key]: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7 - 10: Department inventories notice */}
            {currentStep >= 7 && currentStep <= 10 && (
              <div className="p-4 sm:p-6 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-stone-900">
                  {stepsList[currentStep - 1].title} Inventory Integration
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Default premium 5-star inventory items have been seeded for this department. Following Phase 1 onboarding,
                  the Hotel Control Center will enable you to modify room categories, culinary items, and spa bookings dynamically.
                </p>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Standard 5-Star Luxury Inventory Active for this Property</span>
                </div>
              </div>
            )}

            {/* STEP 11: Review & Publish */}
            {currentStep === 11 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    {isAr ? 'مراجعة وتدشين المنشأة الفندقية' : 'Review and Deploy Hotel Property'}
                  </h3>
                  <p className="text-xs text-stone-600">
                    {isAr
                      ? 'تحقق من جميع الإعدادات قبل إدراج الفندق في منصة النزلاء متعددة العقارات.'
                      : 'Verify hotel specifications before publishing into the live multi-hotel tenant registry.'}
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-2.5">
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Property Name:</span>
                    <span className="font-bold text-stone-900">{formData.name_en}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Arabic Name:</span>
                    <span className="font-bold text-stone-900 font-sans" dir="rtl">
                      {formData.name_ar}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">URL Slug:</span>
                    <span className="font-mono text-stone-800">{formData.slug}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">WhatsApp Concierge:</span>
                    <span className="font-mono text-stone-800">{formData.whatsapp_number}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Primary Color:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: formData.brand_primary }} />
                      <span className="font-mono">{formData.brand_primary}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-500">Typography Pairing:</span>
                    <span className="font-semibold text-stone-800">
                      {formData.enHeadingFont} / {formData.arHeadingFont}
                    </span>
                  </div>
                </div>

                {creationError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs rounded-xl">
                    {creationError}
                  </div>
                )}

                <button
                  id="wizard-publish-hotel-btn"
                  type="button"
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Sparkles size={16} />
                  <span>{isSubmitting ? (isAr ? 'جاري إنشاء الفندق...' : 'Creating Property...') : (isAr ? 'تدشين الفندق والتبديل إليه فوراً' : 'Publish Property & Switch Live')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Live Preview Column on Right (Desktop or Mobile Toggled) */}
          <div
            className={`lg:col-span-5 p-4 sm:p-6 lg:p-8 bg-stone-100/70 border-t lg:border-t-0 lg:border-l border-stone-200 overflow-y-auto ${
              showMobilePreview ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="sticky top-0 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={13} /> Live Visual Preview
                </span>
                <span className="text-[10px] text-stone-400 font-mono">Dynamic Theme Engine</span>
              </div>

              {/* Preview Card */}
              <div
                className="rounded-2xl border shadow-md overflow-hidden transition-all text-white p-4 sm:p-5 space-y-4"
                style={{
                  backgroundColor: formData.brand_secondary,
                  borderColor: formData.brand_primary,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shadow-xs"
                      style={{ backgroundColor: formData.brand_primary }}
                    >
                      {formData.name_en.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold leading-tight line-clamp-1">{formData.name_en}</h4>
                      <p className="text-[10px] text-stone-400">
                        {formData.city_en}, {formData.country_en}
                      </p>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: formData.brand_accent, color: '#000' }}
                  >
                    ★ {formData.stars} Stars
                  </span>
                </div>

                <div className="h-28 sm:h-32 rounded-xl overflow-hidden bg-stone-800">
                  <img
                    src={formData.hero_images[0]?.url}
                    alt="Hero Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                <p className="text-xs text-stone-300 line-clamp-2">{formData.description_en}</p>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-400">Zero Online Payment</span>
                  <div
                    className="px-3 py-1.5 rounded-lg font-semibold text-[11px]"
                    style={{ backgroundColor: formData.brand_button, color: '#fff' }}
                  >
                    Explore Rooms
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wizard Footer Controls (Sticky on Mobile & Desktop) */}
        <div className="bg-stone-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[44px] cursor-pointer ${
              currentStep === 1
                ? 'opacity-40 cursor-not-allowed text-stone-400'
                : 'text-stone-700 hover:bg-stone-200/80 active:bg-stone-300'
            }`}
          >
            <BackIcon size={14} />
            <span>{isAr ? 'السابق' : 'Previous'}</span>
          </button>

          <span className="text-xs text-stone-500 font-medium">
            {currentStep} / 11
          </span>

          {currentStep < 11 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(11, prev + 1))}
              className="py-2.5 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[44px]"
            >
              <span>{isAr ? 'التالي' : 'Next'}</span>
              <NextIcon size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSubmitting}
              className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[44px]"
            >
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'تدشين الفندق' : 'Complete & Publish')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
