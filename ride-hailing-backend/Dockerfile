# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
