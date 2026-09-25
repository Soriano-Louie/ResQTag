import express from 'express';
import {
  getProfile,
  updatePersonalInfo,
  updateMedicalInfo
} from '../controllers/profileController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/personal', updatePersonalInfo);
router.put('/medical', updateMedicalInfo);

export default router;
