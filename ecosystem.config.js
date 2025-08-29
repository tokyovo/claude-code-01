// =================================
// PM2 Ecosystem Configuration
// Personal Finance Tracker API - Production Process Management
// =================================

module.exports = {
  apps: [
    // =================================
    // Main API Application
    // =================================
    {
      name: 'finance-tracker-api',
      script: 'dist/server.js',
      cwd: '/app',
      
      // Instance Configuration
      instances: process.env.PM2_INSTANCES || 'max', // Use all CPU cores in production
      exec_mode: 'cluster',
      
      // Environment Configuration
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        API_VERSION: 'v1',
        API_PREFIX: '/api',
        
        // Database
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'personal_finance_tracker',
        DB_USER: 'postgres',
        DB_PASSWORD: 'postgres',
        
        // Redis
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        
        // Security
        JWT_SECRET: 'development-secret-change-in-production',
        JWT_REFRESH_SECRET: 'development-refresh-secret-change-in-production',
        
        // Logging
        LOG_LEVEL: 'info',
        LOG_HTTP_REQUESTS: true,
      },
      
      // Production Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        API_VERSION: 'v1',
        API_PREFIX: '/api',
        
        // Database (Production)
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || 'personal_finance_tracker',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_SSL: process.env.DB_SSL || 'true',
        DB_POOL_MIN: process.env.DB_POOL_MIN || 5,
        DB_POOL_MAX: process.env.DB_POOL_MAX || 30,
        
        // Redis (Production)
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        
        // Security (Production)
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
        JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS || 12,
        
        // CORS (Production)
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://yourdomain.com',
        CORS_CREDENTIALS: true,
        
        // Logging (Production)
        LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
        LOG_HTTP_REQUESTS: process.env.LOG_HTTP_REQUESTS || false,
        LOG_DATABASE_QUERIES: false,
        LOG_ERROR_STACK_TRACES: true,
        
        // Email (Production)
        EMAIL_HOST: process.env.EMAIL_HOST,
        EMAIL_PORT: process.env.EMAIL_PORT || 587,
        EMAIL_USER: process.env.EMAIL_USER,
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
        EMAIL_FROM: process.env.EMAIL_FROM,
        
        // Performance
        ENABLE_COMPRESSION: true,
        ENABLE_ETAG: true,
        CACHE_DEFAULT_TTL: 300,
        
        // Monitoring
        ENABLE_HEALTH_CHECKS: true,
        ENABLE_PERFORMANCE_MONITORING: true,
        SLOW_QUERY_THRESHOLD_MS: 1000,
        SLOW_REQUEST_THRESHOLD_MS: 5000,
        
        // Feature Flags
        ENABLE_BUDGET_ALERTS: true,
        ENABLE_CATEGORY_SUGGESTIONS: true,
        ENABLE_RECURRING_TRANSACTIONS: true,
        
        // Migration Settings
        RUN_MIGRATIONS: process.env.RUN_MIGRATIONS || 'true',
        RUN_SEEDS: process.env.RUN_SEEDS || 'false',
      },
      
      // Staging Environment
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        
        // Use production-like settings but with different secrets/endpoints
        DB_HOST: process.env.STAGING_DB_HOST || 'localhost',
        DB_NAME: process.env.STAGING_DB_NAME || 'personal_finance_tracker_staging',
        
        // Logging (More verbose in staging)
        LOG_LEVEL: 'info',
        LOG_HTTP_REQUESTS: true,
        LOG_DATABASE_QUERIES: true,
        
        // Allow seeds in staging
        RUN_SEEDS: 'true',
      },
      
      // Performance Configuration
      node_args: [
        '--max_old_space_size=2048',  // 2GB memory limit
        '--max_semi_space_size=128',   // 128MB for young generation
        '--optimize-for-size'          // Optimize for memory usage
      ],
      
      // Restart Configuration
      restart_delay: 4000,           // 4 seconds delay before restart
      max_restarts: 10,              // Max restarts within 10 minutes
      min_uptime: '10s',             // Minimum uptime before restart
      kill_timeout: 5000,            // 5 seconds to kill process
      
      // Auto-restart Configuration
      watch: false,                  // Disable watch in production
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Logging Configuration
      log_file: '/app/logs/pm2-combined.log',
      out_file: '/app/logs/pm2-out.log',
      error_file: '/app/logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Resource Limits
      max_memory_restart: '2G',      // Restart if memory exceeds 2GB
      
      // Health Monitoring
      health_check_url: 'http://localhost:3000/api/v1/health',
      health_check_grace_period: 3000,
      
      // Advanced Configuration
      listen_timeout: 8000,
      kill_retry_time: 100,
      
      // Cluster Configuration
      instance_var: 'INSTANCE_ID',
      
      // Source Map Support
      source_map_support: true,
      
      // Time Zone
      time: true,
    },
    
    // =================================
    // Background Task Worker (Optional)
    // =================================
    {
      name: 'finance-tracker-worker',
      script: 'dist/worker.js', // If you have background tasks
      instances: 1,
      exec_mode: 'fork',
      
      // Environment Configuration
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background_tasks',
        
        // Database (same as main app)
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || 'personal_finance_tracker',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD,
        
        // Redis
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        
        // Worker-specific settings
        BACKUP_SCHEDULE: '0 2 * * *',        // Daily at 2 AM
        EMAIL_BATCH_SIZE: 100,
        CLEANUP_SCHEDULE: '0 3 * * 0',       // Weekly at 3 AM on Sunday
        
        // Logging
        LOG_LEVEL: 'info',
      },
      
      // Worker-specific configuration
      cron_restart: '0 4 * * *',      // Restart daily at 4 AM
      restart_delay: 10000,           // 10 seconds delay
      max_restarts: 5,
      min_uptime: '30s',
      
      // Logging
      log_file: '/app/logs/worker-combined.log',
      out_file: '/app/logs/worker-out.log',
      error_file: '/app/logs/worker-error.log',
      
      // Disable if no worker needed
      autorestart: false,
      enabled: false, // Set to true if you have background workers
    },
    
    // =================================
    // Database Backup Service (Optional)
    // =================================
    {
      name: 'finance-tracker-backup',
      script: 'dist/services/backupService.js', // If you have backup service
      instances: 1,
      exec_mode: 'fork',
      
      // Cron-based execution
      cron_restart: '0 2 * * *', // Daily at 2 AM
      autorestart: false,
      
      env_production: {
        NODE_ENV: 'production',
        SERVICE_TYPE: 'backup',
        
        // Database connection
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || 'personal_finance_tracker',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD,
        
        // Backup settings
        BACKUP_DESTINATION: '/backups',
        BACKUP_RETENTION_DAYS: 30,
        BACKUP_COMPRESSION: true,
        
        // Cloud backup (if configured)
        BACKUP_CLOUD_PROVIDER: process.env.BACKUP_CLOUD_PROVIDER,
        BACKUP_CLOUD_BUCKET: process.env.BACKUP_CLOUD_BUCKET,
        
        // Logging
        LOG_LEVEL: 'info',
      },
      
      // Logging
      log_file: '/app/logs/backup-combined.log',
      out_file: '/app/logs/backup-out.log',
      error_file: '/app/logs/backup-error.log',
      
      // Disable if no backup service needed
      enabled: false, // Set to true if you have backup service
    }
  ],
  
  // =================================
  // Deployment Configuration
  // =================================
  deploy: {
    // Production deployment
    production: {
      user: 'deploy',
      host: ['production-server.com'],
      port: '22',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/personal-finance-tracker.git',
      path: '/var/www/finance-tracker',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // Staging deployment
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      port: '22',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/personal-finance-tracker.git',
      path: '/var/www/finance-tracker-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};