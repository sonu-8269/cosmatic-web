import { Router } from 'express';
import {
  adminLogin,
  verifyAdmin2FA,
  refreshAdminToken,
  logoutAdmin,
  getAdminProfile,
} from '../controllers/admin/auth.controller.js';
import {
  getAvailablePermissions,
  createTeamMember,
  getTeamMembers,
  getTeamMemberById,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/admin/team.controller.js';
import { getDashboardStats } from '../controllers/admin/dashboard.controller.js';
import { getActivityLogs } from '../controllers/admin/logs.controller.js';
import {
  createCategory,
  getAdminCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/admin/category.controller.js';
import {
  createProduct,
  getAdminProducts,
  getAdminProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/admin/product.controller.js';

import { validate } from '../middlewares/validate.middleware.js';
import { uploadSingle, uploadMultiple } from '../middlewares/upload.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';
import { authenticateAdmin, authenticateTeamOrAdmin } from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../middlewares/rateLimit.middleware.js';

import { adminLoginSchema, admin2FaVerifySchema } from '../validators/auth.validator.js';
import {
  createTeamMemberSchema,
  updateTeamMemberPermissionsSchema,
} from '../validators/team.validator.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator.js';
import {
  createProductSchema,
  updateProductSchema,
} from '../validators/product.validator.js';

const router = Router();

// ==========================================
// Super Admin Auth Routes
// ==========================================
router.post('/auth/login', loginRateLimiter, validate(adminLoginSchema), adminLogin);
router.post('/auth/verify-2fa', validate(admin2FaVerifySchema), verifyAdmin2FA);
router.post('/auth/refresh-token', refreshAdminToken);
router.post('/auth/logout', authenticateAdmin, logoutAdmin);
router.get('/auth/me', authenticateAdmin, getAdminProfile);

// ==========================================
// Dashboard & Analytics
// ==========================================
router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);
router.get('/logs', authenticateAdmin, getActivityLogs);

// ==========================================
// Team & Permissions Management (Super Admin Only)
// ==========================================
router.get('/team/permissions', authenticateAdmin, getAvailablePermissions);
router.post('/team', authenticateAdmin, validate(createTeamMemberSchema), createTeamMember);
router.get('/team', authenticateAdmin, getTeamMembers);
router.get('/team/:id', authenticateAdmin, getTeamMemberById);
router.patch('/team/:id', authenticateAdmin, validate(updateTeamMemberPermissionsSchema), updateTeamMember);
router.delete('/team/:id', authenticateAdmin, deleteTeamMember);

// ==========================================
// Categories Management (Super Admin & Staff with Permission)
// ==========================================
router.post(
  '/categories',
  authenticateTeamOrAdmin,
  checkPermission('categories.create'),
  uploadSingle('image'),
  validate(createCategorySchema),
  createCategory
);

router.get(
  '/categories',
  authenticateTeamOrAdmin,
  checkPermission('categories.view'),
  getAdminCategories
);

router.get(
  '/categories/:id',
  authenticateTeamOrAdmin,
  checkPermission('categories.view'),
  getCategoryById
);

router.patch(
  '/categories/:id',
  authenticateTeamOrAdmin,
  checkPermission('categories.edit'),
  uploadSingle('image'),
  validate(updateCategorySchema),
  updateCategory
);

router.delete(
  '/categories/:id',
  authenticateTeamOrAdmin,
  checkPermission('categories.delete'),
  deleteCategory
);

// ==========================================
// Products Management (Super Admin & Staff with Permission)
// Note: buyingPrice is explicitly included in Admin responses
// ==========================================
router.post(
  '/products',
  authenticateTeamOrAdmin,
  checkPermission('products.create'),
  uploadMultiple('images', 8),
  validate(createProductSchema),
  createProduct
);

router.get(
  '/products',
  authenticateTeamOrAdmin,
  checkPermission('products.view'),
  getAdminProducts
);

router.get(
  '/products/:id',
  authenticateTeamOrAdmin,
  checkPermission('products.view'),
  getAdminProductById
);

router.patch(
  '/products/:id',
  authenticateTeamOrAdmin,
  checkPermission('products.edit'),
  uploadMultiple('images', 8),
  validate(updateProductSchema),
  updateProduct
);

router.delete(
  '/products/:id',
  authenticateTeamOrAdmin,
  checkPermission('products.delete'),
  deleteProduct
);

export default router;
