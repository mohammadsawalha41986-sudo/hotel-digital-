import { Hotel, RoomType, HotelOffer } from '../types/hotel';
import { FBOutlet, WellnessService, DepartmentContact } from '../types/department';
import { createDefaultPortalConfig } from '../utils/portalConfig';

// =========================================================================
// 1. SWISS FLORA ROOM TYPES (AUTHENTIC DATA FROM WEBSITE)
// =========================================================================
export const SWISS_FLORA_ROYAL_ROOMS: RoomType[] = [
  {
    "id": "royal-room-13",
    "hotel_id": "11",
    "slug": "handicap-classic-king-room",
    "name_en": "Handicap Classic King Room",
    "name_ar": "غرفة كينغ كلاسيكية لذوي الاحتياجات الخاصة",
    "category_en": "Deluxe Room",
    "category_ar": "غرفة ديلوكس",
    "description_en": "Handicap Classic King Room at Swiss Flora Royal Hotel Riyadh. Offering 32 sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.",
    "description_ar": "غرفة كينغ كلاسيكية لذوي الاحتياجات الخاصة في فندق سويس فلورا رويال الرياض. تمتد على مساحة 32 متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.",
    "size_sqm": 32,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "City & King Fahad Road View",
    "view_ar": "إطلالة على المدينة وطريق الملك فهد",
    "smoking_policy_en": "Non-Smoking Room (Designated smoking areas available)",
    "smoking_policy_ar": "غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)",
    "breakfast_included": true,
    "breakfast_info_en": "International Breakfast Buffet included at Flora Restaurant",
    "breakfast_info_ar": "يشمل بوفيه إفطار دولي فاخر في مطعم فلورا",
    "base_price": 900,
    "offer_price": 450,
    "offer_badge_en": "Best Available Rate",
    "offer_badge_ar": "أفضل سعر متاح",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/217ce135-0d14-403f-bcfe-c296f376c1fa/download.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "32 sqm spacious layout",
      "Free Welcome drinks & Wi-Fi",
      "Free Access to Inspirations Pool & Gym",
      "Complimentary safety box",
      "24/7 Room Service available"
    ],
    "features_ar": [
      "مساحة رحبة 32 متر مربع",
      "مشروبات ترحيبية مجانية وإنترنت عالي السرعة",
      "دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي",
      "صندوق أمانات إلكتروني مجاني",
      "خدمة الغرف متاحة على مدار الساعة"
    ],
    "available_count": 2,
    "rating": 4.8,
    "reviews_count": 124
  },
  {
    "id": "royal-room-12",
    "hotel_id": "11",
    "slug": "classic-king-room",
    "name_en": "Classic King Room",
    "name_ar": "غرفة كلاسيكية",
    "category_en": "Deluxe Room",
    "category_ar": "غرفة ديلوكس",
    "description_en": "Classic King Room at Swiss Flora Royal Hotel Riyadh. Offering 32 sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.",
    "description_ar": "غرفة كلاسيكية في فندق سويس فلورا رويال الرياض. تمتد على مساحة 32 متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.",
    "size_sqm": 32,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "City & King Fahad Road View",
    "view_ar": "إطلالة على المدينة وطريق الملك فهد",
    "smoking_policy_en": "Non-Smoking Room (Designated smoking areas available)",
    "smoking_policy_ar": "غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)",
    "breakfast_included": true,
    "breakfast_info_en": "International Breakfast Buffet included at Flora Restaurant",
    "breakfast_info_ar": "يشمل بوفيه إفطار دولي فاخر في مطعم فلورا",
    "base_price": 900,
    "offer_price": 495,
    "offer_badge_en": "Best Available Rate",
    "offer_badge_ar": "أفضل سعر متاح",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/7dcfc016-c0ab-4b0c-a884-80cd5064af36/download1.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "32 sqm spacious layout",
      "Free Welcome drinks & Wi-Fi",
      "Free Access to Inspirations Pool & Gym",
      "Complimentary safety box",
      "24/7 Room Service available"
    ],
    "features_ar": [
      "مساحة رحبة 32 متر مربع",
      "مشروبات ترحيبية مجانية وإنترنت عالي السرعة",
      "دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي",
      "صندوق أمانات إلكتروني مجاني",
      "خدمة الغرف متاحة على مدار الساعة"
    ],
    "available_count": 14,
    "rating": 4.8,
    "reviews_count": 124
  },
  {
    "id": "royal-room-11",
    "hotel_id": "11",
    "slug": "deluxe-king-room",
    "name_en": "Deluxe King Room",
    "name_ar": "غرفة ديلوكس",
    "category_en": "Deluxe Room",
    "category_ar": "غرفة ديلوكس",
    "description_en": "Deluxe King Room at Swiss Flora Royal Hotel Riyadh. Offering 39 sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.",
    "description_ar": "غرفة ديلوكس في فندق سويس فلورا رويال الرياض. تمتد على مساحة 39 متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.",
    "size_sqm": 39,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "City & King Fahad Road View",
    "view_ar": "إطلالة على المدينة وطريق الملك فهد",
    "smoking_policy_en": "Non-Smoking Room (Designated smoking areas available)",
    "smoking_policy_ar": "غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)",
    "breakfast_included": true,
    "breakfast_info_en": "International Breakfast Buffet included at Flora Restaurant",
    "breakfast_info_ar": "يشمل بوفيه إفطار دولي فاخر في مطعم فلورا",
    "base_price": 1050,
    "offer_price": 550,
    "offer_badge_en": "Best Available Rate",
    "offer_badge_ar": "أفضل سعر متاح",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/d565ec4f-cf24-4fcb-acc7-74a1dbe2e71e/ooooo.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "39 sqm spacious layout",
      "Free Welcome drinks & Wi-Fi",
      "Free Access to Inspirations Pool & Gym",
      "Complimentary safety box",
      "24/7 Room Service available"
    ],
    "features_ar": [
      "مساحة رحبة 39 متر مربع",
      "مشروبات ترحيبية مجانية وإنترنت عالي السرعة",
      "دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي",
      "صندوق أمانات إلكتروني مجاني",
      "خدمة الغرف متاحة على مدار الساعة"
    ],
    "available_count": 8,
    "rating": 4.8,
    "reviews_count": 124
  },
  {
    "id": "royal-room-10",
    "hotel_id": "11",
    "slug": "deluxe-twin-room",
    "name_en": "Deluxe Twin Room",
    "name_ar": "غرفة ديلوكس مزدوجة",
    "category_en": "Deluxe Room",
    "category_ar": "غرفة ديلوكس",
    "description_en": "Deluxe Twin Room at Swiss Flora Royal Hotel Riyadh. Offering 39 sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.",
    "description_ar": "غرفة ديلوكس مزدوجة في فندق سويس فلورا رويال الرياض. تمتد على مساحة 39 متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.",
    "size_sqm": 39,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "City & King Fahad Road View",
    "view_ar": "إطلالة على المدينة وطريق الملك فهد",
    "smoking_policy_en": "Non-Smoking Room (Designated smoking areas available)",
    "smoking_policy_ar": "غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)",
    "breakfast_included": true,
    "breakfast_info_en": "International Breakfast Buffet included at Flora Restaurant",
    "breakfast_info_ar": "يشمل بوفيه إفطار دولي فاخر في مطعم فلورا",
    "base_price": 1100,
    "offer_price": 650,
    "offer_badge_en": "Best Available Rate",
    "offer_badge_ar": "أفضل سعر متاح",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/4037929e-d322-49b8-a31f-08186100e365/download2.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "39 sqm spacious layout",
      "Free Welcome drinks & Wi-Fi",
      "Free Access to Inspirations Pool & Gym",
      "Complimentary safety box",
      "24/7 Room Service available"
    ],
    "features_ar": [
      "مساحة رحبة 39 متر مربع",
      "مشروبات ترحيبية مجانية وإنترنت عالي السرعة",
      "دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي",
      "صندوق أمانات إلكتروني مجاني",
      "خدمة الغرف متاحة على مدار الساعة"
    ],
    "available_count": 8,
    "rating": 4.8,
    "reviews_count": 124
  },
  {
    "id": "royal-room-9",
    "hotel_id": "11",
    "slug": "executive-king-room",
    "name_en": "Executive King Room",
    "name_ar": "غرفة تنفيذية",
    "category_en": "Executive Room",
    "category_ar": "غرفة تنفيذية",
    "description_en": "Executive King Room at Swiss Flora Royal Hotel Riyadh. Offering 40 sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.",
    "description_ar": "غرفة تنفيذية في فندق سويس فلورا رويال الرياض. تمتد على مساحة 40 متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.",
    "size_sqm": 40,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "City & King Fahad Road View",
    "view_ar": "إطلالة على المدينة وطريق الملك فهد",
    "smoking_policy_en": "Non-Smoking Room (Designated smoking areas available)",
    "smoking_policy_ar": "غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)",
    "breakfast_included": true,
    "breakfast_info_en": "International Breakfast Buffet included at Flora Restaurant",
    "breakfast_info_ar": "يشمل بوفيه إفطار دولي فاخر في مطعم فلورا",
    "base_price": 1150,
    "offer_price": 800,
    "offer_badge_en": "Best Available Rate",
    "offer_badge_ar": "أفضل سعر متاح",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/de19aa2c-ef80-4b3c-bc02-3bc2cd7ef296/download3.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "40 sqm spacious layout",
      "Free Welcome drinks & Wi-Fi",
      "Free Access to Inspirations Pool & Gym",
      "Complimentary safety box",
      "24/7 Room Service available"
    ],
    "features_ar": [
      "مساحة رحبة 40 متر مربع",
      "مشروبات ترحيبية مجانية وإنترنت عالي السرعة",
      "دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي",
      "صندوق أمانات إلكتروني مجاني",
      "خدمة الغرف متاحة على مدار الساعة"
    ],
    "available_count": 6,
    "rating": 4.8,
    "reviews_count": 124
  },
  {
    "id": "royal-room-8",
    "hotel_id": "11",
    "slug": "executive-twin-room",
    "name_en": "Executive Twin Room",
    "name_ar": "غرفة تنفيذية مزدوجة",
    "category_en": "Executive Room",
    "category_ar": "غرفة تنفيذية",
    "description_en": "Executive Twin Room at Swiss Flora Royal Hotel Riyadh. Offering 40 sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.",
    "description_ar": "غرفة تنفيذية مزدوجة في فندق سويس فلورا رويال الرياض. تمتد على مساحة 40 متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.",
    "size_sqm": 40,
    "bed_type_en": "2 Twin Beds",
    "bed_type_ar": "سريران منفصلان",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "City & King Fahad Road View",
    "view_ar": "إطلالة على المدينة وطريق الملك فهد",
    "smoking_policy_en": "Non-Smoking Room (Designated smoking areas available)",
    "smoking_policy_ar": "غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)",
    "breakfast_included": true,
    "breakfast_info_en": "International Breakfast Buffet included at Flora Restaurant",
    "breakfast_info_ar": "يشمل بوفيه إفطار دولي فاخر في مطعم فلورا",
    "base_price": 1200,
    "offer_price": 600,
    "offer_badge_en": "Best Available Rate",
    "offer_badge_ar": "أفضل سعر متاح",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/eaba3e72-69b0-4547-8c80-7aa0922fb54b/download5.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "40 sqm spacious layout",
      "Free Welcome drinks & Wi-Fi",
      "Free Access to Inspirations Pool & Gym",
      "Complimentary safety box",
      "24/7 Room Service available"
    ],
    "features_ar": [
      "مساحة رحبة 40 متر مربع",
      "مشروبات ترحيبية مجانية وإنترنت عالي السرعة",
      "دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي",
      "صندوق أمانات إلكتروني مجاني",
      "خدمة الغرف متاحة على مدار الساعة"
    ],
    "available_count": 2,
    "rating": 4.8,
    "reviews_count": 124
  },
  {
    "id": "royal-room-7",
    "hotel_id": "11",
    "slug": "junior-suite-king",
    "name_en": "Junior Suite King",
    "name_ar": "جناح جونيور",
    "category_en": "Suite",
    "category_ar": "جناح",
    "description_en": "Junior Suite King at Swiss Flora Royal Hotel Riyadh. Offering 50 sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.",
    "description_ar": "جناح جونيور في فندق سويس فلورا رويال الرياض. تمتد على مساحة 50 متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.",
    "size_sqm": 50,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "City & King Fahad Road View",
    "view_ar": "إطلالة على المدينة وطريق الملك فهد",
    "smoking_policy_en": "Non-Smoking Room (Designated smoking areas available)",
    "smoking_policy_ar": "غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)",
    "breakfast_included": true,
    "breakfast_info_en": "International Breakfast Buffet included at Flora Restaurant",
    "breakfast_info_ar": "يشمل بوفيه إفطار دولي فاخر في مطعم فلورا",
    "base_price": 1250,
    "offer_price": 895,
    "offer_badge_en": "Best Available Rate",
    "offer_badge_ar": "أفضل سعر متاح",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/84e89c68-44a1-4172-ab51-567963eda23d/download6.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "50 sqm spacious layout",
      "Free Welcome drinks & Wi-Fi",
      "Free Access to Inspirations Pool & Gym",
      "Complimentary safety box",
      "24/7 Room Service available"
    ],
    "features_ar": [
      "مساحة رحبة 50 متر مربع",
      "مشروبات ترحيبية مجانية وإنترنت عالي السرعة",
      "دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي",
      "صندوق أمانات إلكتروني مجاني",
      "خدمة الغرف متاحة على مدار الساعة"
    ],
    "available_count": 16,
    "rating": 4.8,
    "reviews_count": 124
  },
  {
    "id": "royal-room-6",
    "hotel_id": "11",
    "slug": "executive-suite-king",
    "name_en": "Executive Suite King",
    "name_ar": "جناح تنفيذي",
    "category_en": "Suite",
    "category_ar": "جناح",
    "description_en": "Executive Suite King at Swiss Flora Royal Hotel Riyadh. Offering 50 sqm of elegant living space with contemporary finishes, plush bedding, high-speed Wi-Fi, and access to Inspirations Pool & Gym.",
    "description_ar": "جناح تنفيذي في فندق سويس فلورا رويال الرياض. تمتد على مساحة 50 متر مربع بتشطيبات عصرية، أسرة فاخرة، إنترنت مجاني، ودخول مجاني لحمام سباحة ونادي إنسبيريشنز.",
    "size_sqm": 50,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "City & King Fahad Road View",
    "view_ar": "إطلالة على المدينة وطريق الملك فهد",
    "smoking_policy_en": "Non-Smoking Room (Designated smoking areas available)",
    "smoking_policy_ar": "غرفة لغير المدخنين (تتوفر مناطق مخصصة للتدخين)",
    "breakfast_included": true,
    "breakfast_info_en": "International Breakfast Buffet included at Flora Restaurant",
    "breakfast_info_ar": "يشمل بوفيه إفطار دولي فاخر في مطعم فلورا",
    "base_price": 1300,
    "offer_price": 1000,
    "offer_badge_en": "Best Available Rate",
    "offer_badge_ar": "أفضل سعر متاح",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/1cfb7634-705f-421a-a9e2-22e4f56a060d/room1.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "50 sqm spacious layout",
      "Free Welcome drinks & Wi-Fi",
      "Free Access to Inspirations Pool & Gym",
      "Complimentary safety box",
      "24/7 Room Service available"
    ],
    "features_ar": [
      "مساحة رحبة 50 متر مربع",
      "مشروبات ترحيبية مجانية وإنترنت عالي السرعة",
      "دخول مجاني لحمام سباحة ونادي إنسبيريشنز الرياضي",
      "صندوق أمانات إلكتروني مجاني",
      "خدمة الغرف متاحة على مدار الساعة"
    ],
    "available_count": 4,
    "rating": 4.8,
    "reviews_count": 124
  }
];

