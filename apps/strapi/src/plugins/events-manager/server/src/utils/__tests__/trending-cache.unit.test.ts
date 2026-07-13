import { createTrendingCache } from "../trending-cache"

/**
 * Unit tests for the DW-19 trending response cache.
 *
 * The behaviours are all time- or concurrency-sensitive, so we drive them
 * deterministically with an injected mutable clock (`clock`) and jest mock
 * computes — never wall-clock sleeps.
 */

/** A controllable clock: `now()` reads it, `advance(ms)` moves it forward. */
function makeClock(start = 0) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe("createTrendingCache (unit)", () => {
  it("HIT: two within-TTL calls for the same key compute only once", async () => {
    const clock = makeClock()
    const cache = createTrendingCache<string>({ ttlMs: 1000, now: clock.now })
    const compute = jest.fn(async () => "value")

    const first = await cache.getOrCompute("k", compute)
    clock.advance(500) // still inside the 1000ms TTL
    const second = await cache.getOrCompute("k", compute)

    expect(first).toBe("value")
    expect(second).toBe("value")
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it("MISS/EXPIRY: recomputes once the injected clock passes the TTL", async () => {
    const clock = makeClock()
    const cache = createTrendingCache<number>({ ttlMs: 1000, now: clock.now })
    let n = 0
    const compute = jest.fn(async () => ++n)

    const first = await cache.getOrCompute("k", compute)
    clock.advance(1000) // now === expiresAt ⇒ stale (hit requires now < expiresAt)
    const second = await cache.getOrCompute("k", compute)

    expect(first).toBe(1)
    expect(second).toBe(2)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it("SINGLE-FLIGHT: concurrent misses on one key share a single compute", async () => {
    const clock = makeClock()
    const cache = createTrendingCache<string>({ ttlMs: 1000, now: clock.now })

    // A compute we can hold open, so both callers are in-flight simultaneously.
    let resolveCompute: (v: string) => void = () => {}
    const compute = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveCompute = resolve
        })
    )

    const p1 = cache.getOrCompute("k", compute)
    const p2 = cache.getOrCompute("k", compute)
    resolveCompute("shared")

    const [r1, r2] = await Promise.all([p1, p2])

    expect(r1).toBe("shared")
    expect(r2).toBe("shared")
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it("BOUND: evicts oldest settled entries once the store exceeds maxKeys", async () => {
    const clock = makeClock()
    // maxKeys=2 ⇒ after a 3rd distinct key settles, the oldest is evicted.
    const cache = createTrendingCache<string>({
      ttlMs: 10_000,
      now: clock.now,
      maxKeys: 2,
    })
    const compute = jest.fn(async (v: string) => v)

    await cache.getOrCompute("k1", () => compute("k1"))
    await cache.getOrCompute("k2", () => compute("k2"))
    await cache.getOrCompute("k3", () => compute("k3")) // evicts oldest (k1)

    // k2/k3 are still warm hits (no recompute)…
    await cache.getOrCompute("k2", () => compute("k2"))
    await cache.getOrCompute("k3", () => compute("k3"))
    // …but k1 was evicted, so it must recompute.
    await cache.getOrCompute("k1", () => compute("k1"))

    // 3 initial + 1 recompute for the evicted k1 = 4; k2/k3 re-reads were hits.
    expect(compute).toHaveBeenCalledTimes(4)
    expect(compute.mock.calls.filter((c) => c[0] === "k1")).toHaveLength(2)
    expect(compute.mock.calls.filter((c) => c[0] === "k2")).toHaveLength(1)
    expect(compute.mock.calls.filter((c) => c[0] === "k3")).toHaveLength(1)
  })

  it("BOUND: a flood of concurrent distinct-key misses cannot register more than maxKeys in-flight slots", async () => {
    const clock = makeClock()
    // maxKeys=3, and no compute ever settles ⇒ every registered slot stays
    // in-flight (never evictable). The miss-path pre-insert reclaim is the ONLY
    // thing that keeps the Map bounded here; the pre-patch settle-time-only bound
    // would have let all 10 keys register slots.
    const cache = createTrendingCache<string>({
      ttlMs: 10_000,
      now: clock.now,
      maxKeys: 3,
    })

    // Never-settling computes so all callers stay simultaneously in-flight.
    const compute = jest.fn(() => new Promise<string>(() => {}))

    // Wave 1: 10 distinct cold keys fired concurrently (never awaited — they
    // never settle). Only the first `maxKeys` (3) can register a joinable
    // in-flight slot; the other 7 compute WITHOUT registering (bounded overflow).
    for (let i = 0; i < 10; i++) void cache.getOrCompute(`k${i}`, compute)
    expect(compute).toHaveBeenCalledTimes(10) // every distinct key computed once

    // Wave 2: the SAME 10 keys again. The 3 keys that hold in-flight slots JOIN
    // their existing promise (no new compute); the 7 overflow keys have no slot,
    // so they compute again. Exactly 7 new computes ⇒ proves at most 3 slots were
    // ever registered (had the store grown unbounded, all 10 would have joined
    // and produced 0 new computes).
    for (let i = 0; i < 10; i++) void cache.getOrCompute(`k${i}`, compute)
    expect(compute).toHaveBeenCalledTimes(17)
  })

  it("REJECT-RETRY: a rejected compute clears the entry so the next call retries", async () => {
    const clock = makeClock()
    const cache = createTrendingCache<string>({ ttlMs: 1000, now: clock.now })
    const compute = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok")

    await expect(cache.getOrCompute("k", compute)).rejects.toThrow("boom")
    // Failure was not memoized: a subsequent call re-invokes compute.
    const second = await cache.getOrCompute("k", compute)

    expect(second).toBe("ok")
    expect(compute).toHaveBeenCalledTimes(2)
  })
})
