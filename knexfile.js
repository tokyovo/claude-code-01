// Update with your config settings
require('dotenv').config();
const path = require('path');

// TypeScript support configuration
const tsConfig = {
  loader: 'ts-node/esm',
  experimentalSpecifierResolution: 'node',
};

// Register ts-node for TypeScript support
try {
  require('ts-node').register({
    compilerOptions: {
      module: 'commonjs',
      target: 'es2020',
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
  });
} catch (error) {
  console.warn('ts-node registration failed, using JavaScript fallback');
}

const config = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      database: process.env.DB_NAME || 'finance_tracker',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      charset: 'utf8',
      timezone: 'UTC',
    },
    pool: {
      min: 1,
      max: 2,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 10000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      tableName: 'knex_migrations',
      schemaName: 'public',
      disableTransactions: false,
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
      loadExtensions: ['.ts'],
      timestampFilenamePrefix: true,
    },
    useNullAsDefault: false,
    debug: process.env.DEBUG_SQL === 'true',
    asyncStackTraces: true,
    log: {
      warn(message) {
        console.warn('🔶 Knex Warning:', message);
      },
      error(message) {
        console.error('🔴 Knex Error:', message);
      },
      deprecate(message) {
        console.warn('⚠️  Knex Deprecation:', message);
      },
      debug(message) {
        if (process.env.DEBUG_SQL === 'true') {
          console.debug('🐛 Knex Debug:', message);
        }
      },
    },
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
      database: process.env.TEST_DB_NAME || 'finance_tracker_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'password',
      charset: 'utf8',
      timezone: 'UTC',
    },
    pool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 10000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      tableName: 'knex_migrations',
      schemaName: 'public',
      disableTransactions: false,
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
      loadExtensions: ['.ts'],
      timestampFilenamePrefix: true,
    },
    useNullAsDefault: false,
    debug: false,
    asyncStackTraces: true,
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8',
      timezone: 'UTC',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      tableName: 'knex_migrations',
      schemaName: 'public',
      disableTransactions: false,
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
      loadExtensions: ['.ts'],
      timestampFilenamePrefix: true,
    },
    useNullAsDefault: false,
    debug: false,
    asyncStackTraces: false,
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8',
      timezone: 'UTC',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 10000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false,
    },
    migrations: {
      directory: './dist/database/migrations',
      extension: 'js',
      tableName: 'knex_migrations',
      schemaName: 'public',
      disableTransactions: false,
    },
    seeds: {
      directory: './dist/database/seeds',
      extension: 'js',
      timestampFilenamePrefix: true,
    },
    useNullAsDefault: false,
    debug: false,
    asyncStackTraces: false,
    log: {
      warn(message) {
        console.warn('🔶 Production Knex Warning:', message);
      },
      error(message) {
        console.error('🔴 Production Knex Error:', message);
      },
    },
  },
};

module.exports = config;