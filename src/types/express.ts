import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface CustomRequest extends Request {
  userId?: string;
  user?: any;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  timestamp: string;
  stack?: string;
}