import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('cph_token', response.data.access_token);
      localStorage.setItem('cph_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.data.access_token) {
      localStorage.setItem('cph_token', response.data.access_token);
      localStorage.setItem('cph_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updateProfile(profileData) {
    const response = await api.put('/auth/me', profileData);
    localStorage.setItem('cph_user', JSON.stringify(response.data));
    return response.data;
  },

  async getNotifications() {
    const response = await api.get('/auth/notifications');
    return response.data;
  },

  async markNotificationRead(notifId) {
    const response = await api.put(`/auth/notifications/${notifId}/read`);
    return response.data;
  },

  async markAllNotificationsRead() {
    const response = await api.put('/auth/notifications/read-all');
    return response.data;
  },

  logout() {
    localStorage.removeItem('cph_token');
    localStorage.removeItem('cph_user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('cph_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken() {
    return localStorage.getItem('cph_token');
  }
};
