import knex, { Knex } from 'knex';
import { config } from './env';

// Import knex configuration
const knexConfig = require('../../knexfile');

// Get environment-specific configuration
const environment = config.NODE_ENV || 'development';
const knexEnvConfig = knexConfig[environment];

// Create Knex instance
export const db: Knex = knex(knexEnvConfig);

// Database connection interface for consistency with existing code
export interface DatabaseConnection {
  query: (text: string, params?: any[]) => Promise<any>;
  release: () => void;
}

// Utility functions that work with Knex
export const dbUtils = {
  // Execute raw SQL query
  query: async (text: string, params?: any[]) => {
    try {
      const result = await db.raw(text, params);
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      console.error('📊 Knex query error:', error);
      throw error;
    }
  },

  // Execute a query and return the first row
  queryOne: async (text: string, params?: any[]) => {
    const result = await dbUtils.query(text, params);
    return result.rows[0] || null;
  },
  
  // Execute a query and return all rows
  queryMany: async (text: string, params?: any[]) => {
    const result = await dbUtils.query(text, params);
    return result.rows;
  },
  
  // Check if a record exists using Knex query builder
  exists: async (table: string, condition: Record<string, any>) => {
    const result = await db(table).where(condition).first();
    return !!result;
  },
  
  // Count records using Knex query builder
  count: async (table: string, condition?: Record<string, any>) => {
    const query = db(table);
    if (condition) {
      query.where(condition);
    }
    const result = await query.count('* as count').first();
    return parseInt(result?.count?.toString() || '0', 10);
  },

  // Transaction wrapper
  transaction: async <T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> => {
    return await db.transaction(callback);
  },

  // Get table schema information
  getTableInfo: async (tableName: string) => {
    return await db(tableName).columnInfo();
  },

  // Insert with returning
  insertReturning: async <T = any>(table: string, data: any): Promise<T[]> => {
    return await db(table).insert(data).returning('*');
  },

  // Update with returning
  updateReturning: async <T = any>(
    table: string, 
    condition: Record<string, any>, 
    data: any
  ): Promise<T[]> => {
    return await db(table).where(condition).update(data).returning('*');
  },

  // Delete with returning
  deleteReturning: async <T = any>(
    table: string, 
    condition: Record<string, any>
  ): Promise<T[]> => {
    return await db(table).where(condition).del().returning('*');
  },
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await db.raw('SELECT NOW() as current_time, version() as version');
    const row = result.rows[0];
    console.log('📊 Knex database connection test successful:', {
      time: row.current_time,
      version: row.version.split(' ')[0]
    });
    return true;
  } catch (error) {
    console.error('📊 Knex database connection test failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closeConnection = async (): Promise<void> => {
  try {
    await db.destroy();
    console.log('📊 Knex database connection closed successfully');
  } catch (error) {
    console.error('📊 Error closing Knex database connection:', error);
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
    await db.raw('SELECT 1 as health_check');
    const responseTime = Date.now() - start;
    
    // Get connection pool information
    const pool = db.client.pool;
    const poolStatus = {
      used: pool.numUsed(),
      free: pool.numFree(),
      pending: pool.numPendingAcquires(),
      total: pool.numUsed() + pool.numFree(),
    };
    
    return {
      status: 'healthy',
      message: 'Knex database connection is healthy',
      details: {
        responseTime: `${responseTime}ms`,
        pool: poolStatus,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Knex database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Migration utilities
export const migrationUtils = {
  // Run all pending migrations
  runMigrations: async (): Promise<void> => {
    try {
      const [batchNo, log] = await db.migrate.latest();
      console.log(`📊 Migrations completed. Batch: ${batchNo}`);
      if (log.length === 0) {
        console.log('📊 No migrations to run');
      } else {
        console.log('📊 Migrations run:', log);
      }
    } catch (error) {
      console.error('📊 Migration error:', error);
      throw error;
    }
  },

  // Rollback last migration batch
  rollbackMigrations: async (): Promise<void> => {
    try {
      const [batchNo, log] = await db.migrate.rollback();
      console.log(`📊 Migrations rolled back. Batch: ${batchNo}`);
      console.log('📊 Migrations rolled back:', log);
    } catch (error) {
      console.error('📊 Migration rollback error:', error);
      throw error;
    }
  },

  // Get migration status
  getMigrationStatus: async () => {
    try {
      const [completed] = await db.migrate.status();
      return {
        completed: completed.length,
        pending: 0, // Knex doesn't provide pending count directly
        migrations: completed
      };
    } catch (error) {
      console.error('📊 Error getting migration status:', error);
      throw error;
    }
  },

  // Run seeds
  runSeeds: async (): Promise<void> => {
    try {
      const [log] = await db.seed.run();
      console.log('📊 Seeds completed:', log);
    } catch (error) {
      console.error('📊 Seed error:', error);
      throw error;
    }
  },
};

// Table-specific query builders for common operations
export const tables = {
  users: () => db('users'),
  accounts: () => db('accounts'),
  categories: () => db('categories'),
  transactions: () => db('transactions'),
  budgets: () => db('budgets'),
  transactionSummary: () => db('transaction_summary'),
};

// Export the main db instance
export default db;