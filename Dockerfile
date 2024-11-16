# Use Node.js 20.18 as base image
FROM node:20.18-slim

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml (if exists)
COPY package*.json pnpm*.yaml ./

# Install dependencies using pnpm
RUN pnpm install

# Copy project files
COPY . .

# Create database directory and set permissions
RUN mkdir -p /app/database && \
    chown -R node:node /app && \
    chmod -R 755 /app && \
    chmod 777 /app/database

# Switch to non-root user
USER node

# Set environment variables
ENV NODE_ENV=production
ENV TZ=Asia/Taipei
ENV SESSION_SECRET=${SESSION_SECRET}

# Expose port
EXPOSE 5000

# Start application using pnpm
CMD ["pnpm", "start"]
