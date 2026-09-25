import express from 'express';
import {
  getPrivacySettings,
  updatePrivacySettings
} from '../controllers/privacyController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getPrivacySettings);
router.put('/', updatePrivacySettings);

export default router;
