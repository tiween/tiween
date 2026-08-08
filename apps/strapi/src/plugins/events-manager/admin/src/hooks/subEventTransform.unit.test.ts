/**
 * Unit tests for the sub-event normalise / merge / map layer.
 *
 * These cover the rows of the spec's edge-case matrix that are pure data:
 * the mixed week, the empty range, and what survives when only one of the two
 * collections resolves. The UTC → local conversion is pinned here too, because
 * `BigCalendar` ignores its own `timezone` prop — this module is the only place
 * the instant is established.
 */
import type { RawSubEvent } from "./subEventTransform"

import { SUB_EVENT_WORK_TYPES } from "./subEventPopulate"
import {
  DEFAULT_DURATION_MINUTES,
  KIND_COLORS,
  mergeSubEvents,
  normalizeSubEvent,
  normalizeSubEvents,
  parseUtcToLocal,
  readKind,
  readSubEvent,
  toCalendarEvents,
} from "./subEventTransform"

const screeningRow = (over: Partial<RawSubEvent> = {}): RawSubEvent => ({
  id: 1,
  documentId: "scr-1",
  startDateTime: "2026-08-10T18:00:00.000Z",
  videoFormat: "standard",
  audioLanguage: "fr",
  subtitleLanguage: "ar",
  price: "35.5",
  movie: {
    id: 10,
    documentId: "work-film",
    title: "Le Silence",
    type: "film",
    duration: 95,
  },
  event: {
    id: 100,
    documentId: "evt-1",
    title: "Projection",
    venue: { id: 7, documentId: "venue-1" },
  },
  ...over,
})

const performanceRow = (over: Partial<RawSubEvent> = {}): RawSubEvent => ({
  id: 2,
  documentId: "perf-1",
  startDateTime: "2026-08-10T20:30:00.000Z",
  audioLanguage: "ar",
  surtitleLanguage: "fr",
  play: {
    id: 20,
    documentId: "work-play",
    title: "Hamlet",
    type: "play",
    duration: null,
  },
  event: {
    id: 200,
    documentId: "evt-2",
    title: "Représentation",
    venue: { id: 7, documentId: "venue-1" },
  },
  ...over,
})

describe("parseUtcToLocal (unit)", () => {
  it("reads an explicit Z instant as UTC", () => {
    expect(parseUtcToLocal("2026-08-10T18:00:00.000Z")?.getTime()).toBe(
      Date.UTC(2026, 7, 10, 18, 0, 0)
    )
  })

  it("anchors a designator-less value to UTC rather than local time", () => {
    // The hazard this function exists for: `new Date("2026-08-10T18:00:00")`
    // is LOCAL by spec, which shifts the block by the browser offset.
    expect(parseUtcToLocal("2026-08-10T18:00:00")?.getTime()).toBe(
      Date.UTC(2026, 7, 10, 18, 0, 0)
    )
  })

  it("honours a numeric offset", () => {
    expect(parseUtcToLocal("2026-08-10T19:00:00+01:00")?.getTime()).toBe(
      Date.UTC(2026, 7, 10, 18, 0, 0)
    )
  })

  it("returns a Date whose local getters render the same instant", () => {
    const parsed = parseUtcToLocal("2026-08-10T18:00:00.000Z")!
    const reference = new Date(Date.UTC(2026, 7, 10, 18, 0, 0))

    expect(parsed.getHours()).toBe(reference.getHours())
    expect(parsed.getDate()).toBe(reference.getDate())
  })

  it("handles microsecond precision — what Postgres actually returns", () => {
    // A 3-digit fractional cap sent these to the `new Date()` fallback, which
    // reads a designator-less string as LOCAL: the exact shift this function
    // exists to prevent, on the most common real input.
    expect(parseUtcToLocal("2026-08-10T18:00:00.123456Z")?.getTime()).toBe(
      Date.UTC(2026, 7, 10, 18, 0, 0, 123)
    )
    expect(parseUtcToLocal("2026-08-10T18:00:00.123456")?.getTime()).toBe(
      Date.UTC(2026, 7, 10, 18, 0, 0, 123)
    )
  })

  it("returns null for empty or unparseable input", () => {
    expect(parseUtcToLocal(null)).toBeNull()
    expect(parseUtcToLocal("")).toBeNull()
    expect(parseUtcToLocal("not a date")).toBeNull()
  })
})

