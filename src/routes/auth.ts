import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/authController';
import { authenticate, refreshTokenMiddleware } from '../middleware/auth';
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validatePasswordReset,
  validateForgotPassword,
  validateEmailVerification,
  validateProfileUpdate,
  validateRefreshToken,
  sanitizeInput,
  setAuthSecurityHeaders
} from '../middleware/authValidation';

const router = Router();

// Apply security headers to all auth routes
router.use(setAuthSecurityHeaders);

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// Stricter rate limiting for password reset
const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiting for registration
const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiting for email verification requests
const emailVerificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  message: {
    success: false,
    message: 'Too many email verification attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email, password, first_name, last_name, phone? }
 */
router.post('/register', 
  registrationRateLimit,
  validateRegistration, 
  AuthController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', 
  authRateLimit,
  validateLogin, 
  AuthController.login
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @body    { refreshToken? } or Cookie: refreshToken
 */
router.post('/refresh',
  validateRefreshToken,
  refreshTokenMiddleware,
  AuthController.refresh
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate current session)
 * @access  Private
 */
router.post('/logout', 
  authenticate,
  AuthController.logout
);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout user from all devices
 * @access  Private
 */
router.post('/logout-all', 
  authenticate,
  AuthController.logoutAll
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', 
  authenticate,
  AuthController.me
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 * @body    { token }
 */
router.post('/verify-email',
  validateEmailVerification,
  AuthController.verifyEmail
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post('/resend-verification',
  emailVerificationRateLimit,
  authenticate,
  AuthController.resendEmailVerification
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password',
  passwordResetRateLimit,
  validateForgotPassword,
  AuthController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 * @body    { token, password }
 */
router.post('/reset-password',
  passwordResetRateLimit,
  validatePasswordReset,
  AuthController.resetPassword
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.put('/change-password',
  authenticate,
  validatePasswordChange,
  AuthController.changePassword
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 * @body    { first_name?, last_name?, phone?, avatar_url?, preferences? }
 */
router.put('/profile',
  authenticate,
  validateProfileUpdate,
  AuthController.updateProfile
);

/**
 * @route   GET /api/v1/auth/session
 * @desc    Get session information
 * @access  Private
 */
router.get('/session',
  authenticate,
  AuthController.sessionInfo
);

// Error handling middleware for auth routes
router.use((error: any, req: any, res: any, next: any) => {
  // Log authentication errors
  console.error('Auth route error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Security-conscious error responses
  if (error.message.includes('User not found') || 
      error.message.includes('Invalid credentials') ||
      error.message.includes('Incorrect password')) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  if (error.message.includes('Token') || 
      error.message.includes('JWT') ||
      error.message.includes('token')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }

  if (error.message.includes('Password')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (error.message.includes('Email')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.status === 500 ? 'Internal server error' : error.message
  });
});

export default router;