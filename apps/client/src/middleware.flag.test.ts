/**
 * Middleware gating tests (Story 3.12 purchase gate, Story 7.3 auth gate).
 *
 * The middleware is the ONLY gate for the routable ticketing prototype pages
 * (they have no server-side `notFound()` guard), so its rewrite branch is
 * exercised here with the REAL `isTicketPurchasePath` predicate — only the
 * flag itself is stubbed.
 *
 * The auth branch is observable because the stubbed `withAuth` returns `null`
 * while the stubbed intl middleware returns a response carrying `x-intl` — so
 * "which branch ran" is a fact about the return value, not an assumption.
 */

// Next ships no type declarations for its compiled path-to-regexp copy, but it
// is the exact parser `config.matcher` patterns go through in production — so
// the matcher-coverage suite below uses it rather than a hand-rolled regex.
// @ts-expect-error -- untyped compiled module
import { pathToRegexp } from "next/dist/compiled/path-to-regexp"
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import middleware, { config } from "./middleware"

const flag = vi.hoisted(() => ({ enabled: false }))

// Post-validation env shape, driven by the mutable `flag` stub — the real
// `isTicketPurchaseEnabled`/`isTicketPurchasePath` run unmodified on top.
vi.mock("@/env.mjs", () => ({
  get env() {
    return { NEXT_PUBLIC_TICKET_PURCHASE_ENABLED: flag.enabled }
  },
}))

// `./lib/navigation` calls next-intl's `createNavigation` at module scope,
// which the node resolver chokes on here — only `routing.locales` is needed.
vi.mock("./lib/navigation", () => ({
  routing: { locales: ["ar", "fr", "en"], defaultLocale: "fr" },
}))

// Neutralize the layers below the purchase gate: HTTPS redirect (prod-only)
// and the intl/auth middlewares, which are not under test.
vi.mock("@/lib/general-helpers", () => ({ isDevelopment: () => true }))
vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { headers: { "x-intl": "1" } }),
}))
vi.mock("next-auth/middleware", () => ({ withAuth: () => () => null }))

const request = (pathname: string) =>
  new NextRequest(`https://tiween.tn${pathname}`)

const rewriteTarget = (res: Response | null) =>
  res?.headers.get("x-middleware-rewrite") ?? null

afterEach(() => {
  flag.enabled = false
})

describe("middleware purchase gating (flag OFF, the default)", () => {
  it.each([
    "/fr/desktop-prototypes/ticketing",
    "/desktop-prototypes/ticketing-quantity",
    "/en/desktop-prototypes/ticketing-summary",
    "/fr/tickets/doc-1/scr-1",
    "/tickets/doc-1/scr-1/payment",
    "/ar/tickets/doc-1/scr-1/payment/result",
  ])("rewrites %s to the 404 path", (path) => {
    const res = middleware(request(path))
    expect(rewriteTarget(res)).toContain("/not-found-404")
  })

  it.each(["/fr/tickets", "/tickets", "/fr/events/doc-1", "/fr"])(
    "leaves non-purchase path %s to the intl middleware",
    (path) => {
      const res = middleware(request(path))
      expect(rewriteTarget(res)).toBeNull()
      expect(res?.headers.get("x-intl")).toBe("1")
    }
  )
})

describe("config.matcher reaches every gated path", () => {
  // The unit tests above call `middleware()` directly, bypassing Next's
  // matcher. But the matcher decides whether the middleware runs AT ALL, and
  // for the prototype ticketing pages it is the ONLY gate (no server-side
  // `notFound()`). This pins that each gated path — locale-prefixed and
  // unprefixed — matches at least one matcher pattern, so an exclusion added
  // to the catch-all negative lookahead cannot silently unship the gate.
  const matcherRegexes = config.matcher.map((pattern) =>
    pathToRegexp(pattern)
  ) as RegExp[]

  it.each([
    "/fr/tickets/doc-1/scr-1",
    "/tickets/doc-1/scr-1",
    "/ar/tickets/doc-1/scr-1/payment",
    "/tickets/doc-1/scr-1/payment/result",
    "/fr/desktop-prototypes/ticketing",
    "/desktop-prototypes/ticketing-quantity",
    "/en/desktop-prototypes/ticketing-summary",
    "/desktop-prototypes/ticketing-success",
  ])("%s is routed through the middleware", (path) => {
    expect(matcherRegexes.some((regex) => regex.test(path))).toBe(true)
  })
})

describe("auth gating of the /venue subtree (Story 7.3)", () => {
  // The manager surfaces include a DYNAMIC preview route
  // (`/venue/events/[documentId]`) that cannot be enumerated in `authPages`,
  // so the gate is a prefix match. That prefix must cover the whole subtree
  // WITHOUT swallowing `/venues/...` — the PUBLIC venue pages and the venue
  // registration form, which anonymous visitors must still reach. Both halves
  // are asserted here: nothing else in the suite would notice a regex that
  // over- or under-matches.
  it.each([
    "/venue",
    "/venue/profile",
    "/fr/venue/profile",
    "/fr/venue/events",
    "/venue/events/new",
    "/fr/venue/events/abc123",
    "/ar/venue/events/abc123",
  ])("routes %s through the auth middleware", (path) => {
    const res = middleware(request(path))
    expect(res).toBeNull()
  })

  it.each([
    "/venues",
    "/fr/venues",
    "/fr/venues/le-rio",
    "/venues/register",
    "/ar/venues/register",
    "/fr/events/doc-1",
  ])("leaves public path %s to the intl middleware", (path) => {
    const res = middleware(request(path))
    expect(res?.headers.get("x-intl")).toBe("1")
  })

  it("routes every /venue path the matcher lets through", () => {
    const matcherRegexes = config.matcher.map((pattern) =>
      pathToRegexp(pattern)
    ) as RegExp[]

    for (const path of ["/fr/venue/events/abc123", "/venue/events/new"]) {
      expect(matcherRegexes.some((regex) => regex.test(path))).toBe(true)
    }
  })
})

describe("middleware purchase gating (flag ON)", () => {
  it.each(["/fr/tickets/doc-1/scr-1", "/fr/desktop-prototypes/ticketing"])(
    "does not rewrite %s",
    (path) => {
      flag.enabled = true
      const res = middleware(request(path))
      expect(rewriteTarget(res)).toBeNull()
      expect(res?.headers.get("x-intl")).toBe("1")
    }
  )
})
