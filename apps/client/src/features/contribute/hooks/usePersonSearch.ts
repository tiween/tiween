"use client"

import { useCallback, useEffect, useState } from "react"
import { useDebouncedCallback } from "use-debounce"

import type { PersonSearchResult } from "../schemas/person"

interface UsePersonSearchOptions {
  debounceMs?: number
  minQueryLength?: number
}

interface UsePersonSearchReturn {
  query: string
  setQuery: (query: string) => void
  results: PersonSearchResult[]
  isLoading: boolean
  error: string | null
  clearResults: () => void
}

/**
 * Hook for searching persons with debounced API calls
 *
 * Features:
 * - Debounced search (default 300ms)
 * - Minimum query length before searching
 * - Loading and error states
 * - Clears results when query is empty
 */
export function usePersonSearch(
  options: UsePersonSearchOptions = {}
): UsePersonSearchReturn {
  const { debounceMs = 300, minQueryLength = 2 } = options

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PersonSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchPersons = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setResults([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/contribute/person/search?q=${encodeURIComponent(searchQuery)}`
        )

        if (!response.ok) {
          throw new Error("SEARCH_FAILED")
        }

        const data = await response.json()
        setResults(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "SEARCH_FAILED")
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [minQueryLength]
  )

  // Debounced search function
  const debouncedSearch = useDebouncedCallback(searchPersons, debounceMs)

  // Trigger search when query changes
  useEffect(() => {
    if (query.length >= minQueryLength) {
      debouncedSearch(query)
    } else {
      setResults([])
    }
  }, [query, minQueryLength, debouncedSearch])

  const clearResults = useCallback(() => {
    setQuery("")
    setResults([])
    setError(null)
  }, [])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearResults,
  }
}

/**
 * Hook for creating a new person
 */
interface UseCreatePersonReturn {
  createPerson: (data: {
    name: string
    photo?: string
    nationality?: string
  }) => Promise<PersonSearchResult | null>
  isCreating: boolean
  error: string | null
}

export function useCreatePerson(): UseCreatePersonReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPerson = useCallback(
    async (data: {
      name: string
      photo?: string
      nationality?: string
    }): Promise<PersonSearchResult | null> => {
      setIsCreating(true)
      setError(null)

      try {
        const response = await fetch("/api/contribute/person", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error?.message || "CREATE_FAILED")
        }

        const result = await response.json()
        return result.data
      } catch (err) {
        const message = err instanceof Error ? err.message : "CREATE_FAILED"
        setError(message)
        return null
      } finally {
        setIsCreating(false)
      }
    },
    []
  )

  return {
    createPerson,
    isCreating,
    error,
  }
}
