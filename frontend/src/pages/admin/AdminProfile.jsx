import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/extraServices';

export const AdminProfile = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await analyticsService.getDashboardAnalytics();
        setStats(res?.stats || {});
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'}
            alt={user?.full_name}
            className="w-28 h-28 rounded-2xl border-2 border-slate-200 object-cover shadow-md"
          />

          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Authorized Campus Administrator
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{user?.full_name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{user?.department}</p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Role: Full Super-Admin Permissions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Performance Stats */}
        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Requests Processed</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total_bookings || 0}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Campus facility applications</p>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200/60">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Applications Approved</span>
            <p className="text-2xl font-extrabold text-emerald-800 mt-1">{stats.approved_bookings || 0}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Conflict-free reservations</p>
          </div>

          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200/60">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Applications Declined</span>
            <p className="text-2xl font-extrabold text-rose-800 mt-1">{stats.rejected_bookings || 0}</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Policy compliance rejections</p>
          </div>
        </div>
      </div>
    </div>
  );
};
