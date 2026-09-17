export type OperationalStatus =
  | 'NEW'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'PREPARING'
  | 'READY'
  | 'ON_THE_WAY'
  | 'COMPLETED'
  | 'CANCELLED';

export type OperationalRequestStatus = OperationalStatus;

export type RequestDepartment =
  | 'fnb'
  | 'spa'
  | 'laundry'
  | 'guest_services'
  | 'housekeeping'
  | 'engineering'
  | 'dining_reservation';

export interface RequestItemSummary {
  id: string;
  name_en: string;
  name_ar: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options?: string;
  notes?: string;
}

export interface RequestServiceSummary {
  id: string;
  name_en: string;
  name_ar: string;
  date?: string;
  time?: string;
  guests_count?: number;
  price?: number;
}

export interface OperationalRequest {
  id: string; // e.g. FNB-10294, SPA-39201, LDY-84920, GST-29401, HKP-59201, ENG-10293
  hotel_id: string;
  hotel_name_en: string;
  hotel_name_ar: string;
  department: RequestDepartment;
  department_name_en: string;
  department_name_ar: string;
  outlet_or_service_name_en: string;
  outlet_or_service_name_ar: string;
  customer_type: 'IN_HOUSE' | 'EXTERNAL';
  room_number: string;
  guest_name: string;
  guest_phone: string;
  items?: RequestItemSummary[];
  services?: RequestServiceSummary[];
  estimated_total: number;
  currency: string;
  notes?: string;
  target_whatsapp: string;
  whatsapp_message_en: string;
  whatsapp_message_ar: string;
  status: OperationalStatus;
  assigned_staff?: string;
  created_at: string;
  updated_at: string;
}

export interface RequestFilter {
  status?: OperationalStatus | 'ALL';
  department?: RequestDepartment | 'ALL';
  searchQuery?: string;
  roomNumber?: string;
}
