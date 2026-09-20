import React, { useState } from 'react';
import {
  DoorClosed,
  Globe,
  Menu,
  X,
  Sparkles,
  User,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import { getTranslation } from '../../utils/i18n';

interface GuestHeaderProps {
  currentHotel: Hotel;
  language: Language;
  onToggleLanguage: () => void;
  roomNumber: string;
  onSetRoomNumber: (num: string) => void;
  onNavigateSection?: (sectionHref: string) => void;
}

export const GuestHeader: React.FC<GuestHeaderProps> = ({
  currentHotel,
  language,
  onToggleLanguage,
  roomNumber,
  onSetRoomNumber,
  onNavigateSection,
}) => {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [tempRoomInput, setTempRoomInput] = useState(roomNumber);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);
  const isAr = language === 'ar';

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    onSetRoomNumber(tempRoomInput.trim());
    setShowRoomModal(false);
  };

  const isSectionEnabled = (code: string) => {
    if (!currentHotel.portal_config?.sections) return true;
    const found = currentHotel.portal_config.sections.find((s) => s.code === code);
    return found ? found.is_enabled : true;
  };

  const configuredNavLinks = (currentHotel.portal_config?.navigation_items || [])
    .filter((item) => item.is_enabled)
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      href: item.target_section.startsWith('#') ? item.target_section : `#${item.target_section}`,
      label: isAr ? item.label_ar : item.label_en,
    }));

  // Use the persisted navigation menu when configured; otherwise retain the
  // platform defaults filtered by section visibility.
  const defaultNavLinks = [
    { href: '#top', label: isAr ? 'الرئيسية' : 'Home' },
    ...(isSectionEnabled('offers') ? [{ href: '#hotel-offers', label: t('nav_offers') }] : []),
    ...(isSectionEnabled('about') ? [{ href: '#about-hotel', label: isAr ? 'عن الفندق' : 'About' }] : []),
    ...(isSectionEnabled('rooms') ? [{ href: '#rooms-suites', label: t('nav_rooms') }] : []),
    ...(isSectionEnabled('dining') ? [{ href: '#dining-venues', label: t('nav_dining') }] : []),
    ...(isSectionEnabled('wellness') ? [{ href: '#wellness-spa', label: t('nav_wellness') }] : []),
    ...(isSectionEnabled('room_service_cafe') ? [{ href: '#room-service-cafe', label: t('nav_cafe') || 'In-Room & Café' }] : []),
    ...(isSectionEnabled('services') ? [{ href: '#hotel-services', label: t('nav_services') }] : []),
    ...(isSectionEnabled('contact') ? [{ href: '#contact-location', label: t('nav_contact') }] : []),
  ];
  const navLinks = configuredNavLinks.length > 0 ? configuredNavLinks : defaultNavLinks;

  const handleNavClick = (_e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileMenuOpen(false);
    if (onNavigateSection) {
      onNavigateSection(href);
    }
  };

  return (
    <header
      id="guest-portal-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-xs transition-colors"
      style={{
        borderBottomColor: 'var(--hotel-border, #e7e5e4)',
      }}
    >
      {/* Top Session / Room Context Bar */}
      <div className="bg-stone-900 text-stone-300 text-[11px] py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Classification Badge */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Sparkles size={12} />
              {isAr ? currentHotel.classification_label_ar : currentHotel.classification_label_en}
            </span>
            <span className="hidden md:inline text-stone-600">•</span>
            <span className="hidden md:inline text-stone-400">
              {isAr ? currentHotel.city_ar : currentHotel.city_en}
            </span>
          </div>

          {/* In-Room vs External Visitor Status & Language Switcher */}
          <div className="flex items-center gap-3">
            {roomNumber ? (
              <div className="flex items-center gap-1.5 bg-amber-950/60 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-800/80">
                <DoorClosed size={12} className="text-amber-400" />
                <span className="font-semibold text-amber-200">
                  {t('room_number')} {roomNumber}
                </span>
                <button
                  id="header-change-room-btn"
                  onClick={() => setShowRoomModal(true)}
                  className="text-[10px] underline text-stone-400 hover:text-white ml-1 cursor-pointer"
                  title="Update or clear room number"
                >
                  ({t('change_room')})
                </button>
              </div>
            ) : (
              <button
                id="header-set-room-btn"
                onClick={() => setShowRoomModal(true)}
                className="flex items-center gap-1 text-stone-300 hover:text-amber-300 transition-colors cursor-pointer bg-stone-800/80 px-2.5 py-0.5 rounded-full border border-stone-700"
              >
                <User size={11} className="text-stone-400" />
                <span>{isAr ? 'نزيل بالفندق؟ أدخل رقم الغرفة' : 'Staying in-house? Enter Room'}</span>
              </button>
            )}

            {/* Language Switcher */}
            <button
              id="header-language-toggle-btn"
              onClick={onToggleLanguage}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold transition-colors cursor-pointer border border-stone-700"
              title="Toggle Language / تغيير اللغة"
            >
              <Globe size={12} />
              <span>{t('language_toggle')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar — Pure Guest Experience */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Hotel Identity Brand — Locked to URL Hotel */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl overflow-hidden shadow-xs border flex items-center justify-center bg-stone-900 text-white font-serif font-bold text-xl shrink-0"
              style={{
                borderColor: 'var(--hotel-border, #e7e5e4)',
              }}
            >
              {currentHotel.logo_url ? (
                <img
                  src={currentHotel.logo_url}
                  alt={currentHotel.name_en}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{currentHotel.name_en.charAt(0)}</span>
              )}
            </div>

            <div>
              <a
                href="#top"
                className="text-base sm:text-lg font-serif font-bold tracking-tight text-stone-900 hover:opacity-90 transition-opacity block"
                style={{ color: 'var(--hotel-secondary, #1c1917)' }}
              >
                {isAr ? currentHotel.name_ar : currentHotel.name_en}
              </a>
              <p className="text-[11px] text-stone-500 line-clamp-1">
                {isAr ? currentHotel.tagline_ar : currentHotel.tagline_en}
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-stone-700">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="hover:text-amber-800 transition-colors py-1 relative hover:font-semibold"
                style={{ color: 'inherit' }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 xl:hidden">
            <button
              id="header-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100 border border-stone-200 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden pt-4 pb-2 border-t border-stone-100 mt-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-3 py-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* In-Room QR / Room Context Modal */}
      {showRoomModal && (
        <div
          id="room-context-dialog"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 relative">
            <button
              onClick={() => setShowRoomModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                <DoorClosed size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {isAr ? 'تعيين رقم الغرفة / الجناح' : 'In-Room Guest Session'}
                </h3>
                <p className="text-xs text-stone-500">
                  {isAr
                    ? 'أدخل رقم غرفتك لتفعيل خدمة الغرف والمغسلة والمستلزمات تلقائياً'
                    : 'Enter your room number to automatically personalize in-room dining, valet laundry, and housekeeping.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {isAr ? 'رقم الغرفة أو الجناح:' : 'Room / Suite Number:'}
                </label>
                <input
                  type="text"
                  value={tempRoomInput}
                  onChange={(e) => setTempRoomInput(e.target.value)}
                  placeholder="e.g. 402, 501, Penthouse-A"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'حفظ وتفعيل الغرفة' : 'Activate Room Session'}
                </button>
                {roomNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      onSetRoomNumber('');
                      setTempRoomInput('');
                      setShowRoomModal(false);
                    }}
                    className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {isAr ? 'مسح الغرفة' : 'Clear'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
