import { OperationalRequest, OperationalStatus } from '../types/requests';

const STORAGE_KEY = 'hotel_operational_requests_v3';

// Initial realistic seed requests to showcase operational workflows
const INITIAL_REQUESTS: OperationalRequest[] = [
  {
    id: 'FNB-00125',
    hotel_id: '11',
    hotel_name_en: 'Swiss Flora Royal Hotel Riyadh',
    hotel_name_ar: 'فندق سويس فلورا رويال الرياض',
    department: 'fnb',
    department_name_en: 'Food & Beverage',
    department_name_ar: 'الأغذية والمشروبات',
    outlet_or_service_name_en: 'In-Room Dining',
    outlet_or_service_name_ar: 'خدمة الغرف',
    customer_type: 'IN_HOUSE',
    room_number: '402',
    guest_name: 'Khalid Al-Mansoor',
    guest_phone: '+966501234567',
    items: [
      {
        id: 'item-1',
        name_en: 'Royal Club Sandwich',
        name_ar: 'كلوب ساندويتش رويال',
        quantity: 2,
        unit_price: 35,
        total_price: 70,
        options: 'Brown bread, toasted',
      },
      {
        id: 'item-2',
        name_en: 'Cappuccino',
        name_ar: 'كابتشينو',
        quantity: 1,
        unit_price: 15,
        total_price: 15,
        options: 'Oat milk',
      },
    ],
    estimated_total: 85,
    currency: 'SAR',
    notes: 'Please bring extra napkins. No onions in sandwiches.',
    target_whatsapp: '+966112000003',
    whatsapp_message_en: 'NEW ROOM SERVICE ORDER\nReference: FNB-00125\nRoom: 402',
    whatsapp_message_ar: 'طلب خدمة غرف جديد\nالمرجع: FNB-00125\nالغرفة: 402',
    status: 'PREPARING',
    assigned_staff: 'Chef Tariq / KDS 02',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'SPA-00084',
    hotel_id: '11',
    hotel_name_en: 'Swiss Flora Royal Hotel Riyadh',
    hotel_name_ar: 'فندق سويس فلورا رويال الرياض',
    department: 'spa',
    department_name_en: 'Wellness & Spa',
    department_name_ar: 'النادي الصحي والسبا',
    outlet_or_service_name_en: 'Royal Oud Aromatherapy Massage',
    outlet_or_service_name_ar: 'مساج العود الملكي بالزيوت العطرية',
    customer_type: 'IN_HOUSE',
    room_number: '402',
    guest_name: 'Dr. Sarah Jenkins',
    guest_phone: '+966559876543',
    services: [
      {
        id: 'srv-1',
        name_en: 'Royal Oud Aromatherapy Massage (60 min)',
        name_ar: 'مساج العود الملكي بالزيوت العطرية (٦٠ دقيقة)',
        date: 'Today',
        time: '17:30',
        guests_count: 1,
        price: 320,
      },
    ],
    estimated_total: 320,
    currency: 'SAR',
    notes: 'Prefers medium pressure and relaxing ambient music.',
    target_whatsapp: '+966112000005',
    whatsapp_message_en: 'WELLNESS & SPA BOOKING\nReference: SPA-00084',
    whatsapp_message_ar: 'حجز جلسة سبا وعافية\nالمرجع: SPA-00084',
    status: 'CONFIRMED',
    assigned_staff: 'Spa Hostess Mary / Therapist Elena',
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'LDY-00049',
    hotel_id: '11',
    hotel_name_en: 'Swiss Flora Royal Hotel Riyadh',
    hotel_name_ar: 'فندق سويس فلورا رويال الرياض',
    department: 'laundry',
    department_name_en: 'Valet Laundry',
    department_name_ar: 'المغسلة والمصبغة',
    outlet_or_service_name_en: 'Express Valet Pressing',
    outlet_or_service_name_ar: 'خدمة الكي السريع المستعجل',
    customer_type: 'IN_HOUSE',
    room_number: '402',
    guest_name: 'Khalid Al-Mansoor',
    guest_phone: '+966501234567',
    items: [
      {
        id: 'ldy-item-1',
        name_en: 'Traditional Thobe (Wash & Press)',
        name_ar: 'ثوب تقليدي (غسيل وكي)',
        quantity: 2,
        unit_price: 25,
        total_price: 50,
      },
      {
        id: 'ldy-item-2',
        name_en: 'Business Suit (Dry Clean)',
        name_ar: 'بدلة رسمية (تنظيف جاف)',
        quantity: 1,
        unit_price: 45,
        total_price: 45,
      },
    ],
    estimated_total: 95,
    currency: 'SAR',
    notes: 'Please return on wooden hangers before 20:00 tonight.',
    target_whatsapp: '+966112000006',
    whatsapp_message_en: 'LAUNDRY PICKUP REQUEST\nReference: LDY-00049',
    whatsapp_message_ar: 'طلب استلام غسيل\nالمرجع: LDY-00049',
    status: 'IN_PROGRESS',
    assigned_staff: 'Valet Dispatcher Rashid',
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'HKP-00031',
    hotel_id: '11',
    hotel_name_en: 'Swiss Flora Royal Hotel Riyadh',
    hotel_name_ar: 'فندق سويس فلورا رويال الرياض',
    department: 'housekeeping',
    department_name_en: 'Housekeeping Services',
    department_name_ar: 'خدمات الإشراف الداخلي',
    outlet_or_service_name_en: 'Extra Bath Towels & Hypoallergenic Pillows',
    outlet_or_service_name_ar: 'مناشف حمام إضافية ووسائد ضد الحساسية',
    customer_type: 'IN_HOUSE',
    room_number: '402',
    guest_name: 'Khalid Al-Mansoor',
    guest_phone: '+966501234567',
    estimated_total: 0,
    currency: 'SAR',
    notes: '2 extra large bath towels and 2 firm feather pillows.',
    target_whatsapp: '+966112000004',
    whatsapp_message_en: 'HOUSEKEEPING AMENITY REQUEST\nReference: HKP-00031',
    whatsapp_message_ar: 'طلب مستلزمات نظافة\nالمرجع: HKP-00031',
    status: 'ON_THE_WAY',
    assigned_staff: 'Floor Attendant Kamal',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'ENG-00012',
    hotel_id: '11',
    hotel_name_en: 'Swiss Flora Royal Hotel Riyadh',
    hotel_name_ar: 'فندق سويس فلورا رويال الرياض',
    department: 'engineering',
    department_name_en: 'Engineering & Maintenance',
    department_name_ar: 'الهندسة والصيانة الفنية',
    outlet_or_service_name_en: 'AC Thermostat Calibration',
    outlet_or_service_name_ar: 'معايرة درجة حرارة التكييف',
    customer_type: 'IN_HOUSE',
    room_number: '402',
    guest_name: 'Khalid Al-Mansoor',
    guest_phone: '+966501234567',
    estimated_total: 0,
    currency: 'SAR',
    notes: 'Air conditioning unit feels slightly warm, requesting calibration to 21°C.',
    target_whatsapp: '+966112000007',
    whatsapp_message_en: 'ENGINEERING WORK ORDER\nReference: ENG-00012',
    whatsapp_message_ar: 'أمر صيانة فنية\nالمرجع: ENG-00012',
    status: 'RECEIVED',
    assigned_staff: 'Duty Tech Faisal',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
];

export function getStoredRequests(hotelId?: string): OperationalRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: OperationalRequest[] = raw ? JSON.parse(raw) : INITIAL_REQUESTS;
    if (!Array.isArray(list) || list.length === 0) {
      list = INITIAL_REQUESTS;
    }
    if (hotelId) {
      return list.filter((r) => r.hotel_id === hotelId);
    }
    return list;
  } catch (e) {
    console.warn('Error reading operational requests:', e);
    return INITIAL_REQUESTS;
  }
}

