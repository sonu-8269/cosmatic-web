import { User } from '../../models/User.js';
import { createOtp, verifyOtp } from '../../services/otp.service.js';
import { sendSmsOtp } from '../../services/sms.service.js';
import { sendOtpEmail } from '../../services/email.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../../services/token.service.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';
import { env } from '../../config/env.js';

/**
 * Send OTP via SMS (or Email)
 */
export const sendOtp = async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    const identifier = phone || email;
    const type = phone ? 'SMS' : 'EMAIL';

    const plainOtp = await createOtp(identifier, type);

    if (type === 'SMS') {
      await sendSmsOtp(phone, plainOtp);
    } else {
      await sendOtpEmail(email, plainOtp);
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          identifier,
          type,
          expiresInMinutes: env.OTP_EXPIRY_MINUTES,
          // Expose OTP in development response for rapid testing
          ...(env.NODE_ENV !== 'production' && { devOtp: plainOtp }),
        },
        `OTP sent successfully to ${identifier}`
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP & Login/Register customer
 */
export const verifyOtpAndLogin = async (req, res, next) => {
  try {
    const { identifier, otp, type = 'SMS' } = req.body;

    // Verify OTP
    await verifyOtp(identifier, otp, type);

    // Find or create customer
    let customer;
    if (type === 'SMS') {
      customer = await User.findOne({ phone: identifier });
      if (!customer) {
        customer = await User.create({
          phone: identifier,
          isPhoneVerified: true,
          name: `User-${identifier.slice(-4)}`,
        });
      } else {
        customer.isPhoneVerified = true;
      }
    } else {
      customer = await User.findOne({ email: identifier.toLowerCase() });
      if (!customer) {
        customer = await User.create({
          email: identifier.toLowerCase(),
          isEmailVerified: true,
          name: identifier.split('@')[0],
        });
      } else {
        customer.isEmailVerified = true;
      }
    }

    if (customer.isBlocked) {
      throw new ApiError(403, 'Your account is blocked. Please contact customer support.');
    }

    // Generate tokens
    const tokenPayload = {
      id: customer._id.toString(),
      role: 'customer',
      phone: customer.phone,
      email: customer.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    customer.refreshToken = refreshToken;
    await customer.save();

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          user: {
            id: customer._id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            role: customer.role,
            addresses: customer.addresses,
          },
        },
        'Authentication successful'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Register with Email and Password
 */
export const registerWithEmail = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'An account with this email already exists.');
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        throw new ApiError(400, 'An account with this phone number already exists.');
      }
    }

    const customer = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
    });

    const tokenPayload = {
      id: customer._id.toString(),
      role: 'customer',
      email: customer.email,
      phone: customer.phone,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    customer.refreshToken = refreshToken;
    await customer.save();

    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json(
      new ApiResponse(
        201,
        {
          accessToken,
          user: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            role: customer.role,
          },
        },
        'Customer account created successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login with Email / Phone and Password
 */
export const loginWithPassword = async (req, res, next) => {
  try {
    const { emailOrPhone, password } = req.body;

    const customer = await User.findOne({
      $or: [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }],
    }).select('+password +refreshToken');

    if (!customer) {
      throw new ApiError(401, 'Invalid credentials.');
    }

    if (!customer.password) {
      throw new ApiError(400, 'Password is not set for this account. Please use OTP login.');
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid credentials.');
    }

    if (customer.isBlocked) {
      throw new ApiError(403, 'Your account is blocked. Please contact support.');
    }

    const tokenPayload = {
      id: customer._id.toString(),
      role: 'customer',
      email: customer.email,
      phone: customer.phone,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    customer.refreshToken = refreshToken;
    await customer.save();

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken,
          user: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            role: customer.role,
            addresses: customer.addresses,
          },
        },
        'Logged in successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token using httpOnly cookie
 */
export const refreshCustomerToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token missing in request cookies.');
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.role !== 'customer') {
      throw new ApiError(403, 'Invalid token role.');
    }

    const customer = await User.findById(decoded.id).select('+refreshToken');
    if (!customer || customer.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid or expired refresh token. Please log in again.');
    }

    const newAccessToken = generateAccessToken({
      id: customer._id.toString(),
      role: 'customer',
      email: customer.email,
      phone: customer.phone,
    });

    res.status(200).json(
      new ApiResponse(200, { accessToken: newAccessToken }, 'Access token refreshed successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Logout customer
 */
export const logoutCustomer = async (req, res, next) => {
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
 * Get current customer profile
 */
export const getCustomerProfile = async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, 'Customer profile retrieved'));
};
