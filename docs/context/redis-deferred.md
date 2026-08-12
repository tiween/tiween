---
type: landmine
title: Redis deferred post-v1; v1 is single-instance
description: Why in-process rate limiting and caching are correct, and what breaks if you "fix" them
tags: [deployment, caching, deferral]
verified: 2026-08-12
sources: [docker-compose.prod.yml, apps/strapi/src/shared/rate-limit.ts, .env.example]

---

v1 ships without Redis, by decision. Sessions are stateless JWT and need no store;
ticket inventory locks are PostgreSQL-atomic.

v1 runs `replicas: 1` (`docker-compose.prod.yml:39` client, `:104` strapi). The
per-IP fixed-window limiter (`apps/strapi/src/shared/rate-limit.ts`) and the 30s
trending cache
(`apps/strapi/src/plugins/events-manager/server/src/utils/trending-cache.ts`) are
in-process and correct only under that assumption.

Scaling past one replica without Redis multiplies every rate limit by N, gives each
instance a divergent trending cache, and confines cache invalidation to the instance
that handled the write. Adding Redis to "fix" the limiter or cache reverses a
deliberate decision. `.env.example:20-27` states the same rule.
