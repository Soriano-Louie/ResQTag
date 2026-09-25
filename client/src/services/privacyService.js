import api from './api';

export const privacyService = {
  async getPrivacySettings() {
    const res = await api.get('/privacy');
    return res.data;
  },
  async updatePrivacySettings(settings) {
    const res = await api.put('/privacy', { settings });
    return res.data;
  }
};
