import api from './api';

export const roomService = {
  async getRooms(params = {}) {
    const response = await api.get('/rooms', { params });
    return response.data;
  },

  async getRoomById(id) {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  async getEquipmentCatalog() {
    const response = await api.get('/rooms/equipment');
    return response.data;
  },

  async createRoom(roomData) {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },

  async updateRoom(id, roomData) {
    const response = await api.put(`/rooms/${id}`, roomData);
    return response.data;
  },

  async deleteRoom(id) {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  }
};
