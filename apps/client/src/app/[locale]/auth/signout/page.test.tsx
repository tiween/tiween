/**
 * Tests for `SignOutPage` (Story 5.8).
 *
 * This is the route NextAuth itself is configured to send sign-outs to
 * (`pages.signOut: "/auth/signout"` in `lib/auth.ts`) and the target of the
 * visible Logout link — the primary logout path on a shared device. It must go
 * through `signOutAndClearCache`, which evicts the outgoing user's watchlist
 * entries before NextAuth tears the session down.
 *
 * The ESLint `no-restricted-imports` guard can only catch a call to the WRONG
 * sign-out; nothing but this file catches the call going missing entirely.
 */
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SignOutPage from "./page"

const { signOutAndClearCacheMock, redirectMock, useSessionMock } = vi.hoisted(
  () => ({
    signOutAndClearCacheMock: vi.fn(),
    redirectMock: vi.fn(),
    useSessionMock: vi.fn(),
  })
)

vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))

vi.mock("next-intl", () => ({ useLocale: () => "fr" }))

vi.mock("@/lib/navigation", () => ({ redirect: redirectMock }))

vi.mock("@/lib/sign-out", () => ({
  signOutAndClearCache: signOutAndClearCacheMock,
}))

// Imports `@/env.mjs`, which validates eagerly; the helper is a dev-only no-op.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => undefined,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("SignOutPage", () => {
  it("signs out through the cache-clearing path when a session is present", () => {
    useSessionMock.mockReturnValue({ status: "authenticated" })

    render(<SignOutPage />)

    expect(signOutAndClearCacheMock).toHaveBeenCalledWith({ callbackUrl: "/" })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it("redirects home instead of signing out when there is no session", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated" })

    render(<SignOutPage />)

    expect(signOutAndClearCacheMock).not.toHaveBeenCalled()
    expect(redirectMock).toHaveBeenCalledWith({ href: "/", locale: "fr" })
  })
})
