#!/bin/bash

# =================================
# Personal Finance Tracker - Deployment Script
# Automated deployment for production and staging environments
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
BRANCH=""
BUILD_VERSION=""
SKIP_TESTS=false
SKIP_BACKUP=false
DRY_RUN=false
AUTO_CONFIRM=false

# Usage function
show_usage() {
    echo -e "${BLUE}Personal Finance Tracker - Deployment Script${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] ENVIRONMENT"
    echo ""
    echo "Environments:"
    echo "  staging      Deploy to staging environment"
    echo "  production   Deploy to production environment"
    echo ""
    echo "Options:"
    echo "  -b, --branch BRANCH      Git branch to deploy (default: main for prod, develop for staging)"
    echo "  -v, --version VERSION    Build version/tag"
    echo "  --skip-tests            Skip running tests before deployment"
    echo "  --skip-backup           Skip database backup (not recommended for production)"
    echo "  --dry-run               Show what would be done without executing"
    echo "  -y, --yes               Auto-confirm deployment"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production --branch main --version v1.2.3"
    echo "  $0 staging --skip-tests --yes"
    echo ""
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -v|--version)
                BUILD_VERSION="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
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
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done
    
    if [ -z "$ENVIRONMENT" ]; then
        echo -e "${RED}❌ Environment not specified${NC}"
        show_usage
        exit 1
    fi
    
    # Set default branch if not specified
    if [ -z "$BRANCH" ]; then
        if [ "$ENVIRONMENT" = "production" ]; then
            BRANCH="main"
        else
            BRANCH="develop"
        fi
    fi
    
    # Set default version if not specified
    if [ -z "$BUILD_VERSION" ]; then
        BUILD_VERSION=$(date +"%Y%m%d-%H%M%S")
    fi
}

# Function to validate prerequisites
validate_prerequisites() {
    echo -e "${YELLOW}🔍 Validating prerequisites...${NC}"
    
    # Check required commands
    local required_commands=("git" "docker" "docker-compose" "npm")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            echo -e "${RED}❌ Required command not found: $cmd${NC}"
            exit 1
        fi
    done
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        echo -e "${RED}❌ package.json not found in project root${NC}"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites validated${NC}"
}

