# Story 1.8: Configure Docker and Dokploy Deployment

Status: review

---

## Story

As a **developer**,
I want to configure Docker for local development and Dokploy deployment,
So that the application can be deployed to production infrastructure.

---

## Acceptance Criteria

1. **Given** the monorepo is fully configured
   **When** I set up Docker configuration
   **Then** `docker-compose.yml` is created for local development with:

   - Next.js client container
   - Strapi container
   - PostgreSQL container
   - Redis container

2. **And** `docker-compose.prod.yml` is created for production with:

   - Optimized multi-stage builds
   - Environment variable configuration
   - Health checks

3. **And** `Dockerfile` is created for each app (`apps/client`, `apps/strapi`)

4. **And** `.env.example` files document all required environment variables

5. **And** `docker-compose up` starts all services locally

6. **And** containers can communicate (client -> strapi -> postgres/redis)

---

## Tasks / Subtasks

- [x] **Task 1: Create Client Dockerfile** (AC: #3)

  - [x] 1.1 Dockerfile already existed - fixed APP arg from `ui` to `client`
  - [x] 1.2 Uses multi-stage build (pruned, installer, runner)
  - [x] 1.3 Uses Node.js 22 Alpine base image
  - [x] 1.4 Configured for standalone output via turbo prune
  - [x] 1.5 Non-root user `nextjs` configured

- [x] **Task 2: Create Strapi Dockerfile** (AC: #3)

  - [x] 2.1 Dockerfile already existed
  - [x] 2.2 Uses multi-stage build (pruned, installer, runner)
  - [x] 2.3 Uses Node.js 22 Alpine base image
  - [x] 2.4 Configured for production build via turbo
  - [x] 2.5 Non-root user `strapi` configured

- [x] **Task 3: Create Development docker-compose.yml** (AC: #1)

  - [x] 3.1 Created `docker-compose.yml` at root
  - [x] 3.2 Added client service (Next.js on port 3000)
  - [x] 3.3 Added strapi service (on port 1337)
  - [x] 3.4 Added postgres service (v16-alpine)
  - [x] 3.5 Added redis service (v7-alpine)
  - [x] 3.6 Configured volumes for development with delegated sync
  - [x] 3.7 Configured tiween-network for inter-service communication

- [x] **Task 4: Create Production docker-compose.prod.yml** (AC: #2)

  - [x] 4.1 Created `docker-compose.prod.yml`
  - [x] 4.2 Uses production Dockerfiles (full build)
  - [x] 4.3 Added health checks for all services
  - [x] 4.4 Configured restart policies (unless-stopped)
  - [x] 4.5 Configured resource limits (memory)
  - [x] 4.6 Uses environment variables from .env

- [x] **Task 5: Create Environment Files** (AC: #4)

  - [x] 5.1 Created `.env.example` at root with all production variables
  - [x] 5.2 `apps/client/.env.local.example` already existed
  - [x] 5.3 `apps/strapi/.env.example` already existed
  - [x] 5.4 All variables documented with comments

- [x] **Task 6: Create .dockerignore Files** (AC: #3)

  - [x] 6.1 Created `apps/client/.dockerignore`
  - [x] 6.2 `apps/strapi/.dockerignore` already existed
  - [x] 6.3 Excludes node_modules, .git, .next, etc.

- [x] **Task 7: Verify Configuration Syntax** (AC: #5, #6)
  - [x] 7.1 docker-compose.yml validates successfully
  - [x] 7.2 docker-compose.prod.yml validates successfully
  - [ ] 7.3 Manual testing: Run `docker-compose up` to verify services
  - [ ] 7.4 Manual testing: Verify client at localhost:3000
  - [ ] 7.5 Manual testing: Verify strapi at localhost:1337

---

## Dev Notes

### Critical Implementation Requirements

**CLIENT DOCKERFILE:**

```dockerfile
# apps/client/Dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./
COPY apps/client/package.json ./apps/client/
COPY packages/*/package.json ./packages/

RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build --filter=@tiween/client

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/client/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/apps/client/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/client/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**STRAPI DOCKERFILE:**

```dockerfile
# apps/strapi/Dockerfile
FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* ./
COPY apps/strapi/package.json ./apps/strapi/
COPY packages/*/package.json ./packages/

RUN yarn install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build --filter=@tiween/strapi

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 strapi
RUN adduser --system --uid 1001 strapi

COPY --from=builder --chown=strapi:strapi /app/apps/strapi/dist ./dist
COPY --from=builder --chown=strapi:strapi /app/apps/strapi/node_modules ./node_modules
COPY --from=builder --chown=strapi:strapi /app/apps/strapi/package.json ./
COPY --from=builder --chown=strapi:strapi /app/apps/strapi/config ./config
COPY --from=builder --chown=strapi:strapi /app/apps/strapi/public ./public

USER strapi

EXPOSE 1337

CMD ["yarn", "start"]
```

**DOCKER-COMPOSE.YML (Development):**

```yaml
# docker-compose.yml
version: "3.8"

services:
  client:
    build:
      context: .
      dockerfile: apps/client/Dockerfile
      target: deps
    volumes:
      - ./apps/client:/app/apps/client
      - /app/apps/client/node_modules
      - /app/apps/client/.next
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_STRAPI_URL=http://strapi:1337
    depends_on:
      - strapi
    command: yarn dev --filter=@tiween/client

  strapi:
    build:
      context: .
      dockerfile: apps/strapi/Dockerfile
      target: deps
    volumes:
      - ./apps/strapi:/app/apps/strapi
      - /app/apps/strapi/node_modules
    ports:
      - "1337:1337"
    environment:
      - NODE_ENV=development
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=tiween
      - DATABASE_USERNAME=tiween
      - DATABASE_PASSWORD=tiween_dev_password
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: yarn dev --filter=@tiween/strapi

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=tiween
      - POSTGRES_USER=tiween
      - POSTGRES_PASSWORD=tiween_dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tiween"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: tiween-network
```

**DOCKER-COMPOSE.PROD.YML:**

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  client:
    build:
      context: .
      dockerfile: apps/client/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_STRAPI_URL=${STRAPI_URL}
    depends_on:
      strapi:
        condition: service_healthy
    healthcheck:
      test:
        ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  strapi:
    build:
      context: .
      dockerfile: apps/strapi/Dockerfile
    ports:
      - "1337:1337"
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=${DATABASE_HOST}
      - DATABASE_PORT=${DATABASE_PORT}
      - DATABASE_NAME=${DATABASE_NAME}
      - DATABASE_USERNAME=${DATABASE_USERNAME}
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - APP_KEYS=${APP_KEYS}
      - API_TOKEN_SALT=${API_TOKEN_SALT}
      - ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}
      - TRANSFER_TOKEN_SALT=${TRANSFER_TOKEN_SALT}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:1337/_health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=${DATABASE_NAME}
      - POSTGRES_USER=${DATABASE_USERNAME}
      - POSTGRES_PASSWORD=${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USERNAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**ROOT .ENV.EXAMPLE:**

```bash
# .env.example

# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=tiween
DATABASE_USERNAME=tiween
DATABASE_PASSWORD=your_secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Strapi
STRAPI_URL=http://localhost:1337
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=your_api_token_salt
ADMIN_JWT_SECRET=your_admin_jwt_secret
TRANSFER_TOKEN_SALT=your_transfer_token_salt
JWT_SECRET=your_jwt_secret

# Next.js
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Architecture Compliance

**From [Source: _bmad-output/architecture/core-architectural-decisions.md]:**

- Hosting: Dokploy on VPS
- Container: Docker (included in starter template)
- PostgreSQL 16.x
- Redis 7.x

**From [Source: _bmad-output/architecture/project-structure-boundaries.md]:**

```
Deployment Architecture:
├── tiween-client (Next.js, port 3000)
├── tiween-strapi (Strapi, port 1337)
├── tiween-postgres (PostgreSQL, port 5432)
└── tiween-redis (Redis, port 6379)
```

### Previous Story Intelligence

**From Story 1-7 (ready-for-dev):**

- PWA configured, build includes service worker

**DEPENDENCY:** This story can run in parallel with Stories 1-4 through 1-7.

### Technical Requirements

**Docker Images:**

- `node:22-alpine` for Node.js apps
- `postgres:16-alpine` for database
- `redis:7-alpine` for cache

### File Structure After Completion

```
tiween/
├── docker-compose.yml           # Development
├── docker-compose.prod.yml      # Production
├── .env.example
├── apps/
│   ├── client/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── .env.example
│   └── strapi/
│       ├── Dockerfile
│       ├── .dockerignore
│       └── .env.example
```

### Testing Requirements

**Development Verification:**

```bash
docker-compose up -d
curl http://localhost:3000  # Client
curl http://localhost:1337  # Strapi
docker-compose logs -f
docker-compose down
```

---

### References

- [Source: _bmad-output/project-planning-artifacts/epics/epic-1-project-foundation-infrastructure.md#Story 1.8]
- [Source: _bmad-output/architecture/core-architectural-decisions.md#Infrastructure]
- [Source: _bmad-output/architecture/project-structure-boundaries.md#Deployment Architecture]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Both client and strapi Dockerfiles already existed from starter template
- Fixed client Dockerfile APP arg from `ui` to `client`
- Strapi had existing docker-compose.yml for postgres/redis only
- Created unified docker-compose.yml at root for full-stack development
- docker-compose.prod.yml had duplicate `restart` keys - fixed

### Completion Notes List

- Client Dockerfile already existed - fixed APP argument
- Strapi Dockerfile already existed - no changes needed
- Created root docker-compose.yml for development (all 4 services)
- Created docker-compose.prod.yml for production with health checks and resource limits
- Created root .env.example with comprehensive production variable documentation
- Created apps/client/.dockerignore
- apps/strapi/.dockerignore already existed
- Both docker-compose files validate successfully
- Manual testing of `docker-compose up` required for full verification

### File List

- apps/client/Dockerfile (modified - fixed APP=client)
- apps/client/.dockerignore (created)
- docker-compose.yml (created - unified development stack)
- docker-compose.prod.yml (created - production deployment)
- .env.example (created - production variables)

### Change Log

- 2025-12-29: Configured Docker and docker-compose for development and production deployment

### Review Findings

From the 2026-08-11 adversarial code review of all stories in `review` status.
Target was the CURRENT codebase audited against this spec's acceptance criteria
(no `baseline_commit`, and the original commits have largely been rewritten).
Only high-severity findings are recorded; see `deferred-work.md` for full detail.

- [ ] [Review][Patch] Root `.dockerignore` omits `.env*` and `.git` — both Dockerfiles `COPY . .` from the repo root, so a local build pulls real secrets and full history into a layer, and `deploy.yml` exports every stage with `cache-to: mode=max`. The per-app `.dockerignore` files are dead: Docker reads only the context root's [.dockerignore]
- [x] [Review][Defer] AC1's Redis service does not exist in any compose file, though `.env.example` and docs/dokploy-setup.md document it fully — operators will provision a Redis nothing connects to [docker-compose.yml:93] — **RESOLVED 2026-08-11: this is now BY DESIGN, not a defect.** Story 2B.10 was deferred post-v1 (`sprint-change-proposal-2026-08-11.md`) and the Redis container was removed from the Epic 1 AC. The `.env.example` and dokploy docs have been reconciled. This AC no longer fails.
- [ ] [Review][Patch] Prod compose passes MAILGUN*\* and omits BREVO*\* entirely, so email fails silently in production [docker-compose.prod.yml:84]
- [ ] [Review][Patch] Client image build likely breaks on a clean checkout — `output: env.NEXT_OUTPUT` is set to `standalone` only in the gitignored `.env.local`, so CI/Dokploy emits no `.next/standalone` and the COPY fails [apps/client/Dockerfile:90]
- [x] [Review][Defer] Dev compose services cannot start: both dev commands resolve to the undeclared global binary `portless` [docker-compose.yml:67] — deferred, pre-existing
- [x] [Review][Defer] Two compose projects both named `tiween` with conflicting Postgres definitions (5432/postgres_data vs 5437/data) [apps/strapi/docker-compose.yml:4] — deferred, pre-existing
