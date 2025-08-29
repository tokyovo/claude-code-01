import morgan from 'morgan';
import { Request, Response } from 'express';
import { config } from '../config/env';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.dirname(config.LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom morgan token for response time in milliseconds
morgan.token('response-time-ms', (_req: Request, res: Response) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

// Custom morgan token for request ID (if implemented)
morgan.token('request-id', (req: Request) => {
  return (req as any).requestId || '-';
});

// Custom morgan token for user ID (if authenticated)
morgan.token('user-id', (req: Request) => {
  return (req as any).userId || '-';
});

// Define log formats
const developmentFormat = ':method :url :status :response-time ms - :res[content-length] bytes';

const productionFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  requestId: ':request-id',
  userId: ':user-id'
});

// Create write stream for file logging
const accessLogStream = fs.createWriteStream(
  path.join(process.cwd(), config.LOG_FILE),
  { flags: 'a' }
);

// Configure morgan based on environment
export const httpLogger = config.NODE_ENV === 'production'
  ? morgan(productionFormat, { stream: accessLogStream })
  : morgan(developmentFormat);

// Custom request logging middleware
export const requestLogger = (req: Request, res: Response, next: Function): void => {
  const start = Date.now();
  
  // Generate request ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  (req as any).requestId = requestId;
  
  // Log request details in development
  if (config.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    
    if (Object.keys(req.body || {}).length > 0) {
      console.log('Request Body:', JSON.stringify(req.body, null, 2));
    }
    
    if (Object.keys(req.query || {}).length > 0) {
      console.log('Query Params:', JSON.stringify(req.query, null, 2));
    }
  }
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', duration);
    
    if (config.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] Response (${duration}ms):`, 
                  JSON.stringify(body, null, 2));
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

// Error logging utility
export const logError = (error: Error, req?: Request): void => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: req ? {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    } : undefined,
  };
  
  // Log to console in development
  if (config.NODE_ENV === 'development') {
    console.error('ERROR:', JSON.stringify(errorLog, null, 2));
  }
  
  // Log to file in production
  if (config.NODE_ENV === 'production') {
    fs.appendFileSync(
      path.join(process.cwd(), config.LOG_FILE.replace('.log', '_error.log')),
      JSON.stringify(errorLog) + '\n'
    );
  }
};

// Simple logger interface for services
export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (config.NODE_ENV === 'development') {
      console.log(`[${timestamp}] INFO: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  },
  
  error: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  
  debug: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (config.NODE_ENV === 'development') {
      console.debug(`[${timestamp}] DEBUG: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  }
};