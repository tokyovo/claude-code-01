import { Pool, PoolClient, PoolConfig } from 'pg';
import { config } from './env';
// Import Knex configuration for migration and query building capabilities
import { db, dbUtils, testConnection as knexTestConnection, healthCheck as knexHealthCheck, migrationUtils } from './knex';

// Database connection pool configuration
const poolConfig: PoolConfig = {
  // Connection settings
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  
  // Connection pool settings
  min: 2, // Minimum number of connections in pool
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection could not be established
  
  // Query settings
  query_timeout: 60000, // Query timeout in milliseconds
  statement_timeout: 60000, // Statement timeout in milliseconds
  
  // SSL configuration (disabled for development)
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Application name for connection tracking
  application_name: 'personal-finance-tracker',
  
  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create connection pool
export const pool = new Pool(poolConfig);

// Pool event handlers for monitoring
pool.on('connect', (client: PoolClient) => {
  console.log('📊 New database client connected');
});

pool.on('acquire', (client: PoolClient) => {
  console.log('📊 Database client acquired from pool');
});

pool.on('remove', (client: PoolClient) => {
  console.log('📊 Database client removed from pool');
});

pool.on('error', (err: Error, client: PoolClient) => {
  console.error('📊 Database pool error:', err);
  // Don't exit the process on pool errors
});

// Database connection interface
export interface DatabaseConnection {
  query: (text: string, params?: any[]) => Promise<any>;
  release: () => void;
}

// Get a client from the pool
export const getClient = async (): Promise<PoolClient> => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('📊 Error getting database client:', error);
    throw new Error('Failed to get database client');
  }
};

// Execute a query with automatic client management
export const query = async (text: string, params?: any[]): Promise<any> => {
  const client = await getClient();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`📊 Slow query detected (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('📊 Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Execute multiple queries in a transaction
export const transaction = async (
  queries: Array<{ text: string; params?: any[] }>
): Promise<any[]> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const queryObj of queries) {
      const result = await client.query(queryObj.text, queryObj.params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('📊 Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    console.log('📊 Database connection test successful:', {
      time: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0]
    });
    return true;
  } catch (error) {
    console.error('📊 Database connection test failed:', error);
    return false;
  }
};

// Get pool status information
export const getPoolStatus = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

// Graceful shutdown
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('📊 Database pool closed successfully');
  } catch (error) {
    console.error('📊 Error closing database pool:', error);
    throw error;
  }
};

// Database health check
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  details: any;
}> => {
  try {
    const start = Date.now();
    const result = await query('SELECT 1 as health_check');
    const responseTime = Date.now() - start;
    
    const poolStatus = getPoolStatus();
    
    return {
      status: 'healthy',
      message: 'Database connection is healthy',
      details: {
        responseTime: `${responseTime}ms`,
        pool: poolStatus,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Utility functions for common database operations
export const dbUtils = {
  // Execute a query and return the first row
  queryOne: async (text: string, params?: any[]) => {
    const result = await query(text, params);
    return result.rows[0] || null;
  },
  
  // Execute a query and return all rows
  queryMany: async (text: string, params?: any[]) => {
    const result = await query(text, params);
    return result.rows;
  },
  
  // Check if a record exists
  exists: async (table: string, condition: string, params?: any[]) => {
    const result = await query(
      `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${condition})`,
      params
    );
    return result.rows[0].exists;
  },
  
  // Count records
  count: async (table: string, condition?: string, params?: any[]) => {
    const whereClause = condition ? `WHERE ${condition}` : '';
    const result = await query(
      `SELECT COUNT(*) as count FROM ${table} ${whereClause}`,
      params
    );
    return parseInt(result.rows[0].count, 10);
  }
};

// Export Knex utilities for modern database operations
export { db, dbUtils as knexUtils, knexTestConnection, knexHealthCheck, migrationUtils };

// Export pool for direct access if needed (backward compatibility)
export default pool;