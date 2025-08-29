import { Knex } from 'knex';
import knexConfig from '../../knexfile';

// Test database configuration
export const testDbConfig = knexConfig.test || knexConfig.development;

// Create test database connection
export const knexTestConfig = require('knex')(testDbConfig);

/**
 * Database test utilities
 */
export class DatabaseTestHelper {
  private knex: Knex;

  constructor(knexInstance: Knex = knexTestConfig) {
    this.knex = knexInstance;
  }

  /**
   * Setup test database - run migrations and seeds
   */
  async setupDatabase(): Promise<void> {
    try {
      // Run migrations
      await this.knex.migrate.latest();
      
      // Run seeds
      await this.knex.seed.run();
    } catch (error) {
      console.error('Error setting up test database:', error);
      throw error;
    }
  }

  /**
   * Clean up database - rollback migrations
   */
  async cleanupDatabase(): Promise<void> {
    try {
      await this.knex.migrate.rollback({}, true);
    } catch (error) {
      console.error('Error cleaning up test database:', error);
      throw error;
    }
  }

  /**
   * Truncate all tables (faster than full cleanup for tests)
   */
  async truncateAllTables(): Promise<void> {
    try {
      // Disable foreign key checks temporarily
      await this.knex.raw('SET foreign_key_checks = 0');
      
      // Get all table names
      const tables = await this.knex.raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `);
      
      // Truncate each table
      for (const table of tables[0]) {
        if (table.table_name !== 'knex_migrations' && table.table_name !== 'knex_migrations_lock') {
          await this.knex.raw(`TRUNCATE TABLE \`${table.table_name}\``);
        }
      }
      
      // Re-enable foreign key checks
      await this.knex.raw('SET foreign_key_checks = 1');
    } catch (error) {
      console.error('Error truncating tables:', error);
      throw error;
    }
  }

  /**
   * Reset auto-increment values
   */
  async resetAutoIncrements(): Promise<void> {
    try {
      const tables = ['users', 'accounts', 'categories', 'transactions', 'budgets'];
      
      for (const table of tables) {
        await this.knex.raw(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
      }
    } catch (error) {
      console.error('Error resetting auto-increments:', error);
      throw error;
    }
  }

  /**
   * Get a fresh database instance for each test
   */
  async getFreshDatabase(): Promise<Knex> {
    await this.truncateAllTables();
    await this.resetAutoIncrements();
    return this.knex;
  }

  /**
   * Insert test data and return the inserted records
   */
  async insertTestData<T>(table: string, data: Partial<T>[]): Promise<T[]> {
    const ids = await this.knex(table).insert(data);
    
    // Fetch the inserted records
    const insertedRecords = await this.knex(table)
      .whereIn('id', ids)
      .select('*');
    
    return insertedRecords;
  }

  /**
   * Close database connection
   */
  async closeConnection(): Promise<void> {
    await this.knex.destroy();
  }
}

// Global database helper instance
export const dbHelper = new DatabaseTestHelper();

/**
 * Database test hooks for Jest
 */
export const databaseTestHooks = {
  /**
   * Setup database before all tests in a suite
   */
  beforeAll: async () => {
    await dbHelper.setupDatabase();
  },

  /**
   * Cleanup after each test
   */
  afterEach: async () => {
    await dbHelper.truncateAllTables();
    await dbHelper.resetAutoIncrements();
  },

  /**
   * Cleanup after all tests in a suite
   */
  afterAll: async () => {
    await dbHelper.closeConnection();
  },
};

/**
 * Create isolated database transaction for testing
 */
export async function withDatabaseTransaction<T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  return knexTestConfig.transaction(async (trx) => {
    try {
      const result = await callback(trx);
      // Automatically rollback transaction after test
      await trx.rollback();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  });
}