import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '@/config/env';
import knex from '@/config/knex';
import { AuthenticatedRequest } from './auth';

// Audit event types
export enum AuditEventType {
  // Authentication events
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  LOGIN_FAILED = 'auth.login_failed',
  PASSWORD_CHANGE = 'auth.password_change',
  PASSWORD_RESET = 'auth.password_reset',
  
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_PROFILE_UPDATED = 'user.profile_updated',
  
  // Financial transaction events
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_UPDATED = 'transaction.updated',
  TRANSACTION_DELETED = 'transaction.deleted',
  TRANSACTION_VIEWED = 'transaction.viewed',
  TRANSACTION_EXPORTED = 'transaction.exported',
  
  // Budget events
  BUDGET_CREATED = 'budget.created',
  BUDGET_UPDATED = 'budget.updated',
  BUDGET_DELETED = 'budget.deleted',
  BUDGET_ALERT_TRIGGERED = 'budget.alert_triggered',
  
  // Account events
  ACCOUNT_CREATED = 'account.created',
  ACCOUNT_UPDATED = 'account.updated',
  ACCOUNT_DELETED = 'account.deleted',
  ACCOUNT_BALANCE_UPDATED = 'account.balance_updated',
  
  // Category events
  CATEGORY_CREATED = 'category.created',
  CATEGORY_UPDATED = 'category.updated',
  CATEGORY_DELETED = 'category.deleted',
  
  // File upload events
  FILE_UPLOADED = 'file.uploaded',
  FILE_DELETED = 'file.deleted',
  FILE_ACCESSED = 'file.accessed',
  
  // Data export events
  DATA_EXPORT = 'data.export',
  DATA_IMPORT = 'data.import',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  INVALID_ACCESS_ATTEMPT = 'security.invalid_access',
  
  // System events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WARNING = 'system.warning',
}

// Audit log severity levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  method: string;
  endpoint: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  success: boolean;
  errorMessage?: string;
  sessionId?: string;
  requestId?: string;
}

// Financial data sensitivity map
const FINANCIAL_FIELD_SENSITIVITY: Record<string, 'high' | 'medium' | 'low'> = {
  amount: 'high',
  balance: 'high',
  account_number: 'high',
  routing_number: 'high',
  ssn: 'high',
  tax_id: 'high',
  credit_card_number: 'high',
  description: 'medium',
  category: 'low',
  date: 'low',
  type: 'low',
  tags: 'low',
};

// Ensure audit logs directory exists
const auditLogDir = path.join(process.cwd(), 'logs', 'audit');
if (!fs.existsSync(auditLogDir)) {
  fs.mkdirSync(auditLogDir, { recursive: true });
}

// Create audit log file path based on date
const getAuditLogFilePath = (date: Date = new Date()): string => {
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(auditLogDir, `audit-${dateString}.log`);
};

// Sanitize sensitive data before logging
const sanitizeFinancialData = (data: any, isHighSecurity: boolean = false): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const sensitivity = FINANCIAL_FIELD_SENSITIVITY[lowerKey] || 'low';
    
    if (sensitivity === 'high' && isHighSecurity) {
      // Mask high sensitivity data
      if (typeof value === 'string') {
        (sanitized as any)[key] = value.length > 4 ? 
          `***${value.slice(-4)}` : '***';
      } else if (typeof value === 'number') {
        (sanitized as any)[key] = '***';
      } else {
        (sanitized as any)[key] = '***';
      }
    } else if (sensitivity === 'medium' && isHighSecurity) {
      // Partially mask medium sensitivity data
      if (typeof value === 'string' && value.length > 10) {
        (sanitized as any)[key] = `${value.slice(0, 3)}***${value.slice(-3)}`;
      } else {
        (sanitized as any)[key] = value;
      }
    } else if (typeof value === 'object') {
      (sanitized as any)[key] = sanitizeFinancialData(value, isHighSecurity);
    } else {
      (sanitized as any)[key] = value;
    }
  }
  
  return sanitized;
};

// Write audit log entry to file
const writeAuditLogToFile = (entry: AuditLogEntry): void => {
  try {
    const filePath = getAuditLogFilePath(entry.timestamp);
    const logLine = JSON.stringify(entry) + '\n';
    
    fs.appendFileSync(filePath, logLine, 'utf8');
  } catch (error) {
    console.error('Failed to write audit log to file:', error);
  }
};

