import type { FieldOption } from './fields';

/**
 * Category lists shared by the entity registry (admin forms) and the guest
 * site (grouping and ordering). Kept apart from shared/entities.ts so the
 * guest bundle does not download the whole admin registry.
 */
const o = (value: string, en: string, ar: string): FieldOption => ({ value, en, ar });

export const ROOM_SERVICE_CATEGORIES: readonly FieldOption[] = [
  o('housekeeping', 'Housekeeping', 'التدبير المنزلي'),
  o('amenities', 'Amenities', 'المستلزمات'),
  o('maintenance', 'Maintenance', 'الصيانة'),
  o('assistance', 'Assistance', 'المساعدة'),
  o('other', 'Other', 'أخرى'),
];

export const HOTEL_SERVICE_CATEGORIES: readonly FieldOption[] = [
  o('transport', 'Transport', 'التنقل'),
  o('concierge', 'Concierge', 'الكونسيرج'),
  o('business', 'Business', 'الأعمال'),
  o('accessibility', 'Accessibility', 'إمكانية الوصول'),
  o('facilities', 'Facilities', 'المرافق'),
  o('local', 'Local assistance', 'المساعدة المحلية'),
  o('prayer', 'Prayer', 'الصلاة'),
  o('other', 'Other', 'أخرى'),
];

export const INFO_CATEGORIES: readonly FieldOption[] = [
  o('stay', 'Your stay', 'إقامتك'),
  o('dining', 'Dining hours', 'مواعيد المطاعم'),
  o('facilities', 'Facilities', 'المرافق'),
  o('connectivity', 'Wi-Fi & connectivity', 'الإنترنت'),
  o('policies', 'Policies', 'السياسات'),
  o('prayer', 'Prayer', 'الصلاة'),
  o('emergency', 'Emergency', 'الطوارئ'),
  o('nearby', 'Nearby', 'بالقرب منك'),
  o('faq', 'FAQ', 'الأسئلة الشائعة'),
  o('other', 'Other', 'أخرى'),
];

export const CATEGORY_OPTIONS = { room_services: ROOM_SERVICE_CATEGORIES, hotel_services: HOTEL_SERVICE_CATEGORIES, info_items: INFO_CATEGORIES } as const;
