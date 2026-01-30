# Use Node.js 20 LTS
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json yarn.lock ./

# Install all dependencies (including dev dependencies for build)
RUN yarn install --frozen-lockfile --network-timeout 100000 || \
    yarn install --frozen-lockfile --network-timeout 100000 || \
    yarn install --frozen-lockfile --network-timeout 100000

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application with verbose output
RUN npm run build

# Verify dist directory exists and list contents
RUN ls -la dist/ || echo "Dist directory not found"

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Verify dist directory exists in production
RUN ls -la dist/ || echo "Dist directory not found in production"

# Verify main.js exists in correct location
RUN ls -la dist/src/main.js || echo "Main.js not found in dist/src/"

# Verify .prisma directory exists
RUN ls -la node_modules/.prisma/ || echo ".prisma directory not found"

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
