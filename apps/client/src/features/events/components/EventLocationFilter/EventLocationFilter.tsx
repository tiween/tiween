"use client"

import * as React from "react"
import { MapPin } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** A city option surfaced under a region (nested `cities` on `getRegions`). */
export interface EventLocationCity {
  documentId: string
  name: string
}

/** A region option with its nested cities (from the geography `getRegions`). */
export interface EventLocationRegion {
  documentId: string
  name: string
  cities?: EventLocationCity[]
}

/**
 * The typed value emitted by the control. Both are opaque, locale-stable Strapi
 * `documentId`s (not slugs). `undefined` means "no filter" on that axis.
 */
export interface LocationFilterValue {
  region?: string
  city?: string
}

export interface EventLocationFilterLabels {
  /** Accessible name for the filter group (e.g. "Filtrer par lieu"). */
  groupLabel: string
  /** Accessible name / placeholder for the region select (e.g. "Région"). */
  regionPlaceholder: string
  /** Accessible name / placeholder for the city select (e.g. "Ville"). */
  cityPlaceholder: string
  /** The "no region" option label (e.g. "Toutes les régions"). */
  allRegions: string
  /** The "no city" option label (e.g. "Toutes les villes"). */
  allCities: string
  /** "Effacer" — clears both region and city. */
  clear: string
}

export interface EventLocationFilterProps {
  /** Regions (with nested cities) that seed the dropdowns. */
  regions: EventLocationRegion[]
  /** The currently-active location selection (derived from the URL). */
  value: LocationFilterValue
  /**
   * Emitted with the new typed value whenever the selection changes. `options`
   * lets the mount-time restore ask the parent to write the URL via
   * `router.replace` (no extra history entry) instead of `push`.
   */
  onChange: (
    value: LocationFilterValue,
    options?: { replace?: boolean }
  ) => void
  /** Localized labels (no hardcoded copy in the component). */
  labels: EventLocationFilterLabels
  /**
   * The signed-in user's profile `defaultRegion` (a region `documentId`), used
   * as the LOWEST-precedence restore-on-mount fallback: URL > localStorage >
   * this. It is reconciled against `regions` (dropped if stale) and is NEVER
   * persisted to localStorage — it is a server-side default, not a device choice.
   */
  defaultRegion?: string
  className?: string
}

/**
 * Sentinel `Select` value for the "no filter" option. Radix reserves the empty
 * string for the placeholder/clear state, so an explicit token is used instead.
 */
const ALL = "all"

/** localStorage key for the last-selected location (seeds the URL on a fresh visit). */
const STORAGE_KEY = "tiween.events.location"

const TRIGGER_BASE =
  "min-h-11 min-w-[150px] gap-2 rounded-full px-4 transition-colors"
const TRIGGER_ACTIVE = "border-primary text-primary ring-primary/30"
const CLEAR_CHIP =
  "text-muted-foreground inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"

/** Minimal inline close glyph (mirrors EventDateFilter's clear affordance). */
function CloseGlyph() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/** Read the persisted location, tolerating absent/garbage storage. */
function readSavedLocation(): LocationFilterValue | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LocationFilterValue>
    const region =
      typeof parsed.region === "string" && parsed.region.length > 0
        ? parsed.region
        : undefined
    const city =
      typeof parsed.city === "string" && parsed.city.length > 0
        ? parsed.city
        : undefined
    if (!region && !city) return null
    return { region, city }
  } catch {
    return null
  }
}

/** Persist (or clear) the last-selected location, tolerating storage failures. */
function persistLocation(value: LocationFilterValue): void {
  try {
    if (value.region || value.city) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore quota / disabled-storage errors — persistence is best-effort.
  }
}

/**
 * Location filter control for the events listing (Story 3.4): a region `Select`
 * driving a dependent city `Select` (cities come from the selected region's
 * nested `cities`). The active axis is visibly highlighted; every trigger is a
 * ≥44px touch target. The component is presentational — it emits a typed
 * {@link LocationFilterValue} and leaves URL writes to the parent island — but it
 * owns `localStorage` persistence: it saves on change and, on a fresh visit with
 * no active location, restores the saved value by calling `onChange` (the parent
 * writes it into the URL).
 */
