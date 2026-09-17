import React from 'react';
import { BedDouble, UtensilsCrossed, Sparkles, MessageCircle, Shield, FileCode, CheckCircle2 } from 'lucide-react';

interface HierarchyTreeViewProps {
  hotelSlug: string;
}

export const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({ hotelSlug }) => {
  return (
    <div id="hierarchy-tree-view-container" className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs mb-8">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-200">
        <div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            Departmental Route Hierarchy Tree
          </h2>
          <p className="text-xs text-stone-500">
            Structured three-tier taxonomy guaranteeing unambiguous ownership by hotel operating divisions.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} />
          Compliant with Department Spec
        </span>
      </div>

      <div className="font-mono text-xs space-y-4 leading-relaxed bg-stone-900 text-stone-200 p-5 rounded-xl overflow-x-auto shadow-inner">
        {/* Root */}
        <div>
          <span className="text-amber-400 font-bold">/</span> <span className="text-stone-400 font-sans">(Guest Welcome & Multi-Property Directory)</span>
        </div>

        {/* Canonical QR */}
        <div className="pl-4 border-l-2 border-stone-700 ml-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">├── /h/:hotelSlug/r/:roomNumber</span>
            <span className="text-[11px] font-sans px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Zero-Friction In-Room QR Code Entry
            </span>
          </div>
        </div>

        {/* Hotel Scope */}
        <div className="pl-4 border-l-2 border-stone-700 ml-2 space-y-3">
          <div>
            <span className="text-amber-300 font-bold">├── /hotels/:hotelSlug/</span>
            <span className="text-stone-400 font-sans"> [Property Scope: {hotelSlug}]</span>
          </div>

          {/* ROOMS HIERARCHY */}
          <div className="pl-6 border-l-2 border-indigo-700 ml-2 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <BedDouble size={14} className="text-indigo-400" />
              <span>├── /rooms</span>
              <span className="text-[11px] font-sans px-1.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-800">
                Department: Housekeeping & Engineering
              </span>
            </div>
            <div className="pl-6 space-y-1 text-stone-300">
              <div className="flex items-center gap-2">
                <span>├── /amenities</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Down pillows, robes, dental sets</span>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /housekeeping</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Turn-down, schedule cleaning, DND</span>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /maintenance</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Urgent AC, plumbing, AV repair</span>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /minibar</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Consumption logging & restock</span>
              </div>
              <div className="flex items-center gap-2">
                <span>└── /checkout</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Express room folio & late departure</span>
              </div>
            </div>
          </div>

          {/* DINING HIERARCHY */}
          <div className="pl-6 border-l-2 border-amber-700 ml-2 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <UtensilsCrossed size={14} className="text-amber-400" />
              <span>├── /dining</span>
              <span className="text-[11px] font-sans px-1.5 rounded bg-amber-950 text-amber-200 border border-amber-800">
                Department: Food & Beverage
              </span>
            </div>
            <div className="pl-6 space-y-1 text-stone-300">
              <div className="flex items-center gap-2">
                <span className="text-amber-200">├── /room-service</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Full in-room menu & culinary modifiers</span>
              </div>
              <div className="pl-6 space-y-1 text-stone-400 border-l border-amber-800 ml-1">
                <div>├── /checkout <span className="text-stone-500 font-sans text-[11px]">→ In-room dining cart payment</span></div>
                <div>└── /orders/:orderId <span className="text-stone-500 font-sans text-[11px]">→ Live kitchen preparation tracker</span></div>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /tray-pickup</span>
                <span className="text-stone-500 font-sans text-[11px]">→ 1-tap used plate & cart removal</span>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /venues</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Hotel restaurants, bars, rooftop directory</span>
              </div>
              <div className="pl-6 text-stone-400 border-l border-amber-800 ml-1">
                <div>└── /:venueSlug <span className="text-stone-500 font-sans text-[11px]">→ Tasting menus, dress code & wine lists</span></div>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /reservations/new</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Table reservations with zone selection</span>
              </div>
              <div className="flex items-center gap-2">
                <span>└── /breakfast-order</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Next-day door-knob breakfast pre-order</span>
              </div>
            </div>
          </div>

          {/* SERVICES HIERARCHY */}
          <div className="pl-6 border-l-2 border-emerald-700 ml-2 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Sparkles size={14} className="text-emerald-400" />
              <span>├── /services</span>
              <span className="text-[11px] font-sans px-1.5 rounded bg-emerald-950 text-emerald-200 border border-emerald-800">
                Department: Concierge, Spa & Transport
              </span>
            </div>
            <div className="pl-6 space-y-1 text-stone-300">
              <div className="flex items-center gap-2">
                <span>├── /concierge</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Les Clefs d'Or local bookings & VIP tickets</span>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /spa</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Treatment catalog & hydrotherapy rituals</span>
              </div>
              <div className="pl-6 text-stone-400 border-l border-emerald-800 ml-1">
                <div>└── /book <span className="text-stone-500 font-sans text-[11px]">→ Therapist & appointment scheduling</span></div>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /laundry</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Valet dry cleaning & express pressing</span>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /transport</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Airport transfers & valet car retrieval</span>
              </div>
              <div className="flex items-center gap-2">
                <span>├── /luggage</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Bellman porter assistance & storage tags</span>
              </div>
              <div className="flex items-center gap-2">
                <span>└── /wake-up</span>
                <span className="text-stone-500 font-sans text-[11px]">→ Automated morning wake-up call</span>
              </div>
            </div>
          </div>

          {/* WHATSAPP DISPATCH */}
          <div className="pl-6 border-l-2 border-green-700 ml-2 space-y-1">
            <div className="flex items-center gap-2 text-green-300 font-bold">
              <MessageCircle size={14} className="text-green-400" />
              <span>└── /whatsapp/route</span>
              <span className="text-stone-500 font-sans text-[11px]">→ Dynamic metadata-driven WhatsApp deep link</span>
            </div>
          </div>
        </div>

        {/* STAFF & DISPATCH */}
        <div className="pl-4 border-l-2 border-purple-700 ml-2 space-y-1">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <Shield size={14} className="text-purple-400" />
            <span>├── /staff</span>
            <span className="text-[11px] font-sans px-1.5 rounded bg-purple-950 text-purple-200 border border-purple-800">
              Internal Departmental Queues
            </span>
          </div>
          <div className="pl-6 space-y-1 text-stone-300">
            <div>├── /rooms/dispatch <span className="text-stone-500 font-sans text-[11px]">→ Housekeeping & Maintenance SLA board</span></div>
            <div>├── /dining/kds <span className="text-stone-500 font-sans text-[11px]">→ Kitchen Display System order queue</span></div>
            <div>└── /services/desk <span className="text-stone-500 font-sans text-[11px]">→ Concierge, Spa & Chauffeur unified desk</span></div>
          </div>
        </div>

        {/* API ENDPOINTS */}
        <div className="pl-4 border-l-2 border-stone-700 ml-2 space-y-1">
          <div className="flex items-center gap-2 text-stone-300 font-bold">
            <FileCode size={14} className="text-stone-400" />
            <span>└── /api/v1/whatsapp</span>
          </div>
          <div className="pl-6 space-y-1 text-stone-400">
            <div>├── /webhook <span className="text-stone-500 font-sans text-[11px]">[POST] Meta WhatsApp inbound listener</span></div>
            <div>└── /notify <span className="text-stone-500 font-sans text-[11px]">[POST] Outbound status broadcast to guest</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
