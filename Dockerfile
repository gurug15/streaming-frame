# ============================================
# Stage 1: Build
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for tsc)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript → JavaScript
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create directory for trajectory data (will be mounted as volume)
RUN mkdir -p /data/analysis

# Run as non-root user for security
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

CMD ["node", "dist/index.js"]
