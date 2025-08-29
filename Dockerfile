# =================================
# Production Dockerfile for Personal Finance Tracker Backend
# Multi-stage build for optimized production deployment
# =================================

# =================================
# Stage 1: Build Dependencies
# =================================
FROM node:18-alpine AS dependencies

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with exact versions
RUN npm ci --only=production --frozen-lockfile --silent

# =================================
# Stage 2: Build Application
# =================================
FROM node:18-alpine AS builder

# Install build tools
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files and tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --frozen-lockfile --silent

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# =================================
# Stage 3: Production Runtime
# =================================
FROM node:18-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl \
    postgresql-client \
    redis \
    tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy required runtime files
COPY docker/scripts/wait-for-services.sh ./scripts/
COPY docker/scripts/migrate-and-start.sh ./scripts/
RUN chmod +x ./scripts/*.sh

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads/receipts uploads/profiles uploads/documents && \
    chown -R appuser:nodejs /app && \
    chmod -R 755 /app/logs /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV USER=appuser

# Security: Use non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["./scripts/migrate-and-start.sh"]

# =================================
# Labels for metadata
# =================================
LABEL maintainer="Personal Finance Tracker Team"
LABEL description="Personal Finance Tracker Backend API"
LABEL version="1.0.0"
LABEL build-date=""