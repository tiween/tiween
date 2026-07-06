import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { DateFilterValue } from "../../filters/filterParams"
import type { EventDateFilterLabels } from "./EventDateFilter"

import { EventDateFilter } from "./EventDateFilter"

const labels: EventDateFilterLabels = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
  weekend: "Ce weekend",
  custom: "Choisir",
  clear: "Effacer",
  groupLabel: "Filtrer par date",
}

function renderFilter(
  value: DateFilterValue,
  onChange: (v: DateFilterValue) => void = vi.fn()
) {
  return render(
    <EventDateFilter value={value} onChange={onChange} labels={labels} />
  )
}

describe("EventDateFilter", () => {
  it("renders the three presets + the custom trigger", () => {
    renderFilter({ type: "none" })
    expect(screen.getByRole("button", { name: "Aujourd'hui" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Demain" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Ce weekend" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Choisir/ })).toBeTruthy()
  })

  it("shows no clear affordance when there is no active filter", () => {
    renderFilter({ type: "none" })
    expect(screen.queryByRole("button", { name: /Effacer/ })).toBeNull()
  })

  it("highlights the active preset via aria-pressed", () => {
    renderFilter({ type: "weekend" })
    expect(
      screen.getByRole("button", { name: "Ce weekend" }).getAttribute("aria-pressed")
    ).toBe("true")
    expect(
      screen.getByRole("button", { name: "Aujourd'hui" }).getAttribute("aria-pressed")
    ).toBe("false")
  })

  it.each([
    ["Aujourd'hui", { type: "today" }],
    ["Demain", { type: "tomorrow" }],
    ["Ce weekend", { type: "weekend" }],
  ] as const)("emits %s selection", (name, expected) => {
    const onChange = vi.fn()
    renderFilter({ type: "none" }, onChange)
    fireEvent.click(screen.getByRole("button", { name }))
    expect(onChange).toHaveBeenCalledWith(expected)
  })

  it("shows the picked range on the custom chip and marks it active", () => {
    renderFilter({ type: "range", start: "2026-07-10", end: "2026-07-14" })
    const custom = screen.getByRole("button", {
      name: /10\/07\/2026.*14\/07\/2026/,
    })
    expect(custom).toBeTruthy()
    expect(custom.getAttribute("aria-pressed")).toBe("true")
  })

  it("shows the picked single day on the custom chip", () => {
    renderFilter({ type: "day", date: "2026-07-10" })
    expect(
      screen
        .getByRole("button", { name: /10\/07\/2026/ })
        .getAttribute("aria-pressed")
    ).toBe("true")
  })

  it("clears the active filter", () => {
    const onChange = vi.fn()
    renderFilter({ type: "today" }, onChange)
    fireEvent.click(screen.getByRole("button", { name: /Effacer/ }))
    expect(onChange).toHaveBeenCalledWith({ type: "none" })
  })
})
