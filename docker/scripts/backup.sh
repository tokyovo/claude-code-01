#!/bin/bash

# =================================
# Database Backup Script
# Automated backup for Personal Finance Tracker PostgreSQL database
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
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
BACKUP_DIR="/backups"
BACKUP_COMPRESSION=${BACKUP_COMPRESSION:-true}

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="finance_tracker_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🗄️  Personal Finance Tracker - Database Backup${NC}"
echo -e "${BLUE}=============================================${NC}"

# Function to check if database is accessible
check_database_connection() {
    echo -e "${YELLOW}🔍 Checking database connection...${NC}"
    
    if ! PGPASSWORD="$PGPASSWORD" pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        echo -e "${RED}❌ Cannot connect to database ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Database connection successful${NC}"
}

# Function to create database backup
create_backup() {
    echo -e "${YELLOW}📦 Creating database backup...${NC}"
    echo -e "   Database: ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
    echo -e "   User: ${POSTGRES_USER}"
    echo -e "   Backup file: ${BACKUP_FILENAME}"
    
    # Create the backup using pg_dump
    if PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --encoding=UTF8 \
        --no-password > "$BACKUP_PATH"; then
        
        echo -e "${GREEN}✅ Database backup created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create database backup${NC}"
        exit 1
    fi
}

# Function to compress backup if enabled
compress_backup() {
    if [ "$BACKUP_COMPRESSION" = "true" ]; then
        echo -e "${YELLOW}🗜️  Compressing backup file...${NC}"
        
        if gzip "$BACKUP_PATH"; then
            BACKUP_PATH="${BACKUP_PATH}.gz"
            BACKUP_FILENAME="${BACKUP_FILENAME}.gz"
            echo -e "${GREEN}✅ Backup compressed successfully${NC}"
        else
            echo -e "${RED}❌ Failed to compress backup${NC}"
            exit 1
        fi
    fi
}

# Function to verify backup integrity
verify_backup() {
    echo -e "${YELLOW}🔍 Verifying backup integrity...${NC}"
    
    if [ "$BACKUP_COMPRESSION" = "true" ]; then
        # Verify compressed file
        if gzip -t "$BACKUP_PATH" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Compressed backup integrity verified${NC}"
        else
            echo -e "${RED}❌ Backup integrity check failed${NC}"
            exit 1
        fi
    else
        # Verify SQL file
        if [ -f "$BACKUP_PATH" ] && [ -s "$BACKUP_PATH" ]; then
            # Check if file contains SQL content
            if head -n 10 "$BACKUP_PATH" | grep -q "PostgreSQL database dump" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Backup integrity verified${NC}"
            else
                echo -e "${RED}❌ Backup file doesn't contain valid SQL dump${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Backup file is empty or doesn't exist${NC}"
            exit 1
        fi
    fi
}

# Function to clean up old backups
cleanup_old_backups() {
    echo -e "${YELLOW}🧹 Cleaning up old backups (retention: ${BACKUP_RETENTION_DAYS} days)...${NC}"
    
    # Count current backups
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "finance_tracker_backup_*.sql*" -type f | wc -l)
    echo -e "   Current backups: ${BACKUP_COUNT}"
    
    # Remove backups older than retention period
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "finance_tracker_backup_*.sql*" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete -print | wc -l)
    
    if [ "$DELETED_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Deleted ${DELETED_COUNT} old backup(s)${NC}"
    else
        echo -e "${GREEN}✅ No old backups to clean up${NC}"
    fi
    
    # Show remaining backups
    REMAINING_COUNT=$(find "$BACKUP_DIR" -name "finance_tracker_backup_*.sql*" -type f | wc -l)
    echo -e "   Remaining backups: ${REMAINING_COUNT}"
}

