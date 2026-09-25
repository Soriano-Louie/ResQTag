import api from './api';

export const adminService = {
  async getStats() {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  async getUsers(params) {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },
  async updateUserStatus(id, accountStatus) {
    const res = await api.put(`/admin/users/${id}/status`, { accountStatus });
    return res.data;
  },
  async deleteUser(id) {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  }
};
