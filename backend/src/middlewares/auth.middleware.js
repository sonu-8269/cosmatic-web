import { verifyAccessToken } from '../services/token.service.js';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { TeamMember } from '../models/TeamMember.js';
import { ApiError } from '../utils/apiError.js';

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

/**
 * Customer Authentication Middleware
 */
export const authenticateCustomer = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new ApiError(401, 'Authentication token missing. Please log in.');
    }

    const decoded = verifyAccessToken(token);
    if (decoded.role !== 'customer') {
      throw new ApiError(403, 'Unauthorized access for this account type.');
    }

    const customer = await User.findById(decoded.id);
    if (!customer) {
      throw new ApiError(401, 'User account no longer exists.');
    }

    if (customer.isBlocked) {
      throw new ApiError(403, 'Your account has been blocked. Please contact support.');
    }

    req.user = customer;
    req.role = 'customer';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Session expired. Please refresh your token.'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid authentication token.'));
    }
    next(error);
  }
};

/**
 * Super Admin Authentication Middleware
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new ApiError(401, 'Admin token missing. Please log in as Super Admin.');
    }

    const decoded = verifyAccessToken(token);
    if (decoded.role !== 'super_admin') {
      throw new ApiError(403, 'Requires Super Admin privileges.');
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      throw new ApiError(401, 'Super Admin account not found.');
    }

    req.user = admin;
    req.role = 'super_admin';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Admin session expired. Please log in again.'));
    }
    next(error);
  }
};

/**
 * Team Member or Super Admin Middleware
 */
export const authenticateTeamOrAdmin = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new ApiError(401, 'Authentication token missing.');
    }

    const decoded = verifyAccessToken(token);

    if (decoded.role === 'super_admin') {
      const admin = await Admin.findById(decoded.id);
      if (!admin) throw new ApiError(401, 'Admin account not found.');
      req.user = admin;
      req.role = 'super_admin';
      return next();
    }

    if (decoded.role === 'team_member') {
      const teamMember = await TeamMember.findById(decoded.id);
      if (!teamMember) throw new ApiError(401, 'Team member account not found.');
      if (!teamMember.isActive) {
        throw new ApiError(403, 'Team member account is deactivated. Contact Admin.');
      }
      req.user = teamMember;
      req.role = 'team_member';
      return next();
    }

    throw new ApiError(403, 'Access denied. Staff or Admin authorization required.');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Session expired. Please log in again.'));
    }
    next(error);
  }
};
