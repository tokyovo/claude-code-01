#!/bin/bash

# =================================
# Database Restore Script
# Restore Personal Finance Tracker PostgreSQL database from backup
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration from environment variables
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_DB=${POSTGRES_DB:-personal_finance_tracker}
POSTGRES_USER=${POSTGRES_USER:-postgres}
BACKUP_DIR="/backups"

# Command line arguments
BACKUP_FILE=""
FORCE_RESTORE=false
CONFIRM_RESTORE=false

# Usage function
show_usage() {
    echo -e "${BLUE}Personal Finance Tracker - Database Restore Script${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] BACKUP_FILE"
    echo ""
    echo "Options:"
    echo "  -f, --force       Force restore without confirmation (dangerous!)"
    echo "  -y, --yes         Confirm restore automatically"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 finance_tracker_backup_20240101_120000.sql.gz"
    echo "  $0 --force backup_file.sql"
    echo "  $0 --yes finance_tracker_backup_latest.sql.gz"
    echo ""
    echo "Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/finance_tracker_backup_*.sql* 2>/dev/null | tail -10 || echo "  No backups found"
    else
        echo "  Backup directory not found: $BACKUP_DIR"
    fi
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--force)
                FORCE_RESTORE=true
                shift
                ;;
            -y|--yes)
                CONFIRM_RESTORE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_usage
                exit 1
                ;;
            *)
                if [ -z "$BACKUP_FILE" ]; then
                    BACKUP_FILE="$1"
                else
                    echo -e "${RED}❌ Multiple backup files specified${NC}"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
}

