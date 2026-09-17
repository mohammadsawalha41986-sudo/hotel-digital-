// src/components/admin/AdminReviewsManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Star,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  MessageSquare,
  AlertTriangle,
  History,
  Building,
  User,
  Phone,
  Mail,
  Send,
  Calendar,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import {
  GuestReview,
  ReviewAuditLog,
} from '../../types/reviews';
import {
  getAllReviewsForAdmin,
  updateReviewStatus,
  setReviewPublished,
  setReviewFeatured,
  saveManagementResponse,
  deleteReview,
  getReviewAuditLogs,
  getCategoryLabel,
} from '../../utils/reviewStorage';

interface AdminReviewsManagerProps {
  currentHotel: Hotel;
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'HIDDEN' | 'REJECTED' | 'FLAGGED';

export const AdminReviewsManager: React.FC<AdminReviewsManagerProps> = ({
  currentHotel,
}) => {
  const [selectedHotelFilter, setSelectedHotelFilter] = useState<string>(currentHotel.id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviews, setReviews] = useState<GuestReview[]>([]);
  const [auditLogs, setAuditLogs] = useState<ReviewAuditLog[]>([]);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);

  // Response Editor State
  const [editingResponseReviewId, setEditingResponseReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responsePublished, setResponsePublished] = useState(true);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const adminUserName = 'Duty Manager (Admin)';

  const refreshData = () => {
    const list = getAllReviewsForAdmin(selectedHotelFilter === 'ALL' ? undefined : selectedHotelFilter);
    setReviews(list);
    const logs = getReviewAuditLogs(selectedHotelFilter === 'ALL' ? undefined : selectedHotelFilter);
    setAuditLogs(logs);
  };

  useEffect(() => {
    refreshData();
  }, [selectedHotelFilter]);

  // Counts for tabs
  const pendingCount = reviews.filter((r) => r.status === 'PENDING').length;
  const flaggedCount = reviews.filter((r) => r.flaggedForAttention || r.rating <= 2).length;
  const publishedCount = reviews.filter((r) => r.status === 'APPROVED' && r.published).length;
  const hiddenCount = reviews.filter((r) => r.status === 'HIDDEN' || (!r.published && r.status === 'APPROVED')).length;
  const rejectedCount = reviews.filter((r) => r.status === 'REJECTED').length;

