import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { config } from '../config/env.js';
import { generateSecureQRToken } from '../utils/tokenGenerator.js';
import { DEFAULT_PRIVACY_FIELDS } from '../utils/privacyFilter.js';
import {
  generateVerificationCode,
  hashVerificationCode,
  verifyVerificationCode,
  VERIFICATION_CODE_TTL_MINUTES,
  MAX_VERIFICATION_ATTEMPTS
} from '../utils/verificationCode.js';
import {
  sendEmailVerificationCodeEmail,
  sendEmailChangeNotificationEmail
} from '../utils/brevoEmailService.js';

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
        'INSERT INTO qr_tags (user_id, qr_token, status) VALUES (?, ?, ?)',
        [req.user.user_id, newToken, 'active']
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

/**
 * Updates the account holder's name.
 *
 * Email is intentionally NOT handled here — changing it requires the two-step
 * password + emailed-code flow in requestEmailChange/confirmEmailChange, so that
 * a stolen session cannot silently repoint account recovery to an attacker's
 * inbox.
 */
export async function updateAccountName(req, res) {
  try {
    const { firstName, lastName, middleName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required.' });
    }

    const [result] = await pool.query(
      'UPDATE users SET first_name = ?, middle_name = ?, last_name = ? WHERE user_id = ?',
      [
        firstName.trim(),
        middleName ? middleName.trim() : null,
        lastName.trim(),
        req.user.user_id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      message: 'Name updated successfully.',
      user: {
        firstName: firstName.trim(),
        middleName: middleName ? middleName.trim() : null,
        lastName: lastName.trim()
      }
    });
  } catch (error) {
    console.error('updateAccountName error:', error);
    return res.status(500).json({ message: 'Failed to update name.', error: error.message });
  }
}

/**
 * STEP 1 of the email change: prove ownership of the account by re-entering the
 * password, then email a 6-digit code to the NEW address.
 *
 * Nothing is written to users.email here — the address only moves once
 * confirmEmailChange receives a matching code. At most one pending request can
 * exist per user (UNIQUE KEY on user_id); re-requesting replaces the old one,
 * which also resets the attempt counter.
 */
