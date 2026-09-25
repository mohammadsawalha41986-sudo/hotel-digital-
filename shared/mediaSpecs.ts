/**
 * Recommended image specifications shown in the admin and used to warn
 * (never to reject) when an upload is far from the recommendation.
 */
export interface ImageSpec {
  key: string;
  en: string;
  ar: string;
  width: number;
  height: number;
  /** Minimum acceptable longest side before warning. */
  minLongest: number;
  note_en?: string;
  note_ar?: string;
}

export const IMAGE_SPECS: Record<string, ImageSpec> = {
  logo: { key: 'logo', en: 'Hotel logo', ar: 'شعار الفندق', width: 1200, height: 400, minLongest: 400, note_en: 'Transparent PNG, WebP or SVG preferred', note_ar: 'يفضل PNG أو WebP شفاف أو SVG' },
  mark: { key: 'mark', en: 'Square brand mark', ar: 'العلامة المربعة', width: 800, height: 800, minLongest: 256 },
  favicon: { key: 'favicon', en: 'Favicon', ar: 'أيقونة المتصفح', width: 512, height: 512, minLongest: 192 },
  hero_desktop: { key: 'hero_desktop', en: 'Desktop hero', ar: 'صورة الواجهة (سطح المكتب)', width: 2560, height: 1440, minLongest: 1920, note_en: '1920×1080 minimum', note_ar: 'الحد الأدنى 1920×1080' },
  hero_mobile: { key: 'hero_mobile', en: 'Mobile hero', ar: 'صورة الواجهة (الجوال)', width: 1080, height: 1350, minLongest: 1080 },
  offer: { key: 'offer', en: 'Offer banner', ar: 'بانر العرض', width: 1600, height: 900, minLongest: 1200 },
  outlet: { key: 'outlet', en: 'Dining outlet', ar: 'المطعم', width: 1600, height: 900, minLongest: 1200 },
  menu_item: { key: 'menu_item', en: 'Menu item', ar: 'صنف القائمة', width: 1200, height: 1200, minLongest: 600 },
  spa: { key: 'spa', en: 'Spa service', ar: 'خدمة السبا', width: 1600, height: 1200, minLongest: 1000 },
  laundry: { key: 'laundry', en: 'Laundry category', ar: 'فئة الغسيل', width: 1200, height: 1200, minLongest: 600 },
  service: { key: 'service', en: 'Guest service', ar: 'خدمة النزلاء', width: 1200, height: 900, minLongest: 800 },
  experience: { key: 'experience', en: 'Experience tile', ar: 'بطاقة التجربة', width: 1200, height: 1500, minLongest: 900, note_en: 'Portrait 4:5; keep the subject in the centre', note_ar: 'عمودية 4:5؛ اجعل العنصر الرئيسي في المنتصف' },
  gallery: { key: 'gallery', en: 'Gallery photo', ar: 'صورة المعرض', width: 1600, height: 1200, minLongest: 1600, note_en: '1600 px or more on the longest side', note_ar: '1600 بكسل أو أكثر للضلع الأطول' },
};

export interface SpecCheck {
  warnings: { en: string; ar: string }[];
}

/** Compares actual dimensions with a spec; returns human warnings (never errors). */
export function checkImage(specKey: string | undefined, width: number, height: number): SpecCheck {
  const spec = specKey ? IMAGE_SPECS[specKey] : undefined;
  const warnings: SpecCheck['warnings'] = [];
  if (!spec || !width || !height) return { warnings };
  if (Math.max(width, height) < spec.minLongest) {
    warnings.push({ en: `Image is small (${width}×${height}). Recommended ${spec.width}×${spec.height}; it may look blurry.`, ar: `الصورة صغيرة (${width}×${height}). الموصى به ${spec.width}×${spec.height}؛ قد تظهر غير واضحة.` });
  }
  const want = spec.width / spec.height;
  const got = width / height;
  if (Math.abs(got - want) / want > 0.25) {
    warnings.push({ en: `Aspect ratio ${got.toFixed(2)} differs from the recommended ${want.toFixed(2)}; the image will be cropped to fit. Use “Crop” to choose.`, ar: `نسبة العرض إلى الارتفاع ${got.toFixed(2)} تختلف عن الموصى بها ${want.toFixed(2)}؛ سيتم قص الصورة لتناسب المساحة.` });
  }
  return { warnings };
}
