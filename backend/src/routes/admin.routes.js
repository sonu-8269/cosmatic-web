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
import { validate } from '../middlewares/validate.middleware.js';
import { adminLoginSchema, admin2FaVerifySchema } from '../validators/auth.validator.js';
import {
  createTeamMemberSchema,
  updateTeamMemberPermissionsSchema,
} from '../validators/team.validator.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Super Admin Auth Routes
router.post('/auth/login', loginRateLimiter, validate(adminLoginSchema), adminLogin);
router.post('/auth/verify-2fa', validate(admin2FaVerifySchema), verifyAdmin2FA);
router.post('/auth/refresh-token', refreshAdminToken);
router.post('/auth/logout', authenticateAdmin, logoutAdmin);
router.get('/auth/me', authenticateAdmin, getAdminProfile);

// Dashboard & Analytics
router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);
router.get('/logs', authenticateAdmin, getActivityLogs);

// Team & Permissions Management
router.get('/team/permissions', authenticateAdmin, getAvailablePermissions);
router.post('/team', authenticateAdmin, validate(createTeamMemberSchema), createTeamMember);
router.get('/team', authenticateAdmin, getTeamMembers);
router.get('/team/:id', authenticateAdmin, getTeamMemberById);
router.patch('/team/:id', authenticateAdmin, validate(updateTeamMemberPermissionsSchema), updateTeamMember);
router.delete('/team/:id', authenticateAdmin, deleteTeamMember);

export default router;
