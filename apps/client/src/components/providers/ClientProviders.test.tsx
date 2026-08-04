/**
 * Tests for `ClientProviders` (Story 5.8).
 *
 * The sign-out cache eviction (`signOutAndClearCache`) only works because the
 * provider hands the tree the SAME client that `getQueryClient()` returns. That
 * is a one-line invariant with no other guard: reverting it to a locally
 * created `new QueryClient()` leaves every watchlist test green while sign-out
 * clears a cache no component reads. This pins it.
 *
 * The heavy providers (`next-auth`, `next-themes`) and the watchlist drain are
 * mocked so the tree renders standalone without touching env or Strapi.
 */
import * as React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { useQueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

const { useSessionMock, signOutAndClearCacheMock, useWatchlistSyncMock } =
  vi.hoisted(() => ({
    useSessionMock: vi.fn(() => ({ data: undefined, status: "loading" })),
    signOutAndClearCacheMock: vi.fn(),
    useWatchlistSyncMock: vi.fn(),
  }))

vi.mock("next-auth/react", () => ({
  useSession: useSessionMock,
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock("@/features/events/hooks/useWatchlistSync", () => ({
  useWatchlistSync: useWatchlistSyncMock,
}))
vi.mock("@/lib/general-helpers", () => ({ setupLibraries: vi.fn() }))
vi.mock("@/hooks/useTranslatedZod", () => ({ useTranslatedZod: vi.fn() }))
vi.mock("@/lib/sign-out", () => ({
  signOutAndClearCache: signOutAndClearCacheMock,
}))

import { getQueryClient } from "@/lib/query-client"

import { ClientProviders } from "./ClientProviders"

/** Reports whether the client it receives from context is the shared one. */
function ClientProbe() {
  const client = useQueryClient()
  return (
    <span data-testid="probe">
      {client === getQueryClient() ? "shared" : "local"}
    </span>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ClientProviders", () => {
  it("hands the tree the shared query client that sign-out evicts from", () => {
    render(
      <ClientProviders>
        <ClientProbe />
      </ClientProviders>
    )

    expect(screen.getByTestId("probe")).toHaveTextContent("shared")
  })

  it("routes the invalid-token auto-logout through the cache-clearing sign-out", () => {
    useSessionMock.mockReturnValue({
      data: { error: "invalid_strapi_token" },
      status: "authenticated",
    })

    render(
      <ClientProviders>
        <span />
      </ClientProviders>
    )

    expect(signOutAndClearCacheMock).toHaveBeenCalledWith({
      callbackUrl: "/auth/signin",
    })
  })
})
