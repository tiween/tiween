"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { TUNISIA_CENTER } from "@/features/events/components/Map/types"

import type { VenueLocationPickerProps } from "./types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * SSR-safe dynamic Leaflet island (module scope — never re-created in render).
 * `ssr: false` because Leaflet needs `window`. Mirrors the wrapper/island split
 * of `features/events/components/Map/VenueMap.tsx`.
 */
const PickerImplementation = dynamic(
  () => import("./VenueLocationPickerClient"),
  {
    ssr: false,
    loading: () => null,
  }
)

/**
 * VenueLocationPicker — draggable-pin location editor (Story 7.2).
 *
 * The AC's "update location on map". Raw latitude/longitude number inputs are
 * deliberately NOT offered: a manager reads an address, not a decimal degree,
 * and two free-number fields are the easiest way to end up with a venue in the
 * Gulf of Guinea. There is also no address→coordinates geocoder — every
 * provider needs an API key this project does not have.
 *
 * When the venue has no coordinates yet the map opens on Tunis
 * (`TUNISIA_CENTER`) with no marker; the first click places one. `onClear`
 * removes it again, which writes `geo: null` and clears the stored location.
 */
export function VenueLocationPicker({
  value,
  onChange,
  onClear,
  height = "320px",
  labels,
}: VenueLocationPickerProps) {
  // Freeze the opening view on the FIRST coordinates we see (state with a lazy
  // initializer, never a ref — this value IS read during render). Re-centering
  // on every change would fight the user: dragging the pin would recentre the
  // map under their cursor mid-gesture.
  const [initialCenter] = React.useState(() => value ?? TUNISIA_CENTER)

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">{labels.hint}</p>

      <div
        className={cn("relative w-full overflow-hidden rounded-lg border")}
        style={{ height }}
      >
        {/* Visible while the Leaflet chunk loads; the opaque map mounts on top.
            `aria-hidden` so assistive tech stops announcing it afterwards. */}
        <div
          aria-hidden="true"
          className="bg-muted absolute inset-0 flex items-center justify-center"
        >
          <span className="text-muted-foreground text-sm">
            {labels.loading}
          </span>
        </div>
        <PickerImplementation
          value={value}
          center={initialCenter}
          onChange={onChange}
          labels={labels}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p
          className="text-muted-foreground text-xs"
          data-testid="venue-geo-readout"
        >
          {value
            ? `${labels.coordinates} ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
            : labels.empty}
        </p>
        {value && onClear && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {labels.clear}
          </Button>
        )}
      </div>
    </div>
  )
}

VenueLocationPicker.displayName = "VenueLocationPicker"
