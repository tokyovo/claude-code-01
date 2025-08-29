#!/bin/bash

# =================================
# Log Rotation Script
# Personal Finance Tracker - Log Management
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_RETENTION_DAYS=${LOG_RETENTION_DAYS:-30}
MAX_LOG_SIZE=${MAX_LOG_SIZE:-100M}
COMPRESS_LOGS=${COMPRESS_LOGS:-true}

# Log directories
APP_LOG_DIR="/app/logs"
NGINX_LOG_DIR="/nginx/logs"
POSTGRES_LOG_DIR="/var/lib/postgresql/data/logs"

echo -e "${BLUE}🔄 Personal Finance Tracker - Log Rotation${NC}"
echo -e "${BLUE}===========================================${NC}"

# Function to rotate application logs
rotate_app_logs() {
    echo -e "${YELLOW}🔄 Rotating application logs...${NC}"
    
    if [ -d "$APP_LOG_DIR" ]; then
        local log_count=0
        
        # Find and rotate logs older than retention period
        while IFS= read -r -d '' logfile; do
            if [ -f "$logfile" ]; then
                local file_size=$(stat -f%z "$logfile" 2>/dev/null || stat -c%s "$logfile" 2>/dev/null || echo "0")
                local file_age=$(find "$logfile" -mtime +${LOG_RETENTION_DAYS} | wc -l)
                
                # Check if file is too large
                if [ "$file_size" -gt $(echo "$MAX_LOG_SIZE" | sed 's/M/000000/') ]; then
                    echo -e "${YELLOW}📦 Rotating large log file: $(basename "$logfile") (${file_size} bytes)${NC}"
                    
                    # Create rotated filename
                    local rotated_name="${logfile}.$(date +%Y%m%d_%H%M%S)"
                    
                    # Move current log file
                    mv "$logfile" "$rotated_name"
                    
                    # Create new empty log file with same permissions
                    touch "$logfile"
                    chmod --reference="$rotated_name" "$logfile" || true
                    
                    # Compress if enabled
                    if [ "$COMPRESS_LOGS" = "true" ]; then
                        gzip "$rotated_name"
                        echo -e "${GREEN}✅ Compressed: $(basename "$rotated_name").gz${NC}"
                    fi
                    
                    log_count=$((log_count + 1))
                fi
                
                # Remove old log files
                if [ "$file_age" -gt 0 ]; then
                    echo -e "${YELLOW}🗑️  Removing old log file: $(basename "$logfile")${NC}"
                    rm -f "$logfile"
                    log_count=$((log_count + 1))
                fi
            fi
        done < <(find "$APP_LOG_DIR" -name "*.log" -type f -print0 2>/dev/null || true)
        
        # Remove old compressed logs
        find "$APP_LOG_DIR" -name "*.gz" -type f -mtime +${LOG_RETENTION_DAYS} -delete 2>/dev/null || true
        
        echo -e "${GREEN}✅ Application logs processed: ${log_count} files${NC}"
    else
        echo -e "${YELLOW}⚠️  Application log directory not found: ${APP_LOG_DIR}${NC}"
    fi
}

# Function to rotate nginx logs
rotate_nginx_logs() {
    echo -e "${YELLOW}🔄 Rotating Nginx logs...${NC}"
    
    if [ -d "$NGINX_LOG_DIR" ]; then
        local log_count=0
        
        # Rotate access and error logs
        for log_type in "access" "error"; do
            local log_file="${NGINX_LOG_DIR}/${log_type}.log"
            
            if [ -f "$log_file" ]; then
                local file_size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo "0")
                
                if [ "$file_size" -gt $(echo "$MAX_LOG_SIZE" | sed 's/M/000000/') ]; then
                    echo -e "${YELLOW}📦 Rotating Nginx ${log_type} log (${file_size} bytes)${NC}"
                    
                    # Create rotated filename
                    local rotated_name="${log_file}.$(date +%Y%m%d_%H%M%S)"
                    
                    # Copy and truncate (don't move to avoid breaking Nginx)
                    cp "$log_file" "$rotated_name"
                    > "$log_file"
                    
                    # Send USR1 signal to nginx to reopen log files (if running)
                    if pgrep nginx >/dev/null 2>&1; then
                        pkill -USR1 nginx || true
                    fi
                    
                    # Compress if enabled
                    if [ "$COMPRESS_LOGS" = "true" ]; then
                        gzip "$rotated_name"
                        echo -e "${GREEN}✅ Compressed: $(basename "$rotated_name").gz${NC}"
                    fi
                    
                    log_count=$((log_count + 1))
                fi
            fi
        done
        
        # Remove old compressed nginx logs
        find "$NGINX_LOG_DIR" -name "*.gz" -type f -mtime +${LOG_RETENTION_DAYS} -delete 2>/dev/null || true
        
        echo -e "${GREEN}✅ Nginx logs processed: ${log_count} files${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx log directory not found: ${NGINX_LOG_DIR}${NC}"
    fi
}

