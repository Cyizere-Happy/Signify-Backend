# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json yarn.lock ./

# Install all dependencies (including dev dependencies for build)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN yarn install --frozen-lockfile --production

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
