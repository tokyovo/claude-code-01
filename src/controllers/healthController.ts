import { Request, Response } from 'express';
import { ApiResponse } from '@/types/express';
import { config } from '@/config/env';
import { asyncHandler } from '@/middleware/errorHandler';
import { healthCheck as dbHealthCheck } from '@/config/database';
import { healthCheck as redisHealthCheck } from '@/config/redis';

interface HealthCheckData {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  system: {
    platform: string;
    nodeVersion: string;
    arch: string;
  };
  services?: {
    database?: {
      status: 'healthy' | 'unhealthy';
      message: string;
      details?: any;
    };
    redis?: {
      status: 'healthy' | 'unhealthy';
      message: string;
      details?: any;
    };
  };
}

// Basic health check
export const healthCheck = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    
    const healthData: HealthCheckData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch,
      },
    };

    const response: ApiResponse<HealthCheckData> = {
      success: true,
      message: 'Health check successful',
      data: healthData,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }
);

// Detailed health check with services
export const detailedHealthCheck = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    
    // Check database and Redis health
    const [dbHealth, redisHealth] = await Promise.all([
      dbHealthCheck().catch(err => ({
        status: 'unhealthy' as const,
        message: 'Database connection failed',
        details: { error: err.message }
      })),
      redisHealthCheck().catch(err => ({
        status: 'unhealthy' as const,
        message: 'Redis connection failed',
        details: { error: err.message }
      }))
    ]);

    const allServicesHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';
    
    const healthData: HealthCheckData = {
      status: allServicesHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch,
      },
      services: {
        database: dbHealth,
        redis: redisHealth,
      }
    };

    const response: ApiResponse<HealthCheckData> = {
      success: allServicesHealthy,
      message: allServicesHealthy ? 'All services healthy' : 'Some services are degraded',
      data: healthData,
      timestamp: new Date().toISOString(),
    };

    res.status(allServicesHealthy ? 200 : 503).json(response);
  }
);

// Readiness check (for load balancers)
export const readinessCheck = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    // Quick checks for essential services
    const checks = {
      server: true,
      database: false,
      redis: false,
    };

    try {
      // Quick database check
      const dbHealth = await dbHealthCheck();
      checks.database = dbHealth.status === 'healthy';
    } catch {
      checks.database = false;
    }

    try {
      // Quick Redis check
      const redisHealth = await redisHealthCheck();
      checks.redis = redisHealth.status === 'healthy';
    } catch {
      checks.redis = false;
    }

    const allHealthy = Object.values(checks).every(check => check === true);
    const status = allHealthy ? 200 : 503;

    const response: ApiResponse<typeof checks> = {
      success: allHealthy,
      message: allHealthy ? 'Service ready' : 'Service not ready',
      data: checks,
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(response);
  }
);

// Liveness check (for container orchestrators)
export const livenessCheck = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const response: ApiResponse<{ alive: boolean }> = {
      success: true,
      message: 'Service alive',
      data: { alive: true },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }
);