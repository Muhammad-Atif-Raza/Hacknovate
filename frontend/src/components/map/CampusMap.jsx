import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StatusBadge } from '../common/StatusBadge';
import { AcousticBadge } from '../common/AcousticBadge';
import { Users, Building, ArrowRight, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Center around Campus coordinates
const CAMPUS_CENTER = [28.5458, 77.1920];

export const CampusMap = ({ rooms = [], onSelectRoom, selectedRoomId }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const navigate = useNavigate();

  // Create status colored custom pin
  const createCustomIcon = (status, isSelected) => {
    let color = '#10B981'; // Green for Available
    if (status === 'OCCUPIED') color = '#2563EB'; // Blue for Occupied
    if (status === 'UNDER_MAINTENANCE' || status === 'TEMPORARILY_UNAVAILABLE') color = '#EF4444'; // Red for Maintenance

    const border = isSelected ? '4px solid #F59E0B' : '2px solid white';
    const size = isSelected ? 36 : 28;

    return L.divIcon({
      className: 'custom-campus-pin',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: ${border};
          border-radius: 50%;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 11px;
          transition: transform 0.2s;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: CAMPUS_CENTER,
        zoom: 17,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Campus Resource Hub',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for rooms
    rooms.forEach((room) => {
      if (room.latitude && room.longitude) {
        const isSelected = room.id === selectedRoomId;
        const icon = createCustomIcon(room.status, isSelected);
        const marker = L.marker([room.latitude, room.longitude], { icon }).addTo(map);

        marker.on('click', () => {
          setActiveRoom(room);
          if (onSelectRoom) onSelectRoom(room);
        });

        markersRef.current.push(marker);
      }
    });

    // Invalidate size after rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [rooms, selectedRoomId]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-md">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-100 pb-1.5">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Campus Facility Status</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-sm inline-block"></span>
          <span className="text-slate-700 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-sm inline-block"></span>
          <span className="text-slate-700 font-medium">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 border border-white shadow-sm inline-block"></span>
          <span className="text-slate-700 font-medium">Under Maintenance</span>
        </div>
      </div>

      {/* Selected Room Floating Card */}
      {activeRoom && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-10 max-w-sm bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl transition-all animate-fadeIn">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={activeRoom.status} />
                <span className="text-xs font-semibold text-slate-500">{activeRoom.building}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{activeRoom.room_number} - {activeRoom.name}</h4>
            </div>
            <button
              onClick={() => setActiveRoom(null)}
              className="text-slate-400 hover:text-slate-600 p-1 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Cap: {activeRoom.capacity}
            </span>
            <AcousticBadge profile={activeRoom.acoustic_profile} />
          </div>

          {activeRoom.equipment_items && activeRoom.equipment_items.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {activeRoom.equipment_items.slice(0, 3).map((eq) => (
                <span key={eq.id} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {eq.name}
                </span>
              ))}
              {activeRoom.equipment_items.length > 3 && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  +{activeRoom.equipment_items.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                navigate(`/student/apply?roomId=${activeRoom.id}`);
              }}
              disabled={activeRoom.status !== 'AVAILABLE'}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-navy-900 hover:bg-blue-600 text-white font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <span>{activeRoom.status === 'AVAILABLE' ? 'Book This Room' : 'Currently Unavailable'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
