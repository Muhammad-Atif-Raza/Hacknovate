import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  QrCode,
  ShieldCheck,
  Sparkles,
  MapPin,
  ArrowRight,
  Clock,
  Volume2,
  Users,
  CheckCircle,
  LogIn
} from 'lucide-react';
import { roomService } from '../services/roomService';
import { StatusBadge } from '../components/common/StatusBadge';
import { AcousticBadge } from '../components/common/AcousticBadge';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const [featuredRooms, setFeaturedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomService.getRooms();
        setFeaturedRooms(data.slice(0, 4));
      } catch (err) {
        console.error('Failed to load featured rooms', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Official University Facility Reservation System
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Campus Resource Hub
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Eliminate informal WhatsApp requests and paper registers. Experience conflict-free digital room bookings, acoustic category indexing, QR attendance validation, and dynamic standby reassignment.
          </p>

          {/* Call to Actions */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/student/dashboard')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30"
              >
                <span>Go to {isAdmin ? 'Admin Dashboard' : 'Student Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/student/apply"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30"
                >
                  <span>Book a Room Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Portal Sign In</span>
                </Link>
              </>
            )}

            <Link
              to="/campus-map"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold text-sm transition-all backdrop-blur"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Interactive Campus Map</span>
            </Link>
          </div>

          {/* Official Demo Credentials for Teachers */}
          <div className="pt-8 max-w-xl mx-auto">
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-left text-xs text-slate-300 space-y-2 shadow-inner">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white">Faculty & Evaluator Test Credentials:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="text-blue-400 font-semibold block">Student Account:</span>
                  <p>Email: <code className="text-white font-mono">tanmay.sharma@st.niituniversity.in</code></p>
                  <p>Pass: <code className="text-slate-400 font-mono">StudentPassword123!</code></p>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="text-amber-400 font-semibold block">Admin Account:</span>
                  <p>Email: <code className="text-white font-mono">admin@niituniversity.in</code></p>
                  <p>Pass: <code className="text-slate-400 font-mono">AdminPassword123!</code></p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Student accounts are strictly restricted to @st.niituniversity.in addresses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Engineered for Modern Campus Facilities
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            A comprehensive, rule-based reservation engine designed to replace paper registers with strict conflict prevention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Conflict-Free Engine</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Database-level atomic locks prevent overlapping bookings for the same room across parallel administrator approvals.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Volume2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Acoustic Classification</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Every room is indexed as Silent Study, Collaborative Discussion, or Amplified Sound to match event acoustics with facility rules.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">15-Min QR Check-In</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Cryptographically signed QR tokens validate presence at venue. Unchecked reservations are auto-released after 15 minutes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Dynamic Standby Queue</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Waitlist students receive automated 3-minute claim offers when a slot opens due to no-shows or early releases.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Campus Venues Preview */}
      <section className="bg-white py-16 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Featured Campus Venues</h2>
              <p className="text-xs text-slate-500 mt-1">Live status across science, engineering, library, and arts complexes</p>
            </div>
            <Link
              to="/student/apply"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Browse all rooms <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredRooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img
                      src={room.image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80'}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={room.status} />
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {room.building}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-0.5 group-hover:text-blue-600 transition-colors">
                        {room.room_number} - {room.name}
                      </h3>
                      <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Cap: {room.capacity}
                        </span>
                        <AcousticBadge profile={room.acoustic_profile} />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <Link
                        to={`/student/apply?roomId=${room.id}`}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-navy-900 hover:text-white text-slate-700 font-semibold text-xs transition-colors"
                      >
                        Select Venue
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            <span className="text-white font-bold">Campus Resource Hub</span>
            <span className="text-slate-600">|</span>
            <span>Intelligent Campus Management</span>
          </div>
          <p>© 2026 Campus Resource Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