export const SWISS_FLORA_INN_ROOMS: RoomType[] = [
  {
    "id": "inn-room-19",
    "hotel_id": "12",
    "slug": "swiss-flora-suite",
    "name_en": "Swiss Flora Suite",
    "name_ar": "جناح سويس فلورا",
    "category_en": "Suite",
    "category_ar": "جناح",
    "description_en": "Swiss Flora Suite at Swiss Flora Inn Hotel Riyadh. Featuring 50 sqm of comfortable living in the heart of Riyadh Business District, near KAFD and Boulevard World.",
    "description_ar": "جناح سويس فلورا في فندق سويس فلورا إن الرياض. مساحة 50 متر مربع من الراحة الفائقة في قلب حي الأعمال بالقرب من كافد وبوليفارد وورلد.",
    "size_sqm": 50,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "Al Sahafa Business District View",
    "view_ar": "إطلالة على حي الصحافة التجاري",
    "smoking_policy_en": "Non-Smoking Room",
    "smoking_policy_ar": "غرفة لغير المدخنين",
    "breakfast_included": false,
    "breakfast_info_en": "Breakfast available at Swiss Flora Restaurant for 49 SAR per person",
    "breakfast_info_ar": "الإفطار متاح في مطعم سويس فلورا بـ 49 ريال للشخص",
    "base_price": 1500,
    "offer_price": 1200,
    "offer_badge_en": "Special Inn Rate",
    "offer_badge_ar": "سعر خاص",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/b2afcb50-49e3-4e66-9184-e82bc9179e5c/download8.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/0333b9b8-1f75-4a10-855d-69468736c06f/download1.png"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "50 sqm modern room",
      "Free High-Speed Wi-Fi",
      "Access to pool and gym",
      "Near KAFD & Boulevard World",
      "Affordable room rates"
    ],
    "features_ar": [
      "غرفة عصرية بمساحة 50 متر مربع",
      "واي فاي مجاني عالي السرعة",
      "دخول المسبح والصالة الرياضية",
      "بالقرب من كافد وبوليفارد وورلد",
      "أسعار اقتصادية ممتازة"
    ],
    "available_count": 2,
    "rating": 4.6,
    "reviews_count": 89
  },
  {
    "id": "inn-room-18",
    "hotel_id": "12",
    "slug": "executive-suite-king",
    "name_en": "Executive Suite King",
    "name_ar": "جناح تنفيذي",
    "category_en": "Suite",
    "category_ar": "جناح",
    "description_en": "Executive Suite King at Swiss Flora Inn Hotel Riyadh. Featuring 50 sqm of comfortable living in the heart of Riyadh Business District, near KAFD and Boulevard World.",
    "description_ar": "جناح تنفيذي في فندق سويس فلورا إن الرياض. مساحة 50 متر مربع من الراحة الفائقة في قلب حي الأعمال بالقرب من كافد وبوليفارد وورلد.",
    "size_sqm": 50,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "Al Sahafa Business District View",
    "view_ar": "إطلالة على حي الصحافة التجاري",
    "smoking_policy_en": "Non-Smoking Room",
    "smoking_policy_ar": "غرفة لغير المدخنين",
    "breakfast_included": false,
    "breakfast_info_en": "Breakfast available at Swiss Flora Restaurant for 49 SAR per person",
    "breakfast_info_ar": "الإفطار متاح في مطعم سويس فلورا بـ 49 ريال للشخص",
    "base_price": 1200,
    "offer_price": 600,
    "offer_badge_en": "Special Inn Rate",
    "offer_badge_ar": "سعر خاص",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/016603d9-84b3-4501-a745-f065dea4828f/download9.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/0333b9b8-1f75-4a10-855d-69468736c06f/download1.png"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "50 sqm modern room",
      "Free High-Speed Wi-Fi",
      "Access to pool and gym",
      "Near KAFD & Boulevard World",
      "Affordable room rates"
    ],
    "features_ar": [
      "غرفة عصرية بمساحة 50 متر مربع",
      "واي فاي مجاني عالي السرعة",
      "دخول المسبح والصالة الرياضية",
      "بالقرب من كافد وبوليفارد وورلد",
      "أسعار اقتصادية ممتازة"
    ],
    "available_count": 26,
    "rating": 4.6,
    "reviews_count": 89
  },
  {
    "id": "inn-room-17",
    "hotel_id": "12",
    "slug": "junior-suite-king",
    "name_en": "Junior Suite King",
    "name_ar": "جناح جونيور",
    "category_en": "Suite",
    "category_ar": "جناح",
    "description_en": "Junior Suite King at Swiss Flora Inn Hotel Riyadh. Featuring 50 sqm of comfortable living in the heart of Riyadh Business District, near KAFD and Boulevard World.",
    "description_ar": "جناح جونيور في فندق سويس فلورا إن الرياض. مساحة 50 متر مربع من الراحة الفائقة في قلب حي الأعمال بالقرب من كافد وبوليفارد وورلد.",
    "size_sqm": 50,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "Al Sahafa Business District View",
    "view_ar": "إطلالة على حي الصحافة التجاري",
    "smoking_policy_en": "Non-Smoking Room",
    "smoking_policy_ar": "غرفة لغير المدخنين",
    "breakfast_included": false,
    "breakfast_info_en": "Breakfast available at Swiss Flora Restaurant for 49 SAR per person",
    "breakfast_info_ar": "الإفطار متاح في مطعم سويس فلورا بـ 49 ريال للشخص",
    "base_price": 1100,
    "offer_price": 550,
    "offer_badge_en": "Special Inn Rate",
    "offer_badge_ar": "سعر خاص",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/666ee817-a94b-48cd-a71e-31006eea756a/download10.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/0333b9b8-1f75-4a10-855d-69468736c06f/download1.png"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "50 sqm modern room",
      "Free High-Speed Wi-Fi",
      "Access to pool and gym",
      "Near KAFD & Boulevard World",
      "Affordable room rates"
    ],
    "features_ar": [
      "غرفة عصرية بمساحة 50 متر مربع",
      "واي فاي مجاني عالي السرعة",
      "دخول المسبح والصالة الرياضية",
      "بالقرب من كافد وبوليفارد وورلد",
      "أسعار اقتصادية ممتازة"
    ],
    "available_count": 26,
    "rating": 4.6,
    "reviews_count": 89
  },
  {
    "id": "inn-room-16",
    "hotel_id": "12",
    "slug": "deluxe-twin-room",
    "name_en": "Deluxe Twin Room",
    "name_ar": "غرفة ديلوكس مزدوجة",
    "category_en": "Deluxe Room",
    "category_ar": "غرفة ديلوكس",
    "description_en": "Deluxe Twin Room at Swiss Flora Inn Hotel Riyadh. Featuring 35 sqm of comfortable living in the heart of Riyadh Business District, near KAFD and Boulevard World.",
    "description_ar": "غرفة ديلوكس مزدوجة في فندق سويس فلورا إن الرياض. مساحة 35 متر مربع من الراحة الفائقة في قلب حي الأعمال بالقرب من كافد وبوليفارد وورلد.",
    "size_sqm": 35,
    "bed_type_en": "2 Twin Beds",
    "bed_type_ar": "سريران منفصلان",
    "occupancy": {
      "adults": 2,
      "children": 0,
      "max_guests": 2
    },
    "view_en": "Al Sahafa Business District View",
    "view_ar": "إطلالة على حي الصحافة التجاري",
    "smoking_policy_en": "Non-Smoking Room",
    "smoking_policy_ar": "غرفة لغير المدخنين",
    "breakfast_included": false,
    "breakfast_info_en": "Breakfast available at Swiss Flora Restaurant for 49 SAR per person",
    "breakfast_info_ar": "الإفطار متاح في مطعم سويس فلورا بـ 49 ريال للشخص",
    "base_price": 1000,
    "offer_price": 495,
    "offer_badge_en": "Special Inn Rate",
    "offer_badge_ar": "سعر خاص",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/89172c36-c00a-4fbe-8b61-8e431d164311/download1.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/0333b9b8-1f75-4a10-855d-69468736c06f/download1.png"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "35 sqm modern room",
      "Free High-Speed Wi-Fi",
      "Access to pool and gym",
      "Near KAFD & Boulevard World",
      "Affordable room rates"
    ],
    "features_ar": [
      "غرفة عصرية بمساحة 35 متر مربع",
      "واي فاي مجاني عالي السرعة",
      "دخول المسبح والصالة الرياضية",
      "بالقرب من كافد وبوليفارد وورلد",
      "أسعار اقتصادية ممتازة"
    ],
    "available_count": 13,
    "rating": 4.6,
    "reviews_count": 89
  },
  {
    "id": "inn-room-15",
    "hotel_id": "12",
    "slug": "deluxe-king-room",
    "name_en": "Deluxe King Room",
    "name_ar": "غرفة ديلوكس",
    "category_en": "Deluxe Room",
    "category_ar": "غرفة ديلوكس",
    "description_en": "Deluxe King Room at Swiss Flora Inn Hotel Riyadh. Featuring 35 sqm of comfortable living in the heart of Riyadh Business District, near KAFD and Boulevard World.",
    "description_ar": "غرفة ديلوكس في فندق سويس فلورا إن الرياض. مساحة 35 متر مربع من الراحة الفائقة في قلب حي الأعمال بالقرب من كافد وبوليفارد وورلد.",
    "size_sqm": 35,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 2,
      "children": 1,
      "max_guests": 3
    },
    "view_en": "Al Sahafa Business District View",
    "view_ar": "إطلالة على حي الصحافة التجاري",
    "smoking_policy_en": "Non-Smoking Room",
    "smoking_policy_ar": "غرفة لغير المدخنين",
    "breakfast_included": false,
    "breakfast_info_en": "Breakfast available at Swiss Flora Restaurant for 49 SAR per person",
    "breakfast_info_ar": "الإفطار متاح في مطعم سويس فلورا بـ 49 ريال للشخص",
    "base_price": 800,
    "offer_price": 395,
    "offer_badge_en": "Special Inn Rate",
    "offer_badge_ar": "سعر خاص",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/e8a5e367-a3ed-447e-b000-4f8727161bb8/rrrrr1.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/0333b9b8-1f75-4a10-855d-69468736c06f/download1.png"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "35 sqm modern room",
      "Free High-Speed Wi-Fi",
      "Access to pool and gym",
      "Near KAFD & Boulevard World",
      "Affordable room rates"
    ],
    "features_ar": [
      "غرفة عصرية بمساحة 35 متر مربع",
      "واي فاي مجاني عالي السرعة",
      "دخول المسبح والصالة الرياضية",
      "بالقرب من كافد وبوليفارد وورلد",
      "أسعار اقتصادية ممتازة"
    ],
    "available_count": 12,
    "rating": 4.6,
    "reviews_count": 89
  },
  {
    "id": "inn-room-14",
    "hotel_id": "12",
    "slug": "handicap-deluxe-king-room",
    "name_en": "Handicap Deluxe King Room",
    "name_ar": "غرفة ديلوكس لذوي الاحتياجات الخاصة",
    "category_en": "Deluxe Room",
    "category_ar": "غرفة ديلوكس",
    "description_en": "Handicap Deluxe King Room at Swiss Flora Inn Hotel Riyadh. Featuring 35 sqm of comfortable living in the heart of Riyadh Business District, near KAFD and Boulevard World.",
    "description_ar": "غرفة ديلوكس لذوي الاحتياجات الخاصة في فندق سويس فلورا إن الرياض. مساحة 35 متر مربع من الراحة الفائقة في قلب حي الأعمال بالقرب من كافد وبوليفارد وورلد.",
    "size_sqm": 35,
    "bed_type_en": "1 King Bed",
    "bed_type_ar": "سرير كينغ كبير",
    "occupancy": {
      "adults": 1,
      "children": 0,
      "max_guests": 1
    },
    "view_en": "Al Sahafa Business District View",
    "view_ar": "إطلالة على حي الصحافة التجاري",
    "smoking_policy_en": "Non-Smoking Room",
    "smoking_policy_ar": "غرفة لغير المدخنين",
    "breakfast_included": false,
    "breakfast_info_en": "Breakfast available at Swiss Flora Restaurant for 49 SAR per person",
    "breakfast_info_ar": "الإفطار متاح في مطعم سويس فلورا بـ 49 ريال للشخص",
    "base_price": 700,
    "offer_price": 395,
    "offer_badge_en": "Special Inn Rate",
    "offer_badge_ar": "سعر خاص",
    "currency": "SAR",
    "images": [
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/Rooms/46416a70-4b4e-41d0-af3c-16de894a6132/download2.jpg",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png",
      "https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/0333b9b8-1f75-4a10-855d-69468736c06f/download1.png"
    ],
    "amenities": [
      {
        "id": "wifi",
        "name_en": "Complimentary High-Speed Wi-Fi",
        "name_ar": "إنترنت واي فاي فائق السرعة مجاني",
        "icon": "Wifi"
      },
      {
        "id": "parking",
        "name_en": "Free Onsite Parking",
        "name_ar": "مواقف سيارات مجانية بالموقع",
        "icon": "Car"
      },
      {
        "id": "pool_gym",
        "name_en": "Free Pool & Gym Access",
        "name_ar": "دخول مجاني للمسبح والنادي الرياضي",
        "icon": "Dumbbell"
      },
      {
        "id": "safety_box",
        "name_en": "In-Room Electronic Safe",
        "name_ar": "صندوق أمانات إلكتروني",
        "icon": "ShieldCheck"
      },
      {
        "id": "coffee_tea",
        "name_en": "Tea & Coffee Facilities",
        "name_ar": "مرافق إعداد الشاي والقهوة",
        "icon": "Coffee"
      },
      {
        "id": "tv",
        "name_en": "Smart Interactive IPTV",
        "name_ar": "شاشة تلفزيون ذكية تفاعلية",
        "icon": "Tv"
      },
      {
        "id": "ac",
        "name_en": "Individual Climate Control",
        "name_ar": "تحكم فردي بدرجة التكييف",
        "icon": "Wind"
      },
      {
        "id": "toiletries",
        "name_en": "Premium Swiss Toiletries",
        "name_ar": "مستلزمات عناية سويسرية فاخرة",
        "icon": "Sparkles"
      }
    ],
    "features_en": [
      "35 sqm modern room",
      "Free High-Speed Wi-Fi",
      "Access to pool and gym",
      "Near KAFD & Boulevard World",
      "Affordable room rates"
    ],
    "features_ar": [
      "غرفة عصرية بمساحة 35 متر مربع",
      "واي فاي مجاني عالي السرعة",
      "دخول المسبح والصالة الرياضية",
      "بالقرب من كافد وبوليفارد وورلد",
      "أسعار اقتصادية ممتازة"
    ],
    "available_count": 1,
    "rating": 4.6,
    "reviews_count": 89
  }
];

