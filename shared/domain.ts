/**
 * Core domain vocabulary shared by the API server and the web client.
 * Changing a value here is a data migration: codes are persisted in Postgres.
 */

export const LANGS = ['en', 'ar'] as const;
export type Lang = (typeof LANGS)[number];

export const LANGUAGE_MODES = ['both', 'ar', 'en'] as const;
export type LanguageMode = (typeof LANGUAGE_MODES)[number];

// ---------------------------------------------------------------------------
// Departments (routing targets)
// ---------------------------------------------------------------------------
export const DEPARTMENTS = [
  'FNB',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'FRONT_OFFICE',
  'CONCIERGE',
  'LAUNDRY',
  'SPA',
  'MANAGEMENT',
  'FEEDBACK',
] as const;
export type DepartmentCode = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<DepartmentCode, { en: string; ar: string }> = {
  FNB: { en: 'Food & Beverage', ar: 'الأغذية والمشروبات' },
  HOUSEKEEPING: { en: 'Housekeeping', ar: 'التدبير المنزلي' },
  MAINTENANCE: { en: 'Maintenance', ar: 'الصيانة' },
  FRONT_OFFICE: { en: 'Front Office', ar: 'الاستقبال' },
  CONCIERGE: { en: 'Concierge', ar: 'الكونسيرج' },
  LAUNDRY: { en: 'Laundry', ar: 'المغسلة' },
  SPA: { en: 'Wellness & Spa', ar: 'السبا والعافية' },
  MANAGEMENT: { en: 'Management', ar: 'الإدارة' },
  FEEDBACK: { en: 'Complaints & Suggestions', ar: 'الشكاوى والاقتراحات' },
};

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------
export const ROLES = [
  'SUPER_ADMIN',
  'PLATFORM_FINANCE',
  'HOTEL_ADMIN',
  'HOTEL_FINANCE',
  'MANAGEMENT',
  'FNB',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'FRONT_OFFICE',
  'LAUNDRY',
  'SPA',
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  PLATFORM_FINANCE: 'Platform Finance',
  HOTEL_ADMIN: 'Hotel Admin',
  HOTEL_FINANCE: 'Hotel Finance',
  MANAGEMENT: 'Management',
  FNB: 'Food & Beverage',
  HOUSEKEEPING: 'Housekeeping',
  MAINTENANCE: 'Maintenance',
  FRONT_OFFICE: 'Front Office',
  LAUNDRY: 'Laundry',
  SPA: 'Spa',
};

/** Roles that see every hotel. */
export const GLOBAL_ROLES: readonly Role[] = ['SUPER_ADMIN', 'PLATFORM_FINANCE'];
/** Roles that may see guest phone numbers and names in order/finance views. */
export const PII_ROLES: readonly Role[] = ['SUPER_ADMIN', 'HOTEL_ADMIN', 'MANAGEMENT', 'FRONT_OFFICE', 'FNB', 'HOUSEKEEPING', 'MAINTENANCE', 'LAUNDRY', 'SPA'];

/** Departments whose requests a role can see and act on. */
export const ROLE_DEPARTMENTS: Record<Role, readonly DepartmentCode[]> = {
  SUPER_ADMIN: DEPARTMENTS,
  PLATFORM_FINANCE: DEPARTMENTS,
  HOTEL_ADMIN: DEPARTMENTS,
  HOTEL_FINANCE: DEPARTMENTS,
  MANAGEMENT: DEPARTMENTS,
  FNB: ['FNB'],
  HOUSEKEEPING: ['HOUSEKEEPING'],
  MAINTENANCE: ['MAINTENANCE'],
  FRONT_OFFICE: ['FRONT_OFFICE', 'CONCIERGE'],
  LAUNDRY: ['LAUNDRY'],
  SPA: ['SPA'],
};

/**
 * Admin modules. Every admin screen and every write endpoint is guarded by
 * exactly one module so the client navigation and server checks never drift.
 */
export const MODULES = [
  'dashboard',
  'requests',
  'hotel', // profile, branding, info, departments/routing, website, QR, media
  'offers',
  'dining',
  'room_services',
  'hotel_services',
  'spa',
  'laundry',
  'reviews',
  'users',
  'audit',
  'import',
  'guests', // guest CRM (personal data)
  'orders', // order records, search, reports
  'finance', // this hotel's ledger, settlements, commission (subject to hotel finance access)
  'commercial', // platform-wide: agreements, commission rules, all hotels' finance
] as const;
export type Module = (typeof MODULES)[number];

export const ROLE_MODULES: Record<Role, readonly Module[]> = {
  SUPER_ADMIN: MODULES,
  // Platform finance: every hotel's orders and money, no content, no guest CRM.
  PLATFORM_FINANCE: ['dashboard', 'orders', 'finance', 'commercial'],
  HOTEL_ADMIN: MODULES.filter((m) => m !== 'commercial'),
  HOTEL_FINANCE: ['dashboard', 'orders', 'finance'],
  MANAGEMENT: ['dashboard', 'requests', 'reviews', 'audit', 'guests', 'orders'],
  FNB: ['dashboard', 'requests', 'dining', 'offers', 'import'],
  HOUSEKEEPING: ['dashboard', 'requests', 'room_services', 'import'],
  MAINTENANCE: ['dashboard', 'requests', 'room_services'],
  FRONT_OFFICE: ['dashboard', 'requests', 'hotel_services', 'reviews', 'import', 'guests'],
  LAUNDRY: ['dashboard', 'requests', 'laundry', 'import'],
  SPA: ['dashboard', 'requests', 'spa', 'import'],
};

export function roleCan(role: Role, module: Module): boolean {
  return ROLE_MODULES[role].includes(module);
}

