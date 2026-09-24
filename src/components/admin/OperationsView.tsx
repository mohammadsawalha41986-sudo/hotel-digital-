import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Printer,
  DoorClosed,
  X,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import { OperationalRequest, OperationalRequestStatus } from '../../types/requests';
import {
  updateOperationalRequestStatus,
  assignStaffToRequest,
  generateOperationalReference,
  saveOperationalRequest,
} from '../../utils/requestStore';
import { updateRequestStatus, normalizeRequestStatus, submitProductionRequest } from '../../services/requestService';

interface OperationsViewProps {
  hotel: Hotel;
  requests: OperationalRequest[];
  onRefreshRequests: () => void;
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  hotel,
  requests,
  onRefreshRequests,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRequest, setActiveRequest] = useState<OperationalRequest | null>(null);
  const [staffNameInput, setStaffNameInput] = useState<string>('');

  const filteredRequests = requests.filter((req) => {
    if (selectedDept !== 'ALL' && req.department !== selectedDept) return false;
    if (selectedStatus !== 'ALL' && req.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = req.id.toLowerCase().includes(q);
      const matchRoom = (req.room_number || '').toLowerCase().includes(q);
      const matchGuest = (req.guest_name || '').toLowerCase().includes(q);
      const matchOutlet = (req.outlet_or_service_name_en || '').toLowerCase().includes(q);
      if (!matchId && !matchRoom && !matchGuest && !matchOutlet) return false;
    }
    return true;
  });

  const handleStatusChange = (status: OperationalRequestStatus) => {
    if (!activeRequest) return;
    updateOperationalRequestStatus(activeRequest.id, status);
    updateRequestStatus(hotel.id, activeRequest.id, normalizeRequestStatus(status)).catch((err) =>
      console.warn('[OperationsView] Status update sync error:', err)
    );
    setActiveRequest({ ...activeRequest, status, updated_at: new Date().toISOString() });
    onRefreshRequests();
  };

  const handleAssignStaff = () => {
    if (!activeRequest || !staffNameInput.trim()) return;
    const staff = staffNameInput.trim();
    assignStaffToRequest(activeRequest.id, staff);
    updateRequestStatus(
      hotel.id,
      activeRequest.id,
      normalizeRequestStatus(activeRequest.status),
      staff
    ).catch((err) => console.warn('[OperationsView] Assign staff sync error:', err));
    setActiveRequest({ ...activeRequest, assigned_staff: staff });
    setStaffNameInput('');
    onRefreshRequests();
  };

  const handleGenerateSampleOrder = () => {
    const ref = generateOperationalReference('FNB');
    const sample: OperationalRequest = {
      id: ref,
      hotel_id: hotel.id,
      hotel_name_en: hotel.name_en,
      hotel_name_ar: hotel.name_ar,
      department: 'fnb',
      department_name_en: '24/7 In-Room Dining',
      department_name_ar: 'خدمة الغرف على مدار الساعة',
      outlet_or_service_name_en: 'In-Room Dining Kitchen',
      outlet_or_service_name_ar: 'مطبخ خدمة الغرف',
      customer_type: 'IN_HOUSE',
      room_number: '402',
      guest_name: 'VIP Guest (Suite 402)',
      guest_phone: '+966551234567',
      items: [
        {
          id: 'dish-1',
          name_en: 'Flora Royal Club Sandwich',
          name_ar: 'كلوب ساندويتش رويال فلورا',
          quantity: 2,
          unit_price: 85,
          total_price: 170,
          options: 'Extra crispy fries, no mayo',
        },
        {
          id: 'dish-2',
          name_en: 'Fresh Valencia Orange Juice',
          name_ar: 'عصير برتقال فالنسيا طازج',
          quantity: 2,
          unit_price: 35,
          total_price: 70,
        },
      ],
      estimated_total: 240,
      currency: 'SAR',
      notes: 'Please bring with hot stainless steel cloche & extra napkins.',
      target_whatsapp: '+966112000002',
      whatsapp_message_en: `ROOM SERVICE ORDER [${ref}]\nRoom: 402\nItems: 2x Flora Royal Club Sandwich, 2x Fresh Orange Juice\nTotal: 240 SAR`,
      whatsapp_message_ar: `طلب خدمة الغرف [${ref}]\nالغرفة: 402\nالأصناف: 2x كلوب ساندويتش رويال، 2x عصير برتقال طازج\nالإجمالي: 240 ر.س`,
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveOperationalRequest(sample);
    submitProductionRequest({
      id: ref,
      reference: ref,
      hotelId: hotel.id,
      hotelNameEn: hotel.name_en,
      hotelNameAr: hotel.name_ar,
      department: 'FNB',
      requestType: 'In-Room Dining Kitchen',
      customerType: 'IN_HOUSE',
      roomNumber: '402',
      guestName: 'VIP Guest (Suite 402)',
      guestPhone: '+966551234567',
      items: sample.items?.map((it) => ({
        id: it.id,
        nameEn: it.name_en,
        nameAr: it.name_ar,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        totalPrice: it.total_price,
        options: it.options,
      })),
      total: 240,
      currency: 'SAR',
      notes: sample.notes,
      status: 'NEW',
      channel: 'DIRECT_PORTAL',
      targetWhatsApp: '+966112000002',
      whatsappMessageEn: sample.whatsapp_message_en,
      whatsappMessageAr: sample.whatsapp_message_ar,
    }).catch((err) => console.warn('[OperationsView] Sample order sync error:', err));

    onRefreshRequests();
    setActiveRequest(sample);
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const statusBadge = (st: OperationalRequestStatus) => {
    switch (st) {
      case 'NEW':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'RECEIVED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'PREPARING':
      case 'IN_PROGRESS':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'READY':
      case 'ON_THE_WAY':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'CANCELLED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-stone-800 text-stone-300 border-stone-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Test Generator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-5">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="text-amber-400" size={20} />
            <span>Orders & Operational Requests Live Queue</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Real-time hotel operational requests saved to system of record before WhatsApp transmission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateSampleOrder}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Inject a test In-Room Dining order into the queue"
          >
            <Plus size={13} />
            <span>Simulate Order (Room 402)</span>
          </button>
          <button
            onClick={onRefreshRequests}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            title="Refresh requests list"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Search Reference, Room, Guest, Outlet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded-xl ps-9 pe-3 py-2 text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-stone-800 text-stone-200 border border-stone-700 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="restaurant">Restaurant (Dining)</option>
            <option value="room_service">In-Room Dining</option>
            <option value="cafe">Café & Lounge</option>
            <option value="spa">Wellness & Spa</option>
            <option value="laundry">Valet Laundry</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="engineering">Engineering</option>
            <option value="guest_services">Guest Concierge</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-stone-800 text-stone-200 border border-stone-700 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="RECEIVED">Received</option>
            <option value="PREPARING">Preparing</option>
            <option value="ON_THE_WAY">On The Way</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-stone-850 text-stone-400 uppercase tracking-wider border-b border-stone-800 text-[10px]">
              <tr>
                <th className="py-3 px-4 text-start">Ref & Date</th>
                <th className="py-3 px-4 text-start">Customer / Room</th>
                <th className="py-3 px-4 text-start">Department / Outlet</th>
                <th className="py-3 px-4 text-start">Summary</th>
                <th className="py-3 px-4 text-end">Est. Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500 text-xs">
                    No requests found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setActiveRequest(req)}
                    className="hover:bg-stone-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-amber-400 block">{req.id}</span>
                      <span className="text-[10px] text-stone-500">
                        {new Date(req.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {req.room_number ? (
                        <div className="flex items-center gap-1 font-semibold text-white">
                          <DoorClosed size={13} className="text-amber-400" />
                          <span>Room {req.room_number}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400">External Visitor</span>
                      )}
                      <div className="text-[11px] text-stone-500 truncate max-w-[120px]">
                        {req.guest_name || 'Guest'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-200 block">
                        {req.outlet_or_service_name_en}
                      </span>
                      <span className="text-[10px] text-stone-500 uppercase font-mono">
                        {req.department}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-stone-400 truncate">
                        {req.items && req.items.length > 0
                          ? req.items.map((i) => `${i.quantity}x ${i.name_en}`).join(', ')
                          : req.services && req.services.length > 0
                          ? req.services.map((s) => s.name_en).join(', ')
                          : req.notes || 'Service Dispatch'}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-end font-mono">
                      {req.estimated_total > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          SAR {req.estimated_total}
                        </span>
                      ) : (
                        <span className="text-stone-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(
                          req.status
                        )}`}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveRequest(req);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[11px] font-medium transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Request Detail Drawer / Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-stone-200 text-xs">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-amber-400">
                  {activeRequest.id}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(
                    activeRequest.status
                  )}`}
                >
                  {activeRequest.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintTicket}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
                  title="Print Kitchen / Attendant Ticket"
                >
                  <Printer size={14} />
                </button>
                <button
                  onClick={() => setActiveRequest(null)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Context Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-800/60 p-3 rounded-xl border border-stone-750">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Customer</span>
                  <span className="font-semibold text-white">
                    {activeRequest.room_number ? `Room ${activeRequest.room_number}` : 'External Visitor'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Guest Name</span>
                  <span className="font-semibold text-white">
                    {activeRequest.guest_name || 'Resident'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Department</span>
                  <span className="font-semibold text-white truncate block">
                    {activeRequest.outlet_or_service_name_en}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Est. Total</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    SAR {activeRequest.estimated_total}
                  </span>
                </div>
              </div>

              {/* Items or Service breakdown */}
              <div className="space-y-2">
                <h3 className="font-bold text-stone-300 uppercase tracking-wider text-[10px]">
                  Request Breakdown
                </h3>
                <div className="bg-stone-950 border border-stone-800 rounded-xl divide-y divide-stone-850 p-1">
                  {activeRequest.items && activeRequest.items.length > 0 ? (
                    activeRequest.items.map((it, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">
                            {it.quantity}x {it.name_en}
                          </div>
                          <div className="text-[10px] text-stone-400">{it.name_ar}</div>
                          {it.options && (
                            <div className="text-[10px] text-amber-400 mt-0.5">
                              Note: {it.options}
                            </div>
                          )}
                        </div>
                        <div className="font-mono font-semibold text-stone-300">
                          SAR {it.total_price || it.unit_price * it.quantity}
                        </div>
                      </div>
                    ))
                  ) : activeRequest.services && activeRequest.services.length > 0 ? (
                    activeRequest.services.map((s, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{s.name_en}</div>
                          <div className="text-[10px] text-stone-400">{s.name_ar}</div>
                          {s.time && <div className="text-[10px] text-amber-400">Scheduled: {s.time}</div>}
                        </div>
                        <div className="font-mono font-semibold text-stone-300">
                          {s.price ? `SAR ${s.price}` : 'Service Request'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-stone-400">
                      {activeRequest.notes || 'General Guest Inquiry'}
                    </div>
                  )}
                </div>
              </div>

              {/* Guest Notes */}
              {activeRequest.notes && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                    Special Instructions / Notes
                  </span>
                  <p className="text-stone-300">{activeRequest.notes}</p>
                </div>
              )}

              {/* Bilingual Message Inspector */}
              <div className="space-y-2">
                <h3 className="font-bold text-stone-300 uppercase tracking-wider text-[10px]">
                  Generated WhatsApp Messages (System Audit)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-xl">
                    <span className="text-[10px] text-stone-500 font-bold uppercase block mb-1">
                      English Message
                    </span>
                    <pre className="whitespace-pre-wrap font-sans text-stone-300 text-[11px]">
                      {activeRequest.whatsapp_message_en || 'Standard template generated'}
                    </pre>
                  </div>
                  <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-xl" dir="rtl">
                    <span className="text-[10px] text-stone-500 font-bold uppercase block mb-1 text-end">
                      الرسالة باللغة العربية
                    </span>
                    <pre className="whitespace-pre-wrap font-sans text-stone-300 text-[11px]">
                      {activeRequest.whatsapp_message_ar || 'تم إنشاء النموذج القياسي'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Status Update Control */}
              <div className="space-y-2">
                <h3 className="font-bold text-stone-300 uppercase tracking-wider text-[10px]">
                  Update Operational Status
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(
                    ['NEW', 'RECEIVED', 'PREPARING', 'ON_THE_WAY', 'COMPLETED', 'CANCELLED'] as OperationalRequestStatus[]
                  ).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] border transition-all cursor-pointer ${
                        activeRequest.status === st
                          ? `${statusBadge(st)} ring-1 ring-white/30`
                          : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Assignment */}
              <div className="space-y-2">
                <h3 className="font-bold text-stone-300 uppercase tracking-wider text-[10px]">
                  Assign Staff Member
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Staff Name (e.g., Tariq - Room Attendant)"
                    value={staffNameInput || activeRequest.assigned_staff || ''}
                    onChange={(e) => setStaffNameInput(e.target.value)}
                    className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 placeholder:text-stone-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAssignStaff}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-850 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Created: {new Date(activeRequest.created_at).toLocaleString()}
              </span>
              <button
                onClick={() => setActiveRequest(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
