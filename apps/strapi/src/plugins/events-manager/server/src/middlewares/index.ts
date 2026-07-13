import { createRateLimit } from "./rate-limit"

/**
 * Named plugin middlewares (DW-19), mirroring the `plugin::<plugin>.<name>`
 * convention used by `plugin::user-engagement.is-owner`. Referenced from a route
 * as `plugin::events-manager.trending-rate-limit`.
 *
 * WHY the store is shared across requests: Strapi resolves each factory here
 * ONCE at route registration, so `createRateLimit(...)` runs once and the
 * returned `(ctx, next)` closure (with its in-memory Map) is reused for every
 * request — the per-IP counters actually accumulate. `config` comes from the
 * route's `config.middlewares[].config`; the `?? ` defaults keep it self-standing
 * if a caller attaches it without config.
 */
export default {
  "trending-rate-limit": (config: any, { strapi }: any) =>
    createRateLimit({
      max: config?.max ?? 100,
      windowMs: config?.windowMs ?? 60_000,
    }),
}
