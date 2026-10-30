import api from './api';

export const recommendationService = {
  async getRecommendations(searchPayload) {
    const response = await api.post('/recommendations', searchPayload);
    return response.data;
  }
};

export const standbyService = {
  async joinStandby(standbyPayload) {
    const response = await api.post('/standby', standbyPayload);
    return response.data;
  },

  async getMyStandby() {
    const response = await api.get('/standby/my');
    return response.data;
  },

  async claimStandby(standbyId) {
    const response = await api.post(`/standby/${standbyId}/claim`);
    return response.data;
  },

  async leaveStandby(standbyId) {
    const response = await api.delete(`/standby/${standbyId}`);
    return response.data;
  }
};

export const maintenanceService = {
  async getMaintenanceRecords() {
    const response = await api.get('/maintenance');
    return response.data;
  },

  async setRoomMaintenance(maintenancePayload) {
    const response = await api.post('/maintenance', maintenancePayload);
    return response.data;
  },

  async resolveMaintenance(recordId) {
    const response = await api.put(`/maintenance/${recordId}/resolve`);
    return response.data;
  }
};

export const analyticsService = {
  async getDashboardAnalytics() {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  }
};
