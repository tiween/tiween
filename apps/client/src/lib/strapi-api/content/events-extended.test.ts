import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Mock } from "vitest"

import { PublicStrapiClient } from "@/lib/strapi-api"

import {
  buildDateRange,
  endOfDayInDays,
  endOfToday,
  fetchEvents,
  getFeaturedSlice,
  getThisWeekSlice,
  getTonightSlice,
  getTrendingSlice,
  startOfDayInDays,
  startOfToday,
  toEventsSlice,
} from "./events-extended"

// Mock the Strapi client so no network/Strapi boot is needed.
vi.mock("@/lib/strapi-api", () => ({
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))

const fetchAPI = PublicStrapiClient.fetchAPI as unknown as Mock

/** Build a Strapi v5 list response with `count` events. */
function listResponse(count: number, total = count) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      documentId: `evt-${i + 1}`,
      title: `Event ${i + 1}`,
      slug: `event-${i + 1}`,
      featured: false,
    })),
    meta: { pagination: { page: 1, pageSize: 12, pageCount: 1, total } },
  }
}

beforeEach(() => {
  fetchAPI.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("toEventsSlice", () => {
  it("normalizes a v5 list response", () => {
    expect(toEventsSlice(listResponse(2, 7))).toEqual({
      events: expect.arrayContaining([
        expect.objectContaining({ documentId: "evt-1" }),
      ]),
      total: 7,
    })
  })

  it("returns an empty slice for a null/garbage response", () => {
    expect(toEventsSlice(null)).toEqual({ events: [], total: 0 })
    expect(toEventsSlice({})).toEqual({ events: [], total: 0 })
  })

  it("falls back total to data length when meta is missing", () => {
    expect(toEventsSlice({ data: [{ documentId: "a" }] })).toEqual({
      events: [{ documentId: "a" }],
      total: 1,
    })
  })
})

describe("date-range helpers", () => {
  const now = new Date("2026-07-06T15:00:00.000Z")

  it("startOfToday / endOfToday bracket the Africa/Tunis day as ISO", () => {
    // Boundaries are computed in Africa/Tunis (fixed UTC+1), independent of the
    // test runner's timezone — assert the wall-clock in that zone, not local.
    const tunis = (iso: string) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Tunis",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso))
    expect(tunis(startOfToday(now))).toBe("00:00")
    expect(tunis(endOfToday(now))).toBe("23:59")
    expect(new Date(endOfToday(now)).getTime()).toBeGreaterThan(
      new Date(startOfToday(now)).getTime()
    )
    expect(startOfToday(now)).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/)
  })

  it("endOfDayInDays advances by whole days", () => {
    const d0 = new Date(endOfToday(now)).getTime()
    const d7 = new Date(endOfDayInDays(7, now)).getTime()
    const days = Math.round((d7 - d0) / (24 * 60 * 60 * 1000))
    expect(days).toBe(7)
  })

  it("buildDateRange maps presets to bounded windows", () => {
    expect(buildDateRange("today", now).endDate).toBeDefined()
    expect(buildDateRange("this-week", now).startDate).toBeDefined()
    // No filter → open 'from now' window (lower bound only).
    const none = buildDateRange(undefined, now)
    expect(none.startDate).toBeDefined()
    expect(none.endDate).toBeUndefined()
  })
})

describe("buildDateRange (Story 3.3 — Tunis-aware + range-capable)", () => {
  const now = new Date("2026-07-06T15:00:00.000Z")

  const tunisDate = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Tunis",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso))
  const tunisTime = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Tunis",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso))
  const tunisWeekday = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Tunis",
      weekday: "short",
    }).format(new Date(iso))

  it("today → today's Tunis start..end window", () => {
    const r = buildDateRange("today", now)
    expect(r.startDate).toBe(startOfToday(now))
    expect(r.endDate).toBe(endOfToday(now))
    expect(tunisTime(r.startDate!)).toBe("00:00")
    expect(tunisTime(r.endDate!)).toBe("23:59")
  })

  it("tomorrow → next Tunis day start..end window", () => {
    const r = buildDateRange("tomorrow", now)
    expect(r.startDate).toBe(startOfDayInDays(1, now))
    expect(r.endDate).toBe(endOfDayInDays(1, now))
  })

  it("weekend → upcoming Saturday 00:00 .. Sunday 23:59 (Tunis)", () => {
    const r = buildDateRange("weekend", now)
    expect(r.startDate).toBeDefined()
    expect(r.endDate).toBeDefined()
    expect(tunisWeekday(r.startDate!)).toBe("Sat")
    expect(tunisWeekday(r.endDate!)).toBe("Sun")
    expect(tunisTime(r.startDate!)).toBe("00:00")
    expect(tunisTime(r.endDate!)).toBe("23:59")
    expect(new Date(r.endDate!).getTime()).toBeGreaterThan(
      new Date(r.startDate!).getTime()
    )
  })

  it("weekend on a Sunday → the current Sunday (does not skip to next weekend)", () => {
    // 2026-07-12 is a Sunday in Africa/Tunis; the weekend is already underway.
    const sunday = new Date("2026-07-12T15:00:00.000Z")
    const r = buildDateRange("weekend", sunday)
    expect(r.startDate).toBe(startOfToday(sunday))
    expect(r.endDate).toBe(endOfToday(sunday))
    expect(tunisWeekday(r.startDate!)).toBe("Sun")
    expect(tunisWeekday(r.endDate!)).toBe("Sun")
    expect(tunisDate(r.startDate!)).toBe("2026-07-12")
  })

  it("single YYYY-MM-DD → that exact Tunis calendar day (independent of now)", () => {
    const r = buildDateRange("2026-07-10", now)
    expect(tunisDate(r.startDate!)).toBe("2026-07-10")
    expect(tunisDate(r.endDate!)).toBe("2026-07-10")
    expect(tunisTime(r.startDate!)).toBe("00:00")
    expect(tunisTime(r.endDate!)).toBe("23:59")
  })

  it("range YYYY-MM-DD..YYYY-MM-DD → [start-of-first, end-of-last] (Tunis)", () => {
    const r = buildDateRange("2026-07-10..2026-07-14", now)
    expect(tunisDate(r.startDate!)).toBe("2026-07-10")
    expect(tunisTime(r.startDate!)).toBe("00:00")
    expect(tunisDate(r.endDate!)).toBe("2026-07-14")
    expect(tunisTime(r.endDate!)).toBe("23:59")
  })

  it("inverted range → no filter (open-ended upcoming from start-of-today)", () => {
    const r = buildDateRange("2026-07-14..2026-07-10", now)
    expect(r.startDate).toBe(startOfToday(now))
    expect(r.endDate).toBeUndefined()
  })

  it.each(["garbage", "2026-13-40", "2026-07-10..bad", "2026-07-10..", ""])(
    "invalid input %j → open-ended upcoming",
    (input) => {
      const r = buildDateRange(input, now)
      expect(r.startDate).toBe(startOfToday(now))
      expect(r.endDate).toBeUndefined()
    }
  )

  it("undefined → open-ended upcoming (lower bound only)", () => {
    const r = buildDateRange(undefined, now)
    expect(r.startDate).toBe(startOfToday(now))
    expect(r.endDate).toBeUndefined()
  })
})

