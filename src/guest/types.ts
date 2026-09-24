import type { CustomField, Hours, ModifierGroup } from '@shared/fields';
import type { Branding, HotelProfile, SiteConfig } from '@shared/hotel';

/** Catalog records are validated server-side; bilingual fields are `<key>_en` / `<key>_ar`. */
export interface Rec {
  id: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  [key: string]: unknown;
}

export interface Outlet extends Rec {
  type: string;
  logo: string;
  cover: string;
  hours: Hours;
  status_override: string;
  accepts_orders: boolean;
  room_delivery: boolean;
  external_orders: boolean;
  phone: string;
  has_whatsapp: boolean;
}

export interface MenuItem extends Rec {
  price: number;
  image: string;
  video: string;
  available: boolean;
  featured: boolean;
  recommended: boolean;
  calories: number | null;
  prep_minutes: number | null;
  spicy: string;
  allergens: string[];
  dietary: string[];
  modifiers: ModifierGroup[];
  vat_mode: 'inherit' | 'inclusive' | 'exclusive' | 'exempt';
  kind: string;
}

export interface MenuCategory extends Rec {
  image: string;
  items: MenuItem[];
}
export interface Menu extends Rec {
  categories: MenuCategory[];
  hours: Hours;
}

export interface ServiceRec extends Rec {
  icon: string;
  image: string;
  department: string;
  available: boolean;
  requestable?: boolean;
  response_minutes: number | null;
  price: number | null;
  allow_quantity?: boolean;
  max_quantity?: number | null;
  custom_fields?: CustomField[];
  booking_fields?: CustomField[];
  hours: Hours;
  category: string;
}

export interface SpaService extends ServiceRec {
  duration_minutes: number | null;
  bookable: boolean;
  max_guests: number | null;
}

export interface LaundryCategory extends Rec {
  turnaround_en?: string;
  turnaround_ar?: string;
  express_turnaround_en?: string;
  express_turnaround_ar?: string;
}

export interface LaundryPackage extends Rec {
  price: number;
  includes_en?: string;
  includes_ar?: string;
  available: boolean;
}

export interface LaundryItem extends Rec {
  available: boolean;
  wash_price: number | null;
  dry_clean_price: number | null;
  press_price: number | null;
  express_pct: number | null;
  image: string;
}

export interface PublicBundle {
  hotel: {
    id: string;
    slug: string;
    is_published: boolean;
    profile: HotelProfile;
    branding: Branding;
    settings: { reviews_enabled: boolean; external_guests_enabled: boolean; require_phone: boolean; emergency_phone: string };
  };
  site: SiteConfig;
  departments: { code: string; name_en: string; name_ar: string; phone: string; has_whatsapp: boolean }[];
  catalog: {
    /** Homepage discovery tiles (may be empty — tiles are then derived). */
    experiences: Rec[];
    /** Merchandised menu items with their outlet_id. */
    featured_items: Rec[];
    offers: Rec[];
    quick_actions: Rec[];
    outlets: Outlet[];
    room_services: ServiceRec[];
    hotel_services: ServiceRec[];
    spa_categories: ServiceRec[];
    spa_services: SpaService[];
    laundry_categories: LaundryCategory[];
    laundry_items: LaundryItem[];
    laundry_packages: LaundryPackage[];
    info_items: Rec[];
  };
  preview: boolean;
  /** Published content version (null in staff preview). */
  version: number | null;
  generated_at: string;
}

export interface CreatedRequest {
  id: string;
  reference: string;
  status: string;
  department: string;
  whatsapp_url: string | null;
  totals: { subtotal: number; vat: number; total: number } | null;
  created_at: string;
}

export interface GuestRequestRow {
  id: string;
  reference: string;
  type: string;
  department: string;
  status: string;
  title_en: string;
  title_ar: string;
  room: string;
  lines: { quantity?: number; name_en: string; name_ar: string; detail_en?: string; detail_ar?: string; amount?: number }[];
  details: Record<string, unknown>;
  notes: string;
  total: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}
