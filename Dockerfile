# ==============================================================================
# Stage 1: Build Vue Frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source and build production bundle
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Server
# ==============================================================================
FROM node:20-alpine
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=9600
ENV HOST=0.0.0.0
ENV SYNC_INTERVAL_MINUTES=15

# Install backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source, docs, and main entrypoint
COPY backend/ ./backend/
COPY docs/ ./docs/
COPY main.js ./

# Copy compiled frontend from builder stage
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Ensure data persistence directory exists
RUN mkdir -p backend/data

# Expose web server port
EXPOSE 9600

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:9600/api/auth/status || exit 1

# Persistent volume for CVEs, feeds, and authentication credentials
VOLUME ["/app/backend/data"]

# Launch Bug-feed daemon
CMD ["node", "main.js"]
