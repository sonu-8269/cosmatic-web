import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (env.SMTP_USER && env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }
  return transporter;
};

/**
 * Send an email with graceful development simulator fallback
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const mailClient = getTransporter();

  if (mailClient) {
    try {
      const info = await mailClient.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Nodemailer error: ${error.message}`);
      if (env.NODE_ENV !== 'production') {
        logger.warn(`[EMAIL SIMULATOR FALLBACK] To: ${to} | Subject: ${subject}`);
        return { success: true, simulated: true };
      }
      throw error;
    }
  } else {
    // Simulator mode
    logger.info(`===============================================`);
    logger.info(`📧 [EMAIL SIMULATOR] To: ${to}`);
    logger.info(`   Subject: ${subject}`);
    logger.info(`   Body: ${text || html}`);
    logger.info(`===============================================`);
    return { success: true, simulated: true };
  }
};

export const sendOtpEmail = async (email, otp) => {
  const subject = `Your Verification Code: ${otp}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #f0e6e6; border-radius: 8px;">
      <h2 style="color: #be185d; text-align: center;">Cosmetics Store</h2>
      <p>Hello,</p>
      <p>Your one-time verification code is:</p>
      <div style="background-color: #fdf2f8; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #9d174d; border-radius: 6px;">
        ${otp}
      </div>
      <p style="font-size: 13px; color: #666; margin-top: 15px;">
        This code is valid for ${env.OTP_EXPIRY_MINUTES} minutes. If you did not request this code, please ignore this email.
      </p>
    </div>
  `;
  return sendEmail({ to: email, subject, html, text: `Your OTP is: ${otp}` });
};
