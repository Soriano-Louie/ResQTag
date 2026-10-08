import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';

/**
 * General API Rate Limiter
 * 300 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests from this IP. Please try again later.'
  }
});

/**
 * Strict Auth Limiter (Login, Register, Password Reset)
 * 10 requests per 15 minutes per IP to defeat brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    status: 429,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
  }
});

/**
 * Public Emergency QR Token Limiter
 * 60 requests per minute per IP
 * Protects against automated token harvesting while ensuring responders can view emergency info instantly
 */
export const publicQRLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many emergency profile scans requested. Please try again in a moment.'
  }
});

/**
 * Sensitive Mutation Limiter (Tag Orders, Profile Modifications)
 * 30 requests per 15 minutes per IP
 */
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Order submission rate limit exceeded. Please wait a few minutes.'
  }
});

/**
 * Email Change Limiter (request code + confirm code)
 * 20 requests per 15 minutes per IP.
 *
 * Deliberately looser than authLimiter (10/15min): the email change flow needs
 * several legitimate calls in a row (request code, resend, confirm), and 10 would
 * lock users out mid-flow.
 *
 * Code brute force is NOT primarily defended by this limiter — a 6-digit code has
 * only 1,000,000 combinations. That is handled per-account by the attempts
 * column in email_change_verifications, which invalidates the request after 5
 * wrong guesses. This limiter is a coarse second layer against bulk automated
 * spraying across many accounts.
 */
export const emailChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many email change attempts. Please wait 15 minutes before trying again.'
  }
});

// Separate recovery budgets avoid locking users out of login while resetting.
export const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many reset requests. Please wait 15 minutes and try again.' }
});
export const passwordResetEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => crypto.createHash('sha256').update(String(req.body?.email || '').trim().toLowerCase()).digest('hex'),
  message: { message: 'Too many reset requests for this email. Please wait 15 minutes and try again.' }
});
export const passwordResetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many reset attempts. Please wait 15 minutes and try again.' }
});
