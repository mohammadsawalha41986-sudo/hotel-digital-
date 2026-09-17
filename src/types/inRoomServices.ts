import { Hotel } from './hotel';

export type InRoomServiceCategory =
  | 'housekeeping'
  | 'room_comfort'
  | 'front_office'
  | 'maintenance'
  | 'room_service'
  | 'laundry'
  | 'amenities'
  | 'luggage'
  | 'concierge'
  | string;

export interface InRoomServiceCategoryItem {
  id: string;
  hotelId: string;
  departmentId?: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  sortOrder: number;
  active: boolean;
}

export type InRoomServiceRequestType =
  | 'simple_quantity'
  | 'maintenance_issue'
  | 'wake_up'
  | 'luggage'
  | 'toiletries_kit'
  | 'standard';

export interface InRoomServiceItem {
  id: string;
  hotelId: string;
  categoryId: string;
  departmentId: string;
  category: InRoomServiceCategory;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  image?: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  responseTime?: string;
  slaMinutes?: number;
  requestType: InRoomServiceRequestType;
  active: boolean;
  sortOrder: number;
  availableHoursEn?: string;
  availableHoursAr?: string;
  options?: string[];
  optionsAr?: string[];
}

/**
 * Department contact configuration overrides for WhatsApp routing
 */
export interface DepartmentWhatsAppConfig {
  housekeepingWhatsApp: string;
  frontOfficeWhatsApp: string;
  maintenanceWhatsApp: string;
  roomServiceWhatsApp: string;
  laundryWhatsApp: string;
  spaWhatsApp: string;
  restaurantWhatsApp: string;
  conciergeWhatsApp: string;
  bellDeskWhatsApp: string;
  [key: string]: string;
}

/**
 * Priority WhatsApp resolution:
 * service.whatsappNumber -> department.whatsappNumber -> hotel.whatsapp_number
 */
export function resolveServiceWhatsApp(
  service: InRoomServiceItem,
  departmentConfigs: Record<string, string> | undefined,
  hotel: Hotel
): string {
  // 1. Service-level override
  if (service.whatsappNumber && service.whatsappNumber.trim()) {
    return service.whatsappNumber.replace(/[^0-9]/g, '');
  }

  // 2. Department-level override
  if (departmentConfigs) {
    const deptKeyMap: Record<string, string> = {
      housekeeping: 'housekeepingWhatsApp',
      room_comfort: 'housekeepingWhatsApp',
      front_office: 'frontOfficeWhatsApp',
      maintenance: 'maintenanceWhatsApp',
      room_service: 'roomServiceWhatsApp',
      laundry: 'laundryWhatsApp',
      spa: 'spaWhatsApp',
      restaurant: 'restaurantWhatsApp',
      concierge: 'conciergeWhatsApp',
      bell_desk: 'bellDeskWhatsApp',
    };

    const configKey = deptKeyMap[service.departmentId] || deptKeyMap[service.category];
    if (configKey && departmentConfigs[configKey] && departmentConfigs[configKey].trim()) {
      return departmentConfigs[configKey].replace(/[^0-9]/g, '');
    }
  }

  // Check hotel.departments array if present
  if (hotel.departments && hotel.departments.length > 0) {
    const deptCodeMap: Record<string, string> = {
      housekeeping: 'housekeeping',
      room_comfort: 'housekeeping',
      front_office: 'rooms',
      maintenance: 'engineering',
      room_service: 'dining',
      laundry: 'valet',
      spa: 'wellness',
    };
    const code = deptCodeMap[service.departmentId] || deptCodeMap[service.category];
    const dept = hotel.departments.find((d) => d.code === code);
    if (dept && dept.whatsapp_number && dept.whatsapp_number.trim()) {
      return dept.whatsapp_number.replace(/[^0-9]/g, '');
    }
  }

  // 3. Hotel default WhatsApp fallback
  return (hotel.whatsapp_number || '+966112349999').replace(/[^0-9]/g, '');
}

/**
 * Pre-filled bilingual WhatsApp message generator
 */
export function generateServiceWhatsAppMessage(params: {
  hotelNameEn: string;
  hotelNameAr: string;
  service: InRoomServiceItem;
  roomNumber: string;
  guestName?: string;
  quantity?: number;
  selectedItems?: string[];
  notes?: string;
  date?: string;
  time?: string;
  luggageType?: 'pickup' | 'delivery';
  issueType?: string;
}): { textEn: string; textAr: string; combined: string } {
  const {
    hotelNameEn,
    hotelNameAr,
    service,
    roomNumber,
    guestName,
    quantity,
    selectedItems,
    notes,
    date,
    time,
    luggageType,
    issueType,
  } = params;

  const roomTextEn = roomNumber ? roomNumber : 'Not Specified';
  const roomTextAr = roomNumber ? roomNumber : 'غير محدد';
  const guestTextEn = guestName?.trim() || 'In-House Guest';
  const guestTextAr = guestName?.trim() || 'نزيل بالفندق';
  const notesTextEn = notes?.trim() || 'None';
  const notesTextAr = notes?.trim() || 'لا توجد ملاحظات';

  // Details compilation
  const detailsEn: string[] = [];
  const detailsAr: string[] = [];

  if (quantity && quantity > 1) {
    detailsEn.push(`Quantity: ${quantity}`);
    detailsAr.push(`الكمية: ${quantity}`);
  }

  if (selectedItems && selectedItems.length > 0) {
    detailsEn.push(`Items: ${selectedItems.join(', ')}`);
    detailsAr.push(`الأصناف: ${selectedItems.join('، ')}`);
  }

  if (issueType) {
    detailsEn.push(`Issue: ${issueType}`);
    detailsAr.push(`نوع المشكلة: ${issueType}`);
  }

  if (luggageType) {
    const lugEn = luggageType === 'pickup' ? 'Luggage Collection (Pickup)' : 'Luggage Delivery';
    const lugAr = luggageType === 'pickup' ? 'استلام الحقائب' : 'توصيل الحقائب';
    detailsEn.push(`Type: ${lugEn}`);
    detailsAr.push(`النوع: ${lugAr}`);
  }

  if (date || time) {
    if (date) {
      detailsEn.push(`Date: ${date}`);
      detailsAr.push(`التاريخ: ${date}`);
    }
    if (time) {
      detailsEn.push(`Time: ${time}`);
      detailsAr.push(`الوقت: ${time}`);
    }
  }

  const detailsBlockEn = detailsEn.length > 0 ? detailsEn.join('\n') + '\n' : '';
  const detailsBlockAr = detailsAr.length > 0 ? detailsAr.join('\n') + '\n' : '';

  const textEn = `Hello ${hotelNameEn},
I would like to request:

Service: ${service.nameEn}
Room: ${roomTextEn}
${detailsBlockEn}Guest Name: ${guestTextEn}
Notes: ${notesTextEn}`;

  const textAr = `مرحباً ${hotelNameAr}،
أرغب بطلب الخدمة التالية:

الخدمة: ${service.nameAr}
رقم الغرفة: ${roomTextAr}
${detailsBlockAr}اسم النزيل: ${guestTextAr}
ملاحظات: ${notesTextAr}`;

  const combined = `${textAr}\n\n---\n\n${textEn}`;

  return { textEn, textAr, combined };
}
