/**
 * Creative Works Hooks
 *
 * Data access for the creative-works plugin content types
 * (creative-work, person, genre) through the content-manager API.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

import type { MediaAsset } from "../components/MediaInput"
import type { Pagination } from "./useVenuesEnhanced"

import { WORK_POPULATE } from "./workPopulate"

export type WorkType = "film" | "play" | "short-film"

export const WORK_UID = "plugin::creative-works.creative-work"
export const PERSON_UID = "plugin::creative-works.person"
export const GENRE_UID = "plugin::creative-works.genre"
export const CREDIT_ROLE_UID = "plugin::creative-works.credit-role"
export const CHARACTER_UID = "plugin::creative-works.character"

const cmUrl = (uid: string) => `/content-manager/collection-types/${uid}`

/** Page size and hard page ceiling for the credit-role vocabulary fetch */
const CREDIT_ROLE_PAGE_SIZE = 100
const CREDIT_ROLE_MAX_PAGES = 20

export interface PersonRef {
  // `id` is optional so form values (which only carry documentId + name) can
  // flow back into the person pickers without a cast.
  id?: number
  documentId: string
  name: string
}

export interface Genre {
  id: number
  documentId: string
  name: string
  slug?: string
}

/** A record of the `credit-role` content type (crew vocabulary) */
export interface CreditRoleRef {
  id?: number
  documentId: string
  name: string
  slug?: string | null
  department?: string | null
}

/** A record of the `character` content type (portrayed in a work) */
export interface CharacterRef {
  id?: number
  documentId: string
  name: string
}

/**
 * `creative-works.credit` component — a crew contribution.
 * `creditRole` is a REQUIRED relation to plugin::creative-works.credit-role;
 * it is only nullable here because legacy rows may not carry one yet.
 */
export interface Credit {
  id?: number
  person: PersonRef | null
  creditRole?: CreditRoleRef | null
  customRole?: string | null
  billing?: number | null
}

/**
 * `creative-works.cast` component — an actor portraying a character.
 * `character` is an OPTIONAL relation.
 */
export interface CastMember {
  id?: number
  person: PersonRef | null
  character?: CharacterRef | null
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

/**
 * `common.video` component.
 *
 * `videoType` is authoritative for every consumer; `type` is the retained
 * legacy enum (FULL_LENGTH / TEASER / CLIP) that the editor never exposes and
 * carries through untouched (DW-11, "keep both, document the split").
 */
export interface VideoItem {
  id?: number
  url: string
  type?: string | null
  videoType?: string | null
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
  cast?: CastMember[]
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

export { WORK_POPULATE }

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

/**
 * Search works restricted to a set of `type` values.
 *
 * `useWorksList` filters on a single type, but a screening may reference either
 * a `film` or a `short-film` — and offering a work the sub-event lifecycle
 * guard (`assertSubEventWorkKind`) would reject turns a picker choice into a
 * server-side `ValidationError`. Hence the `$in` filter.
 */
export function useWorkSearch(term: string, types: readonly WorkType[]) {
  const { get } = useFetchClient()
  const [works, setWorks] = useState<CreativeWork[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // `types` is typically an inline array literal, so keying the effect on the
  // array identity would refetch on every render. The key is for CHANGE
  // DETECTION only — the request is built from the array itself, since
  // round-tripping values through a joined string would corrupt any type
  // containing a comma.
  const typeKey = [...types].sort().join(",")
  const typesRef = useRef(types)
  typesRef.current = types

  useEffect(() => {
    let cancelled = false

    const search = async () => {
      const activeTypes = [...typesRef.current]

      // An empty `$in` either 400s or, worse, silently drops the constraint and
      // offers works the sub-event lifecycle guard will reject. Ask for nothing
      // instead.
      if (activeTypes.length === 0) {
        setWorks([])
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const filters: Record<string, unknown> = {
          type: { $in: activeTypes },
        }
        if (term) {
          filters["$or"] = [
            { title: { $containsi: term } },
            { originalTitle: { $containsi: term } },
          ]
        }

        const response = await get<ListResponse<CreativeWork>>(
          cmUrl(WORK_UID),
          {
            params: {
              page: 1,
              pageSize: 20,
              sort: "title:asc",
              populate: ["poster"],
              filters,
            },
          }
        )
        if (!cancelled) setWorks(response.data.results ?? [])
      } catch (err) {
        if (!cancelled) {
          setWorks([])
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    search()
    return () => {
      cancelled = true
    }
  }, [get, term, typeKey])

  return { works, isLoading, error }
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

/**
 * Full crew vocabulary (`credit-role` records), sorted by name.
 *
 * `credit.creditRole` is a required relation, so the credits editor needs the
 * whole list up front rather than an async search.
 */
export function useCreditRoles() {
  const { get } = useFetchClient()
  const [creditRoles, setCreditRoles] = useState<CreditRoleRef[]>([])
  // Starts true: the effect below always fires, and an initial `false` paints
  // CreditsEditor's "no credit roles available" danger banner for one frame on
  // every mount, before the vocabulary has even been requested.
  const [isLoading, setIsLoading] = useState(true)
  // Distinguishes "the vocabulary is genuinely empty" from "the request
  // failed" — both yield an empty list, but only one is a data problem.
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchCreditRoles = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // `creditRole` is a required relation, so a role missing from this
        // list is unpickable: page through the whole vocabulary rather than
        // silently truncating at the first page.
        const collected: CreditRoleRef[] = []
        let page = 1
        let pageCount = 1

        do {
          const response = await get<ListResponse<CreditRoleRef>>(
            cmUrl(CREDIT_ROLE_UID),
            {
              params: {
                page,
                pageSize: CREDIT_ROLE_PAGE_SIZE,
                sort: "name:asc",
              },
            }
          )
          collected.push(...(response.data.results ?? []))
          pageCount = response.data.pagination?.pageCount ?? 1
          page += 1
        } while (page <= pageCount && page <= CREDIT_ROLE_MAX_PAGES)

        if (!cancelled) {
          setCreditRoles(collected)
          // Hitting the ceiling means the tail of the vocabulary is unpickable
          // — and since `creditRole` is required, the credits that need those
          // roles are unsavable. Surface it rather than truncating silently.
          if (page > CREDIT_ROLE_MAX_PAGES && page <= pageCount) {
            setError(
              new Error(
                `Credit role vocabulary truncated at ${CREDIT_ROLE_MAX_PAGES} pages (${pageCount} available)`
              )
            )
          }
        }
      } catch (err) {
        if (!cancelled) {
          setCreditRoles([])
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchCreditRoles()
    return () => {
      cancelled = true
    }
  }, [get])

  return { creditRoles, isLoading, error }
}

/** Debounce-friendly character search used by the cast editor */
export function useCharacterSearch(term: string) {
  const { get } = useFetchClient()
  const [characters, setCharacters] = useState<CharacterRef[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const search = async () => {
      setIsLoading(true)
      try {
        const response = await get<ListResponse<CharacterRef>>(
          cmUrl(CHARACTER_UID),
          {
            params: {
              page: 1,
              pageSize: 10,
              sort: "name:asc",
              filters: term ? { name: { $containsi: term } } : undefined,
            },
          }
        )
        if (!cancelled) {
          setCharacters(response.data.results ?? [])
        }
      } catch {
        if (!cancelled) {
          setCharacters([])
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

  return { characters, isLoading }
}