export function saveOperationalRequest(req: OperationalRequest): OperationalRequest {
  const existing = getStoredRequests();
  const updated = [req, ...existing.filter((r) => r.id !== req.id)];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save operational request to storage:', e);
  }
  return req;
}

export function updateOperationalRequestStatus(
  id: string,
  newStatus: OperationalStatus,
  assignedStaff?: string
): OperationalRequest | null {
  const existing = getStoredRequests();
  let foundReq: OperationalRequest | null = null;
  const updated = existing.map((r) => {
    if (r.id === id) {
      foundReq = {
        ...r,
        status: newStatus,
        assigned_staff: assignedStaff !== undefined ? assignedStaff : r.assigned_staff,
        updated_at: new Date().toISOString(),
      };
      return foundReq;
    }
    return r;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update operational request:', e);
  }

  return foundReq;
}

export function assignStaffToRequest(
  id: string,
  staffName: string
): OperationalRequest | null {
  const existing = getStoredRequests();
  const current = existing.find((r) => r.id === id);
  const nextStatus = current?.status === 'NEW' || current?.status === 'RECEIVED' ? 'IN_PROGRESS' : current?.status || 'IN_PROGRESS';
  return updateOperationalRequestStatus(id, nextStatus, staffName);
}

export function generateOperationalReference(
  prefix: 'FNB' | 'SPA' | 'LDY' | 'GST' | 'HKP' | 'ENG'
): string {
  const existing = getStoredRequests();
  const existingIds = new Set(existing.map((r) => r.id));

  let ref = '';
  let attempts = 0;
  do {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    ref = `${prefix}-${randomNum}`;
    attempts++;
  } while (existingIds.has(ref) && attempts < 50);

  return ref;
}
