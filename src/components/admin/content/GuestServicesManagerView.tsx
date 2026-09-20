import React, { useState, useEffect } from 'react';
import {
  BellRing,
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
  Clock,
} from 'lucide-react';
import { Hotel, HotelServiceCatalogItem } from '../../../types/hotel';
import { AdminUser, canEditHotelContent } from '../../../types/auth';
import { getGuestServices, saveGuestService, deleteGuestService } from '../../../services/hotelService';

interface GuestServicesManagerViewProps {
  hotel: Hotel;
  currentUser?: AdminUser | null;
  onMarkUnpublishedChanges?: () => void;
}

const DEPARTMENT_OPTIONS = [
  { code: 'housekeeping', labelEn: 'Housekeeping & Comfort', labelAr: 'خدمة الغرف والنظافة' },
  { code: 'maintenance', labelEn: 'Engineering & Maintenance', labelAr: 'الصيانة والدعم الفني' },
  { code: 'front_office', labelEn: 'Front Desk & Reception', labelAr: 'الاستقبال والمكتب الأمامي' },
  { code: 'concierge', labelEn: 'Concierge & Luggage', labelAr: 'الكونسيرج وحقائب النزلاء' },
  { code: 'valet', labelEn: 'Valet & Parking', labelAr: 'خدمة صف وإيقاف السيارات' },
  { code: 'laundry', labelEn: 'Valet Laundry', labelAr: 'المغسلة السريعة' },
  { code: 'dining', labelEn: 'In-Room Dining', labelAr: 'خدمة طلبات الطعام' },
  { code: 'wellness', labelEn: 'Spa & Wellness Requests', labelAr: 'طلبات السبا والصحة' },
  { code: 'other', labelEn: 'General Inquiries', labelAr: 'خدمات واستفسارات عامة' },
];

