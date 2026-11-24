import { z } from 'zod';
import { ALL_PERMISSIONS } from '../utils/permissions.js';

export const sendOtpSchema = {
  body: z.object({
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number')
      .optional(),
    email: z.string().email('Please enter a valid email address').optional(),
  }).refine((data) => data.phone || data.email, {
    message: 'Either phone number or email is required to send OTP',
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    identifier: z.string().min(3, 'Identifier (phone or email) is required'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
    type: z.enum(['SMS', 'EMAIL']).default('SMS'),
  }),
};

export const customerRegisterSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile number').optional(),
  }),
};

export const customerLoginSchema = {
  body: z.object({
    emailOrPhone: z.string().min(3, 'Email or Phone is required'),
    password: z.string().min(6, 'Password is required'),
  }),
};

export const adminLoginSchema = {
  body: z.object({
    email: z.string().email('Valid admin email is required'),
    password: z.string().min(6, 'Password is required'),
  }),
};

export const admin2FaVerifySchema = {
  body: z.object({
    email: z.string().email('Valid email is required'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
};

export const teamLoginSchema = {
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password is required'),
  }),
};