// =========================================================================
// 2. SWISS FLORA OFFERS (BASED ON OFFICIAL PACKAGES)
// =========================================================================
export const SWISS_FLORA_ROYAL_OFFERS: HotelOffer[] = [
  {
    id: 'offer-royal-national-day',
    hotel_id: '11',
    title_en: 'Saudi National Day Staycation',
    title_ar: 'إقامة اليوم الوطني السعودي',
    description_en: 'Includes daily gourmet breakfast buffet, signature welcome amenities, and late checkout until 4:00 PM.',
    description_ar: 'تشمل بوفيه إفطار دولي فاخر، ضيافة ترحيبية خاصة، وتأخير المغادرة حتى الرابعة عصراً.',
    department: 'seasonal',
    original_price: 610,
    offer_price: 396,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'SEASONAL OFFER',
    badge_ar: 'عرض موسمي',
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=85',
    terms_en: 'Special celebratory staycation package with complimentary breakfast and late checkout.',
    terms_ar: 'باقة إقامة احتفالية تشمل بوفيه الإفطار وتأخير تسجيل المغادرة.',
    target_action: 'book_room',
    is_active: true,
  },
  {
    id: 'offer-royal-bfast',
    hotel_id: '11',
    title_en: 'Royal Stay Privilege',
    title_ar: 'مزايا الإقامة الملكية',
    description_en: 'Enjoy daily international breakfast buffet at Flora Restaurant, high-speed Wi-Fi, and wellness club access.',
    description_ar: 'بوفيه إفطار يومي فاخر في مطعم فلورا، إنترنت عالي السرعة، ودخول مجاني للمسبح والنادي.',
    department: 'rooms',
    original_price: 600,
    offer_price: 495,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'HOTEL STAY',
    badge_ar: 'إقامة فندقية',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/cb2a4062-6175-46e4-8c4c-c65714f26fc8/_22A7761.JPG',
    terms_en: 'Valid on direct reservations. Includes Flora Restaurant breakfast buffet.',
    terms_ar: 'صالح للحجوزات المباشرة. يشمل بوفيه الإفطار بمطعم فلورا.',
    target_action: 'book_room',
    is_active: true,
  },
  {
    id: 'offer-royal-halfboard',
    hotel_id: '11',
    title_en: 'Gourmet Half-Board Experience',
    title_ar: 'تجربة نصف الإقامة الفاخرة',
    description_en: 'An international breakfast buffet and a multi-course dinner with live chef cooking stations.',
    description_ar: 'بوفيه إفطار عالمي غني وعشاء راقٍ من عدة أطباق مع محطات طهي حية بمطعم فلورا.',
    department: 'restaurant',
    original_price: 950,
    offer_price: 780,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'DINING',
    badge_ar: 'تجارب الطهي',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/e62c936d-a986-4fec-90fa-618652baab0b/chef.jpg',
    terms_en: 'Dinner served daily from 6:30 PM to 11:30 PM at Flora Restaurant.',
    terms_ar: 'يقدم العشاء يومياً من 6:30 مساءً حتى 11:30 مساءً بمطعم فلورا.',
    target_action: 'reserve_dining',
    is_active: true,
  },
  {
    id: 'offer-royal-spa',
    hotel_id: '11',
    title_en: 'Flora Signature Spa Ritual',
    title_ar: 'طقوس فلورا سبا الاسترخائية',
    description_en: 'A 60-minute tailored relaxation massage with complimentary access to thermal sauna and heated pool.',
    description_ar: 'جلسة تدليك مخصصة لمدة 60 دقيقة مع دخول مجاني للساونا والبخار ومسبح فلورا الدافئ.',
    department: 'health_club',
    original_price: 450,
    offer_price: 320,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'SPA & WELLNESS',
    badge_ar: 'سبا واستجمام',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg',
    terms_en: 'Advance reservation recommended via Flora Spa desk or WhatsApp.',
    terms_ar: 'يلزم الحجز المسبق عبر كونسيرج السبا أو واتساب.',
    target_action: 'book_spa',
    is_active: true,
  },
  {
    id: 'offer-royal-cafe',
    hotel_id: '11',
    title_en: 'Artisanal Afternoon Tea',
    title_ar: 'شاي بعد الظهيرة الفاخر',
    description_en: 'Specialty single-origin coffee and artisanal tea served with French pastries and Swiss chocolates.',
    description_ar: 'قهوة مختصة وشاي فاخر مع تشكيلة من المعجنات الفرنسية والشوكولاتة السويسرية.',
    department: 'cafe',
    original_price: 140,
    offer_price: 95,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'CAFÉ',
    badge_ar: 'المقهى واللاونج',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/d047d924-8978-4e1a-819e-8e0062776e71/downloadc.png',
    terms_en: 'Served daily from 4:00 PM to 7:00 PM at Swiss Café Lounge.',
    terms_ar: 'يقدم يومياً من 4:00 عصراً حتى 7:00 مساءً بسويس كافيه.',
    target_action: 'request_service',
    is_active: true,
  },
];

