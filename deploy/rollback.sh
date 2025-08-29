#!/bin/bash

# =================================
# Personal Finance Tracker - Rollback Script
# Quick rollback to previous deployment version
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
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default values
ENVIRONMENT=""
TARGET_VERSION=""
AUTO_CONFIRM=false
RESTORE_DATABASE=false

# Usage function
show_usage() {
    echo -e "${BLUE}Personal Finance Tracker - Rollback Script${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] ENVIRONMENT [VERSION]"
    echo ""
    echo "Environments:"
    echo "  staging      Rollback staging environment"
    echo "  production   Rollback production environment"
    echo ""
    echo "Options:"
    echo "  -v, --version VERSION    Specific version to rollback to"
    echo "  --restore-db            Restore database from backup (dangerous!)"
    echo "  -y, --yes               Auto-confirm rollback"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production --version v1.2.2"
    echo "  $0 staging --restore-db --yes"
    echo ""
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--version)
                TARGET_VERSION="$2"
                shift 2
                ;;
            --restore-db)
                RESTORE_DATABASE=true
                shift
                ;;
            -y|--yes)
                AUTO_CONFIRM=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            staging|production)
                if [ -n "$ENVIRONMENT" ]; then
                    echo -e "${RED}❌ Multiple environments specified${NC}"
                    exit 1
                fi
                ENVIRONMENT="$1"
                shift
                ;;
            *)
                if [ -z "$TARGET_VERSION" ] && [ -n "$ENVIRONMENT" ]; then
                    TARGET_VERSION="$1"
                    shift
                else
                    echo -e "${RED}❌ Unknown option: $1${NC}"
                    show_usage
                    exit 1
                fi
                ;;
        esac
    done
    
    if [ -z "$ENVIRONMENT" ]; then
        echo -e "${RED}❌ Environment not specified${NC}"
        show_usage
        exit 1
    fi
}

# Function to list available versions
list_available_versions() {
    echo -e "${YELLOW}📋 Available Docker images for rollback:${NC}"
    
    # List available Docker images
    docker images finance-tracker-api --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -10
    
    echo ""
    echo -e "${YELLOW}📋 Available database backups:${NC}"
    
    # List available backups
    if [ -d "/backups" ]; then
        ls -la /backups/finance_tracker_backup_*.sql* 2>/dev/null | tail -10 || echo "  No backups found"
    else
        echo "  Backup directory not accessible"
    fi
}

# Function to determine previous version
determine_rollback_version() {
    if [ -n "$TARGET_VERSION" ]; then
        echo -e "${YELLOW}🎯 Using specified version: ${TARGET_VERSION}${NC}"
        return
    fi
    
    echo -e "${YELLOW}🔍 Determining previous version...${NC}"
    
    # Get the second most recent image (first is current, second is previous)
    TARGET_VERSION=$(docker images finance-tracker-api --format "{{.Tag}}" | grep -v "latest" | sed -n '2p')
    
    if [ -z "$TARGET_VERSION" ]; then
        echo -e "${RED}❌ No previous version found${NC}"
        echo -e "${YELLOW}Available versions:${NC}"
        docker images finance-tracker-api --format "{{.Tag}}" | head -5
        exit 1
    fi
    
    echo -e "${GREEN}✅ Previous version identified: ${TARGET_VERSION}${NC}"
}

# Function to validate rollback version
validate_rollback_version() {
    echo -e "${YELLOW}🔍 Validating rollback version...${NC}"
    
    # Check if the target version image exists
    if ! docker images finance-tracker-api:${TARGET_VERSION} --format "{{.Tag}}" | grep -q "^${TARGET_VERSION}$"; then
        echo -e "${RED}❌ Target version not found: ${TARGET_VERSION}${NC}"
        echo -e "${YELLOW}Available versions:${NC}"
        docker images finance-tracker-api --format "{{.Tag}}" | head -5
        exit 1
    fi
    
    echo -e "${GREEN}✅ Target version validated: ${TARGET_VERSION}${NC}"
}

