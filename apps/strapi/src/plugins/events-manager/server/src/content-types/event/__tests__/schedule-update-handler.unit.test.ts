import { handleEventScheduleUpdate } from "../schedule-update-handler"

/**
 * Unit tests for the extracted `afterUpdate` core (Story 5.6). The DB lifecycle
 * glue in `bootstrap.ts` is boot-level and untested; this asserts the seam that
 * carries the actual decisions:
 *  - it calls `notifyScheduleChange` ONCE with the correct field mapping (old vs
 *    new NOT swapped; title/documentId populated; watched ids resolved),
 *  - a draft row (`publishedAt: null`) is skipped, and
 *  - a thrown service error does NOT propagate (never breaks the event save).
 */

function buildStrapi(options: { notifyThrows?: boolean } = {}) {
  const notifyScheduleChange = jest.fn(async () => {
    if (options.notifyThrows) throw new Error("service down")
    return { created: 1 }
  })
  const service = jest.fn(() => ({ notifyScheduleChange }))
  const plugin = jest.fn(() => ({ service }))
  const logError = jest.fn()

  const strapi: any = { plugin, service, log: { error: logError } }
  return { strapi, plugin, service, notifyScheduleChange, logError }
}

const BEFORE = {
  startDateTime: "2026-07-13T18:00:00.000Z",
  eventStatus: "scheduled",
}

function publishedRow(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "evt-1",
    title: "Dune",
    category: "movie_screening",
    startDateTime: "2026-07-13T20:00:00.000Z",
    eventStatus: "scheduled",
    publishedAt: "2026-07-10T09:00:00.000Z",
    screenings: [{ movie: { documentId: "cw-1" } }],
    performances: [],
    ...overrides,
  }
}

describe("handleEventScheduleUpdate (unit)", () => {
  it("calls notifyScheduleChange once with the correct old/new field mapping", async () => {
    const { strapi, plugin, notifyScheduleChange } = buildStrapi()

    await handleEventScheduleUpdate({
      strapi,
      before: BEFORE,
      row: publishedRow(),
    })

    expect(plugin).toHaveBeenCalledWith("user-engagement")
    expect(notifyScheduleChange).toHaveBeenCalledTimes(1)
    expect(notifyScheduleChange).toHaveBeenCalledWith({
      eventDocumentId: "evt-1",
      eventTitle: "Dune",
      category: "movie_screening",
      creativeWorkDocumentIds: ["cw-1"],
      // old comes from the snapshot, new from the row — NOT swapped.
      oldStartDateTime: "2026-07-13T18:00:00.000Z",
      newStartDateTime: "2026-07-13T20:00:00.000Z",
      oldStatus: "scheduled",
      newStatus: "scheduled",
    })
  })

  it("resolves watched ids from both screenings.movie and performances.play (deduped)", async () => {
    const { strapi, notifyScheduleChange } = buildStrapi()
    const row = publishedRow({
      screenings: [{ movie: { documentId: "cw-1" } }],
      performances: [
        { play: { documentId: "cw-2" } },
        { play: { documentId: "cw-1" } },
      ],
    })

    await handleEventScheduleUpdate({ strapi, before: BEFORE, row })

    const arg = notifyScheduleChange.mock.calls[0][0]
    expect(arg.creativeWorkDocumentIds).toEqual(["cw-1", "cw-2"])
  })

  it("skips a draft row (publishedAt null) — no fan-out", async () => {
    const { strapi, notifyScheduleChange } = buildStrapi()

    await handleEventScheduleUpdate({
      strapi,
      before: BEFORE,
      row: publishedRow({ publishedAt: null }),
    })

    expect(notifyScheduleChange).not.toHaveBeenCalled()
  })

  it("skips a row with no watched works", async () => {
    const { strapi, notifyScheduleChange } = buildStrapi()

    await handleEventScheduleUpdate({
      strapi,
      before: BEFORE,
      row: publishedRow({ screenings: [], performances: [] }),
    })

    expect(notifyScheduleChange).not.toHaveBeenCalled()
  })

  it("skips when there is no before-snapshot", async () => {
    const { strapi, notifyScheduleChange } = buildStrapi()

    await handleEventScheduleUpdate({
      strapi,
      before: undefined,
      row: publishedRow(),
    })

    expect(notifyScheduleChange).not.toHaveBeenCalled()
  })

  it("swallows a service/email error — never propagates out of the event save", async () => {
    const { strapi, notifyScheduleChange, logError } = buildStrapi({
      notifyThrows: true,
    })

    await expect(
      handleEventScheduleUpdate({ strapi, before: BEFORE, row: publishedRow() })
    ).resolves.toBeUndefined()

    expect(notifyScheduleChange).toHaveBeenCalledTimes(1)
    expect(logError).toHaveBeenCalled()
  })
})
