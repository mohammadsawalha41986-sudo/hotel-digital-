import React from 'react';
import { Sliders, Building2, DoorClosed, ReceiptText } from 'lucide-react';

interface ParamSimulatorProps {
  hotelSlug: string;
  setHotelSlug: (val: string) => void;
  roomNumber: string;
  setRoomNumber: (val: string) => void;
  orderId: string;
  setOrderId: (val: string) => void;
}

const SAMPLE_HOTELS = [
  { slug: 'grand-palace-resort', name: 'Grand Palace Resort & Spa' },
  { slug: 'azure-coastal-villas', name: 'Azure Coastal Villas' },
  { slug: 'the-skyline-metropolis', name: 'The Skyline Metropolis Hotel' },
];

export const ParamSimulator: React.FC<ParamSimulatorProps> = ({
  hotelSlug,
  setHotelSlug,
  roomNumber,
  setRoomNumber,
  orderId,
  setOrderId,
}) => {
  return (
    <div id="param-simulator-container" className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-stone-100 rounded-md text-stone-700">
            <Sliders size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-800">Interactive URL Parameter Simulator</h3>
            <p className="text-xs text-stone-500">
              Modifying these values dynamically resolves all department URL paths and QR deep-links below.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Live Path Resolution Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Hotel Property Selector */}
        <div>
          <label htmlFor="sim-hotel-select" className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1.5">
            <Building2 size={14} className="text-stone-400" />
            Active Hotel Property (:hotelSlug)
          </label>
          <select
            id="sim-hotel-select"
            value={hotelSlug}
            onChange={(e) => setHotelSlug(e.target.value)}
            aria-label="Select Hotel Property"
            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono transition-all"
          >
            {SAMPLE_HOTELS.map((h) => (
              <option key={h.slug} value={h.slug}>
                {h.name} ({h.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Room Number */}
        <div>
          <label htmlFor="sim-room-input" className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1.5">
            <DoorClosed size={14} className="text-stone-400" />
            Simulated Room / Suite (:roomNumber)
          </label>
          <input
            id="sim-room-input"
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="e.g. 402 or Penthouse-A"
            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono transition-all"
          />
        </div>

        {/* Order Identifier */}
        <div>
          <label htmlFor="sim-order-input" className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1.5">
            <ReceiptText size={14} className="text-stone-400" />
            Sample Order / Ticket (:orderId)
          </label>
          <input
            id="sim-order-input"
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. ORD-2026-8942"
            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono transition-all"
          />
        </div>
      </div>
    </div>
  );
};
