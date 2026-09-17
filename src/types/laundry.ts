import { LaundryServiceType, LaundryCatalogItem } from './department';

export type { LaundryServiceType, LaundryCatalogItem };

export type LaundryGarmentCategoryId =
  | 'shirts_tops'
  | 'trousers_bottoms'
  | 'suits_formalwear'
  | 'thobes_traditional'
  | 'abayas'
  | 'underwear_sleepwear'
  | 'dresses_special'
  | 'other_items';

export interface LaundryGarmentCategory {
  id: LaundryGarmentCategoryId;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  sortOrder: number;
  active: boolean;
  itemCountLabelEn?: string;
  itemCountLabelAr?: string;
}

export interface LaundryGarmentItem extends LaundryCatalogItem {
  category_id?: LaundryGarmentCategoryId;
  description_en?: string;
  description_ar?: string;
  express_eligible?: boolean;
}

export interface LaundryPackageItem {
  itemId: string;
  serviceType: LaundryServiceType;
  quantity: number;
  nameEn?: string;
  nameAr?: string;
}

export interface LaundryOffer {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  badgeEn: string;
  badgeAr: string;
  image: string;
  price?: number;
  oldPrice?: number;
  discountPercent?: number;
  validityEn: string;
  validityAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  targetServiceType?: LaundryServiceType;
  targetCategoryId?: LaundryGarmentCategoryId;
  packageItems?: LaundryPackageItem[];
  active: boolean;
  sortOrder: number;
}

export interface LaundryCareTag {
  id: string;
  labelEn: string;
  labelAr: string;
  group: 'hanger_fold' | 'starch' | 'care';
}

export interface LaundryPickupSlot {
  id: string;
  timeRangeEn: string;
  timeRangeAr: string;
  available: boolean;
}

export interface LaundrySelectedGarment {
  item: LaundryGarmentItem;
  serviceType: LaundryServiceType;
  quantity: number;
  unitPrice: number;
}
