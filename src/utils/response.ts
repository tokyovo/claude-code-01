import { Response } from 'express';
import { ApiResponse } from '../types/express';

export class ResponseUtil {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      ...(data !== undefined && { data }),
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    error?: string,
    statusCode: number = 500
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      ...(error !== undefined && { error }),
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: Response,
    message: string,
    data?: T
  ): void {
    this.success(res, message, data, 201);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response,
    message: string = 'Bad Request',
    error?: string
  ): void {
    this.error(res, message, error, 400);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    error?: string
  ): void {
    this.error(res, message, error, 401);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden',
    error?: string
  ): void {
    this.error(res, message, error, 403);
  }

  /**
   * Send not found response (404)
   */
  static notFound(
    res: Response,
    message: string = 'Not Found',
    error?: string
  ): void {
    this.error(res, message, error, 404);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(
    res: Response,
    message: string = 'Conflict',
    error?: string
  ): void {
    this.error(res, message, error, 409);
  }

  /**
   * Send validation error response (422)
   */
  static validationError(
    res: Response,
    message: string = 'Validation Error',
    errors?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      error: 'Validation failed',
      data: errors,
      timestamp: new Date().toISOString(),
    };

    res.status(422).json(response);
  }

  /**
   * Send internal server error response (500)
   */
  static internalError(
    res: Response,
    message: string = 'Internal Server Error',
    error?: string
  ): void {
    this.error(res, message, error, 500);
  }
}

/**
 * Format response helper function
 */
export function formatResponse<T>(
  data: T | null,
  message: string = 'Success',
  success: boolean = true,
  code?: string,
  meta?: any
): ApiResponse<T> {
  return {
    success,
    message,
    ...(data !== null && { data }),
    ...(code && { code }),
    ...(meta && { meta }),
    timestamp: new Date().toISOString()
  };
}