import api from './api';

export const tagOrderService = {
  // User APIs
  async createOrder(data) {
    const res = await api.post('/tag-orders', data);
    return res.data;
  },

  async getMyOrders() {
    const res = await api.get('/tag-orders/my-orders');
    return res.data;
  },

  // Admin APIs
  async getAdminOrders(params) {
    const res = await api.get('/tag-orders/admin', { params });
    return res.data;
  },

  async updateOrderStatus(orderId, status) {
    const res = await api.put(`/tag-orders/admin/${orderId}/status`, { status });
    return res.data;
  },

  async getOrderPrintData(orderId) {
    const res = await api.get(`/tag-orders/admin/${orderId}/print-data`);
    return res.data;
  }
};
