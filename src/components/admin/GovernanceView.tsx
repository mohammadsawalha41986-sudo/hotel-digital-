import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import { StaffRole } from './AdminHeader';
import { OperationalRequest } from '../../types/requests';

interface GovernanceViewProps {
  hotel: Hotel;
  requests: OperationalRequest[];
  currentRole: StaffRole;
  onChangeRole: (role: StaffRole) => void;
  onOpenHotelWizard: () => void;
}

export const GovernanceView: React.FC<GovernanceViewProps> = ({
  hotel,
  requests,
  currentRole,
  onChangeRole,
  onOpenHotelWizard,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'rbac' | 'audit'>('analytics');

  const ROLE_PERMISSIONS: {
    role: StaffRole;
    title: string;
    description: string;
    canEditContent: boolean;
    canManageRequests: boolean;
    canImportData: boolean;
    canPublish: boolean;
    canManageTenants: boolean;
  }[] = [
    {
      role: 'SUPER_ADMIN',
      title: 'Super Administrator',
      description: 'Full cross-hotel multi-tenant access, system config, and tenant onboarding.',
      canEditContent: true,
      canManageRequests: true,
      canImportData: true,
      canPublish: true,
      canManageTenants: true,
    },
    {
      role: 'HOTEL_ADMIN',
      title: 'Hotel General Manager',
      description: 'Complete operational management of this property and all staff departments.',
      canEditContent: true,
      canManageRequests: true,
      canImportData: true,
      canPublish: true,
      canManageTenants: false,
    },
    {
      role: 'FNB_MANAGER',
      title: 'F&B Director',
      description: 'Manages restaurants, room service menus, dining requests, and culinary pricing.',
      canEditContent: true,
      canManageRequests: true,
      canImportData: true,
      canPublish: false,
      canManageTenants: false,
    },
    {
      role: 'HOUSEKEEPING_SUPERVISOR',
      title: 'Executive Housekeeper',
      description: 'Manages room amenities, rapid housekeeping requests, and attendant dispatches.',
      canEditContent: false,
      canManageRequests: true,
      canImportData: false,
      canPublish: false,
      canManageTenants: false,
    },
    {
      role: 'LAUNDRY_MANAGER',
      title: 'Laundry & Valet Head',
      description: 'Manages valet collections, express turnarounds, and garment care queues.',
      canEditContent: false,
      canManageRequests: true,
      canImportData: false,
      canPublish: false,
      canManageTenants: false,
    },
    {
      role: 'SPA_DIRECTOR',
      title: 'Spa & Wellness Director',
      description: 'Manages treatment schedules, therapists, and Moroccan Hammam bookings.',
      canEditContent: true,
      canManageRequests: true,
      canImportData: false,
      canPublish: false,
      canManageTenants: false,
    },
    {
      role: 'VIEWER',
      title: 'Auditor / Read-Only Staff',
      description: 'Can inspect portal data and operations logs without modifying records.',
      canEditContent: false,
      canManageRequests: false,
      canImportData: false,
      canPublish: false,
      canManageTenants: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="text-amber-400" size={20} />
            <span>Governance, RBAC & Operations Analytics</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Role-based security enforcement, operational metrics, and audit trail for {hotel.name_en}.
          </p>
        </div>

        <button
          onClick={onOpenHotelWizard}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <PlusCircle size={14} />
          <span>Onboard New Hotel</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
          }`}
        >
          Operations Analytics
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'rbac'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
          }`}
        >
          Staff Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-amber-500 text-stone-950'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
          }`}
        >
          Audit Trail Log
        </button>
      </div>

      {/* VIEW 1: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[10px] text-stone-400 font-bold uppercase block">Total Operational Requests</span>
              <span className="text-2xl font-mono font-bold text-white mt-1 block">{requests.length}</span>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp size={12} />
                <span>+100% Ingestion Rate</span>
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[10px] text-stone-400 font-bold uppercase block">Peak Order Timing</span>
              <span className="text-2xl font-mono font-bold text-amber-400 mt-1 block">08:00 - 10:30 PM</span>
              <div className="text-[11px] text-stone-400 mt-1">In-Room Dining peak demand</div>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[10px] text-stone-400 font-bold uppercase block">Avg SLA Response Time</span>
              <span className="text-2xl font-mono font-bold text-teal-400 mt-1 block">14 Minutes</span>
              <div className="text-[11px] text-stone-400 mt-1">Valet & room service dispatch</div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: RBAC MATRIX */}
      {activeTab === 'rbac' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-800 bg-stone-850 flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider">
              Hotel Role-Based Access Control (RBAC) Matrix
            </span>
            <span className="text-stone-400">Current Role: <strong className="text-amber-400">{currentRole}</strong></span>
          </div>

          <div className="divide-y divide-stone-800/80 text-xs">
            {ROLE_PERMISSIONS.map((perm) => {
              const isSelected = currentRole === perm.role;
              return (
                <div
                  key={perm.role}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isSelected ? 'bg-amber-500/10' : 'hover:bg-stone-850/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{perm.title}</span>
                      <span className="text-[10px] font-mono bg-stone-800 px-2 py-0.5 rounded text-stone-400">
                        {perm.role}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded-full">
                          Active Session
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400">{perm.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="grid grid-cols-5 gap-2 text-[10px] text-center font-mono">
                      <div className={`px-2 py-1 rounded ${perm.canEditContent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-800 text-stone-500'}`}>
                        Content
                      </div>
                      <div className={`px-2 py-1 rounded ${perm.canManageRequests ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-800 text-stone-500'}`}>
                        Requests
                      </div>
                      <div className={`px-2 py-1 rounded ${perm.canImportData ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-800 text-stone-500'}`}>
                        Import
                      </div>
                      <div className={`px-2 py-1 rounded ${perm.canPublish ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-800 text-stone-500'}`}>
                        Publish
                      </div>
                      <div className={`px-2 py-1 rounded ${perm.canManageTenants ? 'bg-amber-500/20 text-amber-300' : 'bg-stone-800 text-stone-500'}`}>
                        Tenants
                      </div>
                    </div>

                    <button
                      onClick={() => onChangeRole(perm.role)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      {isSelected ? 'Simulating' : 'Switch To Role'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xs text-xs">
          <div className="p-4 border-b border-stone-800 bg-stone-850 font-bold text-white uppercase tracking-wider">
            Recent System Activity & Revisions
          </div>
          <div className="divide-y divide-stone-800/80 p-2">
            {[
              { action: 'Imported Swiss Flora Real Data XLSX', user: 'System (Swiss Flora Ingestion)', time: 'Just now' },
              { action: 'Updated WhatsApp Routing Matrix (8 lines verified)', user: 'Operations Supervisor', time: '10 mins ago' },
              { action: 'Published live portal updates for Room 402 desk QR', user: 'General Manager', time: '25 mins ago' },
              { action: 'Verified zero room booking engine constraint across guest hub', user: 'Architecture Auditor', time: '1 hour ago' },
            ].map((entry, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-stone-850/40">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="font-semibold text-stone-200">{entry.action}</span>
                </div>
                <div className="text-[11px] text-stone-500 flex items-center gap-2 font-mono">
                  <span>{entry.user}</span>
                  <span>•</span>
                  <span>{entry.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