describe("fetchEvents", () => {
  it("passes only defined, allowlisted flat query params", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({
      locale: "fr",
      featured: true,
      startDate: "2026-07-06T00:00:00.000Z",
      sort: "startDateTime:asc",
      pageSize: 12,
    })
    const [path, params] = fetchAPI.mock.calls[0]
    expect(path).toBe("/events-manager/events")
    expect(params).toMatchObject({
      locale: "fr",
      page: 1,
      pageSize: 12,
      featured: true,
      startDate: "2026-07-06T00:00:00.000Z",
      sort: "startDateTime:asc",
    })
    // Undefined filters are omitted entirely (endpoint strips unknown params).
    expect(params).not.toHaveProperty("eventStatus")
    expect(params).not.toHaveProperty("endDate")
  })

  it("forwards the category param to the endpoint (Story 3.2)", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({
      locale: "fr",
      category: "theater",
      sort: "startDateTime:asc",
    })
    const [path, params] = fetchAPI.mock.calls[0]
    expect(path).toBe("/events-manager/events")
    expect(params).toMatchObject({ category: "theater" })
  })

  it("omits category when it is not provided", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({ locale: "fr" })
    const [, params] = fetchAPI.mock.calls[0]
    expect(params).not.toHaveProperty("category")
  })

  it("forwards city + region location params to the endpoint", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({
      locale: "fr",
      city: "city-1",
      region: "region-1",
      sort: "startDateTime:asc",
    })
    const [path, params] = fetchAPI.mock.calls[0]
    expect(path).toBe("/events-manager/events")
    expect(params).toMatchObject({ city: "city-1", region: "region-1" })
  })

  it("omits city/region when they are not provided", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({ locale: "fr" })
    const [, params] = fetchAPI.mock.calls[0]
    expect(params).not.toHaveProperty("city")
    expect(params).not.toHaveProperty("region")
  })

  it("forwards the venue param to the endpoint (Story 3.5)", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({
      locale: "fr",
      venue: "venue-1",
      sort: "startDateTime:asc",
    })
    const [path, params] = fetchAPI.mock.calls[0]
    expect(path).toBe("/events-manager/events")
    expect(params).toMatchObject({ venue: "venue-1" })
  })

  it("omits venue when it is not provided", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({ locale: "fr" })
    const [, params] = fetchAPI.mock.calls[0]
    expect(params).not.toHaveProperty("venue")
  })

  it("forwards the keyword q param to the endpoint (Story 3.6)", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({
      locale: "fr",
      q: "inception",
      sort: "startDateTime:asc",
    })
    const [path, params] = fetchAPI.mock.calls[0]
    expect(path).toBe("/events-manager/events")
    expect(params).toMatchObject({ q: "inception" })
  })

  it("omits q when it is not provided", async () => {
    fetchAPI.mockResolvedValue(listResponse(1))
    await fetchEvents({ locale: "fr" })
    const [, params] = fetchAPI.mock.calls[0]
    expect(params).not.toHaveProperty("q")
  })

  it("returns an empty slice (fail-soft) when the client throws", async () => {
    fetchAPI.mockRejectedValue(new Error("boom"))
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(fetchEvents({ locale: "fr" })).resolves.toEqual({
      events: [],
      total: 0,
    })
    expect(spy).toHaveBeenCalled()
  })

  it("returns an empty slice when the endpoint yields zero events", async () => {
    fetchAPI.mockResolvedValue(listResponse(0, 0))
    await expect(fetchEvents({ locale: "fr" })).resolves.toEqual({
      events: [],
      total: 0,
    })
  })
})