export const SWISS_FLORA_INN_OFFERS: HotelOffer[] = [
  {
    id: 'offer-inn-business',
    hotel_id: '12',
    title_en: 'Business Stay Rate',
    title_ar: 'إقامة حي الأعمال',
    description_en: 'Includes high-speed Wi-Fi, private parking, and complimentary gym & pool access.',
    description_ar: 'إقامة مريحة لرجال الأعمال تشمل إنترنت فائق السرعة، مواقف مجانية، ودخول النادي الرياضي والمسبح.',
    department: 'rooms',
    original_price: 520,
    offer_price: 395,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'HOTEL STAY',
    badge_ar: 'إقامة فندقية',
    image_url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/cb2a4062-6175-46e4-8c4c-c65714f26fc8/_22A7761.JPG',
    terms_en: 'Valid all week for Swiss Flora Inn rooms.',
    terms_ar: 'صالح طوال أيام الأسبوع في فندق سويس فلورا إن.',
    target_action: 'book_room',
    is_active: true,
  },
  {
    id: 'offer-inn-dining',
    hotel_id: '12',
    title_en: 'Daily Breakfast Buffet',
    title_ar: 'بوفيه الإفطار الصباحي',
    description_en: 'Enjoy an international breakfast buffet served daily from 6:30 AM to 10:30 AM.',
    description_ar: 'بوفيه إفطار دولي طازج يومياً من الساعة 6:30 حتى 10:30 صباحاً.',
    department: 'restaurant',
    original_price: 70,
    offer_price: 49,
    currency: 'SAR',
    valid_until: '2026-12-31',
    badge_en: 'DINING',
    badge_ar: 'تجارب الطهي',
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
    name_en: 'Flora Restaurant',
    name_ar: 'المطعم الرئيسي',
    short_description_en: 'International dining and daily buffet experiences in a refined setting.',
    short_description_ar: 'بوفيهات دولية يومية ومحطات طهي حية في أجواء فندقية راقية.',
    full_description_en:
      'Kickstart your morning at Flora Restaurant with a delightful breakfast selection, including fresh fruits, pancakes, and continental pastries, alongside hot dishes from our live cooking stations. Our extensive international buffets are thoughtfully crafted to offer an exceptional culinary experience catering to diverse tastes and preferences. Flora Restaurant provides a warm and elegant atmosphere with stylish decor and comfortable seating.',
    full_description_ar:
      'ابدأ يومك في مطعم فلورا بوجبة إفطار لذيذة تشمل مجموعة متنوعة من الفواكه الطازجة، الفطائر، والمعجنات القارية، بالإضافة إلى الأطباق الساخنة من محطات الطهي الحية لدينا. نقدم بوفيهات دولية واسعة مصممة لتقديم تجربة طهي استثنائية تناسب مختلف الأذواق والتفضيلات في بيئة مريحة وجذابة.',
    hero_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
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
      phone: '+966112349901',
      extension: '201',
      whatsapp_number: '+966551100003',
      whatsapp_enabled: true,
      default_message_en: 'Hello Flora Restaurant (Main Restaurant), I would like to reserve a table or inquire about today’s buffet.',
      default_message_ar: 'مرحباً بمطعم فلورا (المطعم الرئيسي)، أود حجز طاولة أو الاستفسار عن بوفيه اليوم.',
      email: 'flora.restaurant@swissflorahotels.com',
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
    id: 'royal-outlet-lobby-cafe',
    hotel_id: '11',
    outlet_code: 'lobby_cafe',
    slug: 'lobby-cafe',
    outlet_type: 'cafe',
    name_en: 'Lobby Café',
    name_ar: 'لوبي كافيه',
    short_description_en: 'Fresh coffee, pastries and light refreshments in the hotel lobby.',
    short_description_ar: 'قهوة طازجة ومعجنات فرنسية ومشروبات خفيفة في بهو الفندق.',
    full_description_en:
      'Located in the heart of the main reception foyer, the Swiss Lobby Café welcomes guests with the aroma of freshly roasted specialty coffee beans, delicate French viennoiseries, handcrafted macarons, and premium Swiss chocolate confections. Relax in our comfortable velvet armchairs for casual meetings or an afternoon unwind.',
    full_description_ar:
      'يقع لوبي كافيه في قلب بهو الاستقبال الرئيسي ويرحب بضيوف الفندق بروائح حبوب البن المختصة المحمصة طازجاً، وفطائر المعجنات الفرنسية الهشة، والماكرون الفاخر، وشوكولاتة سويسرا المتميزة. استمتع بمقاعد مريحة للقاءات السريعة والاسترخاء بعد يوم حافل.',
    hero_image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-2.jpg',
      'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=80',
    ],
    cuisine_en: 'Specialty Coffee & French Patisserie',
    cuisine_ar: 'قهوة مختصة ومعجنات فرنسية فاخرة',
    dress_code_en: 'Casual Chic',
    dress_code_ar: 'أنيق مريح',
    location: {
      building_en: 'Main Hotel Tower',
      building_ar: 'برج الفندق الرئيسي',
      floor_en: 'Lobby Level (Reception Foyer)',
      floor_ar: 'طابق البهو (بجوار الاستقبال)',
      internal_text_en: 'Right side of the main reception foyer',
      internal_text_ar: 'على يمين بهو الاستقبال الرئيسي',
    },
    operating_info: {
      opening_hours_en: '07:00 - 23:30 Daily',
      opening_hours_ar: '07:00 صباحاً - 11:30 مساءً يومياً',
      periods: [
        { name_en: 'Morning Coffee & Pastries', name_ar: 'قهوة الصباح والمعجنات', time_en: '07:00 - 12:00', time_ar: '07:00 - 12:00' },
        { name_en: 'Afternoon Tea & Patisserie', name_ar: 'شاي الظهيرة والحلويات', time_en: '12:00 - 18:00', time_ar: '12:00 - 18:00' },
        { name_en: 'Evening Lounge Drinks', name_ar: 'مشروبات المساء واللاونج', time_en: '18:00 - 23:30', time_ar: '18:00 - 23:30' },
      ],
    },
    contact: {
      phone: '+966112349902',
      extension: '205',
      whatsapp_number: '+966551100004',
      whatsapp_enabled: true,
      default_message_en: 'Hello Lobby Café, I would like to order specialty coffee & pastries.',
      default_message_ar: 'مرحباً بلوبي كافيه، أود الاستفسار وطلب قهوة مختصة وحلويات.',
      email: 'lobby.cafe@swissflorahotels.com',
    },
    audience: 'BOTH',
    is_active: true,
    is_visible: true,
    sort_order: 2,
    menu_categories: [
      {
        id: 'cat-lobby-coffee',
        outlet_id: 'royal-outlet-lobby-cafe',
        code: 'coffee',
        name_en: 'Specialty Coffee & Hot Drinks',
        name_ar: 'القهوة المختصة والمشروبات الساخنة',
        is_active: true,
        sort_order: 1,
        items: [
          {
            id: 'item-lobby-spanish-latte',
            item_code: 'LBC-01',
            category_id: 'cat-lobby-coffee',
            name_en: 'Signature Swiss Flora Spanish Latte',
            name_ar: 'سبانش لاتيه سويس فلورا الفاخر',
            description_en: 'Double shot of artisan espresso with condensed milk and velvety steamed milk.',
            description_ar: 'جرعة مزدوجة من الإسبريسو الفاخر مع حليب مكثف ورغوة مخملية دافئة.',
            image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
            price: 28,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_featured: true,
          },
          {
            id: 'item-lobby-v60',
            item_code: 'LBC-02',
            category_id: 'cat-lobby-coffee',
            name_en: 'Single-Origin V60 Drip Coffee',
            name_ar: 'قهوة مقطرة V60 بمحصول إثيوبي فاخر',
            description_en: 'Precision pour-over brewed Ethiopian Yirgacheffe with floral and berry notes.',
            description_ar: 'قهوة مقطرة بعناية من حبوب بن إثيوبي إيرغاتشيف بنكهات زهرية وفاكهية غنية.',
            image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
            price: 32,
            currency: 'SAR',
            is_available: true,
            sort_order: 2,
            is_recommended: true,
          },
          {
            id: 'item-lobby-flatwhite',
            item_code: 'LBC-03',
            category_id: 'cat-lobby-coffee',
            name_en: 'Silky Flat White',
            name_ar: 'فلات وايت متوازن',
            description_en: 'Rich ristretto shots crowned with a thin layer of glossy microfoam.',
            description_ar: 'ريستريتو مركز وغني تعلوه طبقة ناعمة من الحليب المبخر المخملي.',
            image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80',
            price: 24,
            currency: 'SAR',
            is_available: true,
            sort_order: 3,
          },
        ],
      },
      {
        id: 'cat-lobby-pastry',
        outlet_id: 'royal-outlet-lobby-cafe',
        code: 'pastries',
        name_en: 'French Patisserie & Desserts',
        name_ar: 'المعجنات والحلويات الفرنسية',
        is_active: true,
        sort_order: 2,
        items: [
          {
            id: 'item-lobby-macarons',
            item_code: 'LBC-04',
            category_id: 'cat-lobby-pastry',
            name_en: 'Artisan French Macaron Selection (4 pcs)',
            name_ar: 'تشكيلة ماكرون فرنسي فاخر (4 حبات)',
            description_en: 'Pistachio, salted caramel, dark chocolate, and rose raspberry macarons.',
            description_ar: 'أربع حبات ماكرون بنكهات الفستق والكراميل المملح والشوكولاتة وتوت الورد.',
            image: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=600&q=80',
            price: 38,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_chef_choice: true,
          },
          {
            id: 'item-lobby-eclair',
            item_code: 'LBC-05',
            category_id: 'cat-lobby-pastry',
            name_en: 'Pistachio Cream Royal Éclair',
            name_ar: 'إكلير الفستق الملكي المقرمش',
            description_en: 'Choux pastry filled with roasted pistachio diplomat cream and crushed nuts.',
            description_ar: 'عجينة شو فرنسية محشوة بكريمة الفستق المحمص الغنية والمكسرات.',
            image: 'https://images.unsplash.com/photo-1612203985729-70726954388c?auto=format&fit=crop&w=600&q=80',
            price: 29,
            currency: 'SAR',
            is_available: true,
            sort_order: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'royal-outlet-shisha-lounge',
    hotel_id: '11',
    outlet_code: 'shisha_lounge',
    slug: 'cafe-shisha-lounge',
    outlet_type: 'shisha',
    name_en: 'Café & Shisha Lounge',
    name_ar: 'الكافيه والشيشة',
    short_description_en: 'Artisan café selections, relaxing shisha and casual lounge seating.',
    short_description_ar: 'مشروبات استثنائية وجلسات شيشة مريحة وتراس خارجي بإطلالة جذابة.',
    full_description_en:
      'Immerse yourself in the ambient outdoor garden terrace of the Café & Shisha Lounge. Featuring premium artisan tobacco blends, signature mocktails, open-air cabana seating, and live sporting match broadcasts on high-definition outdoor displays.',
    full_description_ar:
      'عش أجواء الراحة والاستجمام في التراس الخارجي المفتوح مع لاونج الكافيه والشيشة. استمتع بأجود نكهات الشيشة المحضرة بعناية، وموكتيلات منعشة، وجلسات خارجية مريحة وشاشات عرض عملاقة لأبرز الفعاليات الرياضية.',
    hero_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Mojito-cocktail-scaled.jpg',
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    ],
    cuisine_en: 'Artisan Shisha, Refreshing Mocktails & Tapas',
    cuisine_ar: 'شيشة فاخرة، موكتيلات منعشة، ومقبلات خفيفة',
    dress_code_en: 'Casual / Outdoor Smart',
    dress_code_ar: 'مريح / أنيق غير رسمي',
    location: {
      building_en: 'Main Hotel Tower',
      building_ar: 'برج الفندق الرئيسي',
      floor_en: 'Garden Level • Outdoor Terrace',
      floor_ar: 'طابق الحديقة • التراس الخارجي المفتوح',
      internal_text_en: 'Direct access from lobby promenade',
      internal_text_ar: 'مدخل مباشر من ممر البهو نحو الحديقة',
    },
    operating_info: {
      opening_hours_en: '16:00 - 02:00 Daily',
      opening_hours_ar: '04:00 مساءً - 02:00 فجراً يومياً',
      periods: [
        { name_en: 'Sunset & Shisha Gathering', name_ar: 'جلسة الغروب والشيشة', time_en: '16:00 - 20:00', time_ar: '16:00 - 20:00' },
        { name_en: 'Night Terrace Atmosphere', name_ar: 'أجواء السهرة والتراس', time_en: '20:00 - 02:00', time_ar: '20:00 - 02:00' },
      ],
    },
    contact: {
      phone: '+966112349903',
      extension: '208',
      whatsapp_number: '+966551100008',
      whatsapp_enabled: true,
      default_message_en: 'Hello Café & Shisha Lounge, I would like to reserve a terrace table and inquire about shisha flavours.',
      default_message_ar: 'مرحباً بلاونج الكافيه والشيشة، أود حجز طاولة في التراس والاستفسار عن نكهات الشيشة.',
      email: 'shisha.lounge@swissflorahotels.com',
    },
    audience: 'BOTH',
    is_active: true,
    is_visible: true,
    sort_order: 3,
    menu_categories: [
      {
        id: 'cat-shisha-flavors',
        outlet_id: 'royal-outlet-shisha-lounge',
        code: 'shisha_menu',
        name_en: 'Artisan Shisha Flavors',
        name_ar: 'قائمة نكهات الشيشة الفاخرة',
        is_active: true,
        sort_order: 1,
        items: [
          {
            id: 'item-shisha-double-apple',
            item_code: 'SHS-01',
            category_id: 'cat-shisha-flavors',
            name_en: 'Classic Double Apple (Al Fakher / Nakhla)',
            name_ar: 'تفاحتين كلاسيك (الفاخر / النخلة)',
            description_en: 'Timeless traditional double apple blend served with natural coconut charcoal and a hygienic disposable hose.',
            description_ar: 'نكهة التفاحتين الكلاسيكية الفاخرة تقدم مع فحم جوز الهند الطبيعي ولي صحي استخدام مرة واحدة.',
            image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
            price: 65,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_featured: true,
          },
          {
            id: 'item-shisha-grape-mint',
            item_code: 'SHS-02',
            category_id: 'cat-shisha-flavors',
            name_en: 'Chilled Grape & Spearmint',
            name_ar: 'عنب ونعناع بارد منعش',
            description_en: 'Sweet purple grape notes balanced with crisp refreshing mountain spearmint.',
            description_ar: 'نكهة العنب الطبيعي المنعش متوازنة مع برودة النعناع البستاني النقي.',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
            price: 65,
            currency: 'SAR',
            is_available: true,
            sort_order: 2,
          },
          {
            id: 'item-shisha-love66',
            item_code: 'SHS-03',
            category_id: 'cat-shisha-flavors',
            name_en: 'Signature Love 66 & Passion Melon',
            name_ar: 'لوف 66 والشمام الاستوائي الخاص',
            description_en: 'Tropical blend of honeydew melon, passion fruit, watermelon, and icy breeze.',
            description_ar: 'مزيج استوائي من الشمام والباشن فروت مع البطيخ ولمسة ثلجية باردة منعشة.',
            image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
            price: 75,
            currency: 'SAR',
            is_available: true,
            sort_order: 3,
            is_recommended: true,
          },
        ],
      },
      {
        id: 'cat-shisha-mocktails',
        outlet_id: 'royal-outlet-shisha-lounge',
        code: 'mocktails',
        name_en: 'Refreshing Mocktails & Coolers',
        name_ar: 'الموكتيلات المنعشة والعصائر المثلجة',
        is_active: true,
        sort_order: 2,
        items: [
          {
            id: 'item-shisha-berry-mojito',
            item_code: 'SHS-04',
            category_id: 'cat-shisha-mocktails',
            name_en: 'Wild Forest Berry Mojito',
            name_ar: 'موهيتو التوت البري المنعش',
            description_en: 'Crushed wild berries, fresh mint leaves, zesty lime, crushed ice, and sparkling Perrier.',
            description_ar: 'توت بري طازج، أوراق النعناع، عصير الليمون، ثلج مجروش، ومياه بيرييه الغازية.',
            image: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Mojito-cocktail-scaled.jpg',
            price: 34,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_featured: true,
          },
        ],
      },
    ],
  },
  {
    id: 'royal-outlet-room-service',
    hotel_id: '11',
    outlet_code: 'room_service',
    slug: 'room-service',
    outlet_type: 'room_service',
    name_en: 'Room Service',
    name_ar: 'خدمة الغرف',
    short_description_en: 'In-room dining available directly to your suite or room.',
    short_description_ar: 'أشهى الوجبات والمشروبات تصل إلى باب جناحك أو غرفتك على مدار الساعة.',
    full_description_en:
      'Enjoy 24-hour gourmet in-room dining delivered fresh and hot to your suite at Swiss Flora Royal Hotel. Our dedicated room service team guarantees quick dispatch with heated cloches and customized presentation. To place your order, dial 222 or request seamlessly via WhatsApp.',
    full_description_ar:
      'استمتع بخدمة تناول الطعام داخل الغرف والأجنحة على مدار 24 ساعة بأعلى معايير الفخامة والسرعة. أطباق ساخنة ومشروبات منعشة تصلك في أوانٍ معقمة ومحمية بغطاء حراري. للطلب اتصل على تحويلة 222 أو أرسل طلبك مباشرة عبر واتساب.',
    hero_image: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://api.swissflorahotels.com/wwwroot/AttachmentPath/RestaurantMenu/1a2e0441-b476-489c-9b4f-dc74811d67e5/traytracker.jpg',
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    ],
    cuisine_en: '24/7 In-Room Global Comfort Food',
    cuisine_ar: 'مأكولات عالمية وأطباق راقية للغرف 24 ساعة',
    dress_code_en: 'In-Room Comfort',
    dress_code_ar: 'راحة الجناح الخاصة',
    location: {
      building_en: 'Main Hotel Tower',
      building_ar: 'برج الفندق الرئيسي',
      floor_en: 'All Guest Rooms & Suites • Dial 222',
      floor_ar: 'كافة غرف وأجنحة النزلاء • تحويلة 222',
      internal_text_en: 'Delivered directly to room door',
      internal_text_ar: 'توصيل مباشر لباب غرفتك أو جناحك',
    },
    operating_info: {
      opening_hours_en: '24 Hours Daily',
      opening_hours_ar: 'على مدار 24 ساعة يومياً',
      periods: [
        { name_en: '24/7 Room Delivery', name_ar: 'توصيل الغرف المستمر', time_en: '00:00 - 23:59', time_ar: '00:00 - 23:59' },
      ],
    },
    contact: {
      phone: '+966112349904',
      extension: '222',
      whatsapp_number: '+966551100005',
      whatsapp_enabled: true,
      default_message_en: 'Hello Room Service (Dial 222), I would like to place an order to my room.',
      default_message_ar: 'مرحباً بخدمة الغرف (تحويلة 222)، أود طلب وجبة طعام إلى غرفتي.',
      email: 'room.service@swissflorahotels.com',
    },
    audience: 'IN_HOUSE',
    is_active: true,
    is_visible: true,
    sort_order: 4,
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
            is_featured: true,
          },
          {
            id: 'item-rs-pizza',
            item_code: 'RS-03',
            category_id: 'cat-rs-all-day',
            name_en: 'Artisan Margherita Stone-Baked Pizza',
            name_ar: 'بيتزا مارغريتا إيطالية على الحجر',
            description_en: 'San Marzano tomato sauce, fresh mozzarella fior di latte, basil, extra virgin olive oil.',
            description_ar: 'صلصة طماطم سان مارزانو، موزاريلا إيطالية طازجة، ريحان وزيت زيتون بكر.',
            image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80',
            price: 58,
            currency: 'SAR',
            is_available: true,
            sort_order: 3,
          },
        ],
      },
    ],
  },
  {
    id: 'royal-outlet-mini-bar',
    hotel_id: '11',
    outlet_code: 'mini_bar',
    slug: 'mini-bar',
    outlet_type: 'mini_bar',
    name_en: 'Mini Bar',
    name_ar: 'الميني بار',
    short_description_en: 'Convenient in-room beverages, snacks and minibar essentials.',
    short_description_ar: 'مشروبات باردة وسناكات خفيفة ومستلزمات فورية داخل ثلاجة الغرفة.',
    full_description_en:
      'Your suite is equipped with a private silent refrigerator stocked with chilled soft drinks, premium mineral and sparkling waters, gourmet snacks, and artisan Swiss chocolates. Convenient refill requests, fresh ice buckets, and premium beverage restocks are delivered to your room door within minutes.',
    full_description_ar:
      'تم تزويد غرفتك أو جناحك بثلاجة صامتة خاصة تحتوي على تشكيلة من المشروبات الغازية المبردة، مياه فوارة ومعدنية فاخرة، مقبلات خفيفة، وشوكولاتة سويسرية راقية. يمكنك طلب إعادة التعبئة الفورية أو دلو ثلج نقي بنقرة واحدة عبر واتساب.',
    hero_image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80',
    ],
    cuisine_en: 'Chilled In-Room Refreshments & Artisan Snacks',
    cuisine_ar: 'مشروبات وسناكات مبردة داخل الغرفة',
    dress_code_en: 'In-Room Comfort',
    dress_code_ar: 'راحة الغرفة',
    location: {
      building_en: 'Main Hotel Tower',
      building_ar: 'برج الفندق الرئيسي',
      floor_en: 'In-Room Refrigerator & Valet Bar',
      floor_ar: 'داخل ثلاجة الغرفة وبار الجناح',
      internal_text_en: 'Located inside your suite refreshment center',
      internal_text_ar: 'موجود في مركز الضيافة داخل جناحك',
    },
    operating_info: {
      opening_hours_en: '24 Hours In-Room Access',
      opening_hours_ar: 'متاح في الغرفة على مدار 24 ساعة',
      periods: [
        { name_en: '24/7 Restock & Valet', name_ar: 'إعادة التعبئة والخدمة 24 ساعة', time_en: '00:00 - 23:59', time_ar: '00:00 - 23:59' },
      ],
    },
    contact: {
      phone: '+966112349905',
      extension: '225',
      whatsapp_number: '+966551100009',
      whatsapp_enabled: true,
      default_message_en: 'Hello In-Room Mini Bar Services, I would like to request a restock / ice bucket for my room.',
      default_message_ar: 'مرحباً بخدمة الميني بار، أود طلب إعادة تعبئة / دلو ثلج لغرفتي.',
      email: 'minibar@swissflorahotels.com',
    },
    audience: 'IN_HOUSE',
    is_active: true,
    is_visible: true,
    sort_order: 5,
    menu_categories: [
      {
        id: 'cat-mb-drinks',
        outlet_id: 'royal-outlet-mini-bar',
        code: 'beverages',
        name_en: 'Chilled Beverages & Sparkling Waters',
        name_ar: 'المشروبات الباردة والمياه الفوارة',
        is_active: true,
        sort_order: 1,
        items: [
          {
            id: 'item-mb-san-pellegrino',
            item_code: 'MB-01',
            category_id: 'cat-mb-drinks',
            name_en: 'San Pellegrino Sparkling Mineral Water (500ml)',
            name_ar: 'مياه سان بيليغرينو الفوارة (500 مل)',
            description_en: 'Chilled premium sparkling Italian mineral water.',
            description_ar: 'مياه معدنية فوارة إيطالية فاخرة مبردة في ثلاجة الغرفة.',
            image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
            price: 18,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_featured: true,
          },
          {
            id: 'item-mb-redbull',
            item_code: 'MB-02',
            category_id: 'cat-mb-drinks',
            name_en: 'Red Bull Energy Drink (250ml)',
            name_ar: 'مشروب الطاقة ريد بول (250 مل)',
            description_en: 'Chilled original energy drink for an active day in Riyadh.',
            description_ar: 'مشروب الطاقة الكلاسيكي مبرد وجاهز داخل الثلاجة.',
            image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80',
            price: 22,
            currency: 'SAR',
            is_available: true,
            sort_order: 2,
          },
        ],
      },
      {
        id: 'cat-mb-snacks',
        outlet_id: 'royal-outlet-mini-bar',
        code: 'snacks',
        name_en: 'Artisan Chocolates & Gourmet Bites',
        name_ar: 'الشوكولاتة السويسرية والمكسرات الفاخرة',
        is_active: true,
        sort_order: 2,
        items: [
          {
            id: 'item-mb-choc',
            item_code: 'MB-03',
            category_id: 'cat-mb-snacks',
            name_en: 'Swiss Lindt Dark Chocolate Truffles Box',
            name_ar: 'صندوق شوكولاتة ليندت السويسرية الداكنة',
            description_en: 'Premium Swiss cocoa truffles with delicate melting ganache center.',
            description_ar: 'شوكولاتة سويسرية فاخرة بحشوة غنية تذوب بالفم.',
            image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80',
            price: 32,
            currency: 'SAR',
            is_available: true,
            sort_order: 1,
            is_chef_choice: true,
          },
        ],
      },
    ],
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
      phone: '+966112349906',
      extension: '210',
      whatsapp_number: '+966551100006',
      whatsapp_enabled: true,
      default_message_en: 'Hello Eventura, I would like to inquire about hosting a corporate event / wedding.',
      default_message_ar: 'مرحباً بإيفينتورا، أود الاستفسار عن حجز قاعة وتنظيم حفل / فعالية.',
      email: 'eventura.royal@swissflorahotels.com',
    },
    audience: 'BOTH',
    is_active: true,
    is_visible: true,
    sort_order: 6,
    menu_categories: [],
  },
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
  slug: 'swiss-flora-royal',
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
  general_guest_whatsapp: '+966112349999',
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
  reviews: [
    {
      id: 'rev-royal-1',
      hotel_id: '11',
      guest_name: 'Fahad Al-Otaibi',
      rating: 5,
      review_text_en:
        'Superb hospitality and pristine suites. The breakfast buffet at Flora Restaurant was diverse and delicious. Staff were exceptionally courteous.',
      review_text_ar:
        'إقامة استثنائية ونظافة فائقة في الأجنحة. بوفيه الإفطار في مطعم فلورا متنوع ولذيذ جداً، وتعامل موظفي الاستقبال راقٍ واحترافي.',
      date: '2026-02-14',
      source: 'Verified Stay',
      is_verified: true,
    },
    {
      id: 'rev-royal-2',
      hotel_id: '11',
      guest_name: 'Dr. Sarah Jenkins',
      rating: 5,
      review_text_en:
        'The indoor heated swimming pool and health club massage were the highlights of my business trip to Riyadh. Quiet, restful suite with high-speed internet.',
      review_text_ar:
        'المسبح الداخلي المدفأ وجلسة المساج في النادي الصحي كانتا أروع ما في رحلة عملي للرياض. جناح هادئ مع إنترنت فائق السرعة.',
      date: '2026-01-28',
      source: 'Verified Stay',
      is_verified: true,
    },
    {
      id: 'rev-royal-3',
      hotel_id: '11',
      guest_name: 'Mohammed Al-Shehri',
      rating: 5,
      review_text_en:
        'Prompt in-room dining and valet laundry service. The QR portal makes ordering and communication via WhatsApp seamless.',
      review_text_ar:
        'خدمة غرف سريعة ومغسلة الملابس ممتازة. بوابة الباركود الرقمية جعلت الطلبات والتواصل عبر الواتساب بغاية السهولة.',
      date: '2026-01-10',
      source: 'Verified Stay',
      is_verified: true,
    },
  ],
  is_published: true,
};

