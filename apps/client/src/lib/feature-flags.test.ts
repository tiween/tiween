/**
 * Feature-flag seam tests (Story 3.12).
 *
 * `isTicketPurchaseEnabled` reads the ALREADY-VALIDATED env (env.mjs coerces
 * the raw string through `optionalZodBoolean`), so here the env module is
 * mocked to its post-validation shape: `true`, `false`, or `undefined`.
 *
 * `isTicketPurchasePath` is the middleware's rewrite predicate — the tests pin
 * the boundary the spec draws: checkout/purchase routes and the ticketing
 * prototypes are gated; `/tickets` exact (Mes Billets viewing) is NOT.
 */
import { describe, expect, it, vi } from "vitest"

import { isTicketPurchaseEnabled, isTicketPurchasePath } from "./feature-flags"

const { envState } = vi.hoisted(() => ({
  envState: {
    env: {} as { NEXT_PUBLIC_TICKET_PURCHASE_ENABLED?: boolean },
  },
}))

vi.mock("@/env.mjs", () => ({
  get env() {
    return envState.env
  },
}))

// `./navigation` calls next-intl's `createNavigation` at module scope, which
// the node resolver chokes on in this environment — only `routing.locales` is
// needed here, so provide it directly.
vi.mock("./navigation", () => ({
  routing: { locales: ["ar", "fr", "en"], defaultLocale: "fr" },
}))

describe("isTicketPurchaseEnabled", () => {
  it("is OFF when the env var is absent (default)", () => {
    envState.env = {}
    expect(isTicketPurchaseEnabled()).toBe(false)
  })

  it("is OFF when validation coerced the value to false", () => {
    envState.env = { NEXT_PUBLIC_TICKET_PURCHASE_ENABLED: false }
    expect(isTicketPurchaseEnabled()).toBe(false)
  })

  it("is ON only when validation produced true", () => {
    envState.env = { NEXT_PUBLIC_TICKET_PURCHASE_ENABLED: true }
    expect(isTicketPurchaseEnabled()).toBe(true)
  })
})

describe("isTicketPurchasePath", () => {
  it.each([
    "/fr/tickets/doc-1/scr-1",
    "/ar/tickets/doc-1/scr-1/",
    "/en/tickets/doc-1/scr-1/payment",
    "/fr/tickets/doc-1/scr-1/payment/result",
    // `localePrefix: "as-needed"` — the default locale ships unprefixed URLs.
    "/tickets/doc-1/scr-1",
    "/tickets/doc-1/scr-1/payment",
    "/fr/desktop-prototypes/ticketing",
    "/desktop-prototypes/ticketing-quantity",
    "/en/desktop-prototypes/ticketing-summary",
    "/desktop-prototypes/ticketing-success",
  ])("gates purchase route %s", (pathname) => {
    expect(isTicketPurchasePath(pathname)).toBe(true)
  })

  it.each([
    // Mes Billets (viewing, Story 6.4) — never a purchase entry point.
    "/fr/tickets",
    "/tickets",
    "/ar/tickets/",
    // Not a routable purchase page (only two segments deep).
    "/fr/tickets/doc-1",
    // Discovery stays fully reachable.
    "/fr/events/evt-1",
    "/fr/venues/le-rio",
    // Non-ticketing prototypes stay routable.
    "/fr/desktop-prototypes/film-detail",
    "/desktop-prototypes/my-events",
    "/fr/desktop-prototypes",
  ])("leaves %s untouched", (pathname) => {
    expect(isTicketPurchasePath(pathname)).toBe(false)
  })
})