export function roleSeesDepartment(role: Role, dept: DepartmentCode): boolean {
  return ROLE_DEPARTMENTS[role].includes(dept);
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
export const REQUEST_TYPES = ['ORDER', 'ROOM_SERVICE', 'HOTEL_SERVICE', 'LAUNDRY', 'SPA', 'FEEDBACK'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_PREFIX: Record<RequestType, string> = {
  ORDER: 'ORD',
  ROOM_SERVICE: 'RS',
  HOTEL_SERVICE: 'HS',
  LAUNDRY: 'LDY',
  SPA: 'SPA',
  FEEDBACK: 'FBK',
};

export const REQUEST_TYPE_LABELS: Record<RequestType, { en: string; ar: string }> = {
  ORDER: { en: 'Food Order', ar: 'طلب طعام' },
  ROOM_SERVICE: { en: 'Room Service Request', ar: 'طلب خدمة غرفة' },
  HOTEL_SERVICE: { en: 'Hotel Service Request', ar: 'طلب خدمة فندقية' },
  LAUNDRY: { en: 'Laundry Pickup', ar: 'طلب مغسلة' },
  SPA: { en: 'Spa Booking Request', ar: 'طلب حجز سبا' },
  FEEDBACK: { en: 'Guest Feedback', ar: 'ملاحظات النزيل' },
};

export const REQUEST_STATUSES = ['NEW', 'ACCEPTED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, { en: string; ar: string }> = {
  NEW: { en: 'Received', ar: 'تم الاستلام' },
  ACCEPTED: { en: 'Accepted', ar: 'تم القبول' },
  IN_PROGRESS: { en: 'In progress', ar: 'قيد التنفيذ' },
  READY: { en: 'Ready', ar: 'جاهز' },
  COMPLETED: { en: 'Completed', ar: 'مكتمل' },
  REJECTED: { en: 'Declined', ar: 'مرفوض' },
  CANCELLED: { en: 'Cancelled', ar: 'ملغى' },
};

/** Allowed lifecycle transitions. Terminal states have no exits. */
export const STATUS_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  NEW: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'COMPLETED', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const OPEN_STATUSES: readonly RequestStatus[] = ['NEW', 'ACCEPTED', 'IN_PROGRESS', 'READY'];

export const FEEDBACK_TYPES = ['COMPLAINT', 'SUGGESTION', 'COMPLIMENT', 'SERVICE_RECOVERY'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, { en: string; ar: string }> = {
  COMPLAINT: { en: 'Complaint', ar: 'شكوى' },
  SUGGESTION: { en: 'Suggestion', ar: 'اقتراح' },
  COMPLIMENT: { en: 'Compliment', ar: 'إشادة' },
  SERVICE_RECOVERY: { en: 'Service recovery', ar: 'معالجة خدمة' },
};

/** Management-sensitive feedback goes to MANAGEMENT; the rest to FEEDBACK. */
export function feedbackDepartment(type: FeedbackType, urgency: Urgency): DepartmentCode {
  if (type === 'COMPLAINT' || type === 'SERVICE_RECOVERY' || urgency === 'HIGH') return 'MANAGEMENT';
  return 'FEEDBACK';
}

export const URGENCIES = ['LOW', 'NORMAL', 'HIGH'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const GUEST_TYPES = ['IN_HOUSE', 'EXTERNAL'] as const;
export type GuestType = (typeof GUEST_TYPES)[number];

export const LAUNDRY_SERVICES = ['wash', 'dry_clean', 'press'] as const;
export type LaundryService = (typeof LAUNDRY_SERVICES)[number];

export const LAUNDRY_SERVICE_LABELS: Record<LaundryService, { en: string; ar: string }> = {
  wash: { en: 'Wash & press', ar: 'غسيل وكي' },
  dry_clean: { en: 'Dry clean', ar: 'تنظيف جاف' },
  press: { en: 'Press only', ar: 'كي فقط' },
};

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'ARCHIVED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// ---------------------------------------------------------------------------
// Homepage / website manager
// ---------------------------------------------------------------------------
export const SECTION_TYPES = [
  'experiences',
  'offers',
  'quick_actions',
  'dining',
  'room_services',
  'wellness',
  'laundry',
  'hotel_services',
  'info',
  'gallery',
  'reviews',
  'contact',
  'custom',
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_LAYOUTS = ['carousel', 'grid', 'list', 'feature'] as const;
export type SectionLayout = (typeof SECTION_LAYOUTS)[number];

export const SECTION_BACKGROUNDS = ['default', 'muted', 'dark', 'brand'] as const;

/** Guest pages a CTA, quick action or nav item can point at. */
export const GUEST_PAGES = [
  'home',
  'dining',
  'room_services',
  'spa',
  'laundry',
  'services',
  'info',
  'feedback',
  'requests',
  'offers',
] as const;
export type GuestPage = (typeof GUEST_PAGES)[number];

export const GUEST_PAGE_LABELS: Record<GuestPage, { en: string; ar: string }> = {
  home: { en: 'Home', ar: 'الرئيسية' },
  dining: { en: 'Dining', ar: 'المطاعم' },
  room_services: { en: 'Room Services', ar: 'خدمات الغرفة' },
  spa: { en: 'Wellness & Spa', ar: 'السبا والعافية' },
  laundry: { en: 'Laundry', ar: 'المغسلة' },
  services: { en: 'Hotel Services', ar: 'خدمات الفندق' },
  info: { en: 'Hotel Information', ar: 'معلومات الفندق' },
  feedback: { en: 'Feedback', ar: 'الملاحظات' },
  requests: { en: 'My Requests', ar: 'طلباتي' },
  offers: { en: 'Offers', ar: 'العروض' },
};
