# Tiween

A monorepo containing the Tiween platform - a Next.js client application and Strapi CMS backend.

## Prerequisites

- Node.js >= 20 (22+ recommended)
- Yarn >= 1.22
- Docker (for running the database locally)

## Installation

```bash
yarn install
```

This will install all dependencies and automatically copy `.example` environment files to their actual locations.

## Development

### Run all apps (client + Strapi)

```bash
yarn dev
```

### Run individual apps

```bash
# Client only (Next.js)
yarn dev:client

# Strapi only (requires Docker for database)
yarn dev:strapi
```

> **Note:** The Strapi dev command automatically starts the PostgreSQL database container via Docker Compose.

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
