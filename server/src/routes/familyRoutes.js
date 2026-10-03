import express from 'express';
import { randomBytes } from 'node:crypto';
import pool from '../config/db.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { familySchema } from '../utils/familyValidation.js';

const router = express.Router();
router.use(authenticate);
export const decode = value => typeof value === 'string' ? JSON.parse(value) : value;
router.get('/', async (req, res, next) => {
  try {
    const [members] = await pool.query('SELECT * FROM family_members WHERE user_id = ? AND archived = 0 ORDER BY member_id', [req.user.user_id]);
    res.json({ members: members.map(({ qr_token, ...m }) => ({ ...m, profile: decode(m.profile), contacts: decode(m.contacts), privacy: decode(m.privacy) })) });
  } catch (err) { next(err); }
});
async function save(req, res, next) {
  const parsed = familySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Provide names and valid family profile and contact details.' });
  const m = parsed.data;
  const values = [m.first_name, m.last_name, m.relationship, JSON.stringify(m.profile), JSON.stringify(m.contacts), JSON.stringify(m.privacy)];
  try {
    if (req.params.id) {
      const [result] = await pool.query('UPDATE family_members SET first_name=?, last_name=?, relationship=?, profile=?, contacts=?, privacy=? WHERE member_id=? AND user_id=? AND archived=0', [...values, req.params.id, req.user.user_id]);
      if (!result.affectedRows) return res.status(404).json({ message: 'Family member not found.' });
    } else {
      await pool.query('INSERT INTO family_members (first_name,last_name,relationship,profile,contacts,privacy,user_id,qr_token) VALUES (?,?,?,?,?,?,?,?)', [...values, req.user.user_id, 'fm_' + randomBytes(24).toString('hex')]);
    }
    res.json({ message: 'Family member saved.' });
  } catch (err) { next(err); }
}
router.post('/', save);
router.put('/:id', save);
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('UPDATE family_members SET archived=1 WHERE member_id=? AND user_id=? AND archived=0', [req.params.id, req.user.user_id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Family member not found.' });
    res.json({ message: 'Member archived. Their QR code is now inactive.' });
  } catch (err) { next(err); }
});
export default router;
