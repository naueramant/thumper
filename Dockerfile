# Stage 1: Build static assets
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Cache dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN pnpm run build

# Stage 2: Serve with non-root Nginx
FROM nginxinc/nginx-unprivileged:alpine-slim

# Default RabbitMQ service address (override via environment variable)
ENV RABBITMQ_URL="http://rabbitmq:15672"

# Copy compiled static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx template; official image entrypoint substitutes env vars into /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
