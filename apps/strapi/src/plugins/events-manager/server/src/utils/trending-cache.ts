/**
 * Short-TTL, single-flight in-memory response cache (DW-19 stopgap).
 *
 * WHY this exists: `findTrending` re-fetches and re-populates up to 500
 * fully-hydrated cinema events and sums+sorts them in JS on EVERY request — an
 * uncached, unauthenticated resource-exhaustion surface. A short TTL collapses a
 * burst of identical requests (the common case: one Next.js SSR caller behind
 * ISR `revalidate`) onto a single compute, and single-flight collapses the
 * *concurrent cold-cache* case so a thundering herd on a cold key still runs the
 * expensive fetch only once. The durable fix (a DB-side materialized rollup) is
 * deliberately deferred — see findTrending / the DW-19 spec.
 *
 * WHY injectable `now`: TTL/expiry is time-dependent, so tests inject a mutable
 * clock to advance past the TTL deterministically instead of sleeping.
 *
 * Plain in-memory Map on purpose: no Redis/ioredis in this stopgap pass. The
 * cache lives in the `eventsService` factory closure (one instance per service),
 * so Strapi's single memoized service shares it across requests in prod while
 * each fresh test service stays isolated. (Per-process ⇒ a multi-replica deploy
 * dilutes the hit rate; a shared Redis store is the same documented upgrade as
 * the rate limiter's.)
 *
 * Bounded on purpose: the key is `locale|page|pageSize` where `page`/`pageSize`
 * are client-controllable, so an adversary (or just wide pagination) could mint
 * unbounded distinct keys. `maxKeys` caps the Map on BOTH the settle path (drop
 * expired, then evict oldest settled) AND the miss path (reclaim room BEFORE
 * registering a new in-flight slot). The miss-path bound matters because a burst
 * of concurrent distinct-key misses each registers its in-flight slot before any
 * compute settles — settle-time eviction alone runs too late to stop the Map
 * growing past `maxKeys` while those computes are outstanding. So the cache can
 * never itself become the memory-exhaustion vector it exists to prevent.
 */

/**
 * A cache slot for one key. At most one of `value`/`inflight` is meaningful at a
 * time: a settled entry carries `value` + `expiresAt`; a pending entry carries
 * `inflight` (the shared compute promise concurrent callers join).
 */
interface CacheEntry<T> {
  /** The settled, cacheable value (present once compute has resolved). */
  value?: T
  /** Epoch ms after which `value` is stale and must be recomputed. */
  expiresAt?: number
  /** The in-flight compute promise concurrent callers join (single-flight). */
  inflight?: Promise<T>
}

export interface TrendingCache<T> {
  /**
   * Return the cached value for `key` if fresh; otherwise run `compute` (once,
   * even under concurrency) and cache its result.
   */
  getOrCompute(key: string, compute: () => Promise<T>): Promise<T>
}

export function createTrendingCache<T>({
  ttlMs,
  now = () => Date.now(),
  maxKeys = 500,
}: {
  ttlMs: number
  /** Injectable clock (epoch ms). Defaults to wall-clock; overridden in tests. */
  now?: () => number
  /**
   * Hard cap on cached keys (memory bound). Legit cardinality is tiny
   * (few locales × page 1 × a few page sizes); the cap only bites under abusive
   * varied-param traffic. Default is generous for real use.
   */
  maxKeys?: number
}): TrendingCache<T> {
  const store = new Map<string, CacheEntry<T>>()

  /**
   * Enforce the size bound after a settle. First drop entries whose TTL has
   * lapsed (cheap, targeted), then — if still over cap — evict oldest SETTLED
   * entries in insertion order (Map preserves it). In-flight entries are left
   * alone so a concurrent single-flight is never severed; already-joined callers
   * hold the promise regardless, so eviction is only ever a cache-efficiency
   * choice, never a correctness one.
   */
  const enforceBound = (): void => {
    if (store.size <= maxKeys) return
    const t = now()
    for (const [k, e] of store) {
      if (e.expiresAt !== undefined && t >= e.expiresAt) store.delete(k)
    }
    if (store.size <= maxKeys) return
    for (const [k, e] of store) {
      if (store.size <= maxKeys) break
      if (e.inflight === undefined) store.delete(k)
    }
  }

  /**
   * Make room for ONE new key before a miss registers its in-flight slot. Same
   * eviction policy as `enforceBound` (drop expired, then oldest settled), but
   * gated on `>= maxKeys` (room for one more) rather than `> maxKeys`. In-flight
   * slots are never evicted — severing a live single-flight would spawn a
   * duplicate compute. Returns whether the store now has room for one more key;
   * `false` means every remaining slot is in-flight, so the caller computes
   * without registering (stays bounded, only forfeits caching for that overflow
   * request).
   */
  const reclaimForInsert = (): boolean => {
    if (store.size < maxKeys) return true
    const t = now()
    for (const [k, e] of store) {
      if (e.expiresAt !== undefined && t >= e.expiresAt) store.delete(k)
    }
    for (const [k, e] of store) {
      if (store.size < maxKeys) break
      if (e.inflight === undefined) store.delete(k)
    }
    return store.size < maxKeys
  }

  return {
    async getOrCompute(key: string, compute: () => Promise<T>): Promise<T> {
      const entry = store.get(key)

      // HIT: a settled value still within its TTL — return it WITHOUT recomputing.
      if (
        entry?.value !== undefined &&
        entry.expiresAt !== undefined &&
        now() < entry.expiresAt
      ) {
        return entry.value
      }

      // JOIN: a compute is already in flight for this key — share its promise so
      // concurrent cold-cache callers collapse onto a single compute.
      if (entry?.inflight) {
        return entry.inflight
      }

      // MISS (or expiry): start the compute, store the promise so concurrent
      // callers join it, and on settle either cache the value (TTL from now, then
      // enforce the size bound) or — on reject — DELETE the slot so the failure is
      // not memoized and the next call retries cleanly.
      //
      // Bound the store BEFORE registering a brand-new key's in-flight slot: a
      // burst of concurrent distinct-key misses would otherwise each `store.set`
      // unconditionally and grow the Map past `maxKeys` (settle-time eviction runs
      // too late, and never evicts in-flight slots). `entry` here is only ever
      // undefined or an expired settled entry; the latter reuses its slot, so only
      // a genuinely new key can grow the store. If reclaim cannot free a slot
      // (everything is in-flight), compute without caching to stay bounded.
      if (!entry && !reclaimForInsert()) {
        return compute()
      }

      const inflight = compute()
        .then((value) => {
          store.set(key, { value, expiresAt: now() + ttlMs })
          enforceBound()
          return value
        })
        .catch((err) => {
          store.delete(key)
          throw err
        })

      store.set(key, { inflight })
      return inflight
    },
  }
}
