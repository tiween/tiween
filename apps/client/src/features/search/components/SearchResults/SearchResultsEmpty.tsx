"use client"

import { SearchX } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface SearchResultsEmptyLabels {
  noResults: string
  noResultsSuggestion: string
  tryAgain: string
}

const defaultLabels: SearchResultsEmptyLabels = {
  noResults: "Aucun résultat",
  noResultsSuggestion:
    "Essayez une autre recherche ou explorez les catégories ci-dessous",
  tryAgain: "Effacer la recherche",
}

export interface SearchResultsEmptyProps {
  /** The search query that returned no results */
  query: string
  /** Called when user wants to clear/retry search */
  onClear?: () => void
  /** Localized labels */
  labels?: SearchResultsEmptyLabels
  /** Additional class names */
  className?: string
}

/**
 * SearchResultsEmpty - Empty state for when search returns no results
 *
 * Displays a friendly message with suggestions and an option to clear the search.
 */
export function SearchResultsEmpty({
  query,
  onClear,
  labels = defaultLabels,
  className,
}: SearchResultsEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      {/* Icon */}
      <div className="bg-muted mb-4 rounded-full p-4">
        <SearchX className="text-muted-foreground h-8 w-8" />
      </div>

      {/* Message */}
      <h3 className="text-foreground mb-2 text-lg font-medium">
        {labels.noResults} &quot;{query}&quot;
      </h3>

      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        {labels.noResultsSuggestion}
      </p>

      {/* Clear button */}
      {onClear && (
        <Button variant="outline" onClick={onClear}>
          {labels.tryAgain}
        </Button>
      )}
    </div>
  )
}

SearchResultsEmpty.displayName = "SearchResultsEmpty"
