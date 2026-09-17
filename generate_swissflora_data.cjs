const fs = require('fs');
const raw = require('./extracted_swissflora_raw.json');
const sum = require('./swissflora_clean_summary.json');

// Map raw room rates to find lowest rate and all options
function getRoomRates(rates) {
  if (!rates || rates.length === 0) return { base_price: 450, offer_price: 395 };
  const prices = rates.map(r => r.rate);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  return {
    base_price: maxPrice > minPrice ? maxPrice : minPrice + 100,
    offer_price: minPrice
  };
}

// Build standard amenities
const STANDARD_AMENITIES = [
  { id: 'wifi', name_en: 'Complimentary High-Speed Wi-Fi', name_ar: 'إنترنت واي فاي فائق السرعة مجاني', icon: 'Wifi' },
  { id: 'parking', name_en: 'Free Onsite Parking', name_ar: 'مواقف سيارات مجانية بالموقع', icon: 'Car' },
  { id: 'pool_gym', name_en: 'Free Pool & Gym Access', name_ar: 'دخول مجاني للمسبح والنادي الرياضي', icon: 'Dumbbell' },
  { id: 'safety_box', name_en: 'In-Room Electronic Safe', name_ar: 'صندوق أمانات إلكتروني', icon: 'ShieldCheck' },
  { id: 'coffee_tea', name_en: 'Tea & Coffee Facilities', name_ar: 'مرافق إعداد الشاي والقهوة', icon: 'Coffee' },
  { id: 'tv', name_en: 'Smart Interactive IPTV', name_ar: 'شاشة تلفزيون ذكية تفاعلية', icon: 'Tv' },
  { id: 'ac', name_en: 'Individual Climate Control', name_ar: 'تحكم فردي بدرجة التكييف', icon: 'Wind' },
  { id: 'toiletries', name_en: 'Premium Swiss Toiletries', name_ar: 'مستلزمات عناية سويسرية فاخرة', icon: 'Sparkles' },
];

// 1. Map Hotel 11 (Royal) Rooms
const royalRoomsRaw = raw.hotels['11'].rooms;
const royalRooms = royalRoomsRaw.map((r) => {
  const prices = getRoomRates(r.rates);
  const titleEn = (r.titleEn || 'Classic Room').trim();
  const titleAr = (r.titleAr || 'غرفة كلاسيكية').trim();
  const slug = titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const imgUrl = `https://api.swissflorahotels.com/wwwroot/${r.path.replace(/\\/g, '/')}`;

  return {
    id: `royal-room-${r.id}`,
    hotel_id: '11',
    slug,
    name_en: titleEn,
    name_ar: titleAr,
    category_en: titleEn.includes('Suite') ? 'Suite' : titleEn.includes('Executive') ? 'Executive Room' : 'Deluxe Room',
    category_ar: titleEn.includes('Suite') ? 'جناح' : titleEn.includes('Executive') ? 'غرفة تنفيذية' : 'غرفة ديلوكس',
    description_en: `${titleEn} at Swiss Flora Royal Hotel Riyadh. Offering ${r.size} sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.`,
    description_ar: `${titleAr} في فندق سويس فلورا رويال الرياض. تمتد على مساحة ${r.size} متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.`,
    size_sqm: r.size || 35,
    bed_type_en: r.bedNumber === 2 ? '2 Twin Beds' : '1 King Bed',
    bed_type_ar: r.bedNumber === 2 ? 'سريران منفصلان' : 'سرير كينغ كبير',
    occupancy: {
      adults: r.adults || 2,
      children: r.childs || 1,
      max_guests: (r.adults || 2) + (r.childs || 1),
    },
    view_en: 'City & King Fahad Road View',
    view_ar: 'إطلالة على المدينة وطريق الملك فهد',
    smoking_policy_en: 'Non-Smoking Room (Designated smoking areas available)',
    smoking_policy_ar: 'غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)',
    breakfast_included: true,
    breakfast_info_en: 'International Breakfast Buffet included at Flora Restaurant',
    breakfast_info_ar: 'يشمل بوفيه إفطار دولي فاخر في مطعم فلورا',
    base_price: prices.base_price,
    offer_price: prices.offer_price,
    offer_badge_en: 'Best Available Rate',
    offer_badge_ar: 'أفضل سعر متاح',
    currency: 'SAR',
    images: [
      imgUrl,
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg',
    ],
    amenities: STANDARD_AMENITIES,
    features_en: [
      `${r.size} sqm spacious layout`,
      'Free Welcome drinks & Wi-Fi',
      'Free Access to Inspirations Pool & Gym',
      'Complimentary safety box',
      '24/7 Room Service available',
    ],
    features_ar: [
      `مساحة رحبة ${r.size} متر مربع`,
      'مشروبات ترحيبية مجانية وإنترنت عالي السرعة',
      'دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي',
      'صندوق أمانات إلكتروني مجاني',
      'خدمة الغرف متاحة على مدار الساعة',
    ],
    available_count: r.countRooms || 6,
    rating: 4.8,
    reviews_count: 124,
  };
});

