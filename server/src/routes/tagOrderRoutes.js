import express from 'express';
import {
  createOrder,
  getMyOrders,
  cancelOrder,
  getAdminOrders,
  updateOrderStatus,
  batchUpdateOrderStatus,
  getOrderPrintData
} from '../controllers/tagOrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { orderLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// User endpoints
router.post('/', authenticate, orderLimiter, createOrder);
router.get('/my-orders', authenticate, getMyOrders);
router.put('/:id/cancel', authenticate, orderLimiter, cancelOrder);

// Admin endpoints
router.get('/admin', authenticate, requireAdmin, getAdminOrders);
router.put('/admin/:id/status', authenticate, requireAdmin, updateOrderStatus);
router.post('/admin/batch-status', authenticate, requireAdmin, batchUpdateOrderStatus);
router.get('/admin/:id/print-data', authenticate, requireAdmin, getOrderPrintData);

export default router;
