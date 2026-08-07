/**
 * Tests for `WatchlistPageClient` (Story 5.3) — page composition + the
 * seed-then-remove wiring.
 *
 * `useWatchlist` and `useRemoveFromWatchlist` are mocked so the enriched list
 * and the remove handler are fully controlled; next-intl, `@/lib/navigation`,
 * session, and `next/image` are mocked so the page renders standalone. A REAL
 * `QueryClient` backs the provider so the per-card `check`-cache seed is
 * observable (the seed is what prevents the remove-hook guard from no-opping the
 * first tap).
 */
import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { WatchlistItem } from "@/features/events/hooks/useWatchlist"

// A parity guard for the `watchlist` i18n namespace: the mocked next-intl above
// echoes keys, so the component tests cannot catch a key that is missing in one
// locale. This asserts the three locale files carry the SAME watchlist keys
// (recursively, including the nested `categories` object) so a dropped/renamed
// key surfaces as a failing test instead of a runtime MISSING_MESSAGE.
import ar from "../../../../locales/ar.json"
import en from "../../../../locales/en.json"
import fr from "../../../../locales/fr.json"
import { WatchlistPageClient } from "./WatchlistPageClient"

const {
  useOfflineWatchlistMock,
  removeMock,
  pushMock,
  formatRelativeTimeMock,
} = vi.hoisted(() => ({
  useOfflineWatchlistMock: vi.fn(),
  removeMock: vi.fn(),
  pushMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(() => ""),
}))

// Surface the `{time}` value for the `lastSynced` message (the real message is
// "Last synced {time}") so the banner's formatted value is actually asserted;
// every other key still echoes bare (the mock has no real message templates).
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    key === "lastSynced" && values ? `lastSynced ${values.time}` : key,
}))

vi.mock("@/lib/dates", () => ({
  formatRelativeTime: (...args: unknown[]) => formatRelativeTimeMock(...args),
}))

vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

// Purchase flag stubbed ON (Story 3.12): the page renders real EventCards,
// whose price line now reads the flag; the mock also keeps `env.mjs` (which
// rejects vitest's NODE_ENV=test) out of the import graph.
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => true,
}))

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { userId: 1 } },
  }),
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: string; alt?: string }) => {
    return React.createElement("img", {
      src: typeof src === "string" ? src : "",
      alt,
    })
  },
}))

vi.mock("@/features/events/hooks/useOfflineWatchlist", () => ({
  useOfflineWatchlist: useOfflineWatchlistMock,
}))

// The page still imports `watchlistKeys` from useWatchlist (for the per-card
// check-cache seed); keep that export mocked without a real query.
vi.mock("@/features/events/hooks/useWatchlist", () => ({
  watchlistKeys: {
    all: ["watchlist"],
    list: (userId: number) => ["watchlist", "list", userId],
    check: (userId: number, id: string) => ["watchlist", "check", userId, id],
  },
}))

vi.mock("@/features/events/hooks/useRemoveFromWatchlist", () => ({
  useRemoveFromWatchlist: () => ({ remove: removeMock, isPending: false }),
}))

function makeItem(
  documentId: string,
  opts: {
    type?: string
    next?: string | null
    last?: string | null
    venue?: string | null
    creativeWork?: WatchlistItem["creativeWork"] | null
  } = {}
): WatchlistItem {
  return {
    id: Number(documentId.replace(/\D/g, "")) || 0,
    documentId,
    creativeWork:
      "creativeWork" in opts
        ? (opts.creativeWork as WatchlistItem["creativeWork"])
        : {
            id: 0,
            documentId: `cw-${documentId}`,
            title: `Title ${documentId}`,
            type: opts.type ?? "film",
          },
    addedAt: "2026-01-01T00:00:00.000Z",
    nextScreeningDate: opts.next ?? null,
    lastScreeningDate: opts.last ?? null,
    venueName: opts.venue ?? null,
  }
}

function renderPage(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <WatchlistPageClient locale="fr" />
    </QueryClientProvider>
  )
}

// Bridge the Story 5.3 online tests (which set `data`) onto the Story 5.4
// `useOfflineWatchlist` shape (which exposes `items`): a `data` array maps to
// `items`, defaulting to an online, loaded, no-error view.
function setWatchlist(value: Partial<Record<string, unknown>>) {
  const { data, ...rest } = value
  useOfflineWatchlistMock.mockReturnValue({
    items: (data as WatchlistItem[] | undefined) ?? [],
    syncedAt: null,
    isOffline: false,
    isFromCache: false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...rest,
  })
}

