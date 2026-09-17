import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Play,
  Pause,
} from 'lucide-react';
import { Language } from '../../types/hotel';

export interface GalleryItem {
  id: string;
  url: string;
  title_en: string;
  title_ar: string;
  category: 'all' | 'hotel' | 'rooms' | 'dining' | 'wellness' | 'meetings';
  caption_en?: string;
  caption_ar?: string;
}

export interface HotelGallerySectionProps {
  language: Language;
  hotelId?: string | number;
  heroImages?: { url: string; caption_en: string; caption_ar: string; tag_en: string; tag_ar: string }[];
}

export const HotelGallerySection: React.FC<HotelGallerySectionProps> = ({
  language,
}) => {
  const isAr = language === 'ar';
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Slider interactive states
  const [isAutoplayActive, setIsAutoplayActive] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [canScrollPrev, setCanScrollPrev] = useState<boolean>(false);
  const [canScrollNext, setCanScrollNext] = useState<boolean>(true);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Drag-to-scroll tracking
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasMovedFar, setHasMovedFar] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartScrollLeft = useRef<number>(0);

  // Lightbox touch swipe tracking
  const lightboxTouchStartX = useRef<number>(0);
  const lightboxTouchEndX = useRef<number>(0);

  const sliderRef = useRef<HTMLDivElement>(null);

  // Authentic Swiss Flora Photography Collection (16 rich hotel photos)
  const galleryItems: GalleryItem[] = useMemo(
    () => [
      {
        id: 'gal-1',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/b6c54913-53cd-4103-9705-8a733594d372/room.png',
        title_en: 'Signature Executive Living',
        title_ar: 'أجنحة المعيشة التنفيذية الفاخرة',
        category: 'rooms',
        caption_en: 'Contemporary architectural design with bespoke furnishings and panoramic Riyadh views.',
        caption_ar: 'تصميم معماري عصري مع أثاث فاخر وإطلالات بانورامية على مدينة الرياض.',
      },
      {
        id: 'gal-2',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/196e5f2d-a6e6-4ef9-a628-3b500c9772a3/uu.jpg',
        title_en: 'Royal Grand Suite Bedroom',
        title_ar: 'غرفة نوم الجناح الملكي الفاخر',
        category: 'rooms',
        caption_en: 'King plush bedding with intelligent in-room lighting and climate controls.',
        caption_ar: 'أسرة ملكية مريحة وأنظمة تحكم ذكية بالإضاءة والتكييف.',
      },
      {
        id: 'gal-3',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/7d165f73-d3ec-459e-967c-a894a9e770f0/WhatsApp%20Image%202024-08-01%20at%2010.38.58.jpg',
        title_en: 'Hotel Exterior & Grand Arrival',
        title_ar: 'الواجهة المعمارية ومدخل الفندق',
        category: 'hotel',
        caption_en: 'Swiss Flora Royal Hotel Riyadh on prestigious King Fahad Road in Al Sahafa.',
        caption_ar: 'فندق سويس فلورا رويال الرياض على طريق الملك فهد الراقي بحي الصحافة.',
      },
      {
        id: 'gal-4',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/e62c936d-a986-4fec-90fa-618652baab0b/chef.jpg',
        title_en: 'Executive Chef Gourmet Preparation',
        title_ar: 'إبداعات الشيف التنفيذي بالمطعم',
        category: 'dining',
        caption_en: 'Artisanal culinary craft featuring international specialties and authentic Middle Eastern flavours.',
        caption_ar: 'إبداع طهي احترافي يجمع بين الأطباق العالمية والنكهات الشرقية الأصيلة.',
      },
      {
        id: 'gal-5',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/1f797aee-8962-4565-82c8-970a7d2ee11c/shutterstock_645095311.jpg',
        title_en: 'Flora Fine Dining Buffet & Ambiance',
        title_ar: 'أجواء مطعم فلورا والبوفيه العالمي',
        category: 'dining',
        caption_en: 'Lavish international breakfast and dinner buffets in an elegant, sunlit dining hall.',
        caption_ar: 'بوفيه إفطار وعشاء دولي فاخر في قاعة طعام مضاءة بنور الشمس وأجواء راقية.',
      },
      {
        id: 'gal-6',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Swiss-Cafe-Restaurant-Lounge-2.jpg',
        title_en: 'Swiss Café & Lounge Hospitality',
        title_ar: 'مقهى ولاونج سويس كافيه الراقي',
        category: 'dining',
        caption_en: 'Artisanal espresso, Saudi specialty coffee, and handcrafted pastries in a serene setting.',
        caption_ar: 'قهوة سعودية أصيلة، مشروبات فاخرة، ومعجنات طازجة في أجواء هادئة وراقية.',
      },
      {
        id: 'gal-7',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/84352dbf-9708-4e81-b174-03156b9bb95b/Pool%204.jpg',
        title_en: 'Indoor Heated Swimming Pool',
        title_ar: 'حمام السباحة الداخلي الدافئ',
        category: 'wellness',
        caption_en: 'Year-round climate-controlled indoor pool surrounded by comfortable relaxation loungers.',
        caption_ar: 'مسبح داخلي مدفأ طوال العام محاط بمقاعد استرخاء مريحة للاستجمام.',
      },
      {
        id: 'gal-8',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/a1d28670-ddb6-42fc-9b26-38a6200ba872/Massage.jpg',
        title_en: 'Therapeutic Massage Suites',
        title_ar: 'أجنحة المساج والتدليك العلاجي',
        category: 'wellness',
        caption_en: 'Private therapy chambers with aromatic oils and customized Swedish and Thai treatments.',
        caption_ar: 'غرف علاج خاصة بزيوت عطرية وجلسات تدليك سويدية وتايلاندية مخصصة.',
      },
      {
        id: 'gal-9',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Spa/4d53ec60-8e37-4d3b-9111-3cbd6e5b66e3/Gym%20Area%202.jpg',
        title_en: 'Technogym Fitness Studio',
        title_ar: 'صالة اللياقة البدنية ونادي كمال الأجسام',
        category: 'wellness',
        caption_en: 'Modern cardio machines, free weight zones, and comprehensive fitness facilities.',
        caption_ar: 'أجهزة جري ولياقة بدنية متطورة ومناطق أوزان حرة متكاملة.',
      },
      {
        id: 'gal-10',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Meeting/6b930953-98c8-43fb-ad8b-a05847209738/WhatsApp%20Image%202024-08-01%20at%2016.37.07%20(1).jpg',
        title_en: 'Eventura Conference & Boardroom',
        title_ar: 'قاعات إيفينتورا للاجتماعات ومجالس الإدارة',
        category: 'meetings',
        caption_en: 'Flexible modular seating, high-resolution laser projectors, and modern video conferencing.',
        caption_ar: 'ترتيبات جلوس مرنة، أجهزة عرض ليزرية متطورة، وتجهيزات مؤتمرات فيديو حديثة.',
      },
      {
        id: 'gal-11',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Meeting/e3004a05-5d76-4ec6-aba8-11c10bbdbde6/shutterstock_145238350.jpg',
        title_en: 'Gala Banquet & Celebrations Setup',
        title_ar: 'تنظيم الحفلات والمناسبات الراقية',
        category: 'meetings',
        caption_en: 'Bespoke event planning and royal banquet setups for special occasions and weddings.',
        caption_ar: 'تخطيط احتفالات مخصص وتجهيزات ملكية للمناسبات والأعراس الخاصة.',
      },
      {
        id: 'gal-12',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Meeting/3eb11f26-33b9-401c-9cb4-172c63a44507/Buffet%20Ramadan%202024.jpg',
        title_en: 'Eventura Outdoor Gourmet Catering',
        title_ar: 'خدمات الحفلات الخارجية والبوفيه المفتوح',
        category: 'meetings',
        caption_en: 'Unmatched catering experiences bringing five-star gastronomy to your chosen outdoor venues.',
        caption_ar: 'خدمات تقديم طعام راقية تنقل المذاق الفندقي الفاخر إلى موقع فعاليتك المفضل.',
      },
      {
        id: 'gal-13',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/fab8b685-c6c1-483f-9767-3e7fe8a8c609/7_1511849370.jpg',
        title_en: 'Lobby Architecture & Lounge Decor',
        title_ar: 'معمارية البهو الرئيسي ولاونج الاستقبال',
        category: 'hotel',
        caption_en: 'Sophisticated interior aesthetics blending warm wood tones, marble, and Swiss minimalism.',
        caption_ar: 'جماليات داخلية تجمع بين دفء الخشب والرخام مع البساطة السويسرية الراقية.',
      },
      {
        id: 'gal-14',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/SliderImages/97e61847-38b5-4707-b054-19d6d49966e7/download5.png',
        title_en: 'Deluxe Diplomatic Bedroom',
        title_ar: 'غرفة نوم الديلوكس الدبلوماسية',
        category: 'rooms',
        caption_en: 'Spacious guestroom with ergonomic workstation, luxury ensuite bathroom, and premium soundproofing.',
        caption_ar: 'غرفة ضيوف فسيحة مع مكتب عمل مريح، حمام فاخر، وعزل صوتي متكامل.',
      },
      {
        id: 'gal-15',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/Gallery/8d282b82-971d-47ba-80d5-d0612b1182ca/Mojito-cocktail-scaled.jpg',
        title_en: 'Artisan Mocktails & Refreshments',
        title_ar: 'المشروبات المنعشة والموكتيل الفاخر',
        category: 'dining',
        caption_en: 'Signature handcrafted fruit cocktails and refreshing beverages prepared by master baristas.',
        caption_ar: 'مشروبات فواكه منعشة وموكتيل مميز محضر بأيدي خبراء المشروبات.',
      },
      {
        id: 'gal-16',
        url: 'https://api.swissflorahotels.com/wwwroot/AttachmentPath/About/cb2a4062-6175-46e4-8c4c-c65714f26fc8/_22A7761.JPG',
        title_en: 'Royal Welcome & Concierge Atrium',
        title_ar: 'ردهة الاستقبال والكونسيرج الملكية',
        category: 'hotel',
        caption_en: 'Dedicated 24/7 guest relations and VIP concierge desk ensuring seamless hospitality.',
        caption_ar: 'مكتب علاقات الضيوف وخدمات الكونسيرج المتاحة على مدار الساعة لضمان إقامة استثنائية.',
      },
    ],
    []
  );

  const categories = [
    { id: 'all', label_en: 'All Photos', label_ar: 'كافة الصور' },
    { id: 'hotel', label_en: 'Property & Lobby', label_ar: 'الفندق والبهو' },
    { id: 'rooms', label_en: 'Rooms & Suites', label_ar: 'الغرف والأجنحة' },
    { id: 'dining', label_en: 'Dining & Café', label_ar: 'المطعم والمقهى' },
    { id: 'wellness', label_en: 'Wellness & Pool', label_ar: 'المسبح والسبا' },
    { id: 'meetings', label_en: 'Meetings & Events', label_ar: 'الاجتماعات والفعاليات' },
  ];

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return galleryItems;
    return galleryItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, galleryItems]);

  // Update scroll metrics and arrow states
  const updateScrollMetrics = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      setScrollProgress(1);
      return;
    }

    const currentScroll = Math.abs(el.scrollLeft);
    setCanScrollPrev(currentScroll > 10);
    setCanScrollNext(currentScroll < maxScroll - 10);
    setScrollProgress(Math.min(1, Math.max(0, currentScroll / maxScroll)));
  }, []);

  // Update metrics on scroll & resize
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;

    updateScrollMetrics();
    const handleScroll = () => updateScrollMetrics();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateScrollMetrics, filteredItems]);

  // Reset scroll to beginning smoothly on category switch
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [activeCategory]);

  // Scroll Slider forward or backward by ~1 card step
  const handleScroll = useCallback(
    (direction: 'prev' | 'next') => {
      const el = sliderRef.current;
      if (!el) return;

      const cardWidth = el.clientWidth * (window.innerWidth < 640 ? 0.82 : window.innerWidth < 1024 ? 0.4 : 0.28);
      const scrollStep = Math.max(cardWidth, 260);

      // Support LTR and RTL scroll offsets
      const sign = isAr ? -1 : 1;
      const offset = (direction === 'next' ? scrollStep : -scrollStep) * sign;

      el.scrollBy({ left: offset, behavior: 'smooth' });
    },
    [isAr]
  );

  // Autoplay functionality: every 5.5 seconds smoothly progress
  useEffect(() => {
    if (!isAutoplayActive || isHovered || isDragging || lightboxIndex !== null) return;

    const interval = setInterval(() => {
      const el = sliderRef.current;
      if (!el) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      const currentScroll = Math.abs(el.scrollLeft);

      // If reached the end, smoothly loop back to start
      if (currentScroll >= maxScroll - 15) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        handleScroll('next');
      }
    }, 5500);

    return () => clearInterval(interval);
  }, [isAutoplayActive, isHovered, isDragging, lightboxIndex, handleScroll]);

  // Drag-to-scroll handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    setHasMovedFar(false);
    dragStartX.current = e.pageX;
    dragStartScrollLeft.current = sliderRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderRef.current) return;
    const deltaX = e.pageX - dragStartX.current;
    if (Math.abs(deltaX) > 8) {
      setHasMovedFar(true);
    }
    sliderRef.current.scrollLeft = dragStartScrollLeft.current - deltaX;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    setTimeout(() => {
      setHasMovedFar(false);
    }, 50);
  };

  // Lightbox handlers
  const openLightbox = (index: number) => {
    if (hasMovedFar) return; // Ignore accidental clicks after dragging
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const prevImage = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => ((prev ?? 0) - 1 + filteredItems.length) % filteredItems.length);
  }, [lightboxIndex, filteredItems.length]);

  const nextImage = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => ((prev ?? 0) + 1) % filteredItems.length);
  }, [lightboxIndex, filteredItems.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        if (isAr) nextImage();
        else prevImage();
      } else if (e.key === 'ArrowRight') {
        if (isAr) prevImage();
        else nextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, isAr, nextImage, prevImage]);

  // Lightbox Touch Swipe handlers
  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    lightboxTouchStartX.current = e.touches[0].clientX;
  };

  const handleLightboxTouchMove = (e: React.TouchEvent) => {
    lightboxTouchEndX.current = e.touches[0].clientX;
  };

  const handleLightboxTouchEnd = () => {
    const deltaX = lightboxTouchStartX.current - lightboxTouchEndX.current;
    if (Math.abs(deltaX) > 45) {
      if (deltaX > 0) {
        // Swiped left
        if (isAr) prevImage();
        else nextImage();
      } else {
        // Swiped right
        if (isAr) nextImage();
        else prevImage();
      }
    }
  };

  const activePhoto = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <section
      id="hotel-gallery"
      className="py-16 sm:py-24 bg-stone-900 text-white border-b border-stone-800 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header & Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-full mb-3">
              <Camera size={13} />
              <span>{isAr ? 'معرض صور الفندق التفاعلي' : 'HOTEL GALLERY SLIDER'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-white">
              {isAr ? 'جولة مصورة في أرجاء الفندق' : 'Visual Tour & Property Gallery'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-2 max-w-2xl leading-relaxed">
              {isAr
                ? 'اسحب لتصفح مرافق الفندق والأجنحة الفاخرة أو انقر على أي صورة لتكبيرها في نافذة العرض الكاملة.'
                : 'Swipe or use the arrows to browse our suites and facilities, or click any image for full-screen view.'}
            </p>
          </div>

          {/* Autoplay toggle & Arrow Navigation */}
          <div className="flex items-center gap-3 self-start md:self-end">
            {/* Autoplay Toggle Button */}
            <button
              onClick={() => setIsAutoplayActive((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                isAutoplayActive
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
              title={isAutoplayActive ? 'Pause Autoplay' : 'Resume Autoplay'}
            >
              {isAutoplayActive ? <Pause size={12} /> : <Play size={12} />}
              <span>{isAutoplayActive ? (isAr ? 'تشغيل تلقائي' : 'Autoplay ON') : (isAr ? 'إيقاف' : 'Paused')}</span>
            </button>

            {/* Previous Arrow */}
            <button
              onClick={() => handleScroll('prev')}
              disabled={!canScrollPrev}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                canScrollPrev
                  ? 'bg-stone-800/90 border-stone-700 text-white hover:bg-amber-600 hover:border-amber-500 shadow-md'
                  : 'bg-stone-850/50 border-stone-800 text-stone-600 cursor-not-allowed'
              }`}
              aria-label={isAr ? 'الصور السابقة' : 'Previous photos'}
            >
              <ChevronLeft size={18} className={isAr ? 'rotate-180' : ''} />
            </button>

            {/* Next Arrow */}
            <button
              onClick={() => handleScroll('next')}
              disabled={!canScrollNext}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                canScrollNext
                  ? 'bg-stone-800/90 border-stone-700 text-white hover:bg-amber-600 hover:border-amber-500 shadow-md'
                  : 'bg-stone-850/50 border-stone-800 text-stone-600 cursor-not-allowed'
              }`}
              aria-label={isAr ? 'الصور التالية' : 'Next photos'}
            >
              <ChevronRight size={18} className={isAr ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count =
              cat.id === 'all'
                ? galleryItems.length
                : galleryItems.filter((item) => item.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/30'
                    : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
                }`}
              >
                <span>{isAr ? cat.label_ar : cat.label_en}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-amber-700/80 text-amber-100' : 'bg-stone-900/80 text-stone-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 
          HORIZONTAL SLIDER CAROUSEL (ONE SINGLE ROW OF GALLERY CARDS)
          Target ratios:
          - Desktop (lg/xl): 3.5 to 4 cards visible (w-[27%] / w-[26%])
          - Tablet (md): 2.5 cards visible (w-[38%])
          - Mobile: 1.2 cards visible (w-[82%]) with partial next image peek
        */}
        <div
          className="relative group/slider -mx-4 sm:-mx-6 px-4 sm:px-6"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            handleMouseUpOrLeave();
          }}
        >
          {/* Floating Left Button (for desktop & tablet overlay) */}
          <button
            onClick={() => handleScroll('prev')}
            className={`hidden md:flex absolute start-6 lg:start-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full items-center justify-center bg-stone-950/80 hover:bg-amber-600 text-white border border-stone-700/80 hover:border-amber-400 backdrop-blur-md shadow-2xl transition-all duration-200 cursor-pointer ${
              canScrollPrev ? 'opacity-0 group-hover/slider:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft size={22} className={isAr ? 'rotate-180' : ''} />
          </button>

          {/* Floating Right Button (for desktop & tablet overlay) */}
          <button
            onClick={() => handleScroll('next')}
            className={`hidden md:flex absolute end-6 lg:end-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full items-center justify-center bg-stone-950/80 hover:bg-amber-600 text-white border border-stone-700/80 hover:border-amber-400 backdrop-blur-md shadow-2xl transition-all duration-200 cursor-pointer ${
              canScrollNext ? 'opacity-0 group-hover/slider:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight size={22} className={isAr ? 'rotate-180' : ''} />
          </button>

          {/* Scroll Track */}
          <div
            ref={sliderRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            className={`flex items-stretch gap-4 sm:gap-5 overflow-x-auto scrollbar-none snap-x snap-mandatory py-2 select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => openLightbox(idx)}
                className="flex-none shrink-0 snap-start w-[82%] sm:w-[48%] md:w-[38%] lg:w-[27%] xl:w-[25.5%] group relative rounded-2xl overflow-hidden bg-stone-850 border border-stone-800 hover:border-amber-500/70 shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                {/* Image Container with high aspect card */}
                <div className="relative aspect-[4/3] sm:aspect-[16/11] overflow-hidden bg-stone-900">
                  <img
                    src={item.url}
                    alt={isAr ? item.title_ar : item.title_en}
                    draggable={false}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out select-none"
                    loading="lazy"
                  />
                  {/* Subtle Gradient Shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-black/60 backdrop-blur-md text-amber-300 border border-white/10">
                      {categories.find((c) => c.id === item.category)?.[isAr ? 'label_ar' : 'label_en']}
                    </span>

                    <span className="w-8 h-8 rounded-full bg-black/55 backdrop-blur-md text-white/90 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 size={13} />
                    </span>
                  </div>

                  {/* Bottom Captions */}
                  <div className="absolute bottom-3.5 inset-x-3.5 space-y-1">
                    <h3 className="text-sm sm:text-base font-serif font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {isAr ? item.title_ar : item.title_en}
                    </h3>
                    <p className="text-[11px] text-stone-300 line-clamp-2 leading-relaxed opacity-85">
                      {isAr ? item.caption_ar : item.caption_en}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Progress Bar Indicator */}
          <div className="mt-5 flex items-center justify-between gap-4 px-1">
            <div className="flex-1 h-1 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(12, scrollProgress * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-stone-400">
              {filteredItems.length} {isAr ? 'صور' : 'Photos'}
            </span>
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      {activePhoto && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onTouchStart={handleLightboxTouchStart}
          onTouchMove={handleLightboxTouchMove}
          onTouchEnd={handleLightboxTouchEnd}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-20">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-stone-300 bg-stone-850 px-3 py-1.5 rounded-full border border-stone-700">
                {lightboxIndex + 1} / {filteredItems.length}
              </span>
              <span className="text-xs font-semibold text-amber-300">
                {categories.find((c) => c.id === activePhoto.category)?.[isAr ? 'label_ar' : 'label_en']}
              </span>
            </div>

            <button
              onClick={closeLightbox}
              className="p-2.5 rounded-full bg-stone-850 hover:bg-stone-700 text-white border border-stone-700 transition-colors cursor-pointer"
              aria-label="Close Lightbox"
            >
              <X size={20} />
            </button>
          </div>

          {/* Center Image with Prev/Next Controls */}
          <div className="relative flex-1 flex items-center justify-center my-3 sm:my-4 overflow-hidden">
            {/* Previous Image Button */}
            <button
              onClick={prevImage}
              className="absolute start-2 sm:start-6 z-20 p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-xl"
              aria-label="Previous photo"
            >
              <ChevronLeft size={24} className={isAr ? 'rotate-180' : ''} />
            </button>

            <img
              src={activePhoto.url}
              alt={isAr ? activePhoto.title_ar : activePhoto.title_en}
              className="max-h-[76vh] max-w-[92vw] object-contain rounded-xl shadow-2xl transition-all select-none"
            />

            {/* Next Image Button */}
            <button
              onClick={nextImage}
              className="absolute end-2 sm:end-6 z-20 p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-xl"
              aria-label="Next photo"
            >
              <ChevronRight size={24} className={isAr ? 'rotate-180' : ''} />
            </button>
          </div>

          {/* Bottom Caption & Thumbnail Strip */}
          <div className="max-w-3xl mx-auto text-center space-y-2 z-20 px-4">
            <h4 className="text-base sm:text-xl font-serif font-bold text-white">
              {isAr ? activePhoto.title_ar : activePhoto.title_en}
            </h4>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl mx-auto">
              {isAr ? activePhoto.caption_ar : activePhoto.caption_en}
            </p>

            {/* Thumbnail Pills */}
            <div className="flex items-center justify-center gap-1.5 pt-2 overflow-x-auto py-1 max-w-full scrollbar-none">
              {filteredItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-10 h-7 rounded-md overflow-hidden border transition-all cursor-pointer shrink-0 ${
                    lightboxIndex === idx
                      ? 'border-amber-500 scale-110 shadow-md ring-1 ring-amber-400'
                      : 'border-stone-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
