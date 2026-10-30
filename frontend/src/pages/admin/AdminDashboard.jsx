import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  BarChart3,
  Users,
  CalendarPlus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Activity,
  Sparkles
} from 'lucide-react';
import { analyticsService } from '../../services/extraServices';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await analyticsService.getDashboardAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load admin analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats || {};
  const acoustic = data?.acoustic_breakdown || {};
  const buildings = data?.building_breakdown || {};
  const recentLogs = data?.recent_logs || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-950 to-navy-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Central Campus Facilities Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Facilities Overview & Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Real-time tracking of {stats.total_rooms || 9} campus rooms, approval workflows, and emergency locks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/pending"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition shadow-md shrink-0"
          >
            <Clock className="w-4 h-4" />
            <span>Review Pending ({stats.pending_requests || 0})</span>
          </Link>
          <Link
            to="/admin/maintenance"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition shrink-0"
          >
            <Wrench className="w-4 h-4" />
            <span>Emergency Lockout</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Venues</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_rooms || 0}</h3>
            <span className="text-[11px] text-emerald-600 font-medium">{stats.available_rooms || 0} Ready</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Approval</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{stats.pending_requests || 0}</h3>
            <span className="text-[11px] text-amber-700 font-medium">Requires review</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Approved Bookings</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.approved_bookings || 0}</h3>
            <span className="text-[11px] text-slate-500">{stats.checked_in_bookings || 0} Checked in</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Under Maintenance</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-0.5">{stats.maintenance_rooms || 0}</h3>
            <span className="text-[11px] text-rose-600 font-medium">Locked resources</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle Grid: Utilization Rate & Acoustic Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Gauge */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Campus Facility Utilization
              </h3>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-500">Live proportion of active sessions across available inventory.</p>

            <div className="my-6 text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-blue-600/20 bg-blue-50/50">
                <div>
                  <span className="text-3xl font-extrabold text-slate-900">{stats.utilization_rate || 0}%</span>
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase mt-0.5">Active Use</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Occupied Rooms:</span>
              <strong className="text-slate-900">{stats.occupied_rooms || 0}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Maintenance Locked:</span>
              <strong className="text-rose-600">{stats.maintenance_rooms || 0}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Ready for Booking:</span>
              <strong className="text-emerald-600">{stats.available_rooms || 0}</strong>
            </div>
          </div>
        </div>

        {/* Acoustic Category Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Acoustic Profile Density
              </h3>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-slate-500">Reservation volume grouped by room noise compliance classification.</p>

            <div className="mt-6 space-y-4">
              {['Silent Study Zone', 'Collaborative Discussion', 'Amplified Sound Permitted'].map((cat) => {
                const count = acoustic[cat] || 0;
                const total = stats.total_bookings || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{cat}</span>
                      <span className="font-mono text-slate-500">{count} bookings ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.includes('Silent') ? 'bg-purple-600' : cat.includes('Collab') ? 'bg-blue-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/admin/rooms"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-between"
            >
              <span>Manage room acoustic profiles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Complex Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Building Activity
              </h3>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500">Occupancy load across campus architectural zones.</p>

            <div className="mt-6 space-y-3">
              {Object.keys(buildings).length === 0 ? (
                <p className="text-xs text-slate-400">Loading building stats...</p>
              ) : (
                Object.entries(buildings).map(([bld, cnt]) => (
                  <div key={bld} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                    <span className="font-medium text-slate-700 truncate">{bld}</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {cnt}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/campus-map"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-between"
            >
              <span>View interactive campus map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Occupancy Logs & Quick Action Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Campus Facility Audit Trail</h2>
            <p className="text-xs text-slate-500">Audit logs of check-ins, automated no-show expiries, and maintenance locks</p>
          </div>
          <Link
            to="/admin/bookings"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All Reservations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No recent occupancy events recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.event_type === 'CHECK_IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.event_type === 'AUTO_RELEASE'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.event_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{log.room_number || `Room #${log.room_id}`}</td>
                    <td className="px-4 py-3 text-slate-700">{log.details}</td>
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
