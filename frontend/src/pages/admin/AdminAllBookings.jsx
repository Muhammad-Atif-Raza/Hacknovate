import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  RefreshCw,
  Building,
  Users,
  Eye,
  Trash2,
  QrCode
} from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QRModal } from '../../components/common/QRModal';

export const AdminAllBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedQRBookingId, setSelectedQRBookingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getAllBookings();
      setBookings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm(`Revoke reservation #${id}?`)) return;
    try {
      await bookingService.cancelBooking(id);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel reservation.');
    }
  };

  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchSearch =
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.user?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.room?.room_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.room?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Campus Reservations</h1>
          <p className="text-xs text-slate-500 mt-1">Master administrative ledger of bookings and occupancy logs</p>
        </div>

        <button
          onClick={fetchBookings}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ID, student, or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'APPROVED', 'CHECKED_IN', 'PENDING', 'EXPIRED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No reservations matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Student Applicant</th>
                  <th className="px-5 py-3.5">Room & Venue</th>
                  <th className="px-5 py-3.5">Date & Slot</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900">{b.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{b.user?.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{b.user?.enrollment_number}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{b.room?.room_number}</div>
                      <div className="text-[11px] text-slate-500">{b.room?.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{b.booking_date}</div>
                      <div className="text-[11px] text-slate-500">{b.start_time} - {b.end_time}</div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.status === 'APPROVED' && (
                          <button
                            onClick={() => setSelectedQRBookingId(b.id)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            title="Inspect QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                        {b.status !== 'CANCELLED' && b.status !== 'EXPIRED' && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Revoke reservation"
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

      <QRModal
        bookingId={selectedQRBookingId}
        isOpen={!!selectedQRBookingId}
        onClose={() => setSelectedQRBookingId(null)}
      />
    </div>
  );
};
