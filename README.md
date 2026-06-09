# Tiween

A monorepo containing the Tiween platform - a Next.js client application and Strapi CMS backend.

## Prerequisites

- Node.js >= 20 (22+ recommended)
- Yarn >= 1.22
- Docker (for running the database locally)
- [Portless](https://github.com/portless/portless) (for stable local `.localhost` URLs)

## Installation

```bash
yarn install
```

This will install all dependencies and automatically copy `.example` environment files to their actual locations.

### Portless setup (one-time per machine)

Local development uses [Portless](https://github.com/portless/portless) to route both apps through stable `*.tiween.localhost` URLs with HTTPS. This replaces the previous Caddy-based `tiween.dev` setup — no `/etc/hosts` edits or `sudo` required.

```bash
# Install globally (do NOT add to package.json)
npm install -g portless

# Trust Portless's local CA so HTTPS works without browser warnings
portless trust

# Start the proxy with HTTP/2 + TLS (runs as a background daemon on port 1355)
portless proxy start --https

# (Optional, Safari only) Sync /etc/hosts so .localhost resolves
portless hosts sync
```

After this, the local URLs are:

| Service        | URL                                     |
| -------------- | --------------------------------------- |
| Next.js client | https://tiween.localhost:1355           |
| Strapi API     | https://api.tiween.localhost:1355       |
| Strapi admin   | https://api.tiween.localhost:1355/admin |

## Development

### Run all apps (client + Strapi)

```bash
yarn dev
```

The `dev` scripts in each app are pre-wired with `portless` — `yarn dev` automatically routes through the proxy.

### Run individual apps

```bash
# Client only (Next.js) -> https://tiween.localhost:1355
yarn dev:client

# Strapi only (requires Docker for database) -> https://api.tiween.localhost:1355
yarn dev:strapi
```

> **Note:** The Strapi dev command automatically starts the PostgreSQL database container via Docker Compose.

### Using Docker for the full stack

If you run `docker-compose up` instead of native dev scripts, the apps stay on host ports `:3000` and `:1337`. To still get the Portless hostnames, register static aliases:

```bash
portless alias tiween     3000
portless alias api.tiween 1337
```

## Build

### Build all apps

```bash
yarn build
```

### Build individual apps

```bash
yarn build:client
yarn build:strapi
```

## Type Checking

```bash
# Check types across all packages
yarn type-check
```

## Linting & Formatting

```bash
# Lint all packages
yarn lint

# Format all files
yarn format

# Check formatting without writing
yarn format:check
```

## Testing

```bash
# Run tests across all packages
yarn test
```

For the Strapi app specifically:

```bash
cd apps/strapi
yarn test
```

## Start Production

```bash
# Start all apps
yarn start:strapi
yarn start:client
```

## Additional Tools

### Storybook (Client)

```bash
yarn storybook
yarn build-storybook
```

### Strapi Scripts

```bash
# Generate Strapi types
cd apps/strapi
yarn generate:types

# Seed database
yarn seed
yarn seed:fresh  # Clear and reseed
```

### Conventional Commits

```bash
yarn commit  # Interactive commit helper
```

## Project Structure

```
├── apps/
│   ├── client/   # @tiween/client - Next.js frontend
│   └── strapi/   # @tiween/admin - Strapi CMS backend
├── packages/
│   ├── eslint-config/
│   ├── prettier-config/
│   ├── shared-types/
│   └── typescript-config/
└── legacy/       # Legacy code (deprecated)
```
