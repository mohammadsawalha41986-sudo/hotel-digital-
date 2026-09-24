import React from 'react';
import {
  Sparkles,
  Globe,
  ShieldCheck,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Hotel, Language } from '../../types/hotel';
import { getTranslation } from '../../utils/i18n';

interface GuestFooterProps {
  hotel: Hotel;
  language: Language;
  onToggleLanguage: () => void;
  onNavigateSection?: (href: string) => void;
  availableSectionIds?: string[];
}

export const GuestFooter: React.FC<GuestFooterProps> = ({
  hotel,
  language,
  onToggleLanguage,
  onNavigateSection,
  availableSectionIds,
}) => {
  const isAr = language === 'ar';
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const scrollToTop = () => {
    if (onNavigateSection) {
      onNavigateSection('#top');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSectionEnabled = (code: string) => {
    if (!hotel.portal_config?.sections) return true;
    const found = hotel.portal_config.sections.find((s) => s.code === code);
    return found ? found.is_enabled : true;
  };

  const isLinkAvailable = (href: string) =>
    !availableSectionIds || availableSectionIds.includes(href.replace(/^#/, ''));

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigateSection) {
      e.preventDefault();
      onNavigateSection(href);
    }
  };

  return (
    <footer id="guest-portal-footer" className="bg-stone-950 text-stone-300 border-t border-stone-800">
      {/* Top Banner with Classification & Quick Actions */}
      <div className="border-b border-stone-800/80 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-stone-400">
            <Sparkles size={14} className="text-amber-400" />
            <span>
              {isAr ? hotel.classification_label_ar : hotel.classification_label_en} •{' '}
              {isAr ? hotel.city_ar : hotel.city_en}, {isAr ? hotel.country_ar : hotel.country_en}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-700 font-semibold cursor-pointer transition-colors"
            >
              <Globe size={13} />
              <span>{t('language_toggle')}</span>
            </button>

            <button
              onClick={scrollToTop}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer transition-colors"
              title={isAr ? 'العودة إلى الأعلى' : 'Back to Top'}
              aria-label={isAr ? 'العودة إلى الأعلى' : 'Back to Top'}
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer Content Columns — Pure Hospitality & Services */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Hotel Brand Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center font-serif font-bold text-lg text-amber-300 shrink-0">
                {hotel.logo_url ? (
                  <img src={hotel.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  hotel.name_en.charAt(0)
                )}
              </div>
              <span className="text-base font-serif font-bold text-white tracking-tight">
                {isAr ? hotel.name_ar : hotel.name_en}
              </span>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              {isAr ? hotel.description_ar : hotel.description_en}
            </p>

            <div className="pt-2 text-xs text-stone-400 space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-amber-400 shrink-0" />
                <span>{isAr ? hotel.address_ar : hotel.address_en}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-amber-400 shrink-0" />
                <a href={`tel:${hotel.phone}`} className="hover:text-white transition-colors">
                  {hotel.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-amber-400 shrink-0" />
                <a href={`mailto:${hotel.email}`} className="hover:text-white transition-colors">
                  {hotel.email}
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Guest Experience */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              {isAr ? 'تجربة الإقامة' : 'GUEST EXPERIENCE'}
            </h4>
            <ul className="space-y-2.5 text-stone-400">
              {isSectionEnabled('rooms') && isLinkAvailable('#rooms-suites') && (
                <li>
                  <a
                    href="#rooms-suites"
                    onClick={(e) => handleLinkClick(e, '#rooms-suites')}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {t('nav_rooms')}
                  </a>
                </li>
              )}
              {isSectionEnabled('offers') && isLinkAvailable('#hotel-offers') && (
                <li>
                  <a
                    href="#hotel-offers"
                    onClick={(e) => handleLinkClick(e, '#hotel-offers')}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {t('nav_offers')}
                  </a>
                </li>
              )}
              {isSectionEnabled('about') && isLinkAvailable('#about-hotel') && (
                <li>
                  <a
                    href="#about-hotel"
                    onClick={(e) => handleLinkClick(e, '#about-hotel')}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {isAr ? 'عن الفندق' : 'About Property'}
                  </a>
                </li>
              )}
              {isSectionEnabled('facilities') && isLinkAvailable('#hotel-facilities') && (
                <li>
                  <a
                    href="#hotel-facilities"
                    onClick={(e) => handleLinkClick(e, '#hotel-facilities')}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {isAr ? 'المرافق والخدمات' : 'Facilities'}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: Dining & Wellness */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              {isAr ? 'المطاعم والسبا' : 'DINING & WELLNESS'}
            </h4>
            <ul className="space-y-2.5 text-stone-400">
              {isSectionEnabled('dining') && isLinkAvailable('#dining-venues') && (
                <li>
                  <a
                    href="#dining-venues"
                    onClick={(e) => handleLinkClick(e, '#dining-venues')}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {t('nav_dining')}
                  </a>
                </li>
              )}
              {isSectionEnabled('wellness') && isLinkAvailable('#wellness-spa') && (
                <li>
                  <a
                    href="#wellness-spa"
                    onClick={(e) => handleLinkClick(e, '#wellness-spa')}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {t('nav_wellness')}
                  </a>
                </li>
              )}
              {isSectionEnabled('room_service_cafe') && isLinkAvailable('#room-service-cafe') && (
                <>
                  <li>
                    <a
                      href="#room-service-cafe"
                      onClick={(e) => handleLinkClick(e, '#room-service-cafe')}
                      className="hover:text-amber-300 transition-colors"
                    >
                      {t('nav_room_service')}
                    </a>
                  </li>
                  <li>
                    <a
                      href="#room-service-cafe"
                      onClick={(e) => handleLinkClick(e, '#room-service-cafe')}
                      className="hover:text-amber-300 transition-colors"
                    >
                      {t('nav_cafe')}
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 4: Services & Direct Contact */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              {isAr ? 'خدمات النزلاء' : 'GUEST SERVICES'}
            </h4>
            <ul className="space-y-2.5 text-stone-400">
              {isSectionEnabled('services') && isLinkAvailable('#hotel-services') && (
                <>
                  <li>
                    <a
                      href="#hotel-services"
                      onClick={(e) => handleLinkClick(e, '#hotel-services')}
                      className="hover:text-amber-300 transition-colors"
                    >
                      {isAr ? 'خدمات الإشراف والمغسلة' : 'Housekeeping & Laundry'}
                    </a>
                  </li>
                  <li>
                    <a
                      href="#hotel-services"
                      onClick={(e) => handleLinkClick(e, '#hotel-services')}
                      className="hover:text-amber-300 transition-colors"
                    >
                      {isAr ? 'الكونسيرج والصيانة' : 'Concierge & Engineering'}
                    </a>
                  </li>
                </>
              )}
              {isSectionEnabled('contact') && isLinkAvailable('#contact-location') && (
                <li>
                  <a
                    href="#contact-location"
                    onClick={(e) => handleLinkClick(e, '#contact-location')}
                    className="hover:text-amber-300 transition-colors"
                  >
                    {t('nav_contact')}
                  </a>
                </li>
              )}
            </ul>

            <div className="pt-3">
              <a
                href={`https://wa.me/${hotel.whatsapp_number.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/80 transition-colors font-medium text-xs"
              >
                <MessageSquare size={13} className="text-emerald-400" />
                <span>{isAr ? 'واتساب الاستقبال الرئيسي' : 'Direct Hotel WhatsApp'}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Zero Online Payment Banner */}
      <div className="border-t border-stone-900 py-6 px-4 sm:px-6 text-[11px] text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-amber-500 shrink-0" />
            <span>{t('no_payment_notice')}</span>
          </div>

          <div>
            © {new Date().getFullYear()} {isAr ? hotel.name_ar : hotel.name_en}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
