import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '@/types/express';
import { config } from '@/config/env';
import { databaseErrorHandler } from './databaseErrorHandler';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // First, try to handle database-specific errors
  databaseErrorHandler(err, req, res, (error) => {
    // If not a database error, continue with general error handling
    if (error) {
      let statusCode = 500;
      let message = 'Internal Server Error';

      // Handle operational errors
      if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
      }

      // Handle validation errors
      if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
      }

      // Handle JWT errors
      if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
      }

      if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
      }

      // Handle Cast errors
      if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
      }

      // Handle Redis connection errors
      if (err.message.includes('Redis') || err.message.includes('ECONNREFUSED')) {
        statusCode = 503;
        message = 'Cache service temporarily unavailable';
      }

      const errorResponse: ErrorResponse = {
        success: false,
        message,
        error: err.message,
        timestamp: new Date().toISOString(),
      };

      // Include stack trace in development
      if (config.NODE_ENV === 'development' && err.stack) {
        errorResponse.stack = err.stack;
      }

      // Log error
      console.error(`🔴 Error ${statusCode}: ${err.message}`);
      if (config.NODE_ENV === 'development') {
        console.error(err.stack);
      }

      res.status(statusCode).json(errorResponse);
    }
  });
};

// Async error handler wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    message: 'Route not found',
    error: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(errorResponse);
};