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
  },
  async updateName(data) {
    const res = await api.put('/auth/name', data);
    return res.data;
  },
  // Step 1: re-confirm the password, which triggers a code to the new address.
  async requestEmailChange(data) {
    const res = await api.post('/auth/email/request', data);
    return res.data;
  },
  // Step 2: submit the emailed code, which actually applies the new address.
  async confirmEmailChange(data) {
    const res = await api.post('/auth/email/confirm', data);
    return res.data;
  },
  async cancelEmailChange() {
    const res = await api.delete('/auth/email/pending');
    return res.data;
  }
};
