/**
 * useSubEvents tests.
 *
 * This hook is where the 2C.3 breakage actually lived: it decides which two
 * collections are queried and how the venue is reached. The filter shape is the
 * load-bearing part — neither sub-event type has a `venue` relation, so
 * reverting to the pre-2C.3 `venue: { id }` returns nothing for every venue,
 * and the calendar would sit empty with a green suite and no error.
 *
 * Driven through a probe component rather than a renderHook helper: the jest
 * `admin` project already mocks `@strapi/strapi/admin` this way, and the probe
 * doubles as proof the hook is usable from a component.
 */
import React from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "react-intl"

import type { UseSubEventsOptions } from "./useSubEvents"

import { useSubEvents } from "./useSubEvents"

const get = jest.fn()

jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: () => ({ get }),
}))

const SCREENING_URL =
  "/content-manager/collection-types/plugin::events-manager.screening"
const PERFORMANCE_URL =
  "/content-manager/collection-types/plugin::events-manager.performance"

const screeningRow = {
  id: 1,
  documentId: "scr-1",
  startDateTime: "2026-08-10T18:00:00.000Z",
  movie: { documentId: "work-film", title: "Le Silence", type: "film" },
  event: { documentId: "evt-1", title: "Projection" },
}

const performanceRow = {
  id: 2,
  documentId: "perf-1",
  startDateTime: "2026-08-10T20:30:00.000Z",
  play: { documentId: "work-play", title: "Hamlet", type: "play" },
  event: { documentId: "evt-2", title: "Représentation" },
}

const ok = (results: unknown[], total?: number) => ({
  data: {
    results,
    pagination: {
      page: 1,
      pageSize: 500,
      pageCount: 1,
      total: total ?? results.length,
    },
  },
})

/** Renders the hook and exposes its result as text for assertions. */
function Probe(options: UseSubEventsOptions) {
  const { subEvents, isLoading, error, partialError } = useSubEvents(options)

  return (
    <div>
      <span data-testid="ids">
        {subEvents.map((s) => s.documentId).join(",")}
      </span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{error ? error.message : ""}</span>
      <span data-testid="partial">{partialError ?? ""}</span>
    </div>
  )
}

async function renderHook(options: Partial<UseSubEventsOptions> = {}) {
  const props: UseSubEventsOptions = {
    venueId: "7",
    rangeStart: new Date(Date.UTC(2026, 7, 10)),
    rangeEnd: new Date(Date.UTC(2026, 7, 17)),
    ...options,
  }

  await act(async () => {
    render(
      <IntlProvider locale="en" messages={{}}>
        <Probe {...props} />
      </IntlProvider>
    )
  })
}

const paramsFor = (url: string) =>
  get.mock.calls.find((call) => call[0] === url)?.[1]?.params

