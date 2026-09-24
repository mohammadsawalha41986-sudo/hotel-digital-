import { DEPARTMENTS, DEPARTMENT_LABELS, GUEST_PAGES, GUEST_PAGE_LABELS, type Module } from './domain';
import {
  ALLERGENS,
  DIETARY,
  ICON_OPTIONS,
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
 * hotel-isolated CRUD surface over these; the admin renders forms from them.
 */
export interface EntityDef {
  name: EntityName;
  table: string;
  label: { singular: string; plural: string };
  module: Module;
  /** Parent entity (FK column `parent_id` must reference a row of this entity in the same hotel). */
  parent?: EntityName;
  fields: readonly FieldSpec[];
  /** Whether spreadsheet import/export is offered. */
  importable: boolean;
  /** Field used as the display title. Always an i18n field. */
  titleField: string;
}

export const ENTITY_NAMES = [
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
  'laundry_items',
  'info_items',
] as const;
export type EntityName = (typeof ENTITY_NAMES)[number];

const o = (value: string, en: string, ar: string): FieldOption => ({ value, en, ar });
const deptOptions = DEPARTMENTS.map((d) => o(d, DEPARTMENT_LABELS[d].en, DEPARTMENT_LABELS[d].ar));
const pageOptions = GUEST_PAGES.map((p) => o(p, GUEST_PAGE_LABELS[p].en, GUEST_PAGE_LABELS[p].ar));

const name: FieldSpec = { key: 'name', type: 'i18n', label: 'Name', required: true };
const description: FieldSpec = { key: 'description', type: 'i18nText', label: 'Description', wide: true };
const image: FieldSpec = { key: 'image', type: 'media', label: 'Image' };
const icon: FieldSpec = { key: 'icon', type: 'icon', label: 'Icon', options: ICON_OPTIONS, default: 'sparkles' };
const hours: FieldSpec = { key: 'hours', type: 'hours', label: 'Availability hours', noImport: true, wide: true };
const available: FieldSpec = {
  key: 'available',
  type: 'boolean',
  label: 'Currently available',
  help: 'Turn off to show the item as unavailable without hiding it.',
  default: true,
};
const customFields: FieldSpec = {
  key: 'custom_fields',
  type: 'customFields',
  label: 'Extra questions for the guest',
  noImport: true,
  wide: true,
};

export const ENTITIES: Record<EntityName, EntityDef> = {
  offers: {
    name: 'offers',
    table: 'offers',
    label: { singular: 'Offer', plural: 'Offers' },
    module: 'offers',
    importable: false,
    titleField: 'title',
    fields: [
      { key: 'title', type: 'i18n', label: 'Title', required: true },
      { key: 'subtitle', type: 'i18n', label: 'Subtitle' },
      description,
      { key: 'image', type: 'media', label: 'Image', help: 'Wide image, at least 1600×900 px' },
      { key: 'video', type: 'video', label: 'Video URL (optional)' },
      { key: 'badge', type: 'i18n', label: 'Badge', help: 'e.g. "Limited time"' },
      { key: 'price_label', type: 'i18n', label: 'Price label', help: 'e.g. "SAR 89 per person"' },
      { key: 'cta_label', type: 'i18n', label: 'Button label' },
      { key: 'cta_page', type: 'select', label: 'Button opens', options: [o('none', 'Nothing', 'لا شيء'), ...pageOptions], default: 'none' },
      { key: 'cta_outlet_id', type: 'ref', label: 'Specific outlet', refEntity: 'outlets', showIf: { field: 'cta_page', in: ['dining'] } },
      {
        key: 'placement',
        type: 'tags',
        label: 'Show on',
        options: [o('home', 'Homepage', 'الرئيسية'), o('dining', 'Dining', 'المطاعم'), o('spa', 'Spa', 'السبا')],
        default: ['home'],
      },
      { key: 'starts_at', type: 'datetime', label: 'Starts' },
      { key: 'ends_at', type: 'datetime', label: 'Ends' },
    ],
  },
  quick_actions: {
    name: 'quick_actions',
    table: 'quick_actions',
    label: { singular: 'Quick action', plural: 'Quick actions' },
    module: 'hotel',
    importable: false,
    titleField: 'label',
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
      { key: 'department', type: 'select', label: 'Department', options: deptOptions, default: 'FRONT_OFFICE', showIf: { field: 'action', in: ['call', 'whatsapp'] } },
      { key: 'emphasis', type: 'boolean', label: 'Highlight (emergency / priority)' },
    ],
  },
  outlets: {
    name: 'outlets',
    table: 'outlets',
    label: { singular: 'Outlet', plural: 'Outlets' },
    module: 'dining',
    importable: false,
    titleField: 'name',
    fields: [
      name,
      { key: 'type', type: 'select', label: 'Type', options: OUTLET_TYPES, default: 'restaurant' },
      { key: 'tagline', type: 'i18n', label: 'Tagline' },
      description,
      { key: 'logo', type: 'media', label: 'Logo' },
      { key: 'cover', type: 'media', label: 'Cover image' },
      { key: 'location', type: 'i18n', label: 'Location in hotel', help: 'e.g. "Lobby level"' },
      { key: 'phone', type: 'phone', label: 'Phone / extension' },
      { key: 'whatsapp', type: 'phone', label: 'WhatsApp override', help: 'Leave empty to use the F&B department number.' },
      { key: 'status_override', type: 'select', label: 'Status', options: STATUS_OVERRIDES, default: 'auto' },
      hours,
      { key: 'accepts_orders', type: 'boolean', label: 'Guests can order from the menu', default: true },
      { key: 'room_delivery', type: 'boolean', label: 'Delivers to rooms', default: false },
      { key: 'external_orders', type: 'boolean', label: 'External visitors can order', default: true },
    ],
  },
  menus: {
    name: 'menus',
    table: 'menus',
    label: { singular: 'Menu', plural: 'Menus' },
    module: 'dining',
    parent: 'outlets',
    importable: true,
    titleField: 'name',
    fields: [name, description, { ...hours, label: 'Served during (optional)' }],
  },
  menu_categories: {
    name: 'menu_categories',
    table: 'menu_categories',
    label: { singular: 'Category', plural: 'Categories' },
    module: 'dining',
    parent: 'menus',
    importable: true,
    titleField: 'name',
    fields: [name, description, image],
  },
  menu_items: {
    name: 'menu_items',
    table: 'menu_items',
    label: { singular: 'Menu item', plural: 'Menu items' },
    module: 'dining',
    parent: 'menu_categories',
    importable: true,
    titleField: 'name',
    fields: [
      name,
      description,
      { key: 'price', type: 'money', label: 'Price', required: true },
      { key: 'vat_mode', type: 'select', label: 'VAT', options: VAT_MODES, default: 'inherit' },
      image,
      { key: 'video', type: 'video', label: 'Video URL' },
      available,
      { key: 'kind', type: 'select', label: 'Item type', options: [o('item', 'Single item', 'صنف'), o('combo', 'Combo / set', 'وجبة كومبو')], default: 'item' },
      { key: 'featured', type: 'boolean', label: 'Featured' },
      { key: 'recommended', type: 'boolean', label: "Chef's recommendation" },
      { key: 'calories', type: 'number', label: 'Calories (kcal)', min: 0, max: 10000 },
      { key: 'prep_minutes', type: 'number', label: 'Preparation time (min)', min: 0, max: 600 },
      { key: 'spicy', type: 'select', label: 'Spiciness', options: SPICY_LEVELS, default: '0' },
      { key: 'allergens', type: 'tags', label: 'Allergens', options: ALLERGENS },
      { key: 'dietary', type: 'tags', label: 'Dietary labels', options: DIETARY },
      { key: 'modifiers', type: 'modifiers', label: 'Options & modifiers', noImport: true, wide: true },
    ],
  },
  room_services: {
    name: 'room_services',
    table: 'room_services',
    label: { singular: 'Room service', plural: 'Room services' },
    module: 'room_services',
    importable: true,
    titleField: 'name',
    fields: [
      name,
      description,
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: [
          o('housekeeping', 'Housekeeping', 'التدبير المنزلي'),
          o('amenities', 'Amenities', 'المستلزمات'),
          o('maintenance', 'Maintenance', 'الصيانة'),
          o('assistance', 'Assistance', 'المساعدة'),
          o('other', 'Other', 'أخرى'),
        ],
        default: 'housekeeping',
      },
      { key: 'department', type: 'department', label: 'Routed to', options: deptOptions, default: 'HOUSEKEEPING' },
      icon,
      image,
      available,
      { key: 'response_minutes', type: 'number', label: 'Expected response (min)', min: 1, max: 1440 },
      { key: 'price', type: 'money', label: 'Charge (optional)' },
      { key: 'allow_quantity', type: 'boolean', label: 'Guest can choose quantity' },
      { key: 'max_quantity', type: 'number', label: 'Maximum quantity', min: 1, max: 50, showIf: { field: 'allow_quantity', in: [true] } },
      { key: 'note_prompt', type: 'i18n', label: 'Note placeholder', help: 'e.g. "Preferred time or details"' },
      hours,
      customFields,
    ],
  },
  hotel_services: {
    name: 'hotel_services',
    table: 'hotel_services',
    label: { singular: 'Hotel service', plural: 'Hotel services' },
    module: 'hotel_services',
    importable: true,
    titleField: 'name',
    fields: [
      name,
      description,
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: [
          o('transport', 'Transport', 'التنقل'),
          o('concierge', 'Concierge', 'الكونسيرج'),
          o('business', 'Business', 'الأعمال'),
          o('accessibility', 'Accessibility', 'إمكانية الوصول'),
          o('facilities', 'Facilities', 'المرافق'),
          o('other', 'Other', 'أخرى'),
        ],
        default: 'concierge',
      },
      { key: 'department', type: 'department', label: 'Routed to', options: deptOptions, default: 'CONCIERGE' },
      icon,
      image,
      available,
      { key: 'requestable', type: 'boolean', label: 'Guests can request it', help: 'Off = information only.', default: true },
      { key: 'price', type: 'money', label: 'Price (optional)' },
      { key: 'price_note', type: 'i18n', label: 'Price note', help: 'e.g. "per trip"' },
      { key: 'response_minutes', type: 'number', label: 'Expected response (min)', min: 1, max: 1440 },
      hours,
      customFields,
    ],
  },
  spa_categories: {
    name: 'spa_categories',
    table: 'spa_categories',
    label: { singular: 'Wellness category', plural: 'Wellness categories' },
    module: 'spa',
    importable: true,
    titleField: 'name',
    fields: [name, description, image, icon, { ...hours, label: 'Operating hours' }],
  },
  spa_services: {
    name: 'spa_services',
    table: 'spa_services',
    label: { singular: 'Wellness service', plural: 'Wellness services' },
    module: 'spa',
    parent: 'spa_categories',
    importable: true,
    titleField: 'name',
    fields: [
      name,
      description,
      image,
      { key: 'duration_minutes', type: 'number', label: 'Duration (min)', min: 5, max: 600 },
      { key: 'price', type: 'money', label: 'Price' },
      { key: 'price_note', type: 'i18n', label: 'Price note', help: 'e.g. "Complimentary for in-house guests"' },
      available,
      { key: 'bookable', type: 'boolean', label: 'Guests can request a booking', default: true },
      { key: 'max_guests', type: 'number', label: 'Max guests per booking', min: 1, max: 20 },
      hours,
      { ...customFields, key: 'booking_fields', label: 'Extra booking questions' },
    ],
  },
  laundry_items: {
    name: 'laundry_items',
    table: 'laundry_items',
    label: { singular: 'Laundry item', plural: 'Laundry items' },
    module: 'laundry',
    importable: true,
    titleField: 'name',
    fields: [
      name,
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: [
          o('gentlemen', 'Gentlemen', 'الرجال'),
          o('ladies', 'Ladies', 'السيدات'),
          o('children', 'Children', 'الأطفال'),
          o('traditional', 'Traditional wear', 'الملابس التقليدية'),
          o('household', 'Household', 'المنزلية'),
          o('other', 'Other', 'أخرى'),
        ],
        default: 'gentlemen',
      },
      { key: 'wash_price', type: 'money', label: 'Wash & press price' },
      { key: 'dry_clean_price', type: 'money', label: 'Dry-clean price' },
      { key: 'press_price', type: 'money', label: 'Press-only price' },
      { key: 'express_pct', type: 'number', label: 'Express surcharge %', min: 0, max: 300, help: 'Empty = express not offered' },
      image,
    ],
  },
  info_items: {
    name: 'info_items',
    table: 'info_items',
    label: { singular: 'Information item', plural: 'Guest information' },
    module: 'hotel',
    importable: false,
    titleField: 'title',
    fields: [
      { key: 'title', type: 'i18n', label: 'Title', required: true },
      {
        key: 'category',
        type: 'select',
        label: 'Category',
        options: [
          o('stay', 'Your stay', 'إقامتك'),
          o('dining', 'Dining hours', 'مواعيد المطاعم'),
          o('facilities', 'Facilities', 'المرافق'),
          o('connectivity', 'Wi-Fi & connectivity', 'الإنترنت'),
          o('policies', 'Policies', 'السياسات'),
          o('prayer', 'Prayer', 'الصلاة'),
          o('emergency', 'Emergency', 'الطوارئ'),
          o('nearby', 'Nearby', 'بالقرب منك'),
          o('other', 'Other', 'أخرى'),
        ],
        default: 'stay',
      },
      { key: 'highlight', type: 'i18n', label: 'Highlight value', help: 'Short value shown prominently, e.g. "15:00"' },
      { key: 'body', type: 'i18nText', label: 'Details', wide: true },
      icon,
      image,
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

/** Importable entities in dependency order (parents before children). */
export const IMPORT_ORDER: EntityName[] = [
  'menus',
  'menu_categories',
  'menu_items',
  'room_services',
  'hotel_services',
  'spa_categories',
  'spa_services',
  'laundry_items',
];

/** Workbooks offered to staff. Each sheet maps to one entity. */
export const IMPORT_WORKBOOKS: Record<string, { label: string; entities: EntityName[] }> = {
  menu: { label: 'Menus, categories & items', entities: ['menus', 'menu_categories', 'menu_items'] },
  room_services: { label: 'Room services', entities: ['room_services'] },
  hotel_services: { label: 'Hotel services', entities: ['hotel_services'] },
  spa: { label: 'Wellness & spa', entities: ['spa_categories', 'spa_services'] },
  laundry: { label: 'Laundry price list', entities: ['laundry_items'] },
};
