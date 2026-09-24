import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Hotel } from '../../../types/hotel';
import { WellnessService } from '../../../types/department';
import { AdminUser, canEditHotelContent } from '../../../types/auth';
import { getWellness, saveWellness, deleteWellness } from '../../../services/hotelService';

interface WellnessManagerViewProps {
  hotel: Hotel;
  currentUser?: AdminUser | null;
  onMarkUnpublishedChanges?: () => void;
}

export const WellnessManagerView: React.FC<WellnessManagerViewProps> = ({
  hotel,
  currentUser,
  onMarkUnpublishedChanges,
}) => {
  const hasEditPermission = canEditHotelContent(currentUser || null, hotel.id);

  const [facilities, setFacilities] = useState<WellnessService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WellnessService | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [facilityType, setFacilityType] = useState('spa');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [hoursEn, setHoursEn] = useState('09:00 AM - 10:00 PM');
  const [hoursAr, setHoursAr] = useState('09:00 ص - 10:00 م');
  const [heroImage, setHeroImage] = useState('');
  const [durationMins, setDurationMins] = useState(60);
  const [price, setPrice] = useState(350);
  const [isActive, setIsActive] = useState(true);

  const loadFacilities = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getWellness(hotel.id);
      setFacilities(data);
    } catch (err: any) {
      console.error('[WellnessManagerView] Load failed:', err);
      setErrorMessage('Failed to load wellness facilities from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, [hotel.id]);

  const notifySuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
    onMarkUnpublishedChanges?.();
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNameEn('');
    setNameAr('');
    setFacilityType('spa');
    setDescEn('');
    setDescAr('');
    setHoursEn('09:00 AM - 10:00 PM');
    setHoursAr('09:00 ص - 10:00 م');
    setHeroImage('');
    setDurationMins(60);
    setPrice(350);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: WellnessService) => {
    setEditingItem(item);
    setNameEn(item.name_en || '');
    setNameAr(item.name_ar || '');
    setFacilityType(item.service_type || 'spa');
    setDescEn(item.full_description_en || item.short_description_en || '');
    setDescAr(item.full_description_ar || item.short_description_ar || '');
    setHoursEn(item.operating_info?.opening_hours_en || '');
    setHoursAr(item.operating_info?.opening_hours_ar || '');
    setHeroImage(item.hero_image || '');
    setDurationMins(item.duration_minutes || 60);
    setPrice(item.price || 0);
    setIsActive(item.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditPermission) return;
    if (!nameEn.trim() || !nameAr.trim()) {
      setErrorMessage('English and Arabic facility names are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const facilityId = editingItem ? editingItem.id : `wellness-${Date.now()}`;
    const payload: WellnessService = {
      id: facilityId,
      hotel_id: hotel.id,
      service_code: facilityId,
      slug: facilityId,
      service_type: facilityType as WellnessService['service_type'],
      name_en: nameEn.trim(),
      name_ar: nameAr.trim(),
      short_description_en: descEn.trim(),
      short_description_ar: descAr.trim(),
      full_description_en: descEn.trim(),
      full_description_ar: descAr.trim(),
      hero_image: heroImage.trim(),
      gallery: editingItem?.gallery || [],
      location: editingItem?.location || {
        building_en: '', building_ar: '', floor_en: '', floor_ar: '',
        internal_text_en: '', internal_text_ar: '',
      },
      operating_info: {
        opening_hours_en: hoursEn.trim(),
        opening_hours_ar: hoursAr.trim(),
        periods: editingItem?.operating_info?.periods || [],
      },
      contact: editingItem?.contact || {
        phone: '', extension: '', whatsapp_number: '', whatsapp_enabled: false,
        default_message_en: '', default_message_ar: '',
      },
      duration_minutes: Number(durationMins) || 60,
      price: Number(price) || 0,
      currency: hotel.currency || 'SAR',
      availability_en: hoursEn.trim(),
      availability_ar: hoursAr.trim(),
      is_active: isActive,
      booking_enabled: true,
      audience: editingItem?.audience || 'BOTH',
      sort_order: editingItem?.sort_order || 1,
    };

    try {
      await saveWellness(hotel.id, payload);
      notifySuccess(`Facility "${payload.name_en}" saved to Firestore.`);
      setIsModalOpen(false);
      await loadFacilities();
    } catch (err: any) {
      console.error('[WellnessManagerView] Save failed:', err);
      setErrorMessage(err.message || 'Failed to save wellness facility.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!hasEditPermission) return;
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteWellness(hotel.id, id);
      notifySuccess(`Facility "${name}" deleted.`);
      await loadFacilities();
    } catch (err: any) {
      console.error('[WellnessManagerView] Delete failed:', err);
      setErrorMessage('Failed to delete wellness facility.');
    }
  };

  const handleToggleActive = async (item: WellnessService) => {
    if (!hasEditPermission) return;
    const currentActive = item.is_active !== false;
    const updated = { ...item, is_active: !currentActive };
    try {
      await saveWellness(hotel.id, updated);
      notifySuccess(`"${item.name_en}" is now ${!currentActive ? 'Active' : 'Hidden'}.`);
      await loadFacilities();
    } catch (err) {
      console.error('[WellnessManagerView] Toggle failed:', err);
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
              /hotels/{hotel.id}/wellness
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-amber-400" size={22} />
            <span>Wellness, Spa & Recreation</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure spa treatments, massage packages, fitness facilities, and appointments for {hotel.name_en}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadFacilities}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            title="Refresh wellness from Firestore"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          </button>

          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Facility / Treatment</span>
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
          Loading wellness catalog from Firestore...
        </div>
      )}

      {!isLoading && facilities.length === 0 && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <Sparkles size={40} className="mx-auto text-stone-600" />
          <h3 className="text-base font-bold text-white">No wellness facilities configured yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            This property currently has zero wellness facilities in Firestore (<code>/hotels/{hotel.id}/wellness</code>). Click below to create a luxury spa, massage suite, or gym.
          </p>
          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={15} />
              <span>Add First Facility</span>
            </button>
          )}
        </div>
      )}

      {!isLoading && facilities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((fac) => {
            const isOnline = fac.is_active !== false;
            return (
              <div
                key={fac.id}
                className={`bg-stone-900 border ${
                  isOnline ? 'border-stone-800' : 'border-stone-800/40 opacity-70'
                } rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {fac.service_type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isOnline
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      {isOnline ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{fac.name_en}</h3>
                  <p className="text-xs text-stone-400 font-serif" dir="rtl">{fac.name_ar}</p>

                  {fac.short_description_en && (
                    <p className="text-xs text-stone-400 line-clamp-2 mt-2">{fac.short_description_en}</p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-stone-400 mt-3 pt-2 border-t border-stone-800">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-amber-400" />
                      {fac.duration_minutes} Mins
                    </span>
                    <span className="font-bold text-amber-400">
                      {fac.price > 0 ? `${fac.price} ${hotel.currency || 'SAR'}` : 'Complimentary'}
                    </span>
                  </div>
                </div>

                {hasEditPermission && (
                  <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleActive(fac)}
                      className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {isOnline ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{isOnline ? 'Hide' : 'Unhide'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(fac)}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(fac.id, fac.name_en)}
                        className="p-1 text-stone-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span>{editingItem ? `Edit: ${editingItem.name_en}` : 'Add Wellness Facility / Treatment'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Royal Moroccan Hammam"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">الاسم (بالعربية) *</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: الحمام المغربي الملكي"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Facility / Service Type</label>
                  <select
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="spa">Luxury Spa Treatment</option>
                    <option value="massage">Massage Therapy</option>
                    <option value="gym">Fitness & Gym Club</option>
                    <option value="pool">Swimming Pool</option>
                    <option value="sauna">Sauna & Steam Room</option>
                    <option value="jacuzzi">Hydrotherapy Jacuzzi</option>
                    <option value="manicure">Beauty, Nails & Care</option>
                    <option value="other">Other Wellness Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Price ({hotel.currency || 'SAR'})</label>
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={hoursEn}
                    onChange={(e) => setHoursEn(e.target.value)}
                    placeholder="09:00 AM - 10:00 PM"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Hero Image URL (HTTPS)</label>
                <input
                  type="url"
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
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
                <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">الوصف (بالعربية)</label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={descAr}
                  onChange={(e) => setDescAr(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="wellActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950"
                />
                <label htmlFor="wellActiveCheck" className="text-xs text-stone-300 cursor-pointer">
                  Active & Visible in Wellness Hub
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
