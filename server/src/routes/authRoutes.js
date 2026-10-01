import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  deleteAccount,
  updateAccountName,
  requestEmailChange,
  confirmEmailChange,
  cancelEmailChange
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authLimiter, emailChangeLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, updatePassword);
router.delete('/account', authenticate, deleteAccount);
router.put('/name', authenticate, updateAccountName);

// Email change is a deliberate two-step handshake: password, then a code sent to
// the new address. emailChangeLimiter is used instead of authLimiter because the
// stricter 10/15min cap would lock users out mid-flow.
router.post('/email/request', authenticate, emailChangeLimiter, requestEmailChange);
router.post('/email/confirm', authenticate, emailChangeLimiter, confirmEmailChange);
router.delete('/email/pending', authenticate, cancelEmailChange);

export default router;
