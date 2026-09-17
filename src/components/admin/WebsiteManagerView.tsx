import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';

export interface SectionConfigItem {
  id: string;
  name_en: string;
  name_ar: string;
  type: 'core' | 'custom';
  status: 'VISIBLE' | 'HIDDEN' | 'DRAFT' | 'ARCHIVED';
  is_enabled: boolean;
  order: number;
  description_en?: string;
  audience?: 'ALL' | 'IN_HOUSE' | 'EXTERNAL';
}

const DEFAULT_CORE_SECTIONS: SectionConfigItem[] = [
  { id: 'hero', name_en: 'Hero Banner & Direct Actions', name_ar: 'الواجهة الرئيسية والإجراءات السريعة', type: 'core', status: 'VISIBLE', is_enabled: true, order: 1, audience: 'ALL' },
  { id: 'offers', name_en: 'Current Privileges & Offers', name_ar: 'العروض الحصرية والمزايا', type: 'core', status: 'VISIBLE', is_enabled: true, order: 2, audience: 'ALL' },
  { id: 'about', name_en: 'About The Hotel', name_ar: 'نبذة عن الفندق', type: 'core', status: 'VISIBLE', is_enabled: true, order: 3, audience: 'ALL' },
  { id: 'facilities', name_en: 'Hotel Facilities & Amenities', name_ar: 'المرافق والتسهيلات الفندقية', type: 'core', status: 'VISIBLE', is_enabled: true, order: 4, audience: 'ALL' },
  { id: 'gallery', name_en: 'Hotel Architectural Gallery', name_ar: 'معرض الصور المعماري', type: 'core', status: 'VISIBLE', is_enabled: true, order: 5, audience: 'ALL' },
  { id: 'rooms', name_en: 'Rooms & Suites Showcase', name_ar: 'أجنحة وغرف الفندق الملكية', type: 'core', status: 'VISIBLE', is_enabled: true, order: 6, audience: 'ALL' },
  { id: 'departments', name_en: 'Explore Hotel Departments', name_ar: 'استكشاف قطاعات وخدمات الفندق', type: 'core', status: 'VISIBLE', is_enabled: true, order: 7, audience: 'ALL' },
  { id: 'info', name_en: 'Guest Information & Policies', name_ar: 'معلومات النزيل والسياسات', type: 'core', status: 'VISIBLE', is_enabled: true, order: 8, audience: 'ALL' },
  { id: 'contact', name_en: 'Location, Contact & Valet', name_ar: 'الموقع والتواصل واستقبال السيارات', type: 'core', status: 'VISIBLE', is_enabled: true, order: 9, audience: 'ALL' },
];

interface WebsiteManagerViewProps {
  hotel: Hotel;
  onUpdateHotel: (updated: Hotel) => void;
  onMarkUnpublishedChanges: () => void;
}

