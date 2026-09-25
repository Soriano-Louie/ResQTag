import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  deleteAccount
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, updatePassword);
router.delete('/account', authenticate, deleteAccount);

export default router;
