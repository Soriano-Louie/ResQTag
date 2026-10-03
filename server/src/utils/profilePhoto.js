import sharp from 'sharp';
import pool from '../config/db.js';

export async function normalizePhoto(buffer) {
  const options = { limitInputPixels: 20000000, failOn: 'warning' };
  const metadata = await sharp(buffer, options).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) {
    throw new Error('Choose a still JPEG, PNG, or WebP image.');
  }
  // Re-encoding without keepMetadata removes EXIF, GPS, and other source metadata.
  return sharp(buffer, options).rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 }).toBuffer();
}

export async function readPhoto(userId, memberId = 0) {
  const [rows] = await pool.query('SELECT image FROM profile_photos WHERE user_id=? AND member_id=?', [userId, memberId]);
  return rows[0]?.image ? `data:image/jpeg;base64,${rows[0].image.toString('base64')}` : null;
}
