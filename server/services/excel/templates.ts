import { entityTemplate, rules } from './adapters/entity';
import { departmentsTemplate, hotelProfileTemplate, whatsappRoutingTemplate } from './adapters/settings';
import { customSectionsTemplate, homepageSectionsTemplate, modifiersTemplate, navigationTemplate, operatingHoursTemplate } from './adapters/structured';
import type { TemplateAdapter } from './types';

/**
 * The template catalogue (01–22). Order is also the import order of the
 * master workbook: parents and departments come before the rows that
 * reference them by code.
 */
export const TEMPLATES: readonly TemplateAdapter[] = [
  hotelProfileTemplate,
  departmentsTemplate,
  whatsappRoutingTemplate,
  entityTemplate({
    key: 'dining_outlets',
    number: '04',
    title: 'Dining Outlets',
    title_ar: 'المطاعم والمقاهي',
    sheet: 'Dining Outlets',
    description: 'Restaurants, cafés, lounges and in-room dining.',
    entity: 'outlets',
    examples: { code: 'OUTLET-FLORA', name_en: 'Flora Restaurant', name_ar: 'مطعم فلورا', type: 'restaurant' },
  }),
  entityTemplate({
    key: 'fnb_menus',
    number: '05',
    title: 'F&B Menus',
    title_ar: 'القوائم',
    sheet: 'F&B Menus',
    description: 'Menus of each outlet (breakfast, all-day, beverages…).',
    entity: 'menus',
    examples: { code: 'MENU-BREAKFAST', outlet_code: 'OUTLET-FLORA', name_en: 'Breakfast', name_ar: 'الإفطار', meal_period: 'breakfast' },
  }),
  entityTemplate({
    key: 'fnb_categories',
    number: '06',
    title: 'F&B Categories',
    title_ar: 'فئات القائمة',
    sheet: 'F&B Categories',
    description: 'Sections of a menu (coffee, mains, desserts…).',
    entity: 'menu_categories',
    examples: { code: 'CAT-COFFEE', menu_code: 'MENU-BREAKFAST', name_en: 'Coffee', name_ar: 'القهوة' },
  }),
  entityTemplate({
    key: 'fnb_items',
    number: '07',
    title: 'F&B Items',
    title_ar: 'أصناف القائمة',
    sheet: 'F&B Items',
    description: 'Dishes and drinks with prices, images, allergens and dietary labels.',
    entity: 'menu_items',
    rules: [rules.zeroPrice],
    examples: { code: 'ITEM-LATTE', category_code: 'CAT-COFFEE', name_en: 'Latte', name_ar: 'لاتيه', price: '18', image: 'https://example.com/latte.jpg', allergens: 'dairy' },
  }),
  modifiersTemplate,
  entityTemplate({
    key: 'in_room_services',
    number: '09',
    title: 'In-Room Services',
    title_ar: 'خدمات الغرفة',
    sheet: 'In-Room Services',
    description: 'Housekeeping, amenities and maintenance requests.',
    entity: 'room_services',
    examples: { code: 'RS-EXTRA-TOWELS', name_en: 'Extra towels', name_ar: 'مناشف إضافية', category: 'amenities', department: 'HOUSEKEEPING' },
  }),
  entityTemplate({
    key: 'spa_categories',
    number: '10',
    title: 'Spa Categories',
    title_ar: 'فئات السبا',
    sheet: 'Spa Categories',
    description: 'Wellness categories (massages, facials, fitness…).',
    entity: 'spa_categories',
    examples: { code: 'SPACAT-MASSAGE', name_en: 'Massages', name_ar: 'المساج' },
  }),
  entityTemplate({
    key: 'spa_services',
    number: '11',
    title: 'Spa Services',
    title_ar: 'خدمات السبا',
    sheet: 'Spa Services',
    description: 'Treatments with duration, price, capacity and booking instructions.',
    entity: 'spa_services',
    rules: [rules.zeroPrice],
    examples: { code: 'SPA-MASSAGE-60', category_code: 'SPACAT-MASSAGE', name_en: 'Swedish massage 60 min', name_ar: 'مساج سويدي ٦٠ دقيقة', duration_minutes: '60', price: '350' },
  }),
  entityTemplate({
    key: 'laundry_categories',
    number: '12',
    title: 'Laundry Categories',
    title_ar: 'فئات الغسيل',
    sheet: 'Laundry Categories',
    description: 'Garment groups with standard and express turnaround.',
    entity: 'laundry_categories',
    examples: { code: 'LCAT-GENTLEMEN', name_en: 'Gentlemen', name_ar: 'رجالي' },
  }),
  entityTemplate({
    key: 'laundry_garments',
    number: '13',
    title: 'Laundry Garments',
    title_ar: 'قطع الغسيل',
    sheet: 'Laundry Garments',
    description: 'Garments in each laundry category (prices are in Laundry Prices).',
    entity: 'laundry_items',
    exclude: ['wash_price', 'dry_clean_price', 'press_price', 'express_pct'],
    examples: { code: 'LAUNDRY-SHIRT', category_code: 'LCAT-GENTLEMEN', name_en: 'Shirt', name_ar: 'قميص' },
  }),
  entityTemplate({
    key: 'laundry_prices',
    number: '14',
    title: 'Laundry Prices',
    title_ar: 'أسعار الغسيل',
    sheet: 'Laundry Prices',
    description: 'Wash, dry-clean and press prices and the express surcharge of each garment.',
    entity: 'laundry_items',
    include: ['wash_price', 'dry_clean_price', 'press_price', 'express_pct'],
    reference: ['name'],
    updateOnly: true,
    examples: { code: 'LAUNDRY-SHIRT', wash_price: '15', dry_clean_price: '20', press_price: '8', express_pct: '50' },
  }),
  entityTemplate({
    key: 'laundry_packages',
    number: '15',
    title: 'Laundry Packages',
    title_ar: 'باقات الغسيل',
    sheet: 'Laundry Packages',
    description: 'Bundled laundry offers with a fixed price.',
    entity: 'laundry_packages',
    rules: [rules.schedule],
    examples: { code: 'LPKG-10-PIECES', name_en: '10 pieces wash & press', name_ar: '١٠ قطع غسيل وكي', price: '120' },
  }),
  entityTemplate({
    key: 'guest_services',
    number: '16',
    title: 'Guest Services',
    title_ar: 'خدمات النزلاء',
    sheet: 'Guest Services',
    description: 'Transport, concierge, business and other hotel services.',
    entity: 'hotel_services',
    examples: { code: 'GS-AIRPORT-TRANSFER', name_en: 'Airport transfer', name_ar: 'التوصيل للمطار', category: 'transport', department: 'CONCIERGE' },
  }),
  entityTemplate({
    key: 'offers',
    number: '17',
    title: 'Offers & Packages',
    title_ar: 'العروض والباقات',
    sheet: 'Offers & Packages',
    description: 'Promotions with original/offer price, schedule and linked page.',
    entity: 'offers',
    rules: [rules.offerPricing, rules.schedule],
    examples: { code: 'OFFER-RAMADAN-IFTAR', title_en: 'Ramadan iftar', title_ar: 'إفطار رمضان', original_price: '250', offer_price: '199', starts_at: '2027-02-01', ends_at: '2027-03-01' },
  }),
  homepageSectionsTemplate,
  navigationTemplate,
  customSectionsTemplate,
  entityTemplate({
    key: 'info_faq',
    number: '21',
    title: 'Hotel Information / FAQ',
    title_ar: 'معلومات الفندق والأسئلة الشائعة',
    sheet: 'Hotel Info & FAQ',
    description: 'Check-in times, Wi-Fi, policies, prayer, emergency and FAQ entries.',
    entity: 'info_items',
    examples: { code: 'INFO-CHECK-IN', title_en: 'Check-in', title_ar: 'تسجيل الدخول', category: 'stay', highlight_en: '15:00' },
  }),
  operatingHoursTemplate,
];

export const MASTER_KEY = 'master';
export const MASTER_TITLE = 'MASTER HOTEL CONTENT TEMPLATE';

export function templateByKey(key: string): TemplateAdapter | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

/** Finds the template a worksheet belongs to (by sheet name, template title or key). */
export function templateForSheet(name: string): TemplateAdapter | undefined {
  const n = norm(name.replace(/^\d{2}\s*[-_.]?\s*/, ''));
  return TEMPLATES.find((t) => norm(t.sheet) === n || norm(t.title) === n || norm(t.key) === n);
}

export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9؀-ۿ]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
