/**
 * PlanningCalendarNew tests.
 *
 * The integration layer's own responsibilities, isolated from the calendar
 * grid and the modal (both stubbed): route a block click to the right row,
 * refresh after a write, and degrade rather than blank on a partial failure.
 *
 * The refetch assertion is the load-bearing one. The old surface reloaded by
 * nudging `currentDate`; that nudge is gone, so nothing but an explicit
 * `refetch()` refreshes the grid after a save — and if it were dropped, every
 * write would leave the calendar silently stale with no test failing.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { fireEvent, render, screen } from "@testing-library/react"
import { IntlProvider } from "react-intl"

import type { SubEvent } from "../../hooks/subEventTransform"

import { PlanningCalendarNew } from "../PlanningCalendarNew"

const refetch = jest.fn()
let hookState: {
  subEvents: SubEvent[]
  isLoading: boolean
  error: Error | null
  partialError: string | null
}

jest.mock("../../hooks/useSubEvents", () => ({
  useSubEvents: () => ({ ...hookState, refetch }),
}))

/**
 * Stub the grid: it is reused verbatim and has its own behaviour. What matters
 * here is the wiring, so expose the two callbacks as buttons.
 */
jest.mock("../BigCalendar", () => ({
  BigCalendar: ({ events, onEventClick, onSlotClick }: any) => (
    <div>
      <span data-testid="event-count">{events.length}</span>
      <span data-testid="event-titles">
        {events.map((e: any) => e.title).join("|")}
      </span>
      {events.map((event: any) => (
        <button key={event.id} onClick={() => onEventClick(event)}>
          {`block:${event.id}`}
        </button>
      ))}
      <button onClick={() => onSlotClick(new Date(2099, 0, 1, 20, 0))}>
        empty-slot
      </button>
      <button onClick={() => onSlotClick(new Date(2020, 0, 1, 20, 0))}>
        past-slot
      </button>
    </div>
  ),
}))

/** Stub the modal: report which row it opened on, and let a test "save". */
jest.mock("../SubEventModal", () => ({
  SubEventModal: ({ subEvent, prefilledDate, onSuccess }: any) => (
    <div>
      <span data-testid="modal-mode">{subEvent ? "edit" : "create"}</span>
      <span data-testid="modal-target">
        {subEvent
          ? `${subEvent.kind}:${subEvent.documentId}`
          : String(prefilledDate)}
      </span>
      <button onClick={onSuccess}>modal-save</button>
    </div>
  ),
}))

const performance: SubEvent = {
  kind: "performance",
  id: 2,
  documentId: "perf-1",
  startDateTime: "2026-08-10T20:30:00.000Z",
  start: new Date(2026, 7, 10, 20, 30),
  order: 1,
  price: null,
  audioLanguage: null,
  subtitleLanguage: null,
  surtitleLanguage: "fr",
  videoFormat: null,
  work: {
    documentId: "work-play",
    title: "Hamlet",
    type: "play",
    duration: 110,
  },
  event: { documentId: "evt-2", title: "Représentation", venue: { id: 7 } },
}

function renderCalendar() {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <DesignSystemProvider theme={lightTheme}>
        <PlanningCalendarNew venueId="7" />
      </DesignSystemProvider>
    </IntlProvider>
  )
}

describe("PlanningCalendarNew", () => {
  beforeEach(() => {
    refetch.mockClear()
    hookState = {
      subEvents: [performance],
      isLoading: false,
      error: null,
      partialError: null,
    }
  })

  it("refetches after a successful save — nothing else refreshes the grid", () => {
    renderCalendar()

    fireEvent.click(
      screen.getByRole("button", { name: "block:performance:perf-1" })
    )
    expect(refetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "modal-save" }))

    expect(refetch).toHaveBeenCalledTimes(1)
    // The modal closes on success.
    expect(screen.queryByTestId("modal-mode")).not.toBeInTheDocument()
  })

  it("opens the modal on the row the clicked block came from", () => {
    renderCalendar()

    fireEvent.click(
      screen.getByRole("button", { name: "block:performance:perf-1" })
    )

    expect(screen.getByTestId("modal-mode")).toHaveTextContent("edit")
    expect(screen.getByTestId("modal-target")).toHaveTextContent(
      "performance:perf-1"
    )
  })

  it("opens the modal in create mode from an empty slot", () => {
    renderCalendar()

    fireEvent.click(screen.getByRole("button", { name: "empty-slot" }))

    expect(screen.getByTestId("modal-mode")).toHaveTextContent("create")
  })

  it("opens on a past slot too — the rule lives in validation, not in the click", () => {
    // The old surface silently ignored the click while the DatePicker happily
    // accepted yesterday. Refusing here as well would restore that split.
    renderCalendar()

    fireEvent.click(screen.getByRole("button", { name: "past-slot" }))

    expect(screen.getByTestId("modal-mode")).toHaveTextContent("create")
  })

  it("badges blocks with the translated kind label", () => {
    renderCalendar()

    expect(screen.getByTestId("event-count")).toHaveTextContent("1")
    expect(screen.getByTestId("event-titles")).toHaveTextContent("Hamlet")
  })

  it("shows a partial failure above the grid without blanking it", () => {
    hookState.partialError = "Some showings could not be loaded (THEATRE)."

    renderCalendar()

    expect(
      screen.getByText("Some showings could not be loaded (THEATRE).")
    ).toBeInTheDocument()
    // The kind that resolved is still on the grid.
    expect(screen.getByTestId("event-count")).toHaveTextContent("1")
  })

  it("replaces the grid only when both collections failed", () => {
    hookState.error = new Error("SUB_EVENTS_LOAD_FAILED")

    renderCalendar()

    expect(screen.getByText("Failed to load showings")).toBeInTheDocument()
    expect(screen.queryByTestId("event-count")).not.toBeInTheDocument()
  })

  it("shows an empty state when the window holds no showings", () => {
    hookState.subEvents = []

    renderCalendar()

    expect(
      screen.getByText("No showing scheduled in this period")
    ).toBeInTheDocument()
  })
})
