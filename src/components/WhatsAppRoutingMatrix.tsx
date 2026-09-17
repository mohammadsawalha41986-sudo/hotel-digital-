import React, { useState } from 'react';
import { MessageCircle, Smartphone, ShieldCheck } from 'lucide-react';

interface WhatsAppRoutingMatrixProps {
  hotelSlug: string;
  roomNumber: string;
  orderId: string;
}

export const WhatsAppRoutingMatrix: React.FC<WhatsAppRoutingMatrixProps> = ({
  hotelSlug,
  roomNumber,
  orderId,
}) => {
  const [selectedDept, setSelectedDept] = useState<'rooms' | 'dining' | 'services'>('dining');
  const [intent, setIntent] = useState<string>('order_status');

  const intentOptions = {
    rooms: [
      { id: 'amenity_request', label: 'Urgent Extra Towels & Pillows', team: 'Housekeeping Desk', sla: '15m' },
      { id: 'maintenance_urgent', label: 'Report AC Temperature Issue', team: 'Duty Engineer', sla: '10m' },
      { id: 'turndown_service', label: 'Request Evening Turndown', team: 'Housekeeping Floor 4', sla: '30m' },
    ],
    dining: [
      { id: 'order_status', label: `Track Order ${orderId}`, team: 'Kitchen Expeditor & Butler', sla: 'Instant' },
      { id: 'dietary_chef', label: 'Severe Nut Allergy Notification', team: 'Executive Sous Chef', sla: '5m' },
      { id: 'tray_clearance', label: 'Request Used Tray Pickup', team: 'Stewarding Team', sla: '15m' },
    ],
    services: [
      { id: 'valet_car', label: 'Valet: Retrieve Porsche/BMW', team: 'Portico Valet Team', sla: '10m' },
      { id: 'spa_appointment', label: 'Book Aromatherapy Massage', team: 'Spa Hostess', sla: '15m' },
      { id: 'airport_shuttle', label: 'Schedule Mercedes Chauffeur', team: 'Concierge Transportation', sla: '20m' },
    ],
  };

  const getDepartmentPhone = (dept: string) => {
    switch (dept) {
      case 'rooms':
        return '+1 (800) 555-ROOMS';
      case 'dining':
        return '+1 (800) 555-DINE';
      case 'services':
        return '+1 (800) 555-SRVC';
      default:
        return '+1 (800) 555-HOTEL';
    }
  };

  const currentOption = intentOptions[selectedDept].find((o) => o.id === intent) || intentOptions[selectedDept][0];

  const generatedWhatsAppUrl = `/hotels/${hotelSlug}/whatsapp/route?department=${selectedDept}&intent=${intent}&room=${roomNumber}&ref=${orderId}`;

  const samplePrefilledText = `Hello ${selectedDept.toUpperCase()} Team, this is Room ${roomNumber} at ${hotelSlug}. Inquiry: ${currentOption.label}. Ref: ${orderId}`;

  return (
    <div id="whatsapp-matrix-container" className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-xs">
            <MessageCircle size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 tracking-tight">
              Departmental WhatsApp Routing Architecture
            </h2>
            <p className="text-xs text-stone-500">
              Zero-friction guest to department routing with automatic context injection and webhook dispatch.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 self-start sm:self-auto">
          Meta WhatsApp Cloud API v19
        </span>
      </div>

      {/* Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Input Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              1. Select Destination Department:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['rooms', 'dining', 'services'] as const).map((dept) => (
                <button
                  key={dept}
                  onClick={() => {
                    setSelectedDept(dept);
                    setIntent(intentOptions[dept][0].id);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                    selectedDept === dept
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              2. Simulated Guest Intent / Task:
            </label>
            <div className="space-y-1.5">
              {intentOptions[selectedDept].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setIntent(opt.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs border text-left transition-all cursor-pointer ${
                    intent === opt.id
                      ? 'bg-green-50/70 border-green-300 text-green-950 font-medium'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">
                    SLA: {opt.sla}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1">
            <div className="flex justify-between text-stone-600">
              <span>Target Physical Department:</span>
              <span className="font-semibold text-stone-900">{currentOption.team}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Direct Hotline Identifier:</span>
              <span className="font-mono text-stone-900">{getDepartmentPhone(selectedDept)}</span>
            </div>
          </div>
        </div>

        {/* Right: Message Flow Preview */}
        <div className="bg-stone-900 text-stone-100 p-5 rounded-xl flex flex-col justify-between shadow-inner">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-xs text-stone-400">
              <span className="flex items-center gap-1.5">
                <Smartphone size={14} className="text-green-400" />
                WhatsApp Message Payload Preview
              </span>
              <span className="font-mono text-[11px] text-green-400">Channel: Department Bot</span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[11px] text-stone-400 block mb-1">Generated Dynamic Route:</span>
                <code className="block bg-stone-800 text-amber-300 p-2 rounded text-xs font-mono break-all border border-stone-700">
                  {generatedWhatsAppUrl}
                </code>
              </div>

              <div>
                <span className="text-[11px] text-stone-400 block mb-1">Automated WhatsApp Chat Greeting:</span>
                <div className="bg-stone-800 p-3 rounded-lg border border-stone-700 text-xs text-stone-200 leading-relaxed font-sans">
                  "{samplePrefilledText}"
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck size={14} /> End-to-End Encrypted Handshake
            </span>
            <span>Routes to /api/v1/whatsapp/webhook</span>
          </div>
        </div>
      </div>
    </div>
  );
};
