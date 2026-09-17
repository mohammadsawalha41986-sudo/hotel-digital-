import React, { useState } from 'react';
import {
  MessageSquare,
  Phone,
  CheckCircle2,
  Edit2,
  Save,
  ExternalLink,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import { buildEncodedWhatsAppUrl } from '../../utils/whatsappMessageBuilder';

interface WhatsAppLineConfig {
  id: string;
  department_code: string;
  name_en: string;
  name_ar: string;
  phone_display: string;
  whatsapp_number: string;
  is_enabled: boolean;
  audience: 'ALL' | 'IN_HOUSE_ONLY' | 'EXTERNAL_ACCEPTED';
  operating_hours_en: string;
  operating_hours_ar: string;
}

const DEFAULT_HOTEL_LINES: WhatsAppLineConfig[] = [
  {
    id: 'fnb-room-service',
    department_code: 'room_service',
    name_en: '24/7 In-Room Dining Kitchen',
    name_ar: 'مطبخ خدمة الغرف على مدار الساعة',
    phone_display: '+966 11 200 0002',
    whatsapp_number: '+966112000002',
    is_enabled: true,
    audience: 'IN_HOUSE_ONLY',
    operating_hours_en: '24 Hours / 7 Days',
    operating_hours_ar: '24 ساعة / 7 أيام',
  },
  {
    id: 'fnb-restaurant',
    department_code: 'restaurant',
    name_en: 'Flora Royal Fine Dining Restaurant',
    name_ar: 'مطعم فلورا رويال الراقي',
    phone_display: '+966 11 200 0001',
    whatsapp_number: '+966112000001',
    is_enabled: true,
    audience: 'ALL',
    operating_hours_en: '06:30 AM - 11:30 PM',
    operating_hours_ar: '06:30 ص - 11:30 م',
  },
  {
    id: 'fnb-cafe',
    department_code: 'cafe',
    name_en: 'The Palm Court Tea Lounge',
    name_ar: 'لاونج النخيل للشاي والقهوة المختصة',
    phone_display: '+966 11 200 0003',
    whatsapp_number: '+966112000003',
    is_enabled: true,
    audience: 'ALL',
    operating_hours_en: '07:00 AM - 01:00 AM',
    operating_hours_ar: '07:00 ص - 01:00 ص',
  },
  {
    id: 'wellness-spa',
    department_code: 'spa',
    name_en: 'Serenity Spa & Moroccan Hammam',
    name_ar: 'سبا السكينة والحمام المغربي الملكي',
    phone_display: '+966 11 200 0005',
    whatsapp_number: '+966112000005',
    is_enabled: true,
    audience: 'ALL',
    operating_hours_en: '09:00 AM - 10:00 PM',
    operating_hours_ar: '09:00 ص - 10:00 م',
  },
  {
    id: 'laundry-valet',
    department_code: 'laundry',
    name_en: 'Valet Laundry & Garment Care',
    name_ar: 'المغسلة الفاخرة والعناية بالملابس',
    phone_display: '+966 11 200 0006',
    whatsapp_number: '+966112000006',
    is_enabled: true,
    audience: 'IN_HOUSE_ONLY',
    operating_hours_en: '07:00 AM - 09:00 PM (Express 24/7)',
    operating_hours_ar: '07:00 ص - 09:00 م (السريعة 24/7)',
  },
  {
    id: 'guest-concierge',
    department_code: 'guest_services',
    name_en: 'Chief Concierge & Rapid Dispatch',
    name_ar: 'الكونسيرج الرئيسي والخدمات الفورية',
    phone_display: '+966 11 200 0007',
    whatsapp_number: '+966112000007',
    is_enabled: true,
    audience: 'ALL',
    operating_hours_en: '24 Hours / 7 Days',
    operating_hours_ar: '24 ساعة / 7 أيام',
  },
  {
    id: 'hotel-frontdesk',
    department_code: 'front_office',
    name_en: 'Front Desk & Resident Services',
    name_ar: 'الاستقبال وخدمات النزلاء',
    phone_display: '+966 11 200 0000',
    whatsapp_number: '+966112000000',
    is_enabled: true,
    audience: 'ALL',
    operating_hours_en: '24 Hours / 7 Days',
    operating_hours_ar: '24 ساعة / 7 أيام',
  },
];

interface WhatsAppRoutingViewProps {
  hotel: Hotel;
  onMarkUnpublishedChanges: () => void;
}

export const WhatsAppRoutingView: React.FC<WhatsAppRoutingViewProps> = ({
  hotel: _hotel,
  onMarkUnpublishedChanges,
}) => {
  const [lines, setLines] = useState<WhatsAppLineConfig[]>(DEFAULT_HOTEL_LINES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUpdateLineNumber = (id: string, newNumber: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, whatsapp_number: newNumber } : l))
    );
    onMarkUnpublishedChanges();
  };

  const handleToggleEnabled = (id: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_enabled: !l.is_enabled } : l))
    );
    onMarkUnpublishedChanges();
  };

  const handleAudienceChange = (id: string, audience: 'ALL' | 'IN_HOUSE_ONLY' | 'EXTERNAL_ACCEPTED') => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, audience } : l))
    );
    onMarkUnpublishedChanges();
  };

  const handleTestLine = (line: WhatsAppLineConfig) => {
    const testMsg = `TEST CONNECTION: Swiss Flora Operations Center verifying communication on ${line.name_en}. Operational reference generator online.`;
    const url = buildEncodedWhatsAppUrl(line.whatsapp_number, testMsg);
    window.open(url, '_blank');
  };

  const handleSaveAll = () => {
    setEditingId(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onMarkUnpublishedChanges();
  };

  return (
    <div className="space-y-6">
      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>WhatsApp operational lines routing updated successfully</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-amber-400" size={20} />
            <span>Hotel WhatsApp Operational Routing Matrix</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure direct staff WhatsApp lines per department, customer audience restrictions, and active operational hours.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Save size={13} />
          <span>Save Routing Matrix</span>
        </button>
      </div>

      {/* Routing Table */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="divide-y divide-stone-800/80">
          {lines.map((line) => {
            const isEditing = editingId === line.id;
            return (
              <div
                key={line.id}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  line.is_enabled ? 'hover:bg-stone-850/40' : 'bg-stone-950/40 opacity-60'
                }`}
              >
                {/* Department Details */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{line.name_en}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        line.is_enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-stone-800 text-stone-400 border border-stone-700'
                      }`}
                    >
                      {line.is_enabled ? 'Online' : 'Disabled'}
                    </span>
                    <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded font-mono">
                      {line.department_code}
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-400" dir="rtl">
                    {line.name_ar}
                  </div>

                  <div className="text-[11px] text-stone-500 flex items-center gap-3 mt-1">
                    <span>Hours: {line.operating_hours_en}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-mono">
                      Audience: {line.audience.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Phone & Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Phone Input or Display */}
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={line.whatsapp_number}
                        onChange={(e) => handleUpdateLineNumber(line.id, e.target.value)}
                        className="bg-stone-800 border border-amber-500 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none"
                      />
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white text-xs"
                      >
                        <CheckCircle2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingId(line.id)}
                      className="bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-200 flex items-center gap-2 cursor-pointer"
                      title="Click to edit WhatsApp number"
                    >
                      <Phone size={12} className="text-amber-400" />
                      <span>{line.whatsapp_number}</span>
                      <Edit2 size={11} className="text-stone-500" />
                    </div>
                  )}

                  {/* Audience Selector */}
                  <select
                    value={line.audience}
                    onChange={(e) => handleAudienceChange(line.id, e.target.value as any)}
                    className="bg-stone-800 border border-stone-700 text-stone-300 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Guests</option>
                    <option value="IN_HOUSE_ONLY">In-House Only</option>
                    <option value="EXTERNAL_ACCEPTED">External Accepted</option>
                  </select>

                  {/* Enable / Disable Toggle */}
                  <button
                    onClick={() => handleToggleEnabled(line.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      line.is_enabled
                        ? 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {line.is_enabled ? 'Disable' : 'Enable'}
                  </button>

                  {/* Test Dispatch Button */}
                  <button
                    onClick={() => handleTestLine(line)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                    title="Send test WhatsApp handshake"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
