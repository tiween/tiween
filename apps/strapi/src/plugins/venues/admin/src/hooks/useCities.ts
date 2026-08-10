/**
 * The geography plugin's cities, for the venue form's `cityRef` select and the
 * list's city filter.
 *
 * Read through the built-in content-manager collection endpoint (the same door
 * `events-manager/hooks/useGeography.ts` uses) rather than a new venues route:
 * the venues plugin does not own the geography vocabulary, and proxying someone
 * else's collection through it would be a second, drift-prone copy of a read
 * that already exists.
 *
 * FAIL-SOFT by design. A caller whose admin role cannot read
 * `plugin::geography.city` gets an empty list and an unusable city select — but
 * the venue form still opens and every other field still saves. Blocking the
 * whole form on an optional relation would be a worse failure.
 *
 * PAGES THROUGH the whole vocabulary instead of taking the first page. A single
 * capped page silently truncates, and a venue whose stored city fell past the
 * cap renders a BLANK select — the editor sees an unset field, saves, and
 * clears the relation. If the (generous) safety cap is ever reached the
 * shortfall is reported through `truncated` and the UI says so, rather than
 * pretending the list is complete.
 *
 * ONE FETCH PER SESSION: the vocabulary is static reference data and the hook
 * mounts at least twice (the list filter and the form modal). The in-flight
 * promise is shared module-wide so opening the modal does not re-read a few
 * hundred rows that are already in memory; `refetch()` busts it.
 */
import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

const CITY_CM_PATH = "/content-manager/collection-types/plugin::geography.city"
const PAGE_SIZE = 100
/** Tunisia has ~24 governorates and a few hundred cities; 10 pages is ample. */
const MAX_PAGES = 10

export const MAX_CITIES = PAGE_SIZE * MAX_PAGES

export interface City {
  id: number
  documentId: string
  name: string
  slug?: string
}

interface CitiesResponse {
  results?: City[]
  pagination?: { pageCount?: number; total?: number }
}

export interface CitiesResult {
  cities: City[]
  /** The safety cap was hit — the select is NOT showing every city. */
  truncated: boolean
}

type Getter = <T>(
  url: string,
  config?: { params?: Record<string, unknown> }
) => Promise<{ data: T }>

/** Shared across mounts; `refetch()` clears it. */
let inFlight: Promise<CitiesResult> | null = null

async function loadCities(get: Getter): Promise<CitiesResult> {
  const cities: City[] = []
  let page = 1
  let pageCount = 1

  while (page <= pageCount && page <= MAX_PAGES) {
    const response = await get<CitiesResponse>(CITY_CM_PATH, {
      params: { page, pageSize: PAGE_SIZE, sort: "name:asc" },
    })

    cities.push(...(response.data.results ?? []))
    pageCount = response.data.pagination?.pageCount ?? 1
    page += 1
  }

  return { cities, truncated: pageCount > MAX_PAGES }
}

export function useCities() {
  const { get } = useFetchClient()
  const [state, setState] = useState<CitiesResult>({
    cities: [],
    truncated: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchCities = useCallback(
    async (force = false) => {
      if (force) inFlight = null
      setIsLoading(true)

      if (!inFlight) {
        inFlight = loadCities(get as Getter).catch((err) => {
          // Fail soft, but clear the cache so a later mount can retry rather
          // than inheriting the failure for the rest of the session.
          inFlight = null
          throw err
        })
      }

      try {
        setState(await inFlight)
      } catch {
        setState({ cities: [], truncated: false })
      } finally {
        setIsLoading(false)
      }
    },
    [get]
  )

  useEffect(() => {
    fetchCities()
  }, [fetchCities])

  return {
    cities: state.cities,
    truncated: state.truncated,
    isLoading,
    refetch: () => fetchCities(true),
  }
}