describe("normalizeSubEvent (unit)", () => {
  it("reads the screening work off `movie` and keeps subtitleLanguage", () => {
    const subEvent = normalizeSubEvent("screening", screeningRow())!

    expect(subEvent.kind).toBe("screening")
    expect(subEvent.work?.documentId).toBe("work-film")
    expect(subEvent.work?.type).toBe("film")
    expect(subEvent.subtitleLanguage).toBe("ar")
    expect(subEvent.surtitleLanguage).toBeNull()
    expect(subEvent.videoFormat).toBe("standard")
    expect(subEvent.price).toBe(35.5)
  })

  it("reads the performance work off `play` and keeps surtitleLanguage", () => {
    const subEvent = normalizeSubEvent("performance", performanceRow())!

    expect(subEvent.work?.documentId).toBe("work-play")
    expect(subEvent.surtitleLanguage).toBe("fr")
    // `subtitleLanguage`/`videoFormat` do not exist on this collection; a stray
    // value must not leak through the shared shape.
    expect(subEvent.subtitleLanguage).toBeNull()
    expect(subEvent.videoFormat).toBeNull()
  })

  it("does not cross the work fields between kinds", () => {
    const strayPlay = normalizeSubEvent(
      "screening",
      screeningRow({ movie: null, play: performanceRow().play })
    )!

    expect(strayPlay.work).toBeNull()
  })

  it("drops a row with no documentId — it could not be edited or deleted", () => {
    expect(normalizeSubEvent("screening", { id: 9 })).toBeNull()
    expect(
      normalizeSubEvents("screening", [{ id: 9 }, screeningRow()])
    ).toHaveLength(1)
  })

  it("keeps an unscheduled row but leaves `start` null", () => {
    const subEvent = normalizeSubEvent(
      "screening",
      screeningRow({ startDateTime: null })
    )!

    expect(subEvent.startDateTime).toBeNull()
    expect(subEvent.start).toBeNull()
  })
})

