import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  QrCode,
  Calendar,
  Building,
  Users,
  ArrowRight,
  Filter,
  Eye,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QRModal } from '../../components/common/QRModal';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQRBookingId, setSelectedQRBookingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Compute summary stats
  const totalBookings = bookings.length;
  const approvedBookings = bookings.filter((b) => b.status === 'APPROVED' || b.status === 'CHECKED_IN').length;
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING').length;
  const rejectedBookings = bookings.filter((b) => b.status === 'REJECTED').length;

  // Find active / upcoming approved reservation that has QR code ready
  const activeReservation = bookings.find(
    (b) => (b.status === 'APPROVED' || b.status === 'CHECKED_IN')
  );

  const filteredBookings = statusFilter === 'ALL'
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(`Are you sure you want to cancel reservation #${bookingId}?`)) return;
    try {
      await bookingService.cancelBooking(bookingId);
      await fetchBookings();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel booking.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Student Reservation Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {user?.department} • ID: <span className="font-mono text-blue-300">{user?.enrollment_number || 'N/A'}</span>
          </p>
        </div>

        <Link
          to="/student/apply"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/30 shrink-0"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Apply for a Room</span>
        </Link>
      </div>

      {/* Active Reservation Alert / Action (if any) */}
      {activeReservation && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Confirmed Active Reservation
                </span>
                <StatusBadge status={activeReservation.status} size="xs" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mt-0.5">
                {activeReservation.room?.room_number} - {activeReservation.room?.name}
              </h3>
              <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                <span className="font-medium text-slate-800">Date: {activeReservation.booking_date}</span>
                <span>•</span>
                <span className="font-medium text-slate-800">Time: {activeReservation.start_time} - {activeReservation.end_time}</span>
                <span>•</span>
                <span>ID: {activeReservation.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedQRBookingId(activeReservation.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-all shadow-sm shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>Open 15-Min Check-In QR</span>
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bookings</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalBookings}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Approved / Active</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{approvedBookings}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Under Review</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingBookings}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rejected</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{rejectedBookings}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Booking History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header & Filter Tabs */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Booking History</h2>
            <p className="text-xs text-slate-500">Track permission progress and attendance status</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
            {['ALL', 'PENDING', 'APPROVED', 'CHECKED_IN', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Bookings' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Loading reservations...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">No reservations found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not have any bookings matching this status filter. Apply for a campus room to get started.
            </p>
            <Link
              to="/student/apply"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-900 text-white font-medium text-xs hover:bg-blue-600 transition"
            >
              Apply for Room
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Booking ID</th>
                  <th className="px-5 py-3.5">Room & Venue</th>
                  <th className="px-5 py-3.5">Date & Slot</th>
                  <th className="px-5 py-3.5">Party Size</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900">
                      {b.id}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {b.room?.room_number || 'Room'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {b.room?.name} • {b.room?.building}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{b.booking_date}</div>
                      <div className="text-[11px] text-slate-500">{b.start_time} - {b.end_time}</div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {b.number_of_people} students
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={b.status} />
                      {b.rejection_reason && (
                        <p className="text-[10px] text-rose-600 mt-1 line-clamp-1" title={b.rejection_reason}>
                          Reason: {b.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Check In / QR action if approved */}
                        {(b.status === 'APPROVED' || b.status === 'CHECKED_IN') && (
                          <button
                            onClick={() => setSelectedQRBookingId(b.id)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1 font-semibold text-xs px-2.5"
                            title="Show QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR Pass</span>
                          </button>
                        )}

                        {/* Track permission */}
                        <Link
                          to={`/student/permission-waiting?bookingId=${b.id}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="Track Application"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* Cancel if pending */}
                        {b.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Cancel Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Modal Component */}
      <QRModal
        bookingId={selectedQRBookingId}
        isOpen={!!selectedQRBookingId}
        onClose={() => setSelectedQRBookingId(null)}
        onCheckinSuccess={() => fetchBookings()}
      />
    </div>
  );
};
