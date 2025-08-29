# Database Setup Documentation

## Personal Finance Tracker - PostgreSQL & Redis Setup

This document describes the complete database setup for the Personal Finance Tracker backend API, including PostgreSQL for data persistence and Redis for caching and session management.

## 🏗️ Architecture Overview

- **PostgreSQL 15**: Primary database for financial data with optimized configuration for monetary precision
- **Redis 7**: Cache layer and session storage
- **Docker Compose**: Containerized services for development environment
- **Connection Pooling**: Efficient database connection management
- **Health Monitoring**: Comprehensive database connectivity monitoring

## 📦 Services Configuration

### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Port**: 5433 (mapped to avoid conflicts with local PostgreSQL)
- **Database**: finance_tracker
- **User**: postgres
- **Password**: password (development only)
- **Features**:
  - Optimized configuration for financial calculations
  - Automatic database initialization
  - Seed data for development
  - Connection pooling
  - Comprehensive error handling

### Redis Cache
- **Image**: redis:7-alpine
- **Port**: 6379
- **Features**:
  - Session management
  - Application caching
  - Rate limiting support
  - Optimized memory usage

## 🚀 Quick Start

### 1. Start Database Services
```bash
# Start PostgreSQL and Redis
npm run services:up

# Or start individual services
npm run db:up      # PostgreSQL only
npm run redis:up   # Redis only
```

### 2. Check Service Status
```bash
npm run services:status
```

### 3. Start Development Server
```bash
npm run dev:full
```

### 4. Test Database Connectivity
```bash
# Test health endpoints
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/health/ready
```

## 📊 Database Schema

The finance_tracker database includes the following tables:

### Core Tables
- **users**: User accounts and authentication
- **accounts**: Financial accounts (checking, savings, credit, etc.)
- **categories**: Transaction categories for organization
- **transactions**: Financial transactions with full audit trail
- **budgets**: Budget management and tracking

### Key Features
- **UUIDs**: Primary keys for security and distributed systems
- **Decimal Precision**: DECIMAL(15,2) for accurate financial calculations
- **Timestamps**: Automatic created_at/updated_at tracking
- **Indexes**: Optimized for financial data queries
- **Constraints**: Data integrity and validation rules
- **Triggers**: Automatic timestamp updates

### Sample Transaction Data
The database is seeded with realistic sample data including:
- User accounts with different types
- Categories for income and expenses
- 90 days of transaction history
- Budget templates

## 🛠️ Available Scripts

### Docker Management
```bash
npm run docker:up       # Start all services
npm run docker:down     # Stop all services
npm run docker:logs     # View service logs
npm run docker:restart  # Restart services
npm run docker:clean    # Remove all containers and volumes
```

### Database Management
```bash
npm run db:up       # Start PostgreSQL
npm run db:down     # Stop PostgreSQL
npm run db:logs     # View PostgreSQL logs
npm run db:reset    # Reset database (removes all data)
```

### Redis Management
```bash
npm run redis:up     # Start Redis
npm run redis:down   # Stop Redis
npm run redis:logs   # View Redis logs
npm run redis:flush  # Clear all cached data
```

### Development
```bash
npm run dev:full     # Start services + development server
npm run dev:services # Start all services including dev tools
npm run dev:clean    # Clean restart of all services
```

## 🔧 Configuration

### Environment Variables
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5433/finance_tracker
DB_HOST=localhost
DB_PORT=5433
DB_NAME=finance_tracker
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

### PostgreSQL Configuration
- **Optimized for financial data**: Proper decimal handling, UTC timezone
- **Performance tuning**: Shared buffers, work memory, connection pooling
- **Security**: SCRAM-SHA-256 authentication, encrypted passwords
- **Logging**: Query logging for debugging and monitoring

### Redis Configuration
- **Memory optimization**: LRU eviction policy, compression enabled
- **Session management**: TTL-based session expiry
- **Rate limiting**: Support for API rate limiting
- **Persistence**: AOF + RDB for data durability

## 📈 Health Monitoring

### Available Health Endpoints
- `GET /api/v1/health` - Basic service health
- `GET /api/v1/health/ready` - Readiness probe (includes DB/Redis checks)
- `GET /api/v1/health/live` - Liveness probe
- `GET /api/v1/health/detailed` - Detailed service status

### Health Check Features
- **Database connectivity**: Connection pool status
- **Redis connectivity**: Cache service availability
- **Response time monitoring**: Performance metrics
- **Resource utilization**: Memory and connection usage

## 🔐 Security Considerations

### Development Environment
- Default credentials are used for local development
- Ports are exposed for development tools (pgAdmin, Redis Insight)
- Debug logging is enabled

### Production Recommendations
- Use environment-specific credentials
- Enable SSL/TLS connections
- Restrict network access
- Enable audit logging
- Regular backup procedures

## 🐛 Troubleshooting

### Common Issues

1. **Port 5432 already in use**
   - Solution: Using port 5433 to avoid conflicts with local PostgreSQL

2. **Database connection failed**
   ```bash
   # Check service status
   docker-compose ps
   
   # View logs
   npm run db:logs
   
   # Restart services
   npm run services:down && npm run services:up
   ```

3. **Redis connection timeout**
   ```bash
   # Test Redis connectivity
   docker-compose exec redis redis-cli ping
   
   # Clear Redis data if needed
   npm run redis:flush
   ```

### Development Tools

#### pgAdmin (Database Management)
- **URL**: http://localhost:5050 (when using dev profile)
- **Email**: admin@finance-tracker.local
- **Password**: admin
- **Start**: `npm run dev:services`

#### Redis Insight (Redis Management)
- **URL**: http://localhost:8001 (when using dev profile)
- **Start**: `npm run dev:services`

## 📋 Database Operations

### Manual Database Commands
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d finance_tracker

# Execute SQL file
docker-compose exec postgres psql -U postgres -d finance_tracker -f /path/to/file.sql

# Backup database
docker-compose exec postgres pg_dump -U postgres finance_tracker > backup.sql

# Restore database
docker-compose exec -i postgres psql -U postgres finance_tracker < backup.sql
```

### Redis Operations
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Monitor Redis commands
docker-compose exec redis redis-cli monitor

# Get Redis info
docker-compose exec redis redis-cli info
```

## ✅ Verification Checklist

After setup, verify the following:
- [ ] PostgreSQL container is running and healthy
- [ ] Redis container is running and healthy
- [ ] Database tables are created
- [ ] Sample data is loaded (development)
- [ ] API server starts without errors
- [ ] Health endpoints return success
- [ ] Database connections are working
- [ ] Redis cache operations work

## 🔮 Next Steps

With the database infrastructure in place, you can now:
1. Implement authentication endpoints
2. Create user management APIs
3. Build transaction CRUD operations
4. Add budget management features
5. Implement reporting and analytics
6. Add real-time notifications

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Node.js pg Library](https://node-postgres.com/)
- [ioredis Library](https://github.com/luin/ioredis)

---

🎉 **Database setup complete!** Your Personal Finance Tracker backend is now ready for feature development.