# Function to backup current state before rollback
backup_current_state() {
    echo -e "${YELLOW}📦 Creating backup of current state...${NC}"
    
    cd "$PROJECT_ROOT"
    
    local docker_compose_file=""
    if [ "$ENVIRONMENT" = "production" ]; then
        docker_compose_file="docker-compose.prod.yml"
    else
        docker_compose_file="docker-compose.yml"
    fi
    
    # Create database backup before rollback
    echo -e "${YELLOW}🗄️  Creating database backup...${NC}"
    docker-compose -f "$docker_compose_file" run --rm db-backup || {
        echo -e "${RED}❌ Failed to backup current database${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Current state backed up${NC}"
}

# Function to stop current services
stop_current_services() {
    echo -e "${YELLOW}🛑 Stopping current services...${NC}"
    
    cd "$PROJECT_ROOT"
    
    local docker_compose_file=""
    local env_file=""
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker_compose_file="docker-compose.prod.yml"
        env_file=".env.production"
    else
        docker_compose_file="docker-compose.yml"
        env_file=".env.staging"
    fi
    
    # Stop all services
    docker-compose -f "$docker_compose_file" --env-file "$env_file" down || true
    
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to restore database from backup
restore_database_backup() {
    if [ "$RESTORE_DATABASE" != "true" ]; then
        echo -e "${YELLOW}⏭️  Skipping database restore${NC}"
        return
    fi
    
    echo -e "${YELLOW}🗄️  Restoring database from backup...${NC}"
    
    # Find the most recent backup
    local backup_file=$(ls -t /backups/finance_tracker_backup_*.sql* 2>/dev/null | head -1)
    
    if [ -z "$backup_file" ]; then
        echo -e "${RED}❌ No backup files found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}📂 Using backup: $(basename "$backup_file")${NC}"
    
    # Start database service only
    cd "$PROJECT_ROOT"
    local docker_compose_file=""
    local env_file=""
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker_compose_file="docker-compose.prod.yml"
        env_file=".env.production"
    else
        docker_compose_file="docker-compose.yml"
        env_file=".env.staging"
    fi
    
    # Start postgres service
    docker-compose -f "$docker_compose_file" --env-file "$env_file" up -d postgres
    
    # Wait for database to be ready
    sleep 10
    
    # Run restore script
    docker-compose -f "$docker_compose_file" --env-file "$env_file" run --rm -e BACKUP_FILE="$(basename "$backup_file")" db-restore || {
        echo -e "${RED}❌ Database restore failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Database restored from backup${NC}"
}

# Function to deploy rollback version
deploy_rollback_version() {
    echo -e "${YELLOW}🔄 Deploying rollback version: ${TARGET_VERSION}${NC}"
    
    cd "$PROJECT_ROOT"
    
    local docker_compose_file=""
    local env_file=""
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker_compose_file="docker-compose.prod.yml"
        env_file=".env.production"
    else
        docker_compose_file="docker-compose.yml"
        env_file=".env.staging"
    fi
    
    # Deploy with target version
    VERSION="$TARGET_VERSION" \
    docker-compose -f "$docker_compose_file" --env-file "$env_file" up -d
    
    echo -e "${GREEN}✅ Rollback version deployed${NC}"
}

# Function to run health checks
run_health_checks() {
    echo -e "${YELLOW}🏥 Running health checks...${NC}"
    
    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:3000/api/v1/health"
    
    echo -e "${YELLOW}⏳ Waiting for application to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "$health_url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏱️  Health check attempt $attempt/$max_attempts...${NC}"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Health checks failed after rollback${NC}"
    exit 1
}

# Function to verify rollback
verify_rollback() {
    echo -e "${YELLOW}🔍 Verifying rollback...${NC}"
    
    # Check running containers
    local running_containers=$(docker ps --filter "name=finance_tracker" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}")
    echo -e "${BLUE}Running containers:${NC}"
    echo "$running_containers"
    echo ""
    
    # Verify version through API
    local api_response=$(curl -s "http://localhost:3000/api/v1/health" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    echo -e "${BLUE}API Version: ${api_response}${NC}"
    
    # Basic smoke test
    if curl -f "http://localhost:3000/api/v1/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Basic functionality verified${NC}"
    else
        echo -e "${RED}❌ Basic functionality check failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Rollback verification completed${NC}"
}

# Function to confirm rollback
confirm_rollback() {
    if [ "$AUTO_CONFIRM" = "true" ]; then
        return 0
    fi
    
    echo ""
    echo -e "${YELLOW}📋 Rollback Configuration:${NC}"
    echo -e "   Environment: ${ENVIRONMENT}"
    echo -e "   Target Version: ${TARGET_VERSION}"
    echo -e "   Restore Database: ${RESTORE_DATABASE}"
    echo ""
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${RED}⚠️  WARNING: This will rollback PRODUCTION${NC}"
        echo ""
    fi
    
    if [ "$RESTORE_DATABASE" = "true" ]; then
        echo -e "${RED}⚠️  WARNING: Database will be restored from backup${NC}"
        echo -e "${RED}   This will lose any data changes since the backup${NC}"
        echo ""
    fi
    
    read -p "Do you want to continue with the rollback? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo -e "${YELLOW}❌ Rollback cancelled by user${NC}"
        exit 0
    fi
}

# Function to send rollback notification
send_rollback_notification() {
    local status=$1
    local details=$2
    
    if [ -n "$DEPLOYMENT_WEBHOOK_URL" ]; then
        echo -e "${YELLOW}📧 Sending rollback notification...${NC}"
        
        local message="Rollback ${status}: ${ENVIRONMENT} environment to version ${TARGET_VERSION} - ${details}"
        
        curl -X POST "$DEPLOYMENT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"${message}\"}" \
            >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Failed to send notification${NC}"
    fi
}

# Function to display rollback summary
display_summary() {
    local start_time=$1
    local end_time=$2
    local duration=$((end_time - start_time))
    
    echo ""
    echo -e "${BLUE}📊 Rollback Summary${NC}"
    echo -e "${BLUE}===================${NC}"
    echo -e "   Environment: ${ENVIRONMENT}"
    echo -e "   Target Version: ${TARGET_VERSION}"
    echo -e "   Database Restored: ${RESTORE_DATABASE}"
    echo -e "   Start time: $(date -d "@$start_time")"
    echo -e "   End time: $(date -d "@$end_time")"
    echo -e "   Duration: ${duration} seconds"
    echo -e "   Status: ${GREEN}SUCCESS${NC}"
    echo ""
    echo -e "${GREEN}🎉 Rollback completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}📝 Next steps:${NC}"
    echo -e "   1. Verify application functionality"
    echo -e "   2. Check logs for any issues"
    echo -e "   3. Notify stakeholders of rollback"
    echo -e "   4. Investigate and fix issues in the rolled-back version"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    echo -e "${BLUE}🔄 Personal Finance Tracker - Rollback${NC}"
    echo -e "${BLUE}=======================================${NC}"
    echo -e "   Environment: ${ENVIRONMENT}"
    echo -e "   Timestamp: $(date)"
    echo ""
    
    # Show available versions
    list_available_versions
    echo ""
    
    # Determine rollback version
    determine_rollback_version
    validate_rollback_version
    
    # Confirm rollback
    confirm_rollback
    
    # Execute rollback steps
    backup_current_state
    stop_current_services
    restore_database_backup
    deploy_rollback_version
    run_health_checks
    verify_rollback
    
    local end_time=$(date +%s)
    display_summary "$start_time" "$end_time"
    
    # Send success notification
    send_rollback_notification "SUCCESS" "Rollback completed successfully"
}

# Error handling
handle_error() {
    echo -e "${RED}❌ Rollback failed at step: ${BASH_COMMAND}${NC}"
    send_rollback_notification "FAILED" "Rollback encountered an error"
    
    echo ""
    echo -e "${YELLOW}🛠️  Troubleshooting steps:${NC}"
    echo -e "   1. Check Docker logs: docker-compose logs -f"
    echo -e "   2. Check service status: docker-compose ps"
    echo -e "   3. Verify database connectivity"
    echo -e "   4. Check available disk space"
    echo -e "   5. Review application logs"
    
    exit 1
}

trap handle_error ERR

# Parse arguments and execute
parse_arguments "$@"
main