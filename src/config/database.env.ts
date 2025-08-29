/**
 * Environment-specific database configuration
 * This file provides database settings for different environments
 */

export interface DatabaseEnvironmentConfig {
  // Connection settings
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  
  // SSL settings
  ssl?: boolean | { rejectUnauthorized: boolean };
  
  // Pool settings
  poolMin: number;
  poolMax: number;
  
  // Timeout settings
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  
  // Query settings
  queryTimeout: number;
  statementTimeout: number;
  
  // Debug settings
  debug: boolean;
  logQueries: boolean;
  
  // Migration settings
  runMigrationsOnStartup: boolean;
  runSeedsOnStartup: boolean;
  
  // Backup settings
  autoBackup: boolean;
  backupRetentionDays: number;
}

const environmentConfigs: Record<string, Partial<DatabaseEnvironmentConfig>> = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'personal_finance_tracker',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
    
    // Conservative pool settings for development
    poolMin: 2,
    poolMax: 10,
    
    // Generous timeouts for development
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    
    // Query timeouts
    queryTimeout: 60000,
    statementTimeout: 60000,
    
    // Enable debugging in development
    debug: process.env.DEBUG_SQL === 'true',
    logQueries: process.env.LOG_QUERIES === 'true',
    
    // Migration settings
    runMigrationsOnStartup: process.env.RUN_MIGRATIONS_ON_STARTUP === 'true',
    runSeedsOnStartup: process.env.RUN_SEEDS_ON_STARTUP === 'true',
    
    // Backup settings
    autoBackup: false,
    backupRetentionDays: 7,
  },

  test: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    database: process.env.TEST_DB_NAME || 'personal_finance_tracker_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    ssl: false,
    
    // Smaller pool for testing
    poolMin: 1,
    poolMax: 5,
    
    // Faster timeouts for testing
    acquireTimeoutMillis: 10000,
    createTimeoutMillis: 10000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    reapIntervalMillis: 1000,
    
    // Shorter query timeouts for tests
    queryTimeout: 30000,
    statementTimeout: 30000,
    
    // Disable debugging in tests unless explicitly enabled
    debug: false,
    logQueries: false,
    
    // Migration settings for tests
    runMigrationsOnStartup: true,
    runSeedsOnStartup: false, // Usually we don't want seeds in tests
    
    // No backups for test environment
    autoBackup: false,
    backupRetentionDays: 1,
  },

  staging: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    
    // Production-like pool settings
    poolMin: 2,
    poolMax: 15,
    
    // Balanced timeouts for staging
    acquireTimeoutMillis: 20000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    
    // Production-like query timeouts
    queryTimeout: 45000,
    statementTimeout: 45000,
    
    // Limited debugging in staging
    debug: false,
    logQueries: process.env.LOG_QUERIES === 'true',
    
    // Migration settings
    runMigrationsOnStartup: process.env.RUN_MIGRATIONS_ON_STARTUP === 'true',
    runSeedsOnStartup: false,
    
    // Enable backups in staging
    autoBackup: true,
    backupRetentionDays: 14,
  },

  production: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : true,
    
    // Optimized pool settings for production
    poolMin: 5,
    poolMax: 30,
    
    // Conservative timeouts for production
    acquireTimeoutMillis: 15000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    
    // Conservative query timeouts
    queryTimeout: 30000,
    statementTimeout: 30000,
    
    // No debugging in production
    debug: false,
    logQueries: false,
    
    // Migration settings for production
    runMigrationsOnStartup: false, // Migrations should be run manually in production
    runSeedsOnStartup: false,
    
    // Enable backups in production
    autoBackup: true,
    backupRetentionDays: 30,
  },
};

// Default configuration
const defaultConfig: DatabaseEnvironmentConfig = {
  host: 'localhost',
  port: 5432,
  database: 'personal_finance_tracker',
  user: 'postgres',
  password: 'postgres',
  ssl: false,
  
  poolMin: 2,
  poolMax: 10,
  
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  
  queryTimeout: 60000,
  statementTimeout: 60000,
  
  debug: false,
  logQueries: false,
  
  runMigrationsOnStartup: false,
  runSeedsOnStartup: false,
  
  autoBackup: false,
  backupRetentionDays: 7,
};

/**
 * Get database configuration for the current environment
 */
export function getDatabaseConfig(environment?: string): DatabaseEnvironmentConfig {
  const env = environment || process.env.NODE_ENV || 'development';
  const envConfig = environmentConfigs[env] || {};
  
  // Merge default config with environment-specific config
  const config = { ...defaultConfig, ...envConfig };
  
  // Validate required configuration
  validateDatabaseConfig(config, env);
  
  return config;
}

/**
 * Validate database configuration
 */
function validateDatabaseConfig(config: DatabaseEnvironmentConfig, environment: string): void {
  const requiredFields: (keyof DatabaseEnvironmentConfig)[] = [
    'host', 'port', 'database', 'user', 'password'
  ];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required database configuration: ${field} for environment: ${environment}`);
    }
  }
  
  // Validate port number
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid database port: ${config.port}`);
  }
  
  // Validate pool settings
  if (config.poolMin < 0 || config.poolMax < config.poolMin) {
    throw new Error(`Invalid pool settings: min=${config.poolMin}, max=${config.poolMax}`);
  }
  
  // Validate timeout settings
  const timeoutFields = [
    'acquireTimeoutMillis', 'createTimeoutMillis', 'destroyTimeoutMillis',
    'idleTimeoutMillis', 'queryTimeout', 'statementTimeout'
  ];
  
  for (const field of timeoutFields) {
    const value = config[field as keyof DatabaseEnvironmentConfig] as number;
    if (value < 0) {
      throw new Error(`Invalid timeout setting ${field}: ${value}`);
    }
  }
}

/**
 * Get connection string for the current environment
 */
export function getConnectionString(environment?: string): string {
  const config = getDatabaseConfig(environment);
  const { host, port, database, user, password } = config;
  
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

/**
 * Check if database configuration is valid for the current environment
 */
export function validateEnvironmentDatabase(environment?: string): boolean {
  try {
    getDatabaseConfig(environment);
    return true;
  } catch (error) {
    console.error(`Database configuration validation failed:`, error);
    return false;
  }
}

/**
 * Get all available environment configurations
 */
export function getAvailableEnvironments(): string[] {
  return Object.keys(environmentConfigs);
}

/**
 * Check if an environment is configured
 */
export function isEnvironmentConfigured(environment: string): boolean {
  return environment in environmentConfigs;
}

export default {
  getDatabaseConfig,
  getConnectionString,
  validateEnvironmentDatabase,
  getAvailableEnvironments,
  isEnvironmentConfigured,
};