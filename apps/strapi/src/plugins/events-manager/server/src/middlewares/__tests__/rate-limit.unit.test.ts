import { createRateLimit } from "../rate-limit"

/**
 * Unit tests for the DW-19 per-IP fixed-window rate limiter.
 *
 * Window reset is time-dependent, so we drive it with an injected mutable clock
 * (`clock`) and a fresh mock `ctx` per call — never wall-clock sleeps.
 */

function makeClock(start = 0) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

/** Fresh Koa-ish ctx per request (mirrors the middleware's `ctx: any` shape). */
function makeCtx(ip: string) {
  return {
    ip,
    state: {} as Record<string, unknown>,
    status: 200,
    set: jest.fn(),
    body: undefined as unknown,
  }
}

describe("createRateLimit (unit)", () => {
  it("under the limit: increments and calls next()", async () => {
    const clock = makeClock()
    const limit = createRateLimit({ max: 3, windowMs: 1000, now: clock.now })

    for (let i = 0; i < 3; i++) {
      const ctx = makeCtx("1.1.1.1")
      const next = jest.fn(async () => {})
      await limit(ctx, next)
      expect(next).toHaveBeenCalledTimes(1)
      expect(ctx.status).toBe(200)
    }
  })

  it("the (max+1)-th call in-window returns 429 with Retry-After + code, no next()", async () => {
    const clock = makeClock()
    const limit = createRateLimit({ max: 2, windowMs: 1000, now: clock.now })

    for (let i = 0; i < 2; i++) {
      await limit(
        makeCtx("2.2.2.2"),
        jest.fn(async () => {})
      )
    }

    const ctx = makeCtx("2.2.2.2")
    const next = jest.fn(async () => {})
    await limit(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(ctx.status).toBe(429)
    // Exact value, not just presence: window is 1000ms and the clock has not
    // advanced since it opened ⇒ ceil(1000/1000) = 1 second until reset.
    expect(ctx.set).toHaveBeenCalledWith("Retry-After", "1")
    expect(ctx.body).toEqual({
      error: {
        status: 429,
        name: "TooManyRequestsError",
        message: "RATE_LIMITED",
      },
    })
  })

  it("Retry-After reflects the time remaining in the window", async () => {
    const clock = makeClock()
    const limit = createRateLimit({ max: 1, windowMs: 10_000, now: clock.now })

    await limit(
      makeCtx("9.9.9.9"),
      jest.fn(async () => {})
    ) // opens window at t=0
    clock.advance(3_000) // 3s elapsed ⇒ 7s remain ⇒ ceil(7000/1000) = 7

    const ctx = makeCtx("9.9.9.9")
    await limit(
      ctx,
      jest.fn(async () => {})
    )

    expect(ctx.status).toBe(429)
    expect(ctx.set).toHaveBeenCalledWith("Retry-After", "7")
  })

  it("resets the counter once the injected clock passes the window", async () => {
    const clock = makeClock()
    const limit = createRateLimit({ max: 1, windowMs: 1000, now: clock.now })

    await limit(
      makeCtx("3.3.3.3"),
      jest.fn(async () => {})
    )

    // Second call in-window is blocked…
    const blocked = makeCtx("3.3.3.3")
    const blockedNext = jest.fn(async () => {})
    await limit(blocked, blockedNext)
    expect(blocked.status).toBe(429)
    expect(blockedNext).not.toHaveBeenCalled()

    // …but after the window elapses the counter resets and next() runs again.
    clock.advance(1000)
    const fresh = makeCtx("3.3.3.3")
    const freshNext = jest.fn(async () => {})
    await limit(fresh, freshNext)
    expect(fresh.status).toBe(200)
    expect(freshNext).toHaveBeenCalledTimes(1)
  })

  it("limits two different ctx.ip keys independently", async () => {
    const clock = makeClock()
    const limit = createRateLimit({ max: 1, windowMs: 1000, now: clock.now })

    // A exhausts its budget…
    await limit(
      makeCtx("a"),
      jest.fn(async () => {})
    )
    const aBlocked = makeCtx("a")
    await limit(
      aBlocked,
      jest.fn(async () => {})
    )
    expect(aBlocked.status).toBe(429)

    // …while B still has its own fresh budget.
    const b = makeCtx("b")
    const bNext = jest.fn(async () => {})
    await limit(b, bNext)
    expect(b.status).toBe(200)
    expect(bNext).toHaveBeenCalledTimes(1)
  })

  it("hard-evicts oldest live windows so a distinct-key flood cannot grow unbounded", async () => {
    const clock = makeClock()
    // maxKeys=1, no clock advance ⇒ nothing ever expires; the ONLY way memory
    // stays bounded is the hard oldest-eviction path.
    const limit = createRateLimit({
      max: 1,
      windowMs: 10_000,
      now: clock.now,
      maxKeys: 1,
    })

    // "a" exhausts its single-request budget.
    await limit(
      makeCtx("a"),
      jest.fn(async () => {})
    )
    const aBlocked = makeCtx("a")
    await limit(
      aBlocked,
      jest.fn(async () => {})
    )
    expect(aBlocked.status).toBe(429)

    // A different live key pushes the store over maxKeys…
    await limit(
      makeCtx("b"),
      jest.fn(async () => {})
    )

    // …which hard-evicts the oldest ("a") even though its window is still live,
    // so "a" gets a fresh budget again (proves the bound reclaimed a live entry
    // — otherwise the Map would grow unbounded under a spoofed-IP flood).
    const aAgain = makeCtx("a")
    const aNext = jest.fn(async () => {})
    await limit(aAgain, aNext)
    expect(aAgain.status).toBe(200)
    expect(aNext).toHaveBeenCalledTimes(1)
  })
})
