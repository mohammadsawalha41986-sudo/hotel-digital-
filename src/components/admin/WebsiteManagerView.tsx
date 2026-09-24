import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Hotel, HotelPortalConfig } from '../../types/hotel';
import { getPublicConfig, savePublicConfig } from '../../services/hotelService';
import { createDefaultPortalConfig } from '../../utils/portalConfig';

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
  onUpdateHotel?: (updated: Hotel) => void;
  onMarkUnpublishedChanges?: () => void;
}

export const WebsiteManagerView: React.FC<WebsiteManagerViewProps> = ({
  hotel,
  onMarkUnpublishedChanges,
}) => {
  const [sections, setSections] = useState<SectionConfigItem[]>(DEFAULT_CORE_SECTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add Custom Section Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customNameEn, setCustomNameEn] = useState('');
  const [customNameAr, setCustomNameAr] = useState('');
  const [customDescEn, setCustomDescEn] = useState('');
  const [customAudience, setCustomAudience] = useState<'ALL' | 'IN_HOUSE' | 'EXTERNAL'>('ALL');

  const loadConfig = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const config = await getPublicConfig(hotel.id);
      if (config && Array.isArray((config as any).architecture_sections) && (config as any).architecture_sections.length > 0) {
        setSections((config as any).architecture_sections);
      } else if (config && Array.isArray(config.sections) && config.sections.length > 0) {
        const mapped: SectionConfigItem[] = config.sections.map((s, idx) => ({
          id: s.id || s.code,
          name_en: s.title_en,
          name_ar: s.title_ar,
          type: 'core',
          status: s.is_enabled ? 'VISIBLE' : 'HIDDEN',
          is_enabled: s.is_enabled,
          order: s.order || idx + 1,
          audience: 'ALL',
        }));
        setSections(mapped);
      } else {
        setSections(DEFAULT_CORE_SECTIONS);
      }
    } catch (err: any) {
      console.error('[WebsiteManagerView] Load error:', err);
      setErrorMessage('Failed to load website configuration from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [hotel.id]);

  const handleToggleSection = async (id: string) => {
    const updated = sections.map((s) => {
      if (s.id === id) {
        const nextEnabled = !s.is_enabled;
        return {
          ...s,
          is_enabled: nextEnabled,
          status: (nextEnabled ? 'VISIBLE' : 'HIDDEN') as SectionConfigItem['status'],
        };
      }
      return s;
    });
    setSections(updated);
    await persistToFirestore(updated);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setSections(reordered);
    await persistToFirestore(reordered);
  };

  const handleAddCustomSection = async () => {
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
    const updated = [...sections, newSec];
    setSections(updated);
    setIsAddModalOpen(false);
    setCustomNameEn('');
    setCustomNameAr('');
    setCustomDescEn('');
    await persistToFirestore(updated);
  };

  const handleDeleteSection = async (id: string) => {
    const updated = sections.filter((s) => s.id !== id);
    setSections(updated);
    await persistToFirestore(updated);
  };

  const persistToFirestore = async (newSections: SectionConfigItem[]) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const currentConfig = (await getPublicConfig(hotel.id)) || createDefaultPortalConfig();
      const updatedConfig: HotelPortalConfig = {
        ...currentConfig,
        sections: newSections.map((s) => ({
          id: s.id,
          code: (s.id as any),
          title_en: s.name_en,
          title_ar: s.name_ar,
          is_enabled: s.is_enabled,
          order: s.order,
        })),
        ...( { architecture_sections: newSections } as any ),
      };

      await savePublicConfig(hotel.id, updatedConfig);
      onMarkUnpublishedChanges?.();
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (err: any) {
      console.error('[WebsiteManagerView] Persist failed:', err);
      setErrorMessage(err.message || 'Failed to persist website architecture to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Section architecture saved to Firestore (/hotels/{hotel.id}/publicConfig/portal)</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              /hotels/{hotel.id}/publicConfig/portal
            </span>
          </div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="text-amber-400" size={20} />
            <span>Website Manager & Homepage Section Architecture</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Control the layout order, visibility state, and audience access of all homepage sections for {hotel.name_en}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadConfig}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs cursor-pointer"
            title="Refresh from Firestore"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Custom Section</span>
          </button>
          <button
            onClick={() => persistToFirestore(sections)}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700 disabled:opacity-50"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Order'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
          <AlertTriangle size={18} className="shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

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

        <div className="divide-y divide-stone-800">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`p-4 flex items-center justify-between transition-colors ${
                section.is_enabled ? 'bg-stone-900/40 hover:bg-stone-850/60' : 'bg-stone-950/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center font-mono text-xs font-bold text-stone-400">
                  {section.order}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{section.name_en}</span>
                    <span className="text-xs text-stone-400 font-serif" dir="rtl">{section.name_ar}</span>
                    {section.type === 'custom' && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-400 mt-0.5 block">
                    Audience: {section.audience || 'ALL'} • Status: {section.is_enabled ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Reorder Buttons */}
                <button
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Move Up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === sections.length - 1}
                  className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Move Down"
                >
                  <ArrowDown size={14} />
                </button>

                {/* Show/Hide Toggle */}
                <button
                  onClick={() => handleToggleSection(section.id)}
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    section.is_enabled
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                  }`}
                  title={section.is_enabled ? 'Hide Section' : 'Show Section'}
                >
                  {section.is_enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                {/* Delete if custom */}
                {section.type === 'custom' && (
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-500 hover:text-rose-400 cursor-pointer"
                    title="Delete Custom Section"
                  >
                    <Trash2 size={14} />
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
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <h2 className="text-sm font-bold text-white">Add Custom Homepage Section</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-white">
                <Trash2 size={14} className="rotate-45" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Section Title (EN) *</label>
                <input
                  type="text"
                  value={customNameEn}
                  onChange={(e) => setCustomNameEn(e.target.value)}
                  placeholder="e.g. Executive Cigar Lounge"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">عنوان القسم (بالعربية)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={customNameAr}
                  onChange={(e) => setCustomNameAr(e.target.value)}
                  placeholder="مثال: صالة السيجار التنفيذية"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Audience</label>
                <select
                  value={customAudience}
                  onChange={(e) => setCustomAudience(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="ALL">All Guests (Public & In-House)</option>
                  <option value="IN_HOUSE">In-House Guests Only</option>
                  <option value="EXTERNAL">External / Day Visitors Only</option>
                </select>
              </div>
              <div className="border-t border-stone-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-xs text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomSection}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                >
                  Add Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
