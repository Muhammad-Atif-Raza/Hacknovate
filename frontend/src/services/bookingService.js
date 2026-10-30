import api from './api';

export const bookingService = {
  async createBooking(bookingData) {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  async getMyBookings() {
    const response = await api.get('/bookings/my');
    return response.data;
  },

  async getPendingBookings() {
    const response = await api.get('/bookings/pending');
    return response.data;
  },

  async getAllBookings(statusFilter = '') {
    const params = statusFilter ? { status_filter: statusFilter } : {};
    const response = await api.get('/bookings/all', { params });
    return response.data;
  },

  async approveBooking(bookingId) {
    const response = await api.post(`/bookings/${bookingId}/approve`);
    return response.data;
  },

  async rejectBooking(bookingId, rejectionReason) {
    const response = await api.post(`/bookings/${bookingId}/reject`, {
      rejection_reason: rejectionReason
    });
    return response.data;
  },

  async cancelBooking(bookingId) {
    const response = await api.delete(`/bookings/${bookingId}`);
    return response.data;
  },

  async getBookingQR(bookingId) {
    const response = await api.get(`/bookings/${bookingId}/qr`);
    return response.data;
  },

  async verifyCheckin(qrToken) {
    const response = await api.post('/checkins/verify', { qr_token: qrToken });
    return response.data;
  }
};