// Store audit log entry in database
const storeAuditLogInDatabase = async (entry: AuditLogEntry): Promise<void> => {
  try {
    // Check if audit_logs table exists
    const hasAuditTable = await knex.schema.hasTable('audit_logs');
    if (!hasAuditTable) {
      console.warn('audit_logs table does not exist, skipping database audit logging');
      return;
    }
    
    await knex('audit_logs').insert({
      id: entry.id || knex.raw('gen_random_uuid()'),
      timestamp: entry.timestamp,
      event_type: entry.eventType,
      severity: entry.severity,
      user_id: entry.userId,
      user_email: entry.userEmail,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      method: entry.method,
      endpoint: entry.endpoint,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      old_values: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      new_values: entry.newValues ? JSON.stringify(entry.newValues) : null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      success: entry.success,
      error_message: entry.errorMessage,
      session_id: entry.sessionId,
      request_id: entry.requestId,
    });
  } catch (error) {
    console.error('Failed to store audit log in database:', error);
  }
};

// Main audit logging function
export const createAuditLog = async (entry: Partial<AuditLogEntry>): Promise<void> => {
  const auditEntry: AuditLogEntry = {
    id: entry.id || require('crypto').randomUUID(),
    timestamp: new Date(),
    eventType: entry.eventType!,
    severity: entry.severity || AuditSeverity.MEDIUM,
    userId: entry.userId,
    userEmail: entry.userEmail,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    method: entry.method || 'UNKNOWN',
    endpoint: entry.endpoint || 'UNKNOWN',
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    oldValues: entry.oldValues,
    newValues: entry.newValues,
    metadata: entry.metadata,
    success: entry.success !== undefined ? entry.success : true,
    errorMessage: entry.errorMessage,
    sessionId: entry.sessionId,
    requestId: entry.requestId,
  };
  
  // Write to file (always)
  writeAuditLogToFile(auditEntry);
  
  // Store in database (if available)
  await storeAuditLogInDatabase(auditEntry);
  
  // Log critical events to console for immediate attention
  if (auditEntry.severity === AuditSeverity.CRITICAL) {
    console.error('CRITICAL AUDIT EVENT:', JSON.stringify(auditEntry, null, 2));
  }
};

// Audit logging middleware for financial transactions
export const auditFinancialTransaction = (eventType: AuditEventType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authenticatedReq = req as AuthenticatedRequest;
    const requestId = (req as any).requestId;
    
    // Store original request data for comparison
    const originalResJson = res.json;
    const requestData = { ...req.body };
    
    res.json = function(body: any) {
      // Create audit log entry after response
      setImmediate(async () => {
        try {
          const isSuccess = res.statusCode < 400;
          const resourceId = body?.data?.id || req.params.id;
          
          await createAuditLog({
            eventType,
            severity: getSeverityForEventType(eventType),
            userId: authenticatedReq.user?.id,
            userEmail: authenticatedReq.user?.email,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            endpoint: req.originalUrl,
            resourceType: getResourceTypeFromEventType(eventType),
            resourceId,
            oldValues: req.method !== 'POST' ? sanitizeFinancialData(requestData, true) : null,
            newValues: isSuccess ? sanitizeFinancialData(body?.data, true) : null,
            metadata: {
              statusCode: res.statusCode,
              responseTime: res.getHeader('X-Response-Time'),
              userAgent: req.get('User-Agent'),
              referer: req.get('Referer'),
            },
            success: isSuccess,
            errorMessage: !isSuccess ? body?.message || body?.error : null,
            requestId,
          });
        } catch (error) {
          console.error('Failed to create audit log:', error);
        }
      });
      
      return originalResJson.call(this, body);
    };
    
    next();
  };
};

// Get severity level for event type
const getSeverityForEventType = (eventType: AuditEventType): AuditSeverity => {
  const highSeverityEvents = [
    AuditEventType.LOGIN_FAILED,
    AuditEventType.PASSWORD_CHANGE,
    AuditEventType.PASSWORD_RESET,
    AuditEventType.TRANSACTION_DELETED,
    AuditEventType.ACCOUNT_DELETED,
    AuditEventType.USER_DELETED,
    AuditEventType.DATA_EXPORT,
    AuditEventType.SUSPICIOUS_ACTIVITY,
    AuditEventType.INVALID_ACCESS_ATTEMPT,
  ];
  
  const criticalSeverityEvents = [
    AuditEventType.RATE_LIMIT_EXCEEDED,
    AuditEventType.SYSTEM_ERROR,
  ];
  
  if (criticalSeverityEvents.includes(eventType)) {
    return AuditSeverity.CRITICAL;
  }
  
  if (highSeverityEvents.includes(eventType)) {
    return AuditSeverity.HIGH;
  }
  
  return AuditSeverity.MEDIUM;
};

// Get resource type from event type
const getResourceTypeFromEventType = (eventType: AuditEventType): string => {
  if (eventType.startsWith('transaction.')) return 'transaction';
  if (eventType.startsWith('budget.')) return 'budget';
  if (eventType.startsWith('account.')) return 'account';
  if (eventType.startsWith('category.')) return 'category';
  if (eventType.startsWith('user.')) return 'user';
  if (eventType.startsWith('file.')) return 'file';
  if (eventType.startsWith('auth.')) return 'auth';
  
  return 'unknown';
};

