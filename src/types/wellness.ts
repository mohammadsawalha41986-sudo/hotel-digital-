export type WellnessBookingMode = 'INFORMATION_ONLY' | 'REQUEST_ACCESS' | 'BOOKING_REQUIRED';

export type WellnessCategoryType = 'treatments' | 'facility' | 'mixed';

export interface WellnessCategory {
  id: string;
  hotelId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string; // 'massage' | 'manicure' | 'pool' | 'jacuzzi' | 'gym' | 'sauna' | 'spa'
  image: string;
  type: WellnessCategoryType;
  active: boolean;
  sortOrder: number;
  serviceCountLabelEn: string;
  serviceCountLabelAr: string;
  whatsappNumber?: string;
  phoneNumber?: string;
}

export interface WellnessServiceItem {
  id: string;
  hotelId: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  image: string;
  icon?: string;
  durationMinutes?: number;
  availableDurations?: number[]; // e.g. [60, 90]
  price: number;
  oldPrice?: number;
  currency?: string;
  complimentary: boolean;
  bookingMode: WellnessBookingMode;
  whatsappNumber?: string;
  phoneNumber?: string;
  openingHoursEn?: string;
  openingHoursAr?: string;
  locationEn?: string;
  locationAr?: string;
  rulesEn?: string[];
  rulesAr?: string[];
  childrenPolicyEn?: string;
  childrenPolicyAr?: string;
  dressCodeEn?: string;
  dressCodeAr?: string;
  guestEligibilityEn?: string;
  guestEligibilityAr?: string;
  equipmentSummaryEn?: string;
  equipmentSummaryAr?: string;
  temperatureEn?: string;
  temperatureAr?: string;
  active: boolean;
  sortOrder: number;
}

export interface WellnessOffer {
  id: string;
  hotelId: string;
  categoryId: string;
  targetServiceId?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  image: string;
  price?: number;
  oldPrice?: number;
  currency: string;
  validityEn: string;
  validityAr: string;
  badgeEn: string;
  badgeAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  ctaAction: 'book' | 'view_category' | 'whatsapp';
  active: boolean;
  sortOrder: number;
}