// 2. Map Hotel 12 (Inn) Rooms
const innRoomsRaw = raw.hotels['12'].rooms;
const innRooms = innRoomsRaw.map((r) => {
  const prices = getRoomRates(r.rates);
  const titleEn = (r.titleEn || 'Inn Deluxe Room').trim();
  const titleAr = (r.titleAr || 'غرفة ديلوكس').trim();
  const slug = titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const imgUrl = `https://api.swissflorahotels.com/wwwroot/${r.path.replace(/\\/g, '/')}`;

  return {
    id: `inn-room-${r.id}`,
    hotel_id: '12',
    slug,
    name_en: titleEn,
    name_ar: titleAr,
    category_en: titleEn.includes('Suite') ? 'Suite' : 'Deluxe Room',
    category_ar: titleEn.includes('Suite') ? 'جناح' : 'غرفة ديلوكس',
    description_en: `${titleEn} at Swiss Flora Inn Hotel Riyadh. Featuring ${r.size} sqm of comfortable living in the heart of Riyadh Business District, near KAFD and Boulevard World.`,
    description_ar: `${titleAr} في فندق سويس فلورا إن الرياض. مساحة ${r.size} متر مربع من الراحة الفائقة في قلب حي الأعمال بالقرب من كافد وبوليفارد وورلد.`,
    size_sqm: r.size || 35,
    bed_type_en: r.bedNumber === 2 ? '2 Twin Beds' : '1 King Bed',
    bed_type_ar: r.bedNumber === 2 ? 'سريران منفصلان' : 'سرير كينغ كبير',
    occupancy: {
      adults: r.adults || 2,
      children: r.childs || 0,
      max_guests: (r.adults || 2) + (r.childs || 0),
    },
    view_en: 'Al Sahafa Business District View',
    view_ar: 'إطلالة على حي الصحافة التجاري',
    smoking_policy_en: 'Non-Smoking Room',
    smoking_policy_ar: 'غرفة لغير المدخنين',
    breakfast_included: false,
    breakfast_info_en: 'Breakfast available at Swiss Flora Restaurant for 49 SAR per person',
    breakfast_info_ar: 'الإفطار متاح في مطعم سويس فلورا بـ 49 ريال للشخص',
    base_price: prices.base_price,
    offer_price: prices.offer_price,
    offer_badge_en: 'Special Inn Rate',
    offer_badge_ar: 'سعر خاص',
    currency: 'SAR',
    images: [
      imgUrl,
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/0333b9b8-1f75-4a10-855d-69468736c06f/download1.png',
    ],
    amenities: STANDARD_AMENITIES,
    features_en: [
      `${r.size} sqm modern room`,
      'Free High-Speed Wi-Fi',
      'Access to pool and gym',
      'Near KAFD & Boulevard World',
      'Affordable room rates',
    ],
    features_ar: [
      `غرفة عصرية بمساحة ${r.size} متر مربع`,
      'واي فاي مجاني عالي السرعة',
      'دخول المسبح والصالة الرياضية',
      'بالقرب من كافد وبوليفارد وورلد',
      'أسعار اقتصادية ممتازة',
    ],
    available_count: r.countRooms || 10,
    rating: 4.6,
    reviews_count: 89,
  };
});

console.log('Royal rooms generated:', royalRooms.length);
console.log('Inn rooms generated:', innRooms.length);
