#!/bin/bash

# =================================
# Production Migration Script
# Safely runs database migrations in production environment
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MIGRATION_TIMEOUT=${MIGRATION_TIMEOUT:-600}
BACKUP_BEFORE_MIGRATION=${BACKUP_BEFORE_MIGRATION:-true}
DRY_RUN=${DRY_RUN:-false}

echo -e "${BLUE}🗄️  Personal Finance Tracker - Production Migration${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to validate environment
validate_environment() {
    echo -e "${YELLOW}🔍 Validating environment...${NC}"
    
    # Check if we're in production
    if [ "$NODE_ENV" != "production" ]; then
        echo -e "${RED}❌ This script should only be run in production environment${NC}"
        echo -e "   Current NODE_ENV: ${NODE_ENV}"
        exit 1
    fi
    
    # Check required environment variables
    local required_vars=(
        "DB_HOST"
        "DB_PORT"
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
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
    
    # Check if knex is available
    if ! command -v knex >/dev/null 2>&1; then
        echo -e "${RED}❌ knex command not found${NC}"
        exit 1
    fi
    
    # Check if we're in the correct directory
    if [ ! -f "$PROJECT_ROOT/knexfile.js" ]; then
        echo -e "${RED}❌ knexfile.js not found in project root${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment validation passed${NC}"
}

# Function to check database connection
check_database_connection() {
    echo -e "${YELLOW}🔍 Testing database connection...${NC}"
    
    if ! PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        echo -e "${RED}❌ Cannot connect to database${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Database connection successful${NC}"
}

# Function to create pre-migration backup
create_pre_migration_backup() {
    if [ "$BACKUP_BEFORE_MIGRATION" = "true" ]; then
        echo -e "${YELLOW}📦 Creating pre-migration backup...${NC}"
        
        local backup_timestamp=$(date +"%Y%m%d_%H%M%S")
        local backup_file="pre_migration_backup_${backup_timestamp}.sql"
        local backup_path="/backups/${backup_file}"
        
        # Create backup directory if it doesn't exist
        mkdir -p "$(dirname "$backup_path")"
        
        if PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --verbose \
            --clean \
            --if-exists \
            --create \
            --format=plain \
            --encoding=UTF8 \
            --no-password > "$backup_path"; then
            
            # Compress the backup
            gzip "$backup_path"
            echo -e "${GREEN}✅ Pre-migration backup created: ${backup_file}.gz${NC}"
        else
            echo -e "${RED}❌ Failed to create pre-migration backup${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping pre-migration backup${NC}"
    fi
}

# Function to get current migration status
get_migration_status() {
    echo -e "${YELLOW}📋 Checking migration status...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Get current migration status
    echo -e "${BLUE}Current migrations:${NC}"
    knex migrate:status || {
        echo -e "${RED}❌ Failed to get migration status${NC}"
        exit 1
    }
    
    # Count pending migrations
    local pending_count=$(knex migrate:status | grep -c "Not run" || true)
    echo -e "${YELLOW}Pending migrations: ${pending_count}${NC}"
    
    if [ "$pending_count" -eq 0 ]; then
        echo -e "${GREEN}✅ No pending migrations${NC}"
        return 1
    fi
    
    return 0
}

# Function to perform dry run
perform_dry_run() {
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}🏃 Performing dry run...${NC}"
        
        cd "$PROJECT_ROOT"
        
        # This would show what migrations would run without actually running them
        echo -e "${BLUE}Migrations that would be executed:${NC}"
        knex migrate:list | grep "migration" || {
            echo -e "${GREEN}✅ No migrations to run${NC}"
            return 1
        }
        
        echo -e "${YELLOW}⚠️  This is a dry run - no actual migrations were executed${NC}"
        return 0
    fi
    
    return 0
}

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Set timeout for migration
    timeout "$MIGRATION_TIMEOUT" knex migrate:latest || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo -e "${RED}❌ Migration timed out after ${MIGRATION_TIMEOUT} seconds${NC}"
        else
            echo -e "${RED}❌ Migration failed with exit code: ${exit_code}${NC}"
        fi
        exit 1
    }
    
    echo -e "${GREEN}✅ Migrations completed successfully${NC}"
}

