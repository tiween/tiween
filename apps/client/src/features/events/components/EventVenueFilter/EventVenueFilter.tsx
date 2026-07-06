"use client"

import * as React from "react"
import { Building2, Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/** A venue option surfaced in the picker (from `getVenuesForSelector`). */
export interface EventVenueOption {
  documentId: string
  name: string
  /** Venue type (e.g. "cinema") — not rendered, kept for parity with the source. */
  type?: string
  /** Denormalized city name — not rendered, kept for parity with the source. */
  city?: string
}

/**
 * The typed value emitted by the control. `venue` is an opaque, locale-stable
 * Strapi `documentId` (not a slug). `undefined` means "no venue filter".
 */
export interface VenueFilterValue {
  venue?: string
}

export interface EventVenueFilterLabels {
  /** Accessible name for the filter group (e.g. "Filtrer par salle"). */
  groupLabel: string
  /** The "no venue" option / trigger placeholder (e.g. "Toutes les salles"). */
  allVenues: string
  /** Placeholder for the search input (e.g. "Rechercher une salle"). */
  searchVenue: string
  /** Empty-state copy when the search matches nothing (e.g. "Aucune salle trouvée"). */
  noVenueFound: string
  /** "Effacer" — clears the active venue (reuses the shared listing clear label). */
  clear: string
}

export interface EventVenueFilterProps {
  /** Approved venues (name-sorted) that seed the picker. */
  venues: EventVenueOption[]
  /** The currently-active venue selection (derived from the URL). */
  value: VenueFilterValue
  /**
   * Emitted with the new typed value whenever the selection changes. `options`
   * lets the mount-time restore ask the parent to write the URL via
   * `router.replace` (no extra history entry) instead of `push`.
   */
  onChange: (value: VenueFilterValue, options?: { replace?: boolean }) => void
  /** Localized labels (no hardcoded copy in the component). */
  labels: EventVenueFilterLabels
  className?: string
}

/** localStorage key for the last-selected venue (seeds the URL on a fresh visit). */
const STORAGE_KEY = "tiween.events.venue"

const TRIGGER_BASE =
  "inline-flex min-h-11 min-w-[200px] items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
const TRIGGER_ACTIVE = "border-primary text-primary"
const CLEAR_CHIP =
  "text-muted-foreground inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"

/** Minimal inline close glyph (mirrors EventLocationFilter's clear affordance). */
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

/** Read the persisted venue, tolerating absent/garbage storage. */
function readSavedVenue(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<VenueFilterValue>
    return typeof parsed.venue === "string" && parsed.venue.length > 0
      ? parsed.venue
      : null
  } catch {
    return null
  }
}

/** Persist (or clear) the last-selected venue, tolerating storage failures. */
function persistVenue(value: VenueFilterValue): void {
  try {
    if (value.venue) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore quota / disabled-storage errors — persistence is best-effort.
  }
}

/**
 * Searchable venue filter for the events listing (Story 3.5): a Popover +
 * Command (cmdk) combobox fed by the approved-venues list. The user types to
 * narrow venues by name **client-side** (no server round-trip); the active venue
 * is highlighted; the trigger is a ≥44px touch target. The component is
 * presentational — it emits a typed {@link VenueFilterValue} and leaves URL
 * writes to the parent island — but it owns `localStorage` persistence: it saves
 * on change and, on a fresh visit with no active venue, restores the saved value
 * by calling `onChange` (the parent writes it into the URL). Renders nothing when
 * there are no venues (fail-soft).
 */
export function EventVenueFilter({
  venues,
  value,
  onChange,
  labels,
  className,
}: EventVenueFilterProps) {
  const [open, setOpen] = React.useState(false)
  const listId = React.useId()
  const restoredRef = React.useRef(false)

  // Restore-on-mount: on a fresh `/events` visit with no venue in the URL, seed
  // the URL from the remembered venue. Runs once (ref-guarded). Uses `replace`
  // so the restore does not add a back-button entry.
  React.useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    // Fail-soft: with no venues loaded the control renders nothing (see the
    // `return null` below), so restoring here would filter the listing via a
    // hidden, unclearable control. Never seed the URL when there is no UI.
    if (venues.length === 0) return
    if (value.venue) return
    const saved = readSavedVenue()
    if (!saved) return
    // Reconcile the saved venue against the venues actually available: a
    // remembered venue that no longer exists (deleted, or absent for this
    // locale) would filter the list while the control shows "all venues". Drop
    // it and purge storage so it stops resurrecting.
    const match = venues.find((v) => v.documentId === saved)
    if (!match) {
      persistVenue({})
      return
    }
    onChange({ venue: match.documentId }, { replace: true })
  }, [value, onChange, venues])

  const selectedVenue = React.useMemo(
    () => venues.find((v) => v.documentId === value.venue),
    [venues, value.venue]
  )

  const handleSelect = (documentId?: string) => {
    const next: VenueFilterValue = documentId ? { venue: documentId } : {}
    persistVenue(next)
    setOpen(false)
    onChange(next)
  }

  const active = Boolean(value.venue)

  // Nothing to filter by — render nothing (fail-soft when venues are empty).
  if (venues.length === 0) return null

  return (
    <div
      role="group"
      aria-label={labels.groupLabel}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            // Include the selected venue in the accessible name so assistive tech
            // announces *which* venue is active (a bare `groupLabel` would shadow
            // the visible venue text and read the same whether or not one is set —
            // the sibling location Select conveys its value the same way).
            aria-label={
              selectedVenue
                ? `${labels.groupLabel}: ${selectedVenue.name}`
                : labels.groupLabel
            }
            data-active={active}
            className={cn(TRIGGER_BASE, active && TRIGGER_ACTIVE)}
          >
            <Building2 className="size-4 shrink-0 opacity-70" aria-hidden="true" />
            <span className="truncate">
              {selectedVenue ? selectedVenue.name : labels.allVenues}
            </span>
            <ChevronsUpDown
              className="ms-auto size-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={listId}
          className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
        >
          <Command>
            <CommandInput placeholder={labels.searchVenue} />
            <CommandList>
              <CommandEmpty>{labels.noVenueFound}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  keywords={[labels.allVenues]}
                  onSelect={() => handleSelect(undefined)}
                  className="min-h-11"
                >
                  <Check
                    className={cn(
                      "size-4",
                      active ? "opacity-0" : "opacity-100"
                    )}
                    aria-hidden="true"
                  />
                  {labels.allVenues}
                </CommandItem>
                {venues.map((venue) => (
                  <CommandItem
                    key={venue.documentId}
                    value={venue.documentId}
                    keywords={[venue.name]}
                    onSelect={() => handleSelect(venue.documentId)}
                    className="min-h-11"
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value.venue === venue.documentId
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    {venue.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {active && (
        <button
          type="button"
          onClick={() => handleSelect(undefined)}
          className={CLEAR_CHIP}
        >
          <CloseGlyph />
          {labels.clear}
        </button>
      )}
    </div>
  )
}

EventVenueFilter.displayName = "EventVenueFilter"
