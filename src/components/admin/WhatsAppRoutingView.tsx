import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Edit2,
  Save,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Users,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import { getDepartmentRouting, saveDepartmentRouting } from '../../services/hotelService';
import { buildEncodedWhatsAppUrl } from '../../utils/whatsappMessageBuilder';

export interface WhatsAppLineConfig {
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

const buildDefaultLines = (hotel: Hotel): WhatsAppLineConfig[] => {
  const baseNumber = hotel.whatsapp_number || hotel.phone || '+966110000000';
  return [
    {
      id: 'hotel-frontdesk',
      department_code: 'front_office',
      name_en: 'Front Desk & Guest Reception',
      name_ar: 'الاستقبال وخدمات النزلاء',
      phone_display: baseNumber,
      whatsapp_number: baseNumber,
      is_enabled: true,
      audience: 'ALL',
      operating_hours_en: '24 Hours / 7 Days',
      operating_hours_ar: '24 ساعة / 7 أيام',
    },
    {
      id: 'fnb-room-service',
      department_code: 'room_service',
      name_en: 'In-Room Dining Kitchen',
      name_ar: 'خدمة الغرف والطلبات',
      phone_display: baseNumber,
      whatsapp_number: baseNumber,
      is_enabled: true,
      audience: 'IN_HOUSE_ONLY',
      operating_hours_en: '24 Hours / 7 Days',
      operating_hours_ar: '24 ساعة / 7 أيام',
    },
    {
      id: 'guest-concierge',
      department_code: 'guest_services',
      name_en: 'Chief Concierge & Rapid Dispatch',
      name_ar: 'الكونسيرج والخدمات الفورية',
      phone_display: baseNumber,
      whatsapp_number: baseNumber,
      is_enabled: true,
      audience: 'ALL',
      operating_hours_en: '24 Hours / 7 Days',
      operating_hours_ar: '24 ساعة / 7 أيام',
    },
    {
      id: 'housekeeping-service',
      department_code: 'housekeeping',
      name_en: 'Housekeeping & Turndown',
      name_ar: 'خدمات الإشراف الداخلي والغرف',
      phone_display: baseNumber,
      whatsapp_number: baseNumber,
      is_enabled: true,
      audience: 'IN_HOUSE_ONLY',
      operating_hours_en: '06:00 AM - 12:00 AM',
      operating_hours_ar: '06:00 ص - 12:00 ص',
    },
    {
      id: 'laundry-valet',
      department_code: 'laundry',
      name_en: 'Valet Laundry & Garment Care',
      name_ar: 'المغسلة الفاخرة والعناية بالملابس',
      phone_display: baseNumber,
      whatsapp_number: baseNumber,
      is_enabled: true,
      audience: 'IN_HOUSE_ONLY',
      operating_hours_en: '07:00 AM - 09:00 PM',
      operating_hours_ar: '07:00 ص - 09:00 م',
    },
    {
      id: 'wellness-spa',
      department_code: 'spa',
      name_en: 'Wellness Sanctuary & Spa',
      name_ar: 'النادي الصحي والسبا',
      phone_display: baseNumber,
      whatsapp_number: baseNumber,
      is_enabled: true,
      audience: 'ALL',
      operating_hours_en: '09:00 AM - 10:00 PM',
      operating_hours_ar: '09:00 ص - 10:00 م',
    },
  ];
};

interface WhatsAppRoutingViewProps {
  hotel: Hotel;
  onMarkUnpublishedChanges?: () => void;
}

export const WhatsAppRoutingView: React.FC<WhatsAppRoutingViewProps> = ({
  hotel,
  onMarkUnpublishedChanges,
}) => {
  const [lines, setLines] = useState<WhatsAppLineConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit / Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [deptCode, setDeptCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [whatsappNum, setWhatsappNum] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'IN_HOUSE_ONLY' | 'EXTERNAL_ACCEPTED'>('ALL');
  const [hoursEn, setHoursEn] = useState('24 Hours / 7 Days');
  const [hoursAr, setHoursAr] = useState('24 ساعة / 7 أيام');

  const loadRouting = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getDepartmentRouting(hotel.id);
      if (data && Array.isArray(data.lines) && data.lines.length > 0) {
        setLines(data.lines);
      } else {
        setLines(buildDefaultLines(hotel));
      }
    } catch (err: any) {
      console.error('[WhatsAppRoutingView] Load error:', err);
      setErrorMessage('Failed to load WhatsApp routing matrix from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRouting();
  }, [hotel.id]);

  const handleToggleEnabled = async (id: string) => {
    const updated = lines.map((l) => (l.id === id ? { ...l, is_enabled: !l.is_enabled } : l));
    setLines(updated);
    await persistToFirestore(updated);
  };

  const handleOpenAddModal = () => {
    setEditingLineId(null);
    setDeptCode('front_office');
    setNameEn('');
    setNameAr('');
    setWhatsappNum(hotel.whatsapp_number || '+966');
    setPhoneDisplay(hotel.whatsapp_number || '+966');
    setAudience('ALL');
    setHoursEn('24 Hours / 7 Days');
    setHoursAr('24 ساعة / 7 أيام');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (line: WhatsAppLineConfig) => {
    setEditingLineId(line.id);
    setDeptCode(line.department_code);
    setNameEn(line.name_en);
    setNameAr(line.name_ar);
    setWhatsappNum(line.whatsapp_number);
    setPhoneDisplay(line.phone_display || line.whatsapp_number);
    setAudience(line.audience);
    setHoursEn(line.operating_hours_en);
    setHoursAr(line.operating_hours_ar);
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!nameEn.trim() || !whatsappNum.trim()) return;

    let updated: WhatsAppLineConfig[];
    if (editingLineId) {
      updated = lines.map((l) =>
        l.id === editingLineId
          ? {
              ...l,
              department_code: deptCode,
              name_en: nameEn.trim(),
              name_ar: nameAr.trim() || nameEn.trim(),
              whatsapp_number: whatsappNum.trim(),
              phone_display: phoneDisplay.trim() || whatsappNum.trim(),
              audience,
              operating_hours_en: hoursEn.trim(),
              operating_hours_ar: hoursAr.trim(),
            }
          : l
      );
    } else {
      const newLine: WhatsAppLineConfig = {
        id: `line-${Date.now()}`,
        department_code: deptCode || 'general',
        name_en: nameEn.trim(),
        name_ar: nameAr.trim() || nameEn.trim(),
        whatsapp_number: whatsappNum.trim(),
        phone_display: phoneDisplay.trim() || whatsappNum.trim(),
        is_enabled: true,
        audience,
        operating_hours_en: hoursEn.trim(),
        operating_hours_ar: hoursAr.trim(),
      };
      updated = [...lines, newLine];
    }

    setLines(updated);
    setIsModalOpen(false);
    await persistToFirestore(updated);
  };

  const handleDeleteLine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this operational line?')) return;
    const updated = lines.filter((l) => l.id !== id);
    setLines(updated);
    await persistToFirestore(updated);
  };