# Function to rotate PostgreSQL logs
rotate_postgres_logs() {
    echo -e "${YELLOW}🔄 Rotating PostgreSQL logs...${NC}"
    
    if [ -d "$POSTGRES_LOG_DIR" ]; then
        local log_count=0
        
        # Find and process PostgreSQL log files
        while IFS= read -r -d '' logfile; do
            if [ -f "$logfile" ]; then
                local file_age=$(find "$logfile" -mtime +${LOG_RETENTION_DAYS} | wc -l)
                
                if [ "$file_age" -gt 0 ]; then
                    echo -e "${YELLOW}🗑️  Removing old PostgreSQL log: $(basename "$logfile")${NC}"
                    rm -f "$logfile"
                    log_count=$((log_count + 1))
                fi
            fi
        done < <(find "$POSTGRES_LOG_DIR" -name "postgresql-*.log" -type f -print0 2>/dev/null || true)
        
        echo -e "${GREEN}✅ PostgreSQL logs processed: ${log_count} files${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL log directory not found: ${POSTGRES_LOG_DIR}${NC}"
    fi
}

# Function to compress old logs
compress_old_logs() {
    echo -e "${YELLOW}🗜️  Compressing old uncompressed logs...${NC}"
    
    local compressed_count=0
    
    # Find and compress old log files that aren't already compressed
    for log_dir in "$APP_LOG_DIR" "$NGINX_LOG_DIR"; do
        if [ -d "$log_dir" ]; then
            while IFS= read -r -d '' logfile; do
                if [ -f "$logfile" ]; then
                    # Check if file is older than 1 day and not already compressed
                    if find "$logfile" -mtime +1 -name "*.log.*" | grep -q .; then
                        echo -e "${YELLOW}🗜️  Compressing: $(basename "$logfile")${NC}"
                        gzip "$logfile"
                        compressed_count=$((compressed_count + 1))
                    fi
                fi
            done < <(find "$log_dir" -name "*.log.*" ! -name "*.gz" -type f -print0 2>/dev/null || true)
        fi
    done
    
    echo -e "${GREEN}✅ Compressed ${compressed_count} old log files${NC}"
}

# Function to display disk usage
display_disk_usage() {
    echo -e "${BLUE}💾 Disk Usage Summary${NC}"
    echo -e "${BLUE}=====================${NC}"
    
    for log_dir in "$APP_LOG_DIR" "$NGINX_LOG_DIR" "$POSTGRES_LOG_DIR"; do
        if [ -d "$log_dir" ]; then
            local usage=$(du -sh "$log_dir" 2>/dev/null | cut -f1)
            local file_count=$(find "$log_dir" -type f | wc -l)
            echo -e "   $(basename "$log_dir"): ${usage} (${file_count} files)"
        fi
    done
    
    echo ""
    echo -e "${BLUE}📊 Log File Types:${NC}"
    for log_dir in "$APP_LOG_DIR" "$NGINX_LOG_DIR"; do
        if [ -d "$log_dir" ]; then
            echo -e "${YELLOW}$(basename "$log_dir"):${NC}"
            find "$log_dir" -name "*.log*" -type f 2>/dev/null | sed 's/.*\.//' | sort | uniq -c | sed 's/^/   /' || true
        fi
    done
}

# Function to clean up temporary files
cleanup_temp_files() {
    echo -e "${YELLOW}🧹 Cleaning up temporary log files...${NC}"
    
    local temp_count=0
    
    # Remove temporary log files
    for log_dir in "$APP_LOG_DIR" "$NGINX_LOG_DIR"; do
        if [ -d "$log_dir" ]; then
            # Remove temp files older than 1 hour
            temp_count=$(find "$log_dir" -name "*.tmp" -o -name "*.temp" -mmin +60 -type f -delete -print | wc -l)
        fi
    done
    
    if [ "$temp_count" -gt 0 ]; then
        echo -e "${GREEN}✅ Cleaned up ${temp_count} temporary files${NC}"
    else
        echo -e "${GREEN}✅ No temporary files to clean up${NC}"
    fi
}

# Function to send log rotation notification
send_notification() {
    local summary=$1
    
    if [ -n "$LOG_ROTATION_WEBHOOK_URL" ]; then
        echo -e "${YELLOW}📧 Sending log rotation notification...${NC}"
        
        curl -X POST "$LOG_ROTATION_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Log Rotation Completed: ${summary}\"}" \
            >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Failed to send notification${NC}"
    fi
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    echo -e "${BLUE}🚀 Starting log rotation process...${NC}"
    echo -e "   Timestamp: $(date)"
    echo -e "   Retention: ${LOG_RETENTION_DAYS} days"
    echo -e "   Max size: ${MAX_LOG_SIZE}"
    echo -e "   Compression: ${COMPRESS_LOGS}"
    echo ""
    
    # Create log directories if they don't exist
    mkdir -p "$APP_LOG_DIR" || true
    
    # Execute log rotation steps
    rotate_app_logs
    rotate_nginx_logs
    rotate_postgres_logs
    
    # Compress old logs if enabled
    if [ "$COMPRESS_LOGS" = "true" ]; then
        compress_old_logs
    fi
    
    # Cleanup temporary files
    cleanup_temp_files
    
    # Display summary
    display_disk_usage
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo -e "${GREEN}🎉 Log rotation completed successfully!${NC}"
    echo -e "   Duration: ${duration} seconds"
    
    # Send notification
    send_notification "Completed in ${duration} seconds"
}

# Error handling
handle_error() {
    echo -e "${RED}❌ Log rotation failed at step: ${BASH_COMMAND}${NC}"
    exit 1
}

trap handle_error ERR

# Execute main function
main "$@"