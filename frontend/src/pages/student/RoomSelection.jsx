import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
  Tv,
  Check,
  ChevronDown,
  Edit2,
  Building,
  Volume2,
  AlertTriangle,
  Lightbulb,
  CornerDownRight,
  BookmarkPlus
} from 'lucide-react';
import { recommendationService, standbyService } from '../../services/extraServices';
import { roomService } from '../../services/roomService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AcousticBadge } from '../../components/common/AcousticBadge';

export const RoomSelection = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const people = parseInt(searchParams.get('people') || '25', 10);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const start = searchParams.get('start') || '10:00';
  const end = searchParams.get('end') || '12:00';
  const facilitiesParam = searchParams.get('facilities') || '';
  const requiredFacilities = facilitiesParam ? facilitiesParam.split(',') : [];
  const acoustic = searchParams.get('acoustic') || 'Collaborative Discussion';

  const [exactRooms, setExactRooms] = useState([]);
  const [alternativeSlots, setAlternativeSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [selectedBuilding, setSelectedBuilding] = useState('ALL');
  const [selectedAcoustic, setSelectedAcoustic] = useState('ALL');
  const [sortBy, setSortBy] = useState('RECOMMENDED'); // RECOMMENDED, CAPACITY_ASC, CAPACITY_DESC
  const [isEditSearchOpen, setIsEditSearchOpen] = useState(false);

  // Standby join state
  const [standbySuccessMsg, setStandbySuccessMsg] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await recommendationService.getRecommendations({
        number_of_people: people,
        booking_date: date,
        start_time: start,
        end_time: end,
        required_facilities: requiredFacilities,
        acoustic_preference: acoustic,
      });

      setExactRooms(data.exact_matches || []);
      setAlternativeSlots(data.alternative_slots || []);
    } catch (err) {
      console.error('Failed to get recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [people, date, start, end, facilitiesParam, acoustic]);

  // Filtering
  let displayedRooms = [...exactRooms];

  if (selectedBuilding !== 'ALL') {
    displayedRooms = displayedRooms.filter((r) => r.building === selectedBuilding);
  }
  if (selectedAcoustic !== 'ALL') {
    displayedRooms = displayedRooms.filter((r) => r.acoustic_profile === selectedAcoustic);
  }

  // Sorting
  if (sortBy === 'CAPACITY_ASC') {
    displayedRooms.sort((a, b) => a.capacity - b.capacity);
  } else if (sortBy === 'CAPACITY_DESC') {
    displayedRooms.sort((a, b) => b.capacity - a.capacity);
  } else {
    // Suitability Score descending
    displayedRooms.sort((a, b) => (b.suitability_score || 0) - (a.suitability_score || 0));
  }

  const handleContinue = (room, overrideSlot = null) => {
    const bookingParams = new URLSearchParams({
      roomId: room.room_id || room.id,
      roomNumber: room.room_number,
      roomName: room.name,
      people: people.toString(),
      date,
      start: overrideSlot ? overrideSlot.split(' - ')[0] : start,
      end: overrideSlot ? overrideSlot.split(' - ')[1] : end,
      facilities: facilitiesParam,
    });
    navigate(`/student/book-info?${bookingParams.toString()}`);
  };

  const handleJoinStandby = async (room) => {
    try {
      await standbyService.joinStandby({
        room_id: room.room_id || room.id,
        booking_date: date,
        start_time: start,
        end_time: end,
      });
      setStandbySuccessMsg(`Added to dynamic standby waitlist for ${room.room_number}! You will receive a 3-minute notification if slot is released.`);
      setTimeout(() => setStandbySuccessMsg(''), 6000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to join standby queue.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Skyscanner-Style Compact Search Summary Bar */}
      <div className="bg-navy-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-white">{people} Students</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-white">{date}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-white">{start} - {end}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium text-slate-300">{acoustic}</span>
            </div>

            {requiredFacilities.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
                <span>Equipment: {requiredFacilities.length} items</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/student/apply')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modify Search</span>
            </button>
          </div>
        </div>
      </div>

      {standbySuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{standbySuccessMsg}</span>
        </div>
      )}

      {/* Main Content Area: Left Filter Sidebar + Right Room Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Filter & Sort Panel */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                Filter & Sort
              </h3>
              <button
                onClick={() => {
                  setSelectedBuilding('ALL');
                  setSelectedAcoustic('ALL');
                  setSortBy('RECOMMENDED');
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
              >
                Reset
              </button>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sort Results By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="RECOMMENDED">Smart Match Score (Highest)</option>
                <option value="CAPACITY_ASC">Capacity (Lowest first)</option>
                <option value="CAPACITY_DESC">Capacity (Highest first)</option>
              </select>
            </div>

            {/* Campus Building Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Campus Complex</label>
              <div className="space-y-1.5">
                {[
                  { id: 'ALL', name: 'All Campus Buildings' },
                  { id: 'Aryabhata Science Block', name: 'Aryabhata Science Block' },
                  { id: 'Turing Tech Tower', name: 'Turing Tech Tower' },
                  { id: 'Central Knowledge Library', name: 'Central Knowledge Library' },
                  { id: 'Ramanujan Arts & Seminar Complex', name: 'Ramanujan Arts Complex' },
                ].map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="buildingFilter"
                      checked={selectedBuilding === b.id}
                      onChange={() => setSelectedBuilding(b.id)}
                      className="text-blue-600"
                    />
                    <span className="truncate">{b.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Acoustic Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Acoustic Category</label>
              <div className="space-y-1.5">
                {[
                  'ALL',
                  'Silent Study Zone',
                  'Collaborative Discussion',
                  'Amplified Sound Permitted',
                ].map((ac) => (
                  <label
                    key={ac}
                    className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="acousticFilter"
                      checked={selectedAcoustic === ac}
                      onChange={() => setSelectedAcoustic(ac)}
                      className="text-blue-600"
                    />
                    <span>{ac === 'ALL' ? 'All Profiles' : ac}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Available Room Results */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-900">{displayedRooms.length}</strong> available rooms matching requested criteria
            </span>
            <span className="text-blue-600 font-medium">Ranked by rule-based suitability</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : displayedRooms.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">No Direct Matches for Exact Slot</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  All direct venues matching this size ({people} students) are booked or under maintenance on {date} at {start}-{end}.
                </p>
              </div>
            </div>
          ) : (
            displayedRooms.map((room) => (
              <div
                key={room.room_id || room.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col md:flex-row gap-5 group"
              >
                {/* Room Image */}
                <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                  <img
                    src={room.image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80'}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={room.status} size="xs" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          {room.building} • Floor {room.floor || 1}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5 group-hover:text-blue-600 transition-colors">
                          {room.room_number} - {room.name}
                        </h3>
                      </div>

                      {room.suitability_score && (
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                            {room.suitability_score}% Match
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        Capacity: {room.capacity}
                      </span>
                      <AcousticBadge profile={room.acoustic_profile} />
                    </div>

                    {/* Equipment list */}
                    {room.equipment && room.equipment.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {room.equipment.map((eqName, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200/80"
                          >
                            {eqName}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Rule-based match tags */}
                    {room.match_highlights && room.match_highlights.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {room.match_highlights.map((tag, idx) => (
                          <span key={idx} className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Status: <strong className="text-emerald-600">Available for Reservation</strong>
                    </span>
                    <button
                      onClick={() => handleContinue(room)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-blue-600 text-white font-semibold text-xs transition-colors shadow-sm"
                    >
                      <span>Continue Application</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Rule-Based Alternative Time Slots & Standby Options */}
          {alternativeSlots.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Rule-Based Alternative Suggestions (Nearby Time Slots)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alternativeSlots.map((alt) => (
                  <div
                    key={alt.room_id}
                    className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {alt.slot_shift_label || 'Time Shift Suggestion'}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{alt.suggested_time_slot}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 mt-2">
                        {alt.room_number} - {alt.name}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1">{alt.alternative_reason}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                      <button
                        onClick={() => handleContinue(alt, alt.suggested_time_slot)}
                        className="flex-1 py-1.5 rounded-lg bg-navy-900 hover:bg-blue-600 text-white font-semibold text-xs transition text-center"
                      >
                        Book Alternative Slot
                      </button>
                      <button
                        onClick={() => handleJoinStandby(alt)}
                        className="py-1.5 px-3 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-800 font-semibold text-xs transition flex items-center gap-1"
                        title="Join waitlist for original requested slot"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Waitlist</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
