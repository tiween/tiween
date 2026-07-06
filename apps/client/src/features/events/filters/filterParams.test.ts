import { describe, expect, it } from "vitest"

import {
  parseDateValue,
  parseEventFilters,
  serializeDateValue,
  serializeEventFilters,
} from "./filterParams"

describe("parseDateValue", () => {
  it("recognizes the presets", () => {
    expect(parseDateValue("today")).toEqual({ type: "today" })
    expect(parseDateValue("tomorrow")).toEqual({ type: "tomorrow" })
    expect(parseDateValue("weekend")).toEqual({ type: "weekend" })
  })

  it("recognizes a single valid day", () => {
    expect(parseDateValue("2026-07-10")).toEqual({
      type: "day",
      date: "2026-07-10",
    })
  })

  it("recognizes a valid inclusive range", () => {
    expect(parseDateValue("2026-07-10..2026-07-14")).toEqual({
      type: "range",
      start: "2026-07-10",
      end: "2026-07-14",
    })
  })

  it.each([
    undefined,
    null,
    "",
    "garbage",
    "this-week",
    "2026-13-40", // impossible month/day
    "2026-02-30", // not a real day
    "2026-07-10..bad",
    "2026-07-10..", // missing end
    "2026-07-10..2026-07-11..2026-07-12", // too many parts
    "2026-07-14..2026-07-10", // inverted
  ])("treats %j as no filter", (input) => {
    expect(parseDateValue(input)).toEqual({ type: "none" })
  })
})

describe("serializeDateValue", () => {
  it("round-trips every value shape", () => {
    expect(serializeDateValue({ type: "none" })).toBeUndefined()
    expect(serializeDateValue({ type: "today" })).toBe("today")
    expect(serializeDateValue({ type: "weekend" })).toBe("weekend")
    expect(serializeDateValue({ type: "day", date: "2026-07-10" })).toBe(
      "2026-07-10"
    )
    expect(
      serializeDateValue({ type: "range", start: "2026-07-10", end: "2026-07-14" })
    ).toBe("2026-07-10..2026-07-14")
  })
})

describe("parseEventFilters / serializeEventFilters", () => {
  it("parses a valid date token and preserves reserved keys", () => {
    const filters = parseEventFilters({
      date: "weekend",
      category: "cinema",
      region: "grand-tunis-1",
      city: "tunis-1",
      venue: "venue-1",
    })
    expect(filters).toEqual({
      date: "weekend",
      category: "cinema",
      region: "grand-tunis-1",
      city: "tunis-1",
      venue: "venue-1",
    })
  })

  it("parses region + city as opaque non-empty documentId tokens", () => {
    expect(
      parseEventFilters({ region: "grand-tunis-1", city: "tunis-1" })
    ).toEqual({ region: "grand-tunis-1", city: "tunis-1" })
  })

  it("drops empty region/city (treated as no location filter)", () => {
    expect(parseEventFilters({ region: "", city: "" })).toEqual({})
  })

  it("accepts a region without a city and a city without a region", () => {
    expect(parseEventFilters({ region: "grand-tunis-1" })).toEqual({
      region: "grand-tunis-1",
    })
    expect(parseEventFilters({ city: "tunis-1" })).toEqual({ city: "tunis-1" })
  })

  it("round-trips region + city through the query string", () => {
    const original = { region: "grand-tunis-1", city: "tunis-1" }
    const query = serializeEventFilters(original).toString()
    expect(query).toContain("region=grand-tunis-1")
    expect(query).toContain("city=tunis-1")
    expect(parseEventFilters(new URLSearchParams(query))).toEqual(original)
  })

  it("preserves region/city when the date changes (serialize round-trip)", () => {
    const next = { date: "today", region: "grand-tunis-1", city: "tunis-1" }
    const query = serializeEventFilters(next).toString()
    expect(parseEventFilters(new URLSearchParams(query))).toEqual(next)
  })

  it("drops a malformed date but keeps reserved keys", () => {
    const filters = parseEventFilters({ date: "garbage", category: "cinema" })
    expect(filters.date).toBeUndefined()
    expect(filters.category).toBe("cinema")
  })

  it("drops an inverted range", () => {
    expect(parseEventFilters({ date: "2026-07-14..2026-07-10" }).date).toBeUndefined()
  })

  it("reads from a URLSearchParams instance too", () => {
    const sp = new URLSearchParams("date=2026-07-10..2026-07-14&city=sfax-2")
    expect(parseEventFilters(sp)).toEqual({
      date: "2026-07-10..2026-07-14",
      city: "sfax-2",
    })
  })

  it("round-trips filters → query → filters", () => {
    const original = {
      date: "2026-07-10..2026-07-14",
      category: "cinema",
      city: "tunis-1",
    }
    const query = serializeEventFilters(original).toString()
    const roundTripped = parseEventFilters(new URLSearchParams(query))
    expect(roundTripped).toEqual(original)
  })

  it("serializes an empty filter set to an empty query", () => {
    expect(serializeEventFilters({}).toString()).toBe("")
  })

  it("parses venue as an opaque non-empty documentId token (Story 3.5)", () => {
    expect(parseEventFilters({ venue: "venue-1" })).toEqual({ venue: "venue-1" })
  })

  it("drops an empty/whitespace-preserving venue param", () => {
    expect(parseEventFilters({ venue: "" })).toEqual({})
  })

  it("round-trips venue through the query string", () => {
    const original = { venue: "venue-1" }
    const query = serializeEventFilters(original).toString()
    expect(query).toContain("venue=venue-1")
    expect(parseEventFilters(new URLSearchParams(query))).toEqual(original)
  })

  it("preserves venue alongside date + location through a serialize round-trip", () => {
    const next = {
      date: "today",
      region: "grand-tunis-1",
      city: "tunis-1",
      venue: "venue-1",
    }
    const query = serializeEventFilters(next).toString()
    expect(parseEventFilters(new URLSearchParams(query))).toEqual(next)
  })
})
