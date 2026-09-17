import React from 'react';
import {
  ShoppingBag,
  DoorClosed,
  QrCode,
  Layers,
  Clock,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import { OperationalRequest } from '../../types/requests';
import { AdminSectionTab } from './AdminSidebar';

interface DashboardViewProps {
  hotel: Hotel;
  requests: OperationalRequest[];
  onNavigateTab: (tab: AdminSectionTab) => void;
  onSelectRequest?: (req: OperationalRequest) => void;
  onViewLivePortal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  hotel,
  requests,
  onNavigateTab,
  onSelectRequest,
  onViewLivePortal,
}) => {
  const pendingCount = requests.filter(
    (r) => r.status === 'NEW' || r.status === 'RECEIVED' || r.status === 'PREPARING' || r.status === 'IN_PROGRESS'
  ).length;

  const totalEstimatedRevenue = requests.reduce((acc, r) => acc + (r.estimated_total || 0), 0);

  const roomRequests = requests.filter((r) => r.room_number);
  const activeRoomsCount = new Set(roomRequests.map((r) => r.room_number)).size;

  const recentRequests = requests.slice(0, 5);

  const statusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'RECEIVED':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'PREPARING':
      case 'IN_PROGRESS':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'READY':
      case 'ON_THE_WAY':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/40';
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'CANCELLED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-stone-800 text-stone-300 border-stone-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <span>Hotel Operations Control</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono">Live Sync</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-white">
              {hotel.name_en}
            </h1>
            <p className="text-xs text-stone-400">
              {hotel.classification_label_en} • {hotel.city_en}, {hotel.country_en}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('qr_codes')}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold flex items-center gap-2 border border-stone-700 transition-colors cursor-pointer"
            >
              <QrCode size={14} className="text-amber-400" />
              <span>Generate Room QR</span>
            </button>
            <button
              onClick={onViewLivePortal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Live Guest View
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Orders / Requests</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShoppingBag size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{pendingCount}</div>
            <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
              <Clock size={11} />
              <span>Requires operational dispatch</span>
            </div>
          </div>
        </div>

        {/* Room Sessions */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active In-Room Sessions</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DoorClosed size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{activeRoomsCount} Rooms</div>
            <div className="text-[11px] text-stone-400 mt-1">
              E.g. Room 402 QR context locked
            </div>
          </div>
        </div>

        {/* Total Estimated F&B / Services Volume */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Orders Volume</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              SAR {totalEstimatedRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              Zero payment gateway • Direct to room folio
            </div>
          </div>
        </div>

        {/* Outlets & Departments Status */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">WhatsApp Routing Lines</span>
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <MessageSquare size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-teal-400 font-mono">8 Active Lines</div>
            <div className="text-[11px] text-teal-300/80 flex items-center gap-1 mt-1">
              <CheckCircle size={11} />
              <span>Bilingual format enforced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Row: Recent Requests Queue + Quick Operational Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Activity Queue */}
        <div className="lg:col-span-2 bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Orders & Requests Queue
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('operations_requests')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({requests.length})</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="divide-y divide-stone-800">
            {recentRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-500">
                No active operational requests in queue.
              </div>
            ) : (
              recentRequests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => onSelectRequest && onSelectRequest(req)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-stone-850/50 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">{req.id}</span>
                      <span className="text-xs font-semibold text-white">
                        {req.outlet_or_service_name_en}
                      </span>
                      {req.room_number ? (
                        <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full font-mono">
                          Room {req.room_number}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
                          External
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 line-clamp-1">
                      {req.guest_name || 'Resident'} •{' '}
                      {req.items && req.items.length > 0
                        ? req.items.map((i) => `${i.quantity}x ${i.name_en}`).join(', ')
                        : req.services && req.services.length > 0
                        ? req.services.map((s) => s.name_en).join(', ')
                        : req.notes || 'Service dispatch'}
                    </p>
                  </div>

                  <div className="text-end shrink-0 space-y-1">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>
                    {req.estimated_total > 0 && (
                      <div className="text-xs font-mono text-stone-300">
                        SAR {req.estimated_total}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Quick Operational Shortcuts */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-amber-400" />
              <span>Admin Shortcuts</span>
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('website_manager')}
                className="w-full text-start p-3 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-xs transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-stone-200">Website Manager</div>
                  <div className="text-[11px] text-stone-400">Reorder & toggle homepage sections</div>
                </div>
                <ArrowRight size={13} className="text-stone-500" />
              </button>

              <button
                onClick={() => onNavigateTab('fnb_content')}
                className="w-full text-start p-3 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-xs transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-stone-200">Food & Beverage Catalog</div>
                  <div className="text-[11px] text-stone-400">Restaurants, Cafés & Room Service menu</div>
                </div>
                <ArrowRight size={13} className="text-stone-500" />
              </button>

              <button
                onClick={() => onNavigateTab('qr_codes')}
                className="w-full text-start p-3 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-xs transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-stone-200">Room QR Generator</div>
                  <div className="text-[11px] text-stone-400">Generate printable desk tent QR codes</div>
                </div>
                <ArrowRight size={13} className="text-stone-500" />
              </button>

              <button
                onClick={() => onNavigateTab('import_center')}
                className="w-full text-start p-3 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-xs transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-stone-200">Excel Import Center</div>
                  <div className="text-[11px] text-stone-400">Upload XLSX/CSV with mapping & validation</div>
                </div>
                <ArrowRight size={13} className="text-stone-500" />
              </button>

              <button
                onClick={() => onNavigateTab('branding_design')}
                className="w-full text-start p-3 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-xs transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-stone-200">Branding & Typography</div>
                  <div className="text-[11px] text-stone-400">Draft, preview, and publish hotel theme</div>
                </div>
                <ArrowRight size={13} className="text-stone-500" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-800 text-[11px] text-stone-500 flex items-center gap-1.5">
            <AlertCircle size={12} className="text-amber-500" />
            <span>Multi-Hotel Tenant Isolation strictly enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
