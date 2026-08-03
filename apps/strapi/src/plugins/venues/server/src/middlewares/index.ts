import { createRateLimit } from "../../../../../shared/rate-limit"

/**
 * Named plugin middlewares, mirroring the `plugin::<plugin>.<name>` convention
 * used by `plugin::events-manager.trending-rate-limit`. Referenced from a route
 * as `plugin::venues.registration-rate-limit`.
 *
 * WHAT THIS ACTUALLY BOUNDS — read this before tightening the cap.
 *
 * `createRateLimit` keys on `ctx.state?.ip ?? ctx.ip`. Nothing in
 * `apps/strapi/config/*` sets `server.proxy`, and nothing in this codebase
 * populates `ctx.state.ip`, so behind the Next.js proxy every legitimate
 * registration arrives from the SAME address — the Next server's. This limiter
 * is therefore effectively ONE GLOBAL BUCKET, not a per-IP control: the
 * (max+1)-th registration platform-wide inside a window is rejected for
 * everyone, whoever they are.
 *
 * Consequences, deliberately accepted:
 *  - The cap is an ABUSE BACKSTOP for someone hitting Strapi directly
 *    (bypassing the proxy), not a business cap on applications. It is sized
 *    generously (200/hour) so a normal day of legitimate traffic can never
 *    trip it. Lowering it to a "reasonable number of signups" number would
 *    lock the whole platform out.
 *  - The PER-APPLICANT throttle is the Next-layer limiter
 *    (`venueRegistrationLimiter` in `apps/client/src/lib/rate-limit.ts`,
 *    5 / 15 min keyed on the real client IP from `x-forwarded-for`). That is
 *    the one that actually distinguishes callers.
 *  - Making THIS limiter per-IP requires two changes it does not have: setting
 *    `server.proxy` in the Strapi server config (so Koa trusts and parses
 *    `X-Forwarded-For`) and keying on the resulting forwarded IP. Until both
 *    land, treat the number below as a global ceiling.
 *
 * WHY the store is shared across requests: Strapi resolves each factory here
 * ONCE at route registration, so `createRateLimit(...)` runs once and the
 * returned `(ctx, next)` closure (with its in-memory Map) is reused for every
 * request — the counters actually accumulate. `config` comes from the route's
 * `config.middlewares[].config`; the `??` defaults keep it self-standing if a
 * caller attaches it without config.
 */

/**
 * Global ceiling per window. See the module docstring: this is NOT a per-IP
 * budget behind the proxy, so it is sized as an abuse backstop.
 */
const DEFAULT_MAX = 200
const DEFAULT_WINDOW_MS = 3_600_000

export default {
  "registration-rate-limit": (config: any, { strapi: _strapi }: any) =>
    createRateLimit({
      max: config?.max ?? DEFAULT_MAX,
      windowMs: config?.windowMs ?? DEFAULT_WINDOW_MS,
    }),
}
