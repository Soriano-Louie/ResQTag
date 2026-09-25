import api from './api';

export const qrService = {
  async getQR() {
    const res = await api.get('/qr');
    return res.data;
  },
  async updateStatus(status) {
    const res = await api.put('/qr/status', { status });
    return res.data;
  },
  async regenerateQR() {
    const res = await api.post('/qr/regenerate');
    return res.data;
  }
};