describe("useSubEvents", () => {
  beforeEach(() => {
    get.mockReset()
  })

  it("queries both collections in parallel, and never the dead one", async () => {
    get.mockResolvedValue(ok([]))

    await renderHook()

    const urls = get.mock.calls.map((call) => call[0])
    expect(urls).toContain(SCREENING_URL)
    expect(urls).toContain(PERFORMANCE_URL)
    expect(urls.join()).not.toContain("showtime")
    expect(get).toHaveBeenCalledTimes(2)
  })

  it("reaches the venue THROUGH the event, not by a direct relation", async () => {
    get.mockResolvedValue(ok([]))

    await renderHook()

    const filters = paramsFor(SCREENING_URL).filters
    // The 2C.3 breakage in one assertion: sub-events have no `venue` of their
    // own, so the filter must travel through the parent event.
    expect(filters.event).toEqual({ venue: { id: "7" } })
    expect(filters.venue).toBeUndefined()
  })

  it("bounds the window with an exclusive end so no showing is double-counted", async () => {
    get.mockResolvedValue(ok([]))

    await renderHook()

    const { startDateTime } = paramsFor(PERFORMANCE_URL).filters
    expect(startDateTime.$gte).toBe("2026-08-10T00:00:00.000Z")
    // `$lt`, not `$lte`: a showing at exactly the boundary otherwise appears in
    // both adjacent weeks.
    expect(startDateTime.$lt).toBe("2026-08-17T00:00:00.000Z")
    expect(startDateTime.$lte).toBeUndefined()
  })

  it("adds the event-group filter through the event when one is selected", async () => {
    get.mockResolvedValue(ok([]))

    await renderHook({ eventGroupId: "3" })

    expect(paramsFor(SCREENING_URL).filters.event).toEqual({
      venue: { id: "7" },
      eventGroup: { id: "3" },
    })
  })

  it("populates each collection with only the relations it declares", async () => {
    get.mockResolvedValue(ok([]))

    await renderHook()

    expect(paramsFor(SCREENING_URL).populate).not.toContain("play")
    expect(paramsFor(PERFORMANCE_URL).populate).not.toContain("movie")
  })

  it("merges both kinds into one chronological list", async () => {
    get.mockImplementation(async (url: string) =>
      url === SCREENING_URL ? ok([screeningRow]) : ok([performanceRow])
    )

    await renderHook()

    await waitFor(() =>
      expect(screen.getByTestId("ids")).toHaveTextContent("scr-1,perf-1")
    )
    expect(screen.getByTestId("error")).toHaveTextContent("")
    expect(screen.getByTestId("partial")).toHaveTextContent("")
    expect(screen.getByTestId("loading")).toHaveTextContent("false")
  })

  it("one fetch fails: renders the kind that resolved, warns about the other", async () => {
    // The matrix row that only ever had a hand-built fixture behind it.
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {})

    get.mockImplementation(async (url: string) => {
      if (url === PERFORMANCE_URL) throw new Error("500")
      return ok([screeningRow])
    })

    await renderHook()

    await waitFor(() =>
      expect(screen.getByTestId("ids")).toHaveTextContent("scr-1")
    )
    // Degraded, not blank, and not a hard error.
    expect(screen.getByTestId("error")).toHaveTextContent("")
    expect(screen.getByTestId("partial")).toHaveTextContent(
      "Some showings could not be loaded"
    )
    // The reason is the only diagnostic a developer gets.
    expect(consoleError).toHaveBeenCalledWith(
      "[planning] failed to load performances",
      expect.any(Error)
    )

    consoleError.mockRestore()
  })

  it("both fetches fail: a hard error, and no stuck spinner", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {})

    get.mockRejectedValue(new Error("500"))

    await renderHook()

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "SUB_EVENTS_LOAD_FAILED"
      )
    )
    expect(screen.getByTestId("ids")).toHaveTextContent("")
    expect(screen.getByTestId("loading")).toHaveTextContent("false")

    consoleError.mockRestore()
  })

  it("warns when a window overflows the single page it fetches", async () => {
    get.mockResolvedValue(ok([screeningRow], 900))

    await renderHook()

    await waitFor(() =>
      expect(screen.getByTestId("partial")).toHaveTextContent(
        "Too many showings in this period"
      )
    )
    // Still renders what it has.
    expect(screen.getByTestId("ids")).toHaveTextContent("scr-1")
  })

  it("treats a malformed body as that collection failing, not as a crash", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {})

    get.mockImplementation(async (url: string) =>
      url === PERFORMANCE_URL
        ? { data: { unexpected: true } }
        : ok([screeningRow])
    )

    await renderHook()

    await waitFor(() =>
      expect(screen.getByTestId("ids")).toHaveTextContent("scr-1")
    )
    // The bug this guards: throwing inside the async callback left `isLoading`
    // true forever — a permanent spinner over an empty grid.
    expect(screen.getByTestId("loading")).toHaveTextContent("false")
    expect(screen.getByTestId("partial")).toHaveTextContent(
      "Some showings could not be loaded"
    )

    consoleError.mockRestore()
  })

  it("issues no request at all without a venue", async () => {
    get.mockResolvedValue(ok([]))

    await renderHook({ venueId: null })

    expect(get).not.toHaveBeenCalled()
    expect(screen.getByTestId("loading")).toHaveTextContent("false")
  })
})