export async function requestEmailChange(req, res) {
  try {
    const { password, newEmail } = req.body;

    if (!password || !newEmail) {
      return res.status(400).json({ message: 'Password and new email address are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Normalize exactly like register/login so casing can never create duplicates.
    const cleanEmail = newEmail.trim().toLowerCase();

    if (cleanEmail.length > 100) {
      return res.status(400).json({ message: 'Email address must be 100 characters or fewer.' });
    }

    // Compare against a lowercased current value too — older rows may not have
    // been stored lowercase, and without this the guard would miss and email a
    // code to the address the user already has.
    if (cleanEmail === (req.user.email || '').trim().toLowerCase()) {
      return res.status(400).json({ message: 'That is already your current email address.' });
    }

    // 1. Confirm the caller actually holds the account password.
    const [rows] = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Email was not changed.' });
    }

    // 2. The new address must be free. Checked explicitly because users.email is
    //    UNIQUE and would otherwise surface as an opaque ER_DUP_ENTRY 500.
    const [taken] = await pool.query(
      'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
      [cleanEmail, req.user.user_id]
    );

    if (taken.length > 0) {
      return res.status(409).json({ message: 'That email address is already in use by another account.' });
    }

    // 3. Store only the hashed code; the plaintext exists solely in this email.
    const code = generateVerificationCode(6);
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO email_change_verifications (user_id, new_email, code_hash, attempts, expires_at)
       VALUES (?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE
         new_email = VALUES(new_email),
         code_hash = VALUES(code_hash),
         attempts = 0,
         expires_at = VALUES(expires_at),
         created_at = CURRENT_TIMESTAMP`,
      [req.user.user_id, cleanEmail, codeHash, expiresAt]
    );

    // 4. Deliver the code to the NEW address.
    try {
      const emailResult = await sendEmailVerificationCodeEmail({
        recipientEmail: cleanEmail,
        recipientName: `${req.user.first_name} ${req.user.last_name}`,
        code,
        expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES
      });

      return res.json({
        message: `A verification code was sent to ${cleanEmail}.`,
        newEmail: cleanEmail,
        expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES,
        simulated: emailResult.simulated === true
      });
    } catch (emailError) {
      // The request is stored but undeliverable — drop it so the user is not left
      // waiting on a code that will never arrive.
      await pool.query(
        'DELETE FROM email_change_verifications WHERE user_id = ?',
        [req.user.user_id]
      );
      console.error('requestEmailChange: verification email dispatch failed:', emailError);
      return res.status(500).json({
        message: 'Could not send the verification email. Please try again.'
      });
    }
  } catch (error) {
    console.error('requestEmailChange error:', error);
    return res.status(500).json({ message: 'Failed to start email change.', error: error.message });
  }
}

/**
 * STEP 2 of the email change: verify the emailed code and only then commit the
 * new address.
 *
 * A wrong code only increments the attempt counter; once the budget is spent the
 * pending row is destroyed so the remaining 999,995 candidates cannot be walked.
 * An expired, superseded, or already-consumed code is rejected outright.
 */
export async function confirmEmailChange(req, res) {
  try {
    const { code } = req.body;

    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Please enter the 6-digit verification code.' });
    }

    const [rows] = await pool.query(
      `SELECT id, new_email, code_hash, attempts, expires_at
       FROM email_change_verifications
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: 'No pending email change was found. Please start the process again.'
      });
    }

    const pending = rows[0];

    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      await pool.query('DELETE FROM email_change_verifications WHERE id = ?', [pending.id]);
      return res.status(400).json({
        message: 'That verification code has expired. Please request a new one.'
      });
    }

    if (!verifyVerificationCode(code, pending.code_hash)) {
      // Number() guards against a driver returning INT columns as strings — plain
      // `pending.attempts + 1` would concatenate ("0" + 1 === "01") instead of adding.
      const attempts = Number(pending.attempts) + 1;
      const remaining = MAX_VERIFICATION_ATTEMPTS - attempts;

      // Burn the request once the guess budget is gone.
      if (remaining <= 0) {
        await pool.query('DELETE FROM email_change_verifications WHERE id = ?', [pending.id]);
        return res.status(400).json({
          message: 'Too many incorrect codes. Please request a new verification email.'
        });
      }

      await pool.query(
        'UPDATE email_change_verifications SET attempts = attempts + 1 WHERE id = ?',
        [pending.id]
      );

      return res.status(400).json({
        message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // Code is valid. Re-check availability: another account may have claimed the
    // address while this code was pending.
    const [taken] = await pool.query(
      'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
      [pending.new_email, req.user.user_id]
    );

    if (taken.length > 0) {
      await pool.query('DELETE FROM email_change_verifications WHERE id = ?', [pending.id]);
      return res.status(409).json({
        message: 'That email address is already in use by another account.'
      });
    }

    const previousEmail = req.user.email;
    const newEmail = pending.new_email;

    // The SELECT above already checked availability, but two accounts can race
    // between that check and this write — the UNIQUE index is the real arbiter.
    // ER_DUP_ENTRY (1062) is translated into the same 409 the pre-check produces.
    let result;
    try {
      [result] = await pool.query(
        'UPDATE users SET email = ? WHERE user_id = ?',
        [newEmail, req.user.user_id]
      );
    } catch (updateError) {
      if (updateError.code === 'ER_DUP_ENTRY') {
        await pool.query('DELETE FROM email_change_verifications WHERE id = ?', [pending.id]);
        return res.status(409).json({
          message: 'That email address is already in use by another account.'
        });
      }
      throw updateError;
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Code is single-use: the request is consumed whether or not the notice sends.
    await pool.query('DELETE FROM email_change_verifications WHERE id = ?', [pending.id]);

    // Alert the OLD address. Failure here must not roll back a change the user
    // has already proven they own, so it is logged and swallowed.
    try {
      await sendEmailChangeNotificationEmail({
        previousEmail,
        newEmail,
        recipientName: `${req.user.first_name} ${req.user.last_name}`,
        changedAt: new Date().toUTCString()
      });
    } catch (notifyError) {
      console.error('confirmEmailChange: change notice to previous address failed:', notifyError);
    }

    return res.json({
      message: 'Email address updated successfully.',
      previousEmail,
      newEmail
    });
  } catch (error) {
    console.error('confirmEmailChange error:', error);
    return res.status(500).json({ message: 'Failed to confirm email change.', error: error.message });
  }
}

/**
 * Abandons a pending email change without applying it.
 */
export async function cancelEmailChange(req, res) {
  try {
    await pool.query(
      'DELETE FROM email_change_verifications WHERE user_id = ?',
      [req.user.user_id]
    );

    return res.json({ message: 'Pending email change cancelled.' });
  } catch (error) {
    console.error('cancelEmailChange error:', error);
    return res.status(500).json({ message: 'Failed to cancel email change.', error: error.message });
  }
}
