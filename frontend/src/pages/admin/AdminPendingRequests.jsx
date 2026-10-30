import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Calendar,
  Users,
  AlertTriangle,
  Tv,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Search
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminPendingRequests = () => {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Rejection modal state
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Venue capacity mismatch or campus scheduling conflict.');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getPendingBookings();
      setPendingBookings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (bookingId) => {
    setActionLoading(bookingId);
    setFeedbackMsg({ type: '', text: '' });
    try {
      await bookingService.approveBooking(bookingId);
      setFeedbackMsg({
        type: 'success',
        text: `Application #${bookingId} APPROVED successfully! QR check-in token generated and student notified.`
      });
      await fetchPending();
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Approval failed due to booking conflict or maintenance lock.'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionTarget) return;
    setActionLoading(rejectionTarget.id);
    try {
      await bookingService.rejectBooking(rejectionTarget.id, rejectionReason);
      setFeedbackMsg({
        type: 'info',
        text: `Application #${rejectionTarget.id} REJECTED. Slot released and notification dispatched.`
      });
      setRejectionTarget(null);
      await fetchPending();
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject booking.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <ClipboardList className="w-4 h-4" />
            <span>Authorization Queue</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pending Booking Applications</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review student requests. Approved applications automatically generate 15-minute QR verification tokens.
          </p>
        </div>

        <button
          onClick={fetchPending}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {feedbackMsg.text && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn ${
          feedbackMsg.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-700'
            : feedbackMsg.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {feedbackMsg.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading pending applications...</div>
      ) : pendingBookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">All Caught Up!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no student room reservation requests awaiting administrative review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBookings.map((b) => {
            const reqEq = b.required_equipment ? JSON.parse(b.required_equipment) : [];
            const accom = b.accompanying_students ? JSON.parse(b.accompanying_students) : [];

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 space-y-4"
              >
                {/* Top Row: Ref ID + Venue + Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {b.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      Submitted: {new Date(b.created_at).toLocaleDateString()} {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Student Info */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Applicant Details</span>
                    <h4 className="font-bold text-slate-900 text-sm">{b.user?.full_name || 'Student'}</h4>
                    <p className="text-slate-600 font-mono">ID: {b.user?.enrollment_number || 'ENR2024CS042'}</p>
                    <p className="text-slate-500 truncate">{b.user?.department} • {b.user?.course}</p>
                  </div>

                  {/* Room & Slot Info */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Venue & Timing</span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {b.room?.room_number} - {b.room?.name}
                    </h4>
                    <p className="text-slate-600 font-semibold">{b.booking_date}</p>
                    <p className="text-blue-700 font-medium">Slot: {b.start_time} - {b.end_time} ({b.number_of_people} attendees)</p>
                  </div>

                  {/* Stated Purpose & Justification */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Purpose & Stated Need</span>
                    <h4 className="font-semibold text-slate-900 line-clamp-1">{b.purpose}</h4>
                    <p className="text-slate-600 italic line-clamp-2 leading-relaxed">"{b.why_needed}"</p>
                  </div>
                </div>

                {/* Facilities & Accompanying Students */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {reqEq.length > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="font-semibold text-slate-700">Facilities:</span>
                        {reqEq.map((f, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {accom.length > 0 && (
                      <span className="text-slate-500 text-[11px]">
                        + {accom.length} co-organizing students
                      </span>
                    )}
                  </div>

                  {/* Approve / Reject Actions */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => setRejectionTarget(b)}
                      disabled={actionLoading === b.id}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(b.id)}
                      disabled={actionLoading === b.id}
                      className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {actionLoading === b.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Approve Booking</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <XCircle className="w-5 h-5" />
              <h3>Decline Booking Application</h3>
            </div>

            <p className="text-xs text-slate-600">
              Please specify the administrative rationale for declining application <strong className="text-slate-900 font-mono">#{rejectionTarget.id}</strong> ({rejectionTarget.room?.room_number}). This reason will be displayed on the student's dashboard.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
