/**
 * Tests for the Leaflet island behind the location picker (Story 7.2).
 *
 * "Update the location on the map" is a whole acceptance criterion, and it is
 * stubbed out everywhere else in the suite: the form test replaces the picker
 * with a button, so nothing verified that a map CLICK or a marker DRAG actually
 * produces coordinates. That logic lives here, so it is pinned here.
 *
 * `react-leaflet` and `leaflet` are mocked because they need `window` APIs
 * jsdom does not implement; the mock keeps the real contract points — the
 * `useMapEvents` handler map, and the `ref` + `eventHandlers` a `Marker`
 * receives — so the component's own wiring is what is under test.
 */
import * as React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { VenueGeoValue } from "./types"

import VenueLocationPickerClient from "./VenueLocationPickerClient"

const { mapEvents, marker } = vi.hoisted(() => ({
  mapEvents: { handlers: {} as Record<string, (event: unknown) => void> },
  marker: {
    props: null as Record<string, unknown> | null,
    latLng: { lat: 0, lng: 0 },
  },
}))

vi.mock("leaflet", () => ({
  Icon: class {
    constructor(public options: unknown) {}
  },
}))

vi.mock("leaflet/dist/leaflet.css", () => ({}))

vi.mock("react-leaflet", async () => {
  const react = await import("react")

  const Marker = react.forwardRef(function Marker(
    props: Record<string, unknown>,
    ref: React.Ref<{ getLatLng: () => { lat: number; lng: number } }>
  ) {
    marker.props = props
    react.useImperativeHandle(ref, () => ({ getLatLng: () => marker.latLng }))
    return react.createElement("div", {
      "data-testid": "marker",
      "data-alt": props.alt,
      "data-draggable": String(props.draggable),
      "data-position": JSON.stringify(props.position),
    })
  })

  return {
    MapContainer: ({ children }: { children?: React.ReactNode }) =>
      react.createElement("div", { "data-testid": "map" }, children),
    TileLayer: () => null,
    Marker,
    useMapEvents: (handlers: Record<string, (event: unknown) => void>) => {
      mapEvents.handlers = handlers
      return null
    },
  }
})

const LABELS = {
  hint: "hint",
  loading: "loading",
  marker: "Venue location",
  empty: "empty",
  clear: "clear",
  coordinates: "coordinates",
}

const CENTER: VenueGeoValue = { latitude: 36.8, longitude: 10.18 }

function renderPicker(value: VenueGeoValue | null, onChange = vi.fn()) {
  render(
    <VenueLocationPickerClient
      value={value}
      center={CENTER}
      onChange={onChange}
      labels={LABELS}
    />
  )
  return onChange
}

beforeEach(() => {
  mapEvents.handlers = {}
  marker.props = null
  marker.latLng = { lat: 0, lng: 0 }
})

describe("VenueLocationPickerClient", () => {
  it("turns a map CLICK into latitude/longitude", () => {
    const onChange = renderPicker(null)

    mapEvents.handlers.click?.({ latlng: { lat: 35.5, lng: 11.25 } })

    expect(onChange).toHaveBeenCalledWith({
      latitude: 35.5,
      longitude: 11.25,
    })
  })

  it("turns a marker DRAG into the marker's new coordinates", () => {
    const onChange = renderPicker({ latitude: 36.8, longitude: 10.18 })

    marker.latLng = { lat: 34.75, lng: 10.76 }
    const handlers = marker.props?.eventHandlers as
      | { dragend?: () => void }
      | undefined
    handlers?.dragend?.()

    expect(onChange).toHaveBeenCalledWith({
      latitude: 34.75,
      longitude: 10.76,
    })
  })

  it("renders NO marker until coordinates exist — the first click places one", () => {
    const onChange = renderPicker(null)

    expect(screen.queryByTestId("marker")).toBeNull()

    mapEvents.handlers.click?.({ latlng: { lat: 36.9, lng: 10.2 } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it("renders the marker draggable, at the current value, with a translated alt", () => {
    renderPicker({ latitude: 36.8, longitude: 10.18 })

    const node = screen.getByTestId("marker")
    expect(node.getAttribute("data-draggable")).toBe("true")
    expect(node.getAttribute("data-position")).toBe("[36.8,10.18]")
    // The accessible name comes from the caller's labels — no hardcoded copy.
    expect(node.getAttribute("data-alt")).toBe("Venue location")
  })

  it("reports coordinates ONLY on an actual gesture", () => {
    // A bare render must not write into the form: the picker seeds nothing, so
    // merely opening the page can never mark the venue's location dirty.
    const onChange = renderPicker({ latitude: 36.8, longitude: 10.18 })
    expect(onChange).not.toHaveBeenCalled()
  })
})
