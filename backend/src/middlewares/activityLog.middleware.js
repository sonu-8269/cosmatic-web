import { ActivityLog } from '../models/ActivityLog.js';
import { logger } from '../utils/logger.js';

/**
 * Record action to activity audit logs
 */
export const recordActivity = async ({ req, module, action, description, metadata = {} }) => {
  try {
    if (!req.user) return;

    let userModel = 'User';
    if (req.role === 'super_admin') userModel = 'Admin';
    if (req.role === 'team_member') userModel = 'TeamMember';

    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '';

    const userAgent = req.headers['user-agent'] || '';

    await ActivityLog.create({
      userId: req.user._id,
      userModel,
      role: req.role,
      module,
      action,
      description,
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        path: req.originalUrl,
        method: req.method,
      },
    });
  } catch (error) {
    logger.error(`Failed to record ActivityLog: ${error.message}`);
  }
};