# Function to validate Git repository
validate_git_repository() {
    echo -e "${YELLOW}🔍 Validating Git repository...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check if we're in a Git repository
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo -e "${RED}❌ Not in a Git repository${NC}"
        exit 1
    fi
    
    # Check for uncommitted changes
    if [ "$(git status --porcelain)" ]; then
        echo -e "${RED}❌ Uncommitted changes detected${NC}"
        echo -e "${YELLOW}Please commit or stash your changes before deployment${NC}"
        git status --short
        exit 1
    fi
    
    # Fetch latest changes
    echo -e "${YELLOW}📡 Fetching latest changes...${NC}"
    git fetch origin
    
    # Check if branch exists
    if ! git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
        echo -e "${RED}❌ Branch '$BRANCH' does not exist on remote${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Git repository validated${NC}"
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        echo -e "${YELLOW}⏭️  Skipping tests${NC}"
        return
    fi
    
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm ci
    fi
    
    # Run linting
    echo -e "${YELLOW}🔍 Running linting...${NC}"
    npm run lint || {
        echo -e "${RED}❌ Linting failed${NC}"
        exit 1
    }
    
    # Run tests
    echo -e "${YELLOW}🧪 Running unit tests...${NC}"
    npm run test:ci || {
        echo -e "${RED}❌ Tests failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Function to build application
build_application() {
    echo -e "${YELLOW}🏗️  Building application...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    if [ -d "dist" ]; then
        rm -rf dist
    fi
    
    # Build TypeScript
    echo -e "${YELLOW}📦 Compiling TypeScript...${NC}"
    npm run build || {
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Application built successfully${NC}"
}

# Function to build Docker images
build_docker_images() {
    echo -e "${YELLOW}🐳 Building Docker images...${NC}"
    
    cd "$PROJECT_ROOT"
    
    local docker_compose_file=""
    if [ "$ENVIRONMENT" = "production" ]; then
        docker_compose_file="docker-compose.prod.yml"
    else
        docker_compose_file="docker-compose.yml"
    fi
    
    # Build images
    BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    VERSION="$BUILD_VERSION" \
    docker-compose -f "$docker_compose_file" build --no-cache app || {
        echo -e "${RED}❌ Docker build failed${NC}"
        exit 1
    }
    
    # Tag image with version
    local image_name="finance-tracker-api:${BUILD_VERSION}"
    docker tag "finance-tracker-api:latest" "$image_name"
    
    echo -e "${GREEN}✅ Docker images built successfully${NC}"
}

# Function to backup database
backup_database() {
    if [ "$SKIP_BACKUP" = "true" ]; then
        echo -e "${YELLOW}⏭️  Skipping database backup${NC}"
        return
    fi
    
    echo -e "${YELLOW}📦 Creating database backup...${NC}"
    
    cd "$PROJECT_ROOT"
    
    local docker_compose_file=""
    if [ "$ENVIRONMENT" = "production" ]; then
        docker_compose_file="docker-compose.prod.yml"
    else
        docker_compose_file="docker-compose.yml"
    fi
    
    # Run backup script through docker-compose
    docker-compose -f "$docker_compose_file" run --rm db-backup || {
        echo -e "${RED}❌ Database backup failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Database backup completed${NC}"
}

# Function to deploy application
deploy_application() {
    echo -e "${YELLOW}🚀 Deploying application...${NC}"
    
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
    
    # Check if environment file exists
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}❌ Environment file not found: $env_file${NC}"
        exit 1
    fi
    
    # Stop existing containers
    echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
    docker-compose -f "$docker_compose_file" --env-file "$env_file" down || true
    
    # Start services with new images
    echo -e "${YELLOW}🔄 Starting services...${NC}"
    BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    VERSION="$BUILD_VERSION" \
    docker-compose -f "$docker_compose_file" --env-file "$env_file" up -d
    
    echo -e "${GREEN}✅ Application deployed successfully${NC}"
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
    
    echo -e "${RED}❌ Health checks failed${NC}"
    exit 1
}

# Function to run smoke tests
run_smoke_tests() {
    echo -e "${YELLOW}💨 Running smoke tests...${NC}"
    
    local base_url="http://localhost:3000"
    
    # Test basic endpoints
    local endpoints=(
        "/api/v1/health"
        "/api/v1"
    )
    
    for endpoint in "${endpoints[@]}"; do
        echo -e "${YELLOW}🧪 Testing ${endpoint}...${NC}"
        
        if curl -f "${base_url}${endpoint}" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ ${endpoint} OK${NC}"
        else
            echo -e "${RED}❌ ${endpoint} FAILED${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Smoke tests passed${NC}"
}

# Function to cleanup old images
cleanup_old_images() {
    echo -e "${YELLOW}🧹 Cleaning up old Docker images...${NC}"
    
    # Remove unused images (keep last 3 versions)
    docker image prune -f || true
    
    # Remove old application images (keep last 3)
    local old_images=$(docker images finance-tracker-api --format "table {{.Tag}}" | tail -n +2 | tail -n +4)
    if [ -n "$old_images" ]; then
        echo "$old_images" | xargs -I {} docker rmi "finance-tracker-api:{}" || true
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to send deployment notification
send_deployment_notification() {
    local status=$1
    local details=$2
    
    if [ -n "$DEPLOYMENT_WEBHOOK_URL" ]; then
        echo -e "${YELLOW}📧 Sending deployment notification...${NC}"
        
        local message="Deployment ${status}: ${ENVIRONMENT} environment - ${details} (Version: ${BUILD_VERSION})"
        
        curl -X POST "$DEPLOYMENT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"${message}\"}" \
            >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Failed to send notification${NC}"
    fi
}

# Function to display deployment summary
display_summary() {
    local start_time=$1
    local end_time=$2
    local duration=$((end_time - start_time))
    
    echo ""
    echo -e "${BLUE}📊 Deployment Summary${NC}"
    echo -e "${BLUE}=====================${NC}"
    echo -e "   Environment: ${ENVIRONMENT}"
    echo -e "   Branch: ${BRANCH}"
    echo -e "   Version: ${BUILD_VERSION}"
    echo -e "   Start time: $(date -d "@$start_time")"
    echo -e "   End time: $(date -d "@$end_time")"
    echo -e "   Duration: ${duration} seconds"
    echo -e "   Status: ${GREEN}SUCCESS${NC}"
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Function to confirm deployment
confirm_deployment() {
    if [ "$AUTO_CONFIRM" = "true" ] || [ "$DRY_RUN" = "true" ]; then
        return 0
    fi
    
    echo ""
    echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
    echo -e "   Environment: ${ENVIRONMENT}"
    echo -e "   Branch: ${BRANCH}"
    echo -e "   Version: ${BUILD_VERSION}"
    echo -e "   Skip Tests: ${SKIP_TESTS}"
    echo -e "   Skip Backup: ${SKIP_BACKUP}"
    echo ""
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${RED}⚠️  WARNING: This will deploy to PRODUCTION${NC}"
        echo ""
    fi
    
    read -p "Do you want to continue with the deployment? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo -e "${YELLOW}❌ Deployment cancelled by user${NC}"
        exit 0
    fi
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    echo -e "${BLUE}🚀 Personal Finance Tracker - Deployment${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "   Environment: ${ENVIRONMENT}"
    echo -e "   Branch: ${BRANCH}"
    echo -e "   Version: ${BUILD_VERSION}"
    echo -e "   Timestamp: $(date)"
    echo ""
    
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}🏃 DRY RUN MODE - No changes will be made${NC}"
        echo ""
    fi
    
    # Validate prerequisites
    validate_prerequisites
    validate_git_repository
    
    # Confirm deployment
    confirm_deployment
    
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${BLUE}📋 Deployment plan (dry run):${NC}"
        echo -e "1. Checkout branch: ${BRANCH}"
        echo -e "2. Run tests: $([ "$SKIP_TESTS" = "true" ] && echo "SKIP" || echo "RUN")"
        echo -e "3. Build application"
        echo -e "4. Build Docker images"
        echo -e "5. Backup database: $([ "$SKIP_BACKUP" = "true" ] && echo "SKIP" || echo "CREATE")"
        echo -e "6. Deploy application"
        echo -e "7. Run health checks"
        echo -e "8. Run smoke tests"
        echo -e "9. Cleanup old images"
        echo ""
        echo -e "${GREEN}✅ Dry run completed - no changes made${NC}"
        exit 0
    fi
    
    # Checkout branch
    echo -e "${YELLOW}📂 Checking out branch: ${BRANCH}${NC}"
    cd "$PROJECT_ROOT"
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    
    # Execute deployment steps
    run_tests
    build_application
    build_docker_images
    backup_database
    deploy_application
    run_health_checks
    run_smoke_tests
    cleanup_old_images
    
    local end_time=$(date +%s)
    display_summary "$start_time" "$end_time"
    
    # Send success notification
    send_deployment_notification "SUCCESS" "Deployment completed successfully"
}

# Error handling
handle_error() {
    echo -e "${RED}❌ Deployment failed at step: ${BASH_COMMAND}${NC}"
    send_deployment_notification "FAILED" "Deployment encountered an error"
    exit 1
}

trap handle_error ERR

# Parse arguments and execute
parse_arguments "$@"
main