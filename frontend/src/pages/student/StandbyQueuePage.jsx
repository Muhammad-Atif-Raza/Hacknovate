import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import { standbyService } from '../../services/extraServices';
import { useNavigate } from 'react-router-dom';

export const StandbyQueuePage = () => {
  const [standbyEntries, setStandbyEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  const navigate = useNavigate();

  const fetchStandby = async () => {
    try {
      const data = await standbyService.getMyStandby();
      setStandbyEntries(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandby();
    const interval = setInterval(fetchStandby, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update clock every second for live 3-minute claim countdowns
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const handleClaim = async (entry) => {
    setClaimingId(entry.id);
    try {
      const booked = await standbyService.claimStandby(entry.id);
      alert(`Success! Room ${entry.room?.room_number || ''} has been booked for you (Ref: #${booked.id}).`);
      navigate('/student/dashboard');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to claim standby slot.');
      fetchStandby();
    } finally {
      setClaimingId(null);
    }
  };

  const handleLeave = async (entryId) => {
    if (!window.confirm('Remove yourself from this standby queue?')) return;
    try {
      await standbyService.leaveStandby(entryId);
      fetchStandby();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to leave standby queue.');
    }
  };

  const getRemainingClaimTime = (deadlineStr) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr).getTime();
    const diff = deadline - currentTime;
    if (diff <= 0) return '00:00 (Expired)';
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
          <Clock className="w-4 h-4" />
          <span>Dynamic Standby System</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Your Standby Queue Waitlists</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          When confirmed bookings are auto-released due to 15-minute no-shows, our backend algorithm offers the slot to the earliest waiting student with an automated 3-minute priority claim window.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading waitlist entries...
        </div>
      ) : standbyEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No Active Standby Waitlists</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            If a desirable room is fully booked, you can join its standby queue directly from the search results page.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {standbyEntries.map((entry) => {
            const isOffered = entry.status === 'OFFERED';
            const remaining = isOffered ? getRemainingClaimTime(entry.claim_deadline) : null;

            return (
              <div
                key={entry.id}
                className={`p-5 rounded-2xl border shadow-sm transition-all ${
                  isOffered
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isOffered
                          ? 'bg-amber-200 text-amber-900 animate-pulse'
                          : entry.status === 'CLAIMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.status === 'EXPIRED'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isOffered ? '⚡ Slot Offered! 3-Min Window' : entry.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        Requested: {entry.booking_date}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {entry.room?.room_number} - {entry.room?.name}
                    </h3>

                    <p className="text-xs text-slate-600 mt-1">
                      Time Slot: <strong className="text-slate-800">{entry.start_time} - {entry.end_time}</strong> • Venue: {entry.room?.building}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    {isOffered && (
                      <div className="text-right mr-2">
                        <span className="text-[10px] text-amber-800 font-semibold uppercase block">
                          Claim Deadline:
                        </span>
                        <span className="text-sm font-mono font-bold text-rose-600">
                          {remaining}
                        </span>
                      </div>
                    )}

                    {isOffered ? (
                      <button
                        onClick={() => handleClaim(entry)}
                        disabled={claimingId === entry.id}
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/30 flex items-center gap-2 animate-bounce transition"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{claimingId === entry.id ? 'Claiming...' : 'Claim Slot Now'}</span>
                      </button>
                    ) : entry.status === 'WAITING' ? (
                      <button
                        onClick={() => handleLeave(entry.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Leave waitlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
