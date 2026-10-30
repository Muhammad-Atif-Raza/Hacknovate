import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarPlus,
  UserCheck,
  LogOut,
  MapPin,
  Clock,
  ClipboardList,
  Sliders,
  Wrench,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const studentLinks = [
    { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/apply', icon: CalendarPlus, label: 'Apply for Room' },
    { to: '/student/standby', icon: Clock, label: 'Standby Waitlist' },
    { to: '/campus-map', icon: MapPin, label: 'Interactive Campus Map' },
    { to: '/student/profile', icon: UserCheck, label: 'My Profile' },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/pending', icon: ClipboardList, label: 'Pending Requests' },
    { to: '/admin/bookings', icon: CalendarPlus, label: 'All Bookings' },
    { to: '/admin/rooms', icon: Sliders, label: 'Room Management' },
    { to: '/admin/maintenance', icon: Wrench, label: 'Maintenance & Lockout' },
    { to: '/campus-map', icon: MapPin, label: 'Campus Map' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/profile', icon: ShieldCheck, label: 'Admin Profile' },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* Role Pill Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isAdmin ? 'Administrator Portal' : 'Student Portal'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
        </div>
        <p className="text-xs text-slate-500 mt-1 truncate">{user?.department || 'Authorized Session'}</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Switcher / Sign Out */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
