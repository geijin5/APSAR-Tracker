# Multi-stage build for production deployment
FROM node:18-alpine AS base

# Frontend build stage
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Increase Node.js memory limit for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Backend build stage  
FROM base AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Copy backend
COPY --from=backend-build /app/backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S apsar -u 1001

# Create uploads directory and set permissions
RUN mkdir -p /app/backend/uploads
RUN chown -R apsar:nodejs /app
USER apsar

EXPOSE 5000

# Set production environment  
ENV NODE_ENV=production

# Start application with PM2
CMD ["pm2-runtime", "start", "backend/server.js", "--name", "apsar-tracker"]
