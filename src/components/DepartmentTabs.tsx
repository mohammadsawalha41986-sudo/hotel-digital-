import React from 'react';
import { BedDouble, UtensilsCrossed, Sparkles, MessageCircle, Shield, Layers, LayoutGrid, GitFork } from 'lucide-react';

interface DepartmentTabsProps {
  selectedDept: string;
  setSelectedDept: (dept: string) => void;
  viewMode: 'directory' | 'tree' | 'whatsapp' | 'migration';
  setViewMode: (mode: 'directory' | 'tree' | 'whatsapp' | 'migration') => void;
  counts: Record<string, number>;
}

export const DepartmentTabs: React.FC<DepartmentTabsProps> = ({
  selectedDept,
  setSelectedDept,
  viewMode,
  setViewMode,
  counts,
}) => {
  const departments = [
    { id: 'all', label: 'All Routes', icon: Layers, count: counts.all || 0 },
    { id: 'rooms', label: 'Rooms Dept', icon: BedDouble, count: counts.rooms || 0 },
    { id: 'dining', label: 'Dining Dept', icon: UtensilsCrossed, count: counts.dining || 0 },
    { id: 'services', label: 'Services Dept', icon: Sparkles, count: counts.services || 0 },
    { id: 'whatsapp', label: 'WhatsApp Routing', icon: MessageCircle, count: counts.whatsapp || 0 },
    { id: 'admin', label: 'Staff & Operations', icon: Shield, count: counts.admin || 0 },
  ];

  return (
    <div id="navigation-controls-section" className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Department Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100/90 rounded-xl border border-stone-200">
          {departments.map((dept) => {
            const Icon = dept.icon;
            const isActive = selectedDept === dept.id;
            return (
              <button
                key={dept.id}
                id={`dept-tab-${dept.id}`}
                onClick={() => setSelectedDept(dept.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-stone-900' : 'text-stone-500'} />
                <span>{dept.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-stone-100 text-stone-800' : 'bg-stone-200/70 text-stone-600'
                  }`}
                >
                  {dept.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-100/90 rounded-xl border border-stone-200 self-start md:self-auto">
          <button
            id="view-mode-directory"
            onClick={() => setViewMode('directory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'directory'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Map Directory</span>
          </button>

          <button
            id="view-mode-tree"
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'tree'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <GitFork size={14} />
            <span>Hierarchy Tree</span>
          </button>

          <button
            id="view-mode-whatsapp"
            onClick={() => setViewMode('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'whatsapp'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MessageCircle size={14} />
            <span>WhatsApp Matrix</span>
          </button>

          <button
            id="view-mode-migration"
            onClick={() => setViewMode('migration')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'migration'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Audit & Migration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