// Set the offline view directly (Story 5.4): the hook exposes `items` from the
// durable snapshot, `isOffline: true`, and a `syncedAt`.
function setOffline(value: Partial<Record<string, unknown>>) {
  useOfflineWatchlistMock.mockReturnValue({
    items: [],
    syncedAt: null,
    isOffline: true,
    isFromCache: false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...value,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom does not implement scrollIntoView, which CategoryTabs calls to reveal
  // the active tab. Stub it (test-env only; the reused component is untouched).
  Element.prototype.scrollIntoView = vi.fn()
})

describe("WatchlistPageClient", () => {
  it("renders Upcoming cards sorted soonest-first", () => {
    setWatchlist({
      data: [
        makeItem("E", { next: "2026-07-15T00:00:00.000Z" }),
        makeItem("D", { next: "2026-07-11T00:00:00.000Z" }),
        makeItem("F", { next: "2026-07-12T00:00:00.000Z" }),
      ],
    })

    renderPage(new QueryClient())

    const cards = screen
      .getAllByRole("article")
      .map((a) => within(a).getByRole("heading").textContent)
    expect(cards).toEqual(["Title D", "Title F", "Title E"])
  })

  it("shows a past-only item under the Past heading, not the upcoming grid", () => {
    setWatchlist({
      data: [
        makeItem("Up", { next: "2026-07-11T00:00:00.000Z" }),
        makeItem("Past", { last: "2026-07-01T00:00:00.000Z" }),
      ],
    })

    renderPage(new QueryClient())

    expect(screen.getByText("upcomingTitle")).toBeTruthy()
    expect(screen.getByText("pastTitle")).toBeTruthy()

    // The past section heading precedes the past card in the DOM; the upcoming
    // card is not inside the past section.
    expect(screen.getByText("Title Past")).toBeTruthy()
    expect(screen.getByText("Title Up")).toBeTruthy()
  })

  it("hides the Past section when there are no past items", () => {
    setWatchlist({
      data: [makeItem("Up", { next: "2026-07-11T00:00:00.000Z" })],
    })

    renderPage(new QueryClient())

    expect(screen.queryByText("pastTitle")).toBeNull()
  })

  it("filters both sections when a category is selected", async () => {
    const user = userEvent.setup()
    setWatchlist({
      data: [
        makeItem("Film", { type: "film", next: "2026-07-11T00:00:00.000Z" }),
        makeItem("Play", { type: "play", next: "2026-07-12T00:00:00.000Z" }),
        makeItem("PastFilm", {
          type: "film",
          last: "2026-07-01T00:00:00.000Z",
        }),
        makeItem("PastPlay", {
          type: "play",
          last: "2026-07-02T00:00:00.000Z",
        }),
      ],
    })

    renderPage(new QueryClient())

    // Before filtering, all four render.
    expect(screen.getByText("Title Play")).toBeTruthy()
    expect(screen.getByText("Title PastPlay")).toBeTruthy()

    // Select the "cinema" category tab (label is the passthrough i18n key).
    await user.click(screen.getByRole("tab", { name: "categories.cinema" }))

    // Only film items remain, across BOTH sections.
    expect(screen.getByText("Title Film")).toBeTruthy()
    expect(screen.getByText("Title PastFilm")).toBeTruthy()
    expect(screen.queryByText("Title Play")).toBeNull()
    expect(screen.queryByText("Title PastPlay")).toBeNull()
  })

  it("shows an inline no-category message when the filter empties the list", async () => {
    const user = userEvent.setup()
    setWatchlist({
      data: [
        makeItem("Play", { type: "play", next: "2026-07-12T00:00:00.000Z" }),
      ],
    })

    renderPage(new QueryClient())

    await user.click(screen.getByRole("tab", { name: "categories.cinema" }))

    expect(screen.getByText("noneInCategory")).toBeTruthy()
    // Not the full empty state.
    expect(screen.queryByText("emptyDescription")).toBeNull()
  })

  it("renders the EmptyState with a CTA that routes to '/' for an empty list", async () => {
    const user = userEvent.setup()
    setWatchlist({ data: [] })

    renderPage(new QueryClient())

    expect(screen.getByText("emptyTitle")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "emptyAction" }))
    expect(pushMock).toHaveBeenCalledWith("/")
  })

  it("renders a skeleton grid while loading", () => {
    setWatchlist({ data: undefined, isLoading: true })

    renderPage(new QueryClient())

    expect(screen.getAllByLabelText("Loading event").length).toBeGreaterThan(0)
  })

  it("renders an error state with a retry that refetches", async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    setWatchlist({ data: undefined, isError: true, refetch })

    renderPage(new QueryClient())

    expect(screen.getByText("error")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it("renders each card's real next-screening date and venue (not addedAt/blank)", () => {
    setWatchlist({
      data: [
        makeItem("D", {
          next: "2026-07-15T12:00:00.000Z",
          venue: "Ciné Palace",
        }),
      ],
    })

    renderPage(new QueryClient())

    // The venue comes from enrichment (reverting it to "" would drop this text).
    expect(screen.getByText("Ciné Palace")).toBeTruthy()
    // The date is the nextScreeningDate, DD/MM/YYYY (reverting to addedAt would
    // render 01/01/2026 and fail this assertion).
    expect(screen.getByText("15/07/2026")).toBeTruthy()
    expect(screen.queryByText("01/01/2026")).toBeNull()
  })

  it("renders a past-only card's lastScreeningDate", () => {
    setWatchlist({
      data: [makeItem("P", { last: "2026-07-05T12:00:00.000Z" })],
    })

    renderPage(new QueryClient())

    expect(screen.getByText("05/07/2026")).toBeTruthy()
  })

  it("shows a localized category badge (not a hardcoded French label)", () => {
    setWatchlist({
      data: [makeItem("D", { type: "film", next: "2026-07-15T12:00:00.000Z" })],
    })

    renderPage(new QueryClient())

    // The badge resolves through the localized `categories` labels (mocked to
    // echo the key), NOT the French `mapTypeToCategory` output "Cinéma". Scope
    // to the card so the CategoryTabs "cinema" tab (same label) isn't matched.
    const card = screen.getByRole("article")
    expect(within(card).getByText("categories.cinema")).toBeTruthy()
    expect(within(card).queryByText("Cinéma")).toBeNull()
  })

  it("does not crash and skips a row whose creative-work was deleted", () => {
    setWatchlist({
      data: [
        makeItem("Live", { next: "2026-07-15T12:00:00.000Z" }),
        makeItem("Dangling", { creativeWork: null }),
      ],
    })

    renderPage(new QueryClient())

    // The live card renders; the dangling (null creative-work) row is skipped
    // rather than throwing and taking the whole page down.
    expect(screen.getByText("Title Live")).toBeTruthy()
    expect(screen.getAllByRole("article")).toHaveLength(1)
  })

  it("seeds the check cache on mount and calls remove when the heart is tapped", async () => {
    const user = userEvent.setup()
    const client = new QueryClient()
    setWatchlist({
      data: [makeItem("D", { next: "2026-07-11T00:00:00.000Z" })],
    })

    renderPage(client)

    // The card seeded its `check` cache so the shared remove hook would not
    // no-op the first tap.
    expect(client.getQueryData(["watchlist", "check", 1, "cw-D"])).toEqual({
      isInWatchlist: true,
    })

    await user.click(
      screen.getByRole("button", { name: "removeFromWatchlist" })
    )
    expect(removeMock).toHaveBeenCalled()
  })

  it("resolves a localized category badge for each creative-work type (not just film)", () => {
    // The badge goes creative-work type -> UI category (TYPE_TO_CATEGORY) ->
    // localized `categories.*` key. Only `film` was pinned before; a wrong map
    // entry for another type (e.g. play -> music) would ship green. Lock all
    // three real enum types (`["film","play","short-film"]`).
    const cases: Array<{ type: string; badgeKey: string }> = [
      { type: "film", badgeKey: "categories.cinema" },
      { type: "play", badgeKey: "categories.theater" },
      { type: "short-film", badgeKey: "categories.shorts" },
    ]

    for (const { type, badgeKey } of cases) {
      setWatchlist({
        data: [makeItem("D", { type, next: "2026-07-15T12:00:00.000Z" })],
      })
      const { unmount } = renderPage(new QueryClient())

      const card = screen.getByRole("article")
      expect(within(card).getByText(badgeKey)).toBeTruthy()
      unmount()
    }
  })

  it("navigates to /events/<creativeWorkId> when a card body is clicked", async () => {
    const user = userEvent.setup()
    setWatchlist({
      data: [makeItem("D", { next: "2026-07-11T00:00:00.000Z" })],
    })

    renderPage(new QueryClient())

    // Click the card body (its heading bubbles to the article onClick), NOT the
    // heart. The nav target must be the CREATIVE-WORK documentId (`cw-D`), the
    // frozen `/events/:creativeWorkId` contract — a regression to the watchlist
    // row's own documentId would deep-link to the wrong id and ship green.
    await user.click(screen.getByText("Title D"))
    expect(pushMock).toHaveBeenCalledWith("/events/cw-D")
  })
})

describe("WatchlistPageClient — offline (Story 5.4)", () => {
  it("renders cached items with an offline banner + last-synced line", () => {
    formatRelativeTimeMock.mockReturnValue("5 MINUTES AGO")
    setOffline({
      items: [makeItem("D", { next: "2026-07-15T12:00:00.000Z" })],
      syncedAt: "2026-07-10T09:00:00.000Z",
      isFromCache: true,
    })

    renderPage(new QueryClient())

    // The cached card renders as a success view (not an error/blank screen).
    expect(screen.getByText("Title D")).toBeTruthy()
    // Offline indicator (key echoed by the next-intl mock).
    expect(screen.getByText("offlineIndicator")).toBeTruthy()
    // The formatted "last synced" value is actually wired through to the banner:
    // syncedAt → formatRelativeTime(iso, locale) → interpolated `lastSynced`.
    expect(formatRelativeTimeMock).toHaveBeenCalledWith(
      "2026-07-10T09:00:00.000Z",
      "fr"
    )
    expect(screen.getByText(/5 MINUTES AGO/)).toBeTruthy()
  })

  it("disables each card heart offline; a tap does not call remove", () => {
    setOffline({
      items: [makeItem("D", { next: "2026-07-15T12:00:00.000Z" })],
      syncedAt: "2026-07-10T09:00:00.000Z",
      isFromCache: true,
    })

    renderPage(new QueryClient())

    const heart = screen.getByRole("button", { name: "removeFromWatchlist" })
    expect(heart).toHaveAttribute("aria-disabled", "true")
    // The disabled hint is reachable.
    expect(screen.getByTitle("offlineActionDisabled")).toBeTruthy()

    fireEvent.click(heart)
    expect(removeMock).not.toHaveBeenCalled()
  })

  it("shows the offline EmptyState when offline with no cached items", () => {
    setOffline({ items: [], syncedAt: null })

    renderPage(new QueryClient())

    expect(screen.getByText("offlineEmptyTitle")).toBeTruthy()
    expect(screen.getByText("offlineEmptyDescription")).toBeTruthy()
    // Not the "nothing saved" (online) empty state.
    expect(screen.queryByText("emptyDescription")).toBeNull()
  })

  it("clears the banner and re-enables hearts once back online", () => {
    setWatchlist({
      data: [makeItem("D", { next: "2026-07-15T12:00:00.000Z" })],
    })

    renderPage(new QueryClient())

    // No offline banner while online.
    expect(screen.queryByText("offlineIndicator")).toBeNull()
    const heart = screen.getByRole("button", { name: "removeFromWatchlist" })
    expect(heart).toHaveAttribute("aria-disabled", "false")
  })

  it("shows the encouraging empty state (not 'unavailable offline') for a synced-empty watchlist", () => {
    // Synced a genuinely-empty watchlist online, then went offline: the snapshot
    // exists (isFromCache) but has no items — this is empty, not unavailable.
    setOffline({
      items: [],
      isFromCache: true,
      syncedAt: "2026-07-10T09:00:00.000Z",
    })

    renderPage(new QueryClient())

    expect(screen.getByText("emptyDescription")).toBeTruthy()
    expect(screen.queryByText("offlineEmptyTitle")).toBeNull()
  })
})

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    keyPaths(v, prefix ? `${prefix}.${k}` : k)
  )
}

describe("watchlist i18n namespace parity", () => {
  const frKeys = keyPaths((fr as { watchlist: unknown }).watchlist).sort()
  const arKeys = keyPaths((ar as { watchlist: unknown }).watchlist).sort()
  const enKeys = keyPaths((en as { watchlist: unknown }).watchlist).sort()

  it("has an identical key set across fr/ar/en", () => {
    expect(arKeys).toEqual(frKeys)
    expect(enKeys).toEqual(frKeys)
  })

  it("includes the keys the page renders (incl. nested categories)", () => {
    for (const key of [
      "pageTitle",
      "title",
      "upcomingTitle",
      "pastTitle",
      "emptyTitle",
      "emptyAction",
      "noneInCategory",
      "categories.all",
      "categories.cinema",
      "categories.exhibitions",
    ]) {
      expect(frKeys).toContain(key)
    }
  })
})
