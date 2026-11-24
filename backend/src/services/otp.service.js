import crypto from 'crypto';
import { Otp } from '../models/Otp.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

/**
 * Generate a 6-digit numeric OTP
 */
export const generateNumericOtp = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, 10)];
  }
  return otp;
};

/**
 * Hash OTP before database storage
 */
export const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Create and persist a new OTP record
 */
export const createOtp = async (identifier, type = 'SMS') => {
  const plainOtp = generateNumericOtp(6);
  const otpHash = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any active OTPs for this identifier
  await Otp.deleteMany({ identifier, type });

  await Otp.create({
    identifier,
    type,
    otpHash,
    expiresAt,
    attempts: 0,
  });

  logger.info(`OTP generated for ${identifier} (${type}). Expiry: ${env.OTP_EXPIRY_MINUTES} mins`);
  return plainOtp;
};

/**
 * Verify provided OTP against stored hash
 */
export const verifyOtp = async (identifier, plainOtp, type = 'SMS') => {
  const otpRecord = await Otp.findOne({ identifier, type });

  if (!otpRecord) {
    throw new ApiError(400, 'Invalid or expired OTP. Please request a new one.');
  }

  // Check if expired
  if (new Date() > otpRecord.expiresAt) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // Check max attempts
  if (otpRecord.attempts >= env.OTP_MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError(429, 'Too many failed attempts. Please request a new OTP.');
  }

  const hashedInput = hashOtp(plainOtp);
  if (hashedInput !== otpRecord.otpHash) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = env.OTP_MAX_ATTEMPTS - otpRecord.attempts;
    throw new ApiError(400, `Incorrect OTP. You have ${remaining} attempts remaining.`);
  }

  // Valid OTP: delete record so it cannot be reused
  await Otp.deleteOne({ _id: otpRecord._id });
  return true;
};