export function EventLocationFilter({
  regions,
  value,
  onChange,
  labels,
  defaultRegion,
  className,
}: EventLocationFilterProps) {
  const restoredRef = React.useRef(false)

  // Restore-on-mount: on a fresh `/events` visit with no location in the URL,
  // seed the URL from the remembered location. Runs once (ref-guarded) so a
  // later re-render never re-applies it. Uses `replace` so the restore does not
  // add a back-button entry.
  React.useEffect(() => {
    if (restoredRef.current) return
    // Fail-soft: with no geography loaded the control renders nothing (see the
    // `return null` below), so restoring here would filter the listing via a
    // hidden, unclearable control. Never seed the URL when there is no UI.
    if (regions.length === 0) return
    // An active location already exists (from the URL, a prior restore, or a
    // user selection): lock so a later commit never auto-restores/seeds over it
    // — even after the user clears it back to "all".
    if (value.region || value.city) {
      restoredRef.current = true
      return
    }
    const saved = readSavedLocation()
    if (saved) {
      restoredRef.current = true
      // Reconcile the saved location against the regions actually available: a
      // remembered region/city that no longer exists (deleted, or absent for
      // this locale) would filter the list while the control shows "all". Drop
      // the stale parts; if nothing survives, clear storage so it stops
      // resurrecting.
      const region = regions.find((r) => r.documentId === saved.region)
      const city = region?.cities?.find((c) => c.documentId === saved.city)
      const next: LocationFilterValue = {
        region: region?.documentId,
        city: city?.documentId,
      }
      if (!next.region && !next.city) {
        persistLocation(next)
        return
      }
      if (next.region !== saved.region || next.city !== saved.city) {
        persistLocation(next)
      }
      onChange(next, { replace: true })
      return
    }
    // No URL location and no remembered device location: fall back to the
    // profile `defaultRegion` (lowest precedence). It arrives asynchronously
    // (react-query, via `EventsListing`), so while it is still `undefined`
    // DON'T lock — wait for it. Locking now would spend the one-shot restore
    // before the value loads and the seed would never fire. Reconcile against
    // the available regions (drop if stale); NEVER persist it to localStorage —
    // it is a server-side default, not a device choice (persisting it would
    // make it survive sign-out).
    if (defaultRegion === undefined) return
    restoredRef.current = true
    const region = regions.find((r) => r.documentId === defaultRegion)
    if (!region) return
    onChange({ region: region.documentId }, { replace: true })
  }, [value, onChange, regions, defaultRegion])

  const selectedRegion = React.useMemo(
    () => regions.find((r) => r.documentId === value.region),
    [regions, value.region]
  )

  const cities = React.useMemo(
    () => selectedRegion?.cities ?? [],
    [selectedRegion]
  )

  const selectedCity = React.useMemo(
    () => cities.find((c) => c.documentId === value.city),
    [cities, value.city]
  )

  const handleRegionChange = (raw: string) => {
    // Changing the region clears any previously-selected city (it belongs to the
    // old region).
    const next: LocationFilterValue = {
      region: raw === ALL ? undefined : raw,
    }
    persistLocation(next)
    onChange(next)
  }

  const handleCityChange = (raw: string) => {
    const next: LocationFilterValue = {
      region: value.region,
      city: raw === ALL ? undefined : raw,
    }
    persistLocation(next)
    onChange(next)
  }

  const clear = () => {
    const next: LocationFilterValue = {}
    persistLocation(next)
    onChange(next)
  }

  const regionActive = Boolean(value.region)
  const cityActive = Boolean(value.city)
  const cityDisabled = !selectedRegion || cities.length === 0

  // Nothing to filter by — render nothing (fail-soft when geography is empty).
  if (regions.length === 0) return null

  return (
    <div
      role="group"
      aria-label={labels.groupLabel}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <Select value={value.region ?? ALL} onValueChange={handleRegionChange}>
        <SelectTrigger
          aria-label={labels.regionPlaceholder}
          data-active={regionActive}
          className={cn(TRIGGER_BASE, regionActive && TRIGGER_ACTIVE)}
        >
          <MapPin className="size-4 shrink-0 opacity-70" aria-hidden="true" />
          <SelectValue placeholder={labels.regionPlaceholder}>
            {selectedRegion ? selectedRegion.name : labels.allRegions}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{labels.allRegions}</SelectItem>
          {regions.map((region) => (
            <SelectItem key={region.documentId} value={region.documentId}>
              {region.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.city ?? ALL}
        onValueChange={handleCityChange}
        disabled={cityDisabled}
      >
        <SelectTrigger
          aria-label={labels.cityPlaceholder}
          data-active={cityActive}
          className={cn(TRIGGER_BASE, cityActive && TRIGGER_ACTIVE)}
        >
          <SelectValue placeholder={labels.cityPlaceholder}>
            {selectedCity ? selectedCity.name : labels.allCities}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{labels.allCities}</SelectItem>
          {cities.map((city) => (
            <SelectItem key={city.documentId} value={city.documentId}>
              {city.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(regionActive || cityActive) && (
        <button type="button" onClick={clear} className={CLEAR_CHIP}>
          <CloseGlyph />
          {labels.clear}
        </button>
      )}
    </div>
  )
}

EventLocationFilter.displayName = "EventLocationFilter"
