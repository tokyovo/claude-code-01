import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from './errorHandler';
import { CustomRequest } from '../types/express';
import { db } from '../config/database';
import { JwtService } from '../services/jwtService';
import { UserService } from '../services/userService';
import { logger } from './logging';

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Extended request interface for authenticated requests
export interface AuthenticatedRequest extends CustomRequest {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  token: string;
}

// JWT token verification utility
export const verifyToken = (token: string): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as JWTPayload);
      }
    });
  });
};

// Generate JWT token
export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

// Generate refresh token
export const generateRefreshToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'refresh' },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
  );
};

// Verify refresh token
export const verifyRefreshToken = (token: string): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        const payload = decoded as JWTPayload & { type?: string };
        if (payload.type !== 'refresh') {
          reject(new Error('Invalid refresh token'));
        } else {
          resolve(payload);
        }
      }
    });
  });
};

// Extract token from request headers
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    // Bearer token format: "Bearer <token>"
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    // Direct token format
    return authHeader;
  }
  
  // Check for token in cookies
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  
  // Check for token in query params (not recommended for production)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }
  
  return null;
};

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AppError('Access token is required', 401);
    }
    
    // Verify the token using our JWT service
    const decoded = await JwtService.verifyAccessToken(token);
    
    // Fetch user from database to ensure user still exists and is active
    const user = await UserService.findUserById(decoded.userId);
    
    if (!user) {
      throw new AppError('User not found', 401);
    }
    
    if (user.status !== 'active') {
      throw new AppError('User account is inactive or suspended', 401);
    }
    
    // Attach user and token to request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.status === 'active',
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
    authenticatedReq.token = token;
    authenticatedReq.userId = user.id; // For backward compatibility
    
    // Add user context for controllers
    (req as any).user = {
      userId: user.id,
      email: user.email
    };
    
    logger.debug('User authenticated successfully', { userId: user.id, email: user.email });
    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message, ip: req.ip });
    
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid access token', 401));
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Access token has expired', 401));
    }
    
    if (error.message === 'Token is blacklisted') {
      return next(new AppError('Token has been revoked', 401));
    }
    
    next(error);
  }
};

// Optional authentication middleware (doesn't fail if no token provided)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = await verifyToken(token);
      
      const user = await knex('users')
        .select(['id', 'email', 'first_name', 'last_name', 'is_active', 'created_at', 'updated_at'])
        .where('id', decoded.userId)
        .first();
      
      if (user && user.is_active) {
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isActive: user.is_active,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        };
        authenticatedReq.token = token;
        authenticatedReq.userId = user.id;
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      
      if (!authenticatedReq.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // For now, we'll implement a basic role check
      // This can be extended when user roles are added to the database
      const userRoles = await knex('user_roles as ur')
        .join('roles as r', 'ur.role_id', 'r.id')
        .select('r.name')
        .where('ur.user_id', authenticatedReq.user.id);
      
      const hasPermission = roles.some(role => 
        userRoles.some(userRole => userRole.name === role)
      );
      
      if (!hasPermission) {
        throw new AppError('Insufficient permissions', 403);
      }
      
      next();
    } catch (error) {
      // If user_roles table doesn't exist yet, skip role checking for development
      if (error.message?.includes('relation "user_roles" does not exist')) {
        console.warn('Role-based authorization skipped: user_roles table not found');
        next();
      } else {
        next(error);
      }
    }
  };
};

// Middleware to ensure user owns the resource
export const requireResourceOwnership = (resourceIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authenticatedReq = req as AuthenticatedRequest;
    
    if (!authenticatedReq.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    const resourceUserId = req.params[resourceIdParam] || req.body.userId || req.query.userId;
    
    if (!resourceUserId) {
      return next(new AppError('Resource identifier not found', 400));
    }
    
    if (authenticatedReq.user.id !== resourceUserId) {
      return next(new AppError('Access denied: You can only access your own resources', 403));
    }
    
    next();
  };
};

// Middleware to check if user account is verified (for future email verification)
export const requireVerification = (req: Request, res: Response, next: NextFunction): void => {
  const authenticatedReq = req as AuthenticatedRequest;
  
  if (!authenticatedReq.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  // This can be extended when email verification is implemented
  // For now, we'll assume all users are verified
  next();
};

// Token refresh middleware
export const refreshTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 401);
    }
    
    // Use our JWT service for refresh token verification and new token generation
    const { accessToken, accessTokenExpiry } = await JwtService.refreshAccessToken(refreshToken);
    
    // Attach new access token to request for controller to use
    req.body.newAccessToken = accessToken;
    req.body.accessTokenExpiry = accessTokenExpiry;
    
    logger.info('Token refreshed successfully');
    next();
  } catch (error) {
    logger.warn('Token refresh failed', { error: error.message });
    
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid refresh token', 401));
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Refresh token has expired', 401));
    }
    
    if (error.message === 'Token is blacklisted') {
      return next(new AppError('Refresh token has been revoked', 401));
    }
    
    if (error.message === 'Invalid refresh token') {
      return next(new AppError('Invalid refresh token', 401));
    }
    
    next(error);
  }
};