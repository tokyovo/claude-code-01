import { Request, Response, NextFunction } from 'express';
import { DatabaseError } from 'pg';

// Database-specific error types
export class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class QueryExecutionError extends Error {
  public query?: string;
  public parameters?: any[];

  constructor(message: string, query?: string, parameters?: any[]) {
    super(message);
    this.name = 'QueryExecutionError';
    this.query = query;
    this.parameters = parameters;
  }
}

export class TransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class ValidationError extends Error {
  public field?: string;
  public value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

// PostgreSQL error code mappings
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  CONNECTION_EXCEPTION: '08000',
  CONNECTION_DOES_NOT_EXIST: '08003',
  CONNECTION_FAILURE: '08006',
  INVALID_CATALOG_NAME: '3D000', // Database does not exist
  INVALID_PASSWORD: '28P01',
  INSUFFICIENT_PRIVILEGE: '42501',
  SYNTAX_ERROR: '42601',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
  NUMERIC_VALUE_OUT_OF_RANGE: '22003',
  INVALID_TEXT_REPRESENTATION: '22P02',
  DIVISION_BY_ZERO: '22012',
};

// Error message mappings for user-friendly responses
const ERROR_MESSAGES = {
  [PG_ERROR_CODES.UNIQUE_VIOLATION]: 'A record with this information already exists',
  [PG_ERROR_CODES.FOREIGN_KEY_VIOLATION]: 'Referenced record does not exist',
  [PG_ERROR_CODES.NOT_NULL_VIOLATION]: 'Required field is missing',
  [PG_ERROR_CODES.CHECK_VIOLATION]: 'Data validation failed',
  [PG_ERROR_CODES.CONNECTION_EXCEPTION]: 'Database connection error',
  [PG_ERROR_CODES.CONNECTION_DOES_NOT_EXIST]: 'Database connection lost',
  [PG_ERROR_CODES.CONNECTION_FAILURE]: 'Unable to connect to database',
  [PG_ERROR_CODES.INVALID_CATALOG_NAME]: 'Database does not exist',
  [PG_ERROR_CODES.INVALID_PASSWORD]: 'Database authentication failed',
  [PG_ERROR_CODES.INSUFFICIENT_PRIVILEGE]: 'Insufficient database privileges',
  [PG_ERROR_CODES.SYNTAX_ERROR]: 'Database query error',
  [PG_ERROR_CODES.UNDEFINED_TABLE]: 'Database table not found',
  [PG_ERROR_CODES.UNDEFINED_COLUMN]: 'Database column not found',
  [PG_ERROR_CODES.NUMERIC_VALUE_OUT_OF_RANGE]: 'Numeric value is out of range',
  [PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION]: 'Invalid data format',
  [PG_ERROR_CODES.DIVISION_BY_ZERO]: 'Division by zero error',
};

// Helper function to parse PostgreSQL error details
const parsePostgresError = (error: DatabaseError) => {
  const code = error.code;
  const constraint = error.constraint;
  const table = error.table;
  const column = error.column;
  const detail = error.detail;

  let userMessage = ERROR_MESSAGES[code] || 'Database operation failed';
  let field: string | undefined;

  // Extract field name from constraint violations
  if (code === PG_ERROR_CODES.UNIQUE_VIOLATION && constraint) {
    if (constraint.includes('email')) {
      userMessage = 'An account with this email address already exists';
      field = 'email';
    } else if (constraint.includes('username')) {
      userMessage = 'This username is already taken';
      field = 'username';
    }
  }

  if (code === PG_ERROR_CODES.NOT_NULL_VIOLATION && column) {
    userMessage = `${column} is required`;
    field = column;
  }

  if (code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION && table) {
    if (table === 'transactions' && constraint?.includes('category_id')) {
      userMessage = 'Selected category does not exist';
      field = 'category_id';
    } else if (table === 'transactions' && constraint?.includes('account_id')) {
      userMessage = 'Selected account does not exist';
      field = 'account_id';
    }
  }

  return {
    code,
    userMessage,
    field,
    constraint,
    table,
    column,
    detail
  };
};

