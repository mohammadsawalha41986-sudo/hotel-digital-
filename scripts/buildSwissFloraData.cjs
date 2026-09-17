const fs = require('fs');
const path = require('path');

const raw = require('../extracted_swissflora_raw.json');
const sum = require('../swissflora_clean_summary.json');

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

// 1. Royal Rooms
const royalRooms = raw.hotels['11'].rooms.map((r) => {
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

// 2. Inn Rooms
const innRooms = raw.hotels['12'].rooms.map((r) => {
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

// Output code template
const fileContent = `import { Hotel, RoomType, HotelOffer } from '../types/hotel';
import { FBOutlet, WellnessService, DepartmentContact } from '../types/department';
import { createDefaultPortalConfig } from '../utils/portalConfig';

// =========================================================================
// 1. SWISS FLORA ROOM TYPES (AUTHENTIC DATA FROM WEBSITE)
// =========================================================================
export const SWISS_FLORA_ROYAL_ROOMS: RoomType[] = ${JSON.stringify(royalRooms, null, 2)};

export const SWISS_FLORA_INN_ROOMS: RoomType[] = ${JSON.stringify(innRooms, null, 2)};

// =========================================================================
// 2. SWISS FLORA OFFERS (BASED ON OFFICIAL PACKAGES)
// =========================================================================
export const SWISS_FLORA_ROYAL_OFFERS: HotelOffer[] = [
  {
    id: 'offer-royal-bfast',
    hotel_id: '11',
    title_en: 'Best Available Rate with Breakfast',
    title_ar: 'أفضل سعر متاح مع وجبة الإفطار',
    description_en: 'Book directly and enjoy rich daily international buffet breakfast at Flora Restaurant, free welcome drinks, high-speed Wi-Fi, and complimentary pool & gym access.',
    description_ar: 'احجز مباشرة واستمتع ببوفيه إفطار دولي يومي فاخر في مطعم فلورا، مشروبات ترحيبية مجانية، إنترنت عالي السرعة، ودخول مجاني للمسبح والنادي الرياضي.',
    department: 'rooms',
    original_price: 600,
    offer_price: 495,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'Direct Benefit',
    badge_ar: 'ميزة الحجز المباشر',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/b999a510-6e27-4992-95f0-dfb78a82d4c0/downloadk.png',
    terms_en: 'Valid on direct reservations. Includes Flora Restaurant buffet.',
    terms_ar: 'صالح للحجوزات المباشرة. يشمل بوفيه مطعم فلورا.',
    target_action: 'book_room',
    is_active: true,
  },
  {
    id: 'offer-royal-halfboard',
    hotel_id: '11',
    title_en: 'Half-Board Culinary Package (Breakfast & Dinner)',
    title_ar: 'باقة نصف إقامة الفاخرة (إفطار وعشاء)',
    description_en: 'Indulge in a complete gastronomic journey with lavish breakfast and multi-course dinner at Flora Restaurant or Swiss Café Lounge.',
    description_ar: 'استمتع برحلة طهي متكاملة تشمل إفطاراً غنياً وعشاءً فاخراً من عدة أطباق في مطعم فلورا أو سويس كافيه.',
    department: 'restaurant',
    original_price: 950,
    offer_price: 800,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'Half-Board',
    badge_ar: 'نصف إقامة',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/e62c936d-a986-4fec-90fa-618652baab0b/chef.jpg',
    terms_en: 'Dinner served daily from 18:30 to 23:30 at Flora Restaurant.',
    terms_ar: 'يقدم العشاء يومياً من 6:30 مساءً حتى 11:30 مساءً بمطعم فلورا.',
    target_action: 'reserve_dining',
    is_active: true,
  },
  {
    id: 'offer-royal-spa',
    hotel_id: '11',
    title_en: 'Flora Fitness & Spa Signature Ritual',
    title_ar: 'باقة فلورا سبا الاسترخائية المتكاملة',
    description_en: '60-minute Swedish or Thai relaxation massage followed by complimentary access to sauna, steam room, and The Flora Pool.',
    description_ar: 'جلسة تدليك سويدي أو تايلاندي لمدة 60 دقيقة مع دخول مجاني للساونا وغرفة البخار ومسبح فلورا.',
    department: 'health_club',
    original_price: 450,
    offer_price: 320,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: '28% OFF',
    badge_ar: 'خصم 28%',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg',
    terms_en: 'Advance reservation required via Flora Spa desk or WhatsApp +966555072806.',
    terms_ar: 'يلزم الحجز المسبق عبر كونسيرج السبا أو واتساب +966555072806.',
    target_action: 'book_spa',
    is_active: true,
  },
  {
    id: 'offer-royal-eventura',
    hotel_id: '11',
    title_en: 'Eventura Day Delegate Meeting Package',
    title_ar: 'باقة إيفينتورا لفعاليات واجتماعات الشركات',
    description_en: 'Comprehensive corporate meeting setup with high-def AV, sound surround, continuous coffee breaks, and buffet luncheon.',
    description_ar: 'تجهيزات متكاملة للاجتماعات التنفيذية مع شاشات عرض عالية الدقة وصوتيات، واستراحات قهوة وبوفيه غداء راقٍ.',
    department: 'seasonal',
    original_price: 350,
    offer_price: 260,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'Corporate Special',
    badge_ar: 'خاص بالشركات',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Meeting/6b930953-98c8-43fb-ad8b-a05847209738/WhatsApp%20Image%202024-08-01%20at%2016.37.07%20(1).jpg',
    terms_en: 'Minimum 10 delegates. Inquire via eventura.royal@swissflorahotels.com.',
    terms_ar: 'الحد الأدنى 10 أشخاص. الاستفسار عبر eventura.royal@swissflorahotels.com.',
    target_action: 'request_service',
    is_active: true,
  },
];

export const SWISS_FLORA_INN_OFFERS: HotelOffer[] = [
  {
    id: 'offer-inn-business',
    hotel_id: '12',
    title_en: 'Business District Stay & Save Rate',
    title_ar: 'عرض إقامة حي الأعمال والتوفير الذكي',
    description_en: 'Designed for professionals visiting KAFD & Boulevard World. Includes high-speed Wi-Fi, free parking, and pool/gym access.',
    description_ar: 'مصمم خصيصاً لرجال الأعمال وزوار كافد والبوليفارد. يشمل واي فاي فائق السرعة، مواقف مجانية، ودخول النادي والمسبح.',
    department: 'rooms',
    original_price: 520,
    offer_price: 395,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'Business Value',
    badge_ar: 'قيمة الأعمال',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/cb2a4062-6175-46e4-8c4c-c65714f26fc8/_22A7761.JPG',
    terms_en: 'Valid all week for Swiss Flora Inn rooms.',
    terms_ar: 'صالح طوال أيام الأسبوع في فندق سويس فلورا إن.',
    target_action: 'book_room',
    is_active: true,
  },
  {
    id: 'offer-inn-dining',
    hotel_id: '12',
    title_en: 'Swiss Flora Restaurant Breakfast Add-On',
    title_ar: 'إضافة وجبة إفطار في مطعم سويس فلورا',
    description_en: 'Delight in our breakfast buffet at an exclusive discounted rate of 49 SAR per person when ordered through the portal.',
    description_ar: 'تمتع ببوفيه الإفطار الصباحي بسعر خاص مخفض 49 ريال للشخص عند الطلب من البوابة.',
    department: 'restaurant',
    original_price: 70,
    offer_price: 49,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'Special 49 SAR',
    badge_ar: 'بسعر 49 ر.س',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-2.jpg',
    terms_en: 'Served daily from 6:30 AM to 10:30 AM.',
    terms_ar: 'يقدم يومياً من 6:30 صباحاً حتى 10:30 صباحاً.',
    target_action: 'reserve_dining',
    is_active: true,
  },
];

// =========================================================================
// 3. SWISS FLORA F&B OUTLETS (ROYAL & INN)
// =========================================================================
export const SWISS_FLORA_ROYAL_OUTLETS: FBOutlet[] = [
  {
    id: 'royal-outlet-flora',
    hotel_id: '11',
    outlet_code: 'flora_restaurant',
    slug: 'flora-restaurant',
    outlet_type: 'restaurant',
    name_en: 'Flora Restaurant - All Day Dining',
    name_ar: 'مطعم فلورا - بوفيه دولي ومحطات طهي حية',
    short_description_en: 'International buffets, live cooking stations, and fresh artisanal pastries in an elegant setting.',
    short_description_ar: 'بوفيهات دولية واسعة ومحطات طهي حية ومعجنات طازجة في أجواء راقية وترحيب حار.',
    full_description_en:
      'Kickstart your morning at Flora Restaurant with a delightful breakfast selection, including fresh fruits, pancakes, and continental pastries, alongside hot dishes from our live cooking stations. Our extensive international buffets are thoughtfully crafted to offer an exceptional culinary experience catering to diverse tastes and preferences. Flora Restaurant provides a warm and elegant atmosphere with stylish decor and comfortable seating.',
    full_description_ar:
      'ابدأ يومك في مطعم فلورا بوجبة إفطار لذيذة تشمل مجموعة متنوعة من الفواكه الطازجة، الفطائر، والمعجنات القارية، بالإضافة إلى الأطباق الساخنة من محطات الطهي الحية لدينا. نقدم بوفيهات دولية واسعة مصممة لتقديم تجربة طهي استثنائية تناسب مختلف الأذواق والتفضيلات في بيئة مريحة وجذابة.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/b999a510-6e27-4992-95f0-dfb78a82d4c0/downloadk.png',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/e62c936d-a986-4fec-90fa-618652baab0b/chef.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/1f797aee-8962-4565-82c8-970a7d2ee11c/shutterstock_645095311.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/a7c2a63b-4404-403e-b931-acdc158325c8/download3.png',
    ],
    cuisine_en: 'International & Swiss Buffets',
    cuisine_ar: 'مأكولات دولية وسويسرية فاخرة',
    dress_code_en: 'Smart Casual',
    dress_code_ar: 'أنيق غير رسمي',
    location: {
      building_en: 'Main Hotel Tower',
      building_ar: 'برج الفندق الرئيسي',
      floor_en: 'Lobby Level (L)',
      floor_ar: 'طابق البهو الرئيسي (L)',
      internal_text_en: 'Adjacent to main reception foyer',
      internal_text_ar: 'بجوار بهو الاستقبال الرئيسي',
    },
    operating_info: {
      opening_hours_en: '06:30 - 23:30 Daily',
      opening_hours_ar: '06:30 صباحاً - 11:30 مساءً يومياً',
      periods: [
        { name_en: 'Breakfast Buffet', name_ar: 'بوفيه الإفطار', time_en: '06:30 - 10:30', time_ar: '06:30 - 10:30' },
        { name_en: 'International Lunch', name_ar: 'غداء دولي', time_en: '12:30 - 15:30', time_ar: '12:30 - 15:30' },
        { name_en: 'Grand Dinner Buffet', name_ar: 'بوفيه العشاء الكبير', time_en: '18:30 - 23:30', time_ar: '18:30 - 23:30' },
      ],
    },
    contact: {
      phone: '+966112349999',
      extension: '201',
      whatsapp_number: '+966112349999',
      whatsapp_enabled: true,
      default_message_en: 'Hello Flora Restaurant, I would like to reserve a table.',
      default_message_ar: 'مرحباً بمطعم فلورا، أود حجز طاولة للاستمتاع بالبوفيه.',
      email: 'Info.royal@swissflorahotels.com',
    },
    audience: 'BOTH',
    is_active: true,
    is_visible: true,
    sort_order: 1,
    featured_offer: SWISS_FLORA_ROYAL_OFFERS[0],
    menu_categories: [
      {
        id: 'cat-flora-bfast',
        outlet_id: 'royal-outlet-flora',
        code: 'breakfast_buffet',
        name_en: 'Breakfast Highlights',
        name_ar: 'أطباق الإفطار المميزة',
        is_active: true,
        sort_order: 1,
        items: [
          {
            id: 'item-flora-buffet',
            item_code: 'FLR-01',
            category_id: 'cat-flora-bfast',
            name_en: 'Full International Breakfast Buffet',
            name_ar: 'بوفيه الإفطار الدولي المتكامل',
            description_en: 'Live egg station, freshly baked croissants, Swiss cheeses, fresh fruits, pancakes, and organic juices.',
            description_ar: 'محطة بيض حية، كرواسون فرنسي طازج، أجبان سويسرية، فواكه طازجة، بان كيك، وعصائر طبيعية.',
            image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/b999a510-6e27-4992-95f0-dfb78a82d4c0/downloadk.png',
            price: 85,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_recommended: true,
          },
          {
            id: 'item-flora-shakshuka',
            item_code: 'FLR-02',
            category_id: 'cat-flora-bfast',
            name_en: 'Traditional Arabic Shakshuka',
            name_ar: 'شكشوكة عربية أصيلة',
            description_en: 'Farm-fresh eggs poached in spiced tomato, bell pepper, and cumin sauce with warm tandoor bread.',
            description_ar: 'بيض طازج مطهو في صلصة الطماطم والفلفل والكمون مع خبز التنور الساخن.',
            image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=600&q=80',
            price: 45,
            currency: 'SAR',
            is_available: true,
            sort_order: 2,
          }
        ]
      },
      {
        id: 'cat-flora-mains',
        outlet_id: 'royal-outlet-flora',
        code: 'mains',
        name_en: 'Lunch & Dinner Specialties',
        name_ar: 'أطباق الغداء والعشاء الرئيسية',
        is_active: true,
        sort_order: 2,
        items: [
          {
            id: 'item-flora-kabsa',
            item_code: 'FLR-03',
            category_id: 'cat-flora-mains',
            name_en: 'Royal Lamb Kabsa',
            name_ar: 'كبسة اللحم النعيمي الملكية',
            description_en: 'Tender local lamb slow-cooked with fragrant spiced basmati rice, toasted almonds, and raisins.',
            description_ar: 'لحم نعيمي طري مطهو على نار هادئة مع أرز بسمتي متبل، مكسرات محمصة، وزبيب.',
            image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
            price: 95,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_chef_choice: true,
          },
          {
            id: 'item-flora-salmon',
            item_code: 'FLR-04',
            category_id: 'cat-flora-mains',
            name_en: 'Pan-Seared Norwegian Salmon',
            name_ar: 'سلمون نرويجي مشوي مع صلصة الليمون والأعشاب',
            description_en: 'Served with saffron risotto, grilled asparagus, and citrus beurre blanc.',
            description_ar: 'يقدم مع ريزوتو الزعفران، هليون مشوي، وصلصة الزبدة والليمون.',
            image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
            price: 110,
            currency: 'SAR',
            is_available: true,
            sort_order: 2,
          }
        ]
      }
    ]
  },
  {
    id: 'royal-outlet-swiss-cafe',
    hotel_id: '11',
    outlet_code: 'swiss_cafe',
    slug: 'swiss-cafe-restaurant-lounge',
    outlet_type: 'cafe',
    name_en: 'Swiss Café Restaurant & Lounge',
    name_ar: 'سويس كافيه مطعم ولاونج عصري',
    short_description_en: 'Live show kitchen, artisanal coffees, French pastries, and premium à la carte culinary delights.',
    short_description_ar: 'مطبخ مفتوح حسب الطلب، قهوة مختصة، حلويات ومعجنات فرنسية، ونكهات عالمية راقية.',
    full_description_en:
      'Savor delicious food without compromising on flavor. Our restaurant, led by professional chefs, is renowned for its exceptional cuisine and unique ambiance. The elegant dining room features a live kitchen for an à la carte menu, letting you witness culinary artistry in action. The menu blends international influences with classic favorites and creative dishes.',
    full_description_ar:
      'استمتع بتجربة طعام لا تُنسى دون التنازل عن النكهات الغنية. يشرف على مطعمنا طهاة محترفون مما يجعله متميزاً بمأكولاته الفاخرة وجوّه الفريد. يتميز المطعم بغرفة طعام أنيقة تضم مطبخاً مفتوحاً لقائمة الطعام حسب الطلب وتتنوع القائمة بين النكهات العالمية والأطباق الكلاسيكية والمبتكرة.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/d047d924-8978-4e1a-819e-8e0062776e71/downloadc.png',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-2.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Mojito-cocktail-scaled.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-1-scaled.jpg',
    ],
    cuisine_en: 'Swiss & International À La Carte',
    cuisine_ar: 'أطباق سويسرية وعالمية ومقاهي مختصة',
    dress_code_en: 'Casual Chic',
    dress_code_ar: 'أنيق مريح',
    location: {
      building_en: 'Main Hotel Tower',
      building_ar: 'برج الفندق الرئيسي',
      floor_en: 'Ground Floor & Outdoor Terrace',
      floor_ar: 'الطابق الأرضي والتراس الخارجي',
      internal_text_en: 'Overlooking garden terrace',
      internal_text_ar: 'مطل على التراس الخارجي',
    },
    operating_info: {
      opening_hours_en: '06:30 - 23:30 Daily (Last order 23:30)',
      opening_hours_ar: '06:30 صباحاً - 11:30 مساءً (آخر طلب 11:30 مساءً)',
      periods: [
        { name_en: 'Breakfast Service', name_ar: 'فترة الإفطار', time_en: '06:30 - 10:30', time_ar: '06:30 - 10:30' },
        { name_en: 'Lunch Service', name_ar: 'فترة الغداء', time_en: '12:00 - 15:30', time_ar: '12:00 - 15:30' },
        { name_en: 'Dinner & Lounge', name_ar: 'العشاء واللاونج', time_en: '19:00 - 23:30', time_ar: '19:00 - 23:30' },
      ],
    },
    contact: {
      phone: '+966112349999',
      extension: '205',
      whatsapp_number: '+966112349999',
      whatsapp_enabled: true,
      default_message_en: 'Hello Swiss Café, I would like to order specialty coffee & pastries.',
      default_message_ar: 'مرحباً بسويس كافيه، أود طلب قهوة مختصة وحلويات.',
      email: 'Info.royal@swissflorahotels.com',
    },
    audience: 'BOTH',
    is_active: true,
    is_visible: true,
    sort_order: 2,
    menu_categories: [
      {
        id: 'cat-cafe-drinks',
        outlet_id: 'royal-outlet-swiss-cafe',
        code: 'beverages',
        name_en: 'Specialty Coffee & Beverages',
        name_ar: 'القهوة المختصة والمشروبات',
        is_active: true,
        sort_order: 1,
        items: [
          {
            id: 'item-cafe-spanish',
            item_code: 'SWC-01',
            category_id: 'cat-cafe-drinks',
            name_en: 'Signature Swiss Flora Spanish Latte',
            name_ar: 'سبانش لاتيه سويس فلورا المميز',
            description_en: 'Double espresso shot with condensed milk and velvety microfoam.',
            description_ar: 'إسبريسو مضاعف مع حليب مكثف محلى ورغوة مخملية.',
            image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
            price: 28,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_featured: true,
          },
          {
            id: 'item-cafe-mojito',
            item_code: 'SWC-02',
            category_id: 'cat-cafe-drinks',
            name_en: 'Wild Berry Virgin Mojito',
            name_ar: 'موهيتو التوت البري المنعش',
            description_en: 'Fresh mint, lime wedges, crushed ice, wild berry coulis, and sparkling soda.',
            description_ar: 'نعناع طازج، ليمون، ثلج مجروش، توت بري، ومياه غازية فوارة.',
            image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Mojito-cocktail-scaled.jpg',
            price: 32,
            currency: 'SAR',
            is_available: true,
            sort_order: 2,
          }
        ]
      }
    ]
  },
  {
    id: 'royal-outlet-room-service',
    hotel_id: '11',
    outlet_code: 'room_service',
    slug: '24-7-room-service',
    outlet_type: 'room_service',
    name_en: '24/7 In-Room Dining Service',
    name_ar: 'خدمة الغرف على مدار 24 ساعة (تحويلة 222)',
    short_description_en: 'Prompt, gourmet in-room dining delivered fresh to your suite at any hour. Dial 222.',
    short_description_ar: 'وجبات ومشروبات ساخنة وباردة تصل إلى باب غرفتك بكل سرعة واحترافية. للطلب اتصل على 222.',
    full_description_en:
      'At Swiss Flora Royal Hotel Riyadh, we offer 24-hour room service to ensure your convenience and comfort. Enjoy a wide variety of meals and beverages delivered directly to your room at any time of the day or night. Whether you crave a late-night snack or a full meal, our extensive menu has something to satisfy every palate. Relax and dine in the comfort of your room with our prompt and professional room service. For orders, please dial: 222.',
    full_description_ar:
      'في فندق سويس فلورا رويال الرياض، نقدم خدمة الغرف على مدار 24 ساعة لضمان راحتك ورفاهيتك. استمتع بتشكيلة واسعة من الوجبات والمشروبات التي يتم توصيلها مباشرة إلى غرفتك في أي وقت من اليوم أو الليل. سواء كنت تشعر برغبة في وجبة خفيفة في وقت متأخر من الليل أو وجبة كاملة، فإن قائمتنا المتنوعة تلبي كل رغباتك. للطلب يرجى الاتصال بالتحويلة: 222.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/1a2e0441-b476-489c-9b4f-dc74811d67e5/traytracker.jpg',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/1a2e0441-b476-489c-9b4f-dc74811d67e5/traytracker.jpg',
      'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=1200&q=80',
    ],
    cuisine_en: '24/7 Global In-Room Dining',
    cuisine_ar: 'أطباق عالمية وسريعة على مدار 24 ساعة',
    dress_code_en: 'In-Room Comfort',
    dress_code_ar: 'راحة الغرفة',
    location: {
      building_en: 'Main Hotel Tower',
      building_ar: 'برج الفندق الرئيسي',
      floor_en: 'All Guest Floors & Suites',
      floor_ar: 'كافة طوابق وأجنحة النزلاء',
      internal_text_en: 'Dial 222 from your in-room telephone',
      internal_text_ar: 'اتصل على تحويلة 222 من هاتف الغرفة',
    },
    operating_info: {
      opening_hours_en: '24 Hours Daily',
      opening_hours_ar: 'متاح 24 ساعة يومياً',
      periods: [
        { name_en: '24/7 Continuous Service', name_ar: 'خدمة مستمرة 24 ساعة', time_en: '00:00 - 23:59', time_ar: '00:00 - 23:59' },
      ],
    },
    contact: {
      phone: '+966112349999',
      extension: '222',
      whatsapp_number: '+966112349999',
      whatsapp_enabled: true,
      default_message_en: 'Hello In-Room Dining (Dial 222), I would like to place an order to my room.',
      default_message_ar: 'مرحباً بخدمة الغرف (تحويلة 222)، أود طلب وجبة إلى غرفتي.',
      email: 'Info.royal@swissflorahotels.com',
    },
    audience: 'IN_HOUSE',
    is_active: true,
    is_visible: true,
    sort_order: 3,
    menu_categories: [
      {
        id: 'cat-rs-all-day',
        outlet_id: 'royal-outlet-room-service',
        code: 'all_day',
        name_en: 'Popular In-Room Selections',
        name_ar: 'المختارات الأكثر طلباً للغرف',
        is_active: true,
        sort_order: 1,
        items: [
          {
            id: 'item-rs-club',
            item_code: 'RS-01',
            category_id: 'cat-rs-all-day',
            name_en: 'Swiss Flora Royal Club Sandwich',
            name_ar: 'كلوب ساندويتش سويس فلورا الملكي',
            description_en: 'Grilled chicken breast, beef bacon, fried egg, cheddar, crisp lettuce, tomato, served with golden French fries.',
            description_ar: 'صدر دجاج مشوي، بيف بيكون مقدد، بيض مقلي، جبن شيدر، طماطم، وخس، يقدم مع بطاطس مقلية ذهبية.',
            image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
            price: 55,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_recommended: true,
          },
          {
            id: 'item-rs-burger',
            item_code: 'RS-02',
            category_id: 'cat-rs-all-day',
            name_en: 'Angus Beef Cheese Burger',
            name_ar: 'برجر أنجوس البقري الفاخر مع الجبن',
            description_en: 'Charbroiled Angus patty, melted cheddar, caramelized onion, truffle aioli in a brioche bun.',
            description_ar: 'شريحة أنجوس مشوية، جبن شيدر ذائب، بصل مكرمل، وصوص الكمأة في خبز بريوش.',
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
            price: 68,
            currency: 'SAR',
            is_available: true,
            sort_order: 2,
          }
        ]
      }
    ]
  },
  {
    id: 'royal-outlet-eventura',
    hotel_id: '11',
    outlet_code: 'eventura_banquet',
    slug: 'eventura-events-catering',
    outlet_type: 'banquet',
    name_en: 'Eventura Events & Outdoor Catering',
    name_ar: 'إيفينتورا للحفلات والتموين الخارجي',
    short_description_en: 'Prestigious event planning, luxury banqueting, and bespoke outdoor catering services.',
    short_description_ar: 'تخطيط الفعاليات الراقية، حفلات الزفاف، المؤتمرات الدولية، والتموين الخارجي الفاخر.',
    full_description_en:
      'Eventura is the premier Events and Outdoor Catering division of Swiss Flora Royal Hotel Riyadh, embodying sophistication and exclusivity. We specialize in creating extraordinary experiences for high-profile corporate meetings, lavish weddings, and social gatherings with tailored menus and seamless service.',
    full_description_ar:
      'إيفينتورا هو القسم الرئيسي للفعاليات والتموين الخارجي في فندق سويس فلورا رويال الرياض، يجسد الرقي والفخامة في تنظيم الفعاليات المؤسسية، حفلات الزفاف، واللقاءات الخاصة مع قوائم طعام مخصصة وفريق خدمة محترف.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Meeting/e3004a05-5d76-4ec6-aba8-11c10bbdbde6/shutterstock_145238350.jpg',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Meeting/3eb11f26-33b9-401c-9cb4-172c63a44507/Buffet%20Ramadan%202024.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/8eafecc9-3ed2-42bf-9b64-67966d39dfed/download9.png',
    ],
    cuisine_en: 'Bespoke Event & Banquet Menus',
    cuisine_ar: 'قوائم مآدب وحفلات مخصصة',
    dress_code_en: 'Formal / Business',
    dress_code_ar: 'رسمي / عمل',
    location: {
      building_en: 'Eventura Conference Center',
      building_ar: 'مركز إيفينتورا للمؤتمرات',
      floor_en: 'Mezzanine Level (M)',
      floor_ar: 'طابق الميزانين (M)',
      internal_text_en: 'Private dedicated event lobby',
      internal_text_ar: 'مدخل وردهة استقبال خاصة للفعاليات',
    },
    operating_info: {
      opening_hours_en: 'By Appointment / Event Scheduling',
      opening_hours_ar: 'حسب المواعيد وحجوزات الفعاليات',
      periods: [
        { name_en: 'Event Sales Desk', name_ar: 'مكتب مبيعات الفعاليات', time_en: '09:00 - 18:00', time_ar: '09:00 - 18:00' },
      ],
    },
    contact: {
      phone: '+966112349999',
      extension: '210',
      whatsapp_number: '+966112349999',
      whatsapp_enabled: true,
      default_message_en: 'Hello Eventura, I would like to inquire about hosting a corporate event / wedding.',
      default_message_ar: 'مرحباً بإيفينتورا، أود الاستفسار عن حجز قاعة وتنظيم حفل / فعالية.',
      email: 'eventura.royal@swissflorahotels.com',
    },
    audience: 'BOTH',
    is_active: true,
    is_visible: true,
    sort_order: 4,
    menu_categories: []
  }
];

export const SWISS_FLORA_INN_OUTLETS: FBOutlet[] = [
  {
    id: 'inn-outlet-restaurant',
    hotel_id: '12',
    outlet_code: 'inn_restaurant',
    slug: 'swiss-flora-restaurant-inn',
    outlet_type: 'restaurant',
    name_en: 'Swiss Flora Restaurant',
    name_ar: 'مطعم سويس فلورا - إن الرياض',
    short_description_en: 'All-day dining restaurant featuring fresh breakfast buffet and flavorful international dishes.',
    short_description_ar: 'مطعم مفتوح طوال اليوم يقدم بوفيه إفطار شهي وأطباقاً دولية لذيذة بأسعار مناسبة.',
    full_description_en:
      'Swiss Flora Inn Hotel features an inviting all-day dining restaurant offering a delicious morning buffet at an affordable rate of 49 SAR per person, along with à la carte comfort food favorites throughout the afternoon and evening.',
    full_description_ar:
      'يضم فندق سويس فلورا إن مطعماً ترحيبياً مفتوحاً طوال اليوم، يقدم بوفيه إفطار صباحي لذيذ بسعر مناسب 49 ريال للشخص الواحد، بالإضافة إلى قائمة مأكولات شهية من الغداء وحتى المساء.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-2.jpg',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-2.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/0c6bdc3d-cab4-4cfe-b2bf-37b8acd55d99/20191104_161312.jpg',
    ],
    cuisine_en: 'International All-Day Dining',
    cuisine_ar: 'مأكولات عالمية على مدار اليوم',
    dress_code_en: 'Casual',
    dress_code_ar: 'عادي مريح',
    location: {
      building_en: 'Swiss Flora Inn Main Building',
      building_ar: 'المبنى الرئيسي لسويس فلورا إن',
      floor_en: 'Ground Floor',
      floor_ar: 'الطابق الأرضي',
      internal_text_en: 'Direct access from lobby',
      internal_text_ar: 'مدخل مباشر من البهو',
    },
    operating_info: {
      opening_hours_en: '06:30 - 23:00 Daily',
      opening_hours_ar: '06:30 صباحاً - 11:00 مساءً يومياً',
      periods: [
        { name_en: 'Breakfast Buffet', name_ar: 'بوفيه الإفطار', time_en: '06:30 - 10:30', time_ar: '06:30 - 10:30' },
        { name_en: 'All-Day Dining', name_ar: 'قائمة طوال اليوم', time_en: '12:00 - 23:00', time_ar: '12:00 - 23:00' },
      ],
    },
    contact: {
      phone: '+966112349999',
      extension: '101',
      whatsapp_number: '+966112349999',
      whatsapp_enabled: true,
      default_message_en: 'Hello Swiss Flora Inn Restaurant, I would like to inquire about breakfast & dining.',
      default_message_ar: 'مرحباً بمطعم سويس فلورا إن، أود الاستفسار بخصوص وجبة الإفطار وطلب الطعام.',
      email: 'Info.inn@swissflorahotels.com',
    },
    audience: 'BOTH',
    is_active: true,
    is_visible: true,
    sort_order: 1,
    featured_offer: SWISS_FLORA_INN_OFFERS[1],
    menu_categories: [
      {
        id: 'cat-inn-bfast',
        outlet_id: 'inn-outlet-restaurant',
        code: 'inn_bfast',
        name_en: 'Inn Breakfast Selections',
        name_ar: 'خيارات إفطار سويس فلورا إن',
        is_active: true,
        sort_order: 1,
        items: [
          {
            id: 'item-inn-bfast-buffet',
            item_code: 'INN-01',
            category_id: 'cat-inn-bfast',
            name_en: 'Continental Breakfast Buffet (Special 49 SAR)',
            name_ar: 'بوفيه الإفطار القاري المميز (49 ر.س)',
            description_en: 'Fresh pastries, juices, coffee, tea, scrambled eggs, cheeses, and cold cuts.',
            description_ar: 'معجنات طازجة، عصائر، شاي وقهوة، بيض مخفوق، أجبان ومقبلات إفطار متنوعة.',
            image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80',
            price: 49,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_featured: true,
          }
        ]
      }
    ]
  },
  {
    id: 'inn-outlet-room-service',
    hotel_id: '12',
    outlet_code: 'room_service',
    slug: '24-7-room-service-inn',
    outlet_type: 'room_service',
    name_en: '24/7 Room Service (Dial 222)',
    name_ar: 'خدمة الغرف على مدار 24 ساعة (تحويلة 222)',
    short_description_en: 'Quick meals, sandwiches, and refreshments delivered directly to your room day and night.',
    short_description_ar: 'وجبات سريعة، ساندويتشات، ومشروبات باردة وساخنة تصل إلى باب غرفتك ليلاً ونهاراً.',
    full_description_en:
      'Swiss Flora Inn provides 24-hour room service to ensure comfort for guests returning after busy business meetings at KAFD or sightseeing at Boulevard World. Simply dial 222 from your room phone.',
    full_description_ar:
      'يوفر فندق سويس فلورا إن خدمة الغرف على مدار 24 ساعة لضمان أقصى درجات الراحة بعد يوم عمل في كافد أو جولة في بوليفارد وورلد. اتصل على 222 من هاتف غرفتك.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/cb2a4062-6175-46e4-8c4c-c65714f26fc8/_22A7761.JPG',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/cb2a4062-6175-46e4-8c4c-c65714f26fc8/_22A7761.JPG',
    ],
    cuisine_en: '24/7 Comfort Food & Refreshments',
    cuisine_ar: 'وجبات ومشروبات خفيفة على مدار الساعة',
    dress_code_en: 'Casual',
    dress_code_ar: 'مريح',
    location: {
      building_en: 'Swiss Flora Inn Main Building',
      building_ar: 'المبنى الرئيسي لسويس فلورا إن',
      floor_en: 'All Guest Rooms',
      floor_ar: 'كافة غرف النزلاء',
      internal_text_en: 'Dial 222 from room phone',
      internal_text_ar: 'اتصل على تحويلة 222 من هاتف الغرفة',
    },
    operating_info: {
      opening_hours_en: '24 Hours Daily',
      opening_hours_ar: 'متاح 24 ساعة يومياً',
      periods: [
        { name_en: '24/7 Room Service', name_ar: 'خدمة غرف مستمرة 24 ساعة', time_en: '00:00 - 23:59', time_ar: '00:00 - 23:59' },
      ],
    },
    contact: {
      phone: '+966112349999',
      extension: '222',
      whatsapp_number: '+966112349999',
      whatsapp_enabled: true,
      default_message_en: 'Hello Inn Room Service (Ext 222), I would like to place an order to my room.',
      default_message_ar: 'مرحباً بخدمة الغرف (تحويلة 222)، أود طلب وجبة لغرفتي.',
      email: 'Info.inn@swissflorahotels.com',
    },
    audience: 'IN_HOUSE',
    is_active: true,
    is_visible: true,
    sort_order: 2,
    menu_categories: []
  }
];

// =========================================================================
// 4. SWISS FLORA WELLNESS & SPA (ROYAL & INN)
// =========================================================================
export const SWISS_FLORA_ROYAL_WELLNESS: WellnessService[] = [
  {
    id: 'royal-well-massage',
    hotel_id: '11',
    service_code: 'massage_room',
    slug: 'massage-room',
    service_type: 'massage',
    name_en: 'Flora Massage Sanctuary',
    name_ar: 'غرفة المساج والتدليك - فلورا جيم وسبا',
    short_description_en: 'Swedish, Thai, and deep relaxation massage treatments designed to relieve tension and revitalize body & mind.',
    short_description_ar: 'جلسات تدليك سويدي، تايلاندي، وتدليك الاسترخاء العميق لتجديد الحيوية وتخفيف التوتر.',
    full_description_en:
      'Enjoy a relaxing session after a stressful day in our Massage Room at Flora Fitness & Spa. Experience soothing treatments designed to relieve tension and rejuvenate your body and mind. We offer Swedish Massage (gentle full-body promoting circulation), Thai Massage (traditional technique combining stretching and acupressure), and Relaxation Massage.',
    full_description_ar:
      'استمتع بجلسة استرخاء بعد يوم طويل في غرفة التدليك لدينا في فلورا جيم وسبا. جرب العلاجات المهدئة المصممة لتخفيف التوتر وتجديد الجسم والعقل. نقدم التدليك السويدي، التدليك التايلاندي التقليدي، وتدليك الاسترخاء.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/e73ab5fe-9ed7-48e4-813a-d42837bef79e/spa2.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/192b94fb-ff7c-4bdb-b892-e2f25ba19770/spa1.jpg',
    ],
    location: {
      building_en: 'Flora Fitness & Spa Club',
      building_ar: 'نادي فلورا للياقة والسبا',
      floor_en: '3rd Floor Wellness Deck',
      floor_ar: 'الطابق الثالث - طابق العافية',
      internal_text_en: 'Flora Spa Reception Desk',
      internal_text_ar: 'مكتب استقبال فلورا سبا',
    },
    operating_info: {
      opening_hours_en: '07:00 - 23:00 Daily',
      opening_hours_ar: '07:00 صباحاً - 11:00 مساءً يومياً',
      periods: [
        { name_en: 'Daily Treatments', name_ar: 'الجلسات اليومية', time_en: '07:00 - 23:00', time_ar: '07:00 - 23:00' },
      ],
    },
    contact: {
      phone: '+966555072806',
      extension: '330',
      whatsapp_number: '+966555072806',
      whatsapp_enabled: true,
      default_message_en: 'Hello Flora Spa, I would like to book a Massage session.',
      default_message_ar: 'مرحباً بفلورا سبا، أود حجز جلسة مساج واستفسر عن المواعيد المتاحة.',
    },
    price: 350,
    offer_price: 280,
    currency: 'SAR',
    duration_minutes: 60,
    availability_en: 'Daily 07:00 - 23:00 by appointment',
    availability_ar: 'يومياً من 7 صباحاً حتى 11 مساءً بالحجز المسبق',
    booking_enabled: true,
    audience: 'BOTH',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'royal-well-gym',
    hotel_id: '11',
    service_code: 'fitness_center',
    slug: 'fitness-center',
    service_type: 'gym',
    name_en: 'Inspirations Gym Center',
    name_ar: 'نادي إنسبيريشنز الرياضي - فلورا فيتنس',
    short_description_en: 'State-of-the-art gym equipped with the latest cardio machines, free weights, and certified instructors.',
    short_description_ar: 'صالة رياضية مجهزة بالكامل بأحدث معدات اللياقة البدنية والأوزان الحرة ومدربين محترفين.',
    full_description_en:
      'Elevate your fitness routine at our state-of-the-art Gym Center. Designed to meet all your workout needs, our center offers a comprehensive range of equipment and services to help you achieve your fitness goals: Modern equipment, free weights, trained staff, and a comfortable workout environment.',
    full_description_ar:
      'ارتقِ بروتينك الرياضي في مركز اللياقة البدنية الحديث لدينا في فلورا فيتنس. مجهز بالكامل بأحدث أجهزة اللياقة البدنية والأوزان الحرة لتمرين متكامل بإشراف مدربين محترفين.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/4d53ec60-8e37-4d3b-9111-3cbd6e5b66e3/Gym%20Area%202.jpg',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/4d53ec60-8e37-4d3b-9111-3cbd6e5b66e3/Gym%20Area%202.jpg',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/bf3be8e8-1fbc-4a69-91e8-19d8edb5ed29/spa3.jpg',
    ],
    location: {
      building_en: 'Flora Fitness & Spa Club',
      building_ar: 'نادي فلورا للياقة والسبا',
      floor_en: '3rd Floor',
      floor_ar: 'الطابق الثالث',
      internal_text_en: 'Entrance via Spa Reception',
      internal_text_ar: 'الدخول عبر استقبال السبا',
    },
    operating_info: {
      opening_hours_en: '07:00 - 22:00 Daily',
      opening_hours_ar: '07:00 صباحاً - 10:00 مساءً يومياً',
      periods: [
        { name_en: 'Gym Hours', name_ar: 'أوقات الصالة الرياضية', time_en: '07:00 - 22:00', time_ar: '07:00 - 22:00' },
      ],
    },
    contact: {
      phone: '+966555072806',
      extension: '331',
      whatsapp_number: '+966555072806',
      whatsapp_enabled: true,
      default_message_en: 'Hello Inspirations Gym, I have a question about personal training.',
      default_message_ar: 'مرحباً بمدرب الصالة الرياضية، أود الاستفسار عن التدريب الشخصي.',
    },
    price: 0,
    currency: 'SAR',
    availability_en: 'Complimentary for all in-house guests',
    availability_ar: 'دخول مجاني لجميع نزلاء الفندق',
    booking_enabled: false,
    audience: 'BOTH',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'royal-well-pool',
    hotel_id: '11',
    service_code: 'flora_pool',
    slug: 'the-flora-pool',
    service_type: 'pool',
    name_en: 'The Flora Indoor Pool & Relaxation Area',
    name_ar: 'حمام سباحة فلورا وواحة الاسترخاء',
    short_description_en: 'Elegantly designed indoor swimming pool with climate-controlled waters and tranquil relaxation deck.',
    short_description_ar: 'مسبح داخلي بتصميم أنيق ومياه معتدلة الحرارة مع منطقة استرخاء هادئة لراحة متكاملة.',
    full_description_en:
      'Immerse yourself in luxury at The Flora Pool, where relaxation meets elegance. Enjoy a range of rejuvenating experiences designed to refresh body and mind. Beautifully designed pool ideal for leisurely swims and unwinding.',
    full_description_ar:
      'اغمر نفسك في الفخامة في مسبح فلورا، حيث يلتقي الاسترخاء بالأناقة. استمتع بمجموعة من التجارب المتجددة المصممة لإنعاش الجسم والعقل في بيئة هادئة ومسبح أنيق.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/84352dbf-9708-4e81-b174-03156b9bb95b/Pool%204.jpg',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/84352dbf-9708-4e81-b174-03156b9bb95b/Pool%204.jpg',
    ],
    location: {
      building_en: 'Flora Fitness Club',
      building_ar: 'نادي فلورا الصحي',
      floor_en: '3rd Floor',
      floor_ar: 'الطابق الثالث',
      internal_text_en: 'Direct pool deck access',
      internal_text_ar: 'مدخل المسبح المباشر',
    },
    operating_info: {
      opening_hours_en: '07:00 - 22:00 Daily',
      opening_hours_ar: '07:00 صباحاً - 10:00 مساءً يومياً',
      periods: [
        { name_en: 'Pool Hours', name_ar: 'أوقات المسبح', time_en: '07:00 - 22:00', time_ar: '07:00 - 22:00' },
      ],
    },
    contact: {
      phone: '+966555072806',
      extension: '332',
      whatsapp_number: '+966555072806',
      whatsapp_enabled: true,
      default_message_en: 'Hello Pool Desk, I have a question about swimming hours.',
      default_message_ar: 'مرحباً بمسؤول المسبح، أود الاستفسار عن أوقات السباحة.',
    },
    price: 0,
    currency: 'SAR',
    availability_en: 'Complimentary for hotel guests',
    availability_ar: 'مجاني لكافة نزلاء الفندق',
    booking_enabled: false,
    audience: 'BOTH',
    is_active: true,
    sort_order: 3,
  }
];

export const SWISS_FLORA_INN_WELLNESS: WellnessService[] = [
  {
    id: 'inn-well-gym-pool',
    hotel_id: '12',
    service_code: 'inn_gym_pool',
    slug: 'inn-gym-and-pool',
    service_type: 'health_club',
    name_en: 'Inspirations Health Club & Pool',
    name_ar: 'نادي إنسبيريشنز والمسبح - إن الرياض',
    short_description_en: 'Equipped fitness gym, swimming pool, sauna, and massage facilities for Swiss Flora Inn guests.',
    short_description_ar: 'نادي رياضي مجهز، مسبح منعش، ساونا، وغرفة مساج لراحة نزلاء سويس فلورا إن.',
    full_description_en:
      'Swiss Flora Inn provides comprehensive wellness facilities including a clean swimming pool, fitness gym, sauna, and massage treatments to help you stay refreshed and energized during your stay in Riyadh.',
    full_description_ar:
      'يوفر فندق سويس فلورا إن مرافق عافية متكاملة تشمل مسبحاً ونادياً رياضياً وساونا لضمان تجديد نشاطك وحيويتك طوال إقامتك بالرياض.',
    hero_image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/84352dbf-9708-4e81-b174-03156b9bb95b/Pool%204.jpg',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/84352dbf-9708-4e81-b174-03156b9bb95b/Pool%204.jpg',
    ],
    location: {
      building_en: 'Swiss Flora Inn Main Building',
      building_ar: 'مبنى سويس فلورا إن',
      floor_en: 'Health Club Level',
      floor_ar: 'طابق النادي الصحي',
      internal_text_en: 'Health Club entrance',
      internal_text_ar: 'مدخل النادي الصحي',
    },
    operating_info: {
      opening_hours_en: '07:00 - 22:00 Daily',
      opening_hours_ar: '07:00 صباحاً - 10:00 مساءً يومياً',
      periods: [
        { name_en: 'Daily Hours', name_ar: 'الأوقات اليومية', time_en: '07:00 - 22:00', time_ar: '07:00 - 22:00' },
      ],
    },
    contact: {
      phone: '+966112349999',
      extension: '301',
      whatsapp_number: '+966112349999',
      whatsapp_enabled: true,
      default_message_en: 'Hello Inn Health Club, I would like to inquire about pool & gym access.',
      default_message_ar: 'مرحباً بالنادي الصحي، أود الاستفسار عن المسبح والصالة الرياضية.',
    },
    price: 0,
    currency: 'SAR',
    availability_en: 'Complimentary for all Inn guests',
    availability_ar: 'مجاناً لجميع نزلاء الفندق',
    booking_enabled: false,
    audience: 'BOTH',
    is_active: true,
    sort_order: 1,
  }
];

// =========================================================================
// 5. SWISS FLORA CONTACTS DIRECTORY
// =========================================================================
export const SWISS_FLORA_ROYAL_CONTACTS: DepartmentContact[] = [
  {
    id: 'royal-contact-frontdesk',
    department_code: 'front_office',
    name_en: 'Royal Front Desk & Reception',
    name_ar: 'الاستقبال والمكتب الأمامي الملكي',
    phone: '+966112349999',
    extension: '0',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Swiss Flora Royal Reception, I need assistance with my room.',
    default_message_ar: 'مرحباً بالاستقبال الملكي، أحتاج إلى مساعدة بخصوص غرفتي.',
    email: 'Info.royal@swissflorahotels.com',
    hours_en: '24 Hours Daily',
    hours_ar: 'مفتوح 24 ساعة يومياً',
    is_active: true,
  },
  {
    id: 'royal-contact-roomservice',
    department_code: 'room_service',
    name_en: '24/7 Room Service (Dial 222)',
    name_ar: 'خدمة الغرف (اتصل 222)',
    phone: '+966112349999',
    extension: '222',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Room Service (Dial 222), I would like to place an order.',
    default_message_ar: 'مرحباً بخدمة الغرف (تحويلة 222)، أود طلب وجبة لغرفتي.',
    email: 'Info.royal@swissflorahotels.com',
    hours_en: '24 Hours Daily',
    hours_ar: 'على مدار 24 ساعة يومياً',
    is_active: true,
  },
  {
    id: 'royal-contact-flora-rest',
    department_code: 'restaurant',
    name_en: 'Flora Restaurant Desk',
    name_ar: 'مكتب مطعم فلورا',
    phone: '+966112349999',
    extension: '201',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Flora Restaurant, I would like to reserve a table.',
    default_message_ar: 'مرحباً بمطعم فلورا، أود حجز طاولة.',
    email: 'Info.royal@swissflorahotels.com',
    hours_en: '06:30 - 23:30 Daily',
    hours_ar: '06:30 صباحاً - 11:30 مساءً',
    is_active: true,
  },
  {
    id: 'royal-contact-cafe',
    department_code: 'cafe',
    name_en: 'Swiss Café & Lounge Bar',
    name_ar: 'سويس كافيه ولاونج',
    phone: '+966112349999',
    extension: '205',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Swiss Café, I would like to order coffee & desserts.',
    default_message_ar: 'مرحباً بسويس كافيه، أود طلب قهوة وحلويات.',
    email: 'Info.royal@swissflorahotels.com',
    hours_en: '06:30 - 23:30 Daily',
    hours_ar: '06:30 صباحاً - 11:30 مساءً',
    is_active: true,
  },
  {
    id: 'royal-contact-spa',
    department_code: 'spa',
    name_en: 'Flora Fitness & Spa Desk',
    name_ar: 'مكتب فلورا جيم وسبا',
    phone: '+966555072806',
    extension: '330',
    whatsapp_number: '+966555072806',
    whatsapp_enabled: true,
    default_message_en: 'Hello Flora Spa, I would like to schedule a massage session.',
    default_message_ar: 'مرحباً بفلورا سبا، أود حجز جلسة مساج.',
    hours_en: '07:00 - 23:00 Daily',
    hours_ar: '07:00 صباحاً - 11:00 مساءً',
    is_active: true,
  },
  {
    id: 'royal-contact-eventura',
    department_code: 'concierge',
    name_en: 'Eventura Events & Banquets',
    name_ar: 'إيفينتورا لتنظيم الفعاليات والمؤتمرات',
    phone: '+966112349999',
    extension: '210',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Eventura, I would like to inquire about meetings & wedding halls.',
    default_message_ar: 'مرحباً بإيفينتورا، أود الاستفسار عن قاعات الاجتماعات والحفلات.',
    email: 'eventura.royal@swissflorahotels.com',
    hours_en: '09:00 - 18:00 Daily',
    hours_ar: '09:00 صباحاً - 06:00 مساءً',
    is_active: true,
  },
  {
    id: 'royal-contact-housekeeping',
    department_code: 'housekeeping',
    name_en: 'Housekeeping & Valet',
    name_ar: 'خدمة التدبير المنزلي والمغسلة',
    phone: '+966112349999',
    extension: '4',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Housekeeping, I need extra towels & room refresh.',
    default_message_ar: 'مرحباً بخدمة الغرف، أحتاج مناشف إضافية وترتيب الغرفة.',
    hours_en: '24 Hours Daily',
    hours_ar: '24 ساعة يومياً',
    is_active: true,
  }
];

export const SWISS_FLORA_INN_CONTACTS: DepartmentContact[] = [
  {
    id: 'inn-contact-frontdesk',
    department_code: 'front_office',
    name_en: 'Inn Front Desk & Reception',
    name_ar: 'الاستقبال والمكتب الأمامي - فندق الإن',
    phone: '+966112349999',
    extension: '0',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Swiss Flora Inn Reception, I need assistance with my reservation.',
    default_message_ar: 'مرحباً باستقبال سويس فلورا إن، أود المساعدة بخصوص الحجز.',
    email: 'Info.inn@swissflorahotels.com',
    hours_en: '24 Hours Daily',
    hours_ar: 'مفتوح 24 ساعة يومياً',
    is_active: true,
  },
  {
    id: 'inn-contact-roomservice',
    department_code: 'room_service',
    name_en: 'Inn Room Service (Dial 222)',
    name_ar: 'خدمة الغرف (اتصل 222)',
    phone: '+966112349999',
    extension: '222',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Inn Room Service (Ext 222), I would like to order food.',
    default_message_ar: 'مرحباً بخدمة الغرف (تحويلة 222)، أود طلب طعام إلى غرفتي.',
    email: 'Info.inn@swissflorahotels.com',
    hours_en: '24 Hours Daily',
    hours_ar: 'متاح 24 ساعة يومياً',
    is_active: true,
  },
  {
    id: 'inn-contact-rest',
    department_code: 'restaurant',
    name_en: 'Swiss Flora Restaurant Desk',
    name_ar: 'مكتب مطعم سويس فلورا',
    phone: '+966112349999',
    extension: '101',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Restaurant Desk, I would like to inquire about breakfast.',
    default_message_ar: 'مرحباً بمطعم الفندق، أود الاستفسار عن وجبة الإفطار.',
    email: 'Info.inn@swissflorahotels.com',
    hours_en: '06:30 - 23:00 Daily',
    hours_ar: '06:30 صباحاً - 11:00 مساءً',
    is_active: true,
  },
  {
    id: 'inn-contact-housekeeping',
    department_code: 'housekeeping',
    name_en: 'Inn Housekeeping & Amenities',
    name_ar: 'خدمة التدبير المنزلي والمستلزمات',
    phone: '+966112349999',
    extension: '4',
    whatsapp_number: '+966112349999',
    whatsapp_enabled: true,
    default_message_en: 'Hello Housekeeping, I need assistance in my room.',
    default_message_ar: 'مرحباً بخدمة التدبير المنزلي، أحتاج إلى خدمة في الغرفة.',
    hours_en: '24 Hours Daily',
    hours_ar: '24 ساعة يومياً',
    is_active: true,
  }
];

// =========================================================================
// 6. SWISS FLORA COMPLETE HOTEL RECORDS
// =========================================================================
export const SWISS_FLORA_ROYAL_HOTEL: Hotel = {
  id: '11',
  slug: 'swiss-flora-royal-hotel-riyadh',
  name_en: 'Swiss Flora Royal Hotel Riyadh',
  name_ar: 'فندق سويس فلورا رويال الرياض',
  tagline_en: 'Swiss precision and hospitality in the heart of Riyadh',
  tagline_ar: 'دقة الضيافة السويسرية وأصالتها في قلب العاصمة الرياض',
  description_en:
    'Swiss Flora Royal Hotel Riyadh is a premier 4-star luxury destination situated on King Fahad Road in the prestigious Al Sahafa District. Featuring 80 elegant rooms and suites, all-day international dining at Flora Restaurant, Swiss Café & Lounge, 24/7 Room Service, the rejuvenating Flora Fitness & Spa, and Eventura conference and banqueting facilities.',
  description_ar:
    'يقع فندق سويس فلورا رويال الرياض الفاخر فئة 4 نجوم على طريق الملك فهد في حي الصحافة المتميز، على بعد 15 دقيقة فقط من مطار الملك خالد الدولي و5 دقائق من كافد وبوليفارد وورلد. يوفر 80 غرفة وجناحاً مجهزاً بأحدث وسائل الراحة، ومطعم فلورا بوفيه دولي، وسويس كافيه ولاونج، وخدمة الغرف على مدار 24 ساعة، وفلورا جيم وسبا مع مسبح ومساج، وقاعات إيفينتورا للاجتماعات والفعاليات.',
  classification_stars: 4,
  classification_label_en: '4-Star Royal Hotel & Spa',
  classification_label_ar: 'فندق وسبا ملكي فئة 4 نجوم',
  logo_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Hotels/dcfd7d14-bea1-41d1-838e-75dcb39b486c/WhatsApp%20Image%202025-03-01%20at%2022.30.14.jpeg',
  favicon_url: '/vite.svg',
  currency: 'SAR',
  hero_images: [
    {
      url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png',
      caption_en: 'Swiss Flora Royal Suites & Elegant Spaces',
      caption_ar: 'أجنحة وغرف سويس فلورا رويال الفاخرة',
      tag_en: 'Royal Living',
      tag_ar: 'الإقامة الملكية',
    },
    {
      url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/b999a510-6e27-4992-95f0-dfb78a82d4c0/downloadk.png',
      caption_en: 'Flora Restaurant - All Day International Dining',
      caption_ar: 'مطعم فلورا - بوفيهات دولية ومحطات طهي حية',
      tag_en: 'Gastronomy',
      tag_ar: 'فنون الطهي',
    },
    {
      url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/84352dbf-9708-4e81-b174-03156b9bb95b/Pool%204.jpg',
      caption_en: 'The Flora Pool & Inspirations Wellness Sanctuary',
      caption_ar: 'مسبح فلورا الداخلي وواحة الاسترخاء والعافية',
      tag_en: 'Wellness & Pool',
      tag_ar: 'المسبح والاسترخاء',
    },
    {
      url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Meeting/6b930953-98c8-43fb-ad8b-a05847209738/WhatsApp%20Image%202024-08-01%20at%2016.37.07%20(1).jpg',
      caption_en: 'Eventura Conference Halls & Business Events',
      caption_ar: 'قاعات إيفينتورا للاجتماعات والفعاليات والمؤتمرات',
      tag_en: 'Meetings & Events',
      tag_ar: 'المؤتمرات والفعاليات',
    },
  ],
  address_en: 'King Fahad Rd., Al Sahafa District P.O Box 18018, Riyadh 11415, Kingdom Of Saudi Arabia',
  address_ar: 'طريق الملك فهد، حي الصحافة ص. ب 18018، الرياض 11415، المملكة العربية السعودية',
  city_en: 'Riyadh',
  city_ar: 'الرياض',
  country_en: 'Saudi Arabia',
  country_ar: 'المملكة العربية السعودية',
  phone: '+966112349999',
  email: 'Info.royal@swissflorahotels.com',
  whatsapp_number: '+966112349999',
  branding: {
    primary: '#872033',
    secondary: '#1C1917',
    accent: '#C5A880',
    background: '#FAF8F5',
    surface: '#FFFFFF',
    text: '#1C1917',
    muted: '#78716C',
    border: '#E7E5E4',
    button: '#872033',
    radius: '14px',
  },
  typography: {
    arHeadingFont: 'Cairo',
    arBodyFont: 'Tajawal',
    enHeadingFont: 'Playfair Display',
    enBodyFont: 'Plus Jakarta Sans',
  },
  portal_config: createDefaultPortalConfig(),
  departments: [
    {
      id: 'dept-royal-frontdesk',
      name_en: 'Front Desk & Reception',
      name_ar: 'الاستقبال وخدمات النزلاء',
      code: 'rooms',
      phone: '+966112349999',
      whatsapp_number: '+966112349999',
      email: 'Info.royal@swissflorahotels.com',
      sla_target: '5 min response',
      is_active: true,
    },
    {
      id: 'dept-royal-dining',
      name_en: 'Food & Beverage / In-Room Dining',
      name_ar: 'المطاعم وخدمة الغرف 24/7',
      code: 'dining',
      phone: '+966112349999',
      whatsapp_number: '+966112349999',
      email: 'Info.royal@swissflorahotels.com',
      sla_target: '20-30 min delivery',
      is_active: true,
    },
    {
      id: 'dept-royal-spa',
      name_en: 'Flora Fitness & Spa Sanctuary',
      name_ar: 'فلورا جيم وسبا والمسبح',
      code: 'wellness',
      phone: '+966555072806',
      whatsapp_number: '+966555072806',
      email: 'Info.royal@swissflorahotels.com',
      sla_target: 'Instant scheduling',
      is_active: true,
    },
  ],
  policies: {
    checkInTime: '15:00',
    checkOutTime: '12:00',
    cancellationPolicy_en: 'Free cancellation up to 24 hours before check-in date on flexible rate plans.',
    cancellationPolicy_ar: 'إلغاء مجاني حتى 24 ساعة قبل موعد الوصول للخطط السعرية المرنة.',
    smokingPolicy_en: 'Non-smoking property in all rooms and suites. Dedicated smoking zones available.',
    smokingPolicy_ar: 'جميع الغرف والأجنحة مخصصة لغير المدخنين مع توفر أماكن مخصصة للتدخين.',
    wifiSsid: 'SwissFlora-Royal-Guest',
    parkingInfo_en: 'Free private onsite parking with valet assistance for all registered hotel guests.',
    parkingInfo_ar: 'مواقف خاصة مجانية للسيارات في الموقع مع خدمة صف السيارات لجميع النزلاء.',
  },
  rooms: SWISS_FLORA_ROYAL_ROOMS,
  offers: SWISS_FLORA_ROYAL_OFFERS,
  diningVenues: [
    {
      id: 'venue-flora',
      hotel_id: '11',
      slug: 'flora-restaurant',
      name_en: 'Flora Restaurant - All Day Dining',
      name_ar: 'مطعم فلورا - بوفيه دولي',
      type_en: 'All-Day Dining Buffet & Live Kitchen',
      type_ar: 'بوفيه طوال اليوم ومحطات طهي حية',
      cuisine_en: 'International & Swiss',
      cuisine_ar: 'مأكولات عالمية وسويسرية',
      description_en: 'Extensive international buffets, live cooking stations, and fresh pastries.',
      description_ar: 'بوفيهات دولية واسعة ومحطات طهي حية ومعجنات قارية طازجة.',
      opening_hours_en: '06:30 - 23:30 Daily',
      opening_hours_ar: '06:30 صباحاً - 11:30 مساءً يومياً',
      dress_code_en: 'Smart Casual',
      dress_code_ar: 'أنيق غير رسمي',
      image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/b999a510-6e27-4992-95f0-dfb78a82d4c0/downloadk.png',
      menu_highlights_en: ['International Breakfast Buffet', 'Royal Lamb Kabsa', 'Pan-Seared Salmon'],
      menu_highlights_ar: ['بوفيه إفطار دولي', 'كبسة اللحم النعيمي الملكية', 'سلمون نرويجي مشوي'],
      is_room_service_capable: true,
      whatsapp_ordering: true,
    },
    {
      id: 'venue-swiss-cafe',
      hotel_id: '11',
      slug: 'swiss-cafe-lounge',
      name_en: 'Swiss Café Restaurant & Lounge',
      name_ar: 'سويس كافيه مطعم ولاونج',
      type_en: 'Specialty Café & À La Carte Lounge',
      type_ar: 'مقهى ومطعم ولاونج عصري',
      cuisine_en: 'Artisanal Coffee, Pastries & International Favorites',
      cuisine_ar: 'قهوة مختصة وحلويات ومأكولات عالمية',
      description_en: 'Show kitchen with à la carte specialties and artisanal espresso bar.',
      description_ar: 'مطبخ مفتوح حسب الطلب وقهوة مختصة في أجواء استرخاء.',
      opening_hours_en: '06:30 - 23:30 Daily',
      opening_hours_ar: '06:30 صباحاً - 11:30 مساءً',
      dress_code_en: 'Casual Chic',
      dress_code_ar: 'أنيق مريح',
      image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/d047d924-8978-4e1a-819e-8e0062776e71/downloadc.png',
      menu_highlights_en: ['Swiss Flora Spanish Latte', 'Berry Virgin Mojito', 'Cheesecake'],
      menu_highlights_ar: ['سبانش لاتيه سويس فلورا', 'موهيتو التوت', 'تشيز كيك باريسي'],
      is_room_service_capable: true,
      whatsapp_ordering: true,
    }
  ],
  wellnessFacilities: [
    {
      id: 'fac-royal-spa',
      hotel_id: '11',
      name_en: 'Flora Fitness & Spa Sanctuary',
      name_ar: 'فلورا جيم وسبا الفاخر',
      type_en: 'Spa, Massage, Sauna & Fitness',
      type_ar: 'سبا ومساج وساونا ونادي رياضي',
      description_en: 'Bespoke massage rituals, Swedish & Thai massages, heated indoor pool, sauna, and modern gym.',
      description_ar: 'جلسات تدليك سويدي وتايلاندي، مسبح داخلي، ساونا، وصالة رياضية مجهزة.',
      hours_en: '07:00 - 23:00 Daily',
      hours_ar: '07:00 صباحاً - 11:00 مساءً',
      image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg',
      signature_treatments_en: ['Swedish Massage (60 min)', 'Thai Massage (60 min)', 'Relaxation Ritual'],
      signature_treatments_ar: ['تدليك سويدي (60 دقيقة)', 'تدليك تايلاندي (60 دقيقة)', 'جلسة الاسترخاء التام'],
      price_from: 280,
      currency: 'SAR',
    }
  ],
  services: [],
  is_published: true,
};

export const SWISS_FLORA_INN_HOTEL: Hotel = {
  id: '12',
  slug: 'swiss-flora-inn-hotel-riyadh',
  name_en: 'Swiss Flora Inn Hotel Riyadh',
  name_ar: 'فندق سويس فلورا إن الرياض',
  tagline_en: 'Comfort, modern convenience, and smart value in the Business District',
  tagline_ar: 'الراحة العصرية والقيمة الذكية في قلب حي الأعمال بالرياض',
  description_en:
    'Swiss Flora Inn Hotel Riyadh is designed for comfort and convenience. Located in the heart of the Business District near Boulevard World and King Abdullah Financial City (KAFD), the hotel features 80 spacious and family-friendly rooms and suites with high-end finishes, an all-day dining restaurant, complimentary high-speed Wi-Fi, fitness club, pool, and affordable rates.',
  description_ar:
    'تم تصميم فندق سويس فلورا إن الرياض لتوفير أقصى درجات الراحة والملاءمة. يقع الفندق في قلب المنطقة التجارية بالقرب من كافد وبوليفارد وورلد، ويضم 80 غرفة وجناحاً واسعاً ومناسباً للعائلات مع تشطيبات راقية، ومطعماً مفتوحاً طوال اليوم، وإنترنت واي فاي مجاني، ونادياً صحياً ومسبحاً، وأسعاراً معقولة وممتازة.',
  classification_stars: 3,
  classification_label_en: '3-Star Modern Business Inn',
  classification_label_ar: 'فندق أعمال عصري فئة 3 نجوم',
  logo_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png',
  favicon_url: '/vite.svg',
  currency: 'SAR',
  hero_images: [
    {
      url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png',
      caption_en: 'Swiss Flora Inn Riyadh Modern Façade & Entrance',
      caption_ar: 'واجهة ومدخل فندق سويس فلورا إن الرياض العصري',
      tag_en: 'Hotel Overview',
      tag_ar: 'إطلالة الفندق',
    },
    {
      url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/cb2a4062-6175-46e4-8c4c-c65714f26fc8/_22A7761.JPG',
      caption_en: 'Comfortable & Spacious Rooms and Suites',
      caption_ar: 'غرف وأجنحة مريحة ومجهزة بالكامل',
      tag_en: 'Rooms & Suites',
      tag_ar: 'الغرف والأجنحة',
    },
    {
      url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/0c6bdc3d-cab4-4cfe-b2bf-37b8acd55d99/20191104_161312.jpg',
      caption_en: 'All-Day Dining Restaurant & Lounge',
      caption_ar: 'مطعم ولاونج سويس فلورا المفتوح طوال اليوم',
      tag_en: 'Dining',
      tag_ar: 'المطعم والوجبات',
    },
  ],
  address_en: 'Al Safaha District Riyadh, Kingdom Of Saudi Arabia',
  address_ar: 'حي الصحافة الرياض، المملكة العربية السعودية',
  city_en: 'Riyadh',
  city_ar: 'الرياض',
  country_en: 'Saudi Arabia',
  country_ar: 'المملكة العربية السعودية',
  phone: '+966112349999',
  email: 'Info.inn@swissflorahotels.com',
  whatsapp_number: '+966112349999',
  branding: {
    primary: '#1E3A5F',
    secondary: '#0F172A',
    accent: '#D97706',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
    button: '#1E3A5F',
    radius: '12px',
  },
  typography: {
    arHeadingFont: 'Cairo',
    arBodyFont: 'Tajawal',
    enHeadingFont: 'Playfair Display',
    enBodyFont: 'Plus Jakarta Sans',
  },
  portal_config: createDefaultPortalConfig(),
  departments: [
    {
      id: 'dept-inn-frontdesk',
      name_en: 'Inn Front Desk & Reception',
      name_ar: 'الاستقبال والمكتب الأمامي',
      code: 'rooms',
      phone: '+966112349999',
      whatsapp_number: '+966112349999',
      email: 'Info.inn@swissflorahotels.com',
      sla_target: '5 min response',
      is_active: true,
    },
    {
      id: 'dept-inn-dining',
      name_en: 'Swiss Flora Restaurant & Room Service',
      name_ar: 'مطعم سويس فلورا وخدمة الغرف',
      code: 'dining',
      phone: '+966112349999',
      whatsapp_number: '+966112349999',
      email: 'Info.inn@swissflorahotels.com',
      sla_target: '20 min delivery',
      is_active: true,
    },
  ],
  policies: {
    checkInTime: '15:00',
    checkOutTime: '12:00',
    cancellationPolicy_en: 'Free cancellation up to 24 hours before check-in date on flexible rate plans.',
    cancellationPolicy_ar: 'إلغاء مجاني حتى 24 ساعة قبل موعد الوصول للخطط السعرية المرنة.',
    smokingPolicy_en: 'Non-smoking rooms. Designated outdoor smoking areas provided.',
    smokingPolicy_ar: 'غرف لغير المدخنين مع توفر أماكن مخصصة للتدخين.',
    wifiSsid: 'SwissFlora-Inn-Guest',
    parkingInfo_en: 'Free onsite parking for all registered guests.',
    parkingInfo_ar: 'مواقف سيارات مجانية في الموقع لجميع النزلاء.',
  },
  rooms: SWISS_FLORA_INN_ROOMS,
  offers: SWISS_FLORA_INN_OFFERS,
  diningVenues: [
    {
      id: 'venue-inn-restaurant',
      hotel_id: '12',
      slug: 'swiss-flora-restaurant-inn',
      name_en: 'Swiss Flora Restaurant',
      name_ar: 'مطعم سويس فلورا',
      type_en: 'All-Day Dining Restaurant',
      type_ar: 'مطعم مفتوح طوال اليوم',
      cuisine_en: 'International & Breakfast Buffet',
      cuisine_ar: 'مأكولات عالمية وبوفيه إفطار',
      description_en: 'All-day dining serving daily breakfast buffet and comfort meals.',
      description_ar: 'يقدم بوفيه إفطار صباحي وأطباقاً عالمية طوال اليوم.',
      opening_hours_en: '06:30 - 23:00 Daily',
      opening_hours_ar: '06:30 صباحاً - 11:00 مساءً',
      dress_code_en: 'Casual',
      dress_code_ar: 'عادي',
      image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-2.jpg',
      menu_highlights_en: ['Continental Breakfast Buffet (49 SAR)', 'Club Sandwich', 'Fresh Juices'],
      menu_highlights_ar: ['بوفيه إفطار قاري (49 ر.س)', 'كلوب ساندويتش', 'عصائر طازجة'],
      is_room_service_capable: true,
      whatsapp_ordering: true,
    }
  ],
  wellnessFacilities: [
    {
      id: 'fac-inn-gym',
      hotel_id: '12',
      name_en: 'Inspirations Health Club & Pool',
      name_ar: 'نادي ومسبح إنسبيريشنز',
      type_en: 'Health Club, Pool & Sauna',
      type_ar: 'نادي صحي ومسبح وساونا',
      description_en: 'Fitness gym, indoor swimming pool, sauna, and massage room.',
      description_ar: 'صالة رياضية ومسبح وساونا وغرفة مساج.',
      hours_en: '07:00 - 22:00 Daily',
      hours_ar: '07:00 صباحاً - 10:00 مساءً',
      image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/84352dbf-9708-4e81-b174-03156b9bb95b/Pool%204.jpg',
      signature_treatments_en: ['Gym Workout', 'Swimming Pool Relaxation'],
      signature_treatments_ar: ['تمارين اللياقة البدنية', 'السباحة والاسترخاء'],
      price_from: 0,
      currency: 'SAR',
    }
  ],
  services: [],
  is_published: true,
};

// =========================================================================
// 7. HELPER FUNCTIONS FOR MULTI-HOTEL ISOLATION
// =========================================================================
export function getOutletsForHotel(hotelId: string): FBOutlet[] {
  if (hotelId === '12' || hotelId.includes('inn')) {
    return SWISS_FLORA_INN_OUTLETS;
  }
  return SWISS_FLORA_ROYAL_OUTLETS;
}

export function getWellnessForHotel(hotelId: string): WellnessService[] {
  if (hotelId === '12' || hotelId.includes('inn')) {
    return SWISS_FLORA_INN_WELLNESS;
  }
  return SWISS_FLORA_ROYAL_WELLNESS;
}

export function getContactsForHotel(hotelId: string): DepartmentContact[] {
  if (hotelId === '12' || hotelId.includes('inn')) {
    return SWISS_FLORA_INN_CONTACTS;
  }
  return SWISS_FLORA_ROYAL_CONTACTS;
}

export function getOffersForHotel(hotelId: string): HotelOffer[] {
  if (hotelId === '12' || hotelId.includes('inn')) {
    return SWISS_FLORA_INN_OFFERS;
  }
  return SWISS_FLORA_ROYAL_OFFERS;
}

export function getRoomsForHotel(hotelId: string): RoomType[] {
  if (hotelId === '12' || hotelId.includes('inn')) {
    return SWISS_FLORA_INN_ROOMS;
  }
  return SWISS_FLORA_ROYAL_ROOMS;
}
`;

fs.writeFileSync(path.join(__dirname, '../src/data/swissFloraData.ts'), fileContent, 'utf8');
console.log('Successfully written src/data/swissFloraData.ts!');
