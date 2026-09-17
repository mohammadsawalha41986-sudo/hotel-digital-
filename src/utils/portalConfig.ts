import { HotelPortalConfig, PortalSectionConfig, PortalNavigationItem } from '../types/hotel';

export const DEFAULT_PORTAL_SECTIONS: PortalSectionConfig[] = [
  { id: 'sec-hero', code: 'hero', title_en: 'Hero & Welcome', title_ar: 'الرئيسية والترحيب', is_enabled: true, order: 1 },
  { id: 'sec-offers', code: 'offers', title_en: 'Exclusive Offers', title_ar: 'العروض الحصرية', is_enabled: true, order: 2 },
  { id: 'sec-rooms', code: 'rooms', title_en: 'Rooms & Suites', title_ar: 'الغرف والأجنحة', is_enabled: true, order: 3 },
  { id: 'sec-dining', code: 'dining', title_en: 'Fine Dining & Gastronomy', title_ar: 'المطاعم والضيافة', is_enabled: true, order: 4 },
  { id: 'sec-wellness', code: 'wellness', title_en: 'Wellness & Spa Sanctuary', title_ar: 'السبا والنادي الصحي', is_enabled: true, order: 5 },
  { id: 'sec-room-service', code: 'room_service_cafe', title_en: 'Room Service & Artisan Café', title_ar: 'خدمة الغرف والمقهى', is_enabled: true, order: 6 },
  { id: 'sec-services', code: 'services', title_en: 'Hotel Guest Services', title_ar: 'خدمات النزلاء والكونسيرج', is_enabled: true, order: 7 },
  { id: 'sec-info', code: 'info', title_en: 'Hotel Info & Policies', title_ar: 'معلومات الإقامة والسياسات', is_enabled: true, order: 8 },
  { id: 'sec-contact', code: 'contact', title_en: 'Contact & Location', title_ar: 'الموقع والتواصل المباشر', is_enabled: true, order: 9 },
];

export const DEFAULT_NAVIGATION_ITEMS: PortalNavigationItem[] = [
  { id: 'nav-offers', label_en: 'Offers', label_ar: 'العروض', target_section: 'hotel-offers', is_enabled: true, order: 1 },
  { id: 'nav-rooms', label_en: 'Rooms & Suites', label_ar: 'الغرف والأجنحة', target_section: 'rooms-suites', is_enabled: true, order: 2 },
  { id: 'nav-dining', label_en: 'Dining', label_ar: 'المطاعم', target_section: 'dining-venues', is_enabled: true, order: 3 },
  { id: 'nav-wellness', label_en: 'Wellness & Spa', label_ar: 'السبا', target_section: 'wellness-spa', is_enabled: true, order: 4 },
  { id: 'nav-room-service', label_en: 'Room Service', label_ar: 'خدمة الغرف', target_section: 'room-service-cafe', is_enabled: true, order: 5 },
  { id: 'nav-services', label_en: 'Services', label_ar: 'الخدمات', target_section: 'hotel-services', is_enabled: true, order: 6 },
  { id: 'nav-info', label_en: 'Hotel Info', label_ar: 'معلومات الفندق', target_section: 'hotel-info', is_enabled: true, order: 7 },
  { id: 'nav-contact', label_en: 'Contact', label_ar: 'التواصل', target_section: 'contact-location', is_enabled: true, order: 8 },
];

export function createDefaultPortalConfig(enabledOverrides?: Partial<Record<string, boolean>>): HotelPortalConfig {
  const sections = DEFAULT_PORTAL_SECTIONS.map((sec) => {
    if (enabledOverrides && sec.code in enabledOverrides) {
      return { ...sec, is_enabled: Boolean(enabledOverrides[sec.code]) };
    }
    return { ...sec };
  });

  return {
    sections,
    navigation_items: [...DEFAULT_NAVIGATION_ITEMS],
    custom_sections: [],
  };
}
