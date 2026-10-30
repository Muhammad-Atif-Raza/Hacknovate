import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User as UserIcon, LogOut, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center shadow-md shadow-navy-900/10 group-hover:bg-blue-600 transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
                Campus Resource Hub
                <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  Smart v1.0
                </span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block">Centralised Campus Facility Reservation</p>
            </div>
          </Link>
        </div>

        {/* Center / Greeting */}
        {isAuthenticated && user && (
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              {getGreeting()},{' '}
              <strong className="text-slate-900 font-semibold">{user.full_name}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-medium text-slate-500 capitalize">
              {isAdmin ? 'Administrator' : user.department}
            </span>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <NotificationDropdown />

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  to={isAdmin ? '/admin/profile' : '/student/profile'}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <img
                    src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name}`}
                    alt={user?.full_name}
                    className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                  />
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{user?.role}</p>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/login?tab=register"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-navy-900 hover:bg-blue-700 transition-colors shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
