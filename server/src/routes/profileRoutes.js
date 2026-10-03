import express from 'express';
import { photoRouter } from './photoRoutes.js';
import {
  getProfile,
  updatePersonalInfo,
  updateMedicalInfo
} from '../controllers/profileController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use('/photo', photoRouter());

router.get('/', getProfile);
router.put('/personal', updatePersonalInfo);
router.put('/medical', updateMedicalInfo);

export default router;
