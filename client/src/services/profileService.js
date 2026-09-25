import api from './api';

export const profileService = {
  async getProfile() {
    const res = await api.get('/profile');
    return res.data;
  },
  async updatePersonalInfo(data) {
    const res = await api.put('/profile/personal', data);
    return res.data;
  },
  async updateMedicalInfo(data) {
    const res = await api.put('/profile/medical', data);
    return res.data;
  }
};
