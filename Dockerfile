# ==================================
# Multi-stage Dockerfile for Next.js
# ==================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# In dev, we don't use --frozen-lockfile to allow adding packages easily
RUN pnpm install

# ============================================================
# NEW Stage 2: Development (Fast Local Building)
# ============================================================
FROM node:20-alpine AS dev
RUN npm install -g pnpm tsx
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
# Force bind to 0.0.0.0 for iPhone access
ENV HOSTNAME="0.0.0.0" 

EXPOSE 3000

# Start Next.js with Turbopack for maximum speed
CMD ["pnpm", "next", "dev", "--turbo", "-H", "0.0.0.0"]

# ============================================================
# Stage 3: Build application (Production only)
# ============================================================
FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder
RUN pnpm db:generate
ENV SERWIST_SUPPRESS_TURBOPACK_WARNING=1
RUN pnpm build

# ============================================================
# Stage 4: Production runner
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g tsx

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/db ./src/db

# Entrypoint script
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'echo "🔄 Running database migrations..."' >> /app/entrypoint.sh && \
    echo 'tsx /app/scripts/migrate.ts' >> /app/entrypoint.sh && \
    echo 'echo "🌱 Seeding database..."' >> /app/entrypoint.sh && \
    echo 'tsx /app/scripts/seed.ts' >> /app/entrypoint.sh && \
    echo 'echo "🚀 Starting application..."' >> /app/entrypoint.sh && \
    echo 'exec node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]