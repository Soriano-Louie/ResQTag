import express from 'express';
import {
  createOrder,
  getMyOrders,
  cancelOrder,
  getAdminOrders,
  updateOrderStatus,
  getOrderPrintData
} from '../controllers/tagOrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// User endpoints
router.post('/', authenticate, createOrder);
router.get('/my-orders', authenticate, getMyOrders);
router.put('/:id/cancel', authenticate, cancelOrder);

// Admin endpoints
router.get('/admin', authenticate, requireAdmin, getAdminOrders);
router.put('/admin/:id/status', authenticate, requireAdmin, updateOrderStatus);
router.get('/admin/:id/print-data', authenticate, requireAdmin, getOrderPrintData);

export default router;
