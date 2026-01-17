"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Available event categories for filtering
 */
export type CategoryType =
  | "all"
  | "cinema"
  | "theater"
  | "shorts"
  | "music"
  | "exhibitions"

/**
 * Localized labels for category names
 */
export interface CategoryTabsLabels {
  all: string
  cinema: string
  theater: string
  shorts: string
  music: string
  exhibitions: string
}

const defaultLabels: CategoryTabsLabels = {
  all: "Tout",
  cinema: "Cinéma",
  theater: "Théâtre",
  shorts: "Courts-métrages",
  music: "Musique",
  exhibitions: "Expositions",
}

export interface CategoryTabsProps {
  /** Currently active category */
  activeCategory: CategoryType
  /** Called when a category tab is clicked */
  onCategoryChange: (category: CategoryType) => void
  /** Localized labels for category names */
  labels?: CategoryTabsLabels
  /** Additional class names */
  className?: string
}

// Order of categories in the tabs
const categoryOrder: CategoryType[] = [
  "all",
  "cinema",
  "theater",
  "shorts",
  "music",
  "exhibitions",
]

/**
 * CategoryTabs - Horizontal scrolling category filter tabs
 *
 * Features:
 * - Horizontal scrollable list of category tabs
 * - Active tab highlighted with primary color underline
 * - Touch-friendly 44px minimum tap targets
 * - Fade gradients at edges to indicate scrollable content
 * - RTL support via CSS logical properties
 *
 * @example
 * ```tsx
 * const [category, setCategory] = useState<CategoryType>("all")
 *
 * <CategoryTabs
 *   activeCategory={category}
 *   onCategoryChange={setCategory}
 * />
 * ```
 */
export function CategoryTabs({
  activeCategory,
  onCategoryChange,
  labels = defaultLabels,
  className,
}: CategoryTabsProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = React.useState(false)
  const [showRightFade, setShowRightFade] = React.useState(true)

  // Update scroll indicators based on scroll position
  const updateScrollIndicators = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const isRTL = getComputedStyle(container).direction === "rtl"

    // In RTL, scrollLeft is negative (or can be positive depending on browser)
    // We need to handle both cases
    const scrollStart = Math.abs(scrollLeft)
    const maxScroll = scrollWidth - clientWidth

    if (isRTL) {
      // RTL: fades are reversed
      setShowRightFade(scrollStart > 10)
      setShowLeftFade(scrollStart < maxScroll - 10)
    } else {
      // LTR: normal behavior
      setShowLeftFade(scrollStart > 10)
      setShowRightFade(scrollStart < maxScroll - 10)
    }
  }, [])

  // Initialize and update scroll indicators
  React.useEffect(() => {
    updateScrollIndicators()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener("scroll", updateScrollIndicators)
      return () =>
        container.removeEventListener("scroll", updateScrollIndicators)
    }
  }, [updateScrollIndicators])

  // Scroll to active tab on mount/change
  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const activeTab = container.querySelector('[data-active="true"]')
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [activeCategory])

  return (
    <div className={cn("relative", className)}>
      {/* Left fade indicator */}
      <div
        className={cn(
          "from-secondary bg-gradient-to-e pointer-events-none absolute start-0 top-0 bottom-0 z-10 w-6 to-transparent transition-opacity",
          showLeftFade ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />

      {/* Tabs container */}
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-label="Event categories"
        className="no-scrollbar flex gap-1 overflow-x-auto scroll-smooth"
      >
        {categoryOrder.map((category) => {
          const isActive = category === activeCategory
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${category}`}
              data-active={isActive}
              onClick={() => onCategoryChange(category)}
              className={cn(
                // Base styles
                "relative shrink-0 px-4 py-2 whitespace-nowrap",
                // Minimum touch target height (44px)
                "min-h-[44px]",
                // Typography
                "text-sm font-medium transition-colors",
                // Border bottom for underline effect
                "border-b-2",
                // Active/inactive states
                isActive
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent",
                // Focus styles
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              )}
            >
              {labels[category]}
            </button>
          )
        })}
      </div>

      {/* Right fade indicator */}
      <div
        className={cn(
          "from-secondary bg-gradient-to-s pointer-events-none absolute end-0 top-0 bottom-0 z-10 w-6 to-transparent transition-opacity",
          showRightFade ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
    </div>
  )
}

CategoryTabs.displayName = "CategoryTabs"
