import React from 'react';
import {
  Home,
  Bed,
  UtensilsCrossed,
  Sparkles,
  Tag,
} from 'lucide-react';
import { TopLevelDepartment } from '../../types/department';
import { Language } from '../../types/hotel';

interface MobileBottomNavProps {
  activeTab: TopLevelDepartment;
  onSelectTab: (tab: TopLevelDepartment) => void;
  language: Language;
  offersCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  language,
  offersCount = 0,
}) => {
  const isAr = language === 'ar';

  const navItems = [
    {
      id: 'overview' as TopLevelDepartment,
      label_en: 'Home',
      label_ar: 'الرئيسية',
      icon: Home,
    },
    {
      id: 'stay' as TopLevelDepartment,
      label_en: 'In-Room',
      label_ar: 'الغرفة',
      icon: Bed,
    },
    {
      id: 'dining' as TopLevelDepartment,
      label_en: 'Dining',
      label_ar: 'المطاعم',
      icon: UtensilsCrossed,
    },
    {
      id: 'wellness' as TopLevelDepartment,
      label_en: 'Wellness',
      label_ar: 'العافية',
      icon: Sparkles,
    },
    {
      id: 'offers' as TopLevelDepartment,
      label_en: 'Offers',
      label_ar: 'العروض',
      icon: Tag,
      badge: offersCount > 0 ? offersCount : undefined,
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-stone-900/95 backdrop-blur-xl border-t border-stone-800 text-stone-300 shadow-2xl pb-[env(safe-area-inset-bottom)] select-none"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all cursor-pointer touch-target ${
                isActive ? 'text-amber-400 font-semibold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative">
                <IconComp size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'} />
                {item.badge && (
                  <span className="absolute -top-1 -end-2.5 bg-rose-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight">
                {isAr ? item.label_ar : item.label_en}
              </span>

              {/* Active Indicator bar */}
              {isActive && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
