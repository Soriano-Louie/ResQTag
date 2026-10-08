import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { config } from '../config/env.js';
import { sanitizeEmail, USER_EMAIL_MAX_LENGTH } from '../utils/emailValidation.js';
import { generateVerificationCode, safeCompare, VERIFICATION_CODE_TTL_MINUTES, MAX_VERIFICATION_ATTEMPTS } from '../utils/verificationCode.js';
import { sendPasswordResetCodeEmail } from '../utils/brevoEmailService.js';

const ID_PATTERN = /^[a-f0-9]{64}$/;
const genericMessage = 'If an active account uses this email, a verification code has been sent. Check your inbox and spam folder.';
const invalidMessage = 'This verification has expired or is invalid. Please request a new code.';
const invalidCodeMessage = 'The code is incorrect or expired. Try again, or request a new code.';
const digest = value => crypto.createHmac('sha256', config.jwtSecret).update(value).digest('hex');
const newId = () => crypto.randomBytes(32).toString('hex');
const expiresAt = () => new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60000);

export async function requestPasswordReset(req, res) {
  res.set('Cache-Control', 'no-store');
  const email = sanitizeEmail(req.body?.email, USER_EMAIL_MAX_LENGTH);
  if (!email) return res.status(400).json({ message: 'Please enter a valid account email address.' });
  const requestId = newId();
  try {
    const [users] = await pool.query('SELECT user_id, email, password_hash, account_status FROM users WHERE email = ?', [email]);
    const user = users[0];
    if (user?.account_status === 'active') {
      const code = generateVerificationCode();
      await pool.query(
        `INSERT INTO password_reset_verifications
         (user_id, request_id, email, password_fingerprint, code_hash, attempts, expires_at, reset_token_hash)
         VALUES (?, ?, ?, ?, ?, 0, ?, NULL)
         ON DUPLICATE KEY UPDATE request_id=VALUES(request_id), email=VALUES(email),
           password_fingerprint=VALUES(password_fingerprint), code_hash=VALUES(code_hash),
           attempts=0, expires_at=VALUES(expires_at), reset_token_hash=NULL`,
        [user.user_id, requestId, user.email, digest(user.password_hash), digest(`${requestId}:${code}`), expiresAt()]
      );
      try {
        await sendPasswordResetCodeEmail({ recipientEmail: user.email, code, expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES });
      } catch (error) {
        // Do not remove a newer request if a previous delivery finishes late.
        await pool.query('DELETE FROM password_reset_verifications WHERE request_id = ?', [requestId]);
        console.error('Password reset email delivery failed:', error.message);
      }
    }
    // Same response for unknown, inactive and active accounts. Never return the code.
    return res.status(202).json({ message: genericMessage, requestId, expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES });
  } catch (error) {
    console.error('Password reset request failed:', error.message);
    return res.status(503).json({ message: 'Password reset is temporarily unavailable. Please try again later.' });
  }
}

// Serialize attempts and consumption so simultaneous requests cannot reuse a code/token.
async function loadPending(connection, requestId) {
  const [rows] = await connection.query(
    `SELECT r.*, u.email AS current_email, u.password_hash, u.account_status
     FROM password_reset_verifications r JOIN users u ON u.user_id=r.user_id
     WHERE r.request_id = ? FOR UPDATE`, [requestId]
  );
  return rows[0];
}
function isCurrent(pending) {
  return pending && pending.account_status === 'active' &&
    pending.email === pending.current_email &&
    safeCompare(pending.password_fingerprint, digest(pending.password_hash)) &&
    new Date(pending.expires_at).getTime() > Date.now();
}

export async function verifyPasswordReset(req, res) {
  res.set('Cache-Control', 'no-store');
  const { requestId, code } = req.body || {};
  if (typeof requestId !== 'string' || !ID_PATTERN.test(requestId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Please enter the six-digit code from your reset email.' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const pending = await loadPending(connection, requestId);
    if (!isCurrent(pending) || pending.reset_token_hash || Number(pending.attempts) >= MAX_VERIFICATION_ATTEMPTS) {
      await connection.rollback();
      return res.status(400).json({ message: invalidCodeMessage });
    }
    if (!safeCompare(digest(`${requestId}:${code}`), pending.code_hash)) {
      await connection.query('UPDATE password_reset_verifications SET attempts=attempts+1 WHERE request_id = ?', [requestId]);
      await connection.commit();
      return res.status(400).json({ message: invalidCodeMessage });
    }
    const resetToken = newId();
    await connection.query('UPDATE password_reset_verifications SET reset_token_hash=?, code_hash=NULL, expires_at=? WHERE request_id=?', [digest(resetToken), expiresAt(), requestId]);
    await connection.commit();
    return res.json({ message: 'Email verified. You can now choose a new password.', resetToken });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Password reset verification failed:', error.message);
    return res.status(503).json({ message: 'Could not verify the code. Please try again.' });
  } finally { connection?.release(); }
}

export async function confirmPasswordReset(req, res) {
  res.set('Cache-Control', 'no-store');
  const { requestId, resetToken, newPassword, confirmNewPassword } = req.body || {};
  if (typeof requestId !== 'string' || !ID_PATTERN.test(requestId) || typeof resetToken !== 'string' || !ID_PATTERN.test(resetToken)) {
    return res.status(400).json({ message: invalidMessage });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ message: 'Use at least 6 characters and no more than 72 bytes for your password.' });
  }
  if (typeof confirmNewPassword !== 'string' || newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: 'The new passwords do not match.' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const pending = await loadPending(connection, requestId);
    if (!isCurrent(pending) || !pending.reset_token_hash || !safeCompare(digest(resetToken), pending.reset_token_hash)) {
      await connection.rollback();
      return res.status(400).json({ message: invalidMessage });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await connection.query('UPDATE users SET password_hash=?, session_version=session_version+1 WHERE user_id=?', [passwordHash, pending.user_id]);
    await connection.query('DELETE FROM password_reset_verifications WHERE request_id = ?', [requestId]);
    // A pending email change authorized with the old password must not survive recovery.
    await connection.query('DELETE FROM email_change_verifications WHERE user_id = ?', [pending.user_id]);
    await connection.commit();
    res.clearCookie('resqtag_token', { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: config.nodeEnv === 'production' ? 'none' : 'lax' });
    return res.json({ message: 'Password changed successfully. Log in with your new password.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Password reset confirmation failed:', error.message);
    return res.status(503).json({ message: 'Could not change the password. Please try again.' });
  } finally { connection?.release(); }
}
