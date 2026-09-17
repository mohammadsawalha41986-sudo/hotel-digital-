import { OperatingInfo } from '../types/department';
import { Language } from '../types/hotel';

export interface CalculatedStatus {
  isOpen: boolean;
  badge_en: string;
  badge_ar: string;
  subtext_en: string;
  subtext_ar: string;
  theme: 'open' | 'closed' | 'soon';
}

/**
 * Computes operating status based on operating_info configuration.
 */
export function getOperatingStatus(
  operatingInfo: OperatingInfo,
  _language: Language = 'en'
): CalculatedStatus {
  if (operatingInfo.status_override === 'closed') {
    return {
      isOpen: false,
      badge_en: 'CLOSED TODAY',
      badge_ar: 'مغلق اليوم',
      subtext_en: 'Closed for private function or maintenance',
      subtext_ar: 'مغلق لأعمال الصيانة أو مناسبة خاصة',
      theme: 'closed',
    };
  }

  if (operatingInfo.status_override === 'open') {
    return {
      isOpen: true,
      badge_en: 'OPEN NOW',
      badge_ar: 'مفتوح الآن',
      subtext_en: operatingInfo.opening_hours_en,
      subtext_ar: operatingInfo.opening_hours_ar,
      theme: 'open',
    };
  }

  // By default, evaluate based on periods or hours
  // In demo / client context, show active schedule
  const hasPeriods = operatingInfo.periods && operatingInfo.periods.length > 0;
  if (hasPeriods) {
    const activePeriod = operatingInfo.periods.find((p) => p.isOpenNow) || operatingInfo.periods[0];
    return {
      isOpen: true,
      badge_en: 'OPEN NOW',
      badge_ar: 'مفتوح الآن',
      subtext_en: `${activePeriod.name_en} (${activePeriod.time_en})`,
      subtext_ar: `${activePeriod.name_ar} (${activePeriod.time_ar})`,
      theme: 'open',
    };
  }

  return {
    isOpen: true,
    badge_en: 'OPEN NOW',
    badge_ar: 'مفتوح الآن',
    subtext_en: operatingInfo.opening_hours_en,
    subtext_ar: operatingInfo.opening_hours_ar,
    theme: 'open',
  };
}

/**
 * Builds a clean WhatsApp deep-link with pre-formatted bilingual message
 */
export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

/**
 * Generates an architectural booking or request reference code
 */
export function generateReferenceCode(prefix: 'SPA' | 'ORD' | 'LND' | 'SRV' | 'BK' | 'RSV'): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${random}`;
}
