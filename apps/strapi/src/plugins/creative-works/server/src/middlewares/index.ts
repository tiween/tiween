import { createRateLimit } from "../../../../../shared/rate-limit"

/**
 * Named plugin middlewares, mirroring the `plugin::<plugin>.<name>` convention
 * used by `plugin::events-manager.trending-rate-limit`. Referenced from the
 * short-films routes as `plugin::creative-works.short-films-rate-limit`.
 *
 * WHY 600 requests per 60 s per key (research Pitfall 10): behind the Dokploy
 * proxy every caller may share one IP, and the main caller is the Next.js
 * server, whose static generation in Phase 2 can burst roughly
 * films x 3 locales x 2 reads. The cap bounds crude direct abuse of the public,
 * unauthenticated routes without ever throttling that caller; pageSize <= 48
 * bounds the cost of each request.
 *
 * WHY the counters accumulate: Strapi resolves each factory ONCE per route at
 * registration, so every route gets its own limiter whose in-memory Map is
 * reused for all of that route's requests.
 */
export default {
  "short-films-rate-limit": (config: any, { strapi: _strapi }: any) =>
    createRateLimit({
      max: config?.max ?? 600,
      windowMs: config?.windowMs ?? 60_000,
    }),
}
