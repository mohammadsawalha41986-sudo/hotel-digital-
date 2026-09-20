import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Globe,
  MapPin,
  Phone,
  Clock,
  Wifi,
  Share2,
  Lock,
  Unlock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Hotel, HotelSocialLinks } from '../../types/hotel';
import { AdminUser, canEditHotelContent, canManageHotels } from '../../types/auth';
import { updateHotel, getHotel } from '../../services/hotelService';

interface HotelInformationViewProps {
  hotel: Hotel;
  currentUser?: AdminUser | null;
  onUpdateHotel: (updated: Hotel) => void;
  onMarkUnpublishedChanges?: () => void;
}

export const HotelInformationView: React.FC<HotelInformationViewProps> = ({
  hotel,
  currentUser,
  onUpdateHotel,
  onMarkUnpublishedChanges,
}) => {
  // Permission evaluation
  const hasEditPermission = useMemo(() => {
    return canEditHotelContent(currentUser || null, hotel.id);
  }, [currentUser, hotel.id]);

  const isSuperAdmin = useMemo(() => {
    return canManageHotels(currentUser || null);
  }, [currentUser]);

  // Form State
  const [nameEn, setNameEn] = useState(hotel.name_en || '');
  const [nameAr, setNameAr] = useState(hotel.name_ar || '');
  const [slug, setSlug] = useState(hotel.slug || hotel.id);
  const [slugEditable, setSlugEditable] = useState(false);
  const [stars, setStars] = useState<number>(hotel.classification_stars || 4);
  const [isPublished, setIsPublished] = useState<boolean>(hotel.is_published === true);
  const [currency, setCurrency] = useState(hotel.currency || 'SAR');
  const [defaultLanguage, setDefaultLanguage] = useState<'en' | 'ar'>(hotel.default_language || 'en');
  const [enabledLanguages, setEnabledLanguages] = useState<('en' | 'ar')[]>(
    hotel.enabled_languages || ['en', 'ar']
  );

  // Descriptions
  const [taglineEn, setTaglineEn] = useState(hotel.tagline_en || '');
  const [taglineAr, setTaglineAr] = useState(hotel.tagline_ar || '');
  const [descriptionEn, setDescriptionEn] = useState(hotel.description_en || '');
  const [descriptionAr, setDescriptionAr] = useState(hotel.description_ar || '');

  // Location
  const [countryEn, setCountryEn] = useState(hotel.country_en || 'Saudi Arabia');
  const [countryAr, setCountryAr] = useState(hotel.country_ar || 'المملكة العربية السعودية');
  const [cityEn, setCityEn] = useState(hotel.city_en || 'Riyadh');
  const [cityAr, setCityAr] = useState(hotel.city_ar || 'الرياض');
  const [addressEn, setAddressEn] = useState(hotel.address_en || '');
  const [addressAr, setAddressAr] = useState(hotel.address_ar || '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(hotel.google_maps_url || '');
  const [latitude, setLatitude] = useState<string>(
    hotel.latitude !== undefined ? String(hotel.latitude) : ''
  );
  const [longitude, setLongitude] = useState<string>(
    hotel.longitude !== undefined ? String(hotel.longitude) : ''
  );

  // Contact
  const [phone, setPhone] = useState(hotel.phone || '');
  const [email, setEmail] = useState(hotel.email || '');
  const [whatsappNumber, setWhatsappNumber] = useState(
    hotel.general_guest_whatsapp || hotel.whatsapp_number || ''
  );
  const [websiteUrl, setWebsiteUrl] = useState(hotel.website_url || '');

  // Operating Info
  const [checkInTime, setCheckInTime] = useState(
    hotel.check_in_time || hotel.policies?.checkInTime || '15:00'
  );
  const [checkOutTime, setCheckOutTime] = useState(
    hotel.check_out_time || hotel.policies?.checkOutTime || '12:00'
  );
  const [timezone, setTimezone] = useState(hotel.timezone || 'Asia/Riyadh');

  // Wi-Fi
  const [wifiName, setWifiName] = useState(
    hotel.wifi_name || hotel.policies?.wifiSsid || ''
  );
  const [wifiPassword, setWifiPassword] = useState(
    hotel.wifi_password || hotel.policies?.wifiPassword || ''
  );
  const [wifiPublicEnabled, setWifiPublicEnabled] = useState(
    hotel.wifi_public_enabled === true
  );

  // Social Links
  const [socialLinks, setSocialLinks] = useState<HotelSocialLinks>(hotel.social_links || {});

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form when active hotel changes
  useEffect(() => {
    setNameEn(hotel.name_en || '');
    setNameAr(hotel.name_ar || '');
    setSlug(hotel.slug || hotel.id);
    setSlugEditable(false);
    setStars(hotel.classification_stars || 4);
    setIsPublished(hotel.is_published === true);
    setCurrency(hotel.currency || 'SAR');
    setDefaultLanguage(hotel.default_language || 'en');
    setEnabledLanguages(hotel.enabled_languages || ['en', 'ar']);
    setTaglineEn(hotel.tagline_en || '');
    setTaglineAr(hotel.tagline_ar || '');
    setDescriptionEn(hotel.description_en || '');
    setDescriptionAr(hotel.description_ar || '');
    setCountryEn(hotel.country_en || 'Saudi Arabia');
    setCountryAr(hotel.country_ar || 'المملكة العربية السعودية');
    setCityEn(hotel.city_en || 'Riyadh');
    setCityAr(hotel.city_ar || 'الرياض');
    setAddressEn(hotel.address_en || '');
    setAddressAr(hotel.address_ar || '');
    setGoogleMapsUrl(hotel.google_maps_url || '');
    setLatitude(hotel.latitude !== undefined ? String(hotel.latitude) : '');
    setLongitude(hotel.longitude !== undefined ? String(hotel.longitude) : '');
    setPhone(hotel.phone || '');
    setEmail(hotel.email || '');
    setWhatsappNumber(hotel.general_guest_whatsapp || hotel.whatsapp_number || '');
    setWebsiteUrl(hotel.website_url || '');
    setCheckInTime(hotel.check_in_time || hotel.policies?.checkInTime || '15:00');
    setCheckOutTime(hotel.check_out_time || hotel.policies?.checkOutTime || '12:00');
    setTimezone(hotel.timezone || 'Asia/Riyadh');
    setWifiName(hotel.wifi_name || hotel.policies?.wifiSsid || '');
    setWifiPassword(hotel.wifi_password || hotel.policies?.wifiPassword || '');
    setWifiPublicEnabled(hotel.wifi_public_enabled === true);
    setSocialLinks(hotel.social_links || {});
    setSaveSuccess(false);
    setErrorMessage(null);
    setValidationErrors({});
  }, [hotel.id]);

  // Dirty State Detection
  const isDirty = useMemo(() => {
    if (nameEn !== (hotel.name_en || '')) return true;
    if (nameAr !== (hotel.name_ar || '')) return true;
    if (slug !== (hotel.slug || hotel.id)) return true;
    if (stars !== (hotel.classification_stars || 4)) return true;
    if (isPublished !== (hotel.is_published === true)) return true;
    if (currency !== (hotel.currency || 'SAR')) return true;
    if (defaultLanguage !== (hotel.default_language || 'en')) return true;
    if (JSON.stringify(enabledLanguages) !== JSON.stringify(hotel.enabled_languages || ['en', 'ar'])) return true;
    if (taglineEn !== (hotel.tagline_en || '')) return true;
    if (taglineAr !== (hotel.tagline_ar || '')) return true;
    if (descriptionEn !== (hotel.description_en || '')) return true;
    if (descriptionAr !== (hotel.description_ar || '')) return true;
    if (countryEn !== (hotel.country_en || 'Saudi Arabia')) return true;
    if (countryAr !== (hotel.country_ar || 'المملكة العربية السعودية')) return true;
    if (cityEn !== (hotel.city_en || 'Riyadh')) return true;
    if (cityAr !== (hotel.city_ar || 'الرياض')) return true;
    if (addressEn !== (hotel.address_en || '')) return true;
    if (addressAr !== (hotel.address_ar || '')) return true;
    if (googleMapsUrl !== (hotel.google_maps_url || '')) return true;
    if (latitude !== (hotel.latitude !== undefined ? String(hotel.latitude) : '')) return true;
    if (longitude !== (hotel.longitude !== undefined ? String(hotel.longitude) : '')) return true;
    if (phone !== (hotel.phone || '')) return true;
    if (email !== (hotel.email || '')) return true;
    if (whatsappNumber !== (hotel.general_guest_whatsapp || hotel.whatsapp_number || '')) return true;
    if (websiteUrl !== (hotel.website_url || '')) return true;
    if (checkInTime !== (hotel.check_in_time || hotel.policies?.checkInTime || '15:00')) return true;
    if (checkOutTime !== (hotel.check_out_time || hotel.policies?.checkOutTime || '12:00')) return true;
    if (timezone !== (hotel.timezone || 'Asia/Riyadh')) return true;
    if (wifiName !== (hotel.wifi_name || hotel.policies?.wifiSsid || '')) return true;
    if (wifiPassword !== (hotel.wifi_password || hotel.policies?.wifiPassword || '')) return true;
    if (wifiPublicEnabled !== (hotel.wifi_public_enabled === true)) return true;
    if (JSON.stringify(socialLinks) !== JSON.stringify(hotel.social_links || {})) return true;
    return false;
  }, [
    hotel,
    nameEn,
    nameAr,
    slug,
    stars,
    isPublished,
    currency,
    defaultLanguage,
    enabledLanguages,
    taglineEn,
    taglineAr,
    descriptionEn,
    descriptionAr,
    countryEn,
    countryAr,
    cityEn,
    cityAr,
    addressEn,
    addressAr,
    googleMapsUrl,
    latitude,
    longitude,
    phone,
    email,
    whatsappNumber,
    websiteUrl,
    checkInTime,
    checkOutTime,
    timezone,
    wifiName,
    wifiPassword,
    wifiPublicEnabled,
    socialLinks,
  ]);

  // Detect legacy placeholder contact values
  const hasLegacyPhone = phone.trim() === '+966112349999';
  const hasLegacyEmail = email.toLowerCase().includes('example') || email.toLowerCase().includes('placeholder');
  const hasLegacyWhatsapp = whatsappNumber.trim() === '+966112349999';

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!nameEn.trim()) errors.nameEn = 'English hotel name is required';
    if (!nameAr.trim()) errors.nameAr = 'Arabic hotel name is required';

    if (slugEditable && slug.trim()) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug.trim())) {
        errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
      }
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (latitude.trim()) {
      const numLat = parseFloat(latitude.trim());
      if (isNaN(numLat) || numLat < -90 || numLat > 90) {
        errors.latitude = 'Latitude must be a valid number between -90 and 90';
      }
    }

    if (longitude.trim()) {
      const numLng = parseFloat(longitude.trim());
      if (isNaN(numLng) || numLng < -180 || numLng > 180) {
        errors.longitude = 'Longitude must be a valid number between -180 and 180';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!hasEditPermission) return;
    if (!validateForm()) {
      setErrorMessage('Please resolve validation errors before saving.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const parsedLat = latitude.trim() ? parseFloat(latitude.trim()) : undefined;
      const parsedLng = longitude.trim() ? parseFloat(longitude.trim()) : undefined;

      const updatePayload: Partial<Hotel> = {
        name_en: nameEn.trim(),
        name_ar: nameAr.trim(),
        slug: slug.trim(),
        classification_stars: stars,
        classification_label_en: `${stars}-Star Hotel`,
        classification_label_ar: `فندق فاخر فئة ${stars} نجوم`,
        is_published: isPublished,
        currency: currency.trim() || 'SAR',
        default_language: defaultLanguage,
        enabled_languages: enabledLanguages,
        tagline_en: taglineEn.trim(),
        tagline_ar: taglineAr.trim(),
        description_en: descriptionEn.trim(),
        description_ar: descriptionAr.trim(),
        country_en: countryEn.trim(),
        country_ar: countryAr.trim(),
        city_en: cityEn.trim(),
        city_ar: cityAr.trim(),
        address_en: addressEn.trim(),
        address_ar: addressAr.trim(),
        google_maps_url: googleMapsUrl.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        phone: phone.trim(),
        email: email.trim(),
        whatsapp_number: whatsappNumber.trim(),
        general_guest_whatsapp: whatsappNumber.trim(),
        website_url: websiteUrl.trim(),
        timezone: timezone.trim(),
        wifi_name: wifiName.trim(),
        wifi_password: wifiPassword.trim(),
        wifi_public_enabled: wifiPublicEnabled,
        social_links: socialLinks,
        check_in_time: checkInTime.trim(),
        check_out_time: checkOutTime.trim(),
        policies: {
          ...(hotel.policies || {}),
          checkInTime: checkInTime.trim(),
          checkOutTime: checkOutTime.trim(),
          wifiSsid: wifiName.trim(),
          wifiPassword: wifiPassword.trim(),
        },
      };

      // Persist to Firestore /hotels/{activeHotelId}
      await updateHotel(hotel.id, updatePayload);

      // Propagate updated object to parent state
      const updatedHotel: Hotel = {
        ...hotel,
        ...updatePayload,
      };

      onUpdateHotel(updatedHotel);
      onMarkUnpublishedChanges?.();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('[HotelInformationView] Failed to save hotel metadata to Firestore:', err);
      setErrorMessage(err.message || 'Failed to save hotel information to Firestore. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const fresh = await getHotel(hotel.id);
      if (fresh) {
        onUpdateHotel(fresh);
      }
    } catch (err: any) {
      console.error('[HotelInformationView] Failed to refresh from Firestore:', err);
      setErrorMessage('Could not load fresh data from Firestore.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSocialChange = (network: keyof HotelSocialLinks, value: string) => {
    setSocialLinks((prev) => ({
      ...prev,
      [network]: value.trim(),
    }));
  };

  const handleToggleLanguage = (lang: 'en' | 'ar') => {
    if (enabledLanguages.includes(lang)) {
      if (enabledLanguages.length > 1) {
        setEnabledLanguages(enabledLanguages.filter((l) => l !== lang));
      }
    } else {
      setEnabledLanguages([...enabledLanguages, lang]);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner: Property Context & Status */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-serif font-bold text-xl shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Active Property
                </span>
                <span className="text-xs font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                  ID: {hotel.id}
                </span>
                {hotel.is_published ? (
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Live / Published
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Unpublished Draft
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                {hotel.name_en}
                <span className="text-sm font-sans font-normal text-stone-400 ms-3" dir="rtl">
                  {hotel.name_ar}
                </span>
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                Firestore Target Path: <code className="text-amber-300 font-mono">/hotels/{hotel.id}</code>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 self-end md:self-center">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isSaving}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Discard local edits and reload directly from Firestore"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-amber-400' : ''} />
              <span>Refresh from Firestore</span>
            </button>

            {hasEditPermission && (
              <button
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                  isDirty
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 animate-pulse'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                } disabled:opacity-50`}
              >
                <Save size={15} />
                <span>{isSaving ? 'Saving to Firestore...' : 'Save Hotel Changes'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Read-only Alert if unauthorized */}
        {!hasEditPermission && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
            <ShieldAlert size={16} className="shrink-0 text-rose-400" />
            <span>
              <strong>Read-Only Mode:</strong> Your role ({currentUser?.role || 'Staff'}) does not have permission to modify hotel general information.
            </span>
          </div>
        )}

        {/* Unsaved Changes Banner */}
        {isDirty && hasEditPermission && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-amber-400" />
              <span>
                <strong>Unsaved Changes:</strong> You have modified hotel information. Click <strong>"Save Hotel Changes"</strong> to persist directly to Firestore.
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg font-bold text-xs shrink-0 cursor-pointer"
            >
              Save Now
            </button>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
            <AlertTriangle size={16} className="shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success notification */}
        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>Hotel information successfully saved to Firestore (<code>/hotels/{hotel.id}</code>).</span>
          </div>
        )}
      </div>

      {/* SECTION 1: IDENTITY & BASIC SETTINGS */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-stone-800 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Identity & Classification</h2>
              <p className="text-xs text-stone-400">Primary legal property name, slug, classification, and status</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Hotel Name EN */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Hotel Name (English) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="e.g. Swiss Flora Royal Hotel Riyadh"
              className={`w-full bg-stone-950 border ${
                validationErrors.nameEn ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
              } rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none transition-colors`}
            />
            {validationErrors.nameEn && (
              <p className="text-rose-400 text-xs mt-1">{validationErrors.nameEn}</p>
            )}
          </div>

          {/* Hotel Name AR */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 text-right" dir="rtl">
              اسم الفندق (بالعربية) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="مثال: فندق سويس فلورا رويال الرياض"
              className={`w-full bg-stone-950 border ${
                validationErrors.nameAr ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
              } rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none transition-colors text-right`}
            />
            {validationErrors.nameAr && (
              <p className="text-rose-400 text-xs mt-1 text-right" dir="rtl">{validationErrors.nameAr}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <span>Unique Slug / URL Path</span>
                {!slugEditable ? (
                  <Lock size={12} className="text-stone-500" />
                ) : (
                  <Unlock size={12} className="text-amber-400" />
                )}
              </label>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setSlugEditable(!slugEditable)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  {slugEditable ? 'Lock Slug' : 'Unlock for Super Admin'}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute start-3 top-2.5 text-stone-500 text-xs font-mono">/h/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                disabled={!slugEditable || !hasEditPermission || isSaving}
                className={`w-full bg-stone-950 border ${
                  validationErrors.slug ? 'border-rose-500' : 'border-stone-800'
                } rounded-xl ps-9 pe-4 py-2.5 text-sm font-mono text-white placeholder-stone-600 focus:outline-none ${
                  slugEditable ? 'focus:border-amber-500 bg-amber-500/5' : 'opacity-70 cursor-not-allowed'
                }`}
              />
            </div>
            {validationErrors.slug ? (
              <p className="text-rose-400 text-xs mt-1">{validationErrors.slug}</p>
            ) : (
              <p className="text-[11px] text-stone-500 mt-1">
                Guest portal direct access URL: <code className="text-stone-400">/h/{slug}</code>
              </p>
            )}
          </div>

          {/* Classification & Stars */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Hotel Classification (Stars)
            </label>
            <div className="flex items-center gap-3">
              <select
                value={stars}
                onChange={(e) => setStars(Number(e.target.value))}
                disabled={!hasEditPermission || isSaving}
                className="bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors w-full"
              >
                <option value={5}>5 Stars — Luxury Hotel & Resort</option>
                <option value={4}>4 Stars — Premium Hotel</option>
                <option value={3}>3 Stars — Standard Hotel</option>
                <option value={2}>2 Stars — Economy Hotel</option>
                <option value={1}>1 Star — Basic Hotel</option>
              </select>
            </div>
          </div>

          {/* Publication Status */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Publication Status
            </label>
            <div className="flex items-center gap-3 bg-stone-950 border border-stone-800 rounded-xl p-3">
              <input
                type="checkbox"
                id="isPublishedCheck"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={!hasEditPermission || isSaving}
                className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-900 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="isPublishedCheck" className="text-xs text-stone-300 cursor-pointer">
                <strong>Publish Property to Live Guest Portal</strong>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  When unchecked, the hotel remains an unpublished draft and is hidden from anonymous guests.
                </p>
              </label>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Operating Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
            >
              <option value="SAR">SAR — Saudi Riyal (ر.س)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="AED">AED — UAE Dirham (د.إ)</option>
              <option value="QAR">QAR — Qatari Riyal (ر.ق)</option>
              <option value="KWD">KWD — Kuwaiti Dinar (د.ك)</option>
              <option value="BHD">BHD — Bahraini Dinar (ب.د)</option>
              <option value="OMR">OMR — Omani Rial (ر.ع)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
          </div>

          {/* Languages Configuration */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Default Guest Language
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="radio"
                  name="defaultLang"
                  checked={defaultLanguage === 'en'}
                  onChange={() => setDefaultLanguage('en')}
                  disabled={!hasEditPermission || isSaving}
                  className="text-amber-500 focus:ring-amber-500"
                />
                English (Default)
              </label>
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="radio"
                  name="defaultLang"
                  checked={defaultLanguage === 'ar'}
                  onChange={() => setDefaultLanguage('ar')}
                  disabled={!hasEditPermission || isSaving}
                  className="text-amber-500 focus:ring-amber-500"
                />
                العربية (افتراضي)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Enabled Guest Languages
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabledLanguages.includes('en')}
                  onChange={() => handleToggleLanguage('en')}
                  disabled={!hasEditPermission || isSaving}
                  className="text-amber-500 rounded border-stone-700 bg-stone-900 focus:ring-amber-500"
                />
                English (EN)
              </label>
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabledLanguages.includes('ar')}
                  onChange={() => handleToggleLanguage('ar')}
                  disabled={!hasEditPermission || isSaving}
                  className="text-amber-500 rounded border-stone-700 bg-stone-900 focus:ring-amber-500"
                />
                العربية (AR)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: BILINGUAL DESCRIPTIONS & TAGLINES */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-stone-800 pb-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Globe size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Bilingual Descriptions & Taglines</h2>
            <p className="text-xs text-stone-400">Public marketing copy displayed in the guest portal and hero sections</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tagline EN */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Tagline (English)
            </label>
            <input
              type="text"
              value={taglineEn}
              onChange={(e) => setTaglineEn(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="e.g. A Haven of Refined Elegance in Riyadh"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Tagline AR */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 text-right" dir="rtl">
              الشعار التسويقي (بالعربية)
            </label>
            <input
              type="text"
              dir="rtl"
              value={taglineAr}
              onChange={(e) => setTaglineAr(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="مثال: واحة من الفخامة والضيافة الرفيعة بالرياض"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none transition-colors text-right"
            />
          </div>

          {/* Description EN */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Full Description (English)
            </label>
            <textarea
              rows={4}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="Enter comprehensive English property overview..."
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none transition-colors leading-relaxed"
            />
          </div>

          {/* Description AR */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 text-right" dir="rtl">
              الوصف الكامل للفندق (بالعربية)
            </label>
            <textarea
              rows={4}
              dir="rtl"
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="أدخل وصفاً تفصيلياً للفندق ومميزاته باللغة العربية..."
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none transition-colors leading-relaxed text-right"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: LOCATION & COORDINATES */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-stone-800 pb-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <MapPin size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Location & Coordinates</h2>
            <p className="text-xs text-stone-400">Physical address, GPS coordinates, and Google Maps integration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Country EN / AR */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Country (English)</label>
            <input
              type="text"
              value={countryEn}
              onChange={(e) => setCountryEn(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 text-right" dir="rtl">الدولة (بالعربية)</label>
            <input
              type="text"
              dir="rtl"
              value={countryAr}
              onChange={(e) => setCountryAr(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none text-right"
            />
          </div>

          {/* City EN / AR */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">City (English)</label>
            <input
              type="text"
              value={cityEn}
              onChange={(e) => setCityEn(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 text-right" dir="rtl">المدينة (بالعربية)</label>
            <input
              type="text"
              dir="rtl"
              value={cityAr}
              onChange={(e) => setCityAr(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none text-right"
            />
          </div>

          {/* Address EN / AR */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Street Address (English)</label>
            <input
              type="text"
              value={addressEn}
              onChange={(e) => setAddressEn(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="e.g. King Fahd Road, Al Olaya District"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 text-right" dir="rtl">العنوان والشارع (بالعربية)</label>
            <input
              type="text"
              dir="rtl"
              value={addressAr}
              onChange={(e) => setAddressAr(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="مثال: طريق الملك فهد، حي العليا"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none text-right"
            />
          </div>

          {/* Google Maps URL */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-300">Google Maps URL</label>
              {googleMapsUrl.trim() && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>Test Link</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://maps.google.com/?q=..."
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none"
            />
          </div>

          {/* Coordinates */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Latitude (GPS)</label>
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="e.g. 24.7136"
              className={`w-full bg-stone-950 border ${
                validationErrors.latitude ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
              } rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none`}
            />
            {validationErrors.latitude && (
              <p className="text-rose-400 text-xs mt-1">{validationErrors.latitude}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Longitude (GPS)</label>
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="e.g. 46.6753"
              className={`w-full bg-stone-950 border ${
                validationErrors.longitude ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
              } rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none`}
            />
            {validationErrors.longitude && (
              <p className="text-rose-400 text-xs mt-1">{validationErrors.longitude}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: CONTACT & COMMUNICATION */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-stone-800 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Phone size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Contact & Communication</h2>
              <p className="text-xs text-stone-400">Official contact points for guests and customer service</p>
            </div>
          </div>
        </div>

        {/* Legacy / Placeholder Alert Notice */}
        {(hasLegacyPhone || hasLegacyEmail || hasLegacyWhatsapp) && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 leading-relaxed">
              <p className="font-bold text-amber-300">Legacy Placeholder Data Detected — Review Required:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-200/90">
                {hasLegacyPhone && (
                  <li>Phone number <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-300">+966112349999</code> originated from test/mock fixtures.</li>
                )}
                {hasLegacyWhatsapp && (
                  <li>General WhatsApp <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-300">+966112349999</code> is a placeholder.</li>
                )}
                {hasLegacyEmail && (
                  <li>Email contains an example/placeholder domain.</li>
                )}
              </ul>
              <p className="mt-1.5 text-stone-400">
                Please verify and replace with the verified hotel property contacts before publishing.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Main Phone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-300">Main Hotel Phone</label>
              {hasLegacyPhone && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  Legacy Value
                </span>
              )}
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="+966 11 000 0000"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
            />
          </div>

          {/* Main Email */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-300">Official Guest Inquiries Email</label>
              {hasLegacyEmail && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  Review Email
                </span>
              )}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="guestrelations@hotel.com"
              className={`w-full bg-stone-950 border ${
                validationErrors.email ? 'border-rose-500' : 'border-stone-800 focus:border-amber-500'
              } rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none`}
            />
            {validationErrors.email && (
              <p className="text-rose-400 text-xs mt-1">{validationErrors.email}</p>
            )}
          </div>

          {/* General WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-300">General Guest Services WhatsApp</label>
              {hasLegacyWhatsapp && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  Legacy Value
                </span>
              )}
            </div>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="+966500000000"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
            />
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Official Brand Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://www.hotelwebsite.com"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: HOTEL OPERATING INFORMATION */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-stone-800 pb-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Operating Times & Timezone</h2>
            <p className="text-xs text-stone-400">Daily check-in/out policies and time synchronization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Check-in Time</label>
            <input
              type="text"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="15:00"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Check-out Time</label>
            <input
              type="text"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="12:00"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Operating Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="Asia/Riyadh"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECTION 6: GUEST WI-FI CONNECTIVITY */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-stone-800 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Wifi size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Guest Wi-Fi Connectivity</h2>
              <p className="text-xs text-stone-400">Configure in-room & public Wi-Fi network credentials displayed to guests</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Guest Wi-Fi SSID (Network Name)</label>
            <input
              type="text"
              value={wifiName}
              onChange={(e) => setWifiName(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="e.g. SwissFlora-Guest"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Wi-Fi Password / Access Instructions</label>
            <input
              type="text"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="Leave blank if open / room portal login"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 bg-stone-950 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="wifiPublicCheck"
              checked={wifiPublicEnabled}
              onChange={(e) => setWifiPublicEnabled(e.target.checked)}
              disabled={!hasEditPermission || isSaving}
              className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-900 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="wifiPublicCheck" className="text-xs text-stone-300 cursor-pointer">
              <strong>Display Wi-Fi Credentials Publicly on Stay Hub</strong>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Enable only if you want Wi-Fi access details displayed immediately to in-house guests without requiring staff contact.
              </p>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 7: OFFICIAL SOCIAL MEDIA CHANNELS */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-stone-800 pb-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Share2 size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Social Media Channels</h2>
            <p className="text-xs text-stone-400">Direct guest-facing links rendered in website footer and contact sheets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Instagram URL</label>
            <input
              type="url"
              value={socialLinks.instagram || ''}
              onChange={(e) => handleSocialChange('instagram', e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://instagram.com/hotel"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Facebook URL</label>
            <input
              type="url"
              value={socialLinks.facebook || ''}
              onChange={(e) => handleSocialChange('facebook', e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://facebook.com/hotel"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">TikTok URL</label>
            <input
              type="url"
              value={socialLinks.tiktok || ''}
              onChange={(e) => handleSocialChange('tiktok', e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://tiktok.com/@hotel"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">X (Twitter) URL</label>
            <input
              type="url"
              value={socialLinks.twitter || ''}
              onChange={(e) => handleSocialChange('twitter', e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://x.com/hotel"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">Snapchat URL</label>
            <input
              type="url"
              value={socialLinks.snapchat || ''}
              onChange={(e) => handleSocialChange('snapchat', e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://snapchat.com/add/hotel"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">LinkedIn URL</label>
            <input
              type="url"
              value={socialLinks.linkedin || ''}
              onChange={(e) => handleSocialChange('linkedin', e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://linkedin.com/company/hotel"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">YouTube URL</label>
            <input
              type="url"
              value={socialLinks.youtube || ''}
              onChange={(e) => handleSocialChange('youtube', e.target.value)}
              disabled={!hasEditPermission || isSaving}
              placeholder="https://youtube.com/@hotel"
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Sticky Save Bar if dirty */}
      {isDirty && hasEditPermission && (
        <div className="sticky bottom-6 z-30 bg-stone-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span>You have unsaved changes to <strong>{hotel.name_en}</strong>. Save to persist changes to Firestore.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isSaving || isRefreshing}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Hotel Changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
