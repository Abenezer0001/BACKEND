FROM node:20-alpine

# Install system dependencies including wget for health checks
RUN apk add --no-cache tini wget

# Create app directory
WORKDIR /app

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files for better layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for TypeScript)
RUN npm install && npm cache clean --force

# Copy app source
COPY . .

# Create logs directory and set permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use tini as entrypoint to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Run the application with ts-node
CMD ["npm", "start"]
