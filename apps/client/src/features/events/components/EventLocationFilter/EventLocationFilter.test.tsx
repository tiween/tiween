import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type {
  EventLocationFilterLabels,
  EventLocationRegion,
  LocationFilterValue,
} from "./EventLocationFilter"

// The shadcn Select (and this control) render lucide-react icons. Under the
// repo's React 18/19 dual-install, lucide's icon elements are minted by a
// different React copy than the aliased test runtime and fail to reconcile
// ("Objects are not valid as a React child"). Stub the icons with local SVGs
// created by the test's own React so the Select renders. Test-env only.
vi.mock("lucide-react", () => {
  const Icon = (props: Record<string, unknown>) =>
    React.createElement("svg", props)
  return { __esModule: true, MapPin: Icon, Check: Icon, ChevronsUpDown: Icon }
})

import { EventLocationFilter } from "./EventLocationFilter"

const labels: EventLocationFilterLabels = {
  groupLabel: "Filtrer par lieu",
  regionPlaceholder: "Région",
  cityPlaceholder: "Ville",
  allRegions: "Toutes les régions",
  allCities: "Toutes les villes",
  clear: "Effacer",
}

const regions: EventLocationRegion[] = [
  {
    documentId: "grand-tunis-1",
    name: "Grand Tunis",
    cities: [
      { documentId: "tunis-1", name: "Tunis" },
      { documentId: "ariana-1", name: "Ariana" },
    ],
  },
  {
    documentId: "sfax-1",
    name: "Sfax",
    cities: [{ documentId: "sfax-city-1", name: "Sfax" }],
  },
]

const STORAGE_KEY = "tiween.events.location"

function renderFilter(
  value: LocationFilterValue,
  onChange: (v: LocationFilterValue, o?: { replace?: boolean }) => void = vi.fn(),
  regionData: EventLocationRegion[] = regions
) {
  return render(
    <EventLocationFilter
      regions={regionData}
      value={value}
      onChange={onChange}
      labels={labels}
    />
  )
}

