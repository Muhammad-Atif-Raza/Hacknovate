import React, { useState, useEffect } from 'react';
import { CampusMap } from '../../components/map/CampusMap';
import { roomService } from '../../services/roomService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AcousticBadge } from '../../components/common/AcousticBadge';
import { MapPin, Building, Users, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CampusMapPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filterBuilding, setFilterBuilding] = useState('ALL');
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await roomService.getRooms();
      setRooms(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = filterBuilding === 'ALL'
    ? rooms
    : rooms.filter((r) => r.building === filterBuilding);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <MapPin className="w-4 h-4" />
            <span>Campus Spatial GIS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Interactive Campus Facility Map</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Leaflet & OpenStreetMap visualization of campus venues, acoustic isolation zones, and occupancy state.
          </p>
        </div>

        {/* Building Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold text-slate-600">
          {[
            { id: 'ALL', name: 'All Buildings' },
            { id: 'Aryabhata Science Block', name: 'Science Block' },
            { id: 'Turing Tech Tower', name: 'Tech Tower' },
            { id: 'Central Knowledge Library', name: 'Library' },
            { id: 'Ramanujan Arts & Seminar Complex', name: 'Arts Complex' },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => setFilterBuilding(b.id)}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterBuilding === b.id
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Component */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <CampusMap
          rooms={filteredRooms}
          onSelectRoom={(r) => setSelectedRoom(r)}
          selectedRoomId={selectedRoom?.id}
        />
      </div>

      {/* Grid of rooms underneath */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Showing {filteredRooms.length} Campus Rooms
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                selectedRoom?.id === room.id
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <StatusBadge status={room.status} size="xs" />
                <span className="text-[11px] font-semibold text-slate-400 font-mono">Floor {room.floor}</span>
              </div>

              <h4 className="font-bold text-slate-900 text-sm">{room.room_number} - {room.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{room.building}</p>

              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="font-medium text-slate-600">Capacity: {room.capacity}</span>
                <AcousticBadge profile={room.acoustic_profile} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
