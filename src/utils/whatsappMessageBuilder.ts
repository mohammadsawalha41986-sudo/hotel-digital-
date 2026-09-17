import { RequestItemSummary, RequestServiceSummary } from '../types/requests';

export interface WhatsAppMessageInput {
  requestTypeEn: string;
  requestTypeAr: string;
  referenceNumber: string;
  hotelNameEn: string;
  hotelNameAr: string;
  roomNumber?: string;
  guestName?: string;
  guestPhone?: string;
  customerType?: 'IN_HOUSE' | 'EXTERNAL';
  outletOrServiceNameEn?: string;
  outletOrServiceNameAr?: string;
  items?: RequestItemSummary[];
  services?: RequestServiceSummary[];
  date?: string;
  time?: string;
  estimatedTotal?: number;
  currency?: string;
  notes?: string;
}

/**
 * Generates standardized bilingual WhatsApp message:
 * ENGLISH FIRST
 * --------------------
 * ARABIC SECOND
 */
export function buildBilingualWhatsAppMessage(input: WhatsAppMessageInput): {
  englishText: string;
  arabicText: string;
  fullMessage: string;
} {
  const currency = input.currency || 'SAR';
  const currencyAr = currency === 'SAR' ? 'ر.س' : currency;

  // Build English Portion
  const enLines: string[] = [];
  enLines.push(input.requestTypeEn.toUpperCase());
  if (input.outletOrServiceNameEn) {
    enLines.push(`Service/Outlet: ${input.outletOrServiceNameEn}`);
  }
  enLines.push('');
  enLines.push(`Reference: ${input.referenceNumber}`);
  enLines.push(`Hotel: ${input.hotelNameEn}`);
  if (input.roomNumber) {
    enLines.push(`Room: ${input.roomNumber}`);
  } else {
    enLines.push(`Guest Type: ${input.customerType === 'EXTERNAL' ? 'External Visitor' : 'Non-Resident'}`);
  }

  if (input.guestName) {
    enLines.push(`Guest Name: ${input.guestName}`);
  }
  if (input.guestPhone) {
    enLines.push(`Phone: ${input.guestPhone}`);
  }

  if (input.date || input.time) {
    const dateTimeStr = [input.date, input.time].filter(Boolean).join(' at ');
    enLines.push(`Requested Schedule: ${dateTimeStr}`);
  }

  if (input.items && input.items.length > 0) {
    enLines.push('Items:');
    input.items.forEach((it) => {
      const opt = it.options ? ` (${it.options})` : '';
      enLines.push(`${it.quantity} × ${it.name_en}${opt}`);
    });
  }

  if (input.services && input.services.length > 0) {
    enLines.push('Requested Service(s):');
    input.services.forEach((s) => {
      const guests = s.guests_count ? ` (${s.guests_count} Guests)` : '';
      enLines.push(`• ${s.name_en}${guests}`);
    });
  }

  if (typeof input.estimatedTotal === 'number' && input.estimatedTotal > 0) {
    enLines.push(`Estimated Total: ${currency} ${input.estimatedTotal}`);
  }

  if (input.notes && input.notes.trim()) {
    enLines.push('');
    enLines.push(`Notes: ${input.notes.trim()}`);
  }

  // Build Arabic Portion
  const arLines: string[] = [];
  arLines.push(input.requestTypeAr);
  if (input.outletOrServiceNameAr) {
    arLines.push(`الخدمة / المرفق: ${input.outletOrServiceNameAr}`);
  }
  arLines.push('');
  arLines.push(`المرجع: ${input.referenceNumber}`);
  arLines.push(`الفندق: ${input.hotelNameAr}`);
  if (input.roomNumber) {
    arLines.push(`الغرفة: ${input.roomNumber}`);
  } else {
    arLines.push(`نوع العميل: ${input.customerType === 'EXTERNAL' ? 'زائر خارجي' : 'غير مقيم'}`);
  }

  if (input.guestName) {
    arLines.push(`اسم النزيل: ${input.guestName}`);
  }
  if (input.guestPhone) {
    arLines.push(`الهاتف: ${input.guestPhone}`);
  }

  if (input.date || input.time) {
    const dateTimeStrAr = [input.date, input.time].filter(Boolean).join(' في تمام الساعة ');
    arLines.push(`الموعد المطلوب: ${dateTimeStrAr}`);
  }

  if (input.items && input.items.length > 0) {
    arLines.push('الأصناف:');
    input.items.forEach((it) => {
      const opt = it.options ? ` (${it.options})` : '';
      arLines.push(`${it.quantity} × ${it.name_ar}${opt}`);
    });
  }

  if (input.services && input.services.length > 0) {
    arLines.push('الخدمات المطلوبة:');
    input.services.forEach((s) => {
      const guests = s.guests_count ? ` (${s.guests_count} ضيوف)` : '';
      arLines.push(`• ${s.name_ar}${guests}`);
    });
  }

  if (typeof input.estimatedTotal === 'number' && input.estimatedTotal > 0) {
    arLines.push(`الإجمالي التقديري: ${input.estimatedTotal} ${currencyAr}`);
  }

  if (input.notes && input.notes.trim()) {
    arLines.push('');
    arLines.push(`ملاحظات: ${input.notes.trim()}`);
  }

  const englishText = enLines.join('\n');
  const arabicText = arLines.join('\n');
  const fullMessage = `${englishText}\n\n--------------------\n\n${arabicText}`;

  return { englishText, arabicText, fullMessage };
}

/**
 * Builds safe URL for wa.me link with proper encoding
 */
export function buildEncodedWhatsAppUrl(phoneNumber: string, message: string): string {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}
