import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type {
  CategoryFilterValue,
  EventCategoryFilterLabels,
} from "./EventCategoryFilter"

import { EventCategoryFilter } from "./EventCategoryFilter"

const labels: EventCategoryFilterLabels = {
  groupLabel: "Catégories d'événements",
  tabs: {
    all: "Tout",
    cinema: "Cinéma",
    theater: "Théâtre",
    shorts: "Courts-métrages",
    music: "Musique",
    exhibitions: "Expositions",
  },
}

const STORAGE_KEY = "tiween.events.category"

function renderFilter(
  value: CategoryFilterValue,
  onChange: (
    v: CategoryFilterValue,
    o?: { replace?: boolean }
  ) => void = vi.fn()
) {
  return render(
    <EventCategoryFilter value={value} onChange={onChange} labels={labels} />
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
  // CategoryTabs auto-scrolls the active tab into view; jsdom lacks the API.
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("EventCategoryFilter", () => {
  it("renders the six tabs under a localized accessible tablist name", () => {
    renderFilter({})
    expect(
      screen.getByRole("tablist", { name: "Catégories d'événements" })
    ).toBeTruthy()
    for (const label of Object.values(labels.tabs)) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy()
    }
  })

  it("marks 'Tout' active when no category token is set", () => {
    renderFilter({})
    expect(
      screen.getByRole("tab", { name: "Tout" }).getAttribute("aria-selected")
    ).toBe("true")
  })

  it("maps the active URL token onto its tab (theater → Théâtre)", () => {
    renderFilter({ category: "theater" })
    expect(
      screen.getByRole("tab", { name: "Théâtre" }).getAttribute("aria-selected")
    ).toBe("true")
    expect(
      screen.getByRole("tab", { name: "Tout" }).getAttribute("aria-selected")
    ).toBe("false")
  })

  it("emits the selected token on tab click and persists it to sessionStorage", () => {
    const onChange = vi.fn()
    renderFilter({}, onChange)

    fireEvent.click(screen.getByRole("tab", { name: "Musique" }))

    expect(onChange).toHaveBeenCalledWith({ category: "music" })
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("music")
  })

  it("emits no category on 'Tout' and clears the persisted token", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "theater")
    const onChange = vi.fn()
    renderFilter({ category: "theater" }, onChange)

    fireEvent.click(screen.getByRole("tab", { name: "Tout" }))

    expect(onChange).toHaveBeenCalledWith({ category: undefined })
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("restores a valid saved token into the URL on mount (replace, no push)", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "exhibitions")
    const onChange = vi.fn()
    renderFilter({}, onChange)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      { category: "exhibitions" },
      { replace: true }
    )
  })

  it("does not restore over an active URL category", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "music")
    const onChange = vi.fn()
    renderFilter({ category: "cinema" }, onChange)

    expect(onChange).not.toHaveBeenCalled()
    // The saved value is left intact for a later unfiltered visit.
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("music")
  })

  it("purges an invalid saved token instead of restoring it", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "bogus")
    const onChange = vi.fn()
    renderFilter({}, onChange)

    expect(onChange).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("does nothing on mount when nothing is saved and no token is active", () => {
    const onChange = vi.fn()
    renderFilter({}, onChange)

    expect(onChange).not.toHaveBeenCalled()
  })

  it("restores only once (a later re-render never re-applies the saved token)", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "shorts")
    const onChange = vi.fn()
    const { rerender } = renderFilter({}, onChange)

    // Simulate the parent applying then clearing the filter.
    rerender(
      <EventCategoryFilter
        value={{ category: "shorts" }}
        onChange={onChange}
        labels={labels}
      />
    )
    rerender(
      <EventCategoryFilter value={{}} onChange={onChange} labels={labels} />
    )

    // Only the initial mount-time restore fired.
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      { category: "shorts" },
      { replace: true }
    )
  })
})
