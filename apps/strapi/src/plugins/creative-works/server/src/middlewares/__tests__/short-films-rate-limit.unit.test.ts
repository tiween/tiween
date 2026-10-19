import middlewares from "../index"

/**
 * Unit tests for the named `short-films-rate-limit` plugin middleware. The
 * limiter itself is covered by the shared `createRateLimit` suite; this pins
 * the factory wiring: config is honored, defaults are the generous 600/60 s
 * cap, and an over-the-cap request answers 429 RATE_LIMITED + Retry-After.
 */

const factory = (middlewares as Record<string, (...args: any[]) => any>)[
  "short-films-rate-limit"
]

function makeCtx(ip = "1.1.1.1") {
  return {
    ip,
    state: {} as Record<string, unknown>,
    status: 200,
    set: jest.fn(),
    body: undefined as any,
  }
}

describe("short-films-rate-limit middleware (unit)", () => {
  it("is exported under the name the routes reference", () => {
    expect(typeof factory).toBe("function")
  })

  it("lets requests under the cap through and rejects the one over it with 429", async () => {
    const limit = factory({ max: 2, windowMs: 60000 }, { strapi: {} })
    const next = jest.fn(async () => {})

    const first = makeCtx()
    await limit(first, next)
    const second = makeCtx()
    await limit(second, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const third = makeCtx()
    await limit(third, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(third.status).toBe(429)
    expect(third.body.error.message).toBe("RATE_LIMITED")
    expect(third.set).toHaveBeenCalledWith("Retry-After", expect.any(String))
  })

  it("keeps a separate counter per key", async () => {
    const limit = factory({ max: 1, windowMs: 60000 }, { strapi: {} })
    const next = jest.fn(async () => {})

    await limit(makeCtx("1.1.1.1"), next)
    const other = makeCtx("2.2.2.2")
    await limit(other, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(other.status).toBe(200)
  })

  it("builds a middleware from defaults when the route passes no config", async () => {
    const limit = factory(undefined, { strapi: {} })
    expect(typeof limit).toBe("function")

    // The default cap is 600: the first request is never throttled.
    const next = jest.fn(async () => {})
    const ctx = makeCtx()
    await limit(ctx, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(ctx.status).toBe(200)
  })
})
