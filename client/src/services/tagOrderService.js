import api from './api';

export const tagOrderService = {
  // User APIs
  async createOrder(data) {
    const isFormData = data instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const res = await api.post('/tag-orders', data, config);
    return res.data;
  },

  async getMyOrders() {
    const res = await api.get('/tag-orders/my-orders');
    return res.data;
  },

  async cancelOrder(orderId) {
    const res = await api.put(`/tag-orders/${orderId}/cancel`);
    return res.data;
  },

  async resubmitPayment(orderId, data) {
    const isFormData = data instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const res = await api.put(`/tag-orders/${orderId}/resubmit-payment`, data, config);
    return res.data;
  },

  // Admin APIs
  async getAdminOrders(params) {
    const res = await api.get('/tag-orders/admin', { params });
    return res.data;
  },

  async confirmPaymentAndSendEmail(orderId) {
    const res = await api.put(`/tag-orders/admin/${orderId}/confirm-payment`);
    return res.data;
  },

  async collectCodPayment(orderId) {
    const res = await api.put(`/tag-orders/admin/${orderId}/collect-cod`);
    return res.data;
  },

  async rejectPayment(orderId, reason) {
    const res = await api.put(`/tag-orders/admin/${orderId}/reject-payment`, { reason });
    return res.data;
  },

  async updateOrderStatus(orderId, status) {
    const res = await api.put(`/tag-orders/admin/${orderId}/status`, { status });
    return res.data;
  },

  async batchUpdateOrderStatus(orderIds, status) {
    const res = await api.post('/tag-orders/admin/batch-status', { orderIds, status });
    return res.data;
  },

  async getOrderPrintData(orderId) {
    const res = await api.get(`/tag-orders/admin/${orderId}/print-data`);
    return res.data;
  }
};