export const GuestServicesManagerView: React.FC<GuestServicesManagerViewProps> = ({
  hotel,
  currentUser,
  onMarkUnpublishedChanges,
}) => {
  const hasEditPermission = canEditHotelContent(currentUser || null, hotel.id);

  const [services, setServices] = useState<HotelServiceCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HotelServiceCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [deptCode, setDeptCode] = useState('housekeeping');
  const [slaTarget, setSlaTarget] = useState('15 mins');
  const [priceDisplay, setPriceDisplay] = useState('Complimentary');
  const [isFree, setIsFree] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [icon, setIcon] = useState('sparkles');

  const loadServices = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getGuestServices(hotel.id);
      setServices(data);
    } catch (err: any) {
      console.error('[GuestServicesManagerView] Failed to load services:', err);
      setErrorMessage('Failed to load guest services from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [hotel.id]);

  const notifySuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
    onMarkUnpublishedChanges?.();
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setTitleEn('');
    setTitleAr('');
    setDescEn('');
    setDescAr('');
    setDeptCode('housekeeping');
    setSlaTarget('15 mins');
    setPriceDisplay('Complimentary');
    setIsFree(true);
    setIsActive(true);
    setIcon('sparkles');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: HotelServiceCatalogItem) => {
    setEditingItem(item);
    setTitleEn(item.title_en || '');
    setTitleAr(item.title_ar || '');
    setDescEn(item.description_en || '');
    setDescAr(item.description_ar || '');
    setDeptCode(item.department_code || 'housekeeping');
    setSlaTarget(item.sla_target || '15 mins');
    setPriceDisplay(item.price_display || 'Complimentary');
    setIsFree(item.is_free !== false);
    setIsActive((item as any).is_active !== false);
    setIcon(item.icon || 'sparkles');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditPermission) return;
    if (!titleEn.trim() || !titleAr.trim()) {
      setErrorMessage('English and Arabic service titles are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const serviceId = editingItem ? editingItem.id : `srv-${Date.now()}`;
    const payload: HotelServiceCatalogItem = {
      id: serviceId,
      hotel_id: hotel.id,
      department_code: deptCode as any,
      title_en: titleEn.trim(),
      title_ar: titleAr.trim(),
      description_en: descEn.trim(),
      description_ar: descAr.trim(),
      icon,
      sla_target: slaTarget.trim(),
      price_display: isFree ? 'Complimentary' : priceDisplay.trim(),
      is_free: isFree,
      badge_en: isFree ? 'Free' : undefined,
      badge_ar: isFree ? 'مجاني' : undefined,
      ...( { is_active: isActive } as any ),
    };

    try {
      await saveGuestService(hotel.id, payload);
      notifySuccess(`Service "${payload.title_en}" saved to Firestore.`);
      setIsModalOpen(false);
      await loadServices();
    } catch (err: any) {
      console.error('[GuestServicesManagerView] Save failed:', err);
      setErrorMessage(err.message || 'Failed to save service to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (serviceId: string, title: string) => {
    if (!hasEditPermission) return;
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await deleteGuestService(hotel.id, serviceId);
      notifySuccess(`Service "${title}" deleted from Firestore.`);
      await loadServices();
    } catch (err: any) {
      console.error('[GuestServicesManagerView] Delete failed:', err);
      setErrorMessage('Failed to delete service.');
    }
  };

  const handleToggleActive = async (item: HotelServiceCatalogItem) => {
    if (!hasEditPermission) return;
    const currentActive = (item as any).is_active !== false;
    const updated = {
      ...item,
      is_active: !currentActive,
    };
    try {
      await saveGuestService(hotel.id, updated);
      notifySuccess(`Service "${item.title_en}" is now ${!currentActive ? 'Active' : 'Hidden'}.`);
      await loadServices();
    } catch (err) {
      console.error('[GuestServicesManagerView] Toggle failed:', err);
    }
  };

  const filteredServices = services.filter((s) => {
    if (deptFilter === 'all') return true;
    return s.department_code === deptFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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
              /hotels/{hotel.id}/guestServices
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BellRing className="text-amber-400" size={22} />
            <span>Guest Services & Housekeeping Catalog</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure in-room guest request items, amenities, SLAs, and department routing for {hotel.name_en}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadServices}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            title="Refresh services from Firestore"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          </button>

          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Guest Service</span>
            </button>
          )}
        </div>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
          <AlertTriangle size={18} className="shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Department Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setDeptFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer ${
            deptFilter === 'all'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
          }`}
        >
          All Departments ({services.length})
        </button>
        {DEPARTMENT_OPTIONS.map((dept) => {
          const count = services.filter((s) => s.department_code === dept.code).length;
          return (
            <button
              key={dept.code}
              onClick={() => setDeptFilter(dept.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                deptFilter === dept.code
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              {dept.labelEn} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-12 text-center text-stone-400 text-sm">
          <RefreshCw size={24} className="animate-spin mx-auto text-amber-400 mb-3" />
          Loading guest services from Firestore...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && services.length === 0 && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <BellRing size={40} className="mx-auto text-stone-600" />
          <h3 className="text-base font-bold text-white">No services configured yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            This property currently has zero guest services in Firestore (<code>/hotels/{hotel.id}/guestServices</code>).
            Click below to create the first in-room or housekeeping service.
          </p>
          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={15} />
              <span>Add First Service</span>
            </button>
          )}
        </div>
      )}

      {/* Services List Grid */}
      {!isLoading && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((item) => {
            const isItemActive = (item as any).is_active !== false;
            return (
              <div
                key={item.id}
                className={`bg-stone-900 border ${
                  isItemActive ? 'border-stone-800' : 'border-stone-800/40 opacity-70'
                } rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-3`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {item.department_code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isItemActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      {isItemActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{item.title_en}</h3>
                  <p className="text-xs text-stone-400 font-serif" dir="rtl">
                    {item.title_ar}
                  </p>

                  {item.description_en && (
                    <p className="text-xs text-stone-400 line-clamp-2 mt-2 leading-relaxed">
                      {item.description_en}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-3 pt-2 border-t border-stone-800/60">
                    <span className="flex items-center gap-1 text-stone-300">
                      <Clock size={11} className="text-amber-400" />
                      SLA: {item.sla_target}
                    </span>
                    <span>•</span>
                    <span className="text-stone-300">
                      {item.is_free ? 'Complimentary' : item.price_display}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {hasEditPermission && (
                  <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="text-xs text-stone-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      {isItemActive ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{isItemActive ? 'Hide' : 'Unhide'}</span>
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
                        onClick={() => handleDelete(item.id, item.title_en)}
                        className="p-1 text-stone-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete service"
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
                <BellRing size={16} className="text-amber-400" />
                <span>{editingItem ? `Edit: ${editingItem.title_en}` : 'Add New Guest Service'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Service Title (English) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. Extra Bath Towels"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">
                    عنوان الخدمة (بالعربية) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: مناشف استحمام إضافية"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Department Category
                  </label>
                  <select
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Target SLA (Response Time)
                  </label>
                  <input
                    type="text"
                    value={slaTarget}
                    onChange={(e) => setSlaTarget(e.target.value)}
                    placeholder="e.g. 15 mins"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Description (English)</label>
                <textarea
                  rows={2}
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  placeholder="Optional details or instructions..."
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
                  placeholder="تفاصيل وتعليمات إضافية..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950 focus:ring-amber-500"
                  />
                  <span>Complimentary Service</span>
                </label>

                {!isFree && (
                  <div className="flex-1">
                    <input
                      type="text"
                      value={priceDisplay}
                      onChange={(e) => setPriceDisplay(e.target.value)}
                      placeholder="e.g. SAR 50"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="srvActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="srvActiveCheck" className="text-xs text-stone-300 cursor-pointer">
                  <strong>Active & Visible in Guest Service Menu</strong>
                </label>
              </div>

              <div className="border-t border-stone-800 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save to Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
