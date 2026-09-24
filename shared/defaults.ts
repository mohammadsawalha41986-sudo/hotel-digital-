import type { GuestPage, SectionType } from './domain';
import { siteConfigSchema, type SiteConfig } from './hotel';

const SECTION_DEFAULTS: { type: SectionType; en: string; ar: string; sub_en: string; sub_ar: string; layout: 'carousel' | 'grid' | 'list' | 'feature'; bg?: 'muted' | 'dark' }[] = [
  { type: 'offers', en: 'Current offers', ar: 'العروض الحالية', sub_en: '', sub_ar: '', layout: 'carousel' },
  { type: 'quick_actions', en: 'How can we help?', ar: 'كيف يمكننا مساعدتك؟', sub_en: 'Most requests take a single tap', sub_ar: 'معظم الطلبات بلمسة واحدة', layout: 'grid' },
  { type: 'dining', en: 'Dining', ar: 'المطاعم والمقاهي', sub_en: 'Restaurants, cafés and in-room dining', sub_ar: 'المطاعم والمقاهي وخدمة الطعام في الغرف', layout: 'carousel' },
  { type: 'room_services', en: 'Room services', ar: 'خدمات الغرفة', sub_en: 'Everything for your room, delivered', sub_ar: 'كل ما تحتاجه لغرفتك', layout: 'grid', bg: 'muted' },
  { type: 'wellness', en: 'Wellness & Spa', ar: 'السبا والعافية', sub_en: 'Time for yourself', sub_ar: 'وقت لنفسك', layout: 'feature', bg: 'dark' },
  { type: 'laundry', en: 'Laundry & pressing', ar: 'الغسيل والكي', sub_en: 'Collected from your room', sub_ar: 'نستلمها من غرفتك', layout: 'feature' },
  { type: 'hotel_services', en: 'Hotel services', ar: 'خدمات الفندق', sub_en: 'Transport, concierge and more', sub_ar: 'التنقل والكونسيرج والمزيد', layout: 'grid' },
  { type: 'info', en: 'Hotel information', ar: 'معلومات الفندق', sub_en: 'Good to know during your stay', sub_ar: 'معلومات مفيدة خلال إقامتك', layout: 'list', bg: 'muted' },
  { type: 'gallery', en: 'Gallery', ar: 'معرض الصور', sub_en: '', sub_ar: '', layout: 'carousel' },
  { type: 'reviews', en: 'Guest reviews', ar: 'آراء النزلاء', sub_en: '', sub_ar: '', layout: 'carousel' },
  { type: 'contact', en: 'Contact & location', ar: 'التواصل والموقع', sub_en: '', sub_ar: '', layout: 'feature' },
];

const NAV_DEFAULTS: { page: GuestPage; bottom: boolean }[] = [
  { page: 'home', bottom: true },
  { page: 'dining', bottom: true },
  { page: 'room_services', bottom: true },
  { page: 'spa', bottom: false },
  { page: 'laundry', bottom: false },
  { page: 'services', bottom: false },
  { page: 'info', bottom: false },
  { page: 'feedback', bottom: false },
  { page: 'requests', bottom: true },
];

export function defaultSiteConfig(): SiteConfig {
  return siteConfigSchema.parse({
    welcome: {
      title_en: 'Welcome',
      title_ar: 'أهلاً وسهلاً',
      message_en: 'Your digital concierge for dining, room services and everything you need during your stay.',
      message_ar: 'مساعدك الرقمي للمطاعم وخدمات الغرف وكل ما تحتاجه خلال إقامتك.',
    },
    hero: { slides: [], autoplay_seconds: 6 },
    sections: SECTION_DEFAULTS.map((s) => ({
      id: s.type,
      type: s.type,
      visible: true,
      title_en: s.en,
      title_ar: s.ar,
      subtitle_en: s.sub_en,
      subtitle_ar: s.sub_ar,
      layout: s.layout,
      background: s.bg ?? 'default',
    })),
    navigation: NAV_DEFAULTS.map((n) => ({ id: n.page, page: n.page, visible: true, in_bottom_bar: n.bottom })),
  });
}
