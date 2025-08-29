import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';
import { formatResponse } from '../utils/response';

export class AuthError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'AUTH_ERROR';
    this.isOperational = true;
    this.name = 'AuthError';

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AuthError {
  public errors: Array<{ field: string; message: string; value?: any }>;

  constructor(message: string, errors: Array<{ field: string; message: string; value?: any }>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AuthError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AuthError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class TokenError extends AuthError {
  public tokenType?: string;

  constructor(message: string, tokenType?: string) {
    super(message, 401, 'TOKEN_ERROR');
    this.tokenType = tokenType;
    this.name = 'TokenError';
  }
}

export class UserError extends AuthError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode, 'USER_ERROR');
    this.name = 'UserError';
  }
}

export class EmailError extends AuthError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode, 'EMAIL_ERROR');
    this.name = 'EmailError';
  }
}

export class RateLimitError extends AuthError {
  public retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
    this.name = 'RateLimitError';
  }
}

/**
 * Authentication-specific error handler middleware
 */
export const authErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Log error details
  const errorDetails = {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  };

  // Log based on severity
  if (error.statusCode >= 500) {
    logger.error('Authentication server error', errorDetails);
  } else if (error.statusCode >= 400) {
    logger.warn('Authentication client error', errorDetails);
  } else {
    logger.info('Authentication error', errorDetails);
  }

  // Handle specific error types
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json(formatResponse(
      null,
      error.message,
      false,
      error.code,
      { validationErrors: error.errors }
    ));
    return;
  }

  if (error instanceof AuthenticationError) {
    // Clear any auth-related cookies on authentication failure
    res.clearCookie('refreshToken');
    
    res.status(error.statusCode).json(formatResponse(
      null,
      'Authentication failed',
      false,
      error.code
    ));
    return;
  }

  if (error instanceof AuthorizationError) {
    res.status(error.statusCode).json(formatResponse(
      null,
      'Access denied',
      false,
      error.code
    ));
    return;
  }

  if (error instanceof TokenError) {
    // Clear refresh token on token errors
    res.clearCookie('refreshToken');
    
    let message = 'Invalid or expired token';
    if (error.message.includes('expired')) {
      message = 'Token has expired';
    } else if (error.message.includes('blacklisted') || error.message.includes('revoked')) {
      message = 'Token has been revoked';
    } else if (error.message.includes('invalid')) {
      message = 'Invalid token';
    }

    res.status(error.statusCode).json(formatResponse(
      null,
      message,
      false,
      error.code,
      { tokenType: error.tokenType }
    ));
    return;
  }

  if (error instanceof UserError) {
    let message = error.message;
    
    // Security-conscious messages for user-related errors
    if (error.message.includes('not found')) {
      message = 'Invalid credentials';
    } else if (error.message.includes('suspended') || error.message.includes('inactive')) {
      message = 'Account is not accessible';
    } else if (error.message.includes('already exists')) {
      message = 'Account with this email already exists';
    }

    res.status(error.statusCode).json(formatResponse(
      null,
      message,
      false,
      error.code
    ));
    return;
  }

  if (error instanceof EmailError) {
    res.status(error.statusCode).json(formatResponse(
      null,
      error.message,
      false,
      error.code
    ));
    return;
  }

  if (error instanceof RateLimitError) {
    if (error.retryAfter) {
      res.setHeader('Retry-After', error.retryAfter);
    }
    
    res.status(error.statusCode).json(formatResponse(
      null,
      error.message,
      false,
      error.code,
      { retryAfter: error.retryAfter }
    ));
    return;
  }

  // Handle JWT-specific errors
  if (error.name === 'JsonWebTokenError') {
    res.clearCookie('refreshToken');
    res.status(401).json(formatResponse(
      null,
      'Invalid token',
      false,
      'INVALID_TOKEN'
    ));
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.clearCookie('refreshToken');
    res.status(401).json(formatResponse(
      null,
      'Token has expired',
      false,
      'TOKEN_EXPIRED'
    ));
    return;
  }

  if (error.name === 'NotBeforeError') {
    res.status(401).json(formatResponse(
      null,
      'Token is not active yet',
      false,
      'TOKEN_NOT_ACTIVE'
    ));
    return;
  }

  // Handle password-related errors
  if (error.message.includes('Password')) {
    let statusCode = 400;
    let message = error.message;
    
    if (error.message.includes('incorrect') || error.message.includes('invalid')) {
      statusCode = 401;
      message = 'Invalid credentials';
    }

    res.status(statusCode).json(formatResponse(
      null,
      message,
      false,
      'PASSWORD_ERROR'
    ));
    return;
  }

  // Handle email-related errors
  if (error.message.includes('Email') || error.message.includes('verification')) {
    let statusCode = 400;
    let message = error.message;
    
    if (error.message.includes('already verified')) {
      message = 'Email is already verified';
    } else if (error.message.includes('verification failed')) {
      message = 'Email verification failed';
    }

    res.status(statusCode).json(formatResponse(
      null,
      message,
      false,
      'EMAIL_ERROR'
    ));
    return;
  }

  // Handle database constraint errors
  if (error.code === '23505') { // PostgreSQL unique constraint violation
    if (error.constraint && error.constraint.includes('email')) {
      res.status(409).json(formatResponse(
        null,
        'An account with this email already exists',
        false,
        'DUPLICATE_EMAIL'
      ));
      return;
    }
  }

  // Handle database connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    logger.error('Database connection error in auth', errorDetails);
    res.status(503).json(formatResponse(
      null,
      'Service temporarily unavailable',
      false,
      'SERVICE_UNAVAILABLE'
    ));
    return;
  }

  // Handle Redis connection errors
  if (error.code === 'ECONNRESET' || error.message.includes('Redis')) {
    logger.error('Redis connection error in auth', errorDetails);
    res.status(503).json(formatResponse(
      null,
      'Session service temporarily unavailable',
      false,
      'SESSION_SERVICE_UNAVAILABLE'
    ));
    return;
  }

  // Handle generic auth errors
  if (error instanceof AuthError) {
    res.status(error.statusCode).json(formatResponse(
      null,
      error.message,
      false,
      error.code
    ));
    return;
  }

  // Handle unknown errors (fallback)
  logger.error('Unknown authentication error', errorDetails);
  
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 
    ? 'Internal server error' 
    : error.message || 'An error occurred';
  
  res.status(statusCode).json(formatResponse(
    null,
    message,
    false,
    'UNKNOWN_ERROR'
  ));
};

