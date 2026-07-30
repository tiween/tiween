import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type {
  EventVenueFilterLabels,
  EventVenueOption,
  VenueFilterValue,
} from "./EventVenueFilter"

// The combobox renders lucide-react icons. Under the repo's React 18/19
// dual-install, lucide's icon elements are minted by a different React copy than
// the aliased test runtime and fail to reconcile ("Objects are not valid as a
// React child"). Stub the icons with local SVGs created by the test's own React.
vi.mock("lucide-react", () => {
  const Icon = (props: Record<string, unknown>) =>
    React.createElement("svg", props)
  return {
    __esModule: true,
    Building2: Icon,
    Check: Icon,
    ChevronsUpDown: Icon,
    Search: Icon,
  }
})

import { EventVenueFilter } from "./EventVenueFilter"

const labels: EventVenueFilterLabels = {
  groupLabel: "Filtrer par salle",
  allVenues: "Toutes les salles",
  searchVenue: "Rechercher une salle",
  noVenueFound: "Aucune salle trouvée",
  truncatedHint: "Affinez votre recherche",
  clear: "Effacer",
}

const venues: EventVenueOption[] = [
  { documentId: "pathe-1", name: "Pathé Tunis City", type: "cinema" },
  { documentId: "cinemadart-1", name: "CinémadArt", type: "cinema" },
  { documentId: "colisee-1", name: "Le Colisée", type: "cinema" },
]

const STORAGE_KEY = "tiween.events.venue"

function renderFilter(
  value: VenueFilterValue,
  onChange: (v: VenueFilterValue, o?: { replace?: boolean }) => void = vi.fn(),
  venueData: EventVenueOption[] = venues,
  extra: { truncated?: boolean; scoped?: boolean } = {}
) {
  return render(
    <EventVenueFilter
      venues={venueData}
      value={value}
      onChange={onChange}
      labels={labels}
      truncated={extra.truncated}
      scoped={extra.scoped}
    />
  )
}