# Function to validate backup file
validate_backup_file() {
    echo -e "${YELLOW}🔍 Validating backup file...${NC}"
    
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ No backup file specified${NC}"
        show_usage
        exit 1
    fi
    
    # Check if file path is absolute or relative
    if [[ "$BACKUP_FILE" != /* ]]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Backup file not found: ${BACKUP_FILE}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Backup file found: ${BACKUP_FILE}${NC}"
    echo -e "   File size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo -e "   Modified: $(date -r "$BACKUP_FILE")"
}

# Function to check database connection
check_database_connection() {
    echo -e "${YELLOW}🔍 Checking database connection...${NC}"
    
    if ! PGPASSWORD="$PGPASSWORD" pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "postgres" >/dev/null 2>&1; then
        echo -e "${RED}❌ Cannot connect to PostgreSQL server ${POSTGRES_HOST}:${POSTGRES_PORT}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Database connection successful${NC}"
}

# Function to check if target database exists
check_target_database() {
    echo -e "${YELLOW}🔍 Checking target database...${NC}"
    
    if PGPASSWORD="$PGPASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "postgres" -tAc "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'" | grep -q 1; then
        echo -e "${YELLOW}⚠️  Target database '${POSTGRES_DB}' already exists${NC}"
        return 0
    else
        echo -e "${YELLOW}ℹ️  Target database '${POSTGRES_DB}' does not exist${NC}"
        return 1
    fi
}

# Function to backup existing database before restore
backup_existing_database() {
    echo -e "${YELLOW}📦 Creating backup of existing database...${NC}"
    
    EXISTING_BACKUP_FILE="${BACKUP_DIR}/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --encoding=UTF8 \
        --no-password > "$EXISTING_BACKUP_FILE"; then
        
        echo -e "${GREEN}✅ Existing database backed up to: ${EXISTING_BACKUP_FILE}${NC}"
        
        # Compress the backup
        if gzip "$EXISTING_BACKUP_FILE"; then
            echo -e "${GREEN}✅ Backup compressed${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to backup existing database${NC}"
        if [ "$FORCE_RESTORE" != "true" ]; then
            exit 1
        else
            echo -e "${YELLOW}⚠️  Continuing with force restore...${NC}"
        fi
    fi
}

# Function to confirm restore operation
confirm_restore_operation() {
    if [ "$CONFIRM_RESTORE" = "true" ] || [ "$FORCE_RESTORE" = "true" ]; then
        return 0
    fi
    
    echo ""
    echo -e "${RED}⚠️  WARNING: This operation will replace the current database!${NC}"
    echo -e "${RED}   Database: ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}${NC}"
    echo -e "${RED}   Backup file: ${BACKUP_FILE}${NC}"
    echo ""
    echo -e "${YELLOW}This action cannot be undone!${NC}"
    echo ""
    
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo -e "${YELLOW}❌ Restore cancelled by user${NC}"
        exit 0
    fi
    
    echo -e "${GREEN}✅ Restore confirmed${NC}"
}

# Function to decompress backup file if needed
prepare_backup_file() {
    echo -e "${YELLOW}📋 Preparing backup file...${NC}"
    
    TEMP_BACKUP_FILE=""
    
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        echo -e "${YELLOW}🗜️  Decompressing backup file...${NC}"
        
        TEMP_BACKUP_FILE="/tmp/restore_$(basename "$BACKUP_FILE" .gz)"
        
        if gzip -dc "$BACKUP_FILE" > "$TEMP_BACKUP_FILE"; then
            echo -e "${GREEN}✅ Backup file decompressed${NC}"
            BACKUP_FILE="$TEMP_BACKUP_FILE"
        else
            echo -e "${RED}❌ Failed to decompress backup file${NC}"
            exit 1
        fi
    fi
    
    # Verify SQL file content
    if head -n 10 "$BACKUP_FILE" | grep -q "PostgreSQL database dump" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backup file format verified${NC}"
    else
        echo -e "${RED}❌ Invalid backup file format${NC}"
        exit 1
    fi
}

# Function to restore database
restore_database() {
    echo -e "${YELLOW}🔄 Restoring database...${NC}"
    echo -e "   Source: ${BACKUP_FILE}"
    echo -e "   Target: ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
    
    # Restore database using psql
    if PGPASSWORD="$PGPASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "postgres" \
        --quiet \
        -f "$BACKUP_FILE"; then
        
        echo -e "${GREEN}✅ Database restored successfully${NC}"
    else
        echo -e "${RED}❌ Database restore failed${NC}"
        exit 1
    fi
}

# Function to verify restore
verify_restore() {
    echo -e "${YELLOW}🔍 Verifying restore...${NC}"
    
    # Check if database exists and is accessible
    if PGPASSWORD="$PGPASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is accessible${NC}"
    else
        echo -e "${RED}❌ Database is not accessible after restore${NC}"
        exit 1
    fi
    
    # Check table count
    TABLE_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo -e "${GREEN}✅ Tables restored: ${TABLE_COUNT}${NC}"
    
    # Check if migration table exists (if using migrations)
    if PGPASSWORD="$PGPASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name = 'knex_migrations';" | grep -q 1; then
        MIGRATION_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM knex_migrations;")
        echo -e "${GREEN}✅ Migration records: ${MIGRATION_COUNT}${NC}"
    fi
}

# Function to cleanup temporary files
cleanup_temp_files() {
    if [ -n "$TEMP_BACKUP_FILE" ] && [ -f "$TEMP_BACKUP_FILE" ]; then
        echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
        rm -f "$TEMP_BACKUP_FILE"
        echo -e "${GREEN}✅ Temporary files cleaned up${NC}"
    fi
}

# Function to display restore summary
display_summary() {
    echo ""
    echo -e "${BLUE}📊 Restore Summary${NC}"
    echo -e "${BLUE}==================${NC}"
    echo -e "   Backup file: $(basename "$BACKUP_FILE")"
    echo -e "   Target database: ${POSTGRES_DB}"
    echo -e "   Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
    echo -e "   Timestamp: $(date)"
    echo -e "   Status: ${GREEN}SUCCESS${NC}"
}

# Main execution function
main() {
    echo -e "${BLUE}🚀 Personal Finance Tracker - Database Restore${NC}"
    echo -e "${BLUE}===============================================${NC}"
    echo ""
    
    # Check prerequisites
    if [ -z "$PGPASSWORD" ]; then
        echo -e "${RED}❌ PGPASSWORD environment variable not set${NC}"
        exit 1
    fi
    
    if ! command -v psql >/dev/null 2>&1; then
        echo -e "${RED}❌ psql command not found${NC}"
        exit 1
    fi
    
    if ! command -v pg_dump >/dev/null 2>&1; then
        echo -e "${RED}❌ pg_dump command not found${NC}"
        exit 1
    fi
    
    # Execute restore process
    validate_backup_file
    check_database_connection
    
    # Check if target database exists and backup if needed
    if check_target_database; then
        backup_existing_database
    fi
    
    confirm_restore_operation
    prepare_backup_file
    restore_database
    verify_restore
    cleanup_temp_files
    display_summary
    
    echo ""
    echo -e "${GREEN}🎉 Database restore completed successfully!${NC}"
}

# Trap for cleanup on exit
trap cleanup_temp_files EXIT

# Parse command line arguments and execute
parse_arguments "$@"
main