  const filteredReviews = reviews.filter((r) => {
    // Status filter
    if (statusFilter === 'PENDING' && r.status !== 'PENDING') return false;
    if (statusFilter === 'APPROVED' && !(r.status === 'APPROVED' && r.published)) return false;
    if (statusFilter === 'HIDDEN' && !(r.status === 'HIDDEN' || (!r.published && r.status === 'APPROVED'))) return false;
    if (statusFilter === 'REJECTED' && r.status !== 'REJECTED') return false;
    if (statusFilter === 'FLAGGED' && !(r.flaggedForAttention || r.rating <= 2)) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.guestName.toLowerCase().includes(q) || r.publicDisplayName.toLowerCase().includes(q);
      const matchComment = r.comment.toLowerCase().includes(q);
      const matchRoom = (r.roomNumber || '').toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      if (!matchName && !matchComment && !matchRoom && !matchId) return false;
    }

    return true;
  });

  const handleApprove = (id: string) => {
    updateReviewStatus(id, 'APPROVED', adminUserName);
    // Also auto-publish upon direct approval
    setReviewPublished(id, true, adminUserName);
    refreshData();
  };

  const handleReject = (id: string) => {
    updateReviewStatus(id, 'REJECTED', adminUserName);
    refreshData();
  };

  const handleTogglePublish = (id: string, currentPublished: boolean) => {
    setReviewPublished(id, !currentPublished, adminUserName);
    refreshData();
  };

  const handleToggleFeatured = (id: string, currentFeatured: boolean) => {
    setReviewFeatured(id, !currentFeatured, adminUserName);
    refreshData();
  };

  const handleSaveResponse = (reviewId: string) => {
    if (!responseText.trim()) return;
    saveManagementResponse(
      reviewId,
      responseText,
      responsePublished,
      selectedHotelFilter === '12' ? 'Swiss Flora Inn' : 'Swiss Flora Royal Hotel',
      adminUserName
    );
    setEditingResponseReviewId(null);
    setResponseText('');
    refreshData();
  };

  const handleDelete = (id: string) => {
    deleteReview(id, adminUserName);
    setConfirmDeleteId(null);
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
            <ShieldCheck size={14} />
            <span>MODERATED REVIEW SYSTEM</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Guest Reviews Moderation Desk
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Every guest review requires management moderation before appearing on the public website.
            Approve, reject, feature, unpublish, or compose official management responses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Hotel Filter Dropdown */}
          <div className="bg-stone-800 rounded-2xl p-1.5 flex items-center gap-1 text-xs">
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

          <button
            onClick={() => setShowAuditDrawer(!showAuditDrawer)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <History size={14} />
            <span>Audit History ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-stone-200 hover:border-amber-200'
          }`}
        >
          <div className="text-2xl font-bold text-amber-700 font-mono">{pendingCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">Pending Review</div>
          <div className="text-[10px] text-stone-500">Requires Moderation</div>
        </button>

        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white border-stone-200 hover:border-emerald-200'
          }`}
        >
          <div className="text-2xl font-bold text-emerald-700 font-mono">{publishedCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">Published Live</div>
          <div className="text-[10px] text-stone-500">Visible to Public</div>
        </button>

        <button
          onClick={() => setStatusFilter('FLAGGED')}
          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
            statusFilter === 'FLAGGED'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-400/20'
              : 'bg-white border-stone-200 hover:border-red-200'
          }`}
        >
          <div className="text-2xl font-bold text-red-700 font-mono">{flaggedCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">Service Recovery</div>
          <div className="text-[10px] text-stone-500">≤ 2 Stars / Low Rating</div>
        </button>

        <button
          onClick={() => setStatusFilter('HIDDEN')}
          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
            statusFilter === 'HIDDEN'
              ? 'bg-stone-100 border-stone-400 ring-2 ring-stone-400/20'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="text-2xl font-bold text-stone-700 font-mono">{hiddenCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">Hidden / Offline</div>
          <div className="text-[10px] text-stone-500">Unpublished</div>
        </button>

        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-stone-100 border-stone-400 ring-2 ring-stone-400/20'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="text-2xl font-bold text-stone-600 font-mono">{rejectedCount}</div>
          <div className="text-xs font-bold text-stone-800 mt-1">Rejected</div>
          <div className="text-[10px] text-stone-500">Declined Content</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter('FLAGGED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'FLAGGED'
                ? 'bg-red-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Flagged ({flaggedCount})
          </button>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest name, room, comment..."
            className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Review Cards List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-stone-400" />
            <div className="font-bold text-stone-700">No reviews found in this filter</div>
            <p className="text-xs">All pending reviews have been moderated or criteria does not match.</p>
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`p-5 sm:p-6 rounded-3xl bg-white border transition-all shadow-2xs space-y-4 ${
                rev.flaggedForAttention || rev.rating <= 2
                  ? 'border-red-300 ring-1 ring-red-200 bg-red-50/20'
                  : rev.status === 'PENDING'
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-stone-200'
              }`}
            >
              {/* Top Row: Status, Hotel Badge, ID, Date */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                    {rev.id}
                  </span>

                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-800 text-white">
                    {rev.hotelId === '12' ? 'Swiss Flora Inn' : 'Swiss Flora Royal'}
                  </span>

                  {/* Status Badge */}
                  {rev.status === 'PENDING' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Pending Moderation
                    </span>
                  )}
                  {rev.status === 'APPROVED' && rev.published && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Live on Website
                    </span>
                  )}
                  {rev.status === 'APPROVED' && !rev.published && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-700 border border-stone-300">
                      Approved (Unpublished)
                    </span>
                  )}
                  {rev.status === 'HIDDEN' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-200 text-stone-700">
                      Hidden
                    </span>
                  )}
                  {rev.status === 'REJECTED' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-900 border border-red-300">
                      Rejected
                    </span>
                  )}

                  {rev.featured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <Sparkles size={12} />
                      <span>Featured</span>
                    </span>
                  )}

                  {(rev.flaggedForAttention || rev.rating <= 2) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600 text-white">
                      <AlertTriangle size={12} />
                      <span>Service Recovery Needed</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-stone-400 font-mono">
                  Submitted: {new Date(rev.submittedAt).toLocaleString()}
                </div>
              </div>

              {/* Guest & Rating Details Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left: Rating & Content */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-300'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-stone-800">
                      {rev.rating} / 5 Stars
                    </span>
                    <span className="text-xs text-stone-400">•</span>
                    <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                      {getCategoryLabel(rev.category, false)}
                    </span>
                  </div>

                  {rev.title && (
                    <h4 className="text-sm font-bold text-stone-900">
                      {rev.title}
                    </h4>
                  )}

                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70">
                    "{rev.comment}"
                  </p>
                </div>

                {/* Right: Private Internal Guest Information */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                  <div className="font-bold text-stone-800 border-b border-stone-200 pb-1 flex items-center justify-between">
                    <span>Internal Guest Verification</span>
                    {rev.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        <ShieldCheck size={11} />
                        <span>Verified Stay</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-stone-700">
                    <User size={13} className="text-stone-400 shrink-0" />
                    <span>Real Name: <strong className="text-stone-900">{rev.guestName}</strong></span>
                  </div>

                  <div className="text-[11px] text-stone-500">
                    Display As: <strong className="text-amber-800">{rev.publicDisplayName}</strong> ({rev.displayNamePreference})
                  </div>

                  {rev.roomNumber && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Building size={13} className="text-stone-400 shrink-0" />
                      <span>Room / Suite: <strong className="font-mono text-stone-900">{rev.roomNumber}</strong></span>
                    </div>
                  )}

                  {rev.stayDate && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Calendar size={13} className="text-stone-400 shrink-0" />
                      <span>Stay Date: <strong className="font-mono text-stone-900">{rev.stayDate}</strong></span>
                    </div>
                  )}

                  {rev.guestPhone && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Phone size={13} className="text-stone-400 shrink-0" />
                      <a href={`tel:${rev.guestPhone}`} className="hover:underline font-mono text-amber-800">
                        {rev.guestPhone}
                      </a>
                    </div>
                  )}

                  {rev.guestEmail && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Mail size={13} className="text-stone-400 shrink-0" />
                      <span className="truncate text-stone-600">{rev.guestEmail}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-stone-400 pt-1">
                    Source: {rev.source} • Consent: {rev.consentToPublish ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              {/* Management Response Display / Editor */}
              {rev.managementResponse && editingResponseReviewId !== rev.id && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-amber-700" />
                      <span>{rev.managementResponse.responderTitle_en}</span>
                    </span>
                    <span className="text-[10px] text-stone-500 font-normal">
                      {rev.managementResponse.isPublished ? 'Publicly Visible' : 'Draft Only'}
                    </span>
                  </div>
                  <p className="text-stone-800 italic">"{rev.managementResponse.text}"</p>
                  <button
                    onClick={() => {
                      setEditingResponseReviewId(rev.id);
                      setResponseText(rev.managementResponse?.text || '');
                      setResponsePublished(rev.managementResponse?.isPublished ?? true);
                    }}
                    className="text-[11px] font-bold text-amber-800 hover:underline pt-1 cursor-pointer"
                  >
                    Edit Management Response
                  </button>
                </div>
              )}

              {/* Inline Response Composer */}
              {editingResponseReviewId === rev.id && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-300 text-xs space-y-3">
                  <div className="flex items-center justify-between font-bold text-stone-800">
                    <span>Compose Official Management Response</span>
                    <label className="flex items-center gap-1.5 text-xs font-normal cursor-pointer">
                      <input
                        type="checkbox"
                        checked={responsePublished}
                        onChange={(e) => setResponsePublished(e.target.checked)}
                        className="rounded text-amber-600"
                      />
                      <span>Publish Response Publicly</span>
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write a gracious response acknowledging the guest's feedback..."
                    className="w-full p-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-hidden focus:border-amber-500 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingResponseReviewId(null)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveResponse(rev.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-stone-900 text-white font-bold hover:bg-stone-800"
                    >
                      <Send size={12} />
                      <span>Save Response</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Approve & Publish */}
                  {rev.status !== 'APPROVED' && (
                    <button
                      onClick={() => handleApprove(rev.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve & Publish</span>
                    </button>
                  )}

                  {/* Toggle Publish / Unpublish if already approved */}
                  {rev.status === 'APPROVED' && (
                    <button
                      onClick={() => handleTogglePublish(rev.id, rev.published)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        rev.published
                          ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                      }`}
                    >
                      {rev.published ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{rev.published ? 'Unpublish from Web' : 'Publish to Web'}</span>
                    </button>
                  )}

                  {/* Reject */}
                  {rev.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleReject(rev.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-stone-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <XCircle size={14} />
                      <span>Reject</span>
                    </button>
                  )}

                  {/* Feature Toggle */}
                  <button
                    onClick={() => handleToggleFeatured(rev.id, rev.featured)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                      rev.featured
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <Sparkles size={13} className={rev.featured ? 'text-amber-600' : 'text-stone-400'} />
                    <span>{rev.featured ? 'Featured' : 'Mark Featured'}</span>
                  </button>

                  {/* Reply Button if no response yet */}
                  {!rev.managementResponse && editingResponseReviewId !== rev.id && (
                    <button
                      onClick={() => {
                        setEditingResponseReviewId(rev.id);
                        setResponseText('');
                        setResponsePublished(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <MessageSquare size={13} className="text-amber-700" />
                      <span>Add Management Response</span>
                    </button>
                  )}
                </div>

                {/* Delete Button with Confirmation */}
                <div>
                  {confirmDeleteId === rev.id ? (
                    <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200 text-xs">
                      <span className="text-red-800 font-bold px-1.5">Confirm Delete?</span>
                      <button
                        onClick={() => handleDelete(rev.id)}
                        className="px-2 py-1 rounded bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded bg-stone-200 text-stone-700 font-bold hover:bg-stone-300 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(rev.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-stone-400 hover:text-red-600 text-xs transition-colors cursor-pointer"
                      title="Delete Review"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Audit History Drawer / Modal */}
      {showAuditDrawer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-amber-700" />
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Moderation Audit Log
                </h3>
              </div>
              <button
                onClick={() => setShowAuditDrawer(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-stone-400">No moderation actions recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 font-mono">{log.reviewId}</span>
                        <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-bold text-[10px]">
                          {log.action}
                        </span>
                        <span className="text-stone-500">by {log.adminUser}</span>
                      </div>
                      {log.details && <p className="text-stone-600">{log.details}</p>}
                    </div>
                    <span className="text-[10px] text-stone-400 whitespace-nowrap font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
