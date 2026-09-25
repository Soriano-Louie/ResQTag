import pool from '../config/db.js';
import { DEFAULT_PRIVACY_FIELDS } from '../utils/privacyFilter.js';

export async function getPrivacySettings(req, res) {
  try {
    const userId = req.user.user_id;

    const [rows] = await pool.query(
      'SELECT field_name, is_public FROM privacy_settings WHERE user_id = ?',
      [userId]
    );

    // Merge database rows with default fallback
    const settings = { ...DEFAULT_PRIVACY_FIELDS };
    for (const row of rows) {
      settings[row.field_name] = Boolean(row.is_public);
    }

    return res.json({ settings });
  } catch (error) {
    console.error('getPrivacySettings error:', error);
    return res.status(500).json({ message: 'Failed to retrieve privacy settings.', error: error.message });
  }
}

export async function updatePrivacySettings(req, res) {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.user_id;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ message: 'Invalid privacy settings payload.' });
    }

    await connection.beginTransaction();

    const entries = Object.entries(settings);
    for (const [field, isPublic] of entries) {
      const publicVal = isPublic ? 1 : 0;
      await connection.query(
        `INSERT INTO privacy_settings (user_id, field_name, is_public) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE is_public = VALUES(is_public)`,
        [userId, field, publicVal]
      );
    }

    await connection.commit();

    return res.json({ message: 'Privacy settings updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('updatePrivacySettings error:', error);
    return res.status(500).json({ message: 'Failed to update privacy settings.', error: error.message });
  } finally {
    connection.release();
  }
}
