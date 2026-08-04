/**
 * Tests for `ProfilePageClient` (Story 5.5) — proves the watchlist sync section
 * is mounted on the de-facto settings screen.
 *
 * `ProfileForm` and `WatchlistSyncStatus` are mocked to sentinel elements so the
 * page renders standalone; `useCurrentUser`, next-intl, next/navigation, and
 * next-auth are mocked so the page composes without a real session/query.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { pushMock, backMock, signOutAndClearCacheMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  signOutAndClearCacheMock: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}))

vi.mock("@/lib/sign-out", () => ({
  signOutAndClearCache: signOutAndClearCacheMock,
}))

vi.mock("@/hooks/useUser", () => ({
  useCurrentUser: () => ({ isLoading: false }),
}))

vi.mock("./_components/ProfileForm", () => ({
  ProfileForm: () => <div data-testid="profile-form-sentinel" />,
}))

vi.mock("./_components/WatchlistSyncStatus", () => ({
  WatchlistSyncStatus: () => <div data-testid="watchlist-sync-sentinel" />,
}))

vi.mock("./_components/NotificationPreferences", () => ({
  NotificationPreferences: () => (
    <div data-testid="notification-preferences-sentinel" />
  ),
}))

import { ProfilePageClient } from "./ProfilePageClient"

const user = { id: 7, email: "grace@example.com", name: "Grace" }

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ProfilePageClient", () => {
  it("mounts the WatchlistSyncStatus section on the profile page", () => {
    render(<ProfilePageClient locale="fr" regions={[]} user={user} />)

    expect(screen.getByTestId("watchlist-sync-sentinel")).toBeInTheDocument()
  })

  it("still renders the profile form", () => {
    render(<ProfilePageClient locale="fr" regions={[]} user={user} />)

    expect(screen.getByTestId("profile-form-sentinel")).toBeInTheDocument()
  })

  it("mounts the NotificationPreferences section (Story 5.6)", () => {
    render(<ProfilePageClient locale="fr" regions={[]} user={user} />)

    expect(
      screen.getByTestId("notification-preferences-sentinel")
    ).toBeInTheDocument()
  })

  it("signs out through the cache-clearing path, not NextAuth directly (Story 5.8)", () => {
    render(<ProfilePageClient locale="fr" regions={[]} user={user} />)

    fireEvent.click(screen.getByRole("button", { name: /signOut/i }))

    expect(signOutAndClearCacheMock).toHaveBeenCalledWith({
      callbackUrl: "/fr",
    })
  })
})
