import React, { useState, useEffect } from 'react';
import {
  LayoutTemplate,
  CheckCircle2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Megaphone,
  Sparkles,
  Edit2,
  AlertTriangle,
} from 'lucide-react';
import { Hotel, HotelPortalConfig, PortalSectionConfig } from '../../../types/hotel';
import { getPublicConfig, savePublicConfig } from '../../../services/hotelService';
import { createDefaultPortalConfig } from '../../../utils/portalConfig';

interface HomepageSectionsViewProps {
  hotel: Hotel;
  onMarkUnpublishedChanges?: () => void;
}

export const HomepageSectionsView: React.FC<HomepageSectionsViewProps> = ({
  hotel,
  onMarkUnpublishedChanges,
}) => {
  const [config, setConfig] = useState<HotelPortalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Announcement Banner
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerType, setBannerType] = useState<'info' | 'promo' | 'alert'>('promo');
  const [bannerTextEn, setBannerTextEn] = useState('');
  const [bannerTextAr, setBannerTextAr] = useState('');

  // Hero Section
  const [heroHeadlineEn, setHeroHeadlineEn] = useState(hotel.name_en || '');
  const [heroHeadlineAr, setHeroHeadlineAr] = useState(hotel.name_ar || '');
  const [heroSubEn, setHeroSubEn] = useState(hotel.tagline_en || '');
  const [heroSubAr, setHeroSubAr] = useState(hotel.tagline_ar || '');
  const [heroBgUrl, setHeroBgUrl] = useState(hotel.hero_images?.[0]?.url || '');
  const [heroCtaEn, setHeroCtaEn] = useState('Explore Hotel Services');
  const [heroCtaAr, setHeroCtaAr] = useState('استكشاف خدمات الفندق');
  const [heroCtaTarget, setHeroCtaTarget] = useState('hotel-services');

  // Sections
  const [sections, setSections] = useState<PortalSectionConfig[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editTitleAr, setEditTitleAr] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const portal = await getPublicConfig(hotel.id);
      const activePortal = portal || createDefaultPortalConfig();
      setConfig(activePortal);

      // Announcement
      if (activePortal.announcement_banner) {
        setBannerEnabled(Boolean(activePortal.announcement_banner.enabled));
        setBannerType(activePortal.announcement_banner.type || 'promo');
        setBannerTextEn(activePortal.announcement_banner.text_en || '');
        setBannerTextAr(activePortal.announcement_banner.text_ar || '');
      }

      // Hero custom fields if stored in portal config
      const customHero = (activePortal as any).hero_custom;
      if (customHero) {
        if (customHero.headline_en) setHeroHeadlineEn(customHero.headline_en);
        if (customHero.headline_ar) setHeroHeadlineAr(customHero.headline_ar);
        if (customHero.sub_en) setHeroSubEn(customHero.sub_en);
        if (customHero.sub_ar) setHeroSubAr(customHero.sub_ar);
        if (customHero.bg_url) setHeroBgUrl(customHero.bg_url);
        if (customHero.cta_en) setHeroCtaEn(customHero.cta_en);
        if (customHero.cta_ar) setHeroCtaAr(customHero.cta_ar);
        if (customHero.cta_target) setHeroCtaTarget(customHero.cta_target);
      }

      // Sections
      if (activePortal.sections && activePortal.sections.length > 0) {
        setSections([...activePortal.sections].sort((a, b) => a.order - b.order));
      } else {
        setSections(createDefaultPortalConfig().sections);
      }
    } catch (err: any) {
      console.error('[HomepageSectionsView] Load error:', err);
      setErrorMessage('Failed to load homepage sections configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hotel.id]);

  const handleToggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_enabled: !s.is_enabled } : s))
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const reordered = [...sections];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    const withOrder = reordered.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSections(withOrder);
  };

  const handleStartEditTitle = (sec: PortalSectionConfig) => {
    setEditingSectionId(sec.id);
    setEditTitleEn(sec.title_en);
    setEditTitleAr(sec.title_ar);
  };

  const handleSaveTitle = (id: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, title_en: editTitleEn.trim(), title_ar: editTitleAr.trim() } : s
      )
    );
    setEditingSectionId(null);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const baseConfig = config || createDefaultPortalConfig();
      const updatedConfig: HotelPortalConfig = {
        ...baseConfig,
        sections,
        announcement_banner: {
          enabled: bannerEnabled,
          type: bannerType,
          text_en: bannerTextEn.trim(),
          text_ar: bannerTextAr.trim(),
        },
        ...( {
          hero_custom: {
            headline_en: heroHeadlineEn.trim(),
            headline_ar: heroHeadlineAr.trim(),
            sub_en: heroSubEn.trim(),
            sub_ar: heroSubAr.trim(),
            bg_url: heroBgUrl.trim(),
            cta_en: heroCtaEn.trim(),
            cta_ar: heroCtaAr.trim(),
            cta_target: heroCtaTarget.trim(),
          },
        } as any ),
      };

      await savePublicConfig(hotel.id, updatedConfig);
      setConfig(updatedConfig);
      onMarkUnpublishedChanges?.();
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (err: any) {
      console.error('[HomepageSectionsView] Save error:', err);
      setErrorMessage(err.message || 'Failed to persist homepage configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400 space-y-4">
        <RefreshCw className="animate-spin text-amber-500" size={32} />
        <p className="text-sm font-medium">Loading Homepage Sections Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Homepage configuration successfully persisted to Firestore (/hotels/{hotel.id}/publicConfig/portal)</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/60 p-6 rounded-2xl border border-stone-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <LayoutTemplate size={22} />
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">Homepage Sections & Hero Customizer</h2>
          </div>
          <p className="text-xs text-stone-400">
            Configure the hero presentation, announcement ribbon, and homepage section order for <strong>{hotel.name_en}</strong>.
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
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Persisting...' : 'Save Homepage Config'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div className="bg-stone-900/40 rounded-2xl border border-stone-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone size={20} className="text-amber-500" />
            <div>
              <h3 className="text-sm font-semibold text-white">Global Announcement Ribbon</h3>
              <p className="text-xs text-stone-400">Displays a marquee or alert banner at the very top of the guest portal.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={bannerEnabled}
              onChange={(e) => setBannerEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {bannerEnabled && (
          <div className="pt-4 border-t border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Banner Type</label>
              <select
                value={bannerType}
                onChange={(e) => setBannerType(e.target.value as any)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
              >
                <option value="promo">Promo / Exclusive (Amber)</option>
                <option value="info">General Information (Blue)</option>
                <option value="alert">Important Advisory (Red/Orange)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Banner Text (English)</label>
              <input
                type="text"
                value={bannerTextEn}
                onChange={(e) => setBannerTextEn(e.target.value)}
                placeholder="e.g. Complimentary airport limousine for Royal Suites..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1 text-right">نص الإعلان (بالعربية)</label>
              <input
                type="text"
                dir="rtl"
                value={bannerTextAr}
                onChange={(e) => setBannerTextAr(e.target.value)}
                placeholder="مثال: توصيل مجاني من المطار للأجنحة الملكية..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. HERO PRESENTATION */}
      <div className="bg-stone-900/40 rounded-2xl border border-stone-800 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-amber-500" />
          <div>
            <h3 className="text-sm font-semibold text-white">Hero Showcase & Main Headline</h3>
            <p className="text-xs text-stone-400">Configure what guests immediately see upon loading the portal.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Hero Main Title (English)</label>
            <input
              type="text"
              value={heroHeadlineEn}
              onChange={(e) => setHeroHeadlineEn(e.target.value)}
              placeholder="e.g. The Pinnacle of Royal Hospitality"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1 text-right">العنوان الرئيسي (بالعربية)</label>
            <input
              type="text"
              dir="rtl"
              value={heroHeadlineAr}
              onChange={(e) => setHeroHeadlineAr(e.target.value)}
              placeholder="مثال: قمة الضيافة الملكية الفاخرة"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Subheadline / Welcome Text (English)</label>
            <input
              type="text"
              value={heroSubEn}
              onChange={(e) => setHeroSubEn(e.target.value)}
              placeholder="e.g. Experience elevated luxury with our dedicated 24/7 digital concierge."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1 text-right">النص الترحيبي الفرعي (بالعربية)</label>
            <input
              type="text"
              dir="rtl"
              value={heroSubAr}
              onChange={(e) => setHeroSubAr(e.target.value)}
              placeholder="مثال: استمتع بتجربة إقامة استثنائية مع كونسيرجك الرقمي الخاص."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-stone-400 mb-1">Hero Backdrop Image URL (HTTPS)</label>
            <div className="flex gap-3">
              <input
                type="url"
                value={heroBgUrl}
                onChange={(e) => setHeroBgUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
              />
              {heroBgUrl && (
                <div className="w-16 h-10 rounded-lg overflow-hidden border border-stone-700 flex-shrink-0 bg-stone-800">
                  <img
                    src={heroBgUrl}
                    alt="Hero Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Primary Button Text (English)</label>
            <input
              type="text"
              value={heroCtaEn}
              onChange={(e) => setHeroCtaEn(e.target.value)}
              placeholder="Explore Services"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1 text-right">نص الزر الرئيسي (بالعربية)</label>
            <input
              type="text"
              dir="rtl"
              value={heroCtaAr}
              onChange={(e) => setHeroCtaAr(e.target.value)}
              placeholder="استكشف الخدمات"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. HOMEPAGE SECTION ARCHITECTURE */}
      <div className="bg-stone-900/40 rounded-2xl border border-stone-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Homepage Section Sequence & Visibility</h3>
            <p className="text-xs text-stone-400">
              Drag or reorder core sections to tailor guest layout flow. Toggle sections to hide/show on the live website.
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {sections.map((sec, index) => {
            const isEditing = editingSectionId === sec.id;
            return (
              <div
                key={sec.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  sec.is_enabled
                    ? 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                    : 'bg-stone-950/30 border-stone-900 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-xs font-mono text-stone-400 font-bold">
                    {index + 1}
                  </span>

                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-lg">
                      <input
                        type="text"
                        value={editTitleEn}
                        onChange={(e) => setEditTitleEn(e.target.value)}
                        placeholder="Section title (EN)"
                        className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        dir="rtl"
                        value={editTitleAr}
                        onChange={(e) => setEditTitleAr(e.target.value)}
                        placeholder="عنوان القسم (AR)"
                        className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <button
                        onClick={() => handleSaveTitle(sec.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{sec.title_en}</h4>
                        <span className="text-stone-500 text-xs">/</span>
                        <span className="text-xs text-stone-400 font-arabic">{sec.title_ar}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 font-mono">code: {sec.code}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {!isEditing && (
                    <button
                      onClick={() => handleStartEditTitle(sec)}
                      title="Edit Titles"
                      className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}

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
                    disabled={index === sections.length - 1}
                    title="Move Down"
                    className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                  >
                    <ArrowDown size={13} />
                  </button>

                  <button
                    onClick={() => handleToggleSection(sec.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      sec.is_enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    {sec.is_enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{sec.is_enabled ? 'Visible' : 'Hidden'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
