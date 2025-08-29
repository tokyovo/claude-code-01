import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types/express';

// Standard API response interface with pagination
interface PaginatedApiResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  links?: {
    self: string;
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
}

// Response metadata interface
interface ResponseMetadata {
  apiVersion?: string;
  requestId?: string;
  processingTime?: string;
  serverTime: string;
  rateLimits?: {
    limit: number;
    remaining: number;
    resetTime: string;
  };
}

// Enhanced API response with metadata
interface EnhancedApiResponse<T = any> extends PaginatedApiResponse<T> {
  meta: ResponseMetadata;
}

// Response formatting utility functions
export class ResponseFormatter {
  // Format successful response
  static success<T>(
    data: T,
    message: string = 'Success',
    pagination?: PaginatedApiResponse<T>['pagination'],
    links?: PaginatedApiResponse<T>['links']
  ): PaginatedApiResponse<T> {
    const response: PaginatedApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    if (pagination) {
      response.pagination = pagination;
    }

    if (links) {
      response.links = links;
    }

    return response;
  }

  // Format error response
  static error(
    message: string,
    error?: string,
    statusCode?: number
  ): ApiResponse<null> {
    return {
      success: false,
      message,
      error: error || message,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }

  // Format validation error response
  static validationError(
    errors: Array<{ field: string; message: string; value?: any }>
  ): ApiResponse<null> {
    return {
      success: false,
      message: 'Validation failed',
      error: 'Validation error',
      data: errors,
      timestamp: new Date().toISOString(),
    };
  }

  // Format created resource response
  static created<T>(
    data: T,
    message: string = 'Resource created successfully'
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // Format updated resource response
  static updated<T>(
    data: T,
    message: string = 'Resource updated successfully'
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // Format deleted resource response
  static deleted(message: string = 'Resource deleted successfully'): ApiResponse<null> {
    return {
      success: true,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }

  // Format paginated list response
  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    req: Request,
    message: string = 'Data retrieved successfully'
  ): PaginatedApiResponse<T[]> {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const hasNext = pagination.page < totalPages;
    const hasPrev = pagination.page > 1;

    // Generate pagination links
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    const queryParams = new URLSearchParams(req.query as any);
    
    // Remove existing page param for link generation
    queryParams.delete('page');
    const queryString = queryParams.toString();
    const separator = queryString ? '&' : '';

    const links = {
      self: `${baseUrl}?${queryString}${separator}page=${pagination.page}`,
      first: totalPages > 0 ? `${baseUrl}?${queryString}${separator}page=1` : undefined,
      last: totalPages > 0 ? `${baseUrl}?${queryString}${separator}page=${totalPages}` : undefined,
      next: hasNext ? `${baseUrl}?${queryString}${separator}page=${pagination.page + 1}` : undefined,
      prev: hasPrev ? `${baseUrl}?${queryString}${separator}page=${pagination.page - 1}` : undefined,
    };

    return this.success(
      data,
      message,
      {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNext,
        hasPrev,
      },
      links
    );
  }

  // Format list response without pagination
  static list<T>(
    data: T[],
    message: string = 'Data retrieved successfully'
  ): ApiResponse<T[]> {
    return this.success(data, message);
  }

  // Format single resource response
  static single<T>(
    data: T,
    message: string = 'Data retrieved successfully'
  ): ApiResponse<T> {
    return this.success(data, message);
  }
}

// Middleware to add response formatting methods to Response object
export const addResponseFormatters = (req: Request, res: Response, next: NextFunction): void => {
  // Add success formatters
  res.success = function<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ) {
    return this.status(statusCode).json(ResponseFormatter.success(data, message));
  };

  res.created = function<T>(
    data: T,
    message: string = 'Resource created successfully'
  ) {
    return this.status(201).json(ResponseFormatter.created(data, message));
  };

  res.updated = function<T>(
    data: T,
    message: string = 'Resource updated successfully'
  ) {
    return this.status(200).json(ResponseFormatter.updated(data, message));
  };

  res.deleted = function(message: string = 'Resource deleted successfully') {
    return this.status(200).json(ResponseFormatter.deleted(message));
  };

  res.paginated = function<T>(
    data: T[],
    pagination: { page: number; limit: number; total: number },
    message: string = 'Data retrieved successfully'
  ) {
    return this.status(200).json(
      ResponseFormatter.paginated(data, pagination, req, message)
    );
  };

  res.list = function<T>(
    data: T[],
    message: string = 'Data retrieved successfully'
  ) {
    return this.status(200).json(ResponseFormatter.list(data, message));
  };

  res.single = function<T>(
    data: T,
    message: string = 'Data retrieved successfully'
  ) {
    return this.status(200).json(ResponseFormatter.single(data, message));
  };

  // Add error formatters
  res.badRequest = function(message: string = 'Bad Request', error?: string) {
    return this.status(400).json(ResponseFormatter.error(message, error, 400));
  };

  res.unauthorized = function(message: string = 'Unauthorized', error?: string) {
    return this.status(401).json(ResponseFormatter.error(message, error, 401));
  };

  res.forbidden = function(message: string = 'Forbidden', error?: string) {
    return this.status(403).json(ResponseFormatter.error(message, error, 403));
  };

  res.notFound = function(message: string = 'Not Found', error?: string) {
    return this.status(404).json(ResponseFormatter.error(message, error, 404));
  };

  res.conflict = function(message: string = 'Conflict', error?: string) {
    return this.status(409).json(ResponseFormatter.error(message, error, 409));
  };

  res.validationError = function(
    errors: Array<{ field: string; message: string; value?: any }>
  ) {
    return this.status(422).json(ResponseFormatter.validationError(errors));
  };

  res.internalError = function(message: string = 'Internal Server Error', error?: string) {
    return this.status(500).json(ResponseFormatter.error(message, error, 500));
  };

  res.serviceUnavailable = function(message: string = 'Service Unavailable', error?: string) {
    return this.status(503).json(ResponseFormatter.error(message, error, 503));
  };

  next();
};

// Enhanced response formatter middleware with metadata
export const enhancedResponseFormatter = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = (req as any).requestId;
  const apiVersion = (req as any).apiVersion || 'v1';

  // Override json method to add metadata
  const originalJson = res.json;
  res.json = function(body: any) {
    const processingTime = Date.now() - startTime;
    
    // Only enhance API responses (not error pages, static files, etc.)
    if (body && typeof body === 'object' && ('success' in body || 'error' in body)) {
      const rateLimitHeader = res.getHeader('X-RateLimit-Limit');
      const rateLimitRemaining = res.getHeader('X-RateLimit-Remaining');
      const rateLimitReset = res.getHeader('X-RateLimit-Reset');

      const enhancedBody: EnhancedApiResponse = {
        ...body,
        meta: {
          apiVersion,
          requestId,
          processingTime: `${processingTime}ms`,
          serverTime: new Date().toISOString(),
          ...(rateLimitHeader && {
            rateLimits: {
              limit: parseInt(rateLimitHeader.toString()),
              remaining: parseInt(rateLimitRemaining?.toString() || '0'),
              resetTime: rateLimitReset ? new Date(parseInt(rateLimitReset.toString()) * 1000).toISOString() : '',
            },
          }),
        },
      };

      // Add performance headers
      res.setHeader('X-Processing-Time', `${processingTime}ms`);
      res.setHeader('X-Request-ID', requestId);
      
      return originalJson.call(this, enhancedBody);
    }

    return originalJson.call(this, body);
  };

  next();
};

// Content negotiation middleware for different response formats
export const contentNegotiation = (req: Request, res: Response, next: NextFunction): void => {
  const acceptHeader = req.headers.accept || '';

  // Set response format based on Accept header
  if (acceptHeader.includes('application/xml')) {
    res.format = 'xml';
  } else if (acceptHeader.includes('text/csv')) {
    res.format = 'csv';
  } else {
    res.format = 'json'; // default
  }

  // Override json method for XML/CSV responses
  const originalJson = res.json;
  res.json = function(body: any) {
    if (res.format === 'xml') {
      // Convert JSON to XML (simplified implementation)
      const xml = jsonToXml(body);
      res.setHeader('Content-Type', 'application/xml');
      return res.send(xml);
    } else if (res.format === 'csv' && body.data && Array.isArray(body.data)) {
      // Convert array data to CSV
      const csv = arrayToCsv(body.data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
      return res.send(csv);
    }

    return originalJson.call(this, body);
  };

  next();
};

// Helper function to convert JSON to XML (simplified)
const jsonToXml = (obj: any, rootElement: string = 'response'): string => {
  const xmlEscape = (str: string): string => {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
  };

  const objectToXml = (obj: any, indent: string = ''): string => {
    if (obj === null || obj === undefined) {
      return '';
    }

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      return Object.entries(obj)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value.map(item => 
              `${indent}<${key}>\n${objectToXml(item, indent + '  ')}\n${indent}</${key}>`
            ).join('\n');
          } else if (typeof value === 'object' && value !== null) {
            return `${indent}<${key}>\n${objectToXml(value, indent + '  ')}\n${indent}</${key}>`;
          } else {
            return `${indent}<${key}>${xmlEscape(String(value))}</${key}>`;
          }
        })
        .join('\n');
    }

    return xmlEscape(String(obj));
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n${objectToXml(obj, '  ')}\n</${rootElement}>`;
};

// Helper function to convert array to CSV
const arrayToCsv = (data: any[]): string => {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value || '');
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

// Middleware to add HATEOAS links to responses
export const addHateoasLinks = (req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Only add HATEOAS links to successful API responses with data
    if (body && body.success && body.data && !body.links) {
      const links = generateHateoasLinks(req, body.data);
      if (links) {
        body.links = links;
      }
    }

    return originalJson.call(this, body);
  };

  next();
};

// Generate HATEOAS links based on resource type
const generateHateoasLinks = (req: Request, data: any): any => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
  const resourceId = data?.id;

  if (!resourceId) return null;

  // Determine resource type from path
  const path = req.path.toLowerCase();
  
  if (path.includes('/transactions')) {
    return {
      self: `${baseUrl}/transactions/${resourceId}`,
      update: `${baseUrl}/transactions/${resourceId}`,
      delete: `${baseUrl}/transactions/${resourceId}`,
      category: data.categoryId ? `${baseUrl}/categories/${data.categoryId}` : null,
      account: data.accountId ? `${baseUrl}/accounts/${data.accountId}` : null,
    };
  }

  if (path.includes('/budgets')) {
    return {
      self: `${baseUrl}/budgets/${resourceId}`,
      update: `${baseUrl}/budgets/${resourceId}`,
      delete: `${baseUrl}/budgets/${resourceId}`,
      transactions: `${baseUrl}/budgets/${resourceId}/transactions`,
      category: data.categoryId ? `${baseUrl}/categories/${data.categoryId}` : null,
    };
  }

  if (path.includes('/accounts')) {
    return {
      self: `${baseUrl}/accounts/${resourceId}`,
      update: `${baseUrl}/accounts/${resourceId}`,
      delete: `${baseUrl}/accounts/${resourceId}`,
      transactions: `${baseUrl}/accounts/${resourceId}/transactions`,
      balance: `${baseUrl}/accounts/${resourceId}/balance`,
    };
  }

  return {
    self: `${baseUrl}${req.path}${resourceId ? `/${resourceId}` : ''}`,
  };
};

// Declare additional methods for Response interface
declare global {
  namespace Express {
    interface Response {
      format?: 'json' | 'xml' | 'csv';
      success<T>(data: T, message?: string, statusCode?: number): Response;
      created<T>(data: T, message?: string): Response;
      updated<T>(data: T, message?: string): Response;
      deleted(message?: string): Response;
      paginated<T>(data: T[], pagination: { page: number; limit: number; total: number }, message?: string): Response;
      list<T>(data: T[], message?: string): Response;
      single<T>(data: T, message?: string): Response;
      badRequest(message?: string, error?: string): Response;
      unauthorized(message?: string, error?: string): Response;
      forbidden(message?: string, error?: string): Response;
      notFound(message?: string, error?: string): Response;
      conflict(message?: string, error?: string): Response;
      validationError(errors: Array<{ field: string; message: string; value?: any }>): Response;
      internalError(message?: string, error?: string): Response;
      serviceUnavailable(message?: string, error?: string): Response;
    }
  }
}