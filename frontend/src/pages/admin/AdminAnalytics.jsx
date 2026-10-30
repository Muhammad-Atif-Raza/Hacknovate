import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Building,
  Users,
  Calendar,
  Layers,
  Activity,
  Download,
  Sparkles
} from 'lucide-react';
import { analyticsService } from '../../services/extraServices';

export const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await analyticsService.getDashboardAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const stats = data?.stats || {};
  const acoustic = data?.acoustic_breakdown || {};
  const buildings = data?.building_breakdown || {};

  const handleExportSummary = () => {
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', 'campus_facility_analytics.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Resource Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Facility Utilization Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time metrics on room consumption, noise profile distributions, and booking velocity</p>
        </div>

        <button
          onClick={handleExportSummary}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Analytics JSON</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Utilization Efficiency</span>
          <h3 className="text-3xl font-extrabold text-blue-600 mt-1">{stats.utilization_rate || 0}%</h3>
          <p className="text-[11px] text-slate-400 mt-1">Based on active vs total venue hours</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Bookings Executed</span>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.total_bookings || 0}</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">{stats.approved_bookings || 0} Successful approvals</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Registered Students</span>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.total_students || 0}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Verified college email domains</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Inventory</span>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.total_rooms || 0}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Across 4 major campus blocks</p>
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acoustic Demand */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Acoustic Zone Booking Demand</h3>
              <p className="text-xs text-slate-500">Distribution of student reservations across noise tolerance zones</p>
            </div>
            <Layers className="w-5 h-5 text-purple-600" />
          </div>

          <div className="space-y-4">
            {['Silent Study Zone', 'Collaborative Discussion', 'Amplified Sound Permitted'].map((prof) => {
              const count = acoustic[prof] || 0;
              const total = stats.total_bookings || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={prof} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{prof}</span>
                    <span className="text-slate-500 font-mono">{count} reservations ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        prof.includes('Silent') ? 'bg-purple-600' : prof.includes('Collab') ? 'bg-blue-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Building Density */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Facility Complex Distribution</h3>
              <p className="text-xs text-slate-500">Occupancy density across college architectural complexes</p>
            </div>
            <Building className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="space-y-3">
            {Object.entries(buildings).map(([bld, cnt]) => (
              <div key={bld} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">{bld}</span>
                  <span className="text-[11px] text-slate-400">Campus Sector</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-slate-900">{cnt}</span>
                  <span className="text-[10px] text-slate-500 block uppercase">Allocations</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
