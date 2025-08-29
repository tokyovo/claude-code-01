# Deployment Scripts

This directory contains automated deployment scripts for the Personal Finance Tracker backend API.

## Overview

The deployment system provides automated, reliable deployment to staging and production environments with comprehensive error handling, rollback capabilities, and monitoring.

## Scripts

### `deploy.sh` - Main Deployment Script

Automated deployment script supporting staging and production environments.

#### Usage
```bash
./deploy/deploy.sh [OPTIONS] ENVIRONMENT

# Examples
./deploy/deploy.sh production
./deploy/deploy.sh staging --skip-tests --yes
./deploy/deploy.sh production --branch main --version v1.2.3
```

#### Options
- `-b, --branch BRANCH`: Git branch to deploy (default: main for prod, develop for staging)
- `-v, --version VERSION`: Build version/tag
- `--skip-tests`: Skip running tests before deployment
- `--skip-backup`: Skip database backup (not recommended for production)
- `--dry-run`: Show deployment plan without executing
- `-y, --yes`: Auto-confirm deployment

#### Features
- ✅ Pre-deployment validation
- ✅ Automated testing
- ✅ Database backup
- ✅ Health checks
- ✅ Smoke tests
- ✅ Rollback on failure
- ✅ Notification support

### `rollback.sh` - Rollback Script

Quick rollback to previous deployment version with optional database restore.

#### Usage
```bash
./deploy/rollback.sh [OPTIONS] ENVIRONMENT [VERSION]

# Examples
./deploy/rollback.sh production
./deploy/rollback.sh staging --version v1.2.2
./deploy/rollback.sh production --restore-db --yes
```

#### Options
- `-v, --version VERSION`: Specific version to rollback to
- `--restore-db`: Restore database from backup (dangerous!)
- `-y, --yes`: Auto-confirm rollback

#### Features
- ✅ Automatic version detection
- ✅ Database backup before rollback
- ✅ Optional database restoration
- ✅ Health verification
- ✅ Notification support

## Deployment Process

### Production Deployment Flow

```
1. Validate prerequisites
2. Validate Git repository
3. Run tests (linting + unit tests)
4. Build application
5. Build Docker images
6. Create database backup
7. Deploy new version
8. Run health checks
9. Run smoke tests
10. Cleanup old images
11. Send success notification
```

### Rollback Flow

```
1. List available versions
2. Determine rollback version
3. Validate rollback version
4. Backup current state
5. Stop current services
6. Restore database (if requested)
7. Deploy rollback version
8. Run health checks
9. Verify rollback
10. Send notification
```

## Environment Variables

### Required for Deployment
```bash
# Git configuration
GIT_BRANCH=main                    # Default branch for production
STAGING_BRANCH=develop             # Default branch for staging

# Build configuration
BUILD_VERSION=1.0.0               # Application version
DOCKER_REGISTRY=                  # Docker registry (optional)

# Backup configuration
SKIP_BACKUP=false                 # Skip database backup
BACKUP_BEFORE_MIGRATION=true     # Backup before migrations

# Notification configuration
DEPLOYMENT_WEBHOOK_URL=           # Slack/Discord webhook for notifications
```

### Optional Environment Variables
```bash
# Deployment behavior
AUTO_CONFIRM_DEPLOYMENT=false    # Skip confirmation prompts
DRY_RUN=false                    # Show deployment plan only
SKIP_TESTS=false                 # Skip test execution

# Migration behavior
RUN_MIGRATIONS=true              # Run database migrations
RUN_SEEDS=false                  # Run database seeds
MIGRATION_TIMEOUT=600            # Migration timeout in seconds

# Health check configuration
HEALTH_CHECK_URL=http://localhost:3000/api/v1/health
HEALTH_CHECK_TIMEOUT=300         # Health check timeout in seconds
HEALTH_CHECK_RETRIES=30          # Number of health check attempts

# Cleanup configuration
CLEANUP_OLD_IMAGES=true          # Remove old Docker images
KEEP_IMAGE_VERSIONS=3            # Number of image versions to keep
```

## Usage Examples

### Basic Deployment

```bash
# Deploy to staging (interactive)
./deploy/deploy.sh staging

# Deploy to production with confirmation
./deploy/deploy.sh production --yes

# Deploy specific version to production
./deploy/deploy.sh production --version v1.2.3 --yes
```

### Advanced Deployment

```bash
# Deploy from specific branch with custom version
./deploy/deploy.sh production --branch hotfix/critical-fix --version v1.2.4

# Quick staging deployment without tests
./deploy/deploy.sh staging --skip-tests --skip-backup --yes

# Dry run to see deployment plan
./deploy/deploy.sh production --dry-run
```

