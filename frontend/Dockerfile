# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Clean install dependencies
RUN npm ci

# Copy source files
COPY . .

# Optional build arg for API URL (empty by default for relative /api routing on same domain)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Build the production application
RUN npm run build

# Production Stage: Lightweight Nginx
FROM nginx:alpine

# Remove default nginx contents
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom frontend nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
