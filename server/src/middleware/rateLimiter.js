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