### Rollback Examples

```bash
# Rollback to previous version
./deploy/rollback.sh production

# Rollback to specific version
./deploy/rollback.sh production --version v1.2.2

# Emergency rollback with database restore
./deploy/rollback.sh production --restore-db --yes
```

## Error Handling

### Deployment Failures

The deployment script includes comprehensive error handling:

1. **Validation Failures**: Script exits early with clear error messages
2. **Test Failures**: Deployment stops, no changes made
3. **Build Failures**: Docker build errors are caught and reported
4. **Health Check Failures**: Automatic rollback triggered
5. **Database Issues**: Backup restoration available

### Recovery Procedures

#### Failed Deployment Recovery
```bash
# Check deployment status
docker-compose -f docker-compose.prod.yml ps

# View deployment logs
docker-compose -f docker-compose.prod.yml logs -f app

# Manual rollback if needed
./deploy/rollback.sh production --yes
```

#### Database Recovery
```bash
# List available backups
ls -la /backups/

# Restore specific backup
./docker/scripts/restore.sh backup_filename.sql.gz

# Verify database integrity
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT version();"
```

## Monitoring and Notifications

### Notification Integration

The scripts support webhook notifications for Slack, Discord, or custom endpoints:

```bash
# Set webhook URL
export DEPLOYMENT_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Deploy with notifications
./deploy/deploy.sh production
```

### Log Locations

- Deployment logs: `/tmp/deployment-YYYYMMDD-HHMMSS.log`
- Application logs: `logs/app.log`
- Docker logs: `docker-compose logs`

### Monitoring Commands

```bash
# Check deployment status
docker-compose -f docker-compose.prod.yml ps

# Monitor application health
watch -n 10 'curl -s http://localhost:3000/api/v1/health | jq'

# Monitor resource usage
docker stats

# Check recent deployments
docker images finance-tracker-api --format "table {{.Tag}}\t{{.CreatedAt}}"
```

## Security Considerations

### Production Deployment Security

1. **Environment Variables**: Use secure environment files with restricted permissions
2. **SSH Access**: Use SSH keys for deployment user
3. **Docker Security**: Run containers as non-root user
4. **Network Security**: Restrict network access to necessary ports
5. **Secrets Management**: Use external secret management systems

### Deployment User Setup

```bash
# Create deployment user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Setup SSH key authentication
sudo mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Grant sudo access for specific commands
echo "deploy ALL=(ALL) NOPASSWD: /usr/local/bin/docker-compose, /usr/bin/docker" | sudo tee /etc/sudoers.d/deploy
```

## Best Practices

### Deployment Best Practices

1. **Always Test First**: Deploy to staging before production
2. **Use Specific Versions**: Tag releases and deploy specific versions
3. **Backup Before Deploy**: Never skip database backups in production
4. **Monitor After Deploy**: Watch logs and metrics post-deployment
5. **Plan Rollbacks**: Have rollback procedures ready
6. **Document Changes**: Maintain deployment logs and changelogs

### Automated Deployment Pipeline

```yaml
# Example GitHub Actions workflow
name: Deploy to Production
on:
  push:
    tags: ['v*']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Production
        run: |
          ssh deploy@production-server "cd /var/www/finance-tracker && git pull && ./deploy/deploy.sh production --version ${{ github.ref_name }} --yes"
```

### Monitoring and Alerting

Set up monitoring for:
- Deployment success/failure notifications
- Application health checks
- Database performance metrics
- Resource utilization alerts
- Security scan results

## Troubleshooting

### Common Issues

#### 1. Permission Denied Errors
```bash
# Fix script permissions
chmod +x deploy/*.sh docker/scripts/*.sh ssl/*.sh

# Fix environment file permissions
chmod 600 .env.production .env.staging
```

#### 2. Docker Build Failures
```bash
# Clean Docker cache
docker system prune -f

# Rebuild without cache
docker-compose -f docker-compose.prod.yml build --no-cache
```

#### 3. Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml ps postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec app npm run db:status
```

#### 4. Health Check Failures
```bash
# Check application logs
docker-compose -f docker-compose.prod.yml logs app

# Test health endpoint manually
curl -v http://localhost:3000/api/v1/health
```

### Getting Help

1. Check the troubleshooting section in `DEPLOYMENT.md`
2. Review application and deployment logs
3. Verify environment configuration
4. Test individual components (database, Redis, application)
5. Create GitHub issue with detailed error information

---

For complete deployment documentation, see [DEPLOYMENT.md](../DEPLOYMENT.md)