// Database error handler middleware
export const databaseErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip non-database errors
  if (
    !(error instanceof DatabaseError) &&
    !(error instanceof DatabaseConnectionError) &&
    !(error instanceof QueryExecutionError) &&
    !(error instanceof TransactionError) &&
    !(error instanceof ValidationError)
  ) {
    return next(error);
  }

  console.error('🔴 Database Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    query: (error as any).query,
    parameters: (error as any).parameters,
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  let statusCode = 500;
  let userMessage = 'Internal server error';
  let errorCode = 'DATABASE_ERROR';
  let field: string | undefined;
  let details: any = {};

  if (error instanceof DatabaseError) {
    const parsed = parsePostgresError(error);
    userMessage = parsed.userMessage;
    field = parsed.field;
    errorCode = `PG_${parsed.code}`;
    details = {
      table: parsed.table,
      column: parsed.column,
      constraint: parsed.constraint
    };

    // Set appropriate status codes
    switch (parsed.code) {
      case PG_ERROR_CODES.UNIQUE_VIOLATION:
      case PG_ERROR_CODES.CHECK_VIOLATION:
      case PG_ERROR_CODES.NOT_NULL_VIOLATION:
        statusCode = 400; // Bad Request
        break;
      case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
        statusCode = 404; // Not Found
        break;
      case PG_ERROR_CODES.INSUFFICIENT_PRIVILEGE:
      case PG_ERROR_CODES.INVALID_PASSWORD:
        statusCode = 403; // Forbidden
        break;
      case PG_ERROR_CODES.CONNECTION_EXCEPTION:
      case PG_ERROR_CODES.CONNECTION_FAILURE:
      case PG_ERROR_CODES.CONNECTION_DOES_NOT_EXIST:
        statusCode = 503; // Service Unavailable
        break;
      default:
        statusCode = 500; // Internal Server Error
    }
  } else if (error instanceof DatabaseConnectionError) {
    statusCode = 503;
    userMessage = 'Database service temporarily unavailable';
    errorCode = 'DB_CONNECTION_ERROR';
  } else if (error instanceof TransactionError) {
    statusCode = 500;
    userMessage = 'Transaction failed';
    errorCode = 'TRANSACTION_ERROR';
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    userMessage = error.message;
    errorCode = 'VALIDATION_ERROR';
    field = error.field;
    details = { value: error.value };
  } else if (error instanceof QueryExecutionError) {
    statusCode = 500;
    userMessage = 'Database query failed';
    errorCode = 'QUERY_ERROR';
    details = {
      query: error.query?.substring(0, 100) + '...', // Truncate for security
    };
  }

  const response = {
    success: false,
    message: userMessage,
    error: {
      code: errorCode,
      ...(field && { field }),
      ...(Object.keys(details).length > 0 && { details }),
    },
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        originalMessage: error.message,
        stack: error.stack
      }
    })
  };

  res.status(statusCode).json(response);
};

// Utility functions for common database operations with error handling

export const withDatabaseErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw with more context if needed
        if (error.name === 'error' && (error as any).code) {
          throw new DatabaseError(error.message, error.message, (error as any).code);
        }
        throw error;
      }
      throw new Error('Unknown database error occurred');
    }
  };
};

// Helper function to validate financial amounts
export const validateFinancialAmount = (amount: any, field = 'amount'): number => {
  if (amount === null || amount === undefined) {
    throw new ValidationError('Amount is required', field, amount);
  }

  const numericAmount = Number(amount);
  
  if (isNaN(numericAmount)) {
    throw new ValidationError('Amount must be a valid number', field, amount);
  }

  if (numericAmount < 0) {
    throw new ValidationError('Amount cannot be negative', field, amount);
  }

  if (numericAmount > 999999999.99) {
    throw new ValidationError('Amount is too large', field, amount);
  }

  // Round to 2 decimal places for financial precision
  return Math.round(numericAmount * 100) / 100;
};

// Helper function to validate UUID
export const validateUUID = (uuid: any, field = 'id'): string => {
  if (!uuid) {
    throw new ValidationError('ID is required', field, uuid);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new ValidationError('Invalid ID format', field, uuid);
  }

  return uuid;
};

// Helper function to validate date
export const validateDate = (date: any, field = 'date'): Date => {
  if (!date) {
    throw new ValidationError('Date is required', field, date);
  }

  const parsedDate = new Date(date);
  
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError('Invalid date format', field, date);
  }

  return parsedDate;
};

export default databaseErrorHandler;