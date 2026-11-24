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
import {
  getCustomerCategories,
  getCategoryBySlug,
} from '../controllers/customer/category.controller.js';
import {
  getCustomerProducts,
  getCustomerProductBySlug,
  getFeaturedProducts,
  getProductFilterMeta,
} from '../controllers/customer/product.controller.js';

import { validate } from '../middlewares/validate.middleware.js';
import { otpRateLimiter, loginRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { authenticateCustomer } from '../middlewares/auth.middleware.js';

import {
  sendOtpSchema,
  verifyOtpSchema,
  customerRegisterSchema,
  customerLoginSchema,
} from '../validators/auth.validator.js';
import { customerProductQuerySchema } from '../validators/product.validator.js';

const router = Router();

// ==========================================
// Customer Authentication Endpoints
// ==========================================
router.post('/auth/send-otp', otpRateLimiter, validate(sendOtpSchema), sendOtp);
router.post('/auth/verify-otp', validate(verifyOtpSchema), verifyOtpAndLogin);
router.post('/auth/register', validate(customerRegisterSchema), registerWithEmail);
router.post('/auth/login', loginRateLimiter, validate(customerLoginSchema), loginWithPassword);
router.post('/auth/refresh-token', refreshCustomerToken);
router.post('/auth/logout', authenticateCustomer, logoutCustomer);
router.get('/auth/me', authenticateCustomer, getCustomerProfile);

// ==========================================
// Storefront Categories Endpoints
// ==========================================
router.get('/categories', getCustomerCategories);
router.get('/categories/:slug', getCategoryBySlug);

// ==========================================
// Storefront Products Endpoints (buyingPrice NEVER included)
// ==========================================
router.get('/products', validate(customerProductQuerySchema), getCustomerProducts);
router.get('/products/featured', getFeaturedProducts);
router.get('/products/filters', getProductFilterMeta);
router.get('/products/:slug', getCustomerProductBySlug);

export default router;
