import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Users,
  Building,
  CheckSquare,
  Plus,
  Trash2,
  ArrowRight,
  AlertCircle,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';

export const UserInfoPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const roomId = parseInt(searchParams.get('roomId') || '1', 10);
  const roomNumber = searchParams.get('roomNumber') || 'LH-101';
  const roomName = searchParams.get('roomName') || 'Lecture Hall';
  const people = parseInt(searchParams.get('people') || '20', 10);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const start = searchParams.get('start') || '10:00';
  const end = searchParams.get('end') || '12:00';
  const facilitiesParam = searchParams.get('facilities') || '';
  const facilities = facilitiesParam ? facilitiesParam.split(',') : [];

  // Form fields
  const [departmentOrClub, setDepartmentOrClub] = useState(user?.department || 'ACM Student Chapter');
  const [purpose, setPurpose] = useState('Hands-on Workshop & Technical Collaborative Discussion');
  const [whyNeeded, setWhyNeeded] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Accompanying students array
  const [accompanyingStudents, setAccompanyingStudents] = useState([
    { name: 'Rohan Sharma', enrollment: 'ENR2024CS021' },
    { name: 'Kavita Rao', enrollment: 'ENR2024CS055' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddStudent = () => {
    setAccompanyingStudents([...accompanyingStudents, { name: '', enrollment: '' }]);
  };

  const handleRemoveStudent = (index) => {
    setAccompanyingStudents(accompanyingStudents.filter((_, i) => i !== index));
  };

  const handleStudentChange = (index, field, value) => {
    const updated = [...accompanyingStudents];
    updated[index][field] = value;
    setAccompanyingStudents(updated);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setError('');

    if (!whyNeeded.trim()) {
      setError('Please provide a detailed explanation in "Why do you need this room?".');
      return;
    }
    if (!isConfirmed) {
      setError('Please confirm that the provided booking information is accurate.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        room_id: roomId,
        booking_date: date,
        start_time: start,
        end_time: end,
        number_of_people: people,
        purpose: purpose.trim(),
        why_needed: whyNeeded.trim(),
        accompanying_students: accompanyingStudents.filter((s) => s.name.trim() !== ''),
        required_equipment: facilities,
      };

      const result = await bookingService.createBooking(payload);
      // Redirect to Permission Waiting Page
      navigate(`/student/permission-waiting?bookingId=${result.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit booking application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Selected Room Booking Summary Card */}
      <div className="bg-navy-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-1">
          Reservation Target Venue
        </span>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {roomNumber} - {roomName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {date}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                {start} - {end}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-lg">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                {people} Students
              </span>
            </div>
          </div>

          {facilities.length > 0 && (
            <div className="text-left md:text-right">
              <span className="text-[11px] text-slate-400 block mb-1">Selected Equipment:</span>
              <div className="flex flex-wrap gap-1 md:justify-end">
                {facilities.map((fac, idx) => (
                  <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {fac}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Booking Application Form */}
      <form onSubmit={handleSubmitApplication} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Applicant & Event Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department, Society or Student Club
            </label>
            <input
              type="text"
              required
              value={departmentOrClub}
              onChange={(e) => setDepartmentOrClub(e.target.value)}
              placeholder="e.g. ACM Student Chapter, Robotics Club"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purpose of Booking
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. AI Hackathon Mentorship Workshop"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Why needed textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Why do you need this room? <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={whyNeeded}
            onChange={(e) => setWhyNeeded(e.target.value)}
            placeholder="Provide a clear justification for facility administrators (e.g., specific hardware setup, seating capacity requirements, acoustic isolation needed for recording or deliberations)."
            className="w-full p-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
          />
          <p className="text-[11px] text-slate-400 mt-1">This statement is evaluated by the campus administrator prior to approval.</p>
        </div>

        {/* Accompanying Students */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Accompanying Students & Co-Organizers
              </label>
              <p className="text-[11px] text-slate-400">List core student coordinators joining the session</p>
            </div>
            <button
              type="button"
              onClick={handleAddStudent}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Student
            </button>
          </div>

          <div className="space-y-2">
            {accompanyingStudents.map((stud, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Student Full Name"
                  value={stud.name}
                  onChange={(e) => handleStudentChange(idx, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <input
                  type="text"
                  placeholder="Enrollment No."
                  value={stud.enrollment}
                  onChange={(e) => handleStudentChange(idx, 'enrollment', e.target.value)}
                  className="w-40 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveStudent(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <div className="pt-4 border-t border-slate-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="text-xs text-slate-600 leading-normal">
              I confirm that all booking information and attendee counts are accurate. I understand that my reservation must be scanned via QR code within 15 minutes of scheduled start or it will be automatically released to the standby waitlist.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-navy-900 hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-md shadow-navy-900/10 disabled:opacity-50"
          >
            <span>{loading ? 'Submitting Application...' : 'Submit Application to Administrator'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
