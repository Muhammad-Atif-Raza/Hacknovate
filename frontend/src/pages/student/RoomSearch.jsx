import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  Tv,
  PenTool,
  Monitor,
  Mic,
  Volume2,
  Video,
  VolumeX,
  Search,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const RoomSearch = () => {
  const navigate = useNavigate();

  // Tomorrow as default date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [numberOfPeople, setNumberOfPeople] = useState(25);
  const [bookingDate, setBookingDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [requiredFacilities, setRequiredFacilities] = useState(['High-Def Projector', 'Magnetic Whiteboard']);
  const [acousticPreference, setAcousticPreference] = useState('Collaborative Discussion');
  const [error, setError] = useState('');

  const facilityOptions = [
    { name: 'High-Def Projector', icon: Tv },
    { name: 'Magnetic Whiteboard', icon: PenTool },
    { name: 'Dual Display Computer', icon: Monitor },
    { name: 'Wireless Microphone', icon: Mic },
    { name: 'Surround Sound System', icon: Volume2 },
    { name: '4K Video Conference Cam', icon: Video },
  ];

  const acousticOptions = [
    {
      id: 'Silent Study Zone',
      title: 'Silent Study Zone',
      desc: 'Deep focus, thesis writing, minimal audio disruptions.',
      icon: VolumeX,
      border: 'border-purple-200 peer-checked:border-purple-600 peer-checked:bg-purple-50/50',
    },
    {
      id: 'Collaborative Discussion',
      title: 'Collaborative Discussion',
      desc: 'Group projects, brainstorming, conversational noise level.',
      icon: Users,
      border: 'border-blue-200 peer-checked:border-blue-600 peer-checked:bg-blue-50/50',
    },
    {
      id: 'Amplified Sound Permitted',
      title: 'Amplified Sound Permitted',
      desc: 'Guest lectures, audio-visual playback, microphoned seminars.',
      icon: Volume2,
      border: 'border-amber-200 peer-checked:border-amber-600 peer-checked:bg-amber-50/50',
    },
  ];

  const toggleFacility = (facilityName) => {
    if (requiredFacilities.includes(facilityName)) {
      setRequiredFacilities(requiredFacilities.filter((f) => f !== facilityName));
    } else {
      setRequiredFacilities([...requiredFacilities, facilityName]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');

    if (numberOfPeople < 1) {
      setError('Please specify at least 1 person.');
      return;
    }
    if (startTime >= endTime) {
      setError('Start time must be earlier than end time.');
      return;
    }

    // Build query params and navigate to Room Selection
    const searchParams = new URLSearchParams({
      people: numberOfPeople.toString(),
      date: bookingDate,
      start: startTime,
      end: endTime,
      facilities: requiredFacilities.join(','),
      acoustic: acousticPreference,
    });

    navigate(`/student/selection?${searchParams.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Campus Room Finder</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Apply for a Campus Room</h1>
        <p className="text-xs text-slate-500 mt-1">
          Input party requirements and preferences. Our rule-based reservation engine will curate available matching spaces.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Search Form Card */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        {/* Section 1: Capacity & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* People Count with Increment / Decrement */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Number of People
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
                className="w-12 h-12 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-lg transition active:scale-95"
              >
                −
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-12 text-center text-lg font-bold text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <Users className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => setNumberOfPeople(numberOfPeople + 1)}
                className="w-12 h-12 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-lg transition active:scale-95"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Minimum 1 attendee. Hall capacity evaluated automatically.</p>
          </div>

          {/* Booking Date */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Booking Date
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={bookingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Standard booking window opens up to 30 days in advance.</p>
          </div>
        </div>

        {/* Section 2: Time Window */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Time Slot Duration
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-500 font-medium block mb-1">Time From</span>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium block mb-1">Time To</span>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Required Facilities */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Required Equipment & Facilities
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {facilityOptions.map((fac) => {
              const Icon = fac.icon;
              const isChecked = requiredFacilities.includes(fac.name);
              return (
                <button
                  type="button"
                  key={fac.name}
                  onClick={() => toggleFacility(fac.name)}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    isChecked
                      ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-semibold shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isChecked ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-xs">{fac.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Acoustic Profile Preference */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Acoustic Preference
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {acousticOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = acousticPreference === opt.id;
              return (
                <label
                  key={opt.id}
                  onClick={() => setAcousticPreference(opt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <input
                        type="radio"
                        name="acousticPref"
                        checked={isSelected}
                        onChange={() => setAcousticPreference(opt.id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <h4 className="font-bold text-xs text-slate-900">{opt.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Submit Search */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-navy-900 hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md shadow-navy-900/10"
          >
            <Search className="w-4 h-4" />
            <span>Search Matching Rooms</span>
          </button>
        </div>
      </form>
    </div>
  );
};
