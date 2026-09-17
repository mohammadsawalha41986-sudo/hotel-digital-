import React, { useState } from 'react';
import {
  X,
  Compass,
  Search,
  QrCode,
} from 'lucide-react';
import { RouteDefinition, ROUTE_REGISTRY } from '../../routes/routeRegistry';
import { Hotel, Language } from '../../types/hotel';
import { RouteQRCodeModal } from '../RouteQRCodeModal';

interface RouteExplorerModalProps {
  onClose: () => void;
  language: Language;
  hotel?: Hotel;
}

export const RouteExplorerModal: React.FC<RouteExplorerModalProps> = ({ onClose, language, hotel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedAccess, setSelectedAccess] = useState<string>('all');
  const [qrRoute, setQrRoute] = useState<RouteDefinition | null>(null);

  const departments = [
    'all',
    'core',
    'rooms',
    'dining',
    'services',
    'whatsapp',
    'admin',
  ];

  const filteredRoutes = ROUTE_REGISTRY.filter((r) => {
    if (selectedDept !== 'all' && r.department !== selectedDept) return false;
    if (selectedAccess !== 'all' && r.accessLevel !== selectedAccess) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        r.path.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.targetTeam.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      id="route-explorer-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center p-3 sm:p-6"
    >
      <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-stone-200 relative my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {language === 'ar' ? 'سجل المسارات والروابط الموحدة' : 'Route Registry & URL Hierarchy Inspector'}
              </h2>
              <p className="text-xs text-stone-400">
                Verified Multi-Tenant URL Map • {filteredRoutes.length} of {ROUTE_REGISTRY.length} Routes Displayed
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search route path, name, or team..."
              className="w-full text-xs bg-white border border-stone-300 rounded-xl pl-9 pr-3.5 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-700 font-medium"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  Dept: {d.toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={selectedAccess}
              onChange={(e) => setSelectedAccess(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-700 font-medium"
            >
              <option value="all">Access: ALL</option>
              <option value="Guest">Guest Public</option>
              <option value="Authenticated In-Room">Authenticated In-Room</option>
              <option value="Staff/Department">Staff / Dispatch</option>
              <option value="System/Webhook">System / Webhook</option>
            </select>
          </div>
        </div>

        {/* Routes Table / List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filteredRoutes.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs">
              No routes match the current filter criteria.
            </div>
          ) : (
            filteredRoutes.map((route, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                      {route.path}
                    </span>

                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                      {route.department}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        route.accessLevel === 'Guest'
                          ? 'bg-emerald-50 text-emerald-800'
                          : route.accessLevel === 'Authenticated In-Room'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-purple-50 text-purple-800'
                      }`}
                    >
                      {route.accessLevel}
                    </span>

                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 rounded text-stone-600">
                      {route.httpMethod}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-stone-900">
                    {route.name} • <span className="text-stone-500 font-normal">{route.targetTeam}</span>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {route.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    onClick={() => setQrRoute(route)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                    title="Generate downloadable mobile deep-link QR code"
                  >
                    <QrCode size={14} className="text-amber-700" />
                    <span>Generate QR</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>All routes adhere to Multi-Hotel tenant separation with :hotelSlug parameters</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-stone-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

        {/* Route QR Code Generator Modal */}
        {qrRoute && (
          <RouteQRCodeModal
            initialRoute={qrRoute}
            hotel={
              hotel || {
                id: '11',
                slug: 'swiss-flora-royal',
                name_en: 'Swiss Flora Royal Hotel Riyadh',
                name_ar: 'فندق سويس فلورا رويال الرياض',
              } as Hotel
            }
            onClose={() => setQrRoute(null)}
          />
        )}
      </div>
    </div>
  );
};
