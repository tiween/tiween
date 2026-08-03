/**
 * Tests for the private-proxy endpoint allowlist (Story 4.4 security boundary).
 *
 * `isStrapiEndpointAllowed` gates which Strapi paths the private proxy will
 * forward. The Story-4.4 change adds a self-scoped `PUT api/users/me` and the
 * avatar/email-change POSTs, and MUST NOT expose the stock `PUT api/users/:id`
 * (arbitrary id + fields). These assertions fail if a regression widens the
 * allowlist (e.g. adding `api/users`, which `startsWith` would let match
 * `api/users/5`).
 *
 * The module pulls in `@/env.mjs`, `next-auth/react`, and `@/lib/auth` at load
 * time (used only inside other exports); they are mocked so importing the pure
 * matcher has no side effects.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import { isStrapiEndpointAllowed } from "./request-auth"

vi.mock("@/env.mjs", () => ({ env: {} }))
vi.mock("next-auth/react", () => ({ getSession: vi.fn() }))
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }))

describe("isStrapiEndpointAllowed (Story 4.4 profile endpoints)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("allows the self-scoped PUT api/users/me", () => {
    expect(isStrapiEndpointAllowed("api/users/me", "PUT")).toBe(true)
  })

  it("does NOT expose the stock PUT api/users/:id (privilege-escalation guard)", () => {
    expect(isStrapiEndpointAllowed("api/users/5", "PUT")).toBe(false)
    expect(isStrapiEndpointAllowed("api/users", "PUT")).toBe(false)
  })

  it("allows the avatar upload and the two email-change POSTs", () => {
    expect(isStrapiEndpointAllowed("api/upload", "POST")).toBe(true)
    expect(isStrapiEndpointAllowed("api/auth/change-email", "POST")).toBe(true)
    expect(
      isStrapiEndpointAllowed("api/auth/confirm-email-change", "POST")
    ).toBe(true)
  })

  it("does not allow the profile paths under the wrong method", () => {
    expect(isStrapiEndpointAllowed("api/users/me", "DELETE")).toBe(false)
    expect(isStrapiEndpointAllowed("api/upload", "PUT")).toBe(false)
  })
})

describe("isStrapiEndpointAllowed (Story 5.1 watchlist endpoints)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("allows the watchlist GET (list + check/:id via startsWith)", () => {
    expect(
      isStrapiEndpointAllowed("api/user-engagement/watchlist", "GET")
    ).toBe(true)
    expect(
      isStrapiEndpointAllowed("api/user-engagement/watchlist/check/cw-1", "GET")
    ).toBe(true)
  })

  it("allows the watchlist POST (add + toggle via startsWith)", () => {
    expect(
      isStrapiEndpointAllowed("api/user-engagement/watchlist", "POST")
    ).toBe(true)
  })

  it("allows the watchlist DELETE (hard remove, Story 5.2) via startsWith", () => {
    expect(
      isStrapiEndpointAllowed("api/user-engagement/watchlist/abc", "DELETE")
    ).toBe(true)
  })

  it("does NOT open DELETE for a non-watchlist endpoint", () => {
    expect(isStrapiEndpointAllowed("api/events-manager/events", "DELETE")).toBe(
      false
    )
  })
})

describe("isStrapiEndpointAllowed (Story 6.1 ticket-tiers endpoint)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("allows the public ticket-tiers GET (via startsWith on the showtimes prefix)", () => {
    expect(
      isStrapiEndpointAllowed(
        "api/events-manager/showtimes/sc-1/ticket-tiers",
        "GET"
      )
    ).toBe(true)
  })

  it("does NOT open the showtimes prefix for write methods", () => {
    expect(
      isStrapiEndpointAllowed(
        "api/events-manager/showtimes/sc-1/ticket-tiers",
        "POST"
      )
    ).toBe(false)
    expect(
      isStrapiEndpointAllowed(
        "api/events-manager/showtimes/sc-1/ticket-tiers",
        "DELETE"
      )
    ).toBe(false)
  })
})

describe("isStrapiEndpointAllowed (Story 7.2 venue-profile endpoints)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("allows the three venue-profile routes under their OWN methods", () => {
    expect(isStrapiEndpointAllowed("api/venues/venues/me", "GET")).toBe(true)
    expect(isStrapiEndpointAllowed("api/venues/venues/me", "PUT")).toBe(true)
    expect(
      isStrapiEndpointAllowed("api/venues/venues/property-definitions", "GET")
    ).toBe(true)
  })

  it("allows the upload the media pickers POST to", () => {
    expect(isStrapiEndpointAllowed("api/upload", "POST")).toBe(true)
  })

  it("does NOT open the profile routes under the wrong method", () => {
    expect(isStrapiEndpointAllowed("api/venues/venues/me", "POST")).toBe(false)
    expect(isStrapiEndpointAllowed("api/venues/venues/me", "DELETE")).toBe(
      false
    )
    expect(
      isStrapiEndpointAllowed("api/venues/venues/property-definitions", "PUT")
    ).toBe(false)
  })

  it("does NOT open the venues collection or a venue by id", () => {
    // The allowlist entries are venue-manager SELF-scoped routes; the generic
    // collection would hand the private proxy an arbitrary-id write.
    expect(isStrapiEndpointAllowed("api/venues/venues", "PUT")).toBe(false)
    expect(isStrapiEndpointAllowed("api/venues/venues/abc123", "PUT")).toBe(
      false
    )
    expect(isStrapiEndpointAllowed("api/venues/venues", "GET")).toBe(false)
  })
})
