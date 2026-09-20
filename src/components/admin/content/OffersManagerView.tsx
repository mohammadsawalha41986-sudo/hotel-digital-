import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Hotel, HotelOffer } from '../../../types/hotel';
import { AdminUser, canEditHotelContent } from '../../../types/auth';
import { getOffers, saveOffer, deleteOffer } from '../../../services/hotelService';

interface OffersManagerViewProps {
  hotel: Hotel;
  currentUser?: AdminUser | null;
  onMarkUnpublishedChanges?: () => void;
}

export const OffersManagerView: React.FC<OffersManagerViewProps> = ({
  hotel,
  currentUser,
  onMarkUnpublishedChanges,
}) => {
  const hasEditPermission = canEditHotelContent(currentUser || null, hotel.id);

  const [offers, setOffers] = useState<HotelOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<HotelOffer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [department, setDepartment] = useState('rooms');
  const [badgeEn, setBadgeEn] = useState('Limited Offer');
  const [badgeAr, setBadgeAr] = useState('عرض محدود');
  const [imageUrl, setImageUrl] = useState('');
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(undefined);
  const [offerPrice, setOfferPrice] = useState<number | undefined>(undefined);
  const [validUntil, setValidUntil] = useState('');
  const [ctaTextEn, setCtaTextEn] = useState('Claim Privilege');
  const [ctaTextAr, setCtaTextAr] = useState('استفد من الميزة');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const loadOffers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getOffers(hotel.id);
      setOffers(data);
    } catch (err: any) {
      console.error('[OffersManagerView] Load failed:', err);
      setErrorMessage('Failed to load offers from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [hotel.id]);

  const notifySuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
    onMarkUnpublishedChanges?.();
  };

  const handleOpenAdd = () => {
    setEditingOffer(null);
    setTitleEn('');
    setTitleAr('');
    setDescEn('');
    setDescAr('');
    setDepartment('rooms');
    setBadgeEn('Special Privilege');
    setBadgeAr('ميزة خاصة');
    setImageUrl('');
    setOriginalPrice(undefined);
    setOfferPrice(undefined);
    setValidUntil('2026-12-31');
    setCtaTextEn('Claim Privilege');
    setCtaTextAr('استفد من الميزة');
    setIsFeatured(false);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (offer: HotelOffer) => {
    setEditingOffer(offer);
    setTitleEn(offer.title_en || '');
    setTitleAr(offer.title_ar || '');
    setDescEn(offer.description_en || '');
    setDescAr(offer.description_ar || '');
    setDepartment(offer.department || 'rooms');
    setBadgeEn(offer.badge_en || '');
    setBadgeAr(offer.badge_ar || '');
    setImageUrl(offer.image_url || '');
    setOriginalPrice(offer.original_price);
    setOfferPrice(offer.offer_price);
    setValidUntil(offer.valid_until || '');
    setCtaTextEn(offer.cta_text_en || 'Claim Privilege');
    setCtaTextAr(offer.cta_text_ar || 'استفد من الميزة');
    setIsFeatured(offer.is_featured === true);
    setIsActive(offer.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditPermission) return;
    if (!titleEn.trim() || !titleAr.trim()) {
      setErrorMessage('English and Arabic titles are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const offerId = editingOffer ? editingOffer.id : `offer-${Date.now()}`;
    const payload: HotelOffer = {
      id: offerId,
      hotel_id: hotel.id,
      title_en: titleEn.trim(),
      title_ar: titleAr.trim(),
      description_en: descEn.trim(),
      description_ar: descAr.trim(),
      department: department as any,
      badge_en: badgeEn.trim(),
      badge_ar: badgeAr.trim(),
      image_url: imageUrl.trim(),
      original_price: originalPrice ? Number(originalPrice) : undefined,
      offer_price: offerPrice ? Number(offerPrice) : undefined,
      currency: hotel.currency || 'SAR',
      valid_until: validUntil.trim(),
      cta_text_en: ctaTextEn.trim(),
      cta_text_ar: ctaTextAr.trim(),
      is_featured: isFeatured,
      is_active: isActive,
      sort_order: editingOffer?.sort_order || 1,
    };

    try {
      await saveOffer(hotel.id, payload);
      notifySuccess(`Offer "${payload.title_en}" saved to Firestore.`);
      setIsModalOpen(false);
      await loadOffers();
    } catch (err: any) {
      console.error('[OffersManagerView] Save failed:', err);
      setErrorMessage(err.message || 'Failed to save offer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!hasEditPermission) return;
    if (!window.confirm(`Delete offer "${title}"?`)) return;

    try {
      await deleteOffer(hotel.id, id);
      notifySuccess(`Offer "${title}" deleted.`);
      await loadOffers();
    } catch (err: any) {
      console.error('[OffersManagerView] Delete failed:', err);
      setErrorMessage('Failed to delete offer.');
    }
  };

  const handleToggleActive = async (offer: HotelOffer) => {
    if (!hasEditPermission) return;
    const currentActive = offer.is_active !== false;
    const updated = { ...offer, is_active: !currentActive };
    try {
      await saveOffer(hotel.id, updated);
      notifySuccess(`"${offer.title_en}" is now ${!currentActive ? 'Active' : 'Hidden'}.`);
      await loadOffers();
    } catch (err) {
      console.error('[OffersManagerView] Toggle failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              /hotels/{hotel.id}/offers
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="text-amber-400" size={22} />
            <span>Offers & Packages Catalog</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure seasonal promotions, suite privileges, dining discounts, and spa packages for {hotel.name_en}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOffers}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            title="Refresh offers from Firestore"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          </button>

          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus size={15} />
              <span>Add New Offer</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
          <AlertTriangle size={18} className="shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading && (
        <div className="p-12 text-center text-stone-400 text-sm">
          <RefreshCw size={24} className="animate-spin mx-auto text-amber-400 mb-3" />
          Loading offers from Firestore...
        </div>
      )}

      {!isLoading && offers.length === 0 && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <Tag size={40} className="mx-auto text-stone-600" />
          <h3 className="text-base font-bold text-white">No promotional offers configured yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            This property currently has zero promotional packages in Firestore (<code>/hotels/{hotel.id}/offers</code>). Click below to create your first guest privilege or holiday offer.
          </p>
          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={15} />
              <span>Add First Offer</span>
            </button>
          )}
        </div>
      )}

      {!isLoading && offers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {offers.map((offer) => {
            const isOnline = offer.is_active !== false;
            return (
              <div
                key={offer.id}
                className={`bg-stone-900 border ${
                  isOnline ? 'border-stone-800' : 'border-stone-800/40 opacity-70'
                } rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between`}
              >
                {/* Image */}
                <div className="relative h-40 bg-stone-950">
                  {offer.image_url ? (
                    <img
                      src={offer.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-600">
                      <Tag size={32} />
                    </div>
                  )}

                  {offer.badge_en && (
                    <span className="absolute top-3 start-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 shadow">
                      {offer.badge_en}
                    </span>
                  )}

                  <span
                    className={`absolute top-3 end-3 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isOnline
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}
                  >
                    {isOnline ? 'Active' : 'Hidden'}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{offer.title_en}</h3>
                    <p className="text-xs text-stone-400 font-serif" dir="rtl">{offer.title_ar}</p>

                    {offer.description_en && (
                      <p className="text-xs text-stone-400 line-clamp-2 mt-2 leading-relaxed">
                        {offer.description_en}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-800 text-xs">
                      <div className="flex items-center gap-1.5 text-stone-400 text-[11px]">
                        <Calendar size={12} className="text-amber-400" />
                        <span>Valid: {offer.valid_until || 'Ongoing'}</span>
                      </div>
                      {offer.offer_price && (
                        <span className="font-bold text-amber-400">
                          {offer.offer_price} {hotel.currency || 'SAR'}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasEditPermission && (
                    <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleActive(offer)}
                        className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {isOnline ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{isOnline ? 'Hide' : 'Unhide'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(offer)}
                          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(offer.id, offer.title_en)}
                          className="p-1 text-stone-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag size={16} className="text-amber-400" />
                <span>{editingOffer ? `Edit: ${editingOffer.title_en}` : 'Add New Offer / Package'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Title (EN) *</label>
                  <input
                    type="text"
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. Royal Weekend Escape"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">عنوان العرض (بالعربية) *</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: باقة عطلة نهاية الأسبوع الملكية"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="rooms">Rooms & Suites</option>
                    <option value="restaurant">Dining & Restaurants</option>
                    <option value="health_club">Spa & Health Club</option>
                    <option value="seasonal">Seasonal & Holidays</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Badge Text (EN)</label>
                  <input
                    type="text"
                    value={badgeEn}
                    onChange={(e) => setBadgeEn(e.target.value)}
                    placeholder="e.g. 25% Off"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Original Price ({hotel.currency || 'SAR'})</label>
                  <input
                    type="number"
                    value={originalPrice || ''}
                    onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="1200"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Offer Price ({hotel.currency || 'SAR'})</label>
                  <input
                    type="number"
                    value={offerPrice || ''}
                    onChange={(e) => setOfferPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="900"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Valid Until Date</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">CTA Button Text (EN)</label>
                  <input
                    type="text"
                    value={ctaTextEn}
                    onChange={(e) => setCtaTextEn(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Image URL (HTTPS)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Description (English)</label>
                <textarea
                  rows={2}
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">الوصف والشروط (بالعربية)</label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={descAr}
                  onChange={(e) => setDescAr(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950"
                  />
                  <span>Feature on Hero / Highlights</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950"
                  />
                  <span>Active & Discoverable</span>
                </label>
              </div>

              <div className="border-t border-stone-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-xs text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                >
                  {isSaving ? 'Saving...' : 'Save to Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
