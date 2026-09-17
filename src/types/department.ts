import { HotelOffer } from './hotel';

export type AudienceType = 'PUBLIC' | 'IN_HOUSE' | 'BOTH';

export interface OpeningPeriod {
  name_en: string;
  name_ar: string;
  time_en: string;
  time_ar: string;
  isOpenNow?: boolean;
}

export interface OperatingInfo {
  opening_hours_en: string;
  opening_hours_ar: string;
  periods: OpeningPeriod[];
  closed_days_en?: string[];
  closed_days_ar?: string[];
  status_override?: 'open' | 'closed';
}

export interface DepartmentContact {
  id: string;
  department_code:
    | 'front_office'
    | 'reservations'
    | 'food_and_beverage'
    | 'restaurant'
    | 'cafe'
    | 'room_service'
    | 'mini_bar'
    | 'wellness'
    | 'spa'
    | 'health_club'
    | 'housekeeping'
    | 'laundry'
    | 'engineering'
    | 'concierge';
  name_en: string;
  name_ar: string;
  phone: string;
  extension: string;
  whatsapp_number: string;
  whatsapp_enabled: boolean;
  default_message_en: string;
  default_message_ar: string;
  email?: string;
  hours_en: string;
  hours_ar: string;
  is_active: boolean;
}

export interface OutletLocation {
  building_en: string;
  building_ar: string;
  floor_en: string;
  floor_ar: string;
  wing_en?: string;
  wing_ar?: string;
  area_en?: string;
  area_ar?: string;
  internal_text_en: string;
  internal_text_ar: string;
}

export type FBOutletType =
  | 'restaurant'
  | 'cafe'
  | 'lobby_lounge'
  | 'shisha'
  | 'room_service'
  | 'mini_bar'
  | 'pool_bar'
  | 'banquet';

export interface ItemOptionChoice {
  id: string;
  name_en: string;
  name_ar: string;
  price_delta: number;
  is_default?: boolean;
}

export interface ItemOptionGroup {
  id: string;
  title_en: string;
  title_ar: string;
  type: 'single' | 'multiple';
  is_required: boolean;
  min_selection?: number;
  max_selection?: number;
  options: ItemOptionChoice[];
}

export interface MenuItem {
  id: string;
  item_code: string;
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  image: string;
  gallery?: string[];
  price: number;
  old_price?: number;
  offer_price?: number;
  currency: string;
  calories?: number;
  preparation_time_en?: string;
  preparation_time_ar?: string;
  allergens?: string[];
  is_vegetarian?: boolean;
  is_spicy?: boolean;
  is_featured?: boolean;
  is_recommended?: boolean;
  is_chef_choice?: boolean;
  is_available: boolean;
  is_sold_out?: boolean;
  sort_order: number;
  option_groups?: ItemOptionGroup[];
}

export interface MenuCategory {
  id: string;
  outlet_id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  image?: string;
  is_active: boolean;
  sort_order: number;
  items?: MenuItem[];
}

export interface FBOutlet {
  id: string;
  hotel_id: string;
  outlet_code: string;
  slug: string;
  outlet_type: FBOutletType;
  name_en: string;
  name_ar: string;
  short_description_en: string;
  short_description_ar: string;
  full_description_en: string;
  full_description_ar: string;
  hero_image: string;
  mobile_hero_image?: string;
  gallery: string[];
  cuisine_en?: string;
  cuisine_ar?: string;
  dress_code_en?: string;
  dress_code_ar?: string;
  location: OutletLocation;
  operating_info: OperatingInfo;
  contact: {
    phone: string;
    extension: string;
    whatsapp_number: string;
    whatsapp_enabled: boolean;
    default_message_en: string;
    default_message_ar: string;
    email?: string;
  };
  audience: AudienceType;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
  featured_offer?: HotelOffer;
  menu_categories: MenuCategory[];
  featured_items?: MenuItem[];

  // Normalized / direct access convenience fields
  type?: FBOutletType;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  image?: string;
  openingHours?: string;
  locationAr?: string;
  locationEn?: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  active?: boolean;
  featured?: boolean;
  offersEnabled?: boolean;
  menuEnabled?: boolean;
}

export interface FBDiningOffer {
  id: string;
  hotelId: string;
  outletId: string;
  outletNameEn: string;
  outletNameAr: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  image: string;
  price?: number;
  pricePrefixEn?: string;
  pricePrefixAr?: string;
  currency?: string;
  validFrom?: string;
  validUntil?: string;
  badgeEn: string;
  badgeAr: string;
  ctaLabelAr?: string;
  ctaLabelEn?: string;
  ctaType?: 'view_offer' | 'explore_outlet' | 'view_menu' | 'whatsapp';
  active: boolean;
  featured?: boolean;
  sortOrder?: number;
}

export interface SelectedOptionDetail {
  group_id: string;
  group_title: string;
  choice_id: string;
  choice_name: string;
  price_delta: number;
}

