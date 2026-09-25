import api from './api';

export const publicService = {
  async getEmergencyProfile(token) {
    const res = await api.get(`/public/emergency/${token}`);
    return res.data;
  }
};