export const SWISS_FLORA_INN_HOTEL: Hotel = {
  id: '12',
  slug: 'swiss-flora-inn',
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
  general_guest_whatsapp: '+966112349999',
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
  reviews: [
    {
      id: 'rev-inn-1',
      hotel_id: '12',
      guest_name: 'Abdullah Al-Dosari',
      rating: 5,
      review_text_en:
        'Great location near KAFD and Boulevard. Rooms are spacious, clean, and modern. Outstanding value for business and leisure in Riyadh.',
      review_text_ar:
        'موقع ممتاز بالقرب من كافد والبوليفارد. الغرف واسعة ونظيفة وعصرية، وقيمة ممتازة للإقامة لرجال الأعمال والعائلات.',
      date: '2026-02-05',
      source: 'Verified Stay',
      is_verified: true,
    },
    {
      id: 'rev-inn-2',
      hotel_id: '12',
      guest_name: 'Emma Watson',
      rating: 4,
      review_text_en:
        'Helpful staff, fast Wi-Fi, and convenient parking. The QR guest portal made requesting services effortless.',
      review_text_ar:
        'طاقم متعاون، إنترنت سريع، ومواقف سيارات متوفرة ومريحة. بوابة الباركود وفرت علينا الكثير في طلب الخدمات.',
      date: '2026-01-20',
      source: 'Verified Stay',
      is_verified: true,
    },
  ],
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
