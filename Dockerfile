# ==============================================================================
# Multi-Stage Production Dockerfile for SabQuick (Next.js 14 Standalone)
# Target Platform: Ubuntu 24.04 LTS (x86_64 / arm64) Node.js 20 Alpine
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies Cache
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency manifests and prisma schema
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Clean install all dependencies (including devDependencies for build & seed)
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 2: Application Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy cached dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client singleton
RUN npx prisma generate

# Build Next.js with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create secure non-root system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and public directory
COPY --from=builder /app/public ./public

# Setup directories and permissions
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone build output and static bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma schema and migration files for runtime migrations/seeding
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
