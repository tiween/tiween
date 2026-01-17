"use client"

import * as React from "react"
import { Clock, Loader2, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Localized labels for SearchBar
 */
export interface SearchBarLabels {
  placeholder: string
  clearSearch: string
  recentSearches: string
  searching: string
}

const defaultLabels: SearchBarLabels = {
  placeholder: "Rechercher des événements...",
  clearSearch: "Effacer la recherche",
  recentSearches: "Recherches récentes",
  searching: "Recherche en cours...",
}

export interface SearchBarProps {
  /** Current search value */
  value: string
  /** Called when the input value changes */
  onChange: (value: string) => void
  /** Called when user submits a search (Enter key or suggestion click) */
  onSearch: (query: string) => void
  /** Called when clear button is clicked */
  onClear?: () => void
  /** Whether search is in progress */
  isLoading?: boolean
  /** Recent search queries to display */
  recentSearches?: string[]
  /** Called when a recent search is removed */
  onRemoveRecentSearch?: (query: string) => void
  /** Localized labels */
  labels?: SearchBarLabels
  /** Additional class names */
  className?: string
  /** Auto focus the input on mount */
  autoFocus?: boolean
}

/**
 * SearchBar - Search input with recent searches dropdown
 *
 * Features:
 * - Search icon with clear button
 * - Loading state indicator
 * - Recent searches dropdown on focus
 * - Keyboard navigation (Enter to search, Escape to close)
 * - RTL support via CSS logical properties
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("")
 * const [recentSearches, setRecentSearches] = useState(["Inception", "Jazz"])
 *
 * <SearchBar
 *   value={query}
 *   onChange={setQuery}
 *   onSearch={(q) => console.log("Search for:", q)}
 *   recentSearches={recentSearches}
 * />
 * ```
 */
export function SearchBar({
  value,
  onChange,
  onSearch,
  onClear,
  isLoading = false,
  recentSearches = [],
  onRemoveRecentSearch,
  labels = defaultLabels,
  className,
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)

  // Show dropdown when focused and has recent searches (and no current value)
  const showDropdown = isFocused && recentSearches.length > 0 && !value

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setHighlightedIndex(-1)
  }

  // Handle clear button click
  const handleClear = () => {
    onChange("")
    onClear?.()
    inputRef.current?.focus()
  }

  // Handle form submit (Enter key)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (highlightedIndex >= 0 && highlightedIndex < recentSearches.length) {
      // Select highlighted recent search
      const selected = recentSearches[highlightedIndex]
      onChange(selected)
      onSearch(selected)
    } else if (value.trim()) {
      onSearch(value.trim())
    }
    setHighlightedIndex(-1)
  }

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < recentSearches.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Escape":
        e.preventDefault()
        setIsFocused(false)
        inputRef.current?.blur()
        break
    }
  }

  // Handle clicking a recent search
  const handleRecentClick = (query: string) => {
    onChange(query)
    onSearch(query)
    setIsFocused(false)
  }

  // Handle removing a recent search
  const handleRemoveRecent = (e: React.MouseEvent, query: string) => {
    e.stopPropagation()
    onRemoveRecentSearch?.(query)
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit} role="search">
        <div className="relative">
          {/* Search Icon */}
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
            {isLoading ? (
              <Loader2
                className="text-muted-foreground h-5 w-5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="text-muted-foreground h-5 w-5"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={labels.placeholder}
            autoFocus={autoFocus}
            aria-label={labels.placeholder}
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? "search-suggestions" : undefined}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `search-suggestion-${highlightedIndex}`
                : undefined
            }
            className={cn(
              // Base styles
              "bg-secondary text-foreground placeholder:text-muted-foreground w-full rounded-full",
              // Padding with space for icons
              "py-3 ps-10 pe-10",
              // Typography
              "text-sm",
              // Border
              "border border-transparent",
              // Focus styles
              "focus:border-primary focus:ring-primary/20 focus:ring-2 focus:outline-none",
              // Transition
              "transition-colors duration-200"
            )}
          />

          {/* Clear Button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={labels.clearSearch}
              className={cn(
                "absolute inset-y-0 end-0 flex items-center pe-3",
                "text-muted-foreground hover:text-foreground",
                "transition-colors duration-200"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      {/* Recent Searches Dropdown */}
      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          aria-label={labels.recentSearches}
          className={cn(
            "bg-popover text-popover-foreground absolute inset-x-0 z-50 mt-2 rounded-lg border shadow-lg",
            "overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="text-muted-foreground border-b px-4 py-2 text-xs font-medium tracking-wide uppercase">
            {labels.recentSearches}
          </div>

          {/* Recent search items */}
          <ul className="py-1">
            {recentSearches.map((query, index) => (
              <li
                key={query}
                id={`search-suggestion-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleRecentClick(query)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-4 py-2",
                  "transition-colors duration-150",
                  index === highlightedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">{query}</span>
                </div>

                {/* Remove button */}
                {onRemoveRecentSearch && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveRecent(e, query)}
                    aria-label={`Remove "${query}" from recent searches`}
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      "rounded p-1",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

SearchBar.displayName = "SearchBar"
