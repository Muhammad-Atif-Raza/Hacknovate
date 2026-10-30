import React, { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  RefreshCw,
  Plus,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { maintenanceService } from '../../services/extraServices';
import { roomService } from '../../services/roomService';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminMaintenance = () => {
  const [records, setRecords] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lockout Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [title, setTitle] = useState('HVAC Air Filtration & Acoustic Dampening Calibration');
  const [reason, setReason] = useState('Scheduled quarterly maintenance and acoustic isolation testing.');
  const [lockStatus, setLockStatus] = useState('UNDER_MAINTENANCE');
  const [lockLoading, setLockLoading] = useState(false);
  const [reassignResult, setReassignResult] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recData, roomData] = await Promise.all([
        maintenanceService.getMaintenanceRecords(),
        roomService.getRooms(),
      ]);
      setRecords(recData || []);
      setRooms(roomData || []);
      if (roomData.length > 0 && !selectedRoomId) {
        setSelectedRoomId(roomData[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLockRoom = async (e) => {
    e.preventDefault();
    setLockLoading(true);
    setReassignResult(null);
    try {
      const res = await maintenanceService.setRoomMaintenance({
        room_id: parseInt(selectedRoomId, 10),
        title: title.trim(),
        reason: reason.trim(),
        new_status: lockStatus,
      });
      setReassignResult(res);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to lock room for maintenance.');
    } finally {
      setLockLoading(false);
    }
  };

  const handleResolve = async (recordId) => {
    if (!window.confirm('Mark this maintenance as completed and restore venue to AVAILABLE?')) return;
    try {
      await maintenanceService.resolveMaintenance(recordId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve maintenance.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <Wrench className="w-4 h-4" />
            <span>Facility Resilience</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance & Emergency Lockout</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            When a room is marked for maintenance, the intelligent rule-based engine automatically detects affected future reservations, reassigns them to matching alternative rooms, and dispatches student notifications.
          </p>
        </div>

        <button
          onClick={() => {
            setReassignResult(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-600/20 shrink-0"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Lock Venue for Maintenance</span>
        </button>
      </div>

      {/* Auto-Reassignment Result Alert */}
      {reassignResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-emerald-900">
                Automated Conflict Prevention & Reassignment Executed!
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                {reassignResult.affected_count} reservations were affected by this lockout.{' '}
                <strong className="font-semibold text-emerald-900">{reassignResult.reassigned_count} reservations</strong> were seamlessly reassigned to alternative matching rooms without conflicts.
              </p>
            </div>
          </div>

          {reassignResult.details && reassignResult.details.length > 0 && (
            <div className="bg-white rounded-xl border border-emerald-200/60 p-3 text-xs space-y-1.5">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Reassigned Student Reservations:
              </span>
              {reassignResult.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-slate-600 border-b border-slate-100 last:border-0 pb-1">
                  <span>
                    <strong>#{d.booking_id}</strong> ({d.student_name}) on {d.date} {d.time}
                  </span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    Moved to: {d.reassigned_room}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Maintenance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Facility Maintenance History</h2>
          <p className="text-xs text-slate-500">Record of facility lockouts and automated reassignments</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading maintenance history...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No maintenance records logged.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Venue</th>
                  <th className="px-5 py-3.5">Title & Reason</th>
                  <th className="px-5 py-3.5">Affected / Reassigned</th>
                  <th className="px-5 py-3.5">Lockout Status</th>
                  <th className="px-5 py-3.5">Initiated</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{r.room_number}</div>
                      <div className="text-[11px] text-slate-500">{r.building}</div>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-semibold text-slate-900">{r.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{r.reason}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-900">{r.affected_bookings_count} affected</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'ACTIVE' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {r.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleResolve(r.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition border border-emerald-200"
                        >
                          Resolve & Unlock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lockout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <ShieldAlert className="w-5 h-5" />
              <h3>Initiate Facility Maintenance Lockout</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Locking this venue will immediately halt future bookings. The system will search for suitable available alternative venues for all affected reservations and notify students.
            </p>

            <form onSubmit={handleLockRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Campus Venue</label>
                <select
                  required
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_number} - {r.name} ({r.building}) [Status: {r.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance Title / Issue</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Projector replacement or HVAC servicing"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Reason</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe necessary repairs..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Venue Status</label>
                <select
                  value={lockStatus}
                  onChange={(e) => setLockStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                >
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE (Urgent Repair)</option>
                  <option value="TEMPORARILY_UNAVAILABLE">TEMPORARILY_UNAVAILABLE (Administrative Hold)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={lockLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
                >
                  {lockLoading ? 'Reassigning...' : 'Lock Venue & Reassign Bookings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
