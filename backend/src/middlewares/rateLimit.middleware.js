import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apiError.js';

/**
 * Strict Rate Limiter for OTP Requests (Send / Resend OTP)
 * Max 3 requests per 10 minutes per IP
 */
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many OTP requests. Please wait 10 minutes before trying again.'));
  },
});

/**
 * Login Attempt Rate Limiter
 * Max 10 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many login attempts. Please try again after 15 minutes.'));
  },
});

/**
 * General API Rate Limiter
 */
export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many requests. Please slow down.'));
  },
});
