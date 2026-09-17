import React from 'react';
import {
  Menu,
  ExternalLink,
  Shield,
  Building2,
  UploadCloud,
  CheckCircle2,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import { AdminUser, StaffRole } from '../../types/auth';

export type { StaffRole };

interface AdminHeaderProps {
  hotels: Hotel[];
  currentHotel: Hotel;
  onSelectHotel: (hotel: Hotel) => void;
  currentRole: StaffRole;
  onChangeRole: (role: StaffRole) => void;
  currentUser?: AdminUser | null;
  onSignOut?: () => void;
  hasUnpublishedChanges: boolean;
  onPublishChanges: () => void;
  onViewLivePortal: () => void;
  onOpenMobileSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  hotels,
  currentHotel,
  onSelectHotel,
  currentRole,
  onChangeRole,
  currentUser,
  onSignOut,
  hasUnpublishedChanges,
  onPublishChanges,
  onViewLivePortal,
  onOpenMobileSidebar,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-200 border-b border-stone-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-xs">
      {/* Left side: Mobile menu toggle + Hotel selector (Admin context) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
          aria-label="Open Admin Menu"
        >
          <Menu size={18} />
        </button>

        {/* Hotel Selector (Allowed only in Admin Control Center for Multi-Property management) */}
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-amber-400 shrink-0" />
          <div className="relative">
            <select
              value={currentHotel.id}
              onChange={(e) => {
                const target = hotels.find((h) => h.id === e.target.value);
                if (target) onSelectHotel(target);
              }}
              className="text-xs bg-stone-800 hover:bg-stone-750 text-white font-semibold border border-stone-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer max-w-[200px] sm:max-w-[280px] truncate"
              title="Manage Hotel Property"
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name_en} ({h.city_en})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role Simulator Pill */}
        <div className="hidden md:flex items-center gap-1.5 bg-stone-800/90 text-stone-300 px-2.5 py-1 rounded-lg border border-stone-700 text-[11px]">
          <Shield size={12} className="text-amber-400" />
          <span className="text-stone-400">Role:</span>
          <select
            value={currentRole}
            onChange={(e) => onChangeRole(e.target.value as StaffRole)}
            className="bg-transparent text-amber-300 font-medium focus:outline-none cursor-pointer"
          >
            <option value="SUPER_ADMIN" className="bg-stone-900 text-white">Super Admin (All Access)</option>
            <option value="HOTEL_ADMIN" className="bg-stone-900 text-white">Hotel Admin (Property Manager)</option>
            <option value="FNB_MANAGER" className="bg-stone-900 text-white">F&B Manager</option>
            <option value="HOUSEKEEPING_SUPERVISOR" className="bg-stone-900 text-white">Housekeeping Supervisor</option>
            <option value="LAUNDRY_MANAGER" className="bg-stone-900 text-white">Laundry Manager</option>
            <option value="SPA_DIRECTOR" className="bg-stone-900 text-white">Spa Director</option>
            <option value="ENGINEERING_CHIEF" className="bg-stone-900 text-white">Chief Engineer</option>
            <option value="VIEWER" className="bg-stone-900 text-white">Viewer (Read Only)</option>
          </select>
        </div>
      </div>

      {/* Right side: Publish changes pill & Live preview */}
      <div className="flex items-center gap-3 text-xs">
        {/* Publish Changes Workflow */}
        {hasUnpublishedChanges ? (
          <button
            onClick={onPublishChanges}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer animate-pulse"
            title="Publish drafted updates to live guest portal"
          >
            <UploadCloud size={14} />
            <span>Publish Updates</span>
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 text-stone-400 bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-800 text-[11px]">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>All Changes Live</span>
          </div>
        )}

        {/* View Live Portal */}
        <button
          onClick={onViewLivePortal}
          className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-white px-3 py-1.5 rounded-lg border border-stone-700 transition-colors cursor-pointer font-semibold"
          title="Open Guest Portal for this hotel"
        >
          <ExternalLink size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">View Live Portal</span>
          <span className="sm:hidden">Live</span>
        </button>

        {/* Authenticated Staff User Pill & Sign Out */}
        {currentUser && (
          <div className="flex items-center gap-2 ps-2 border-s border-stone-800">
            <div className="hidden lg:flex items-center gap-1.5 text-stone-300 text-[11px]">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                <UserCheck size={12} />
              </div>
              <div className="text-start leading-tight">
                <p className="font-semibold text-white max-w-[120px] truncate">{currentUser.displayName || currentUser.email}</p>
                <p className="text-[9px] text-amber-400 font-mono">{currentUser.role}</p>
              </div>
            </div>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-rose-950/40 text-stone-400 hover:text-rose-400 border border-stone-700 hover:border-rose-900/50 transition-colors cursor-pointer"
                title="Sign out of staff portal"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline text-[11px] font-medium">Sign Out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