# Function to upload backup to cloud (if configured)
upload_to_cloud() {
    if [ -n "$BACKUP_CLOUD_PROVIDER" ] && [ -n "$BACKUP_CLOUD_BUCKET" ]; then
        echo -e "${YELLOW}☁️  Uploading backup to cloud storage...${NC}"
        
        case "$BACKUP_CLOUD_PROVIDER" in
            "aws"|"s3")
                if command -v aws >/dev/null 2>&1; then
                    if aws s3 cp "$BACKUP_PATH" "s3://${BACKUP_CLOUD_BUCKET}/database-backups/${BACKUP_FILENAME}"; then
                        echo -e "${GREEN}✅ Backup uploaded to AWS S3 successfully${NC}"
                    else
                        echo -e "${RED}❌ Failed to upload backup to AWS S3${NC}"
                        # Don't exit here - local backup still exists
                    fi
                else
                    echo -e "${YELLOW}⚠️  AWS CLI not installed, skipping cloud upload${NC}"
                fi
                ;;
            "gcp"|"gcs")
                if command -v gsutil >/dev/null 2>&1; then
                    if gsutil cp "$BACKUP_PATH" "gs://${BACKUP_CLOUD_BUCKET}/database-backups/${BACKUP_FILENAME}"; then
                        echo -e "${GREEN}✅ Backup uploaded to Google Cloud Storage successfully${NC}"
                    else
                        echo -e "${RED}❌ Failed to upload backup to Google Cloud Storage${NC}"
                    fi
                else
                    echo -e "${YELLOW}⚠️  Google Cloud SDK not installed, skipping cloud upload${NC}"
                fi
                ;;
            *)
                echo -e "${YELLOW}⚠️  Unknown cloud provider: ${BACKUP_CLOUD_PROVIDER}${NC}"
                ;;
        esac
    else
        echo -e "${YELLOW}⏭️  Cloud storage not configured, keeping local backup only${NC}"
    fi
}

# Function to send notification (if configured)
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$NOTIFICATION_WEBHOOK_URL" ]; then
        echo -e "${YELLOW}📧 Sending backup notification...${NC}"
        
        # Send webhook notification (example for Slack/Discord)
        curl -X POST "$NOTIFICATION_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Database Backup ${status}: ${message}\"}" \
            >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Failed to send notification${NC}"
    fi
}

# Function to display backup summary
display_summary() {
    echo -e "${BLUE}📊 Backup Summary${NC}"
    echo -e "${BLUE}================${NC}"
    echo -e "   Backup file: ${BACKUP_FILENAME}"
    echo -e "   Backup path: ${BACKUP_PATH}"
    echo -e "   File size: $(du -h "$BACKUP_PATH" | cut -f1)"
    echo -e "   Timestamp: $(date)"
    echo -e "   Database: ${POSTGRES_DB}"
    echo -e "   Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
    echo -e "   Compression: ${BACKUP_COMPRESSION}"
    echo -e "   Retention: ${BACKUP_RETENTION_DAYS} days"
}

# Main execution function
main() {
    echo -e "${BLUE}🚀 Starting backup process...${NC}"
    echo -e "   Timestamp: $(date)"
    echo ""
    
    # Check prerequisites
    if [ -z "$PGPASSWORD" ]; then
        echo -e "${RED}❌ PGPASSWORD environment variable not set${NC}"
        exit 1
    fi
    
    if ! command -v pg_dump >/dev/null 2>&1; then
        echo -e "${RED}❌ pg_dump command not found${NC}"
        exit 1
    fi
    
    # Execute backup process
    check_database_connection
    create_backup
    compress_backup
    verify_backup
    cleanup_old_backups
    upload_to_cloud
    display_summary
    
    echo ""
    echo -e "${GREEN}🎉 Backup process completed successfully!${NC}"
    
    # Send success notification
    send_notification "SUCCESS" "Database backup completed successfully at $(date)"
}

# Trap for cleanup on exit
cleanup_on_exit() {
    echo -e "${YELLOW}🔄 Cleaning up temporary files...${NC}"
    # Add any cleanup logic here if needed
}

trap cleanup_on_exit EXIT

# Execute main function
main "$@"