export const WebsiteManagerView: React.FC<WebsiteManagerViewProps> = ({
  hotel,
  onUpdateHotel: _onUpdateHotel,
  onMarkUnpublishedChanges,
}) => {
  const [sections, setSections] = useState<SectionConfigItem[]>(DEFAULT_CORE_SECTIONS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customNameEn, setCustomNameEn] = useState('');
  const [customNameAr, setCustomNameAr] = useState('');
  const [customDescEn, setCustomDescEn] = useState('');
  const [customAudience, setCustomAudience] = useState<'ALL' | 'IN_HOUSE' | 'EXTERNAL'>('ALL');
  const [saveToast, setSaveToast] = useState(false);

  const handleToggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextEnabled = !s.is_enabled;
          return {
            ...s,
            is_enabled: nextEnabled,
            status: nextEnabled ? 'VISIBLE' : 'HIDDEN',
          };
        }
        return s;
      })
    );
    onMarkUnpublishedChanges();
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // re-assign order property
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setSections(reordered);
    onMarkUnpublishedChanges();
  };

  const handleAddCustomSection = () => {
    if (!customNameEn.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newSec: SectionConfigItem = {
      id: newId,
      name_en: customNameEn.trim(),
      name_ar: customNameAr.trim() || customNameEn.trim(),
      description_en: customDescEn.trim(),
      type: 'custom',
      status: 'VISIBLE',
      is_enabled: true,
      order: sections.length + 1,
      audience: customAudience,
    };
    setSections([...sections, newSec]);
    setIsAddModalOpen(false);
    setCustomNameEn('');
    setCustomNameAr('');
    setCustomDescEn('');
    onMarkUnpublishedChanges();
  };

  const handleDeleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    onMarkUnpublishedChanges();
  };

  const handleSaveSections = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
    onMarkUnpublishedChanges();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Section layout and visibility saved to drafts</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="text-amber-400" size={20} />
            <span>Website Manager & Homepage Section Architecture</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Control the exact order, visibility state, and audience access of all sections for {hotel.name_en}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Custom Section</span>
          </button>
          <button
            onClick={handleSaveSections}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
          >
            <Save size={13} />
            <span>Save Order</span>
          </button>
        </div>
      </div>

      {/* Sections Table & Reorder Board */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            Homepage Section Hierarchy ({sections.length} Sections)
          </div>
          <span className="text-[11px] text-stone-400">
            Use arrows to reorder • Toggle eye to show/hide
          </span>
        </div>

        <div className="divide-y divide-stone-800/80">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                sec.is_enabled ? 'hover:bg-stone-850/50' : 'bg-stone-950/40 opacity-60'
              }`}
            >
              {/* Order index + Section Name */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-center font-mono text-xs font-bold text-amber-400">
                  {idx + 1}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{sec.name_en}</span>
                    {sec.type === 'custom' && (
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                        Custom
                      </span>
                    )}
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        sec.status === 'VISIBLE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-stone-800 text-stone-400 border border-stone-700'
                      }`}
                    >
                      {sec.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5" dir="rtl">
                    <span>{sec.name_ar}</span>
                  </div>
                </div>
              </div>

              {/* Controls: Move up/down, Show/Hide, Delete (if custom) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Reorder Arrows */}
                <button
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, 'up')}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 transition-colors cursor-pointer"
                  title="Move section up"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  disabled={idx === sections.length - 1}
                  onClick={() => handleMove(idx, 'down')}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 transition-colors cursor-pointer"
                  title="Move section down"
                >
                  <ArrowDown size={13} />
                </button>

                {/* Visibility Toggle */}
                <button
                  onClick={() => handleToggleSection(sec.id)}
                  className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                    sec.is_enabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                      : 'bg-stone-800 border-stone-700 text-stone-500 hover:text-stone-300'
                  }`}
                  title={sec.is_enabled ? 'Section is visible on guest portal' : 'Section is hidden'}
                >
                  {sec.is_enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                {/* Custom Section Delete */}
                {sec.type === 'custom' && (
                  <button
                    onClick={() => handleDeleteSection(sec.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    title="Delete custom section"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Section Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-5 text-stone-200 text-xs space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus size={16} className="text-amber-400" />
              <span>Create Custom Hotel Section</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1 font-semibold">
                  Section Title (English) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Royal Kids Club & Nursery"
                  value={customNameEn}
                  onChange={(e) => setCustomNameEn(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-400 mb-1 font-semibold text-end" dir="rtl">
                  عنوان القسم (بالعربية) *
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: نادي الأطفال الملكي والحضانة"
                  value={customNameAr}
                  onChange={(e) => setCustomNameAr(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-end"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-400 mb-1 font-semibold">
                  Brief Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter guest-facing highlight summary..."
                  value={customDescEn}
                  onChange={(e) => setCustomDescEn(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-400 mb-1 font-semibold">
                  Target Audience
                </label>
                <select
                  value={customAudience}
                  onChange={(e) => setCustomAudience(e.target.value as any)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 focus:outline-none"
                >
                  <option value="ALL">All Visitors & Guests</option>
                  <option value="IN_HOUSE">In-House Guests Only (Room QR)</option>
                  <option value="EXTERNAL">External Visitors Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomSection}
                disabled={!customNameEn.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold rounded-xl cursor-pointer"
              >
                Create Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
