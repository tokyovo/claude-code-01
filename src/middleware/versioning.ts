import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Supported API versions
export const SUPPORTED_VERSIONS = ['v1', 'v2'] as const;
export type ApiVersion = typeof SUPPORTED_VERSIONS[number];

// Version deprecation information
export const VERSION_INFO: Record<ApiVersion, {
  deprecated: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  supportedUntil?: Date;
  description: string;
}> = {
  v1: {
    deprecated: false,
    description: 'Current stable version',
  },
  v2: {
    deprecated: false,
    description: 'Latest version with enhanced features',
  },
};

// Extended request interface with version info
declare global {
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion;
      versionInfo?: typeof VERSION_INFO[ApiVersion];
    }
  }
}

// Extract API version from request
const extractVersion = (req: Request): ApiVersion | null => {
  // Method 1: Check URL path (/api/v1/users)
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    const version = pathMatch[1] as ApiVersion;
    if (SUPPORTED_VERSIONS.includes(version)) {
      return version;
    }
  }
  
  // Method 2: Check Accept header (Accept: application/vnd.finance-tracker.v1+json)
  const acceptHeader = req.headers.accept;
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/application\/vnd\.finance-tracker\.(v\d+)\+json/);
    if (versionMatch) {
      const version = versionMatch[1] as ApiVersion;
      if (SUPPORTED_VERSIONS.includes(version)) {
        return version;
      }
    }
  }
  
  // Method 3: Check custom header (X-API-Version: v1)
  const versionHeader = req.headers['x-api-version'] as string;
  if (versionHeader && SUPPORTED_VERSIONS.includes(versionHeader as ApiVersion)) {
    return versionHeader as ApiVersion;
  }
  
  // Method 4: Check query parameter (?version=v1)
  const queryVersion = req.query.version as string;
  if (queryVersion && SUPPORTED_VERSIONS.includes(queryVersion as ApiVersion)) {
    return queryVersion as ApiVersion;
  }
  
  return null;
};

