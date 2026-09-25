import pool from '../config/db.js';

export async function getAdminStats(req, res) {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users WHERE role = "user"');
    const [[{ activeTags }]] = await pool.query('SELECT COUNT(*) AS activeTags FROM qr_tags WHERE status = "active"');
    const [[{ totalScans }]] = await pool.query('SELECT COALESCE(SUM(scan_count), 0) AS totalScans FROM qr_tags');

    return res.json({
      stats: {
        totalUsers,
        activeTags,
        totalScans
      }
    });
  } catch (error) {
    console.error('getAdminStats error:', error);
    return res.status(500).json({ message: 'Failed to retrieve admin stats.', error: error.message });
  }
}

export async function getUsers(req, res) {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const searchPattern = `%${search.trim()}%`;

    const [users] = await pool.query(
      `SELECT u.user_id, u.first_name, u.middle_name, u.last_name, u.email, u.role, 
              u.account_status, u.created_at, q.qr_token, q.status AS qr_status, 
              q.scan_count, q.last_scanned_at
       FROM users u
       LEFT JOIN qr_tags q ON u.user_id = q.user_id
       WHERE u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [searchPattern, searchPattern, searchPattern, parseInt(limit, 10), offset]
    );

    const [[{ totalCount }]] = await pool.query(
      `SELECT COUNT(*) AS totalCount FROM users 
       WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?`,
      [searchPattern, searchPattern, searchPattern]
    );

    return res.json({
      users,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ message: 'Failed to retrieve users.', error: error.message });
  }
}

export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    if (!['active', 'suspended', 'deactivated'].includes(accountStatus)) {
      return res.status(400).json({ message: 'Invalid account status value.' });
    }

    // Prevent changing admin's own status to inactive
    if (parseInt(id, 10) === req.user.user_id && accountStatus !== 'active') {
      return res.status(400).json({ message: 'You cannot suspend your own administrator account.' });
    }

    const [result] = await pool.query(
      'UPDATE users SET account_status = ? WHERE user_id = ?',
      [accountStatus, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ message: `User account status updated to ${accountStatus}.` });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({ message: 'Failed to update user status.', error: error.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.user_id) {
      return res.status(400).json({ message: 'You cannot delete your own administrator account.' });
    }

    const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ message: 'Failed to delete user.', error: error.message });
  }
}
