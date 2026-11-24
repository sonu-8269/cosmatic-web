import { Router } from 'express';
import {
  sendOtp,
  verifyOtpAndLogin,
  registerWithEmail,
  loginWithPassword,
  refreshCustomerToken,
  logoutCustomer,
  getCustomerProfile,
} from '../controllers/customer/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  customerRegisterSchema,
  customerLoginSchema,
} from '../validators/auth.validator.js';
import { otpRateLimiter, loginRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { authenticateCustomer } from '../middlewares/auth.middleware.js';

const router = Router();

// Authentication Endpoints
router.post('/auth/send-otp', otpRateLimiter, validate(sendOtpSchema), sendOtp);
router.post('/auth/verify-otp', validate(verifyOtpSchema), verifyOtpAndLogin);
router.post('/auth/register', validate(customerRegisterSchema), registerWithEmail);
router.post('/auth/login', loginRateLimiter, validate(customerLoginSchema), loginWithPassword);
router.post('/auth/refresh-token', refreshCustomerToken);
router.post('/auth/logout', authenticateCustomer, logoutCustomer);
router.get('/auth/me', authenticateCustomer, getCustomerProfile);

export default router;
