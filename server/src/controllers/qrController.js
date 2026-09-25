import pool from '../config/db.js';
import { generateSecureQRToken } from '../utils/tokenGenerator.js';

export async function getQR(req, res) {
  try {
    const userId = req.user.user_id;

    const [rows] = await pool.query(
      'SELECT qr_id, qr_token, status, scan_count, last_scanned_at, created_at, updated_at FROM qr_tags WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      // Create one if missing
      const token = generateSecureQRToken();
      await pool.query('INSERT INTO qr_tags (user_id, qr_token, status) VALUES (?, ?, ?)', [userId, token, 'active']);
      return res.json({
        qr: {
          qr_token: token,
          status: 'active',
          scan_count: 0,
          last_scanned_at: null
        }
      });
    }

    return res.json({ qr: rows[0] });
  } catch (error) {
    console.error('getQR error:', error);
    return res.status(500).json({ message: 'Failed to retrieve QR code details.', error: error.message });
  }
}

export async function updateQRStatus(req, res) {
  try {
    const userId = req.user.user_id;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either "active" or "inactive".' });
    }

    const [result] = await pool.query(
      'UPDATE qr_tags SET status = ? WHERE user_id = ?',
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'QR Tag record not found.' });
    }

    return res.json({
      message: `ResQTag has been ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
      status
    });
  } catch (error) {
    console.error('updateQRStatus error:', error);
    return res.status(500).json({ message: 'Failed to update QR status.', error: error.message });
  }
}

export async function regenerateQR(req, res) {
  try {
    const userId = req.user.user_id;
    const newToken = generateSecureQRToken();

    const [result] = await pool.query(
      'UPDATE qr_tags SET qr_token = ?, scan_count = 0, last_scanned_at = NULL, status = ? WHERE user_id = ?',
      [newToken, 'active', userId]
    );

    if (result.affectedRows === 0) {
      await pool.query(
        'INSERT INTO qr_tags (user_id, qr_token, status) VALUES (?, ?, ?)',
        [userId, newToken, 'active']
      );
    }

    return res.json({
      message: 'New QR code generated successfully. Previous QR tags are now invalidated.',
      qrToken: newToken,
      status: 'active'
    });
  } catch (error) {
    console.error('regenerateQR error:', error);
    return res.status(500).json({ message: 'Failed to regenerate QR code.', error: error.message });
  }
}
