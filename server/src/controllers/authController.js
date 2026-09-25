import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { config } from '../config/env.js';
import { generateSecureQRToken } from '../utils/tokenGenerator.js';
import { DEFAULT_PRIVACY_FIELDS } from '../utils/privacyFilter.js';

const COOKIE_NAME = 'resqtag_token';

function getCookieOptions() {
  const isProd = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProd, // Must be true in HTTPS / Render production
    sameSite: isProd ? 'none' : 'lax', // 'none' allows cross-origin cookie with credentials (Render + frontend on Vercel/Render)
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

function generateToken(userId, role) {
  return jwt.sign({ userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

export async function register(req, res) {
  const connection = await pool.getConnection();
  try {
    const { firstName, middleName, lastName, email, password, confirmPassword } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'First name, last name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing email
    const [existing] = await connection.query('SELECT user_id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    await connection.beginTransaction();

    // 1. Create User
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const [userResult] = await connection.query(
      `INSERT INTO users (first_name, middle_name, last_name, email, password_hash, role, account_status)
       VALUES (?, ?, ?, ?, ?, 'user', 'active')`,
      [firstName.trim(), middleName ? middleName.trim() : null, lastName.trim(), cleanEmail, passwordHash]
    );

    const userId = userResult.insertId;

    // 2. Initialize Emergency Profile
    await connection.query(
      `INSERT INTO emergency_profiles (user_id) VALUES (?)`,
      [userId]
    );

    // 3. Initialize Default Privacy Settings
    const privacyEntries = Object.entries(DEFAULT_PRIVACY_FIELDS);
    for (const [field, isPublic] of privacyEntries) {
      await connection.query(
        `INSERT INTO privacy_settings (user_id, field_name, is_public) VALUES (?, ?, ?)`,
        [userId, field, isPublic]
      );
    }

    // 4. Generate Initial QR Tag
    const qrToken = generateSecureQRToken();
    await connection.query(
      `INSERT INTO qr_tags (user_id, qr_token, status) VALUES (?, ?, 'active')`,
      [userId, qrToken]
    );

    await connection.commit();

    const token = generateToken(userId, 'user');
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(201).json({
      message: 'Account created successfully.',
      user: {
        userId,
        firstName: firstName.trim(),
        middleName: middleName ? middleName.trim() : null,
        lastName: lastName.trim(),
        email: cleanEmail,
        role: 'user'
      },
      token // also return in JSON for flexibility
    });
  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed. Please try again.', error: error.message });
  } finally {
    connection.release();
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT user_id, first_name, middle_name, last_name, email, password_hash, role, account_status FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    if (user.account_status !== 'active') {
      return res.status(403).json({ message: `Your account is ${user.account_status}. Please contact support.` });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user.user_id, user.role);
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.json({
      message: 'Logged in successfully.',
      user: {
        userId: user.user_id,
        firstName: user.first_name,
        middleName: user.middle_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
}

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, getCookieOptions());
  return res.json({ message: 'Logged out successfully.' });
}

export async function getMe(req, res) {
  try {
    const [userRows] = await pool.query(
      'SELECT user_id, first_name, middle_name, last_name, email, role, account_status, created_at FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userRows[0];

    // Ensure user's QR tag exists
    let [qrRows] = await pool.query(
      'SELECT qr_token, status, scan_count, last_scanned_at FROM qr_tags WHERE user_id = ?',
      [req.user.user_id]
    );

    if (qrRows.length === 0) {
      const newToken = generateSecureQRToken();
      await pool.query(
        'INSERT INTO qr_tags (user_id, qr_token, status) VALUES (?, ?, "active")',
        [req.user.user_id, newToken]
      );
      qrRows = [{ qr_token: newToken, status: 'active', scan_count: 0, last_scanned_at: null }];
    }

    // Ensure emergency profile exists
    const [profileRows] = await pool.query(
      'SELECT profile_id FROM emergency_profiles WHERE user_id = ?',
      [req.user.user_id]
    );
    if (profileRows.length === 0) {
      await pool.query(
        'INSERT INTO emergency_profiles (user_id) VALUES (?)',
        [req.user.user_id]
      );
    }

    return res.json({
      user: {
        userId: user.user_id,
        firstName: user.first_name,
        middleName: user.middle_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        accountStatus: user.account_status,
        createdAt: user.created_at
      },
      qr: qrRows[0]
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ message: 'Failed to fetch user session.', error: error.message });
  }
}

export async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'New passwords do not match.' });
    }

    const [rows] = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [newHash, req.user.user_id]
    );

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('updatePassword error:', error);
    return res.status(500).json({ message: 'Failed to update password.', error: error.message });
  }
}

export async function deleteAccount(req, res) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Please enter your password to confirm account deletion.' });
    }

    const [rows] = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Account was not deleted.' });
    }

    // Cascade deletion handles profile, contacts, privacy_settings, and qr_tags
    await pool.query('DELETE FROM users WHERE user_id = ?', [req.user.user_id]);

    res.clearCookie(COOKIE_NAME, getCookieOptions());
    return res.json({ message: 'Account deleted permanently.' });
  } catch (error) {
    console.error('deleteAccount error:', error);
    return res.status(500).json({ message: 'Failed to delete account.', error: error.message });
  }
}