// Radix Popover + cmdk rely on pointer-capture, scroll, and ResizeObserver APIs
// jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
  // @ts-expect-error - jsdom lacks ResizeObserver; cmdk/Radix need it.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("EventVenueFilter", () => {
  it("renders the group with an accessible name and the combobox trigger", () => {
    renderFilter({})
    expect(
      screen.getByRole("group", { name: "Filtrer par salle" })
    ).toBeTruthy()
    expect(
      screen.getByRole("combobox", { name: "Filtrer par salle" })
    ).toBeTruthy()
  })

  it("renders nothing when there are no venues (fail-soft)", () => {
    const { container } = renderFilter({}, vi.fn(), [])
    expect(container.firstChild).toBeNull()
  })

  it("shows the 'all venues' label and no active highlight when empty", () => {
    renderFilter({})
    const trigger = screen.getByRole("combobox", { name: "Filtrer par salle" })
    expect(trigger.textContent).toContain("Toutes les salles")
    expect(trigger.getAttribute("data-active")).toBe("false")
  })

  it("highlights the trigger and shows the venue name when active", () => {
    renderFilter({ venue: "pathe-1" })
    const trigger = screen.getByRole("combobox", { name: /Filtrer par salle/ })
    expect(trigger.getAttribute("aria-label")).toContain("Pathé Tunis City")
    expect(trigger.textContent).toContain("Pathé Tunis City")
    expect(trigger.getAttribute("data-active")).toBe("true")
  })

  it("shows the clear affordance only when a venue is active", () => {
    const { rerender } = renderFilter({})
    expect(screen.queryByRole("button", { name: /Effacer/ })).toBeNull()
    rerender(
      <EventVenueFilter
        venues={venues}
        value={{ venue: "pathe-1" }}
        onChange={vi.fn()}
        labels={labels}
      />
    )
    expect(screen.getByRole("button", { name: /Effacer/ })).toBeTruthy()
  })

  it("clear resets the venue and wipes localStorage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ venue: "pathe-1" })
    )
    const onChange = vi.fn()
    renderFilter({ venue: "pathe-1" }, onChange)
    fireEvent.click(screen.getByRole("button", { name: /Effacer/ }))
    expect(onChange).toHaveBeenCalledWith({})
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  describe("searchable venue list (popover open)", () => {
    it("renders every venue by name when opened", () => {
      renderFilter({})
      fireEvent.click(
        screen.getByRole("combobox", { name: "Filtrer par salle" })
      )
      expect(screen.getByText("Pathé Tunis City")).toBeTruthy()
      expect(screen.getByText("CinémadArt")).toBeTruthy()
      expect(screen.getByText("Le Colisée")).toBeTruthy()
    })

    it("narrows the list by typed search text (client-side, no round-trip)", () => {
      renderFilter({})
      fireEvent.click(
        screen.getByRole("combobox", { name: "Filtrer par salle" })
      )
      const input = screen.getByPlaceholderText("Rechercher une salle")
      fireEvent.change(input, { target: { value: "colis" } })
      // The matching venue survives; the non-matching ones are filtered out.
      expect(screen.getByText("Le Colisée")).toBeTruthy()
      expect(screen.queryByText("Pathé Tunis City")).toBeNull()
      expect(screen.queryByText("CinémadArt")).toBeNull()
    })

    it("shows the empty state when the search matches nothing", () => {
      renderFilter({})
      fireEvent.click(
        screen.getByRole("combobox", { name: "Filtrer par salle" })
      )
      const input = screen.getByPlaceholderText("Rechercher une salle")
      fireEvent.change(input, { target: { value: "zzzzz-nope" } })
      expect(screen.getByText("Aucune salle trouvée")).toBeTruthy()
    })
  })

  describe("city disambiguation (DW-25)", () => {
    // Opaque, Strapi-shaped documentIds ON PURPOSE: cmdk scores the item `value`
    // (the documentId) alongside `keywords`, so readable ids like `pathe-sfax`
    // would let the city-search test below pass through the id even if the
    // `keywords={[name, city]}` wiring were reverted. These ids share no
    // subsequence with "sfax"/"tunis", so only the keywords can match.
    const sameName: EventVenueOption[] = [
      {
        documentId: "vd0197b6c3e0",
        name: "Pathé",
        type: "cinema",
        city: "Tunis",
      },
      {
        documentId: "vd0298d7c4e1",
        name: "Pathé",
        type: "cinema",
        city: "Sfax",
      },
      { documentId: "vd0399e8c5e2", name: "Salle sans ville", type: "cinema" },
    ]

    it("renders each row's city beside the name", () => {
      renderFilter({}, vi.fn(), sameName)
      fireEvent.click(
        screen.getByRole("combobox", { name: "Filtrer par salle" })
      )
      expect(screen.getAllByText("Pathé")).toHaveLength(2)
      expect(screen.getByText("Tunis")).toBeTruthy()
      expect(screen.getByText("Sfax")).toBeTruthy()
    })

    it("renders the name only (no empty separator) when a venue has no city", () => {
      renderFilter({}, vi.fn(), sameName)
      fireEvent.click(
        screen.getByRole("combobox", { name: "Filtrer par salle" })
      )
      const row = screen.getByText("Salle sans ville").closest("[cmdk-item]")
      expect(row).toBeTruthy()
      expect(row?.textContent).toBe("Salle sans ville")
    })

    it("shows the selected venue's city in the trigger (text + accessible name)", () => {
      renderFilter({ venue: "vd0298d7c4e1" }, vi.fn(), sameName)
      const trigger = screen.getByRole("combobox", { name: /Filtrer par salle/ })
      expect(trigger.textContent).toContain("Pathé")
      expect(trigger.textContent).toContain("Sfax")
      expect(trigger.getAttribute("aria-label")).toContain("Sfax")
    })

    it("narrows the list by a typed city name (city is a search keyword)", () => {
      renderFilter({}, vi.fn(), sameName)
      fireEvent.click(
        screen.getByRole("combobox", { name: "Filtrer par salle" })
      )
      const input = screen.getByPlaceholderText("Rechercher une salle")
      fireEvent.change(input, { target: { value: "sfax" } })
      expect(screen.getByText("Sfax")).toBeTruthy()
      expect(screen.queryByText("Tunis")).toBeNull()
      expect(screen.getAllByText("Pathé")).toHaveLength(1)
    })
  })

  describe("truncation hint", () => {
    it("renders the localized hint after the options when truncated", () => {
      renderFilter({}, vi.fn(), venues, { truncated: true })
      fireEvent.click(
        screen.getByRole("combobox", { name: "Filtrer par salle" })
      )
      expect(screen.getByText("Affinez votre recherche")).toBeTruthy()
      // The list stays usable.
      expect(screen.getByText("Le Colisée")).toBeTruthy()
    })

    it("does not render the hint when the list is complete", () => {
      renderFilter({}, vi.fn(), venues)
      fireEvent.click(
        screen.getByRole("combobox", { name: "Filtrer par salle" })
      )
      expect(screen.queryByText("Affinez votre recherche")).toBeNull()
    })
  })

  describe("localStorage restore-on-mount", () => {
    it("restores a saved venue into the URL when the filter is empty", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ venue: "pathe-1" })
      )
      const onChange = vi.fn()
      renderFilter({}, onChange)
      expect(onChange).toHaveBeenCalledWith(
        { venue: "pathe-1" },
        { replace: true }
      )
    })

    it("does NOT restore when the URL already carries a venue", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ venue: "cinemadart-1" })
      )
      const onChange = vi.fn()
      renderFilter({ venue: "pathe-1" }, onChange)
      expect(onChange).not.toHaveBeenCalled()
    })

    it("does NOT restore when there is no saved venue", () => {
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

    it("does NOT restore when venues are empty (control is hidden)", () => {
      // Fail-soft path: getVenuesForSelector failed → no control → restoring
      // would filter the listing via a hidden, unclearable filter.
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ venue: "pathe-1" })
      )
      const onChange = vi.fn()
      renderFilter({}, onChange, [])
      expect(onChange).not.toHaveBeenCalled()
    })

    it("drops a stale saved venue absent from the current list, and clears storage", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ venue: "deleted-venue-9" })
      )
      const onChange = vi.fn()
      renderFilter({}, onChange)
      // Nothing valid survived reconciliation → no filter applied…
      expect(onChange).not.toHaveBeenCalled()
      // …and the stale value is purged so it stops resurrecting.
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it("KEEPS a saved venue absent from a SCOPED list (out of scope ≠ deleted)", () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ venue: "other-region-venue" })
      )
      const onChange = vi.fn()
      renderFilter({}, onChange, venues, { scoped: true })
      // Not restorable under the current scope…
      expect(onChange).not.toHaveBeenCalled()
      // …but preserved, so a later visit whose list does contain it restores it
      // (the in-session restore stays latched by design).
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
        JSON.stringify({ venue: "other-region-venue" })
      )
    })
  })

  // NOTE: the popover open + client-side search filtering ARE exercised above.
  // What is NOT driven here is the final cmdk `onSelect` pointer/keyboard commit
  // on a venue option (jsdom does not implement the pointer-capture the cmdk
  // listbox needs to fire selection — the same limitation Story 3.3/3.4
  // documented for Radix Select). That selection→emit contract is instead
  // covered by the `clear` and restore-on-mount tests, which both assert the
  // exact typed `onChange` payload the component emits.
})
