# Stage 1: Build static assets
FROM node:22-alpine AS web-builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Cache dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN pnpm run build

# Stage 2: Build minimal non-root Go entrypoint (substitutes templates & provides healthcheck without a shell)
FROM golang:alpine AS entrypoint-builder

WORKDIR /src
COPY docker/entrypoint.go ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /entrypoint entrypoint.go

# Stage 3: Distroless non-root runtime (zero shell, zero package manager, zero CVEs)
FROM cgr.dev/chainguard/nginx:latest

USER 65532:65532

# Default RabbitMQ service address (override via environment variable)
ENV RABBITMQ_URL="http://rabbitmq:15672"

# Copy base nginx configuration
COPY --chown=65532:65532 nginx.conf /etc/nginx/nginx.conf

# Copy nginx template for runtime environment variable substitution
COPY --chown=65532:65532 nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy compiled static files
COPY --from=web-builder --chown=65532:65532 /app/dist /usr/share/nginx/html

# Copy entrypoint binary
COPY --from=entrypoint-builder --chown=65532:65532 /entrypoint /entrypoint

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["/entrypoint", "-healthcheck"]

ENTRYPOINT ["/entrypoint"]
