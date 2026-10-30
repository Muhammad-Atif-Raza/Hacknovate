import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Building,
  Users,
  Volume2,
  Tv,
  MapPin,
  Check,
  X,
  AlertCircle,
  Eye
} from 'lucide-react';
import { roomService } from '../../services/roomService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AcousticBadge } from '../../components/common/AcousticBadge';

export const AdminRoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Form state
  const [roomNumber, setRoomNumber] = useState('');
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('Aryabhata Science Block');
  const [floor, setFloor] = useState(1);
  const [capacity, setCapacity] = useState(40);
  const [acousticProfile, setAcousticProfile] = useState('Collaborative Discussion');
  const [status, setStatus] = useState('AVAILABLE');
  const [latitude, setLatitude] = useState(28.5455);
  const [longitude, setLongitude] = useState(77.1925);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80');
  const [description, setDescription] = useState('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState([]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchRoomsAndEquipment = async () => {
    setLoading(true);
    try {
      const [roomsData, eqData] = await Promise.all([
        roomService.getRooms(),
        roomService.getEquipmentCatalog()
      ]);
      setRooms(roomsData || []);
      setEquipmentList(eqData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomsAndEquipment();
  }, []);

  const openCreateModal = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setName('');
    setBuilding('Aryabhata Science Block');
    setFloor(1);
    setCapacity(40);
    setAcousticProfile('Collaborative Discussion');
    setStatus('AVAILABLE');
    setLatitude(28.5455);
    setLongitude(77.1925);
    setImageUrl('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80');
    setDescription('');
    setSelectedEquipmentIds([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setRoomNumber(room.room_number);
    setName(room.name);
    setBuilding(room.building);
    setFloor(room.floor);
    setCapacity(room.capacity);
    setAcousticProfile(room.acoustic_profile);
    setStatus(room.status);
    setLatitude(room.latitude);
    setLongitude(room.longitude);
    setImageUrl(room.image_url || '');
    setDescription(room.description || '');
    setSelectedEquipmentIds(room.equipment_items ? room.equipment_items.map((eq) => eq.id) : []);
    setFormError('');
    setIsModalOpen(true);
  };

  const toggleEquipment = (id) => {
    if (selectedEquipmentIds.includes(id)) {
      setSelectedEquipmentIds(selectedEquipmentIds.filter((item) => item !== id));
    } else {
      setSelectedEquipmentIds([...selectedEquipmentIds, id]);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const payload = {
      room_number: roomNumber.trim(),
      name: name.trim(),
      building,
      floor: parseInt(floor, 10),
      capacity: parseInt(capacity, 10),
      acoustic_profile: acousticProfile,
      status,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      image_url: imageUrl.trim(),
      description: description.trim(),
      equipment_ids: selectedEquipmentIds,
    };

    try {
      if (editingRoom) {
        await roomService.updateRoom(editingRoom.id, payload);
      } else {
        await roomService.createRoom(payload);
      }
      setIsModalOpen(false);
      fetchRoomsAndEquipment();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save room details.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (roomId, roomNum) => {
    if (!window.confirm(`Deactivate room ${roomNum}?`)) return;
    try {
      await roomService.deleteRoom(roomId);
      fetchRoomsAndEquipment();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to deactivate room.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Room Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">Configure physical venue parameters, acoustic ratings, and equipment catalog</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-blue-600 text-white font-semibold text-xs transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </button>
      </div>

      {/* Room Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-sm">
            Loading campus rooms...
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
            >
              <div>
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                  <img
                    src={room.image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80'}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <StatusBadge status={room.status} size="xs" />
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {room.building} • Floor {room.floor}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-0.5">
                      {room.room_number} - {room.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Capacity: {room.capacity}
                    </span>
                    <AcousticBadge profile={room.acoustic_profile} />
                  </div>

                  {room.equipment_items && room.equipment_items.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {room.equipment_items.map((eq) => (
                        <span key={eq.id} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {eq.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  GPS: {room.latitude.toFixed(4)}, {room.longitude.toFixed(4)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(room)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                    title="Edit Venue Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(room.id, room.room_number)}
                    className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                    title="Deactivate Venue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add New Campus Venue'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Code / Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TT-302"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Venue Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems Lab"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Building</label>
                  <select
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  >
                    <option>Aryabhata Science Block</option>
                    <option>Turing Tech Tower</option>
                    <option>Central Knowledge Library</option>
                    <option>Ramanujan Arts & Seminar Complex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Floor</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Acoustic Classification</label>
                  <select
                    value={acousticProfile}
                    onChange={(e) => setAcousticProfile(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  >
                    <option>Silent Study Zone</option>
                    <option>Collaborative Discussion</option>
                    <option>Amplified Sound Permitted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                    <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                    <option value="TEMPORARILY_UNAVAILABLE">TEMPORARILY_UNAVAILABLE</option>
                  </select>
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Map Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Map Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              {/* Equipment Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Installed Equipment</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {equipmentList.map((eq) => {
                    const isChecked = selectedEquipmentIds.includes(eq.id);
                    return (
                      <button
                        type="button"
                        key={eq.id}
                        onClick={() => toggleEquipment(eq.id)}
                        className={`p-2 rounded-lg border text-left text-xs transition ${
                          isChecked
                            ? 'bg-blue-50 border-blue-600 text-blue-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        ✓ {eq.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm"
                >
                  {formLoading ? 'Saving...' : 'Save Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
