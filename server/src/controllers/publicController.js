import pool from '../config/db.js';
import { filterPublicEmergencyProfile, DEFAULT_PRIVACY_FIELDS } from '../utils/privacyFilter.js';

export async function getPublicEmergencyProfile(req, res) {
  try {
    const { token } = req.params;

    if (!token || typeof token !== 'string' || token.length < 8) {
      return res.status(400).json({ message: 'Invalid ResQTag emergency token.' });
    }

    // 1. Fetch QR Tag Record
    const [qrRows] = await pool.query(
      'SELECT qr_id, user_id, qr_token, status FROM qr_tags WHERE qr_token = ?',
      [token.trim()]
    );

    if (qrRows.length === 0) {
      return res.status(404).json({
        status: 'not_found',
        message: 'ResQTag profile not found. The QR code may have expired or been regenerated.'
      });
    }

    const qrRecord = qrRows[0];

    // 2. Check if Tag is Deactivated / Inactive
    if (qrRecord.status === 'inactive') {
      return res.status(200).json({
        status: 'inactive',
        message: 'This ResQTag is currently inactive by the owner.'
      });
    }

    const userId = qrRecord.user_id;

    // 3. Check User Account Status
    const [userRows] = await pool.query(
      'SELECT user_id, first_name, middle_name, last_name, email, account_status FROM users WHERE user_id = ?',
      [userId]
    );

    if (userRows.length === 0 || userRows[0].account_status !== 'active') {
      return res.status(200).json({
        status: 'inactive',
        message: 'This ResQTag account is currently inactive.'
      });
    }

    const user = userRows[0];

    // 4. Update scan analytics in the background
    pool.query(
      'UPDATE qr_tags SET scan_count = scan_count + 1, last_scanned_at = NOW() WHERE qr_id = ?',
      [qrRecord.qr_id]
    ).catch(err => console.error('Scan metric update error:', err));

    // 5. Fetch Profile
    const [profileRows] = await pool.query(
      `SELECT contact_number, address, date_of_birth, blood_type, 
              allergies, medical_conditions, medications, important_medical_info, 
              emergency_notes, profile_picture_url 
       FROM emergency_profiles WHERE user_id = ?`,
      [userId]
    );

    const profile = profileRows[0] || {};

    // 6. Fetch Emergency Contacts
    const [contacts] = await pool.query(
      `SELECT contact_id, name, relationship, contact_number, email, is_public 
       FROM emergency_contacts 
       WHERE user_id = ? 
       ORDER BY priority_order ASC, created_at ASC`,
      [userId]
    );

    // 7. Fetch Privacy Settings
    const [privacyRows] = await pool.query(
      'SELECT field_name, is_public FROM privacy_settings WHERE user_id = ?',
      [userId]
    );

    const privacyMap = { ...DEFAULT_PRIVACY_FIELDS };
    for (const row of privacyRows) {
      privacyMap[row.field_name] = Boolean(row.is_public);
    }

    // 8. CRITICAL SERVER-SIDE PRIVACY WHITELIST FILTER
    const sanitizedPublicData = filterPublicEmergencyProfile(user, profile, contacts, privacyMap);

    return res.json({
      status: 'active',
      data: sanitizedPublicData
    });
  } catch (error) {
    console.error('getPublicEmergencyProfile error:', error);
    return res.status(500).json({ message: 'Failed to retrieve emergency profile.', error: error.message });
  }
}
