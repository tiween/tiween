/**
 * EventBlock tests.
 *
 * The badge is the only edit this change makes inside `BigCalendar/`, and the
 * contract it must keep is narrow: render whatever label the caller passes
 * through `extendedProps`, render nothing when there is none, and never learn
 * what a "screening" is. That last part is what keeps `BigCalendar` reusable
 * and free of the French literals its deferred-work audit already flagged.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { render, screen } from "@testing-library/react"

import type { CalendarEvent, EventPosition } from "../BigCalendar/types"

import { EventBlock } from "../BigCalendar/EventBlock"

const position: EventPosition = {
  top: 0,
  height: 20,
  left: 0,
  width: 100,
  column: 0,
  totalColumns: 1,
}

const baseEvent: CalendarEvent = {
  id: "screening:scr-1",
  title: "Le Silence",
  start: new Date(2026, 7, 10, 18, 0),
  end: new Date(2026, 7, 10, 19, 35),
}

function renderBlock(event: CalendarEvent, pos: EventPosition = position) {
  return render(
    <DesignSystemProvider theme={lightTheme}>
      <EventBlock event={event} position={pos} />
    </DesignSystemProvider>
  )
}

describe("EventBlock", () => {
  it("renders the caller's translated badge label", () => {
    renderBlock({
      ...baseEvent,
      extendedProps: { kind: "screening", kindLabel: "SCREENING" },
    })

    expect(screen.getByText("SCREENING")).toBeInTheDocument()
  })

  it("renders no badge when no label is passed", () => {
    renderBlock({ ...baseEvent, extendedProps: { kind: "screening" } })

    expect(screen.queryByText("SCREENING")).not.toBeInTheDocument()
    // The block itself is unaffected — a label-less caller renders as before.
    expect(screen.getByText("Le Silence")).toBeInTheDocument()
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "Le Silence, 18:00 - 19:35"
    )
  })

  it("puts the label in the accessible name, not only in the visuals", () => {
    renderBlock({
      ...baseEvent,
      extendedProps: { kind: "performance", kindLabel: "THEATRE" },
    })

    expect(screen.getByRole("button")).toHaveAccessibleName(
      "THEATRE, Le Silence, 18:00 - 19:35"
    )
  })

  it("keeps the label announced even when the block is too short to show it", () => {
    // Under ~3% height the block hides its secondary lines. A screen-reader
    // user must still be told which kind it is.
    renderBlock(
      {
        ...baseEvent,
        extendedProps: { kind: "performance", kindLabel: "THEATRE" },
      },
      { ...position, height: 1 }
    )

    expect(screen.queryByText("THEATRE")).not.toBeInTheDocument()
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "THEATRE, Le Silence, 18:00 - 19:35"
    )
  })

  it("ignores a non-string label rather than rendering machine text", () => {
    renderBlock({
      ...baseEvent,
      extendedProps: { kind: "screening", kindLabel: { some: "object" } },
    })

    expect(screen.getByRole("button")).toHaveAccessibleName(
      "Le Silence, 18:00 - 19:35"
    )
  })
})
