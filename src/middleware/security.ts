import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
// Remove unused import
// import cors from 'cors';
import compression from 'compression';
import xss from 'xss';
import { config } from '@/config/env';
import Redis from 'ioredis';

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (config.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = config.CORS_ORIGIN.split(',');
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
  ],
};

// Redis client for distributed rate limiting
let redisClient: Redis | null = null;
try {
  redisClient = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    db: 1, // Use separate DB for rate limiting
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
} catch (error) {
  console.warn('Redis connection failed for rate limiting, falling back to memory store');
}

// Rate limiting store configuration
const getRateLimitStore = () => {
  if (redisClient && config.NODE_ENV === 'production') {
    // Use Redis store in production
    const RedisStore = require('rate-limit-redis');
    return new RedisStore({
      sendCommand: (...args: any[]) => redisClient!.call(...args),
    });
  }
  // Use memory store in development or if Redis is unavailable
  return undefined;
};

// Enhanced rate limiting configuration with different strategies
export const createRateLimit = (
  windowMs: number, 
  max: number, 
  message?: string,
  skipSuccessfulRequests: boolean = false,
  skipFailedRequests: boolean = false
) => {
  return rateLimit({
    windowMs,
    max,
    message: message || {
      success: false,
      message: 'Too many requests from this IP, please try again later',
      error: 'Rate limit exceeded',
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: getRateLimitStore(),
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      const userId = (req as any).userId;
      return userId ? `user:${userId}` : req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      const resetTime = new Date(Date.now() + windowMs);
      res.status(429).json({
        success: false,
        message: message || 'Too many requests from this IP, please try again later',
        error: 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil(windowMs / 1000),
        resetTime: resetTime.toISOString(),
      });
      return;
    },
  });
};

// General API rate limit
export const generalRateLimit = createRateLimit(
  config.RATE_LIMIT_WINDOW_MS, // 15 minutes
  config.RATE_LIMIT_MAX_REQUESTS, // 100 requests
  'Too many requests from this IP, please try again later'
);

// Strict rate limit for authentication endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts, please try again later',
  false, // Count both successful and failed attempts
  false
);

// Rate limit for password reset requests
export const passwordResetRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts per hour
  'Too many password reset attempts, please try again later',
  true, // Only count failed attempts
  false
);

// Rate limit for file uploads
export const uploadRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 uploads per minute
  'Too many file uploads, please slow down',
  false,
  true // Don't count failed uploads
);

// Rate limit for financial transactions (more restrictive)
export const transactionRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  20, // 20 transactions per minute
  'Transaction rate limit exceeded, please wait before creating more transactions',
  false,
  true
);

// Rate limit for reports and analytics (less restrictive but with slow-down)
export const analyticsRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 requests per minute
  'Analytics request rate limit exceeded',
  true, // Only count failed requests
  false
);

// Slow down middleware for expensive operations
export const createSlowDown = (windowMs: number, delayAfter: number, maxDelayMs: number): any => {
  return slowDown({
    windowMs,
    delayAfter,
    delayMs: () => 500, // Start with 500ms delay
    maxDelayMs,
    store: getRateLimitStore(),
    validate: {
      delayMs: false, // Disable the warning
    },
  });
};

// Slow down for analytics and reporting endpoints - placeholder for now
export const analyticsSlowDown = (req: any, res: any, next: any) => next();

// Slow down for search endpoints - placeholder for now
export const searchSlowDown = (req: any, res: any, next: any) => next();

// Dynamic rate limiting based on user tier (for future premium features)
export const createTieredRateLimit = (
  baseLimits: { windowMs: number; max: number },
  premiumMultiplier: number = 2
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const isPremium = user?.tier === 'premium' || user?.tier === 'pro';
    
    const limits = {
      windowMs: baseLimits.windowMs,
      max: isPremium ? baseLimits.max * premiumMultiplier : baseLimits.max,
    };
    
    return createRateLimit(limits.windowMs, limits.max)(req, res, next);
  };
};

// IP-based rate limiting for unauthenticated endpoints
export const ipRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per IP per window
  message: {
    success: false,
    message: 'Too many requests from this IP address',
    error: 'Rate limit exceeded',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getRateLimitStore(),
});

// Burst rate limiting for critical endpoints
export const burstRateLimit = createRateLimit(
  1000, // 1 second window
  2, // 2 requests per second max
  'Request rate too high, please slow down'
);

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Compression middleware
export const compressionConfig = compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress if size > 1KB
});

// Enhanced input sanitization middleware
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize route parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    next(error);
  }
};

// Recursive object sanitization
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Use XSS library for comprehensive sanitization
    return xss(obj, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style', 'iframe'],
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = typeof key === 'string' ? 
        xss(key, { whiteList: {}, stripIgnoreTag: true }) : key;
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

// SQL injection protection middleware
export const preventSqlInjection = (req: Request, _res: Response, next: NextFunction): void => {
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /union([^a-zA-Z]|[\s])+select/i,
    /select.*from/i,
    /insert.*into/i,
    /delete.*from/i,
    /update.*set/i,
    /drop.*table/i,
    /create.*table/i,
    /alter.*table/i,
  ];
  
  const checkForSqlInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(item => checkForSqlInjection(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(val => checkForSqlInjection(val));
    }
    return false;
  };
  
  // Check all input sources
  if (checkForSqlInjection(req.body) || 
      checkForSqlInjection(req.query) || 
      checkForSqlInjection(req.params)) {
    const error = new Error('Potential SQL injection detected');
    error.name = 'SecurityError';
    return next(error);
  }
  
  next();
};

// NoSQL injection protection middleware
export const preventNoSqlInjection = (req: Request, _res: Response, next: NextFunction): void => {
  const checkForNoSqlInjection = (obj: any): boolean => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        // Check for MongoDB operators
        if (key.startsWith('$')) {
          return true;
        }
        if (typeof obj[key] === 'object' && checkForNoSqlInjection(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkForNoSqlInjection(req.body) || 
      checkForNoSqlInjection(req.query) || 
      checkForNoSqlInjection(req.params)) {
    const error = new Error('Potential NoSQL injection detected');
    error.name = 'SecurityError';
    return next(error);
  }
  
  next();
};

// Content-Type validation middleware
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip for GET requests and requests without body
    if (req.method === 'GET' || !req.is('*/*')) {
      return next();
    }
    
    const contentType = req.get('Content-Type');
    if (!contentType) {
      res.status(400).json({
        success: false,
        message: 'Content-Type header is required',
        error: 'Missing Content-Type',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    const isAllowed = allowedTypes.some(type => req.is(type));
    if (!isAllowed) {
      res.status(400).json({
        success: false,
        message: `Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
        error: 'Invalid Content-Type',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
};