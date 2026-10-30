import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  Building,
  Edit2,
  Check,
  AlertCircle,
  Save,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { bookingService } from '../../services/bookingService';
import { StatusBadge } from '../../components/common/StatusBadge';

export const StudentProfile = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [course, setCourse] = useState(user?.course || '');
  const [year, setYear] = useState(user?.year || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  const [bookings, setBookings] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await bookingService.getMyBookings();
        setBookings(data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, []);

  const totalBookings = bookings.length;
  const approvedBookings = bookings.filter((b) => b.status === 'APPROVED' || b.status === 'CHECKED_IN').length;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      await authService.updateProfile({
        full_name: fullName,
        department,
        course,
        year,
        avatar_url: avatarUrl,
      });
      await refreshUser();
      setIsEditing(false);
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`}
              alt={fullName}
              className="w-24 h-24 rounded-2xl border-2 border-slate-200 object-cover shadow-md"
            />
            <span className="absolute -bottom-2 -right-2 bg-emerald-500 border-2 border-white text-white p-1 rounded-full text-xs">
              <Check className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{user?.full_name}</h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: <span className="text-blue-600 font-semibold">{user?.enrollment_number || 'ENR2024CS042'}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{user?.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{user?.course || 'Undergraduate'} ({user?.year || 'Current'})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Reservations</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalBookings}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200/60">
            <span className="text-[11px] text-emerald-700 uppercase font-semibold">Approved Allocations</span>
            <p className="text-xl font-bold text-emerald-800 mt-0.5">{approvedBookings}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200/60 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-blue-700 uppercase font-semibold">Verified Identity</span>
            <p className="text-xs font-bold text-blue-800 mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Active College Member
            </p>
          </div>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
          msg.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {msg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Edit Profile Form */}
      {isEditing && (
        <form onSubmit={handleUpdate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-fadeIn">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Update Permitted Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year / Cohort</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600"
              >
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
                <option>Postgraduate / PhD</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Booking History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Complete Student Booking History</h2>
        {bookings.length === 0 ? (
          <p className="text-xs text-slate-500">No previous bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Date & Slot</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{b.id}</td>
                    <td className="px-4 py-3">{b.room?.room_number} - {b.room?.name}</td>
                    <td className="px-4 py-3">{b.booking_date} ({b.start_time}-{b.end_time})</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} size="xs" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