# Function to verify migration results
verify_migrations() {
    echo -e "${YELLOW}🔍 Verifying migration results...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check final migration status
    echo -e "${BLUE}Final migration status:${NC}"
    knex migrate:status
    
    # Verify no pending migrations remain
    local remaining_pending=$(knex migrate:status | grep -c "Not run" || true)
    
    if [ "$remaining_pending" -gt 0 ]; then
        echo -e "${RED}❌ ${remaining_pending} migrations still pending${NC}"
        exit 1
    fi
    
    # Test basic database connectivity
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is accessible after migration${NC}"
    else
        echo -e "${RED}❌ Database connectivity issues after migration${NC}"
        exit 1
    fi
    
    # Check table count
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo -e "${GREEN}✅ Tables in database: ${table_count}${NC}"
    
    echo -e "${GREEN}✅ Migration verification completed${NC}"
}

# Function to run post-migration tasks
run_post_migration_tasks() {
    echo -e "${YELLOW}⚙️  Running post-migration tasks...${NC}"
    
    # Update database statistics
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database statistics updated${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to update database statistics${NC}"
    fi
    
    # Vacuum database (optional)
    if [ "$RUN_VACUUM_AFTER_MIGRATION" = "true" ]; then
        echo -e "${YELLOW}🧹 Running database vacuum...${NC}"
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database vacuum completed${NC}"
        else
            echo -e "${YELLOW}⚠️  Database vacuum failed${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Post-migration tasks completed${NC}"
}

# Function to send migration notification
send_migration_notification() {
    local status=$1
    local details=$2
    
    if [ -n "$MIGRATION_WEBHOOK_URL" ]; then
        echo -e "${YELLOW}📧 Sending migration notification...${NC}"
        
        local message="Production Migration ${status}: ${details} (Database: ${DB_NAME})"
        
        curl -X POST "$MIGRATION_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"${message}\"}" \
            >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Failed to send notification${NC}"
    fi
}

# Function to display migration summary
display_summary() {
    local start_time=$1
    local end_time=$2
    local duration=$((end_time - start_time))
    
    echo ""
    echo -e "${BLUE}📊 Migration Summary${NC}"
    echo -e "${BLUE}===================${NC}"
    echo -e "   Database: ${DB_NAME}"
    echo -e "   Host: ${DB_HOST}:${DB_PORT}"
    echo -e "   Start time: $(date -d "@$start_time")"
    echo -e "   End time: $(date -d "@$end_time")"
    echo -e "   Duration: ${duration} seconds"
    echo -e "   Backup created: ${BACKUP_BEFORE_MIGRATION}"
    echo -e "   Status: ${GREEN}SUCCESS${NC}"
}

# Function for rollback (if needed)
rollback_migrations() {
    echo -e "${RED}🔄 Rolling back migrations...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # This would rollback the last migration batch
    knex migrate:rollback || {
        echo -e "${RED}❌ Rollback failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Rollback completed${NC}"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    echo -e "${BLUE}🚀 Starting production migration process...${NC}"
    echo -e "   Timestamp: $(date)"
    echo -e "   Environment: ${NODE_ENV}"
    echo -e "   Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo ""
    
    # Validate environment and prerequisites
    validate_environment
    check_database_connection
    
    # Check if migrations are needed
    if ! get_migration_status; then
        echo -e "${GREEN}🎉 No migrations needed - database is up to date${NC}"
        exit 0
    fi
    
    # Create backup before migration
    create_pre_migration_backup
    
    # Perform dry run if requested
    if [ "$DRY_RUN" = "true" ]; then
        perform_dry_run
        exit 0
    fi
    
    # Confirmation for production migration
    if [ "${AUTO_CONFIRM_MIGRATION}" != "true" ]; then
        echo ""
        echo -e "${RED}⚠️  WARNING: About to run migrations in PRODUCTION${NC}"
        echo -e "${RED}   Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
        echo ""
        
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
        
        if [ "$confirmation" != "yes" ]; then
            echo -e "${YELLOW}❌ Migration cancelled by user${NC}"
            exit 0
        fi
    fi
    
    # Run migrations
    run_migrations
    verify_migrations
    run_post_migration_tasks
    
    local end_time=$(date +%s)
    display_summary "$start_time" "$end_time"
    
    echo ""
    echo -e "${GREEN}🎉 Production migration completed successfully!${NC}"
    
    # Send success notification
    send_migration_notification "SUCCESS" "Migrations completed successfully"
}

# Trap for cleanup and error handling
cleanup_on_error() {
    echo -e "${RED}❌ Migration failed - performing cleanup...${NC}"
    send_migration_notification "FAILED" "Migration encountered an error"
}

trap cleanup_on_error ERR

# Execute main function
main "$@"