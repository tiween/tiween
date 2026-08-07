/**
 * Proxy gating tests (Story 3.12 purchase gate, Story 7.3 auth gate).
 *
 * The proxy is the ONLY gate for the routable ticketing prototype pages
 * (they have no server-side `notFound()` guard), so its rewrite branch is
 * exercised here with the REAL `isTicketPurchasePath` predicate — only the
 * flag itself is stubbed.
 *
 * The auth branch is observable because the stubbed `withAuth` returns `null`
 * while the stubbed intl middleware returns a response carrying `x-intl` — so
 * "which branch ran" is a fact about the return value, not an assumption.
 */

import { existsSync } from "node:fs"
import path from "node:path"

import { PROXY_LOCATION_REGEXP } from "next/dist/lib/constants"
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import proxy, { config } from "./proxy"

// Next ships no type declarations for its compiled path-to-regexp copy, but it
// is the exact parser `config.matcher` patterns go through in production — so
// the matcher-coverage suite below uses it rather than a hand-rolled regex.
// Required here rather than imported: the import sorter reorders the block
// above and would separate the `@ts-expect-error` from the line it covers.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pathToRegexp } = require("next/dist/compiled/path-to-regexp") as {
  pathToRegexp: (pattern: string) => RegExp
}

const flag = vi.hoisted(() => ({ enabled: false }))

// The HTTPS-redirect layer sits ABOVE every gate below it, so it has to be
// switchable rather than pinned off: the gate suites need it dormant
// (`isDev: true`), its own suite needs it live.
const runtimeEnv = vi.hoisted(() => ({ isDev: true }))

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

// Neutralize the layers below the purchase gate: HTTPS redirect (dormant by
// default via `runtimeEnv.isDev`) and the intl/auth middlewares.
vi.mock("@/lib/general-helpers", () => ({
  isDevelopment: () => runtimeEnv.isDev,
}))
vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { headers: { "x-intl": "1" } }),
}))
vi.mock("next-auth/middleware", () => ({ withAuth: () => () => null }))

// One builder for the whole suite. It always sets `host`, because the HTTPS
// layer reads `req.headers.get("host")` directly — a builder that omitted it
// would make any redirect assertion resolve to the string "https://null/...".
const request = (pathname: string, forwardedProto?: string) =>
  new NextRequest(`https://tiween.tn${pathname}`, {
    headers: {
      host: "tiween.tn",
      ...(forwardedProto ? { "x-forwarded-proto": forwardedProto } : {}),
    },
  })

// `x-middleware-rewrite` is a Next INTERNAL header, and it kept its name
// through the middleware→proxy rename (`next/dist/server/web/spec-extension/
// response.js`, `NextResponse.rewrite`). If a future Next bump renames it in
// step with the convention, this helper is the single place to update.
const rewriteTarget = (res: Response | null) =>
  res?.headers.get("x-middleware-rewrite") ?? null

afterEach(() => {
  flag.enabled = false
  runtimeEnv.isDev = true
})

describe("proxy purchase gating (flag OFF, the default)", () => {
  it.each([
    "/fr/desktop-prototypes/ticketing",
    "/desktop-prototypes/ticketing-quantity",
    "/en/desktop-prototypes/ticketing-summary",
    "/fr/tickets/doc-1/scr-1",
    "/tickets/doc-1/scr-1/payment",
    "/ar/tickets/doc-1/scr-1/payment/result",
  ])("rewrites %s to the 404 path", (path) => {
    const res = proxy(request(path))
    expect(rewriteTarget(res)).toContain("/not-found-404")
  })

  it.each(["/fr/tickets", "/tickets", "/fr/events/doc-1", "/fr"])(
    "leaves non-purchase path %s to the intl middleware",
    (path) => {
      const res = proxy(request(path))
      expect(rewriteTarget(res)).toBeNull()
      expect(res?.headers.get("x-intl")).toBe("1")
    }
  )
})

describe("config.matcher reaches every gated path", () => {
  // The unit tests above call `proxy()` directly, bypassing Next's
  // matcher. But the matcher decides whether the proxy runs AT ALL, and
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
  ])("%s is routed through the proxy", (path) => {
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
    const res = proxy(request(path))
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
    const res = proxy(request(path))
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

describe("HTTPS redirect (production only)", () => {
  // The topmost layer: outside development, anything not already proxied over
  // HTTPS is bounced with a 301 before ANY gate below it runs. Every other
  // suite mocks this branch dormant, so without these cases the layer would be
  // wholly untested — and it is the one layer that can swallow a request.
  it.each([
    ["absent", undefined],
    ["http", "http"],
  ])("301s to https when x-forwarded-proto is %s", (_label, proto) => {
    runtimeEnv.isDev = false
    const res = proxy(request("/fr/events/doc-1", proto))
    expect(res?.status).toBe(301)
    expect(res?.headers.get("location")).toBe(
      "https://tiween.tn/fr/events/doc-1"
    )
  })

  it("falls through to the gates below when already on https", () => {
    runtimeEnv.isDev = false
    const res = proxy(request("/fr/events/doc-1", "https"))
    expect(res?.status).not.toBe(301)
    expect(res?.headers.get("x-intl")).toBe("1")
  })

  it("never redirects in development, whatever the protocol", () => {
    const res = proxy(request("/fr/events/doc-1"))
    expect(res?.status).not.toBe(301)
    expect(res?.headers.get("x-intl")).toBe("1")
  })

  // The layer's defining property is its POSITION, not its output: it must
  // pre-empt the gates below. Asserting only on an ungated path would leave a
  // reordering — redirect moved below the purchase or auth gate — invisible.
  it.each(["/fr/tickets/doc-1/scr-1", "/fr/venue/profile"])(
    "pre-empts the gate on %s rather than gating it",
    (path) => {
      runtimeEnv.isDev = false
      const res = proxy(request(path))
      expect(res?.status).toBe(301)
      expect(rewriteTarget(res)).toBeNull()
    }
  )
})

describe("Next mounts this file as the app's proxy convention", () => {
  // Every other case in this file calls `proxy()` directly, so all of them
  // still pass if the module stops being the app's interceptor — moved to
  // `src/lib/`, or resurrected under the deprecated `src/middleware.ts` name
  // that Next 16 no longer mounts. That failure is silent: an unrecognized
  // file is simply never loaded, so lint, tsc and `next build` all stay green
  // while the ONLY gate on the ticketing prototypes quietly unships.
  //
  // Next's own constant is the oracle, so this cannot drift from the real
  // resolution rule the way a hardcoded path would.
  const clientRoot = path.resolve(__dirname, "..")

  it("lives at a path Next resolves, and has no rival interceptor", () => {
    const interceptors = ["middleware", "proxy"].flatMap((name) =>
      ["src", "."].flatMap((dir) =>
        ["ts", "js"]
          .map((ext) => `${dir}/${name}.${ext}`)
          .filter((rel) => existsSync(path.join(clientRoot, rel)))
      )
    )

    expect(interceptors).toEqual(["src/proxy.ts"])
    expect(new RegExp(`^${PROXY_LOCATION_REGEXP}$`).test("src/proxy")).toBe(
      true
    )
  })
})

describe("proxy purchase gating (flag ON)", () => {
  it.each(["/fr/tickets/doc-1/scr-1", "/fr/desktop-prototypes/ticketing"])(
    "does not rewrite %s",
    (path) => {
      flag.enabled = true
      const res = proxy(request(path))
      expect(rewriteTarget(res)).toBeNull()
      expect(res?.headers.get("x-intl")).toBe("1")
    }
  )
})
