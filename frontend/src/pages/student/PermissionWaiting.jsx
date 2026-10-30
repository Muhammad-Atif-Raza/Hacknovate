import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Building,
  Calendar,
  Users,
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  QrCode,
  AlertCircle
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QRModal } from '../../components/common/QRModal';

export const PermissionWaiting = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBookingDetails = async () => {
      try {
        const myBookings = await bookingService.getMyBookings();
        const found = myBookings.find((b) => b.id === bookingId);
        setBooking(found || null);
      } catch (err) {
        console.error('Failed to load booking details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
    // Poll every 10 seconds to catch live approval
    const interval = setInterval(fetchBookingDetails, 10000);
    return () => clearInterval(interval);
  }, [bookingId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-slate-400 text-sm">
        Retrieving application record...
      </div>
    );
  }

  const isApproved = booking?.status === 'APPROVED' || booking?.status === 'CHECKED_IN';
  const isRejected = booking?.status === 'REJECTED';
  const isPending = booking?.status === 'PENDING';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Submission Alert Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
          <Clock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Application Submitted Successfully</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Your reservation request has been dispatched to the facilities administrator. Do not visit or occupy the room until administrative authorization is confirmed.
        </p>
      </div>

      {/* Visual Progress Indicator */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-6 text-center sm:text-left">
          Application Life-Cycle Progress
        </h3>

        <div className="relative flex items-center justify-between max-w-xl mx-auto px-4">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-slate-200 z-0">
            <div
              className={`h-full transition-all duration-500 ${
                isApproved ? 'bg-emerald-500 w-full' : isRejected ? 'bg-rose-500 w-full' : 'bg-blue-600 w-1/2'
              }`}
            />
          </div>

          {/* Step 1: Application Submitted */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 mt-2">Submitted</span>
            <span className="text-[10px] text-slate-400">Recorded</span>
          </div>

          {/* Step 2: Under Review */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all ${
                isPending
                  ? 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-100'
                  : isApproved || isRejected
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 mt-2">Under Review</span>
            <span className="text-[10px] text-slate-400">Admin Evaluation</span>
          </div>

          {/* Step 3: Approved / Rejected */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all ${
                isApproved
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                  : isRejected
                  ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isRejected ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <span className="text-xs font-semibold text-slate-800 mt-2">
              {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Final Status'}
            </span>
            <span className="text-[10px] text-slate-400">
              {isApproved ? 'QR Code Ready' : isRejected ? 'Slot Released' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Booking Details Summary */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Application Reference</span>
            <h2 className="text-lg font-bold font-mono text-slate-900">{bookingId}</h2>
          </div>
          <StatusBadge status={booking?.status || 'PENDING'} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block mb-0.5">Requested Venue</span>
            <span className="font-semibold text-slate-900 text-sm">
              {booking?.room?.room_number} - {booking?.room?.name}
            </span>
            <span className="text-[11px] text-slate-500 block">{booking?.room?.building}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Date & Slot</span>
            <span className="font-semibold text-slate-900 text-sm">{booking?.booking_date}</span>
            <span className="text-[11px] text-slate-500 block">{booking?.start_time} - {booking?.end_time}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Party Size</span>
            <span className="font-semibold text-slate-900 text-sm">{booking?.number_of_people} Attendees</span>
          </div>
        </div>

        {booking?.purpose && (
          <div className="pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 block mb-0.5">Stated Purpose</span>
            <p className="text-slate-800 font-medium">{booking.purpose}</p>
          </div>
        )}

        {isApproved && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-sm">Official Approval Granted!</p>
              <p className="mt-0.5 text-emerald-700">
                You can now view and scan your 15-minute QR access code upon arrival at the venue.
              </p>
            </div>
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <QrCode className="w-4 h-4" />
              <span>Show QR Code</span>
            </button>
          </div>
        )}

        {isRejected && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <p className="font-bold text-sm">Application Declined</p>
            <p className="mt-0.5 text-rose-700">
              Reason: {booking?.rejection_reason || 'Administrative conflict or policy compliance.'}
            </p>
          </div>
        )}
      </div>

      {/* Return to Dashboard */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to="/student/dashboard"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>

        <Link
          to="/student/apply"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-900 hover:bg-blue-600 text-white font-semibold text-xs transition shadow-sm"
        >
          <span>Submit Another Request</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* QR Modal if approved */}
      <QRModal
        bookingId={bookingId}
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />
    </div>
  );
};
