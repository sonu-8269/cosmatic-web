import { TeamMember } from '../../models/TeamMember.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../../services/token.service.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';
import { recordActivity } from '../../middlewares/activityLog.middleware.js';

/**
 * Team Member Login
 * Crucial Requirement: Returns permissions list in response
 */
export const teamLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const teamMember = await TeamMember.findOne({ email: email.toLowerCase() }).select(
      '+password +refreshToken'
    );

    if (!teamMember) {
      throw new ApiError(401, 'Invalid team member email or password.');
    }

    if (!teamMember.isActive) {
      throw new ApiError(403, 'Your staff account is currently deactivated. Please contact Super Admin.');
    }

    const isMatch = await teamMember.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid team member email or password.');
    }

    const tokenPayload = {
      id: teamMember._id.toString(),
      role: 'team_member',
      email: teamMember.email,
      name: teamMember.name,
      permissions: teamMember.permissions,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    teamMember.refreshToken = refreshToken;
    await teamMember.save();

    setRefreshTokenCookie(res, refreshToken);

    await recordActivity({
      req: { ...req, user: teamMember, role: 'team_member' },
      module: 'auth',
      action: 'login',
      description: `Team member ${teamMember.name} logged into Team Portal`,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          user: {
            id: teamMember._id,
            name: teamMember.name,
            email: teamMember.email,
            role: teamMember.role,
            permissions: teamMember.permissions, // Perms returned directly for frontend conditional menus
          },
        },
        'Team member logged in successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Team Member token
 */
export const refreshTeamToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token missing in cookies.');
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.role !== 'team_member') {
      throw new ApiError(403, 'Unauthorized token role.');
    }

    const teamMember = await TeamMember.findById(decoded.id).select('+refreshToken');
    if (!teamMember || teamMember.refreshToken !== refreshToken || !teamMember.isActive) {
      throw new ApiError(401, 'Invalid or expired team refresh token.');
    }

    const newAccessToken = generateAccessToken({
      id: teamMember._id.toString(),
      role: 'team_member',
      email: teamMember.email,
      name: teamMember.name,
      permissions: teamMember.permissions,
    });

    res.status(200).json(
      new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Team Member Logout
 */
export const logoutTeam = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.refreshToken = null;
      await req.user.save();
    }
    clearRefreshTokenCookie(res);
    res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get current team member profile and permissions
 */
export const getTeamProfile = async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.permissions,
      },
      'Team member profile retrieved'
    )
  );
};
