import express from 'express';
import multer from 'multer';
import pool from '../config/db.js';
import { normalizePhoto, readPhoto } from '../utils/profilePhoto.js';

export function photoRouter() {
  const router = express.Router({ mergeParams: true });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('photo');
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    req.photoMemberId = req.params.id === undefined ? 0 : Number(req.params.id);
    if (!Number.isSafeInteger(req.photoMemberId) || req.photoMemberId < 0 || (req.params.id !== undefined && !req.photoMemberId)) {
      return res.status(400).json({ message: 'Invalid family member.' });
    }
    try {
      if (req.photoMemberId) {
        const [rows] = await pool.query('SELECT member_id FROM family_members WHERE member_id=? AND user_id=? AND archived=0', [req.photoMemberId, req.user.user_id]);
        if (!rows.length) return res.status(404).json({ message: 'Family member not found.' });
      }
      next();
    } catch (err) { next(err); }
  });
  router.get('/', async (req, res, next) => {
    try { res.json({ photo: await readPhoto(req.user.user_id, req.photoMemberId) }); }
    catch (err) { next(err); }
  });
  router.put('/', (req, res, next) => upload(req, res, async err => {
    if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Choose an image smaller than 5 MB.' : 'Upload one JPEG, PNG, or WebP photo.' });
    if (!req.file) return res.status(400).json({ message: 'Choose a photo to upload.' });
    let image;
    try { image = await normalizePhoto(req.file.buffer); }
    catch { return res.status(400).json({ message: 'Choose a valid, still JPEG, PNG, or WebP image with no more than 20 megapixels.' }); }
    try {
      await pool.query('INSERT INTO profile_photos (user_id, member_id, image) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE image=VALUES(image)', [req.user.user_id, req.photoMemberId, image]);
      res.json({ photo: `data:image/jpeg;base64,${image.toString('base64')}` });
    } catch (error) { next(error); }
  }));
  router.delete('/', async (req, res, next) => {
    try {
      await pool.query('DELETE FROM profile_photos WHERE user_id=? AND member_id=?', [req.user.user_id, req.photoMemberId]);
      res.json({ photo: null });
    } catch (err) { next(err); }
  });
  return router;
}