/**
 * Create standardized auth errors
 */
export const createAuthError = {
  validation: (errors: Array<{ field: string; message: string; value?: any }>) =>
    new ValidationError('Validation failed', errors),

  authentication: (message?: string) =>
    new AuthenticationError(message),

  authorization: (message?: string) =>
    new AuthorizationError(message),

  invalidToken: (tokenType?: string) =>
    new TokenError('Invalid token', tokenType),

  expiredToken: (tokenType?: string) =>
    new TokenError('Token has expired', tokenType),

  revokedToken: (tokenType?: string) =>
    new TokenError('Token has been revoked', tokenType),

  userNotFound: () =>
    new UserError('User not found', 404),

  userExists: () =>
    new UserError('User already exists', 409),

  userSuspended: () =>
    new UserError('Account is suspended', 403),

  userInactive: () =>
    new UserError('Account is inactive', 403),

  invalidCredentials: () =>
    new AuthenticationError('Invalid credentials'),

  emailNotVerified: () =>
    new UserError('Email address is not verified', 403),

  emailAlreadyVerified: () =>
    new UserError('Email is already verified', 400),

  weakPassword: (requirements: string[]) =>
    new ValidationError('Password does not meet requirements', [
      { field: 'password', message: requirements.join(', ') }
    ]),

  rateLimit: (message: string, retryAfter?: number) =>
    new RateLimitError(message, retryAfter),

  emailService: (message: string) =>
    new EmailError(message, 503),

  sessionExpired: () =>
    new AuthenticationError('Session has expired')
};

/**
 * Async error wrapper for authentication controllers
 */
export const asyncAuthHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Security audit logger for authentication events
 */
export const auditAuthEvent = (
  event: string,
  req: Request,
  details?: any
) => {
  const auditData = {
    event,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    userId: (req as any).user?.userId,
    email: (req as any).user?.email,
    ...details
  };

  logger.info('Auth audit event', auditData);
  
  // In production, you might want to send this to a dedicated audit log
  // or security monitoring service
};