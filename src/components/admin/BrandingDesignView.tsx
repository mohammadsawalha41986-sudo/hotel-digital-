import React, { useState } from 'react';
import {
  Palette,
  CheckCircle2,
  Save,
  RotateCcw,
  Type,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';

interface BrandingDesignViewProps {
  hotel: Hotel;
  onMarkUnpublishedChanges: () => void;
}

export const BrandingDesignView: React.FC<BrandingDesignViewProps> = ({
  hotel,
  onMarkUnpublishedChanges,
}) => {
  const [primaryColor, setPrimaryColor] = useState('#D4AF37'); // Luxury Gold
  const [darkBackground, setDarkBackground] = useState('#0c0a09'); // Stone 950
  const [fontEn, setFontEn] = useState('Cinzel & Plus Jakarta Sans');
  const [fontAr, setFontAr] = useState('Amiri & Cairo');
  const [borderRadius, setBorderRadius] = useState('16px');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSave = () => {
    setToastMessage('Branding & typography tokens saved to active draft');
    setTimeout(() => setToastMessage(null), 3000);
    onMarkUnpublishedChanges();
  };

  const handleReset = () => {
    setPrimaryColor('#D4AF37');
    setDarkBackground('#0c0a09');
    setFontEn('Cinzel & Plus Jakarta Sans');
    setFontAr('Amiri & Cairo');
    setBorderRadius('16px');
    setToastMessage('Reset to Swiss Flora Royal standard tokens');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Palette className="text-amber-400" size={20} />
            <span>Design Tokens, Typography & Brand Expression</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure hotel aesthetic tokens, color palettes, Arabic/English typographic pairing, and rounded corner math.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Save size={13} />
            <span>Save Theme Draft</span>
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colors & Accents */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Palette size={15} className="text-amber-400" />
            <span>Luxury Color Palette</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-stone-400 mb-1 font-semibold">
                Primary Brand Accent (Gold / Luxury)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-stone-700"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 font-mono text-white text-xs w-32"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-semibold">
                Dark Canvas Surface (Header, Hero & Dark Accents)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={darkBackground}
                  onChange={(e) => setDarkBackground(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-stone-700"
                />
                <input
                  type="text"
                  value={darkBackground}
                  onChange={(e) => setDarkBackground(e.target.value)}
                  className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 font-mono text-white text-xs w-32"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-semibold">
                Corner Radius Math
              </label>
              <select
                value={borderRadius}
                onChange={(e) => setBorderRadius(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="12px">Subtle Soft (12px)</option>
                <option value="16px">Luxury Hotel Standard (16px)</option>
                <option value="20px">Modern Rounded (20px)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Typographic Pairings */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Type size={15} className="text-amber-400" />
            <span>Typographic System (Bilingual Pairing)</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-stone-400 mb-1 font-semibold">
                English Typography Pairing (Display + Body)
              </label>
              <select
                value={fontEn}
                onChange={(e) => setFontEn(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="Cinzel & Plus Jakarta Sans">Cinzel (Display Serif) + Plus Jakarta Sans (Body)</option>
                <option value="Playfair Display & Inter">Playfair Display (Serif) + Inter (Body)</option>
                <option value="Cormorant Garamond & Montserrat">Cormorant Garamond + Montserrat</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-semibold text-end" dir="rtl">
                الخطوط العربية المتناغمة (العناوين + المحتوى)
              </label>
              <select
                value={fontAr}
                onChange={(e) => setFontAr(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white text-end"
                dir="rtl"
              >
                <option value="Amiri & Cairo">أميري (العناوين الفخمة) + كايرو (النصوص)</option>
                <option value="Tajawal & Alexandria">تجوّل + الإسكندرية</option>
                <option value="Almarai & Readex Pro">المراعي + ريدكس برو</option>
              </select>
            </div>

            {/* Live Token Preview Card */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
              <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">
                Live Font Sample
              </span>
              <div className="text-amber-300 font-serif text-lg font-bold">
                {hotel.name_en}
              </div>
              <div className="text-amber-300 font-serif text-base font-bold text-end" dir="rtl">
                {hotel.name_ar}
              </div>
              <p className="text-stone-300 text-xs leading-relaxed">
                Experience unparalleled refinement in the diplomatic heart of Riyadh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
