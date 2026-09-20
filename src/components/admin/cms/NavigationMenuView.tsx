import React, { useState, useEffect } from 'react';
import {
  Menu,
  CheckCircle2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import { Hotel, HotelPortalConfig, PortalNavigationItem } from '../../../types/hotel';
import { getPublicConfig, savePublicConfig } from '../../../services/hotelService';
import { createDefaultPortalConfig, DEFAULT_NAVIGATION_ITEMS } from '../../../utils/portalConfig';

interface NavigationMenuViewProps {
  hotel: Hotel;
  onMarkUnpublishedChanges?: () => void;
}

export const NavigationMenuView: React.FC<NavigationMenuViewProps> = ({
  hotel,
  onMarkUnpublishedChanges,
}) => {
  const [items, setItems] = useState<PortalNavigationItem[]>([]);
  const [config, setConfig] = useState<HotelPortalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [labelEn, setLabelEn] = useState('');
  const [labelAr, setLabelAr] = useState('');
  const [targetSection, setTargetSection] = useState('rooms-suites');
  const [customTarget, setCustomTarget] = useState('');
  const [isTargetCustom, setIsTargetCustom] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const portal = await getPublicConfig(hotel.id);
      const activePortal = portal || createDefaultPortalConfig();
      setConfig(activePortal);

      if (activePortal.navigation_items && activePortal.navigation_items.length > 0) {
        setItems([...activePortal.navigation_items].sort((a, b) => a.order - b.order));
      } else {
        setItems(DEFAULT_NAVIGATION_ITEMS);
      }
    } catch (err: any) {
      console.error('[NavigationMenuView] Load error:', err);
      setErrorMessage('Failed to load navigation menu configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hotel.id]);

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_enabled: !item.is_enabled } : item))
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const reordered = [...items];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    const withOrder = reordered.map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(withOrder);
  };

  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setLabelEn('');
    setLabelAr('');
    setTargetSection('rooms-suites');
    setCustomTarget('');
    setIsTargetCustom(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PortalNavigationItem) => {
    setEditingItemId(item.id);
    setLabelEn(item.label_en);
    setLabelAr(item.label_ar);

    const standardTargets = [
      'hotel-offers',
      'rooms-suites',
      'dining-venues',
      'wellness-spa',
      'room-service-cafe',
      'hotel-services',
      'hotel-info',
      'contact-location',
    ];
    if (standardTargets.includes(item.target_section)) {
      setTargetSection(item.target_section);
      setIsTargetCustom(false);
    } else {
      setIsTargetCustom(true);
      setCustomTarget(item.target_section);
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!labelEn.trim()) return;
    const finalTarget = isTargetCustom ? customTarget.trim() : targetSection;

    if (editingItemId) {
      // Edit
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItemId
            ? {
                ...it,
                label_en: labelEn.trim(),
                label_ar: labelAr.trim() || labelEn.trim(),
                target_section: finalTarget,
              }
            : it
        )
      );
    } else {
      // Add
      const newItem: PortalNavigationItem = {
        id: `nav-${Date.now()}`,
        label_en: labelEn.trim(),
        label_ar: labelAr.trim() || labelEn.trim(),
        target_section: finalTarget,
        is_enabled: true,
        order: items.length + 1,
      };
      setItems((prev) => [...prev, newItem]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    if (!confirm('Are you sure you want to delete this navigation link?')) return;
    const updated = items.filter((it) => it.id !== id).map((it, idx) => ({ ...it, order: idx + 1 }));
    setItems(updated);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset navigation links to platform standard sections?')) return;
    setItems([...DEFAULT_NAVIGATION_ITEMS]);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const baseConfig = config || createDefaultPortalConfig();
      const updatedConfig: HotelPortalConfig = {
        ...baseConfig,
        navigation_items: items,
      };

      await savePublicConfig(hotel.id, updatedConfig);
      setConfig(updatedConfig);
      onMarkUnpublishedChanges?.();
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (err: any) {
      console.error('[NavigationMenuView] Save error:', err);
      setErrorMessage(err.message || 'Failed to persist navigation configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400 space-y-4">
        <RefreshCw className="animate-spin text-amber-500" size={32} />
        <p className="text-sm font-medium">Loading Navigation Menu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Navigation menu successfully persisted to Firestore (/hotels/{hotel.id}/publicConfig/portal)</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/60 p-6 rounded-2xl border border-stone-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Menu size={22} />
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">Navigation Menu Manager</h2>
          </div>
          <p className="text-xs text-stone-400">
            Customize header navigation links, order, targets, and multilingual labels for <strong>{hotel.name_en}</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-semibold border border-stone-800 transition-all cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Nav Link
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Persisting...' : 'Save Navigation'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation List */}
      <div className="bg-stone-900/40 rounded-2xl border border-stone-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Active Navigation Sequence ({items.length} Links)</h3>
            <p className="text-xs text-stone-400">
              Links will appear in the main navigation bar and drawer menu of the guest portal.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-stone-800 rounded-xl space-y-3">
            <Menu size={32} className="mx-auto text-stone-600" />
            <p className="text-sm font-semibold text-stone-300">No Navigation Links Configured</p>
            <p className="text-xs text-stone-500">Add custom navigation links or reset to standard hotel presets.</p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs cursor-pointer"
            >
              Add First Nav Link
            </button>
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  item.is_enabled
                    ? 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                    : 'bg-stone-950/30 border-stone-900 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-xs font-mono text-stone-400 font-bold">
                    {index + 1}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{item.label_en}</h4>
                      <span className="text-stone-500 text-xs">/</span>
                      <span className="text-xs text-stone-400 font-arabic">{item.label_ar}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-amber-500/80 font-mono flex items-center gap-1">
                        <LinkIcon size={10} /> #{item.target_section}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    title="Edit Link"
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-all cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    title="Move Up"
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === items.length - 1}
                    title="Move Down"
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      item.is_enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    {item.is_enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{item.is_enabled ? 'Active' : 'Disabled'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete Link"
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-rose-500/20 text-stone-500 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingItemId ? 'Edit Navigation Link' : 'Add Navigation Link'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Label (English) *</label>
                <input
                  type="text"
                  value={labelEn}
                  onChange={(e) => setLabelEn(e.target.value)}
                  placeholder="e.g. Wellness Sanctuary"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1 text-right">عنوان الرابط (بالعربية) *</label>
                <input
                  type="text"
                  dir="rtl"
                  value={labelAr}
                  onChange={(e) => setLabelAr(e.target.value)}
                  placeholder="مثال: الملاذ الصحي والسبا"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-400">Target Destination</label>
                  <button
                    type="button"
                    onClick={() => setIsTargetCustom(!isTargetCustom)}
                    className="text-[11px] text-amber-500 hover:underline cursor-pointer"
                  >
                    {isTargetCustom ? 'Select Preset Anchor' : 'Custom URL / Anchor'}
                  </button>
                </div>

                {isTargetCustom ? (
                  <input
                    type="text"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value)}
                    placeholder="e.g. custom-section-id or https://..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                ) : (
                  <select
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="hotel-offers">#hotel-offers (Exclusive Offers)</option>
                    <option value="rooms-suites">#rooms-suites (Rooms & Suites)</option>
                    <option value="dining-venues">#dining-venues (Fine Dining & Outlets)</option>
                    <option value="wellness-spa">#wellness-spa (Wellness Sanctuary)</option>
                    <option value="room-service-cafe">#room-service-cafe (In-Room Dining)</option>
                    <option value="hotel-services">#hotel-services (Guest Services & Concierge)</option>
                    <option value="hotel-info">#hotel-info (Hotel Policies & Info)</option>
                    <option value="contact-location">#contact-location (Location & Direct Contact)</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={!labelEn.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {editingItemId ? 'Update Link' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
