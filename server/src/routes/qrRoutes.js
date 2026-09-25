import express from 'express';
import {
  getQR,
  updateQRStatus,
  regenerateQR
} from '../controllers/qrController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getQR);
router.put('/status', updateQRStatus);
router.post('/regenerate', regenerateQR);

export default router;
