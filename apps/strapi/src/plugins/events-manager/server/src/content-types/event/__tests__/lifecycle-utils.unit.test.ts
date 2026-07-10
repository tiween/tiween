import { collectWatchedCreativeWorkIds } from "../lifecycle-utils"

/**
 * Unit tests for `collectWatchedCreativeWorkIds` (Story 5.6) — the pure id-
 * resolution seam the event schedule-change lifecycle delegates to. No Strapi.
 */

describe("collectWatchedCreativeWorkIds (unit)", () => {
  it("collects screening movie + performance play documentIds", () => {
    const ids = collectWatchedCreativeWorkIds({
      screenings: [{ movie: { documentId: "cw-1" } }],
      performances: [{ play: { documentId: "cw-2" } }],
    })
    expect(ids.sort()).toEqual(["cw-1", "cw-2"])
  })

  it("dedupes a work referenced by multiple screenings/performances", () => {
    const ids = collectWatchedCreativeWorkIds({
      screenings: [
        { movie: { documentId: "cw-1" } },
        { movie: { documentId: "cw-1" } },
      ],
      performances: [{ play: { documentId: "cw-1" } }],
    })
    expect(ids).toEqual(["cw-1"])
  })

  it("ignores screenings/performances with no resolvable work", () => {
    const ids = collectWatchedCreativeWorkIds({
      screenings: [{ movie: null }, {}],
      performances: [{ play: { documentId: "" } }],
    })
    expect(ids).toEqual([])
  })

  it("returns an empty array for an event with no screenings/performances", () => {
    expect(collectWatchedCreativeWorkIds({})).toEqual([])
    expect(
      collectWatchedCreativeWorkIds({ screenings: null, performances: null })
    ).toEqual([])
  })
})
