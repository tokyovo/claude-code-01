import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from '@/config/env';
import { 
  corsOptions, 
  generalRateLimit, 
  helmetConfig, 
  compressionConfig,
  sanitizeInput 
} from '@/middleware/security';
import { 
  httpLogger, 
  requestLogger 
} from '@/middleware/logging';
import { 
  errorHandler, 
  notFoundHandler 
} from '@/middleware/errorHandler';
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
    // Security middleware
    this.app.use(helmetConfig);
    this.app.use(cors(corsOptions));
    this.app.use(compressionConfig);
    
    // Rate limiting
    this.app.use(generalRateLimit);
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Input sanitization
    this.app.use(sanitizeInput);
    
    // Logging middleware
    this.app.use(httpLogger);
    this.app.use(requestLogger);
    
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
    
    // Disable x-powered-by header
    this.app.disable('x-powered-by');
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