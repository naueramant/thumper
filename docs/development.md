# Local Development Guide

This guide covers setting up your local environment to contribute to Thumper.

---

## 1. Prerequisites

- **Node.js**: `v22+`
- **pnpm**: `v9+` (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker**: For running a local test broker

---

## 2. Start the Local Test Broker

A preconfigured broker with the management plugin enabled is included in the root `docker-compose.yml`:

```bash
docker compose up -d
```

This starts RabbitMQ with:
- AMQP: `localhost:5672`
- HTTP API / Management UI: `localhost:15672`
- Default Credentials: `guest` / `guest`

---

## 3. Install Dependencies & Run Dev Server

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

In development mode, requests to `/api` are automatically proxied to `http://localhost:15672` via Vite's dev server proxy (`vite.config.ts`).

---

## 4. Linting & Type Checking

```bash
# Type check and build
pnpm build

# Fast linting
pnpm lint

# Unused dependencies / exports check
pnpm knip
```
