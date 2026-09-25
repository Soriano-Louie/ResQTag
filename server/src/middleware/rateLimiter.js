import rateLimit from 'express-rate-limit';

// Strict rate limit for login and registration attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 25 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  }
});

// General public QR emergency scan rate limiter
export const publicQRLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 scan requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many emergency profile requests, please wait a moment.'
  }
});
