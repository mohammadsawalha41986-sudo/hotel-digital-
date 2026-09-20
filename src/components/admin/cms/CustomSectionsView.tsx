import React, { useState, useEffect } from 'react';
import {
  Sparkles,
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
  Image as ImageIcon,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Hotel, HotelPortalConfig, PortalSectionConfig } from '../../../types/hotel';
import { getPublicConfig, savePublicConfig } from '../../../services/hotelService';
import { createDefaultPortalConfig } from '../../../utils/portalConfig';

export interface CustomSectionItem extends PortalSectionConfig {
  subtitle_en?: string;
  subtitle_ar?: string;
  image_url?: string;
  badge_en?: string;
  badge_ar?: string;
  cta_label_en?: string;
  cta_label_ar?: string;
  cta_url?: string;
}

interface CustomSectionsViewProps {
  hotel: Hotel;
  onMarkUnpublishedChanges?: () => void;
}

export const CustomSectionsView: React.FC<CustomSectionsViewProps> = ({
  hotel,
  onMarkUnpublishedChanges,
}) => {
  const [customSections, setCustomSections] = useState<CustomSectionItem[]>([]);
  const [config, setConfig] = useState<HotelPortalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [subEn, setSubEn] = useState('');
  const [subAr, setSubAr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [badgeEn, setBadgeEn] = useState('');
  const [badgeAr, setBadgeAr] = useState('');
  const [ctaTextEn, setCtaTextEn] = useState('');
  const [ctaTextAr, setCtaTextAr] = useState('');
  const [ctaLink, setCtaLink] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const portal = await getPublicConfig(hotel.id);
      const activePortal = portal || createDefaultPortalConfig();
      setConfig(activePortal);

      if (activePortal.custom_sections && activePortal.custom_sections.length > 0) {
        setCustomSections(
          [...activePortal.custom_sections].sort((a, b) => a.order - b.order) as CustomSectionItem[]
        );
      } else {
        setCustomSections([]);
      }
    } catch (err: any) {
      console.error('[CustomSectionsView] Load error:', err);
      setErrorMessage('Failed to load custom sections from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hotel.id]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setTitleEn('');
    setTitleAr('');
    setSubEn('');
    setSubAr('');
    setContentEn('');
    setContentAr('');
    setImageUrl('');
    setBadgeEn('');
    setBadgeAr('');
    setCtaTextEn('');
    setCtaTextAr('');
    setCtaLink('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sec: CustomSectionItem) => {
    setEditingId(sec.id);
    setTitleEn(sec.title_en);
    setTitleAr(sec.title_ar);
    setSubEn(sec.subtitle_en || '');
    setSubAr(sec.subtitle_ar || '');
    setContentEn(sec.custom_content_en || '');
    setContentAr(sec.custom_content_ar || '');
    setImageUrl(sec.image_url || '');
    setBadgeEn(sec.badge_en || '');
    setBadgeAr(sec.badge_ar || '');
    setCtaTextEn(sec.cta_label_en || '');
    setCtaTextAr(sec.cta_label_ar || '');
    setCtaLink(sec.cta_url || '');
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!titleEn.trim()) return;

    let updatedList: CustomSectionItem[];

    if (editingId) {
      updatedList = customSections.map((sec) =>
        sec.id === editingId
          ? {
              ...sec,
              title_en: titleEn.trim(),
              title_ar: titleAr.trim() || titleEn.trim(),
              subtitle_en: subEn.trim(),
              subtitle_ar: subAr.trim(),
              custom_content_en: contentEn.trim(),
              custom_content_ar: contentAr.trim(),
              image_url: imageUrl.trim(),
              badge_en: badgeEn.trim(),
              badge_ar: badgeAr.trim(),
              cta_label_en: ctaTextEn.trim(),
              cta_label_ar: ctaTextAr.trim(),
              cta_url: ctaLink.trim(),
            }
          : sec
      );
    } else {
      const newSec: CustomSectionItem = {
        id: `custom-sec-${Date.now()}`,
        code: 'custom',
        title_en: titleEn.trim(),
        title_ar: titleAr.trim() || titleEn.trim(),
        subtitle_en: subEn.trim(),
        subtitle_ar: subAr.trim(),
        custom_content_en: contentEn.trim(),
        custom_content_ar: contentAr.trim(),
        image_url: imageUrl.trim(),
        badge_en: badgeEn.trim(),
        badge_ar: badgeAr.trim(),
        cta_label_en: ctaTextEn.trim(),
        cta_label_ar: ctaTextAr.trim(),
        cta_url: ctaLink.trim(),
        is_enabled: true,
        order: customSections.length + 1,
      };
      updatedList = [...customSections, newSec];
    }

    setCustomSections(updatedList);
    setIsModalOpen(false);
    await persistToFirestore(updatedList);
  };

  const handleToggle = async (id: string) => {
    const updated = customSections.map((s) => (s.id === id ? { ...s, is_enabled: !s.is_enabled } : s));
    setCustomSections(updated);
    await persistToFirestore(updated);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customSections.length) return;
    const reordered = [...customSections];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    const withOrder = reordered.map((s, idx) => ({ ...s, order: idx + 1 }));
    setCustomSections(withOrder);
    await persistToFirestore(withOrder);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom section?')) return;
    const updated = customSections.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 }));
    setCustomSections(updated);
    await persistToFirestore(updated);
  };

  const persistToFirestore = async (sectionsToSave: CustomSectionItem[]) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const baseConfig = config || createDefaultPortalConfig();
      const updatedConfig: HotelPortalConfig = {
        ...baseConfig,
        custom_sections: sectionsToSave,
      };

      await savePublicConfig(hotel.id, updatedConfig);
      setConfig(updatedConfig);
      onMarkUnpublishedChanges?.();
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (err: any) {
      console.error('[CustomSectionsView] Save error:', err);
      setErrorMessage(err.message || 'Failed to save custom sections.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400 space-y-4">
        <RefreshCw className="animate-spin text-amber-500" size={32} />
        <p className="text-sm font-medium">Loading Custom Sections...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Custom sections saved to Firestore (/hotels/{hotel.id}/publicConfig/portal)</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/60 p-6 rounded-2xl border border-stone-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles size={22} />
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">Custom Promotional & Content Sections</h2>
          </div>
          <p className="text-xs text-stone-400">
            Create tailored editorial blocks, seasonal promotions, or VIP spotlights for <strong>{hotel.name_en}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition-all cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus size={14} /> Add Custom Section
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Content List */}
      {customSections.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-stone-800 rounded-2xl bg-stone-900/20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <Layers size={32} />
          </div>
          <h3 className="text-base font-bold text-white">No Custom Sections Configured Yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            Enhance your guest portal with bespoke storytelling sections, special banquet packages, private jet transfers, or seasonal event spotlights.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus size={14} /> Create First Custom Section
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {customSections.map((sec, index) => (
            <div
              key={sec.id}
              className={`p-5 rounded-2xl border transition-all ${
                sec.is_enabled
                  ? 'bg-stone-900/40 border-stone-800 hover:border-stone-700'
                  : 'bg-stone-950/40 border-stone-900 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {sec.image_url ? (
                    <div className="w-24 h-18 rounded-xl overflow-hidden border border-stone-800 flex-shrink-0 bg-stone-950">
                      <img
                        src={sec.image_url}
                        alt={sec.title_en}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-18 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-stone-600 flex-shrink-0">
                      <ImageIcon size={24} />
                    </div>
                  )}

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                        #{sec.order}
                      </span>
                      {sec.badge_en && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {sec.badge_en}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-white">{sec.title_en}</h4>
                      <span className="text-stone-500 text-xs">/</span>
                      <span className="text-xs text-stone-400 font-arabic">{sec.title_ar}</span>
                    </div>

                    {sec.subtitle_en && (
                      <p className="text-xs text-stone-400">{sec.subtitle_en}</p>
                    )}

                    {sec.custom_content_en && (
                      <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                        {sec.custom_content_en}
                      </p>
                    )}

                    {sec.cta_label_en && (
                      <div className="pt-2">
                        <span className="text-[11px] text-amber-400 inline-flex items-center gap-1 font-semibold">
                          CTA: {sec.cta_label_en} ({sec.cta_url || 'No URL'}) <ExternalLink size={10} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleOpenEditModal(sec)}
                    title="Edit Section"
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    title="Move Up"
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === customSections.length - 1}
                    title="Move Down"
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => handleToggle(sec.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      sec.is_enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    {sec.is_enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{sec.is_enabled ? 'Active' : 'Hidden'}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(sec.id)}
                    title="Delete Section"
                    className="p-2 rounded-xl bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl my-8">
            <h3 className="text-base font-bold text-white">
              {editingId ? 'Edit Custom Section' : 'Create Custom Section'}
            </h3>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Section Title (English) *</label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. Helipad & Private Jet Charter"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1 text-right">عنوان القسم (بالعربية) *</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: مهبط الطائرات واستئجار الطائرات الخاصة"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Subtitle / Tagline (English)</label>
                  <input
                    type="text"
                    value={subEn}
                    onChange={(e) => setSubEn(e.target.value)}
                    placeholder="Seamless executive transit"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1 text-right">العنوان الفرعي (بالعربية)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={subAr}
                    onChange={(e) => setSubAr(e.target.value)}
                    placeholder="تنقل تنفيذي سلس وفاخر"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Badge / Tag (English)</label>
                  <input
                    type="text"
                    value={badgeEn}
                    onChange={(e) => setBadgeEn(e.target.value)}
                    placeholder="VIP PRIVILEGE"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1 text-right">شارة التميز (بالعربية)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={badgeAr}
                    onChange={(e) => setBadgeAr(e.target.value)}
                    placeholder="ميزة كبار الشخصيات"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Narrative Content / Body (English)</label>
                <textarea
                  rows={3}
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  placeholder="Detailed description of the service, event, or amenity..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1 text-right">المحتوى النصي المفصل (بالعربية)</label>
                <textarea
                  rows={3}
                  dir="rtl"
                  value={contentAr}
                  onChange={(e) => setContentAr(e.target.value)}
                  placeholder="شرح مفصل للخدمة أو الفعالية الخاصة..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Hero / Feature Image URL (HTTPS)</label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                  {imageUrl && (
                    <div className="w-14 h-10 rounded-lg overflow-hidden border border-stone-700 bg-stone-800 flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Button Label (EN)</label>
                  <input
                    type="text"
                    value={ctaTextEn}
                    onChange={(e) => setCtaTextEn(e.target.value)}
                    placeholder="Reserve Now"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1 text-right">نص الزر (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={ctaTextAr}
                    onChange={(e) => setCtaTextAr(e.target.value)}
                    placeholder="احجز الآن"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Button Target Link</label>
                  <input
                    type="text"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    placeholder="#contact or https://..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
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
                disabled={!titleEn.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {editingId ? 'Update Section' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