describe("mergeSubEvents / toCalendarEvents (unit)", () => {
  it("mixed week: both kinds land on one grid, sorted, badged by kind", () => {
    const merged = mergeSubEvents(
      normalizeSubEvents("screening", [
        screeningRow(),
        screeningRow({
          documentId: "scr-2",
          startDateTime: "2026-08-11T18:00:00.000Z",
        }),
      ]),
      normalizeSubEvents("performance", [performanceRow()])
    )

    expect(merged.map((s) => s.documentId)).toEqual([
      "scr-1",
      "perf-1",
      "scr-2",
    ])

    const events = toCalendarEvents(merged)
    expect(events).toHaveLength(3)
    expect(events.map((e) => e.id)).toEqual([
      "screening:scr-1",
      "performance:perf-1",
      "screening:scr-2",
    ])
    expect(events.map((e) => readKind(e))).toEqual([
      "screening",
      "performance",
      "screening",
    ])
    expect(events[0].color).toBe(KIND_COLORS.screening)
    expect(events[1].color).toBe(KIND_COLORS.performance)
  })

  it("passes the already-translated badge label through to the block", () => {
    // The label is resolved by the caller, where the translator lives, so
    // `EventBlock` renders a given string and `BigCalendar` stays generic —
    // and gains no hardcoded strings of its own.
    const [screening, performance] = toCalendarEvents(
      mergeSubEvents(
        normalizeSubEvents("screening", [screeningRow()]),
        normalizeSubEvents("performance", [performanceRow()])
      ),
      { kindLabels: { screening: "SCREENING", performance: "THEATRE" } }
    )

    expect(screening.extendedProps?.kindLabel).toBe("SCREENING")
    expect(performance.extendedProps?.kindLabel).toBe("THEATRE")
  })

  it("leaves the label undefined when none is supplied", () => {
    const [event] = toCalendarEvents(
      normalizeSubEvents("screening", [screeningRow()])
    )

    expect(event.extendedProps?.kindLabel).toBeUndefined()
    // The routing discriminator is present either way.
    expect(event.extendedProps?.kind).toBe("screening")
  })

  it("routes an edit back to the collection the block came from", () => {
    const [event] = toCalendarEvents(
      normalizeSubEvents("performance", [performanceRow()])
    )

    expect(readSubEvent(event)?.kind).toBe("performance")
    expect(readSubEvent(event)?.documentId).toBe("perf-1")
  })

  it("uses the work duration for the block, falling back to the default", () => {
    const [screening] = toCalendarEvents(
      normalizeSubEvents("screening", [screeningRow()])
    )
    const [performance] = toCalendarEvents(
      normalizeSubEvents("performance", [performanceRow()])
    )

    expect(screening.end.getTime() - screening.start.getTime()).toBe(
      95 * 60_000
    )
    expect(performance.end.getTime() - performance.start.getTime()).toBe(
      DEFAULT_DURATION_MINUTES * 60_000
    )
  })

  it("falls back to the default length for a zero or negative duration", () => {
    // A zero-height block is in the DOM but invisible and unclickable — the
    // showing reads as lost.
    const zero = toCalendarEvents(
      normalizeSubEvents("screening", [
        screeningRow({ movie: { ...screeningRow().movie!, duration: 0 } }),
      ])
    )[0]
    const negative = toCalendarEvents(
      normalizeSubEvents("screening", [
        screeningRow({ movie: { ...screeningRow().movie!, duration: -30 } }),
      ])
    )[0]

    expect(zero.end.getTime() - zero.start.getTime()).toBe(
      DEFAULT_DURATION_MINUTES * 60_000
    )
    expect(negative.end.getTime() - negative.start.getTime()).toBe(
      DEFAULT_DURATION_MINUTES * 60_000
    )
  })

  it("uses the caller's translated fallback when nothing has a title", () => {
    const [event] = toCalendarEvents(
      normalizeSubEvents("screening", [
        screeningRow({ movie: null, event: null }),
      ]),
      { fallbackTitle: "Untitled showing" }
    )

    expect(event.title).toBe("Untitled showing")
  })

  it("partial failure: the kind that resolved still renders", () => {
    // `useSubEvents` hands `[]` through for a rejected collection.
    const merged = mergeSubEvents(
      normalizeSubEvents("screening", [screeningRow()]),
      normalizeSubEvents("performance", [])
    )

    expect(toCalendarEvents(merged)).toHaveLength(1)
  })

  it("empty range: an empty grid, not a crash", () => {
    expect(mergeSubEvents([], [])).toEqual([])
    expect(toCalendarEvents([])).toEqual([])
  })

  it("keeps unscheduled rows out of the grid", () => {
    const merged = mergeSubEvents(
      normalizeSubEvents("screening", [
        screeningRow(),
        screeningRow({ documentId: "scr-3", startDateTime: null }),
      ]),
      []
    )

    expect(merged).toHaveLength(2)
    expect(merged[1].documentId).toBe("scr-3") // unscheduled sorts last
    expect(toCalendarEvents(merged)).toHaveLength(1)
  })
})

describe("SUB_EVENT_WORK_TYPES (unit)", () => {
  it("mirrors the server-side WORK_KIND_RULES the lifecycle guard enforces", () => {
    // Kept in step with `server/src/content-types/sub-event-work-kind.ts`;
    // drifting here means the picker offers works the server will reject.
    expect(SUB_EVENT_WORK_TYPES.screening).toEqual(["film", "short-film"])
    expect(SUB_EVENT_WORK_TYPES.performance).toEqual(["play"])
  })
})
