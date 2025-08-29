#!/bin/bash

# =================================
# Migration and Start Script
# Runs database migrations and starts the application
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATION_TIMEOUT=${MIGRATION_TIMEOUT:-300}
RUN_MIGRATIONS=${RUN_MIGRATIONS:-true}
RUN_SEEDS=${RUN_SEEDS:-false}

echo -e "${BLUE}🚀 Personal Finance Tracker - Production Startup${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to run database migrations
run_migrations() {
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        echo -e "${YELLOW}📊 Running database migrations...${NC}"
        
        # Set timeout for migrations
        timeout "$MIGRATION_TIMEOUT" npm run migrate:latest || {
            echo -e "${RED}❌ Database migrations failed or timed out${NC}"
            exit 1
        }
        
        echo -e "${GREEN}✅ Database migrations completed successfully${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping database migrations (RUN_MIGRATIONS=false)${NC}"
    fi
}

# Function to run database seeds
run_seeds() {
    if [ "$RUN_SEEDS" = "true" ]; then
        echo -e "${YELLOW}🌱 Running database seeds...${NC}"
        
        # Only run seeds if not in production or explicitly enabled
        if [ "$NODE_ENV" = "production" ] && [ "$FORCE_SEEDS_IN_PRODUCTION" != "true" ]; then
            echo -e "${YELLOW}⚠️  Skipping seeds in production environment${NC}"
            echo -e "${YELLOW}   Set FORCE_SEEDS_IN_PRODUCTION=true to override${NC}"
        else
            npm run seed:run || {
                echo -e "${RED}❌ Database seeds failed${NC}"
                # Don't exit here as seeds might fail if data already exists
                echo -e "${YELLOW}⚠️  Continuing with application startup...${NC}"
            }
            echo -e "${GREEN}✅ Database seeds completed${NC}"
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping database seeds (RUN_SEEDS=false)${NC}"
    fi
}

# Function to validate environment
validate_environment() {
    echo -e "${YELLOW}🔍 Validating environment configuration...${NC}"
    
    # Check required environment variables
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "DB_HOST"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "JWT_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "   - $var"
        done
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment validation passed${NC}"
}

# Function to create necessary directories
setup_directories() {
    echo -e "${YELLOW}📁 Setting up directories...${NC}"
    
    # Create directories if they don't exist
    mkdir -p logs
    mkdir -p uploads/receipts
    mkdir -p uploads/profiles
    mkdir -p uploads/documents
    mkdir -p uploads/temp
    
    # Set permissions (if running as root, which we shouldn't be)
    if [ "$(id -u)" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Running as root - adjusting permissions${NC}"
        chown -R appuser:nodejs logs uploads 2>/dev/null || true
        chmod -R 755 logs uploads 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Directories setup completed${NC}"
}

# Function to display startup information
display_startup_info() {
    echo -e "${BLUE}📋 Startup Configuration:${NC}"
    echo -e "   Environment: ${NODE_ENV}"
    echo -e "   Port: ${PORT}"
    echo -e "   Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo -e "   Migrations: ${RUN_MIGRATIONS}"
    echo -e "   Seeds: ${RUN_SEEDS}"
    echo -e "   API Version: ${API_VERSION:-v1}"
    echo ""
}

# Function to start the application
start_application() {
    echo -e "${GREEN}🚀 Starting Personal Finance Tracker API...${NC}"
    echo -e "${GREEN}================================================${NC}"
    
    # Start the Node.js application
    exec node dist/server.js
}

# Signal handlers for graceful shutdown
cleanup() {
    echo -e "${YELLOW}🔄 Received shutdown signal, cleaning up...${NC}"
    # Kill any background processes if needed
    exit 0
}

trap cleanup SIGTERM SIGINT

# Main execution
main() {
    display_startup_info
    validate_environment
    setup_directories
    
    # Wait for services to be ready
    echo -e "${YELLOW}⏳ Waiting for dependent services...${NC}"
    /app/scripts/wait-for-services.sh
    
    # Run database operations
    run_migrations
    run_seeds
    
    # Start the application
    start_application
}

# Execute main function
main "$@"