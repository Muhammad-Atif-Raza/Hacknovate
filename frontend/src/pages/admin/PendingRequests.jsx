import { useState, useEffect, useContext } from 'react';
import {
  Card,
  Badge,
  Button,
  Loader,
  EmptyState,
  ConfirmDialog,
  Avatar,
  TextArea,
} from '@/components/ui';
import { NotificationContext } from '@/contexts/NotificationContext';
import * as adminService from '@/services/adminService';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  MapPin,
  Hash,
  User,
  Building,
  MessageSquare,
} from 'lucide-react';

export default function PendingRequests() {
  const { showSuccess, showError } = useContext(NotificationContext);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expanded companions per card
  const [expandedCards, setExpandedCards] = useState({});

  // Approve / Reject dialog state
  const [approveDialog, setApproveDialog] = useState({ open: false, request: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, request: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Removing animation tracking
  const [removingIds, setRemovingIds] = useState(new Set());

  useEffect(() => {
    loadPendingRequests();
  }, []);

  async function loadPendingRequests() {
    try {
      setLoading(true);
      const res = await adminService.getPendingRequests();
      const data = res?.data || res;
      setRequests(Array.isArray(data) ? data : data?.requests || []);
    } catch {
      showError('Failed to load pending requests.');
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id) {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function removeRequestAnimated(id) {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => (r.id || r.bookingId) !== id));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 350);
  }

  // ---- Approve ----
  async function handleApprove() {
    const req = approveDialog.request;
    if (!req) return;
    const id = req.id || req.bookingId;
    try {
      setActionLoading(true);
      await adminService.approveBooking(id);
      showSuccess(`Booking request by ${req.studentName || 'student'} has been approved.`);
      setApproveDialog({ open: false, request: null });
      removeRequestAnimated(id);
    } catch {
      showError('Failed to approve the request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  // ---- Reject ----
  async function handleReject() {
    const req = rejectDialog.request;
    if (!req) return;
    const id = req.id || req.bookingId;
    try {
      setActionLoading(true);
      await adminService.rejectBooking(id, rejectReason || undefined);
      showSuccess(`Booking request by ${req.studentName || 'student'} has been rejected.`);
      setRejectDialog({ open: false, request: null });
      setRejectReason('');
      removeRequestAnimated(id);
    } catch {
      showError('Failed to reject the request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader size="lg" text="Loading pending requests…" />
      </div>
    );
  }

  // ---- Empty ----
  if (requests.length === 0) {
    return (
      <div className="py-20">
        <EmptyState
          icon={CheckCircle}
          iconClassName="text-emerald-500"
          title="All Caught Up!"
          description="There are no pending booking requests at the moment."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800">Pending Requests</h2>
        <Badge variant="warning">{requests.length}</Badge>
      </div>

      {/* Request Cards */}
      <div className="space-y-5">
        {requests.map((req) => {
          const id = req.id || req.bookingId;
          const isRemoving = removingIds.has(id);
          const isExpanded = expandedCards[id];
          const companions = req.accompanyingPeople || req.companions || [];

          return (
            <div
              key={id}
              className={`transition-all duration-300 ${
                isRemoving ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100'
              }`}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Header Row */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-slate-400" />
                      <span className="font-mono text-sm font-semibold text-slate-700">
                        {id}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Submitted{' '}
                      {req.createdAt || req.submittedAt
                        ? new Date(req.createdAt || req.submittedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                  </div>

                  {/* Student Info */}
                  <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4">
                    <Avatar name={req.studentName || 'Student'} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">
                        {req.studentName || '—'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        {(req.enrollmentNumber || req.enrollmentNo) && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {req.enrollmentNumber || req.enrollmentNo}
                          </span>
                        )}
                        {req.department && (
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {req.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Room Info */}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-sky-500" />
                    <span className="font-medium">
                      {req.room || req.roomName || '—'}
                    </span>
                    {(req.building || req.location) && (
                      <span className="text-slate-400">
                        · {req.building || req.location}
                      </span>
                    )}
                  </div>

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                        <Calendar className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Date
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {req.date
                            ? new Date(req.date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                        <Clock className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Time Slot
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {req.timeSlot || req.time || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
                        <Users className="h-4 w-4 text-teal-500" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          People
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {req.people ?? req.numberOfPeople ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Accompanying People (collapsible) */}
                  {companions.length > 0 && (
                    <div className="rounded-lg border border-slate-100">
                      <button
                        onClick={() => toggleExpand(id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors rounded-lg"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          Accompanying People ({companions.length})
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                          {companions.map((person, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-slate-700">
                                {person.name || person.studentName || `Person ${i + 1}`}
                              </span>
                              <span className="font-mono text-xs text-slate-400">
                                {person.collegeId || person.enrollmentNo || person.id || '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Purpose */}
                  {(req.purpose || req.reason) && (
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Purpose of Booking
                      </p>
                      <div className="rounded-lg border-l-4 border-sky-400 bg-sky-50/50 px-4 py-3">
                        <p className="text-sm leading-relaxed text-slate-600 italic">
                          "{req.purpose || req.reason}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                    <Button
                      onClick={() => setRejectDialog({ open: true, request: req })}
                      className="flex items-center justify-center gap-2 rounded-lg bg-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors sm:order-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => setApproveDialog({ open: true, request: req })}
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors sm:order-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Approve Dialog */}
      <ConfirmDialog
        isOpen={approveDialog.open}
        onClose={() => {
          if (!actionLoading) setApproveDialog({ open: false, request: null });
        }}
        onConfirm={handleApprove}
        title="Approve Booking Request"
        message={`Are you sure you want to approve the room booking request by ${
          approveDialog.request?.studentName || 'this student'
        } for ${approveDialog.request?.room || approveDialog.request?.roomName || 'the room'}?`}
        confirmText="Approve"
        variant="success"
        loading={actionLoading}
      />

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={rejectDialog.open}
        onClose={() => {
          if (!actionLoading) {
            setRejectDialog({ open: false, request: null });
            setRejectReason('');
          }
        }}
        onConfirm={handleReject}
        title="Reject Booking Request"
        message="Are you sure you want to reject this booking request?"
        confirmText="Reject"
        variant="danger"
        loading={actionLoading}
      >
        <div className="mt-3">
          <TextArea
            label="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target?.value ?? e)}
            placeholder="Provide a reason for rejection…"
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
