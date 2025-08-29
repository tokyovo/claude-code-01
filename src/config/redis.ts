import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';

// Redis connection options
const redisOptions: RedisOptions = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  
  // Connection settings
  connectTimeout: 10000, // 10 seconds
  commandTimeout: 5000, // 5 seconds
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  
  // Lazy connect - don't connect until first command
  lazyConnect: true,
  
  // Keep alive settings
  keepAlive: 30000,
  
  // Reconnection settings
  retryDelayOnCluster: 5000,
  enableOfflineQueue: false,
  
  // Key prefix for namespacing
  keyPrefix: 'finance_tracker:',
  
  // Family preference (IPv4)
  family: 4,
  
  // Connection name for monitoring
  connectionName: 'personal-finance-tracker',
};

// Create Redis instance
export const redis = new Redis(redisOptions);

// Redis event handlers
redis.on('connect', () => {
  console.log('🟢 Redis client connected');
});

redis.on('ready', () => {
  console.log('🟢 Redis client ready');
});

redis.on('error', (error) => {
  console.error('🔴 Redis connection error:', error);
});

redis.on('close', () => {
  console.log('🟡 Redis connection closed');
});

redis.on('reconnecting', (time) => {
  console.log(`🟡 Redis reconnecting in ${time}ms`);
});

redis.on('end', () => {
  console.log('🔴 Redis connection ended');
});

// Cache service interface
export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;
}

// Cache utility functions
export const cache = {
  // Get value from cache
  get: async (key: string): Promise<string | null> => {
    try {
      return await redis.get(key);
    } catch (error) {
      console.error('🔴 Redis GET error:', error);
      return null;
    }
  },

  // Set value in cache with optional TTL
  set: async (key: string, value: string, ttl: number = 3600): Promise<boolean> => {
    try {
      if (ttl > 0) {
        await redis.setex(key, ttl, value);
      } else {
        await redis.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('🔴 Redis SET error:', error);
      return false;
    }
  },

  // Get and set JSON data
  getJSON: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('🔴 Redis GET JSON error:', error);
      return null;
    }
  },

  setJSON: async (key: string, value: any, ttl: number = 3600): Promise<boolean> => {
    try {
      const jsonValue = JSON.stringify(value);
      return await cache.set(key, jsonValue, ttl);
    } catch (error) {
      console.error('🔴 Redis SET JSON error:', error);
      return false;
    }
  },

  // Delete key from cache
  del: async (key: string): Promise<boolean> => {
    try {
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('🔴 Redis DEL error:', error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key: string): Promise<boolean> => {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('🔴 Redis EXISTS error:', error);
      return false;
    }
  },

  // Set expiration time
  expire: async (key: string, ttl: number): Promise<boolean> => {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error('🔴 Redis EXPIRE error:', error);
      return false;
    }
  },

  // Get TTL for key
  ttl: async (key: string): Promise<number> => {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('🔴 Redis TTL error:', error);
      return -1;
    }
  },

  // Delete keys by pattern
  deletePattern: async (pattern: string): Promise<number> => {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      return await redis.del(...keys);
    } catch (error) {
      console.error('🔴 Redis DELETE PATTERN error:', error);
      return 0;
    }
  },

  // Increment counter
  incr: async (key: string, ttl?: number): Promise<number> => {
    try {
      const result = await redis.incr(key);
      if (ttl && result === 1) {
        await redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('🔴 Redis INCR error:', error);
      return 0;
    }
  },

  // Hash operations
  hget: async (key: string, field: string): Promise<string | null> => {
    try {
      return await redis.hget(key, field);
    } catch (error) {
      console.error('🔴 Redis HGET error:', error);
      return null;
    }
  },

  hset: async (key: string, field: string, value: string, ttl?: number): Promise<boolean> => {
    try {
      await redis.hset(key, field, value);
      if (ttl) {
        await redis.expire(key, ttl);
      }
      return true;
    } catch (error) {
      console.error('🔴 Redis HSET error:', error);
      return false;
    }
  },

  hgetall: async (key: string): Promise<Record<string, string>> => {
    try {
      return await redis.hgetall(key);
    } catch (error) {
      console.error('🔴 Redis HGETALL error:', error);
      return {};
    }
  }
};

// Session management utilities
export const session = {
  // Session key generator
  key: (sessionId: string): string => `session:${sessionId}`,

  // Create session
  create: async (sessionId: string, data: any, ttl: number = 86400): Promise<boolean> => {
    return await cache.setJSON(session.key(sessionId), data, ttl);
  },

  // Get session data
  get: async <T>(sessionId: string): Promise<T | null> => {
    return await cache.getJSON<T>(session.key(sessionId));
  },

  // Update session
  update: async (sessionId: string, data: any, ttl?: number): Promise<boolean> => {
    const key = session.key(sessionId);
    const currentTtl = ttl || await cache.ttl(key);
    return await cache.setJSON(key, data, currentTtl > 0 ? currentTtl : 86400);
  },

  // Destroy session
  destroy: async (sessionId: string): Promise<boolean> => {
    return await cache.del(session.key(sessionId));
  },

  // Extend session TTL
  extend: async (sessionId: string, ttl: number = 86400): Promise<boolean> => {
    return await cache.expire(session.key(sessionId), ttl);
  }
};

// Rate limiting utilities
export const rateLimit = {
  // Rate limit key generator
  key: (identifier: string, window: string): string => `rate_limit:${identifier}:${window}`,

  // Check rate limit
  check: async (
    identifier: string,
    windowSize: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> => {
    try {
      const window = Math.floor(Date.now() / 1000 / windowSize);
      const key = rateLimit.key(identifier, window.toString());
      
      const current = await cache.incr(key, windowSize);
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = (window + 1) * windowSize;
      
      return {
        allowed: current <= maxRequests,
        remaining,
        resetTime
      };
    } catch (error) {
      console.error('🔴 Rate limit check error:', error);
      // Allow request on error
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: Date.now() + windowSize * 1000
      };
    }
  }
};

// Test Redis connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await redis.ping();
    console.log('🟢 Redis connection test successful:', result);
    return true;
  } catch (error) {
    console.error('🔴 Redis connection test failed:', error);
    return false;
  }
};

// Redis health check
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  details: any;
}> => {
  try {
    const start = Date.now();
    await redis.ping();
    const responseTime = Date.now() - start;
    
    const info = await redis.info('memory');
    const memoryUsage = info.split('\n')
      .find(line => line.startsWith('used_memory_human:'))
      ?.split(':')[1]?.trim();
    
    return {
      status: 'healthy',
      message: 'Redis connection is healthy',
      details: {
        responseTime: `${responseTime}ms`,
        memoryUsage,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Redis connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Graceful shutdown
export const closeConnection = async (): Promise<void> => {
  try {
    await redis.quit();
    console.log('🟡 Redis connection closed successfully');
  } catch (error) {
    console.error('🔴 Error closing Redis connection:', error);
    throw error;
  }
};

// Export Redis instance for direct access if needed
export default redis;

// Export redis client for JWT service compatibility
export const redisClient = redis;