// Radix Select relies on pointer-capture + scroll APIs jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("EventLocationFilter", () => {
  it("renders the group with an accessible name and both selects", () => {
    renderFilter({})
    expect(
      screen.getByRole("group", { name: "Filtrer par lieu" })
    ).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Région" })).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Ville" })).toBeTruthy()
  })

  it("renders nothing when there are no regions (fail-soft)", () => {
    const { container } = renderFilter({}, vi.fn(), [])
    expect(container.firstChild).toBeNull()
  })

  it("shows the 'all regions' label and no active highlight when empty", () => {
    renderFilter({})
    const region = screen.getByRole("combobox", { name: "Région" })
    expect(region.textContent).toContain("Toutes les régions")
    expect(region.getAttribute("data-active")).toBe("false")
  })

  it("highlights the region trigger and shows its name when active", () => {
    renderFilter({ region: "grand-tunis-1" })
    const region = screen.getByRole("combobox", { name: "Région" })
    expect(region.textContent).toContain("Grand Tunis")
    expect(region.getAttribute("data-active")).toBe("true")
  })

  it("disables the city select until a region is chosen (cascade dependency)", () => {
    renderFilter({})
    const city = screen.getByRole("combobox", { name: "Ville" })
    expect(city.getAttribute("data-disabled")).not.toBeNull()
  })

  it("enables the city select and shows the active city once region+city are set", () => {
    renderFilter({ region: "grand-tunis-1", city: "tunis-1" })
    const city = screen.getByRole("combobox", { name: "Ville" })
    expect(city.getAttribute("data-disabled")).toBeNull()
    expect(city.textContent).toContain("Tunis")
    expect(city.getAttribute("data-active")).toBe("true")
  })

  it("shows the clear affordance only when a location is active", () => {
    const { rerender } = renderFilter({})
    expect(screen.queryByRole("button", { name: /Effacer/ })).toBeNull()
    rerender(
      <EventLocationFilter
        regions={regions}
        value={{ region: "grand-tunis-1" }}
        onChange={vi.fn()}
        labels={labels}
      />
    )
    expect(screen.getByRole("button", { name: /Effacer/ })).toBeTruthy()
  })

  it("clear resets both region and city and wipes localStorage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ region: "grand-tunis-1", city: "tunis-1" })
    )
    const onChange = vi.fn()
    renderFilter({ region: "grand-tunis-1", city: "tunis-1" }, onChange)
    fireEvent.click(screen.getByRole("button", { name: /Effacer/ }))
    expect(onChange).toHaveBeenCalledWith({})
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  describe("localStorage restore-on-mount", () => {
    it("restores a saved location into the URL when the filter is empty", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ region: "grand-tunis-1", city: "tunis-1" })
      )
      const onChange = vi.fn()
      renderFilter({}, onChange)
      expect(onChange).toHaveBeenCalledWith(
        { region: "grand-tunis-1", city: "tunis-1" },
        { replace: true }
      )
    })

    it("does NOT restore when the URL already carries a location", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ region: "sfax-1" })
      )
      const onChange = vi.fn()
      renderFilter({ region: "grand-tunis-1" }, onChange)
      expect(onChange).not.toHaveBeenCalled()
    })

    it("does NOT restore when there is no saved location", () => {
      const onChange = vi.fn()
      renderFilter({}, onChange)
      expect(onChange).not.toHaveBeenCalled()
    })

    it("ignores garbage in localStorage", () => {
      window.localStorage.setItem(STORAGE_KEY, "not-json{")
      const onChange = vi.fn()
      renderFilter({}, onChange)
      expect(onChange).not.toHaveBeenCalled()
    })

    it("does NOT restore when geography is empty (control is hidden)", () => {
      // Fail-soft path: getRegions failed → no control → restoring would filter
      // the listing via a hidden, unclearable filter.
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ region: "grand-tunis-1", city: "tunis-1" })
      )
      const onChange = vi.fn()
      renderFilter({}, onChange, [])
      expect(onChange).not.toHaveBeenCalled()
    })

    it("drops a stale saved region absent from the current regions, and clears storage", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ region: "deleted-region-9", city: "ghost-city-9" })
      )
      const onChange = vi.fn()
      renderFilter({}, onChange)
      // Nothing valid survived reconciliation → no filter applied…
      expect(onChange).not.toHaveBeenCalled()
      // …and the stale value is purged so it stops resurrecting.
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it("keeps a valid saved region but drops a stale city that no longer belongs to it", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ region: "grand-tunis-1", city: "sfax-city-1" })
      )
      const onChange = vi.fn()
      renderFilter({}, onChange)
      expect(onChange).toHaveBeenCalledWith(
        { region: "grand-tunis-1", city: undefined },
        { replace: true }
      )
    })
  })

  describe("profile defaultRegion fallback (Story 4.5)", () => {
    function renderWithDefault(
      value: LocationFilterValue,
      onChange: (v: LocationFilterValue, o?: { replace?: boolean }) => void,
      defaultRegion: string | undefined,
      regionData: EventLocationRegion[] = regions
    ) {
      return render(
        <EventLocationFilter
          regions={regionData}
          value={value}
          onChange={onChange}
          labels={labels}
          defaultRegion={defaultRegion}
        />
      )
    }

    it("seeds from defaultRegion when there is no URL or localStorage location", () => {
      const onChange = vi.fn()
      renderWithDefault({}, onChange, "sfax-1")
      expect(onChange).toHaveBeenCalledWith(
        { region: "sfax-1" },
        { replace: true }
      )
    })

    it("still seeds when defaultRegion arrives asynchronously after mount", () => {
      // `defaultRegion` is fed from react-query (`useCurrentUser`) in
      // `EventsListing`, so it is `undefined` on the first commit and resolves
      // later. The one-shot restore must NOT be spent on the pending value.
      const onChange = vi.fn()
      const { rerender } = render(
        <EventLocationFilter
          regions={regions}
          value={{}}
          onChange={onChange}
          labels={labels}
          defaultRegion={undefined}
        />
      )
      // Nothing to seed yet — the query has not resolved.
      expect(onChange).not.toHaveBeenCalled()

      // The user query resolves and the default region arrives.
      rerender(
        <EventLocationFilter
          regions={regions}
          value={{}}
          onChange={onChange}
          labels={labels}
          defaultRegion="sfax-1"
        />
      )
      expect(onChange).toHaveBeenCalledWith(
        { region: "sfax-1" },
        { replace: true }
      )
    })

    it("does NOT write the defaultRegion fallback to localStorage", () => {
      const onChange = vi.fn()
      renderWithDefault({}, onChange, "sfax-1")
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it("lets a URL location take precedence over defaultRegion", () => {
      const onChange = vi.fn()
      renderWithDefault({ region: "grand-tunis-1" }, onChange, "sfax-1")
      expect(onChange).not.toHaveBeenCalled()
    })

    it("lets a saved localStorage location take precedence over defaultRegion", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ region: "grand-tunis-1" })
      )
      const onChange = vi.fn()
      renderWithDefault({}, onChange, "sfax-1")
      expect(onChange).toHaveBeenCalledWith(
        { region: "grand-tunis-1", city: undefined },
        { replace: true }
      )
    })

    it("drops a stale defaultRegion absent from the current regions (no seed)", () => {
      const onChange = vi.fn()
      renderWithDefault({}, onChange, "deleted-region-9")
      expect(onChange).not.toHaveBeenCalled()
    })

    it("does not seed when geography is empty even with a defaultRegion", () => {
      const onChange = vi.fn()
      renderWithDefault({}, onChange, "sfax-1", [])
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  // NOTE: driving the radix Select portal open + option click is not exercised
  // here — jsdom does not implement the pointer-capture/positioning the Radix
  // listbox needs (the same limitation Story 3.3 documented for the calendar
  // popover). The selection→emit contract is instead covered by the `clear` and
  // restore-on-mount tests above (both assert the typed `onChange` payload), and
  // the region→city cascade by the disabled/enabled + active-name assertions.
})
