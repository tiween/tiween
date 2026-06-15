/**
 * Creative Works Hooks
 *
 * Data access for the creative-works plugin content types
 * (creative-work, person, genre) through the content-manager API.
 */

import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

import type { MediaAsset } from "../components/MediaInput"
import type { Pagination } from "./useVenuesEnhanced"

export type WorkType = "film" | "play" | "short-film"

export const WORK_UID = "plugin::creative-works.creative-work"
export const PERSON_UID = "plugin::creative-works.person"
export const GENRE_UID = "plugin::creative-works.genre"

const cmUrl = (uid: string) => `/content-manager/collection-types/${uid}`

export interface PersonRef {
  id: number
  documentId: string
  name: string
}

export interface Genre {
  id: number
  documentId: string
  name: string
  slug?: string
}

export interface Credit {
  id?: number
  person: PersonRef | null
  role: string
  character?: string | null
  customRole?: string | null
  billing?: number | null
}

export interface Distinction {
  id?: number
  name: string
  edition?: string | null
  year: number
  section?: string | null
  category?: string | null
  result?: string | null
  awardName?: string | null
}

export interface TheatreDetails {
  id?: number
  playType?: string | null
  format?: string | null
  actCount?: number | null
  hasIntermission?: boolean | null
  basedOn?: string | null
  originalLanguage?: string | null
  performedLanguages?: string[] | null
  productionCompany?: string | null
  premiereDate?: string | null
  premiereVenue?: { id: number; documentId: string; name: string } | null
  isTourProduction?: boolean | null
}

export interface ExternalIds {
  id?: number
  tmdbId?: number | null
  imdbId?: string | null
  lastSyncedAt?: string | null
}

export interface LinkItem {
  id?: number
  url: string
  type: string
  label?: string | null
}

export interface VideoItem {
  id?: number
  url: string
  type?: string | null
}

export interface CreativeWork {
  id: number
  documentId: string
  title: string
  originalTitle?: string | null
  slug?: string | null
  type: WorkType
  synopsis?: string | null
  duration?: number | null
  releaseYear?: number | null
  rating?: number | null
  ageRating?: string | null
  genres?: Genre[]
  credits?: Credit[]
  distinctions?: Distinction[]
  theatreDetails?: TheatreDetails | null
  externalIds?: ExternalIds | null
  links?: LinkItem[]
  videos?: VideoItem[]
  poster?: MediaAsset | null
  backdrop?: MediaAsset | null
  photos?: MediaAsset[] | null
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

const WORK_POPULATE = [
  "poster",
  "backdrop",
  "photos",
  "genres",
  "credits",
  "credits.person",
  "distinctions",
  "theatreDetails",
  "theatreDetails.premiereVenue",
  "externalIds",
  "videos",
  "links",
]

interface ListResponse<T> {
  results: T[]
  pagination: Pagination
}

export interface UseWorksListOptions {
  page?: number
  pageSize?: number
  search?: string
  type?: WorkType | ""
  sort?: string
}

/** Paginated, filterable list of creative works */
export function useWorksList(options: UseWorksListOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    search = "",
    type = "",
    sort = "title:asc",
  } = options

  const { get } = useFetchClient()
  const [works, setWorks] = useState<CreativeWork[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    pageCount: 0,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchWorks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const filters: Record<string, unknown> = {}
      if (search) {
        filters["$or"] = [
          { title: { $containsi: search } },
          { originalTitle: { $containsi: search } },
        ]
      }
      if (type) {
        filters["type"] = type
      }

      const response = await get<ListResponse<CreativeWork>>(cmUrl(WORK_UID), {
        params: {
          page,
          pageSize,
          sort,
          populate: ["poster", "genres"],
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        },
      })

      setWorks(response.data.results ?? [])
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setWorks([])
    } finally {
      setIsLoading(false)
    }
  }, [get, page, pageSize, search, type, sort])

  useEffect(() => {
    fetchWorks()
  }, [fetchWorks])

  return { works, pagination, isLoading, error, refetch: fetchWorks }
}

/** Single creative work with all components populated */
export function useWork(documentId: string | null) {
  const { get } = useFetchClient()
  const [work, setWork] = useState<CreativeWork | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(documentId))
  const [error, setError] = useState<Error | null>(null)

  const fetchWork = useCallback(async () => {
    if (!documentId) {
      setWork(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await get<{ data: CreativeWork }>(
        `${cmUrl(WORK_UID)}/${documentId}`,
        { params: { populate: WORK_POPULATE } }
      )
      setWork(response.data.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setWork(null)
    } finally {
      setIsLoading(false)
    }
  }, [get, documentId])

  useEffect(() => {
    fetchWork()
  }, [fetchWork])

  return { work, isLoading, error, refetch: fetchWork }
}

/** Create / update / delete / publish mutations for creative works */
export function useWorkMutations() {
  const { post, put, del } = useFetchClient()
  const [isLoading, setIsLoading] = useState(false)

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    try {
      return await fn()
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createWork = useCallback(
    (data: Record<string, unknown>) =>
      run(async () => {
        const response = await post<{ data: CreativeWork }>(cmUrl(WORK_UID), {
          data,
        })
        return response.data.data
      }),
    [post, run]
  )

  const updateWork = useCallback(
    (documentId: string, data: Record<string, unknown>) =>
      run(async () => {
        const response = await put<{ data: CreativeWork }>(
          `${cmUrl(WORK_UID)}/${documentId}`,
          { data }
        )
        return response.data.data
      }),
    [put, run]
  )

  const deleteWork = useCallback(
    (documentId: string) =>
      run(async () => {
        await del(`${cmUrl(WORK_UID)}/${documentId}`)
      }),
    [del, run]
  )

  const publishWork = useCallback(
    (documentId: string) =>
      run(async () => {
        await post(`${cmUrl(WORK_UID)}/${documentId}/actions/publish`)
      }),
    [post, run]
  )

  const unpublishWork = useCallback(
    (documentId: string) =>
      run(async () => {
        await post(`${cmUrl(WORK_UID)}/${documentId}/actions/unpublish`)
      }),
    [post, run]
  )

  return {
    createWork,
    updateWork,
    deleteWork,
    publishWork,
    unpublishWork,
    isLoading,
  }
}

/** All genres (for the multi-select) */
export function useGenres() {
  const { get } = useFetchClient()
  const [genres, setGenres] = useState<Genre[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchGenres = async () => {
      setIsLoading(true)
      try {
        const response = await get<ListResponse<Genre>>(cmUrl(GENRE_UID), {
          params: { page: 1, pageSize: 100, sort: "name:asc" },
        })
        if (!cancelled) {
          setGenres(response.data.results ?? [])
        }
      } catch {
        if (!cancelled) {
          setGenres([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchGenres()
    return () => {
      cancelled = true
    }
  }, [get])

  return { genres, isLoading }
}

/** Debounce-friendly person search used by the credits editor */
export function usePersonSearch(term: string) {
  const { get } = useFetchClient()
  const [people, setPeople] = useState<PersonRef[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const search = async () => {
      setIsLoading(true)
      try {
        const response = await get<ListResponse<PersonRef>>(cmUrl(PERSON_UID), {
          params: {
            page: 1,
            pageSize: 10,
            sort: "name:asc",
            filters: term ? { name: { $containsi: term } } : undefined,
          },
        })
        if (!cancelled) {
          setPeople(response.data.results ?? [])
        }
      } catch {
        if (!cancelled) {
          setPeople([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    search()
    return () => {
      cancelled = true
    }
  }, [get, term])

  return { people, isLoading }
}
