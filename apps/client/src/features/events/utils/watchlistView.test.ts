/**
 * Tests for the pure watchlist display helpers (Story 5.3):
 * `partitionWatchlist` (soonest-first Upcoming, descending Past, never-scheduled
 * works stay in Upcoming after dated ones) and `filterByCategory` (`all`
 * passthrough, `cinema`→`film`, applied across both sections).
 *
 * No React — the display contract is locked independent of the component.
 */
import { describe, expect, it } from "vitest"

import type { WatchlistItem } from "../hooks/useWatchlist"

import { filterByCategory, partitionWatchlist } from "./watchlistView"

function item(
  overrides: Partial<WatchlistItem> & { documentId: string }
): WatchlistItem {
  return {
    id: 0,
    documentId: overrides.documentId,
    creativeWork: {
      id: 0,
      documentId: `cw-${overrides.documentId}`,
      title: overrides.documentId,
      type: "film",
      ...(overrides.creativeWork ?? {}),
    },
    addedAt: overrides.addedAt ?? "2026-01-01T00:00:00.000Z",
    nextScreeningDate: overrides.nextScreeningDate ?? null,
    lastScreeningDate: overrides.lastScreeningDate ?? null,
    venueName: overrides.venueName ?? null,
  }
}

describe("partitionWatchlist", () => {
  it("sorts upcoming items soonest-first by nextScreeningDate", () => {
    const items = [
      item({ documentId: "E", nextScreeningDate: "2026-07-15T00:00:00.000Z" }),
      item({ documentId: "D", nextScreeningDate: "2026-07-11T00:00:00.000Z" }),
      item({ documentId: "F", nextScreeningDate: "2026-07-12T00:00:00.000Z" }),
    ]

    const { upcoming, past } = partitionWatchlist(items)

    expect(upcoming.map((i) => i.documentId)).toEqual(["D", "F", "E"])
    expect(past).toHaveLength(0)
  })

  it("puts past-only items in Past sorted most-recent-first", () => {
    const items = [
      item({ documentId: "P1", lastScreeningDate: "2026-07-01T00:00:00.000Z" }),
      item({ documentId: "P2", lastScreeningDate: "2026-07-05T00:00:00.000Z" }),
    ]

    const { upcoming, past } = partitionWatchlist(items)

    expect(upcoming).toHaveLength(0)
    expect(past.map((i) => i.documentId)).toEqual(["P2", "P1"])
  })

  it("keeps never-scheduled (both-null) items in Upcoming, after dated items", () => {
    const items = [
      item({ documentId: "N", addedAt: "2026-02-01T00:00:00.000Z" }), // undated
      item({ documentId: "U", nextScreeningDate: "2026-07-11T00:00:00.000Z" }),
    ]

    const { upcoming, past } = partitionWatchlist(items)

    expect(upcoming.map((i) => i.documentId)).toEqual(["U", "N"])
    expect(past).toHaveLength(0)
  })

  it("does NOT place a both-null item in Past", () => {
    const items = [item({ documentId: "N" })]

    const { upcoming, past } = partitionWatchlist(items)

    expect(upcoming.map((i) => i.documentId)).toEqual(["N"])
    expect(past).toHaveLength(0)
  })

  it("tiebreaks undated items by addedAt descending (most recent first)", () => {
    const items = [
      item({ documentId: "old", addedAt: "2026-01-01T00:00:00.000Z" }),
      item({ documentId: "new", addedAt: "2026-03-01T00:00:00.000Z" }),
    ]

    const { upcoming } = partitionWatchlist(items)

    expect(upcoming.map((i) => i.documentId)).toEqual(["new", "old"])
  })

  it("prefers an upcoming item over a both-null item even when the undated one has a newer addedAt", () => {
    const items = [
      item({ documentId: "undated", addedAt: "2026-12-01T00:00:00.000Z" }),
      item({
        documentId: "dated",
        nextScreeningDate: "2026-07-11T00:00:00.000Z",
        addedAt: "2026-01-01T00:00:00.000Z",
      }),
    ]

    const { upcoming } = partitionWatchlist(items)

    expect(upcoming.map((i) => i.documentId)).toEqual(["dated", "undated"])
  })
})

