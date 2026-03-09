# ==================================
# Multi-stage Dockerfile for Next.js
# ==================================
# Stage 1: Dependencies
# Stage 2: Builder
# Stage 3: Runner (Production)
#
# This approach minimizes final image size and improves build caching.

# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:20-alpine AS deps

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 2: Build application
# ============================================================
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Drizzle migrations (doesn't need DB connection, just reads schema)
ENV DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder
RUN pnpm db:generate

# Suppress Serwist Turbopack warning in production builds
ENV SERWIST_SUPPRESS_TURBOPACK_WARNING=1

# Build Next.js application
RUN pnpm build

# ============================================================
# Stage 3: Production runner
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install tsx for running migration scripts
RUN npm install -g tsx

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy package.json for metadata
COPY --from=builder /app/package.json ./

# Copy full node_modules for migration scripts (standalone doesn't include all deps)
COPY --from=builder /app/node_modules ./node_modules

# Copy database migration files and scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# Copy database schema for migration runner
COPY --from=builder /app/src/db ./src/db

# Create entrypoint script
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'echo "🔄 Running database migrations..."' >> /app/entrypoint.sh && \
    echo 'tsx /app/scripts/migrate.ts' >> /app/entrypoint.sh && \
    echo 'echo "🌱 Seeding database..."' >> /app/entrypoint.sh && \
    echo 'tsx /app/scripts/seed.ts' >> /app/entrypoint.sh && \
    echo 'echo "🚀 Starting application..."' >> /app/entrypoint.sh && \
    echo 'exec node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application with migrations
ENTRYPOINT ["/app/entrypoint.sh"]
