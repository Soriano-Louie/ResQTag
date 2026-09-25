import express from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import contactRoutes from './contactRoutes.js';
import privacyRoutes from './privacyRoutes.js';
import qrRoutes from './qrRoutes.js';
import publicRoutes from './publicRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ResQTag API', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/contacts', contactRoutes);
router.use('/privacy', privacyRoutes);
router.use('/qr', qrRoutes);
router.use('/public', publicRoutes);
router.use('/admin', adminRoutes);

export default router;
