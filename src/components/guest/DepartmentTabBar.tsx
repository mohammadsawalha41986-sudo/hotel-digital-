import React from 'react';
import { Bed, UtensilsCrossed, Sparkles, Shirt, BellRing, Tag, LayoutGrid } from 'lucide-react';
import { Language } from '../../types/hotel';
import { TopLevelDepartment } from '../../types/department';

interface DepartmentTabBarProps {
  activeDepartment: TopLevelDepartment;
  onSelectDepartment: (dept: TopLevelDepartment) => void;
  language: Language;
}

export const DepartmentTabBar: React.FC<DepartmentTabBarProps> = ({
  activeDepartment,
  onSelectDepartment,
  language,
}) => {
  const isAr = language === 'ar';

  const departments: {
    id: TopLevelDepartment;
    name_en: string;
    name_ar: string;
    subtitle_en: string;
    subtitle_ar: string;
    icon: React.ElementType;
    badge_en?: string;
    badge_ar?: string;
  }[] = [
    {
      id: 'overview',
      name_en: 'Overview',
      name_ar: 'نظرة عامة',
      subtitle_en: 'Hotel Guide',
      subtitle_ar: 'دليل الفندق',
      icon: LayoutGrid,
    },
    {
      id: 'stay',
      name_en: 'In-Room Services',
      name_ar: 'خدمات الغرفة',
      subtitle_en: 'Housekeeping & Comfort',
      subtitle_ar: 'النظافة والراحة',
      icon: Bed,
    },
    {
      id: 'dining',
      name_en: 'Food & Beverage',
      name_ar: 'المطاعم والمقاهي',
      subtitle_en: 'Dining Hub',
      subtitle_ar: 'مركز المأكولات',
      icon: UtensilsCrossed,
      badge_en: '5 Outlets',
      badge_ar: '٥ منافذ',
    },
    {
      id: 'wellness',
      name_en: 'Wellness & Spa',
      name_ar: 'الصحة والسبا',
      subtitle_en: 'Health Club & Spa',
      subtitle_ar: 'النادي والسبا',
      icon: Sparkles,
      badge_en: 'Pool & Gym',
      badge_ar: 'مسبح ونادي',
    },
    {
      id: 'laundry',
      name_en: 'Laundry & Valet',
      name_ar: 'المغسلة والعناية',
      subtitle_en: 'Dry Cleaning',
      subtitle_ar: 'التنظيف الجاف',
      icon: Shirt,
    },
    {
      id: 'services',
      name_en: 'Guest Services',
      name_ar: 'خدمات النزلاء',
      subtitle_en: 'Housekeeping & Maintenance',
      subtitle_ar: 'الخدمات والصيانة',
      icon: BellRing,
    },
    {
      id: 'offers',
      name_en: 'Offers',
      name_ar: 'العروض الحصرية',
      subtitle_en: 'Promotions',
      subtitle_ar: 'باقات خاصة',
      icon: Tag,
      badge_en: 'Special',
      badge_ar: 'مميز',
    },
  ];

  return (
    <div className="bg-stone-900 border-b border-stone-800 text-stone-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 scrollbar-none">
          {departments.map((dept) => {
            const Icon = dept.icon;
            const isActive = activeDepartment === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => onSelectDepartment(dept.id)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-600/90 text-white shadow-md shadow-amber-900/30'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                <Icon
                  size={15}
                  className={`transition-colors ${
                    isActive ? 'text-amber-100' : 'text-stone-400 group-hover:text-amber-300'
                  }`}
                />
                <div className="text-start leading-tight">
                  <div className="font-semibold text-xs">{isAr ? dept.name_ar : dept.name_en}</div>
                </div>
                {dept.badge_en && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive
                        ? 'bg-amber-800/80 text-amber-100'
                        : 'bg-stone-800 text-stone-400 group-hover:text-stone-200'
                    }`}
                  >
                    {isAr ? dept.badge_ar : dept.badge_en}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
