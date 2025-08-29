#!/bin/bash

# =================================
# Wait for Services Script
# Waits for PostgreSQL and Redis to be ready before starting the application
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-personal_finance_tracker}
DB_USER=${DB_USER:-postgres}

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

MAX_ATTEMPTS=30
ATTEMPT=1

echo -e "${YELLOW}🔄 Waiting for services to be ready...${NC}"

# Function to wait for PostgreSQL
wait_for_postgres() {
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}...${NC}"
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏱️  PostgreSQL not ready yet (attempt $ATTEMPT/$MAX_ATTEMPTS)${NC}"
        sleep 2
        ATTEMPT=$((ATTEMPT + 1))
    done
    
    echo -e "${RED}❌ PostgreSQL failed to start within expected time${NC}"
    exit 1
}

# Function to wait for Redis
wait_for_redis() {
    echo -e "${YELLOW}⏳ Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}...${NC}"
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏱️  Redis not ready yet (attempt $ATTEMPT/$MAX_ATTEMPTS)${NC}"
        sleep 2
        ATTEMPT=$((ATTEMPT + 1))
    done
    
    echo -e "${RED}❌ Redis failed to start within expected time${NC}"
    exit 1
}

# Function to test database connection
test_database_connection() {
    echo -e "${YELLOW}🔍 Testing database connection...${NC}"
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        exit 1
    fi
}

# Function to test Redis connection
test_redis_connection() {
    echo -e "${YELLOW}🔍 Testing Redis connection...${NC}"
    
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" set test_key "test_value" >/dev/null 2>&1; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" del test_key >/dev/null 2>&1
        echo -e "${GREEN}✅ Redis connection successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ Redis connection failed${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}🚀 Starting service health checks...${NC}"
    echo -e "${YELLOW}📊 Configuration:${NC}"
    echo -e "   Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo -e "   Redis: ${REDIS_HOST}:${REDIS_PORT}"
    echo -e "   Max attempts: ${MAX_ATTEMPTS}"
    echo ""
    
    # Wait for services
    wait_for_postgres
    wait_for_redis
    
    # Test connections
    test_database_connection
    test_redis_connection
    
    echo -e "${GREEN}🎉 All services are ready!${NC}"
    echo ""
}

# Execute main function
main "$@"