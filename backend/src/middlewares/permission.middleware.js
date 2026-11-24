import { hasPermission } from '../utils/permissions.js';
import { ApiError } from '../utils/apiError.js';
import { recordActivity } from './activityLog.middleware.js';

/**
 * RBAC Permission Middleware
 * Verifies if the authenticated actor (Super Admin or Team Member)
 * is authorized to execute the requested action.
 *
 * @param {string} requiredPermission - Format: "module.action" e.g. "products.create"
 */
export const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Super Admin bypasses all individual permission checks
      if (req.role === 'super_admin') {
        // Auto-record audit log for admin mutations
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          const [module, action] = requiredPermission.split('.');
          recordActivity({
            req,
            module: module || 'admin',
            action: action || req.method.toLowerCase(),
            description: `Super Admin performed ${requiredPermission}`,
          }).catch(() => {});
        }
        return next();
      }

      // Team Member check
      if (req.role === 'team_member') {
        const userPerms = req.user.permissions || [];
        const isAllowed = hasPermission(userPerms, requiredPermission);

        if (!isAllowed) {
          throw new ApiError(
            403,
            `Access Denied. You do not have permission to perform '${requiredPermission}'.`
          );
        }

        // Record audit activity log for team member action
        const [module, action] = requiredPermission.split('.');
        recordActivity({
          req,
          module: module || 'team',
          action: action || req.method.toLowerCase(),
          description: `Team member ${req.user.name} performed ${requiredPermission}`,
        }).catch(() => {});

        return next();
      }

      throw new ApiError(403, 'Access restricted to authorized personnel.');
    } catch (error) {
      next(error);
    }
  };
};
