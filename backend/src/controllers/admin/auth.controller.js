import { Admin } from '../../models/Admin.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../../services/token.service.js';
import { generateNumericOtp, hashOtp } from '../../services/otp.service.js';
import { sendOtpEmail } from '../../services/email.service.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';
import { env } from '../../config/env.js';

/**
 * Super Admin Login
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select(
      '+password +twoFactorOtpHash +twoFactorOtpExpiry +refreshToken'
    );

    if (!admin) {
      throw new ApiError(401, 'Invalid admin email or password.');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid admin email or password.');
    }

    // Check if 2FA is enabled
    if (admin.isTwoFactorEnabled) {
      const plainOtp = generateNumericOtp(6);
      admin.twoFactorOtpHash = hashOtp(plainOtp);
      admin.twoFactorOtpExpiry = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
      await admin.save();

      await sendOtpEmail(admin.email, plainOtp);

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            requires2FA: true,
            email: admin.email,
            ...(env.NODE_ENV !== 'production' && { devOtp: plainOtp }),
          },
          '2FA OTP sent to admin email'
        )
      );
    }

    // Direct Login (No 2FA)
    const tokenPayload = {
      id: admin._id.toString(),
      role: 'super_admin',
      email: admin.email,
      name: admin.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    admin.refreshToken = refreshToken;
    await admin.save();

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
          },
        },
        'Super Admin logged in successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Admin 2FA OTP
 */
export const verifyAdmin2FA = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select(
      '+twoFactorOtpHash +twoFactorOtpExpiry +refreshToken'
    );

    if (!admin || !admin.twoFactorOtpHash) {
      throw new ApiError(400, 'No pending 2FA verification found.');
    }

    if (new Date() > admin.twoFactorOtpExpiry) {
      throw new ApiError(400, '2FA OTP has expired. Please log in again.');
    }

    const hashedInput = hashOtp(otp);
    if (hashedInput !== admin.twoFactorOtpHash) {
      throw new ApiError(400, 'Incorrect 2FA OTP.');
    }

    // Clear 2FA OTP
    admin.twoFactorOtpHash = undefined;
    admin.twoFactorOtpExpiry = undefined;

    const tokenPayload = {
      id: admin._id.toString(),
      role: 'super_admin',
      email: admin.email,
      name: admin.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    admin.refreshToken = refreshToken;
    await admin.save();

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
          },
        },
        '2FA verification successful'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Super Admin token
 */
export const refreshAdminToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token missing in cookies.');
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.role !== 'super_admin') {
      throw new ApiError(403, 'Unauthorized token role.');
    }

    const admin = await Admin.findById(decoded.id).select('+refreshToken');
    if (!admin || admin.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid or expired admin refresh token.');
    }

    const newAccessToken = generateAccessToken({
      id: admin._id.toString(),
      role: 'super_admin',
      email: admin.email,
      name: admin.name,
    });

    res.status(200).json(
      new ApiResponse(200, { accessToken: newAccessToken }, 'Admin token refreshed')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin Logout
 */
export const logoutAdmin = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.refreshToken = null;
      await req.user.save();
    }
    clearRefreshTokenCookie(res);
    res.status(200).json(new ApiResponse(200, null, 'Super Admin logged out successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get current Super Admin profile
 */
export const getAdminProfile = async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isTwoFactorEnabled: req.user.isTwoFactorEnabled,
      },
      'Admin profile retrieved'
    )
  );
};
