import api from './api';

export const authService = {
  async register(data) {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  async login(data) {
    const res = await api.post('/auth/login', data);
    return res.data;
  },
  async logout() {
    const res = await api.post('/auth/logout');
    return res.data;
  },
  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },
  async updatePassword(data) {
    const res = await api.put('/auth/password', data);
    return res.data;
  },
  async deleteAccount(data) {
    const res = await api.delete('/auth/account', { data });
    return res.data;
  }
};
