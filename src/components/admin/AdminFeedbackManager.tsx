// src/components/admin/AdminFeedbackManager.tsx
import React, { useState, useEffect } from 'react';
import {
  MessageSquareWarning,
  Lightbulb,
  Heart,
  Briefcase,
  Phone,
  MessageCircle,
  Clock,
  Building,
  User,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import {
  GuestFeedbackCase,
  FeedbackStatus,
} from '../../types/feedback';
import {
  getFeedbackCasesForAdmin,
  updateFeedbackCaseStatus,
  assignFeedbackCase,
  addInternalNoteToCase,
} from '../../utils/feedbackStorage';

interface AdminFeedbackManagerProps {
  currentHotel: Hotel;
}

export const AdminFeedbackManager: React.FC<AdminFeedbackManagerProps> = ({
  currentHotel,
}) => {
  const [selectedHotelFilter, setSelectedHotelFilter] = useState<string>(currentHotel.id);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [cases, setCases] = useState<GuestFeedbackCase[]>([]);

  // Internal Note form state
  const [activeNoteCaseRef, setActiveNoteCaseRef] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // Department assignment state
  const [activeAssignCaseRef, setActiveAssignCaseRef] = useState<string | null>(null);
  const [assignedDept, setAssignedDept] = useState('Front Desk & Concierge');
  const [assignedStaff, setAssignedStaff] = useState('Duty Manager Tariq');

  const adminUser = 'Guest Relations Manager';

  const refreshCases = () => {
    const list = getFeedbackCasesForAdmin(
      selectedHotelFilter === 'ALL' ? undefined : selectedHotelFilter
    );
    setCases(list);
  };

  useEffect(() => {
    refreshCases();
  }, [selectedHotelFilter]);

  const newCount = cases.filter((c) => c.status === 'NEW').length;
  const urgentCount = cases.filter((c) => c.priority === 'URGENT').length;
  const complaintsCount = cases.filter((c) => c.type === 'COMPLAINT').length;
  const inProgressCount = cases.filter((c) => c.status === 'IN_PROGRESS').length;

  const filteredCases = cases.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
    return true;
  });

  const handleStatusChange = (ref: string, newStatus: FeedbackStatus) => {
    updateFeedbackCaseStatus(ref, newStatus, adminUser);
    refreshCases();
  };

  const handleAddNote = (ref: string) => {
    if (!newNoteText.trim()) return;
    addInternalNoteToCase(ref, newNoteText, adminUser);
    setNewNoteText('');
    setActiveNoteCaseRef(null);
    refreshCases();
  };

  const handleAssign = (ref: string) => {
    assignFeedbackCase(ref, assignedDept, assignedStaff, adminUser);
    setActiveAssignCaseRef(null);
    refreshCases();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold mb-2">
            <MessageSquareWarning size={14} />
            <span>GUEST RELATIONS & SERVICE RECOVERY HUB</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Guest Cases, Complaints & Assistance
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Monitor and resolve in-house guest issues, urgent management requests, suggestions, and staff commendations in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-800 p-1.5 rounded-2xl text-xs">
          <button
            onClick={() => setSelectedHotelFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
              selectedHotelFilter === 'ALL' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-white'
            }`}
          >
            All Hotels
          </button>
          <button
            onClick={() => setSelectedHotelFilter('11')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
              selectedHotelFilter === '11' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-white'
            }`}
          >
            Royal
          </button>
          <button
            onClick={() => setSelectedHotelFilter('12')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
              selectedHotelFilter === '12' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-white'
            }`}
          >
            Inn
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => {
            setStatusFilter('NEW');
            setTypeFilter('ALL');
          }}
          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
            statusFilter === 'NEW'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-400/20'
              : 'bg-white border-stone-200 hover:border-red-200'
          }`}
        >
          <div className="text-2xl font-bold text-red-700 font-mono">{newCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">New Cases</div>
          <div className="text-[10px] text-stone-500">Awaiting Acknowledgment</div>
        </button>

        <button
          onClick={() => {
            setStatusFilter('ALL');
            setTypeFilter('ALL');
          }}
          className="p-4 rounded-2xl bg-white border border-stone-200 text-start hover:border-amber-200 transition-colors"
        >
          <div className="text-2xl font-bold text-amber-700 font-mono">{urgentCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">Urgent Priority</div>
          <div className="text-[10px] text-stone-500">Requires Immediate Callback</div>
        </button>

        <button
          onClick={() => {
            setTypeFilter('COMPLAINT');
            setStatusFilter('ALL');
          }}
          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
            typeFilter === 'COMPLAINT'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-stone-200 hover:border-amber-200'
          }`}
        >
          <div className="text-2xl font-bold text-stone-800 font-mono">{complaintsCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">Active Complaints</div>
          <div className="text-[10px] text-stone-500">Service Recovery Tracking</div>
        </button>

        <button
          onClick={() => {
            setStatusFilter('IN_PROGRESS');
            setTypeFilter('ALL');
          }}
          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-stone-200 hover:border-blue-200'
          }`}
        >
          <div className="text-2xl font-bold text-blue-700 font-mono">{inProgressCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">In Progress</div>
          <div className="text-[10px] text-stone-500">Assigned to Departments</div>
        </button>
      </div>

      {/* Type & Status Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 flex flex-wrap items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Types ({cases.length})
          </button>
          <button
            onClick={() => setTypeFilter('COMPLAINT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === 'COMPLAINT'
                ? 'bg-red-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Complaints
          </button>
          <button
            onClick={() => setTypeFilter('SUGGESTION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === 'SUGGESTION'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Suggestions
          </button>
          <button
            onClick={() => setTypeFilter('COMPLIMENT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === 'COMPLIMENT'
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Staff Compliments
          </button>
          <button
            onClick={() => setTypeFilter('MANAGEMENT_REQUEST')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === 'MANAGEMENT_REQUEST'
                ? 'bg-indigo-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Duty Manager Requests
          </button>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="ESCALATED">ESCALATED</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {filteredCases.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-stone-400" />
            <div className="font-bold text-stone-700">No cases match the selected filter</div>
            <p className="text-xs">All cases are handled or criteria does not match.</p>
          </div>
        ) : (
          filteredCases.map((c) => (
            <div
              key={c.id}
              className={`p-5 sm:p-6 rounded-3xl bg-white border transition-all shadow-2xs space-y-4 ${
                c.priority === 'URGENT'
                  ? 'border-red-300 ring-1 ring-red-200 bg-red-50/20'
                  : c.status === 'NEW'
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-stone-200'
              }`}
            >
              {/* Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg">
                    {c.reference}
                  </span>

                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-stone-800 text-white">
                    {c.hotelId === '12' ? 'Swiss Flora Inn' : 'Swiss Flora Royal'}
                  </span>

                  {/* Type Badge */}
                  {c.type === 'COMPLAINT' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-900 border border-red-200">
                      <MessageSquareWarning size={12} />
                      <span>Complaint</span>
                    </span>
                  )}
                  {c.type === 'SUGGESTION' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      <Lightbulb size={12} />
                      <span>Suggestion</span>
                    </span>
                  )}
                  {c.type === 'COMPLIMENT' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                      <Heart size={12} />
                      <span>Staff Compliment</span>
                    </span>
                  )}
                  {c.type === 'MANAGEMENT_REQUEST' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                      <Briefcase size={12} />
                      <span>Duty Manager Request</span>
                    </span>
                  )}

                  {/* Priority */}
                  {c.priority === 'URGENT' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-red-600 text-white">
                      <AlertTriangle size={12} />
                      <span>URGENT</span>
                    </span>
                  )}

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      c.status === 'NEW'
                        ? 'bg-amber-100 text-amber-950 border border-amber-300'
                        : c.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-900'
                        : c.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-900'
                        : c.status === 'CLOSED'
                        ? 'bg-stone-200 text-stone-700'
                        : 'bg-purple-100 text-purple-900'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="text-xs text-stone-400 font-mono">
                  {new Date(c.submittedAt).toLocaleString()}
                </div>
              </div>

              {/* Message and Guest Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Content */}
                <div className="md:col-span-2 space-y-2">
                  <div className="text-xs font-bold text-stone-600">
                    Category: <span className="text-stone-900">{c.category}</span>
                    {c.staffName && (
                      <span className="ms-3 text-emerald-800">
                        Staff Commended: <strong>{c.staffName}</strong> ({c.department})
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-stone-800 leading-relaxed bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 whitespace-pre-wrap">
                    {c.message}
                  </p>

                  {/* Internal Notes Thread */}
                  {c.internalNotes && c.internalNotes.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                        Internal Staff & Action Notes:
                      </span>
                      {c.internalNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold">
                            <span>{note.author}</span>
                            <span className="text-stone-400 font-mono">
                              {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-stone-800">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Note Form Inline */}
                  {activeNoteCaseRef === c.reference ? (
                    <div className="p-3 rounded-2xl bg-stone-100 border border-stone-300 space-y-2">
                      <textarea
                        rows={2}
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Add internal action note for this case..."
                        className="w-full p-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-hidden focus:border-amber-500 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveNoteCaseRef(null)}
                          className="px-3 py-1 rounded-lg border text-xs font-bold text-stone-600 hover:bg-stone-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddNote(c.reference)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800"
                        >
                          <Send size={11} />
                          <span>Add Note</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveNoteCaseRef(c.reference);
                        setNewNoteText('');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer pt-1"
                    >
                      <Plus size={13} />
                      <span>Add Internal Note</span>
                    </button>
                  )}
                </div>

                {/* Guest Contact & Assignment Card */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                  <div className="font-bold text-stone-800 border-b border-stone-200 pb-1">
                    Guest & Follow-Up Info
                  </div>

                  <div className="flex items-center gap-2 text-stone-700">
                    <User size={13} className="text-stone-400 shrink-0" />
                    <span>Name: <strong>{c.guestName || 'Anonymous Guest'}</strong></span>
                  </div>

                  {c.roomNumber && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Building size={13} className="text-stone-400 shrink-0" />
                      <span>Room: <strong className="font-mono text-stone-900">{c.roomNumber}</strong></span>
                    </div>
                  )}

                  {c.phone && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Phone size={13} className="text-stone-400 shrink-0" />
                      <a href={`tel:${c.phone}`} className="font-mono text-amber-800 hover:underline">
                        {c.phone}
                      </a>
                    </div>
                  )}

                  {c.preferredContactMethod && (
                    <div className="text-[11px] text-stone-500">
                      Preferred: <strong className="text-stone-800 uppercase">{c.preferredContactMethod}</strong>
                      {c.preferredCallbackTime && ` (${c.preferredCallbackTime})`}
                    </div>
                  )}

                  {/* Assigned Department */}
                  <div className="pt-2 border-t border-stone-200">
                    <div className="text-[11px] text-stone-500">Assignment:</div>
                    <div className="font-bold text-stone-800">
                      {c.assignedDepartmentId || 'Unassigned'}
                      {c.assignedUserId ? ` • ${c.assignedUserId}` : ''}
                    </div>

                    {activeAssignCaseRef === c.reference ? (
                      <div className="pt-2 space-y-2">
                        <select
                          value={assignedDept}
                          onChange={(e) => setAssignedDept(e.target.value)}
                          className="w-full p-1.5 rounded-lg border text-xs bg-white"
                        >
                          <option value="Front Desk & Concierge">Front Desk & Concierge</option>
                          <option value="Housekeeping">Housekeeping</option>
                          <option value="Engineering & Maintenance">Engineering & Maintenance</option>
                          <option value="Food & Beverage">Food & Beverage</option>
                          <option value="Executive Management">Executive Management</option>
                        </select>
                        <input
                          type="text"
                          value={assignedStaff}
                          onChange={(e) => setAssignedStaff(e.target.value)}
                          placeholder="Manager / Agent Name"
                          className="w-full p-1.5 rounded-lg border text-xs bg-white"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveAssignCaseRef(null)}
                            className="px-2 py-1 rounded bg-stone-200 text-[11px] font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAssign(c.reference)}
                            className="px-2 py-1 rounded bg-stone-900 text-white text-[11px] font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveAssignCaseRef(c.reference)}
                        className="text-[11px] font-bold text-amber-800 hover:underline pt-0.5 cursor-pointer"
                      >
                        Reassign Department
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status buttons */}
                  {c.status === 'NEW' && (
                    <button
                      onClick={() => handleStatusChange(c.reference, 'ACKNOWLEDGED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 size={13} />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {c.status !== 'IN_PROGRESS' && c.status !== 'RESOLVED' && c.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleStatusChange(c.reference, 'IN_PROGRESS')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Clock size={13} />
                      <span>Mark In Progress</span>
                    </button>
                  )}

                  {c.status !== 'RESOLVED' && c.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleStatusChange(c.reference, 'RESOLVED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark Resolved</span>
                    </button>
                  )}

                  {c.status === 'RESOLVED' && (
                    <button
                      onClick={() => handleStatusChange(c.reference, 'CLOSED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>Close Case</span>
                    </button>
                  )}

                  {/* Escalate */}
                  {c.status !== 'ESCALATED' && (
                    <button
                      onClick={() => handleStatusChange(c.reference, 'ESCALATED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <AlertTriangle size={13} />
                      <span>Escalate to GM</span>
                    </button>
                  )}
                </div>

                {/* Direct Guest Helpline Links */}
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
                    >
                      <Phone size={13} className="text-amber-700" />
                      <span>Call Guest</span>
                    </a>

                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
