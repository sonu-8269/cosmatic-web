import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Send SMS OTP using MSG91 with graceful fallback in development
 */
export const sendSmsOtp = async (phone, otp) => {
  const isConfigured = Boolean(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID);

  if (isConfigured) {
    try {
      const response = await axios.post(
        'https://control.msg91.com/api/v5/otp',
        {
          template_id: env.MSG91_TEMPLATE_ID,
          mobile: phone.startsWith('+') ? phone.replace('+', '') : `91${phone}`,
          otp,
        },
        {
          headers: {
            authkey: env.MSG91_AUTH_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      logger.info(`MSG91 SMS sent successfully to ${phone}`);
      return { success: true, response: response.data };
    } catch (error) {
      logger.error(`MSG91 Error: ${error.response?.data?.message || error.message}`);
      // In development fallback to console logging
      if (env.NODE_ENV !== 'production') {
        logger.warn(`[SMS SIMULATOR FALLBACK] Phone: ${phone} | OTP: ${otp}`);
        return { success: true, simulated: true };
      }
      throw error;
    }
  } else {
    // Development simulator
    logger.info(`===============================================`);
    logger.info(`📱 [SMS SIMULATOR] To: ${phone} | OTP: ${otp}`);
    logger.info(`   Valid for ${env.OTP_EXPIRY_MINUTES} minutes.`);
    logger.info(`===============================================`);
    return { success: true, simulated: true };
  }
};
