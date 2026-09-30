import express from 'express';
import {
  createOrder,
  getMyOrders,
  cancelOrder,
  resubmitPayment,
  getAdminOrders,
  confirmPaymentAndSendEmail,
  collectCodPayment,
  rejectPayment,
  updateOrderStatus,
  batchUpdateOrderStatus,
  getOrderPrintData
} from '../controllers/tagOrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import { handleReceiptUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// User endpoints
router.post('/', authenticate, orderLimiter, handleReceiptUpload('receipt'), createOrder);
router.get('/my-orders', authenticate, getMyOrders);
router.put('/:id/cancel', authenticate, orderLimiter, cancelOrder);
router.put('/:id/resubmit-payment', authenticate, orderLimiter, handleReceiptUpload('receipt'), resubmitPayment);


// Admin endpoints
router.get('/admin', authenticate, requireAdmin, getAdminOrders);
router.put('/admin/:id/confirm-payment', authenticate, requireAdmin, confirmPaymentAndSendEmail);
router.put('/admin/:id/collect-cod', authenticate, requireAdmin, collectCodPayment);
router.put('/admin/:id/reject-payment', authenticate, requireAdmin, rejectPayment);
router.put('/admin/:id/status', authenticate, requireAdmin, updateOrderStatus);
router.post('/admin/batch-status', authenticate, requireAdmin, batchUpdateOrderStatus);
router.get('/admin/:id/print-data', authenticate, requireAdmin, getOrderPrintData);

export default router;
