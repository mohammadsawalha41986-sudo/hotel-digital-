import React, { useState, useEffect } from 'react';
import {
  Shirt,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Hotel } from '../../../types/hotel';
import { AdminUser, canEditHotelContent } from '../../../types/auth';
import { getLaundry, saveLaundry, deleteLaundry } from '../../../services/hotelService';

interface LaundryManagerViewProps {
  hotel: Hotel;
  currentUser?: AdminUser | null;
  onMarkUnpublishedChanges?: () => void;
}

const LAUNDRY_CATEGORIES = [
  { id: 'gentlemen', labelEn: "Gentlemen's Wear", labelAr: 'ملابس رجالية' },
  { id: 'ladies', labelEn: "Ladies' Wear", labelAr: 'ملابس نسائية' },
  { id: 'traditional', labelEn: 'Traditional (Thobes & Abayas)', labelAr: 'أثواب وعبايات تراثية' },
  { id: 'dry_cleaning', labelEn: 'Suits & Dry Cleaning', labelAr: 'بدل وغسيل جاف' },
  { id: 'delicates', labelEn: 'Delicates & Special Care', labelAr: 'أقمشة حساسة وعناية خاصة' },
];

export const LaundryManagerView: React.FC<LaundryManagerViewProps> = ({
  hotel,
  currentUser,
  onMarkUnpublishedChanges,
}) => {
  const hasEditPermission = canEditHotelContent(currentUser || null, hotel.id);

  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState('gentlemen');
  const [washPrice, setWashPrice] = useState(25);
  const [pressPrice, setPressPrice] = useState(15);
  const [dryCleanPrice, setDryCleanPrice] = useState(40);
  const [turnaround, setTurnaround] = useState('24 Hours');
  const [expressEligible, setExpressEligible] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const loadLaundry = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getLaundry(hotel.id);
      setItems(data);
    } catch (err: any) {
      console.error('[LaundryManagerView] Load failed:', err);
      setErrorMessage('Failed to load laundry catalog from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLaundry();
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
    setCategory('gentlemen');
    setWashPrice(25);
    setPressPrice(15);
    setDryCleanPrice(40);
    setTurnaround('24 Hours');
    setExpressEligible(true);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setNameEn(item.name_en || item.nameEn || '');
    setNameAr(item.name_ar || item.nameAr || '');
    setCategory(item.category || 'gentlemen');
    setWashPrice(item.wash_price ?? item.price ?? 25);
    setPressPrice(item.press_price ?? 15);
    setDryCleanPrice(item.dry_clean_price ?? 40);
    setTurnaround(item.turnaround || '24 Hours');
    setExpressEligible(item.express_eligible !== false);
    setIsActive(item.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditPermission) return;
    if (!nameEn.trim() || !nameAr.trim()) {
      setErrorMessage('English and Arabic item names are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const itemId = editingItem ? editingItem.id : `laundry-${Date.now()}`;
    const payload = {
      id: itemId,
      hotel_id: hotel.id,
      name_en: nameEn.trim(),
      name_ar: nameAr.trim(),
      category,
      wash_price: Number(washPrice) || 0,
      press_price: Number(pressPrice) || 0,
      dry_clean_price: Number(dryCleanPrice) || 0,
      price: Number(washPrice) || 0,
      currency: hotel.currency || 'SAR',
      turnaround: turnaround.trim(),
      express_eligible: expressEligible,
      is_active: isActive,
    };

    try {
      await saveLaundry(hotel.id, payload);
      notifySuccess(`Laundry item "${payload.name_en}" saved to Firestore.`);
      setIsModalOpen(false);
      await loadLaundry();
    } catch (err: any) {
      console.error('[LaundryManagerView] Save failed:', err);
      setErrorMessage(err.message || 'Failed to save laundry item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId: string, name: string) => {
    if (!hasEditPermission) return;
    if (!window.confirm(`Delete laundry item "${name}"?`)) return;

    try {
      await deleteLaundry(hotel.id, itemId);
      notifySuccess(`Item "${name}" deleted.`);
      await loadLaundry();
    } catch (err: any) {
      console.error('[LaundryManagerView] Delete failed:', err);
      setErrorMessage('Failed to delete item.');
    }
  };

  const handleToggleActive = async (item: any) => {
    if (!hasEditPermission) return;
    const currentActive = item.is_active !== false;
    const updated = { ...item, is_active: !currentActive };
    try {
      await saveLaundry(hotel.id, updated);
      notifySuccess(`"${item.name_en}" is now ${!currentActive ? 'Active' : 'Hidden'}.`);
      await loadLaundry();
    } catch (err) {
      console.error('[LaundryManagerView] Toggle failed:', err);
    }
  };

  const filteredItems = items.filter((i) => {
    if (selectedCat === 'all') return true;
    return i.category === selectedCat;
  });

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
              /hotels/{hotel.id}/laundry
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shirt className="text-amber-400" size={22} />
            <span>Valet Laundry & Dry Cleaning Catalog</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure garments, wash/press pricing, dry cleaning, and turnaround times for {hotel.name_en}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLaundry}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            title="Refresh laundry from Firestore"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          </button>

          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Laundry Item</span>
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

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCat('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer ${
            selectedCat === 'all'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
          }`}
        >
          All Items ({items.length})
        </button>
        {LAUNDRY_CATEGORIES.map((c) => {
          const count = items.filter((i) => i.category === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                selectedCat === c.id
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              {c.labelEn} ({count})
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="p-12 text-center text-stone-400 text-sm">
          <RefreshCw size={24} className="animate-spin mx-auto text-amber-400 mb-3" />
          Loading laundry price list from Firestore...
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <Shirt size={40} className="mx-auto text-stone-600" />
          <h3 className="text-base font-bold text-white">No laundry items configured yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            This property currently has zero laundry price list items in Firestore (<code>/hotels/{hotel.id}/laundry</code>). Click below to create your first garment or dry cleaning item.
          </p>
          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={15} />
              <span>Add First Garment</span>
            </button>
          )}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isOnline = item.is_active !== false;
            return (
              <div
                key={item.id}
                className={`bg-stone-900 border ${
                  isOnline ? 'border-stone-800' : 'border-stone-800/40 opacity-70'
                } rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-3`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {item.category || 'Garment'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.express_eligible && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Zap size={10} />
                          Express
                        </span>
                      )}
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
                  </div>

                  <h3 className="text-sm font-bold text-white">{item.name_en}</h3>
                  <p className="text-xs text-stone-400 font-serif" dir="rtl">{item.name_ar}</p>

                  {/* Price breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 pt-3 border-t border-stone-800">
                    <div className="bg-stone-950 p-1.5 rounded-lg border border-stone-850">
                      <span className="text-[10px] text-stone-500 block">Wash & Press</span>
                      <span className="font-bold text-amber-400">{item.wash_price || item.price || 0} {hotel.currency || 'SAR'}</span>
                    </div>
                    <div className="bg-stone-950 p-1.5 rounded-lg border border-stone-850">
                      <span className="text-[10px] text-stone-500 block">Press Only</span>
                      <span className="font-bold text-stone-300">{item.press_price || 0} {hotel.currency || 'SAR'}</span>
                    </div>
                    <div className="bg-stone-950 p-1.5 rounded-lg border border-stone-850">
                      <span className="text-[10px] text-stone-500 block">Dry Clean</span>
                      <span className="font-bold text-stone-300">{item.dry_clean_price || 0} {hotel.currency || 'SAR'}</span>
                    </div>
                  </div>
                </div>

                {hasEditPermission && (
                  <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {isOnline ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{isOnline ? 'Hide' : 'Unhide'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name_en)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shirt size={16} className="text-amber-400" />
                <span>{editingItem ? `Edit: ${editingItem.name_en}` : 'Add New Laundry Item'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Item Name (EN) *</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Formal Shirt"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">اسم الصنف (بالعربية) *</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: قميص رسمي"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {LAUNDRY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Turnaround SLA</label>
                  <input
                    type="text"
                    value={turnaround}
                    onChange={(e) => setTurnaround(e.target.value)}
                    placeholder="24 Hours"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Wash & Press ({hotel.currency || 'SAR'})</label>
                  <input
                    type="number"
                    min={0}
                    value={washPrice}
                    onChange={(e) => setWashPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Press Only ({hotel.currency || 'SAR'})</label>
                  <input
                    type="number"
                    min={0}
                    value={pressPrice}
                    onChange={(e) => setPressPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Dry Clean ({hotel.currency || 'SAR'})</label>
                  <input
                    type="number"
                    min={0}
                    value={dryCleanPrice}
                    onChange={(e) => setDryCleanPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="expCheck"
                    checked={expressEligible}
                    onChange={(e) => setExpressEligible(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950"
                  />
                  <label htmlFor="expCheck" className="text-xs text-stone-300">
                    Express 4h Eligible
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="ldyActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950"
                />
                <label htmlFor="ldyActiveCheck" className="text-xs text-stone-300 cursor-pointer">
                  Active in Valet Laundry Menu
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