  const handleTestLine = (line: WhatsAppLineConfig) => {
    const testMsg = `TEST CONNECTION: ${hotel.name_en} Operations Center verifying communication line for ${line.name_en}. Ready to receive guest requests.`;
    const url = buildEncodedWhatsAppUrl(line.whatsapp_number, testMsg);
    window.open(url, '_blank');
  };

  const persistToFirestore = async (linesToSave: WhatsAppLineConfig[]) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await saveDepartmentRouting(hotel.id, {
        lines: linesToSave,
      });
      onMarkUnpublishedChanges?.();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('[WhatsAppRoutingView] Save error:', err);
      setErrorMessage(err.message || 'Failed to save WhatsApp routing matrix.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400 space-y-4">
        <RefreshCw className="animate-spin text-amber-500" size={32} />
        <p className="text-sm font-medium">Loading WhatsApp Routing Matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>WhatsApp operational routing saved securely (/hotels/{hotel.id}/private/departmentRouting)</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-amber-400" size={20} />
            <span>Department WhatsApp Routing Matrix</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Configure direct staff WhatsApp lines, audience permissions, and operating hours for <strong>{hotel.name_en}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRouting}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition-all cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Line
          </button>
          <button
            onClick={() => persistToFirestore(lines)}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Routing</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Routing Table */}
      <div className="bg-stone-900/40 border border-stone-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="divide-y divide-stone-800/80">
          {lines.map((line) => (
            <div
              key={line.id}
              className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                line.is_enabled ? 'hover:bg-stone-850/40' : 'bg-stone-950/40 opacity-60'
              }`}
            >
              {/* Department Details */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
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

                <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-stone-400" />
                    {line.operating_hours_en}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-mono flex items-center gap-1">
                    <Users size={11} />
                    {line.audience.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* WhatsApp Phone & Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-stone-300 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
                  {line.whatsapp_number}
                </span>

                <button
                  onClick={() => handleTestLine(line)}
                  title="Test WhatsApp dispatch"
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ExternalLink size={12} />
                  <span>Test</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(line)}
                  title="Edit details"
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Edit2 size={13} />
                </button>

                <button
                  onClick={() => handleToggleEnabled(line.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    line.is_enabled
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {line.is_enabled ? 'Disable' : 'Enable'}
                </button>

                <button
                  onClick={() => handleDeleteLine(line.id)}
                  title="Delete Line"
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingLineId ? 'Edit Department WhatsApp Line' : 'Add Department WhatsApp Line'}
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Department Code</label>
                  <input
                    type="text"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    placeholder="e.g. concierge"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Target Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="ALL">ALL (In-House & External)</option>
                    <option value="IN_HOUSE_ONLY">IN_HOUSE_ONLY</option>
                    <option value="EXTERNAL_ACCEPTED">EXTERNAL_ACCEPTED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Department Name (EN) *</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Front Desk"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1 text-right">اسم القسم (AR) *</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="الاستقبال"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">WhatsApp Number (E.164 format) *</label>
                  <input
                    type="text"
                    value={whatsappNum}
                    onChange={(e) => setWhatsappNum(e.target.value)}
                    placeholder="+966500000000"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Phone Display</label>
                  <input
                    type="text"
                    value={phoneDisplay}
                    onChange={(e) => setPhoneDisplay(e.target.value)}
                    placeholder="+966 50 000 0000"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Operating Hours (EN)</label>
                  <input
                    type="text"
                    value={hoursEn}
                    onChange={(e) => setHoursEn(e.target.value)}
                    placeholder="24 Hours / 7 Days"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1 text-right">ساعات العمل (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={hoursAr}
                    onChange={(e) => setHoursAr(e.target.value)}
                    placeholder="24 ساعة / 7 أيام"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={!nameEn.trim() || !whatsappNum.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {editingLineId ? 'Update Line' : 'Add Line'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
