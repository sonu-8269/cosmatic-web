import { Router } from 'express';
import customerRoutes from './customer.routes.js';
import adminRoutes from './admin.routes.js';
import teamRoutes from './team.routes.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Cosmetics Web API',
  });
});

// Mount modular sub-routers
router.use('/customer', customerRoutes);
router.use('/admin', adminRoutes);
router.use('/team', teamRoutes);

export default router;
