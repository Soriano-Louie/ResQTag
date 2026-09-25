import express from 'express';
import {
  getAdminStats,
  getUsers,
  updateUserStatus,
  deleteUser
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

export default router;
