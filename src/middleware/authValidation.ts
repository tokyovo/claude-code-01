import { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { logger } from './logging';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    logger.warn('Validation errors', { 
      path: req.path, 
      method: req.method, 
      errors: errorMessages,
      ip: req.ip 
    });

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
    return;
  }
  
  next();
};

/**
 * User registration validation
 */
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 254 })
    .withMessage('Email must be less than 254 characters'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value: string) => {
      // Check for common weak passwords
      const weakPasswords = ['password', '12345678', 'qwerty123'];
      const lowerValue = value.toLowerCase();
      
      for (const weak of weakPasswords) {
        if (lowerValue.includes(weak)) {
          throw new Error('Password cannot contain common weak patterns');
        }
      }
      
      // Check for sequential characters
      if (/123456|abcdef|qwerty/i.test(value)) {
        throw new Error('Password cannot contain sequential patterns');
      }
      
      return true;
    }),
  
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Phone number must be in valid international format'),
  
  handleValidationErrors
];

/**
 * User login validation
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long'),
  
  handleValidationErrors
];

/**
 * Password change validation
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .isLength({ max: 128 })
    .withMessage('Current password is too long'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value: string, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      
      // Check for common weak passwords
      const weakPasswords = ['password', '12345678', 'qwerty123'];
      const lowerValue = value.toLowerCase();
      
      for (const weak of weakPasswords) {
        if (lowerValue.includes(weak)) {
          throw new Error('New password cannot contain common weak patterns');
        }
      }
      
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Password reset validation
 */
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ max: 500 })
    .withMessage('Invalid token format'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  handleValidationErrors
];

/**
 * Forgot password validation
 */
export const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

/**
 * Email verification validation
 */
export const validateEmailVerification = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ max: 500 })
    .withMessage('Invalid token format'),
  
  handleValidationErrors
];

/**
 * Profile update validation
 */
export const validateProfileUpdate = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Phone number must be in valid international format'),
  
  body('avatar_url')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Avatar URL must be a valid HTTP(S) URL')
    .isLength({ max: 500 })
    .withMessage('Avatar URL must be less than 500 characters'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be a valid object'),
  
  handleValidationErrors
];

/**
 * Refresh token validation
 */
export const validateRefreshToken = [
  // Allow refresh token from both body and cookies
  body('refreshToken')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Invalid refresh token format'),
  
  // Custom validation to check if token exists in either place
  (req: Request, res: Response, next: NextFunction): void => {
    const tokenFromBody = req.body.refreshToken;
    const tokenFromCookie = req.cookies.refreshToken;
    
    if (!tokenFromBody && !tokenFromCookie) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    next();
  }
];

/**
 * Sanitize user input to prevent XSS and other attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize request body
  if (req.body) {
    sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

/**
 * Rate limiting for sensitive endpoints
 */
export const createAuthRateLimit = (windowMs: number, max: number, message: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This is a placeholder - actual rate limiting would be implemented
    // using the existing rate limiting middleware from the project
    next();
  };
};

/**
 * Security headers for authentication endpoints
 */
export const setAuthSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Set security headers specific to auth endpoints
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  // Remove server header to prevent information disclosure
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Validate JWT token format
 */
export const validateJWTFormat = (token: string): boolean => {
  if (!token) return false;
  
  // Basic JWT format validation (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Check if each part is base64 encoded
  try {
    for (const part of parts) {
      Buffer.from(part, 'base64');
    }
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Password strength meter
 */
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  let score = 0;
  const feedback: string[] = [];
  
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }
  
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }
  
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }
  
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }
  
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }
  
  if (password.length >= 12) {
    score += 1;
  }
  
  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeated characters');
  }
  
  if (/123456|abcdef|qwerty/i.test(password)) {
    score -= 2;
    feedback.push('Avoid common patterns');
  }
  
  return {
    score: Math.max(0, Math.min(5, score)),
    feedback
  };
};