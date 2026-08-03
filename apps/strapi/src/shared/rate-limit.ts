/**
 * Shared per-IP fixed-window rate limiter (originally the DW-19 stopgap for
 * `/events/trending`; promoted into the shared server kit by story 7.1 so the
 * venues plugin can throttle `POST /venues/register` without importing another
 * plugin's internals).
 *
 * WHY a secondary defense: the cache + single-flight in `findTrending` is the
 * primary exhaustion mitigation (it protects regardless of caller IP). This
 * limiter bounds crude *direct* abuse of the public, unauthenticated route. The
 * default 100/min/IP is deliberately generous so the single Next.js SSR caller
 * (already behind ISR `revalidate` + the response cache) is never throttled,
 * while a scripted hammer on the raw route is still capped.
 *
 * WHY fixed window (not sliding/token-bucket): it is the simplest correct bound
 * with no new deps, and precise fairness is not needed for a stopgap. WHY
 * injectable `now`: window reset is time-dependent, so tests advance a mutable
 * clock past `windowMs` deterministically instead of sleeping.
 *
 * Multi-instance correctness (a shared Redis store) and X-Forwarded-For trust
 * (via `server.proxy`) are the documented upgrade — out of scope for this
 * single-instance stopgap. Plain in-memory Map, bounded by `maxKeys`.
 *
 * `ctx`/`next` are typed `any` to mirror this repo's controller/middleware
 * boundary convention (Strapi's Koa context is not statically typed here).
 */

/** One key's fixed-window counter. */
interface WindowState {
  /** Requests seen in the current window for this key. */
  count: number
  /** Epoch ms at which the current window ends and the counter resets. */
  resetAt: number
}

export function createRateLimit({
  max,
  windowMs,
  now = () => Date.now(),
  maxKeys = 10_000,
}: {
  /** Max requests permitted per key within one window. */
  max: number
  /** Window length in ms. */
  windowMs: number
  /** Injectable clock (epoch ms). Defaults to wall-clock; overridden in tests. */
  now?: () => number
  /** Store-size threshold above which expired entries are swept (memory bound). */
  maxKeys?: number
}) {
  const store = new Map<string, WindowState>()

  return async (ctx: any, next: any) => {
    const nowMs = now()

    // Memory bound: only when the store outgrows `maxKeys` do we pay a sweep.
    // First drop expired windows (cheap, targeted). Then HARD-evict oldest
    // windows if a flood of *live* keys (e.g. spoofed X-Forwarded-For) keeps us
    // over cap — otherwise the sweep frees nothing and the Map grows without
    // bound. Evicting a live window only means that key gets a fresh budget next
    // time; under an active flood that is the correct memory-vs-precision trade.
    if (store.size > maxKeys) {
      for (const [key, state] of store) {
        if (nowMs >= state.resetAt) store.delete(key)
      }
      if (store.size > maxKeys) {
        for (const key of store.keys()) {
          if (store.size <= maxKeys) break
          store.delete(key)
        }
      }
    }

    // Prefer an upstream-resolved `ctx.state.ip` (where a proxy-trust layer would
    // place the real client IP) before Koa's `ctx.ip`; fall back to a shared
    // "unknown" bucket so a request with no IP is still bounded, never crashes.
    const key = ctx.state?.ip ?? ctx.ip ?? "unknown"

    const state = store.get(key)

    // No window yet, or the previous window has elapsed: start a fresh window.
    if (!state || nowMs >= state.resetAt) {
      store.set(key, { count: 1, resetAt: nowMs + windowMs })
      await next()
      return
    }

    // At/over the limit inside the live window: reject WITHOUT running the
    // handler. Return an error CODE (never prose) per the project error rules;
    // `Retry-After` tells a well-behaved client when the window frees up.
    if (state.count >= max) {
      const retryAfterSeconds = Math.ceil((state.resetAt - nowMs) / 1000)
      ctx.status = 429
      ctx.set("Retry-After", String(retryAfterSeconds))
      ctx.body = {
        error: {
          status: 429,
          name: "TooManyRequestsError",
          message: "RATE_LIMITED",
        },
      }
      return
    }

    // Under the limit: count this request and let the handler run.
    state.count += 1
    await next()
  }
}
