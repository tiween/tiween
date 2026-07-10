/**
 * Tests for the profile-page `WatchlistSyncStatus` section (Story 5.5).
 *
 * `useWatchlistSyncStatus` (the data source) and `formatRelativeTime` are mocked
 * so each presentational branch is controlled directly. next-intl echoes keys,
 * except `lastSynced`/`pendingChanges` which surface their param so the wiring
 * (relative-time output, pending count) is actually asserted.
 */
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { useWatchlistSyncStatusMock, formatRelativeTimeMock } = vi.hoisted(
  () => ({
    useWatchlistSyncStatusMock: vi.fn(),
    formatRelativeTimeMock: vi.fn(() => "RELATIVE_TIME"),
  })
)

vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, values?: Record<string, unknown>) => {
      if (key === "lastSynced" && values) return `lastSynced ${values.time}`
      // Surface `display` (the Western-numeral count), NOT the raw `count`, so
      // the numeral-safe wiring is asserted.
      if (key === "pendingChanges" && values)
        return `pendingChanges ${values.display}`
      return key
    },
  useLocale: () => "fr",
}))

vi.mock("@/lib/dates", () => ({
  formatRelativeTime: (...args: unknown[]) => formatRelativeTimeMock(...args),
}))

vi.mock("@/features/events/hooks/useWatchlistSyncStatus", () => ({
  useWatchlistSyncStatus: useWatchlistSyncStatusMock,
}))

import { WatchlistSyncStatus, formatCount } from "./WatchlistSyncStatus"

beforeEach(() => {
  vi.clearAllMocks()
  useWatchlistSyncStatusMock.mockReturnValue({
    isOnline: true,
    lastSyncedAt: "2026-07-10T09:00:00.000Z",
    pendingCount: 0,
  })
})

describe("WatchlistSyncStatus", () => {
  it("renders the section title", () => {
    render(<WatchlistSyncStatus />)
    expect(screen.getByText("syncStatusTitle")).toBeInTheDocument()
  })

  it("shows the online indicator when online", () => {
    useWatchlistSyncStatusMock.mockReturnValue({
      isOnline: true,
      lastSyncedAt: null,
      pendingCount: 0,
    })
    render(<WatchlistSyncStatus />)
    expect(screen.getByText("syncStatusOnline")).toBeInTheDocument()
    expect(screen.queryByText("offlineIndicator")).not.toBeInTheDocument()
  })

  it("shows the offline indicator when offline", () => {
    useWatchlistSyncStatusMock.mockReturnValue({
      isOnline: false,
      lastSyncedAt: null,
      pendingCount: 0,
    })
    render(<WatchlistSyncStatus />)
    expect(screen.getByText("offlineIndicator")).toBeInTheDocument()
    expect(screen.queryByText("syncStatusOnline")).not.toBeInTheDocument()
  })

  it("renders the last-synced line using formatRelativeTime when a snapshot exists", () => {
    useWatchlistSyncStatusMock.mockReturnValue({
      isOnline: true,
      lastSyncedAt: "2026-07-10T09:00:00.000Z",
      pendingCount: 0,
    })
    render(<WatchlistSyncStatus />)

    expect(formatRelativeTimeMock).toHaveBeenCalledWith(
      "2026-07-10T09:00:00.000Z",
      "fr"
    )
    expect(screen.getByText("lastSynced RELATIVE_TIME")).toBeInTheDocument()
    expect(screen.queryByText("neverSynced")).not.toBeInTheDocument()
  })

  it("renders `neverSynced` when there is no snapshot", () => {
    useWatchlistSyncStatusMock.mockReturnValue({
      isOnline: true,
      lastSyncedAt: null,
      pendingCount: 0,
    })
    render(<WatchlistSyncStatus />)

    expect(screen.getByText("neverSynced")).toBeInTheDocument()
    expect(formatRelativeTimeMock).not.toHaveBeenCalled()
  })

  it("renders `neverSynced` when the snapshot timestamp is unparseable", () => {
    // A corrupt/tampered cache can hold a non-empty but invalid `syncedAt`
    // string (readWatchlistCache validates it as a string only); the real
    // `formatRelativeTime` returns "" for it — the section must fall back to
    // `neverSynced`, not render a blank "Last synced " line.
    formatRelativeTimeMock.mockReturnValue("")
    useWatchlistSyncStatusMock.mockReturnValue({
      isOnline: true,
      lastSyncedAt: "not-a-real-date",
      pendingCount: 0,
    })
    render(<WatchlistSyncStatus />)

    expect(screen.getByText("neverSynced")).toBeInTheDocument()
    expect(screen.queryByText(/^lastSynced/)).not.toBeInTheDocument()
  })

  it("renders the pending-changes line only when pendingCount > 0", () => {
    useWatchlistSyncStatusMock.mockReturnValue({
      isOnline: true,
      lastSyncedAt: "2026-07-10T09:00:00.000Z",
      pendingCount: 2,
    })
    render(<WatchlistSyncStatus />)

    expect(screen.getByText("pendingChanges 2")).toBeInTheDocument()
  })

  it("does not render the pending-changes line when pendingCount is 0", () => {
    useWatchlistSyncStatusMock.mockReturnValue({
      isOnline: true,
      lastSyncedAt: "2026-07-10T09:00:00.000Z",
      pendingCount: 0,
    })
    render(<WatchlistSyncStatus />)

    expect(screen.queryByText(/^pendingChanges/)).not.toBeInTheDocument()
  })
})

describe("formatCount (Western-numeral rule)", () => {
  it("renders Latin numerals for Arabic (no Arabic-Indic digits)", () => {
    const out = formatCount(3, "ar")
    expect(out).toBe("3")
    // No Arabic-Indic digits (٠-٩) leak through.
    expect(/[٠-٩]/.test(out)).toBe(false)
  })

  it("passes through Latin numerals for fr/en", () => {
    expect(formatCount(2, "fr")).toBe("2")
    expect(formatCount(2, "en")).toBe("2")
  })
})
