import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Language } from '../../types/hotel';

export interface BreadcrumbItem {
  label_en: string;
  label_ar: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  language: Language;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ items, language }) => {
  const isAr = language === 'ar';

  return (
    <nav aria-label="Breadcrumb" className="bg-white/80 backdrop-blur-md border-b border-stone-200/80 px-4 py-3 sticky top-16 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-stone-500 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={items[0]?.onClick}
          className="flex items-center gap-1 hover:text-stone-900 transition-colors font-medium text-stone-700 cursor-pointer"
        >
          <Home size={14} />
          <span>{isAr ? 'الرئيسية' : 'Hotel'}</span>
        </button>

        {items.map((item, index) => (
          <React.Fragment key={index}>
            <ChevronRight size={13} className={`text-stone-400 shrink-0 ${isAr ? 'rotate-180' : ''}`} />
            {item.isActive || !item.onClick ? (
              <span className="font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md">
                {isAr ? item.label_ar : item.label_en}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-stone-900 hover:underline transition-colors font-medium cursor-pointer"
              >
                {isAr ? item.label_ar : item.label_en}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};