// API versioning middleware
export const apiVersioning = (defaultVersion: ApiVersion = 'v1') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Extract version from request
      const version = extractVersion(req) || defaultVersion;
      
      // Validate version
      if (!SUPPORTED_VERSIONS.includes(version)) {
        throw new AppError(
          `Unsupported API version: ${version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
          400
        );
      }
      
      // Attach version information to request
      req.apiVersion = version;
      req.versionInfo = VERSION_INFO[version];
      
      // Set response headers
      res.setHeader('X-API-Version', version);
      res.setHeader('X-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
      
      // Add deprecation warnings if applicable
      if (req.versionInfo.deprecated) {
        res.setHeader('Warning', '299 - "Deprecated API Version"');
        res.setHeader('Deprecation', req.versionInfo.deprecationDate?.toISOString() || 'true');
        
        if (req.versionInfo.sunsetDate) {
          res.setHeader('Sunset', req.versionInfo.sunsetDate.toISOString());
        }
        
        // Log deprecation warning
        console.warn(`Deprecated API version ${version} used by ${req.ip} for ${req.method} ${req.path}`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Version-specific route handler
export const versionedRoute = <T = any>(handlers: Partial<Record<ApiVersion, T>>, fallback?: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const version = req.apiVersion || 'v1';
    const handler = handlers[version] || fallback;
    
    if (!handler) {
      return next(new AppError(
        `No handler available for API version ${version} on ${req.method} ${req.path}`,
        501
      ));
    }
    
    // If handler is middleware function, call it
    if (typeof handler === 'function') {
      (handler as Function)(req, res, next);
    } else {
      // If handler is data, attach it to request for controller to use
      (req as any).versionedData = handler;
      next();
    }
  };
};

// Version compatibility middleware
export const requireMinVersion = (minVersion: ApiVersion) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const currentVersion = req.apiVersion || 'v1';
    const currentVersionIndex = SUPPORTED_VERSIONS.indexOf(currentVersion);
    const minVersionIndex = SUPPORTED_VERSIONS.indexOf(minVersion);
    
    if (currentVersionIndex < minVersionIndex) {
      return next(new AppError(
        `This endpoint requires API version ${minVersion} or higher. Current version: ${currentVersion}`,
        400
      ));
    }
    
    next();
  };
};

// Version deprecation middleware
export const checkDeprecation = (req: Request, res: Response, next: NextFunction): void => {
  const version = req.apiVersion;
  if (!version) return next();
  
  const versionInfo = VERSION_INFO[version];
  if (versionInfo.deprecated) {
    // Log deprecation usage for monitoring
    console.warn(`Deprecated API version ${version} accessed:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.path}`,
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
};

// Content negotiation middleware
export const contentNegotiation = (req: Request, res: Response, next: NextFunction): void => {
  const version = req.apiVersion || 'v1';
  const acceptHeader = req.headers.accept;
  
  // Set default content type based on version
  if (!acceptHeader || acceptHeader.includes('*/*')) {
    res.setHeader('Content-Type', `application/vnd.finance-tracker.${version}+json`);
  }
  
  // Override json method to include version in content type
  const originalJson = res.json;
  res.json = function(body: any) {
    if (!res.getHeader('Content-Type')) {
      this.setHeader('Content-Type', `application/vnd.finance-tracker.${version}+json`);
    }
    
    // Add version information to response body
    if (body && typeof body === 'object' && !body.apiVersion) {
      body.apiVersion = version;
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

// Version migration helper
export const migrateResponse = (
  fromVersion: ApiVersion,
  toVersion: ApiVersion,
  migrationMap: Record<string, string | ((value: any) => any)>
) => {
  return (data: any): any => {
    if (fromVersion === toVersion) return data;
    
    const migrated = { ...data };
    
    for (const [oldKey, newKeyOrTransform] of Object.entries(migrationMap)) {
      if (oldKey in migrated) {
        if (typeof newKeyOrTransform === 'string') {
          // Simple key renaming
          migrated[newKeyOrTransform] = migrated[oldKey];
          delete migrated[oldKey];
        } else if (typeof newKeyOrTransform === 'function') {
          // Value transformation
          migrated[oldKey] = newKeyOrTransform(migrated[oldKey]);
        }
      }
    }
    
    return migrated;
  };
};

// Version-aware response wrapper
export const versionedResponse = (req: Request, res: Response, data: any): void => {
  const version = req.apiVersion || 'v1';
  
  let responseData = data;
  
  // Apply version-specific transformations
  if (version === 'v1') {
    // V1 specific formatting
    responseData = {
      ...data,
      version: 'v1',
    };
  } else if (version === 'v2') {
    // V2 specific formatting with enhanced metadata
    responseData = {
      ...data,
      version: 'v2',
      meta: {
        ...data.meta,
        apiVersion: 'v2',
        timestamp: new Date().toISOString(),
        deprecation: req.versionInfo?.deprecated || false,
      },
    };
  }
  
  res.json(responseData);
};

// Middleware to log version usage statistics
export const versionAnalytics = (req: Request, res: Response, next: NextFunction): void => {
  const version = req.apiVersion;
  const endpoint = `${req.method} ${req.path}`;
  
  // In a real application, you might want to store this in a database or send to analytics service
  console.log(`API Usage: ${version} - ${endpoint} - ${req.ip} - ${new Date().toISOString()}`);
  
  next();
};

// Helper function to create version-specific error responses
export const createVersionedError = (
  version: ApiVersion,
  message: string,
  statusCode: number,
  details?: any
) => {
  const baseError = {
    success: false,
    message,
    error: message,
    timestamp: new Date().toISOString(),
    version,
  };
  
  if (version === 'v2') {
    return {
      ...baseError,
      meta: {
        statusCode,
        version,
        details,
      },
    };
  }
  
  return baseError;
};

// Middleware to handle cross-version compatibility
export const crossVersionCompatibility = (req: Request, res: Response, next: NextFunction): void => {
  const version = req.apiVersion || 'v1';
  
  // Add compatibility shims based on version
  if (version === 'v1') {
    // V1 compatibility shims
    const originalJson = res.json;
    res.json = function(body: any) {
      if (body && typeof body === 'object') {
        // Convert v2 format to v1 format if needed
        if (body.meta && body.data) {
          return originalJson.call(this, {
            success: true,
            ...body.data,
            timestamp: body.meta.timestamp,
          });
        }
      }
      return originalJson.call(this, body);
    };
  }
  
  next();
};