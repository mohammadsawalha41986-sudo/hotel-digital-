import { HOTEL_SERVICE_CATEGORIES, INFO_CATEGORIES, ROOM_SERVICE_CATEGORIES } from './categories';
import { GUEST_PAGES, GUEST_PAGE_LABELS, type Module } from './domain';
import {
  ALLERGENS,
  DIETARY,
  ICON_OPTIONS,
  MERCH_BADGES,
  OUTLET_TYPES,
  SPICY_LEVELS,
  STATUS_OVERRIDES,
  VAT_MODES,
  buildEntitySchema,
  type FieldOption,
  type FieldSpec,
} from './fields';

/**
 * Registry of every hotel-scoped catalog entity. The API exposes a generic,
 * hotel-isolated CRUD surface over these; the admin renders forms from them;
 * the import engine derives spreadsheet columns from them.
 */
export interface EntityDef {
  name: EntityName;
  table: string;
  label: { singular: string; plural: string; singular_ar: string; plural_ar: string };
  module: Module;
  /** Parent entity (FK `parent_id` must reference a row of this entity in the same hotel). */
  parent?: EntityName;
  fields: readonly FieldSpec[];
  /** Field used as the display title. Always an i18n field. */
  titleField: string;
  /** Prefix of generated stable codes, e.g. ITEM-LATTE. */
  codePrefix: string;
  /** Field holding the main image (list thumbnails). */
  imageField?: string;
}

export const ENTITY_NAMES = [
  'experiences',
  'offers',
  'quick_actions',
  'outlets',
  'menus',
  'menu_categories',
  'menu_items',
  'room_services',
  'hotel_services',
  'spa_categories',
  'spa_services',
  'laundry_categories',
  'laundry_items',
  'laundry_packages',
  'info_items',
] as const;
export type EntityName = (typeof ENTITY_NAMES)[number];

const o = (value: string, en: string, ar: string): FieldOption => ({ value, en, ar });
const pageOptions = GUEST_PAGES.map((p) => o(p, GUEST_PAGE_LABELS[p].en, GUEST_PAGE_LABELS[p].ar));

const name: FieldSpec = { key: 'name', type: 'i18n', label: 'Name', required: true };
const description: FieldSpec = { key: 'description', type: 'i18nText', label: 'Description', wide: true };
const icon: FieldSpec = { key: 'icon', type: 'icon', label: 'Icon', options: ICON_OPTIONS, default: 'sparkles' };
const hours: FieldSpec = { key: 'hours', type: 'hours', label: 'Availability hours', noImport: true, wide: true };
const featured: FieldSpec = { key: 'featured', type: 'boolean', label: 'Featured' };
const badges: FieldSpec = { key: 'badges', type: 'tags', label: 'Badges', options: MERCH_BADGES, help: 'Merchandising labels shown on the guest site' };
const internalNotes: FieldSpec = { key: 'internal_notes', type: 'textarea', label: 'Internal notes (staff only)', private: true, wide: true };
const img = (spec: string, label = 'Image'): FieldSpec => ({ key: 'image', type: 'media', label, imageSpec: spec });
const gallery = (spec: string): FieldSpec => ({ key: 'gallery', type: 'gallery', label: 'Gallery', imageSpec: spec, wide: true });
const available: FieldSpec = {
  key: 'available',
  type: 'boolean',
  label: 'Currently available',
  help: 'Turn off to show the item as unavailable without hiding it.',
  default: true,
};
const customFields: FieldSpec = { key: 'custom_fields', type: 'customFields', label: 'Extra questions for the guest', noImport: true, wide: true };
const department = (def: string): FieldSpec => ({ key: 'department', type: 'department', label: 'Department / WhatsApp route', default: def });

const lbl = (singular: string, plural: string, singular_ar: string, plural_ar: string) => ({ singular, plural, singular_ar, plural_ar });

export const EXPERIENCE_TARGETS = ['page', 'outlet', 'spa_category', 'room_service', 'hotel_service', 'offer'] as const;

