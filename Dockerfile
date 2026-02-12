# ============================================================
# Medicine Reminder - Multi-stage Docker Build
# ============================================================

# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (frontend + backend)
RUN pnpm run build

# ---- Stage 2: Production ----
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy drizzle schema (needed at runtime for ORM)
COPY --from=builder /app/drizzle ./drizzle

# Copy shared directory (needed at runtime)
COPY --from=builder /app/shared ./shared

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "dist/index.js"]
