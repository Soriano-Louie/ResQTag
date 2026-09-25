import express from 'express';
import { getPublicEmergencyProfile } from '../controllers/publicController.js';
import { publicQRLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public emergency URL endpoint scanned from QR code
router.get('/emergency/:token', publicQRLimiter, getPublicEmergencyProfile);

export default router;
