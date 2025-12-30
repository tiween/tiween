# Story 2B.10: Redis Integration for Sessions and Caching

Status: review

---

## Story

As a **developer**,
I want to integrate Redis for session management and caching,
So that the application has fast session handling and cache invalidation.

## Acceptance Criteria

1. **AC#1**: Redis connection is configured in a dedicated config file
2. **AC#2**: Docker compose includes Redis service for local development
3. **AC#3**: REST API caching middleware is configured using `@strapi-community/plugin-rest-cache`
4. **AC#4**: Cache invalidation hooks are set for content updates (automatic via plugin)
5. **AC#5**: Environment variables document Redis configuration
6. **AC#6**: Connection pooling and error handling are configured appropriately
7. **AC#7**: Health check endpoint is available for Redis connectivity

## Tasks / Subtasks

- [x] **Task 1: Add Redis to Docker Compose** (AC: #2)

  - [x] 1.1 Add Redis 7.x service to docker-compose.yml
  - [x] 1.2 Configure Redis network to connect with Strapi
  - [x] 1.3 Add Redis data volume for persistence

- [x] **Task 2: Add Redis Environment Variables** (AC: #5)

  - [x] 2.1 Add REDIS_HOST to .env.example
  - [x] 2.2 Add REDIS_PORT to .env.example
  - [x] 2.3 Add REDIS_PASSWORD (optional) to .env.example
  - [x] 2.4 Add REDIS_DB to .env.example
  - [x] 2.5 Add CACHE_ENABLED toggle to .env.example

- [x] **Task 3: Install Redis Dependencies** (AC: #1, #3)

  - [x] 3.1 Install `@strapi-community/plugin-rest-cache` for API caching
  - [x] 3.2 Install `@strapi-community/provider-rest-cache-redis` for Redis storage
  - [x] 3.3 Install `ioredis` for direct Redis client access

- [x] **Task 4: Create Redis Configuration** (AC: #1, #6)

  - [x] 4.1 Create config/redis.ts with connection settings
  - [x] 4.2 Configure connection pooling options
  - [x] 4.3 Add error handling and reconnection logic
  - [x] 4.4 Export Redis client for use in services

- [x] **Task 5: Configure REST Cache Plugin** (AC: #3, #4)

  - [x] 5.1 Add rest-cache plugin to config/plugins.ts
  - [x] 5.2 Configure Redis as cache provider
  - [x] 5.3 Define caching strategies for public content-types
  - [x] 5.4 Set appropriate TTL values for different content types

- [x] **Task 6: Create Health Check Endpoint** (AC: #7)

  - [x] 6.1 Create custom route for Redis health check
  - [x] 6.2 Implement controller to test Redis connectivity
  - [x] 6.3 Return appropriate status codes

- [x] **Task 7: Verify Build**
  - [x] 7.1 Ensure no build errors
  - [x] 7.2 Generate TypeScript types

---

## Dev Notes

### Architecture Decision Reference

From `core-architectural-decisions.md`:

```
Cache Layer: Redis 7.x - Session management, ticket inventory locks, rate limiting
Data Flow: Browser (IndexedDB) ←→ Next.js (SWR) ←→ Redis (cache) ←→ Strapi ←→ PostgreSQL
```

### Redis Use Cases in Tiween

1. **API Response Caching**: Cache GET requests for events, venues, creative works
2. **Session Management**: Store user sessions (future - currently JWT-based)
3. **Ticket Inventory Locks**: Temporary locks during checkout (Epic 6)
4. **Rate Limiting**: API request throttling (future)
5. **Real-time Data**: WebSocket session data (Epic 6-8)

### Strapi v5 REST Cache Plugin

The official community plugin for Strapi v5:

- Package: `@strapi-community/plugin-rest-cache`
- Provider: `@strapi-community/provider-rest-cache-redis`

**Features:**

- Automatic cache invalidation on content changes
- Fine-grained control via strategies (content type, routes, query params)
- Supports Redis, in-memory, or custom providers
- Middleware injection for seamless integration

### Caching Strategy

| Content-Type  | TTL    | Notes                       |
| ------------- | ------ | --------------------------- |
| Event         | 5 min  | Frequently updated          |
| Venue         | 15 min | Rarely changes              |
| Creative Work | 30 min | Static content              |
| Genre         | 60 min | Reference data              |
| Category      | 60 min | Reference data              |
| Region        | 60 min | Reference data              |
| City          | 60 min | Reference data              |
| Person        | 30 min | Rarely changes              |
| Showtime      | 2 min  | Ticket availability changes |

### Redis Configuration

```typescript
// config/redis.ts
import Redis from "ioredis"

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true,
}

export const redis = new Redis(redisConfig)
export default redisConfig
```

### Plugin Configuration

```typescript
// config/plugins.ts
export default ({ env }) => ({
  "rest-cache": {
    enabled: env.bool("CACHE_ENABLED", true),
    config: {
      provider: {
        name: "redis",
        options: {
          max: 32767,
          connection: {
            host: env("REDIS_HOST", "localhost"),
            port: env.int("REDIS_PORT", 6379),
            password: env("REDIS_PASSWORD", undefined),
            db: env.int("REDIS_DB", 0),
          },
        },
      },
      strategy: {
        enableEtagSupport: true,
        enableXCacheHeaders: true,
        clearRelatedCache: true,
        maxAge: 300000, // 5 minutes default
        contentTypes: [
          // Public read-only content with caching
          "api::event.event",
          "api::venue.venue",
          "api::creative-work.creative-work",
          "api::showtime.showtime",
          "api::person.person",
          "api::genre.genre",
          "api::category.category",
          "api::region.region",
          "api::city.city",
        ],
      },
    },
  },
})
```

### Docker Compose Redis Service

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
  networks:
    - db_network
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Health Check Endpoint

```typescript
// src/api/health/controllers/health.ts
import { redis } from "../../../../config/redis"

// src/api/health/routes/health.ts
export default {
  routes: [
    {
      method: "GET",
      path: "/health/redis",
      handler: "health.redis",
      config: {
        auth: false,
      },
    },
  ],
}

export default {
  async redis(ctx) {
    try {
      await redis.ping()
      ctx.body = { status: "ok", service: "redis" }
    } catch (error) {
      ctx.status = 503
      ctx.body = { status: "error", service: "redis", message: error.message }
    }
  },
}
```

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache toggle (disable in development if needed)
CACHE_ENABLED=true
```

### Graceful Degradation

If Redis is unavailable:

1. REST Cache plugin falls back to no-cache behavior
2. Application continues to function (slower but operational)
3. Logs warning about Redis connection failure
4. Health check returns 503 for monitoring

### Testing Redis Connection

```bash
# Start Redis via Docker
docker compose up -d redis

# Test connection
docker exec -it tiween-redis-1 redis-cli ping
# Expected: PONG

# Monitor cache activity
docker exec -it tiween-redis-1 redis-cli monitor
```

### References

- [Strapi REST Cache Plugin v5](https://strapi.io/blog/strapi-rest-cache-plugin-now-supports-strapi-v5)
- [Strapi Redis Integration](https://strapi.io/integrations/redis)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.10]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Added Redis 7-alpine service to docker-compose.yml with health check and persistence volume
- Added Redis environment variables to .env.example (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB, CACHE_ENABLED)
- Installed `ioredis`, `@strapi-community/plugin-rest-cache`, and `@strapi-community/provider-rest-cache-redis`
- Created `config/redis.ts` with connection settings, retry strategy, and health check utilities
- Configured REST Cache plugin with content-type specific TTLs:
  - Events: 5 min, Venues: 15 min, Creative Works: 30 min
  - Showtimes: 2 min (ticket availability), Reference data: 60 min
- Created health check API endpoints at `/api/health` and `/api/health/redis`
- Plugin automatically invalidates cache on content updates
- Build verified successfully, TypeScript types generated

### File List

- `apps/strapi/docker-compose.yml` - Added Redis service
- `apps/strapi/.env.example` - Added Redis environment variables
- `apps/strapi/config/redis.ts` - Redis client configuration
- `apps/strapi/config/plugins.ts` - REST Cache plugin configuration
- `apps/strapi/src/api/health/controllers/health.ts` - Health check controller
- `apps/strapi/src/api/health/routes/health.ts` - Health check routes
