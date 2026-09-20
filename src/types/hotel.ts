export type Language = 'en' | 'ar';

export interface HotelBranding {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  button: string;
  radius: string;
}

export interface HotelTypography {
  arHeadingFont: string;
  arBodyFont: string;
  enHeadingFont: string;
  enBodyFont: string;
}

export interface HotelDepartment {
  id: string;
  name_en: string;
  name_ar: string;
  code: 'rooms' | 'dining' | 'wellness' | 'concierge' | 'housekeeping' | 'engineering' | 'valet';
  phone: string;
  whatsapp_number: string;
  email: string;
  sla_target: string;
  is_active: boolean;
  department_cover_image?: string;
  department_mobile_image?: string;
  department_gallery?: string[];
}

export interface HotelPolicy {
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy_en: string;
  cancellationPolicy_ar: string;
  smokingPolicy_en: string;
  smokingPolicy_ar: string;
  wifiSsid: string;
  wifiPassword?: string;
  parkingInfo_en: string;
  parkingInfo_ar: string;
}

export interface AmenityItem {
  id: string;
  name_en: string;
  name_ar: string;
  icon: string;
  category?: 'comfort' | 'bathroom' | 'technology' | 'dining' | 'view';
}

export interface RoomType {
  id: string;
  hotel_id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  category_en: string;
  category_ar: string;
  description_en: string;
  description_ar: string;
  size_sqm: number;
  bed_type_en: string;
  bed_type_ar: string;
  occupancy: {
    adults: number;
    children: number;
    max_guests: number;
  };
  view_en: string;
  view_ar: string;
  smoking_policy_en: string;
  smoking_policy_ar: string;
  breakfast_included: boolean;
  breakfast_info_en: string;
  breakfast_info_ar: string;
  base_price: number;
  old_price?: number;
  offer_price?: number;
  offer_badge_en?: string;
  offer_badge_ar?: string;
  currency: string;
  images: string[];
  amenities: AmenityItem[];
  features_en: string[];
  features_ar: string[];
  available_count: number;
  rating?: number;
  reviews_count?: number;
}

export type OfferDepartment = 'rooms' | 'restaurant' | 'cafe' | 'room_service' | 'health_club' | 'laundry' | 'seasonal';

export interface HotelOffer {
  id: string;
  hotel_id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  department: OfferDepartment;
  original_price: number;
  offer_price: number;
  currency: string;
  valid_until: string;
  badge_en: string;
  badge_ar: string;
  image_url: string;
  gallery?: string[];
  terms_en: string;
  terms_ar: string;
  target_action?: 'book_room' | 'reserve_dining' | 'book_spa' | 'request_service';
  room_id?: string;
  is_active: boolean;
  cta_text_en?: string;
  cta_text_ar?: string;
  is_featured?: boolean;
  sort_order?: number;
}

export interface HotelReview {
  id: string;
  hotel_id: string;
  guest_name: string;
  rating: number; // 1 to 5
  review_text_en: string;
  review_text_ar: string;
  date: string;
  source?: string; // e.g. "Google Reviews", "Verified Stay"
  is_verified: boolean;
}

export interface DiningVenue {
  id: string;
  hotel_id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  type_en: string;
  type_ar: string;
  cuisine_en: string;
  cuisine_ar: string;
  description_en: string;
  description_ar: string;
  opening_hours_en: string;
  opening_hours_ar: string;
  dress_code_en: string;
  dress_code_ar: string;
  image_url: string;
  menu_highlights_en: string[];
  menu_highlights_ar: string[];
  is_room_service_capable: boolean;
  whatsapp_ordering: boolean;
}

export interface WellnessFacility {
  id: string;
  hotel_id: string;
  name_en: string;
  name_ar: string;
  type_en: string;
  type_ar: string;
  description_en: string;
  description_ar: string;
  hours_en: string;
  hours_ar: string;
  image_url: string;
  signature_treatments_en: string[];
  signature_treatments_ar: string[];
  price_from?: number;
  currency: string;
}

export interface HotelServiceCatalogItem {
  id: string;
  hotel_id: string;
  department_code: 'concierge' | 'housekeeping' | 'engineering' | 'valet' | 'laundry';
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  sla_target: string;
  price_display?: string;
  badge_en?: string;
  badge_ar?: string;
  is_free: boolean;
}

export type PortalSectionCode =
  | 'hero'
  | 'offers'
  | 'rooms'
  | 'dining'
  | 'wellness'
  | 'room_service_cafe'
  | 'services'
  | 'info'
  | 'contact'
  | 'custom';

export interface PortalSectionConfig {
  id: string;
  code: PortalSectionCode;
  title_en: string;
  title_ar: string;
  is_enabled: boolean;
  order: number;
  custom_content_en?: string;
  custom_content_ar?: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  image_url?: string;
  badge_en?: string;
  badge_ar?: string;
  cta_label_en?: string;
  cta_label_ar?: string;
  cta_url?: string;
}

export interface PortalNavigationItem {
  id: string;
  label_en: string;
  label_ar: string;
  target_section: string;
  is_enabled: boolean;
  order: number;
}

export interface HotelPortalConfig {
  sections: PortalSectionConfig[];
  navigation_items: PortalNavigationItem[];
  custom_sections?: PortalSectionConfig[];
  announcement_banner?: {
    enabled: boolean;
    text_en: string;
    text_ar: string;
    type: 'info' | 'promo' | 'alert';
  };
  hero_custom?: {
    headline_en?: string;
    headline_ar?: string;
    sub_en?: string;
    sub_ar?: string;
    bg_url?: string;
    cta_en?: string;
    cta_ar?: string;
    cta_target?: string;
  };
}

export interface Hotel {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  tagline_en: string;
  tagline_ar: string;
  description_en: string;
  description_ar: string;
  classification_stars: number;
  classification_label_en: string;
  classification_label_ar: string;
  logo_url: string;
  favicon_url: string;
  hero_images: {
    url: string;
    caption_en: string;
    caption_ar: string;
    tag_en: string;
    tag_ar: string;
  }[];
  address_en: string;
  address_ar: string;
  city_en: string;
  city_ar: string;
  country_en: string;
  country_ar: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  branding: HotelBranding;
  typography: HotelTypography;
  portal_config?: HotelPortalConfig;
  departments: HotelDepartment[];
  policies: HotelPolicy;
  rooms: RoomType[];
  offers: HotelOffer[];
  reviews?: HotelReview[];
  diningVenues: DiningVenue[];
  wellnessFacilities: WellnessFacility[];
  services: HotelServiceCatalogItem[];
  currency: string;
  is_published: boolean;
  general_guest_whatsapp?: string;
  show_room_price?: boolean;
  default_language?: 'en' | 'ar';
  enabled_languages?: ('en' | 'ar')[];
  google_maps_url?: string;
  latitude?: number;
  longitude?: number;
  website_url?: string;
  timezone?: string;
  wifi_name?: string;
  wifi_password?: string;
  wifi_public_enabled?: boolean;
  social_links?: HotelSocialLinks;
  check_in_time?: string;
  check_out_time?: string;
}

export interface HotelSocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  snapchat?: string;
  linkedin?: string;
  youtube?: string;
}

export interface RoomBookingRequest {
  id: string; // generated ref e.g. BK-2026-8914
  hotel_id: string;
  room_id: string;
  room_name_en: string;
  room_name_ar: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  num_rooms: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests: string;
  estimated_total: number;
  currency: string;
  room_number_context?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  created_at: string;
}
