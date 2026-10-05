import pool from '../config/db.js';
import { readPhoto } from '../utils/profilePhoto.js';
import { filterPublicEmergencyProfile, DEFAULT_PRIVACY_FIELDS } from '../utils/privacyFilter.js';

export async function getPublicEmergencyProfile(req, res) {
  try {
    const { token } = req.params;
    res.set?.('Cache-Control', 'no-store');

    if (!token || typeof token !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(token.trim())) {
      return res.status(400).json({ message: 'Invalid ResQTag emergency token format.' });
    }

    if (token.startsWith('fm_')) {
      const [rows] = await pool.query(`SELECT m.*, u.account_status FROM family_members m JOIN users u ON u.user_id=m.user_id WHERE m.qr_token=?`, [token]);
      if (!rows.length) return res.status(404).json({ status: 'not_found', message: 'Family tag not found.' });
      const m = rows[0];
      if (m.archived || m.account_status !== 'active') return res.json({ status: 'inactive', message: 'This family tag is inactive.' });
      const decode = v => typeof v === 'string' ? JSON.parse(v) : v;
      const privacy = Object.fromEntries(Object.keys(DEFAULT_PRIVACY_FIELDS).map(key => [key, decode(m.privacy)?.[key] === true ? 1 : 0]));
      const profile = { ...decode(m.profile), profile_picture_url: privacy.profile_picture ? await readPhoto(m.user_id, m.member_id) : null };
      return res.json({ status: 'active', data: filterPublicEmergencyProfile(m, profile, decode(m.contacts), privacy) });
    }
    // 1. Fetch QR Tag Record
    const [qrRows] = await pool.query(
      `SELECT q.qr_id, q.user_id, q.qr_token, q.status,
              u.first_name, u.middle_name, u.last_name, u.email, u.account_status,
              p.contact_number, p.address, p.date_of_birth, p.blood_type,
              p.allergies, p.medical_conditions, p.medications,
              p.important_medical_info, p.emergency_notes
       FROM qr_tags q
       LEFT JOIN users u ON u.user_id = q.user_id
       LEFT JOIN emergency_profiles p ON p.user_id = q.user_id
       WHERE q.qr_token = ?`,
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

    // Tag, account and profile are retrieved in one indexed lookup.
    if (qrRecord.account_status !== 'active') {
      return res.status(200).json({
        status: 'inactive',
        message: 'This ResQTag account is currently inactive.'
      });
    }
    const user = qrRecord;
    const profile = { ...qrRecord };

    // 4. Update scan analytics in the background
    pool.query(
      'UPDATE qr_tags SET scan_count = scan_count + 1, last_scanned_at = NOW() WHERE qr_id = ?',
      [qrRecord.qr_id]
    ).catch(err => console.error('Scan metric update error:', err));

    // Independent reads share one wait instead of two sequential round trips.
    const [[contacts], [privacyRows]] = await Promise.all([
      pool.query(
        `SELECT contact_id, name, relationship, contact_number, email, is_public
         FROM emergency_contacts WHERE user_id = ?
         ORDER BY priority_order ASC, created_at ASC`,
        [userId]
      ),
      pool.query(
        'SELECT field_name, is_public FROM privacy_settings WHERE user_id = ?',
        [userId]
      )
    ]);

    const privacyMap = { ...DEFAULT_PRIVACY_FIELDS };
    for (const row of privacyRows) {
      privacyMap[row.field_name] = Boolean(row.is_public);
    }

    // 8. CRITICAL SERVER-SIDE PRIVACY WHITELIST FILTER
    profile.profile_picture_url = privacyMap.profile_picture ? await readPhoto(userId) : null;
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
