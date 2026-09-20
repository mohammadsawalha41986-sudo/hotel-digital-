import React from 'react';
import {
  LucideIcon,
  Building2,
  LayoutDashboard,
  Globe,
  Layers,
  ShoppingBag,
  MessageSquare,
  QrCode,
  Palette,
  Settings,
  ChevronRight,
  Sparkles,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
  Image as ImageIcon,
  Users,
  CheckCircle2,
  X,
  Star,
  MessageSquareWarning,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';

export type AdminSectionTab =
  | 'portfolio'
  | 'dashboard'
  | 'hotel_info'
  | 'website_manager'
  | 'homepage_sections'
  | 'navigation'
  | 'custom_sections'
  | 'rooms_content'
  | 'fnb_content'
  | 'wellness_content'
  | 'laundry_content'
  | 'services_content'
  | 'offers_content'
  | 'operations_requests'
  | 'guest_reviews'
  | 'guest_feedback'
  | 'departments_routing'
  | 'whatsapp_settings'
  | 'qr_codes'
  | 'media_library'
  | 'import_center'
  | 'branding_design'
  | 'typography_design'
  | 'live_preview'
  | 'analytics'
  | 'users_rbac'
  | 'audit_log';

interface AdminSidebarProps {
  currentHotel: Hotel;
  activeTab: AdminSectionTab;
  onSelectTab: (tab: AdminSectionTab) => void;
  pendingRequestsCount: number;
  onViewLivePortal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentHotel,
  activeTab,
  onSelectTab,
  pendingRequestsCount,
  onViewLivePortal,
  isMobileOpen,
  onCloseMobile,
}) => {
  const handleNav = (tab: AdminSectionTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const navGroups: {
    title: string;
    items: {
      id: AdminSectionTab;
      label: string;
      icon: LucideIcon;
      badge?: number | string;
      badgeColor?: string;
    }[];
  }[] = [
    {
      title: 'CORE',
      items: [
        { id: 'portfolio', label: 'Hotel Portfolio', icon: Building2 },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        {
          id: 'operations_requests',
          label: 'Orders & Requests',
          icon: ShoppingBag,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          badgeColor: 'bg-amber-500 text-stone-950 font-bold',
        },
      ],
    },
    {
      title: 'WEBSITE & CMS',
      items: [
        { id: 'hotel_info', label: 'Hotel Information', icon: Building2 },
        { id: 'website_manager', label: 'Website Manager', icon: Globe },
        { id: 'homepage_sections', label: 'Homepage Sections', icon: Layers },
        { id: 'navigation', label: 'Navigation Menu', icon: ChevronRight },
        { id: 'custom_sections', label: 'Custom Sections', icon: PlusCircle },
      ],
    },
    {
      title: 'HOTEL CONTENT',
      items: [
        { id: 'rooms_content', label: 'Rooms & Suites', icon: Layers },
        { id: 'fnb_content', label: 'Food & Beverage', icon: ShoppingBag },
        { id: 'wellness_content', label: 'Wellness & Spa', icon: Sparkles },
        { id: 'laundry_content', label: 'Valet Laundry', icon: Layers },
        { id: 'services_content', label: 'Guest Services', icon: Sparkles },
        { id: 'offers_content', label: 'Offers & Packages', icon: Layers },
      ],
    },
    {
      title: 'COMMUNICATION & OPS',
      items: [
        { id: 'guest_reviews', label: 'Guest Reviews Moderation', icon: Star },
        { id: 'guest_feedback', label: 'Guest Relations & Cases', icon: MessageSquareWarning },
        { id: 'departments_routing', label: 'Hotel Departments', icon: Settings },
        { id: 'whatsapp_settings', label: 'WhatsApp Routing', icon: MessageSquare },
      ],
    },
    {
      title: 'DIGITAL & ASSETS',
      items: [
        { id: 'qr_codes', label: 'QR Code Studio', icon: QrCode },
        { id: 'media_library', label: 'Media Library', icon: ImageIcon },
        { id: 'import_center', label: 'Import Center (Excel)', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'DESIGN & BRANDING',
      items: [
        { id: 'branding_design', label: 'Brand & Colors', icon: Palette },
        { id: 'typography_design', label: 'Typography', icon: Layers },
        { id: 'live_preview', label: 'Live Device Preview', icon: Globe },
      ],
    },
    {
      title: 'GOVERNANCE',
      items: [
        { id: 'analytics', label: 'Operations Analytics', icon: LayoutDashboard },
        { id: 'users_rbac', label: 'Users & Permissions', icon: Users },
        { id: 'audit_log', label: 'Audit Trail', icon: CheckCircle2 },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 start-0 z-50 w-64 bg-stone-950 text-stone-300 border-e border-stone-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header: Property Context */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-serif font-bold text-lg shrink-0">
              {currentHotel.logo_url ? (
                <img src={currentHotel.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                currentHotel.name_en.charAt(0)
              )}
            </div>
            <div className="overflow-hidden">
              <h2 className="text-xs font-bold text-white tracking-wide truncate">
                {currentHotel.name_en}
              </h2>
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                <span>ADMIN CONTROL</span>
                <span className="text-stone-500">•</span>
                <span className="text-stone-400">ID: {currentHotel.id}</span>
              </div>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-400 hover:text-white cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Quick Button: View Live Guest Portal */}
        <div className="p-3 border-b border-stone-800/80 bg-stone-950">
          <button
            onClick={onViewLivePortal}
            className="w-full py-2 px-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <ExternalLink size={13} />
            <span>Open Guest Portal</span>
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5 text-xs">
          {navGroups.map((grp) => (
            <div key={grp.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-stone-500 tracking-wider uppercase">
                {grp.title}
              </div>
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-start cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-300 font-semibold border-s-2 border-amber-400 ps-2.5'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon size={15} className={isActive ? 'text-amber-400' : 'text-stone-500'} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer: Tenant & Security Status */}
        <div className="p-3 border-t border-stone-800/80 bg-stone-900/60 text-[10px] text-stone-500 flex items-center justify-between">
          <span>Tenant Isolated</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            System Online
          </span>
        </div>
      </aside>
    </>
  );
};
