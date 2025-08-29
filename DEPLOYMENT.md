# Personal Finance Tracker - Deployment Guide

This comprehensive guide covers all deployment scenarios for the Personal Finance Tracker backend API, from local development to production deployment.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Traditional Server Deployment](#traditional-server-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [SSL/HTTPS Configuration](#ssl-https-configuration)
- [Database Management](#database-management)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Overview

The Personal Finance Tracker backend is a Node.js/Express application with TypeScript, designed for secure financial data management. It supports multiple deployment options:

- **Docker Deployment**: Containerized deployment with Docker Compose
- **Traditional Server**: PM2 process management on VPS/dedicated servers
- **Cloud Platforms**: Railway, Render, Heroku, DigitalOcean App Platform
- **Local Production**: Production-like local deployment for testing

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application    │    │    Database     │
│   (Nginx/ALB)   │────│   (Node.js)      │────│  (PostgreSQL)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐
                       │      Cache       │
                       │     (Redis)      │
                       └──────────────────┘
```

## Prerequisites

### System Requirements

- **CPU**: 2+ cores (4+ recommended for production)
- **Memory**: 4GB RAM minimum (8GB+ recommended for production)
- **Storage**: 20GB+ available disk space
- **Network**: Stable internet connection for external services

### Software Requirements

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (for non-Docker deployments)
- **PostgreSQL**: 14+ (if not using Docker)
- **Redis**: 7+ (if not using Docker)
- **Git**: For deployment from repository

### Development Tools

```bash
# Install required tools (Ubuntu/Debian)
sudo apt update
sudo apt install -y curl git wget gnupg lsb-release

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/personal-finance-tracker.git
cd personal-finance-tracker
```

### 2. Environment Configuration

Copy the appropriate environment template:

```bash
# For production
cp .env.example .env.production

# For staging
cp .env.example .env.staging

# For development
cp .env.example .env
```

### 3. Configure Environment Variables

Edit your environment file with production values:

```bash
# Critical: Generate secure secrets
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)

# Database configuration
DB_HOST=postgres
DB_NAME=personal_finance_tracker
DB_USER=postgres
DB_PASSWORD=your_secure_database_password

# Redis configuration
REDIS_HOST=redis
REDIS_PASSWORD=your_secure_redis_password

# Email configuration (required for production)
EMAIL_HOST=smtp.your-provider.com
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your_email_password

# Domain configuration
CORS_ORIGIN=https://yourdomain.com
```

## Docker Deployment

### Production Docker Deployment

#### 1. Build and Deploy

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

#### 2. Run Database Migrations

```bash
# Wait for database to be ready
docker-compose -f docker-compose.prod.yml exec app ./scripts/wait-for-services.sh

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npm run migrate:latest

# (Optional) Run seeds for initial data
docker-compose -f docker-compose.prod.yml exec app npm run seed:run
```

#### 3. Verify Health

```bash
# Check application health
curl http://localhost:3000/api/v1/health

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Staging Deployment

```bash
# Deploy to staging
docker-compose -f docker-compose.yml --env-file .env.staging up -d

# Run migrations with seeds
docker-compose -f docker-compose.yml exec app npm run db:setup
```

### Development with Production Services

```bash
# Start only databases
docker-compose up -d postgres redis

# Run application locally
npm run dev
```

## Traditional Server Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Create application user
sudo useradd -m -s /bin/bash appuser
sudo mkdir -p /var/www/finance-tracker
sudo chown appuser:appuser /var/www/finance-tracker
```

### 2. Application Setup

```bash
# Switch to app user
sudo -u appuser bash

# Clone repository
cd /var/www/finance-tracker
git clone https://github.com/your-username/personal-finance-tracker.git .

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Configure environment
cp .env.example .env.production
# Edit .env.production with your values
```

### 3. Database Setup

```bash
# Create database user and database
sudo -u postgres psql << EOF
CREATE USER finance_user WITH PASSWORD 'secure_password';
CREATE DATABASE personal_finance_tracker OWNER finance_user;
GRANT ALL PRIVILEGES ON DATABASE personal_finance_tracker TO finance_user;
\q
EOF

# Run migrations
NODE_ENV=production npm run migrate:latest
```

### 4. PM2 Configuration

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u appuser --hp /home/appuser
```

### 5. Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx
sudo cp docker/nginx/nginx.prod.conf /etc/nginx/nginx.conf

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Cloud Platform Deployment

### Railway Deployment

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login and link project
   railway login
   railway link
   ```

2. **Configure Environment**
   ```bash
   # Set environment variables
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
   railway variables set REDIS_URL=${{Redis.REDIS_URL}}
   ```

3. **Deploy**
   ```bash
   # Deploy to Railway
   railway up
   ```

### Render Deployment

1. **Create `render.yaml`**
   ```yaml
   services:
     - type: web
       name: finance-tracker-api
       env: node
       buildCommand: npm ci && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: DATABASE_URL
           fromDatabase:
             name: finance-tracker-db
             property: connectionString
   
   databases:
     - name: finance-tracker-db
       databaseName: personal_finance_tracker
       user: postgres
   ```

2. **Deploy via GitHub**
   - Connect repository to Render
   - Configure environment variables
   - Deploy automatically on push

### DigitalOcean App Platform

1. **Create App Spec**
   ```yaml
   name: finance-tracker
   services:
   - name: api
     source_dir: /
     github:
       repo: your-username/personal-finance-tracker
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     env:
     - key: NODE_ENV
       value: "production"
   ```

## SSL/HTTPS Configuration

### Let's Encrypt (Recommended)

```bash
# Generate SSL certificate
./ssl/generate-ssl-certs.sh --email admin@yourdomain.com yourdomain.com

# Deploy with SSL
docker-compose -f docker-compose.prod.yml -f ssl/docker-compose-ssl.yml up -d

# Test SSL configuration
curl -I https://yourdomain.com/api/v1/health
```

### Self-Signed (Development)

```bash
# Generate self-signed certificate
./ssl/generate-ssl-certs.sh --method selfsigned localhost

# Update nginx configuration for development
```

### Certificate Renewal

```bash
# Setup automatic renewal
crontab -e
# Add: 0 12 * * * /path/to/ssl/renew-certificates.sh
```

## Database Management

### Production Migration

```bash
# Run production migrations
NODE_ENV=production ./docker/scripts/migrate-prod.sh

# Or with Docker
docker-compose -f docker-compose.prod.yml exec app ./docker/scripts/migrate-prod.sh
```

### Backup and Restore

```bash
# Create backup
docker-compose -f docker-compose.prod.yml run --rm db-backup

# Restore from backup
docker-compose -f docker-compose.prod.yml run --rm -e BACKUP_FILE=backup_file.sql.gz db-restore
```

### Database Maintenance

```bash
# Vacuum and analyze
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d personal_finance_tracker -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d personal_finance_tracker -c "SELECT pg_size_pretty(pg_database_size('personal_finance_tracker'));"
```

## Monitoring and Logging

### Prometheus and Grafana

```bash
# Deploy with monitoring
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Access dashboards
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9090
```

### Log Management

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Rotate logs
docker-compose -f docker-compose.prod.yml run --rm log-rotator

# Monitor log size
du -sh logs/
```

### Health Checks

```bash
# Application health
curl http://localhost:3000/api/v1/health

# Database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

## Security Hardening

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### Security Updates

```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Secrets Management

```bash
# Use environment files with restricted permissions
chmod 600 .env.production

# Consider using external secret management
# - HashiCorp Vault
# - AWS Secrets Manager
# - Azure Key Vault
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check environment variables
docker-compose -f docker-compose.prod.yml exec app env | grep -E "(NODE_ENV|DB_|REDIS_|JWT_)"

# Verify database connection
docker-compose -f docker-compose.prod.yml exec app npm run db:status
```

#### 2. Database Connection Issues

```bash
# Check database status
docker-compose -f docker-compose.prod.yml ps postgres

# Test connection manually
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT version();"

# Check network connectivity
docker-compose -f docker-compose.prod.yml exec app ping postgres
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in ssl/certs/fullchain.pem -text -noout | grep -E "(Subject|Not After)"

# Test SSL handshake
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

#### 4. Performance Issues

```bash
# Check resource usage
docker stats

# Monitor database queries
docker-compose -f docker-compose.prod.yml logs postgres | grep "slow query"

# Check Redis memory
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory
```

### Debugging Commands

```bash
# Enter application container
docker-compose -f docker-compose.prod.yml exec app bash

# Check application metrics
curl http://localhost:3000/api/v1/metrics

# Database query analysis
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d personal_finance_tracker -c "SELECT * FROM pg_stat_activity;"
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor application logs
- Check disk space usage
- Verify backup completion

#### Weekly
- Review security alerts
- Update dependencies (staging first)
- Analyze performance metrics

#### Monthly
- Security scan and updates
- Database maintenance (VACUUM, ANALYZE)
- SSL certificate renewal check
- Clean up old logs and backups

### Deployment Scripts

```bash
# Automated deployment
./deploy/deploy.sh production --version v1.2.3

# Automated rollback
./deploy/rollback.sh production --version v1.2.2

# Staging deployment
./deploy/deploy.sh staging --skip-tests --yes
```

### Backup Strategy

```bash
# Schedule daily backups
0 2 * * * /path/to/docker/scripts/backup.sh

# Weekly full system backup
0 3 * * 0 /path/to/scripts/full-backup.sh

# Test restore procedures monthly
```

### Scaling Considerations

#### Horizontal Scaling
- Load balancer configuration
- Database connection pooling
- Redis cluster setup
- Stateless application design

#### Vertical Scaling
- Monitor resource usage
- Increase container resources
- Optimize database queries
- Implement caching strategies

### Contact and Support

For deployment issues or questions:
- Check troubleshooting section first
- Review application logs
- Consult monitoring dashboards
- Create GitHub issue with detailed information

---

## Quick Reference

### Essential Commands

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check health
curl http://localhost:3000/api/v1/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npm run migrate:latest

# Backup database
docker-compose -f docker-compose.prod.yml run --rm db-backup

# SSL certificate generation
./ssl/generate-ssl-certs.sh --email admin@yourdomain.com yourdomain.com

# Automated deployment
./deploy/deploy.sh production
```

### File Locations

- Environment files: `.env.production`, `.env.staging`
- SSL certificates: `ssl/certs/`
- Docker configurations: `docker-compose.prod.yml`
- Deployment scripts: `deploy/`
- Database scripts: `docker/scripts/`
- Logs: `logs/`
- Uploads: `uploads/`

This deployment guide provides comprehensive coverage of all deployment scenarios. Always test deployments in staging before production, maintain regular backups, and monitor system health continuously.