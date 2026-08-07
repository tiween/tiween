"use client"

import * as React from "react"

import type { CategoryTabsLabels, CategoryType } from "../CategoryTabs"
import type { EventCategoryToken } from "../../filters/filterParams"

import { isCategoryToken } from "../../filters/filterParams"
import { CategoryTabs } from "../CategoryTabs"

/**
 * The typed value emitted by the control: a validated discovery category URL
 * token, or `undefined` for "Tout" (no category filter).
 */
export interface CategoryFilterValue {
  category?: EventCategoryToken
}

export interface EventCategoryFilterLabels {
  /** Localized accessible name for the tablist (e.g. "Catégories d'événements"). */
  groupLabel: string
  /** Localized tab labels — passed straight to `CategoryTabs`. */
  tabs: CategoryTabsLabels
}

export interface EventCategoryFilterProps {
  /** The currently-active category token (derived from the URL). */
  value: CategoryFilterValue
  /**
   * Emitted with the new typed value whenever the selection changes. `options`
   * lets the mount-time restore ask the parent to write the URL via
   * `router.replace` (no extra history entry) instead of `push`.
   */
  onChange: (
    value: CategoryFilterValue,
    options?: { replace?: boolean }
  ) => void
  /** Localized labels (no hardcoded copy in the component). */
  labels: EventCategoryFilterLabels
  className?: string
}

/**
 * sessionStorage key for the last-selected category. Session-only on purpose:
 * the epic requires the category persisted "during the session", NOT across
 * sessions (unlike 3.4's location, which is localStorage by mandate).
 */
const STORAGE_KEY = "tiween.events.category"

/** Read the persisted category token, tolerating absent/garbage storage. */
function readSavedCategory(): EventCategoryToken | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return isCategoryToken(raw) ? raw : null
  } catch {
    return null
  }
}

/** Persist (or clear) the last-selected category, tolerating storage failures. */
function persistCategory(category: EventCategoryToken | undefined): void {
  try {
    if (category) {
      window.sessionStorage.setItem(STORAGE_KEY, category)
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore quota / disabled-storage errors — persistence is best-effort.
  }
}

/** Purge an invalid/stale saved value so it stops resurrecting. */
function purgeSavedCategory(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Best-effort.
  }
}

/**
 * Category filter control for the events listing (Story 3.2): wraps the
 * existing `CategoryTabs` component (Tout / Cinéma / Théâtre / Courts-métrages
 * / Musique / Expositions) and maps its `CategoryType` to the validated URL
 * token vocabulary (`"all"` ⇔ no `category` param). Presentational — it emits a
 * typed {@link CategoryFilterValue} and leaves URL writes to the parent island —
 * but it owns `sessionStorage` persistence: it saves on change and, on a fresh
 * mount with no URL category, restores a valid saved token by calling
 * `onChange` with `replace` (the parent seeds the URL; the URL stays the single
 * source of truth). Invalid/stale saved values are purged.
 */
export function EventCategoryFilter({
  value,
  onChange,
  labels,
  className,
}: EventCategoryFilterProps) {
  const restoredRef = React.useRef(false)

  // Restore-on-mount (mirrors EventLocationFilter's reconcile-then-replace
  // pattern): on a fresh `/events` visit with no category in the URL, seed the
  // URL from the remembered same-session selection. Runs once (ref-guarded).
  React.useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    // An active category already exists (from the URL or a user selection):
    // never auto-restore over it.
    if (value.category) return
    const saved = readSavedCategory()
    if (saved) {
      onChange({ category: saved }, { replace: true })
    } else {
      // readSavedCategory returns null for both "nothing saved" and "garbage
      // saved" — purge so a stale/invalid value stops resurrecting.
      purgeSavedCategory()
    }
  }, [value, onChange])

  const activeCategory: CategoryType = value.category ?? "all"

  const handleCategoryChange = React.useCallback(
    (category: CategoryType) => {
      const next: CategoryFilterValue = {
        category: category === "all" ? undefined : category,
      }
      persistCategory(next.category)
      onChange(next)
    },
    [onChange]
  )

  return (
    <CategoryTabs
      activeCategory={activeCategory}
      onCategoryChange={handleCategoryChange}
      labels={labels.tabs}
      ariaLabel={labels.groupLabel}
      className={className}
    />
  )
}

EventCategoryFilter.displayName = "EventCategoryFilter"