export interface OrderBasketItem {
  id: string; // unique basket item id
  menu_item_id: string;
  item_code: string;
  name_en: string;
  name_ar: string;
  unit_price: number;
  quantity: number;
  selected_options: SelectedOptionDetail[];
  notes?: string;
  total_price: number;
}

export interface OrderBasket {
  outlet_id: string;
  outlet_name_en: string;
  outlet_name_ar: string;
  items: OrderBasketItem[];
  subtotal: number;
  discount: number;
  vat: number; // 15% VAT display
  estimated_total: number;
  delivery_notes?: string;
  room_number?: string;
}

export type WellnessServiceType =
  | 'health_club'
  | 'spa'
  | 'massage'
  | 'gym'
  | 'pool'
  | 'sauna'
  | 'steam'
  | 'other';

export interface WellnessService {
  id: string;
  hotel_id: string;
  service_code: string;
  slug: string;
  service_type: WellnessServiceType;
  name_en: string;
  name_ar: string;
  short_description_en: string;
  short_description_ar: string;
  full_description_en: string;
  full_description_ar: string;
  hero_image: string;
  gallery: string[];
  location: OutletLocation;
  operating_info: OperatingInfo;
  contact: {
    phone: string;
    extension: string;
    whatsapp_number: string;
    whatsapp_enabled: boolean;
    default_message_en: string;
    default_message_ar: string;
  };
  price: number;
  offer_price?: number;
  currency: string;
  duration_minutes?: number;
  availability_en: string;
  availability_ar: string;
  capacity?: number;
  rules_en?: string[];
  rules_ar?: string[];
  booking_enabled: boolean;
  audience: AudienceType;
  is_active: boolean;
  sort_order: number;
  featured_offer?: HotelOffer;
}

export interface WellnessBookingRequest {
  id: string; // SPA-2026-xxxxx
  hotel_id: string;
  service_id: string;
  service_name_en: string;
  service_name_ar: string;
  date: string;
  time: string;
  guests_count: number;
  guest_name: string;
  guest_mobile: string;
  room_number?: string;
  notes?: string;
  estimated_price: number;
  currency: string;
  status: 'pending' | 'confirmed';
  created_at: string;
}

export interface LaundryItemPrice {
  wash: number;
  dry_clean: number;
  press: number;
  wash_press: number;
  express_surcharge: number;
}

export interface LaundryCatalogItem {
  id: string;
  item_code: string;
  name_en: string;
  name_ar: string;
  category_en: string;
  category_ar: string;
  icon: string;
  prices: LaundryItemPrice;
  is_active: boolean;
  sort_order: number;
}

export type LaundryServiceType = 'wash' | 'dry_clean' | 'press' | 'wash_press';

export interface LaundryBasketItem {
  id: string;
  item_id: string;
  name_en: string;
  name_ar: string;
  service_type: LaundryServiceType;
  quantity: number;
  unit_price: number;
  is_express: boolean;
  total_price: number;
}

export interface LaundryOrderRequest {
  id: string; // LND-2026-xxxxx
  hotel_id: string;
  items: LaundryBasketItem[];
  pickup_date: string;
  pickup_time_slot: string;
  is_express: boolean;
  room_number: string;
  guest_name: string;
  guest_mobile: string;
  special_instructions?: string;
  subtotal: number;
  express_surcharge_total: number;
  estimated_total: number;
  currency: string;
  status: 'scheduled' | 'collected' | 'processing' | 'delivered';
  created_at: string;
}

export type GuestServiceDepartment =
  | 'housekeeping'
  | 'engineering'
  | 'concierge'
  | 'front_office'
  | 'connectivity';

export interface GuestServiceCatalogItem {
  id: string;
  hotel_id: string;
  service_code: string;
  department: GuestServiceDepartment;
  category_en: string;
  category_ar: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  image?: string;
  responsible_department_en: string;
  responsible_department_ar: string;
  sla_target_en: string;
  sla_target_ar: string;
  phone: string;
  extension: string;
  whatsapp_number: string;
  requires_quantity: boolean;
  requires_date: boolean;
  requires_time: boolean;
  requires_notes: boolean;
  audience: AudienceType;
  is_free: boolean;
  price_display?: string;
  is_active: boolean;
  sort_order: number;
}

export interface GuestServiceRequest {
  id: string; // SRV-2026-xxxxx
  hotel_id: string;
  service_id: string;
  service_title_en: string;
  service_title_ar: string;
  department: GuestServiceDepartment;
  quantity?: number;
  preferred_time?: string;
  room_number: string;
  guest_name?: string;
  notes?: string;
  status: 'dispatched' | 'in_progress' | 'completed';
  created_at: string;
}

// Navigation & URL Routing state representation
export type TopLevelDepartment =
  | 'overview'
  | 'stay'
  | 'dining'
  | 'wellness'
  | 'laundry'
  | 'services'
  | 'offers';

export interface DepartmentRouteState {
  department: TopLevelDepartment;
  outletSlug?: string;
  serviceSlug?: string;
  subSection?: string;
  itemSlug?: string;
}
