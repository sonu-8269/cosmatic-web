import { Router } from 'express';
import {
  teamLogin,
  refreshTeamToken,
  logoutTeam,
  getTeamProfile,
} from '../controllers/team/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { teamLoginSchema } from '../validators/auth.validator.js';
import { authenticateTeamOrAdmin } from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Team Portal Auth Routes
router.post('/auth/login', loginRateLimiter, validate(teamLoginSchema), teamLogin);
router.post('/auth/refresh-token', refreshTeamToken);
router.post('/auth/logout', authenticateTeamOrAdmin, logoutTeam);
router.get('/auth/me', authenticateTeamOrAdmin, getTeamProfile);

export default router;