describe("filterByCategory", () => {
  it("passes everything through for 'all'", () => {
    const items = [
      item({ documentId: "a", creativeWork: { type: "film" } as never }),
      item({ documentId: "b", creativeWork: { type: "play" } as never }),
    ]

    expect(filterByCategory(items, "all")).toHaveLength(2)
  })

  it("keeps only 'film' items for 'cinema'", () => {
    const items = [
      item({
        documentId: "a",
        creativeWork: {
          id: 1,
          documentId: "cw-a",
          title: "A",
          type: "film",
        },
      }),
      item({
        documentId: "b",
        creativeWork: {
          id: 2,
          documentId: "cw-b",
          title: "B",
          type: "play",
        },
      }),
    ]

    const result = filterByCategory(items, "cinema")

    expect(result.map((i) => i.documentId)).toEqual(["a"])
  })

  it("maps every UI category to its creative-work type", () => {
    const items = [
      item({ documentId: "film", creativeWork: { type: "film" } as never }),
      item({ documentId: "play", creativeWork: { type: "play" } as never }),
      item({
        documentId: "concert",
        creativeWork: { type: "concert" } as never,
      }),
      item({
        documentId: "short",
        creativeWork: { type: "short-film" } as never,
      }),
      item({
        documentId: "expo",
        creativeWork: { type: "exhibition" } as never,
      }),
    ]

    expect(filterByCategory(items, "theater").map((i) => i.documentId)).toEqual([
      "play",
    ])
    expect(filterByCategory(items, "music").map((i) => i.documentId)).toEqual([
      "concert",
    ])
    expect(filterByCategory(items, "shorts").map((i) => i.documentId)).toEqual([
      "short",
    ])
    expect(
      filterByCategory(items, "exhibitions").map((i) => i.documentId)
    ).toEqual(["expo"])
  })

  it("does not throw and excludes items with a null creative-work when filtering", () => {
    // A dangling row (deleted creative-work) — built directly, since the `item`
    // helper always synthesizes a non-null creativeWork.
    const dangling = {
      id: 0,
      documentId: "dangling",
      creativeWork: null as never,
      addedAt: "2026-01-01T00:00:00.000Z",
      nextScreeningDate: null,
      lastScreeningDate: null,
      venueName: null,
    } satisfies WatchlistItem
    const items = [
      item({ documentId: "film", creativeWork: { type: "film" } as never }),
      dangling,
    ]

    // Must not crash the filter, and the dangling row is excluded from a
    // category-filtered view.
    const result = filterByCategory(items, "cinema")
    expect(result.map((i) => i.documentId)).toEqual(["film"])
  })

  it("applies across items regardless of section (upcoming/past)", () => {
    const items = [
      item({
        documentId: "up-film",
        nextScreeningDate: "2026-07-11T00:00:00.000Z",
        creativeWork: { id: 1, documentId: "cw1", title: "f", type: "film" },
      }),
      item({
        documentId: "past-film",
        lastScreeningDate: "2026-07-01T00:00:00.000Z",
        creativeWork: { id: 2, documentId: "cw2", title: "g", type: "film" },
      }),
      item({
        documentId: "up-play",
        nextScreeningDate: "2026-07-12T00:00:00.000Z",
        creativeWork: { id: 3, documentId: "cw3", title: "h", type: "play" },
      }),
    ]

    const filtered = filterByCategory(items, "cinema")
    const { upcoming, past } = partitionWatchlist(filtered)

    expect(upcoming.map((i) => i.documentId)).toEqual(["up-film"])
    expect(past.map((i) => i.documentId)).toEqual(["past-film"])
  })
})