describe("curated slices", () => {
  const now = new Date("2026-07-06T15:00:00.000Z")

  it("getFeaturedSlice queries featured=true with a lower date bound", async () => {
    fetchAPI.mockResolvedValue(listResponse(3))
    const slice = await getFeaturedSlice("fr", now)
    const [path, params] = fetchAPI.mock.calls[0]
    expect(path).toBe("/events-manager/events")
    expect(params.featured).toBe(true)
    expect(params.startDate).toBe(startOfToday(now))
    expect(params.sort).toBe("startDateTime:asc")
    expect(slice.events).toHaveLength(3)
  })

  it("getTonightSlice queries today's start..end window", async () => {
    fetchAPI.mockResolvedValue(listResponse(2))
    await getTonightSlice("fr", now)
    const [, params] = fetchAPI.mock.calls[0]
    expect(params.startDate).toBe(startOfToday(now))
    expect(params.endDate).toBe(endOfToday(now))
  })

  it("getThisWeekSlice queries tomorrow..+7d (no overlap with tonight)", async () => {
    fetchAPI.mockResolvedValue(listResponse(4))
    await getThisWeekSlice("fr", now)
    const [, params] = fetchAPI.mock.calls[0]
    expect(params.startDate).toBe(startOfDayInDays(1, now))
    expect(params.endDate).toBe(endOfDayInDays(7, now))
  })

  it("getTrendingSlice hits the trending endpoint", async () => {
    fetchAPI.mockResolvedValue(listResponse(5))
    const slice = await getTrendingSlice("fr")
    const [path, params] = fetchAPI.mock.calls[0]
    expect(path).toBe("/events-manager/events/trending")
    expect(params).toMatchObject({ locale: "fr", page: 1 })
    expect(slice.events).toHaveLength(5)
  })

  it("getTrendingSlice degrades to an empty slice on error", async () => {
    fetchAPI.mockRejectedValue(new Error("down"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(getTrendingSlice("fr")).resolves.toEqual({
      events: [],
      total: 0,
    })
  })
})