// Middleware for automatic audit logging based on request method and path
export const autoAuditLog = (req: Request, res: Response, next: NextFunction): void => {
  const authenticatedReq = req as AuthenticatedRequest;
  const requestId = (req as any).requestId;
  
  // Skip audit logging for health checks and non-sensitive endpoints
  if (req.path.includes('/health') || req.path.includes('/status')) {
    return next();
  }
  
  // Determine event type based on method and path
  const eventType = determineEventType(req.method, req.path);
  if (!eventType) {
    return next();
  }
  
  // Store original response method
  const originalResJson = res.json;
  const startTime = Date.now();
  
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    // Create audit log entry asynchronously
    setImmediate(async () => {
      try {
        const isSuccess = res.statusCode < 400;
        
        await createAuditLog({
          eventType,
          severity: getSeverityForEventType(eventType),
          userId: authenticatedReq.user?.id,
          userEmail: authenticatedReq.user?.email,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          endpoint: req.originalUrl,
          resourceType: getResourceTypeFromEventType(eventType),
          resourceId: req.params.id,
          metadata: {
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            queryParams: Object.keys(req.query).length > 0 ? req.query : null,
            bodySize: JSON.stringify(req.body || {}).length,
            responseSize: JSON.stringify(body || {}).length,
          },
          success: isSuccess,
          errorMessage: !isSuccess ? body?.message || body?.error : null,
          requestId,
        });
      } catch (error) {
        console.error('Failed to create auto audit log:', error);
      }
    });
    
    return originalResJson.call(this, body);
  };
  
  next();
};

// Determine event type from HTTP method and path
const determineEventType = (method: string, path: string): AuditEventType | null => {
  const lowerPath = path.toLowerCase();
  
  // Authentication endpoints
  if (lowerPath.includes('/auth/login')) return AuditEventType.LOGIN;
  if (lowerPath.includes('/auth/logout')) return AuditEventType.LOGOUT;
  if (lowerPath.includes('/auth/reset-password')) return AuditEventType.PASSWORD_RESET;
  
  // Transaction endpoints
  if (lowerPath.includes('/transactions')) {
    if (method === 'POST') return AuditEventType.TRANSACTION_CREATED;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.TRANSACTION_UPDATED;
    if (method === 'DELETE') return AuditEventType.TRANSACTION_DELETED;
    if (method === 'GET') return AuditEventType.TRANSACTION_VIEWED;
  }
  
  // Budget endpoints
  if (lowerPath.includes('/budgets')) {
    if (method === 'POST') return AuditEventType.BUDGET_CREATED;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.BUDGET_UPDATED;
    if (method === 'DELETE') return AuditEventType.BUDGET_DELETED;
  }
  
  // Account endpoints
  if (lowerPath.includes('/accounts')) {
    if (method === 'POST') return AuditEventType.ACCOUNT_CREATED;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.ACCOUNT_UPDATED;
    if (method === 'DELETE') return AuditEventType.ACCOUNT_DELETED;
  }
  
  // Category endpoints
  if (lowerPath.includes('/categories')) {
    if (method === 'POST') return AuditEventType.CATEGORY_CREATED;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.CATEGORY_UPDATED;
    if (method === 'DELETE') return AuditEventType.CATEGORY_DELETED;
  }
  
  // File upload endpoints
  if (lowerPath.includes('/upload')) {
    if (method === 'POST') return AuditEventType.FILE_UPLOADED;
    if (method === 'DELETE') return AuditEventType.FILE_DELETED;
  }
  
  return null;
};

// Middleware to log security events
export const logSecurityEvent = (eventType: AuditEventType, metadata?: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authenticatedReq = req as AuthenticatedRequest;
    
    await createAuditLog({
      eventType,
      severity: AuditSeverity.HIGH,
      userId: authenticatedReq.user?.id,
      userEmail: authenticatedReq.user?.email,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      endpoint: req.originalUrl,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        headers: req.headers,
      },
      success: false,
      requestId: (req as any).requestId,
    });
    
    next();
  };
};

// Utility function to log custom audit events
export const logAuditEvent = async (
  req: Request,
  eventType: AuditEventType,
  options: {
    resourceType?: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    metadata?: any;
    success?: boolean;
    errorMessage?: string;
    severity?: AuditSeverity;
  } = {}
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  
  await createAuditLog({
    eventType,
    severity: options.severity || getSeverityForEventType(eventType),
    userId: authenticatedReq.user?.id,
    userEmail: authenticatedReq.user?.email,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    endpoint: req.originalUrl,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    oldValues: options.oldValues ? sanitizeFinancialData(options.oldValues, true) : null,
    newValues: options.newValues ? sanitizeFinancialData(options.newValues, true) : null,
    metadata: options.metadata,
    success: options.success !== undefined ? options.success : true,
    errorMessage: options.errorMessage,
    requestId: (req as any).requestId,
  });
};