import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import pool from '../config/db.js';

export async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.resqtag_token;

    // Also support Authorization header for mobile/API clients
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Check if user still exists and is active
    const [rows] = await pool.query(
      'SELECT user_id, first_name, middle_name, last_name, email, role, account_status FROM users WHERE user_id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User account not found.' });
    }

    const user = rows[0];

    if (user.account_status !== 'active') {
      return res.status(403).json({ message: `Account is ${user.account_status}. Please contact support.` });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired or invalid token. Please log in again.' });
    }
    return res.status(500).json({ message: 'Authentication error', error: error.message });
  }
}