export const ENTITIES: Record<EntityName, EntityDef> = {
  experiences: {
    name: 'experiences',
    table: 'experiences',
    label: lbl('Experience', 'Experience categories', 'تجربة', 'فئات التجارب'),
    module: 'hotel',
    titleField: 'title',
    codePrefix: 'EXP',
    imageField: 'image',
    fields: [
      { key: 'title', type: 'i18n', label: 'Title', required: true },
      { key: 'subtitle', type: 'i18n', label: 'Subtitle', help: 'e.g. "Open until midnight"' },
      { key: 'image', type: 'media', label: 'Image', imageSpec: 'experience' },
      icon,
      {
        key: 'target',
        type: 'select',
        label: 'Opens',
        options: [
          o('page', 'A guest page', 'صفحة'),
          o('outlet', 'A dining outlet', 'مطعم'),
          o('spa_category', 'A wellness category', 'فئة عافية'),
          o('room_service', 'A room service', 'خدمة غرفة'),
          o('hotel_service', 'A guest service', 'خدمة نزلاء'),
          o('offer', 'An offer', 'عرض'),
        ],
        default: 'page',
      },
      { key: 'page', type: 'select', label: 'Page', options: pageOptions, default: 'dining', showIf: { field: 'target', in: ['page'] } },
      { key: 'outlet_id', type: 'ref', label: 'Outlet', refEntity: 'outlets', showIf: { field: 'target', in: ['outlet'] } },
      { key: 'spa_category_id', type: 'ref', label: 'Wellness category', refEntity: 'spa_categories', showIf: { field: 'target', in: ['spa_category'] } },
      { key: 'room_service_id', type: 'ref', label: 'Room service', refEntity: 'room_services', showIf: { field: 'target', in: ['room_service'] } },
      { key: 'hotel_service_id', type: 'ref', label: 'Guest service', refEntity: 'hotel_services', showIf: { field: 'target', in: ['hotel_service'] } },
      { key: 'offer_id', type: 'ref', label: 'Offer', refEntity: 'offers', showIf: { field: 'target', in: ['offer'] } },
      badges,
      featured,
    ],
  },
  offers: {
    name: 'offers',
    table: 'offers',
    label: lbl('Offer', 'Offers & packages', 'عرض', 'العروض والباقات'),
    module: 'offers',
    titleField: 'title',
    codePrefix: 'OFFER',
    imageField: 'image',
    fields: [
      { key: 'title', type: 'i18n', label: 'Title', required: true },
      { key: 'subtitle', type: 'i18n', label: 'Subtitle' },
      description,
      img('offer', 'Banner image'),
      { key: 'video', type: 'video', label: 'Video URL (optional)' },
      { key: 'original_price', type: 'money', label: 'Original price' },
      { key: 'offer_price', type: 'money', label: 'Offer price' },
      { key: 'discount_pct', type: 'number', label: 'Discount % (badge)', min: 0, max: 100, help: 'Leave empty to calculate from the two prices.' },
      { key: 'price_label', type: 'i18n', label: 'Price label override', help: 'e.g. "SAR 89 per person" — replaces the price display' },
      { key: 'badge', type: 'i18n', label: 'Badge', help: 'e.g. "Limited time"' },
      { key: 'terms', type: 'i18nText', label: 'Terms & conditions', wide: true },
      { key: 'cta_label', type: 'i18n', label: 'Button label' },
      { key: 'cta_page', type: 'select', label: 'Button opens', options: [o('none', 'Nothing', 'لا شيء'), ...pageOptions], default: 'none' },
      { key: 'cta_outlet_id', type: 'ref', label: 'Linked outlet', refEntity: 'outlets', showIf: { field: 'cta_page', in: ['dining'] } },
      { key: 'cta_spa_category_id', type: 'ref', label: 'Linked wellness category', refEntity: 'spa_categories', showIf: { field: 'cta_page', in: ['spa'] } },
      {
        key: 'placement',
        type: 'tags',
        label: 'Show on',
        options: [o('home', 'Homepage', 'الرئيسية'), o('dining', 'Dining', 'المطاعم'), o('spa', 'Spa', 'السبا'), o('laundry', 'Laundry', 'المغسلة')],
        default: ['home'],
      },
      featured,
      badges,
      { key: 'starts_at', type: 'datetime', label: 'Starts' },
      { key: 'ends_at', type: 'datetime', label: 'Ends', help: 'Expired offers disappear automatically.' },
    ],
  },
  quick_actions: {
    name: 'quick_actions',
    table: 'quick_actions',
    label: lbl('Quick action', 'Quick actions', 'اختصار', 'الاختصارات السريعة'),
    module: 'hotel',
    titleField: 'label',
    codePrefix: 'QA',
    fields: [
      { key: 'label', type: 'i18n', label: 'Label', required: true },
      icon,
      {
        key: 'action',
        type: 'select',
        label: 'Action',
        options: [
          o('room_service', 'Request a room service', 'طلب خدمة غرفة'),
          o('hotel_service', 'Request a hotel service', 'طلب خدمة فندقية'),
          o('page', 'Open a page', 'فتح صفحة'),
          o('call', 'Call a department', 'اتصال بقسم'),
          o('whatsapp', 'WhatsApp a department', 'واتساب قسم'),
          o('feedback', 'Complaint / suggestion', 'شكوى / اقتراح'),
        ],
        default: 'room_service',
      },
      { key: 'room_service_id', type: 'ref', label: 'Room service', refEntity: 'room_services', showIf: { field: 'action', in: ['room_service'] } },
      { key: 'hotel_service_id', type: 'ref', label: 'Hotel service', refEntity: 'hotel_services', showIf: { field: 'action', in: ['hotel_service'] } },
      { key: 'page', type: 'select', label: 'Page', options: pageOptions, default: 'dining', showIf: { field: 'action', in: ['page'] } },
      { ...department('FRONT_OFFICE'), showIf: { field: 'action', in: ['call', 'whatsapp'] } },
      { key: 'emphasis', type: 'boolean', label: 'Highlight (emergency / priority)' },
    ],
  },
  outlets: {
    name: 'outlets',
    table: 'outlets',
    label: lbl('Outlet', 'Dining outlets', 'منفذ', 'المطاعم والمقاهي'),
    module: 'dining',
    titleField: 'name',
    codePrefix: 'OUTLET',
    imageField: 'cover',
    fields: [
      name,
      { key: 'type', type: 'select', label: 'Type', options: OUTLET_TYPES, default: 'restaurant' },
      { key: 'tagline', type: 'i18n', label: 'Tagline' },
      description,
      { key: 'cover', type: 'media', label: 'Cover image', imageSpec: 'outlet' },
      { key: 'logo', type: 'media', label: 'Logo / icon', imageSpec: 'mark' },
      gallery('outlet'),
      { key: 'location', type: 'i18n', label: 'Location in hotel', help: 'e.g. "Lobby level"' },
      { key: 'phone', type: 'phone', label: 'Phone / extension' },
      { key: 'whatsapp', type: 'phone', label: 'WhatsApp override', help: 'Leave empty to use the F&B department number.', private: true },
      { key: 'status_override', type: 'select', label: 'Status', options: STATUS_OVERRIDES, default: 'auto' },
      hours,
      featured,
      badges,
      { key: 'accepts_orders', type: 'boolean', label: 'Guests can order from the menu', default: true },
      { key: 'room_delivery', type: 'boolean', label: 'Delivers to rooms', default: false },
      { key: 'external_orders', type: 'boolean', label: 'External visitors can order', default: true },
      internalNotes,
    ],
  },
  menus: {
    name: 'menus',
    table: 'menus',
    label: lbl('Menu', 'Menus', 'قائمة', 'القوائم'),
    module: 'dining',
    parent: 'outlets',
    titleField: 'name',
    codePrefix: 'MENU',
    fields: [
      name,
      description,
      {
        key: 'meal_period',
        type: 'select',
        label: 'Meal period',
        options: [
          o('all_day', 'All day', 'طوال اليوم'),
          o('breakfast', 'Breakfast', 'الإفطار'),
          o('lunch', 'Lunch', 'الغداء'),
          o('dinner', 'Dinner', 'العشاء'),
          o('late_night', 'Late night', 'آخر الليل'),
          o('beverages', 'Beverages', 'المشروبات'),
          o('other', 'Other', 'أخرى'),
        ],
        default: 'all_day',
      },
      { ...hours, label: 'Served during (optional)' },
    ],
  },
  menu_categories: {
    name: 'menu_categories',
    table: 'menu_categories',
    label: lbl('Category', 'Menu categories', 'فئة', 'فئات القائمة'),
    module: 'dining',
    parent: 'menus',
    titleField: 'name',
    codePrefix: 'CAT',
    imageField: 'image',
    fields: [name, description, img('menu_item'), icon],
  },
  menu_items: {
    name: 'menu_items',
    table: 'menu_items',
    label: lbl('Menu item', 'Menu items', 'صنف', 'أصناف القائمة'),
    module: 'dining',
    parent: 'menu_categories',
    titleField: 'name',
    codePrefix: 'ITEM',
    imageField: 'image',
    fields: [
      name,
      description,
      { key: 'price', type: 'money', label: 'Price', required: true },
      { key: 'vat_mode', type: 'select', label: 'VAT', options: VAT_MODES, default: 'inherit' },
      img('menu_item'),
      gallery('menu_item'),
      { key: 'video', type: 'video', label: 'Video URL' },
      available,
      { key: 'kind', type: 'select', label: 'Item type', options: [o('item', 'Single item', 'صنف'), o('combo', 'Combo / set', 'وجبة كومبو')], default: 'item' },
      featured,
      badges,
      { key: 'recommended', type: 'boolean', label: "Chef's recommendation" },
      { key: 'calories', type: 'number', label: 'Calories (kcal)', min: 0, max: 10000 },
      { key: 'prep_minutes', type: 'number', label: 'Preparation time (min)', min: 0, max: 600 },
      { key: 'spicy', type: 'select', label: 'Spiciness', options: SPICY_LEVELS, default: '0' },
      { key: 'allergens', type: 'tags', label: 'Allergens', options: ALLERGENS },
      { key: 'dietary', type: 'tags', label: 'Dietary labels', options: DIETARY },
      { key: 'modifiers', type: 'modifiers', label: 'Options & modifiers', noImport: true, wide: true },
      internalNotes,
    ],
  },
  room_services: {
    name: 'room_services',
    table: 'room_services',
    label: lbl('In-room service', 'In-room services', 'خدمة غرفة', 'خدمات الغرفة'),
    module: 'room_services',
    titleField: 'name',
    codePrefix: 'RS',
    imageField: 'image',
    fields: [
      name,
      description,
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: [...ROOM_SERVICE_CATEGORIES],
        default: 'housekeeping',
      },
      department('HOUSEKEEPING'),
      icon,
      img('service'),
      available,
      featured,
      badges,
      { key: 'response_minutes', type: 'number', label: 'Expected response (min)', min: 1, max: 1440 },
      { key: 'price', type: 'money', label: 'Charge (optional)' },
      { key: 'allow_quantity', type: 'boolean', label: 'Guest can choose quantity' },
      { key: 'max_quantity', type: 'number', label: 'Maximum quantity', min: 1, max: 50, showIf: { field: 'allow_quantity', in: [true] } },
      { key: 'note_prompt', type: 'i18n', label: 'Note placeholder', help: 'e.g. "Preferred time or details"' },
      hours,
      customFields,
      internalNotes,
    ],
  },
  hotel_services: {
    name: 'hotel_services',
    table: 'hotel_services',
    label: lbl('Guest service', 'Guest services', 'خدمة نزلاء', 'خدمات النزلاء'),
    module: 'hotel_services',
    titleField: 'name',
    codePrefix: 'GS',
    imageField: 'image',
    fields: [
      name,
      description,
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: [...HOTEL_SERVICE_CATEGORIES],
        default: 'concierge',
      },
      department('CONCIERGE'),
      icon,
      img('service'),
      available,
      featured,
      badges,
      { key: 'requestable', type: 'boolean', label: 'Guests can request it', help: 'Off = information only.', default: true },
      { key: 'price', type: 'money', label: 'Price (optional)' },
      { key: 'price_note', type: 'i18n', label: 'Price note', help: 'e.g. "per trip"' },
      { key: 'response_minutes', type: 'number', label: 'Expected response (min)', min: 1, max: 1440 },
      hours,
      customFields,
      internalNotes,
    ],
  },
  spa_categories: {
    name: 'spa_categories',
    table: 'spa_categories',
    label: lbl('Wellness category', 'Wellness categories', 'فئة عافية', 'فئات العافية'),
    module: 'spa',
    titleField: 'name',
    codePrefix: 'SPACAT',
    imageField: 'image',
    fields: [name, description, img('spa'), icon, featured, { ...hours, label: 'Operating hours' }],
  },
  spa_services: {
    name: 'spa_services',
    table: 'spa_services',
    label: lbl('Wellness service', 'Wellness services', 'خدمة عافية', 'خدمات العافية'),
    module: 'spa',
    parent: 'spa_categories',
    titleField: 'name',
    codePrefix: 'SPA',
    imageField: 'image',
    fields: [
      name,
      description,
      img('spa'),
      gallery('spa'),
      { key: 'duration_minutes', type: 'number', label: 'Duration (min)', min: 5, max: 600 },
      { key: 'price', type: 'money', label: 'Price' },
      {
        key: 'price_unit',
        type: 'select',
        label: 'Price unit',
        options: [o('per_person', 'Per person', 'للشخص'), o('per_session', 'Per session', 'للجلسة'), o('per_hour', 'Per hour', 'للساعة'), o('per_day', 'Per day', 'لليوم')],
        default: 'per_person',
      },
      { key: 'price_note', type: 'i18n', label: 'Price note', help: 'e.g. "Complimentary for in-house guests"' },
      available,
      featured,
      badges,
      { key: 'bookable', type: 'boolean', label: 'Guests can request a booking', default: true },
      { key: 'max_guests', type: 'number', label: 'Capacity (guests per booking)', min: 1, max: 50 },
      { key: 'instructions', type: 'i18nText', label: 'Booking / request instructions', wide: true },
      department('SPA'),
      hours,
      { ...customFields, key: 'booking_fields', label: 'Extra booking questions' },
      internalNotes,
    ],
  },
  laundry_categories: {
    name: 'laundry_categories',
    table: 'laundry_categories',
    label: lbl('Laundry category', 'Laundry categories', 'فئة غسيل', 'فئات الغسيل'),
    module: 'laundry',
    titleField: 'name',
    codePrefix: 'LCAT',
    imageField: 'image',
    fields: [
      name,
      description,
      img('laundry'),
      icon,
      { key: 'turnaround', type: 'i18n', label: 'Standard turnaround', help: 'e.g. "Same day if collected before 10:00"' },
      { key: 'express_turnaround', type: 'i18n', label: 'Express turnaround', help: 'e.g. "4 hours"' },
    ],
  },
  laundry_items: {
    name: 'laundry_items',
    table: 'laundry_items',
    label: lbl('Garment', 'Garments & prices', 'قطعة', 'القطع والأسعار'),
    module: 'laundry',
    parent: 'laundry_categories',
    titleField: 'name',
    codePrefix: 'LAUNDRY',
    imageField: 'image',
    fields: [
      name,
      { key: 'wash_price', type: 'money', label: 'Wash & press price' },
      { key: 'dry_clean_price', type: 'money', label: 'Dry-clean price' },
      { key: 'press_price', type: 'money', label: 'Press-only price' },
      { key: 'express_pct', type: 'number', label: 'Express surcharge %', min: 0, max: 300, help: 'Empty = express not offered' },
      available,
      icon,
      img('laundry'),
    ],
  },
  laundry_packages: {
    name: 'laundry_packages',
    table: 'laundry_packages',
    label: lbl('Laundry package', 'Laundry packages', 'باقة غسيل', 'باقات الغسيل'),
    module: 'laundry',
    titleField: 'name',
    codePrefix: 'LPKG',
    imageField: 'image',
    fields: [
      name,
      description,
      { key: 'price', type: 'money', label: 'Package price', required: true },
      { key: 'includes', type: 'i18nText', label: 'What is included', wide: true, help: 'e.g. "Up to 10 pieces, wash & press"' },
      img('laundry'),
      available,
      featured,
      badges,
      { key: 'starts_at', type: 'datetime', label: 'Starts' },
      { key: 'ends_at', type: 'datetime', label: 'Ends' },
    ],
  },
  info_items: {
    name: 'info_items',
    table: 'info_items',
    label: lbl('Information item', 'Hotel information & FAQ', 'معلومة', 'معلومات الفندق والأسئلة الشائعة'),
    module: 'hotel',
    titleField: 'title',
    codePrefix: 'INFO',
    imageField: 'image',
    fields: [
      { key: 'title', type: 'i18n', label: 'Title / question', required: true },
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: [...INFO_CATEGORIES],
        default: 'stay',
      },
      { key: 'highlight', type: 'i18n', label: 'Highlight value', help: 'Short value shown prominently, e.g. "15:00"' },
      { key: 'body', type: 'i18nText', label: 'Details / answer', wide: true },
      icon,
      img('service'),
      { key: 'link', type: 'url', label: 'Link (map, website…)' },
    ],
  },
};

export const ENTITY_SCHEMAS = Object.fromEntries(
  Object.values(ENTITIES).map((e) => [e.name, buildEntitySchema(e.fields)])
) as Record<EntityName, ReturnType<typeof buildEntitySchema>>;

export function isEntityName(v: string): v is EntityName {
  return (ENTITY_NAMES as readonly string[]).includes(v);
}

/** Direct children of an entity (for integrity checks and deep duplicate). */
export function childrenOf(name: EntityName): EntityName[] {
  return ENTITY_NAMES.filter((e) => ENTITIES[e].parent === name);
}

/** Keys that must never leave the admin API. */
export function privateKeys(name: EntityName): string[] {
  return ENTITIES[name].fields.filter((f) => f.private).map((f) => f.key);
}

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,63}$/;

export function makeCode(prefix: string, nameEn: string): string {
  const slug = nameEn
    .replace(/\[demo\]/gi, '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
    .slice(0, 48);
  return `${prefix}-${slug || 'X'}`;
}
