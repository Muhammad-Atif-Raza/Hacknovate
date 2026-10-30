import api from './api';

export const adminService = {
  getDashboardStats: () => api.get('/admin/stats'),
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  getPendingRequests: () => api.get('/admin/bookings/pending'),
  approveBooking: (id) => api.post(`/admin/bookings/${id}/approve`),
  rejectBooking: (id, reason) => api.post(`/admin/bookings/${id}/reject`, { reason }),
  getAllRooms: () => api.get('/admin/rooms'),
};
