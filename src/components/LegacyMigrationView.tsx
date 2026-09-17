import React from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';

export const LegacyMigrationView: React.FC = () => {
  const migrations = [
    {
      domain: 'Rooms',
      legacyUrl: '/room-amenities OR /guest/request-items',
      newUrl: '/hotels/:hotelSlug/rooms/amenities',
      benefit: 'Isolated under Housekeeping department domain with room session scoping.',
      status: 'Migrated',
    },
    {
      domain: 'Rooms',
      legacyUrl: '/housekeeping OR /turn-down',
      newUrl: '/hotels/:hotelSlug/rooms/housekeeping',
      benefit: 'Standardizes cleaning, DND, and eco-towel requests into unified team queue.',
      status: 'Migrated',
    },
    {
      domain: 'Rooms',
      legacyUrl: '/report-issue OR /maintenance',
      newUrl: '/hotels/:hotelSlug/rooms/maintenance',
      benefit: 'Direct ticket routing to Engineering with immediate 10-min SLA response.',
      status: 'Migrated',
    },
    {
      domain: 'Rooms',
      legacyUrl: '/express-checkout OR /checkout',
      newUrl: '/hotels/:hotelSlug/rooms/checkout',
      benefit: 'Scoped under room session with automated folio settlement.',
      status: 'Migrated',
    },
    {
      domain: 'Dining',
      legacyUrl: '/menu OR /room-service',
      newUrl: '/hotels/:hotelSlug/dining/room-service',
      benefit: 'Clear F&B department ownership, allergen filtering, and live kitchen dispatch.',
      status: 'Migrated',
    },
    {
      domain: 'Dining',
      legacyUrl: '/track-order/:id',
      newUrl: '/hotels/:hotelSlug/dining/room-service/orders/:orderId',
      benefit: 'Nested under Dining/Room Service hierarchy with live kitchen stage sync.',
      status: 'Migrated',
    },
    {
      domain: 'Dining',
      legacyUrl: '/restaurants OR /dining-venues',
      newUrl: '/hotels/:hotelSlug/dining/venues',
      benefit: 'Enables unified reservation links and restaurant profile sub-paths.',
      status: 'Migrated',
    },
    {
      domain: 'Services',
      legacyUrl: '/concierge-chat OR /guest-concierge',
      newUrl: '/hotels/:hotelSlug/services/concierge',
      benefit: 'Consolidates local attractions and WhatsApp deep-linking under Services.',
      status: 'Migrated',
    },
    {
      domain: 'Services',
      legacyUrl: '/spa OR /wellness-treatments',
      newUrl: '/hotels/:hotelSlug/services/spa',
      benefit: 'Hierarchical sub-booking (`/spa/book`) with therapist scheduling.',
      status: 'Migrated',
    },
    {
      domain: 'Services',
      legacyUrl: '/valet OR /shuttle-booking',
      newUrl: '/hotels/:hotelSlug/services/transport',
      benefit: 'Consolidates parking, airport cars, and transfers under Transportation team.',
      status: 'Migrated',
    },
  ];

  return (
    <div id="legacy-migration-container" className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs mb-8">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-200">
        <div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            Legacy Route Audit & Department Migration Alignment
          </h2>
          <p className="text-xs text-stone-500">
            Inspection report contrasting previously unorganized endpoints against the new department hierarchy.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          <RefreshCw size={13} />
          100% Taxonomical Alignment
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold">
              <th className="py-2.5 px-3">Department Domain</th>
              <th className="py-2.5 px-3">Inspected / Legacy URL Pattern</th>
              <th className="py-2.5 px-3">New Department-Based URL</th>
              <th className="py-2.5 px-3">Operational & Dispatch Benefit</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {migrations.map((m, idx) => (
              <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                <td className="py-3 px-3 font-semibold text-stone-900">{m.domain}</td>
                <td className="py-3 px-3 font-mono text-rose-700 bg-rose-50/50 line-through">
                  {m.legacyUrl}
                </td>
                <td className="py-3 px-3 font-mono text-emerald-800 font-semibold bg-emerald-50/50">
                  {m.newUrl}
                </td>
                <td className="py-3 px-3 text-stone-600 max-w-xs">{m.benefit}</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                    <CheckCircle size={12} />
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
