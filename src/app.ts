import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from '@/config/env';
import { 
  corsOptions, 
  generalRateLimit, 
  helmetConfig, 
  compressionConfig,
  sanitizeInput,
  preventSqlInjection,
  preventNoSqlInjection,
  validateContentType,
  ipRateLimit
} from '@/middleware/security';
import { 
  httpLogger, 
  requestLogger 
} from '@/middleware/logging';
import { 
  errorHandler, 
  notFoundHandler 
} from '@/middleware/errorHandler';
import {
  apiVersioning
} from '@/middleware/versioning';
import {
  addResponseFormatters,
  enhancedResponseFormatter
} from '@/middleware/responseFormatter';
import routes from '@/routes';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // 1. Basic security middleware (must be first)
    this.app.use(helmetConfig);
    this.app.use(cors(corsOptions));
    this.app.use(compressionConfig);
    
    // 2. Trust proxy for accurate IP addresses (before rate limiting)
    this.app.set('trust proxy', 1);
    
    // 3. Rate limiting (before body parsing to limit early)
    this.app.use(ipRateLimit); // General IP-based rate limiting
    this.app.use(generalRateLimit);
    
    // 4. Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser()); // For handling JWT cookies
    
    // 5. Content type validation
    this.app.use(validateContentType(['application/json', 'multipart/form-data']));
    
    // 6. Input sanitization and security
    this.app.use(sanitizeInput);
    this.app.use(preventSqlInjection);
    this.app.use(preventNoSqlInjection);
    
    // 7. Request logging
    this.app.use(httpLogger);
    this.app.use(requestLogger);
    
    // 8. API versioning
    this.app.use(apiVersioning());
    // this.app.use(checkDeprecation);
    // this.app.use(versionContentNegotiation);
    // this.app.use(versionAnalytics);
    // this.app.use(crossVersionCompatibility);
    
    // 9. Response formatting
    this.app.use(addResponseFormatters);
    this.app.use(enhancedResponseFormatter);
    // this.app.use(contentNegotiation);
    // this.app.use(addHateoasLinks);
    
    // 10. Audit logging (after response formatters) - temporarily disabled
    // this.app.use(autoAuditLog);
    
    // 11. File upload cleanup (for handling upload errors)
    // this.app.use(cleanupFailedUploads);
    
    // 12. Security headers and configurations
    this.app.disable('x-powered-by');
    
    // Add security headers
    this.app.use((_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use(`${config.API_PREFIX}/${config.API_VERSION}`, routes);
    
    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Personal Finance Tracker API Server',
        data: {
          version: '1.0.0',
          environment: config.NODE_ENV,
          apiVersion: config.API_VERSION,
          documentation: `${req.protocol}://${req.get('host')}${config.API_PREFIX}/${config.API_VERSION}`,
        },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler for undefined routes
    this.app.use('*', notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  public listen(): void {
    this.app.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
      console.log(`📍 Environment: ${config.NODE_ENV}`);
      console.log(`🌐 API Base URL: http://localhost:${config.PORT}${config.API_PREFIX}/${config.API_VERSION}`);
      console.log(`🏥 Health Check: http://localhost:${config.PORT}${config.API_PREFIX}/${config.API_VERSION}/health`);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;