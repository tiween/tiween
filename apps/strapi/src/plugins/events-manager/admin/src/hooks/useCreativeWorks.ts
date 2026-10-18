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

/**
 * `creative-works.streaming-link` component — an official place to watch a
 * short film. `platform` and `accessType` are enumerations on the schema;
 * they are plain strings here because the server may return any stored value.
 */
export interface StreamingLinkItem {
  id?: number
  platform: string
  url: string
  accessType: string
  label?: string | null
}

/** Publication state the content-manager attaches to a loaded document */
export type WorkStatus = "draft" | "published" | "modified"

export interface CreativeWork {
  id: number
  documentId: string
  /** Set by the content-manager on a single-document read */
  status?: WorkStatus
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
  streamingLinks?: StreamingLinkItem[]
  country?: string[] | null
  language?: string[] | null
  featured?: boolean | null
  featuredRank?: number | null
  poster?: MediaAsset | null
  backdrop?: MediaAsset | null
  photos?: MediaAsset[] | null
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export { WORK_POPULATE }

/** One other-locale row of the same document, from `meta.availableLocales` */
export interface AvailableLocale {
  documentId?: string
  locale: string
  status?: WorkStatus
}

/** The `meta` block of a content-manager single-document read */
export interface WorkMeta {
  availableLocales?: AvailableLocale[]
}

/** A locale configured in the i18n plugin */
export interface LocaleInfo {
  code: string
  name: string
  isDefault: boolean
}

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

/**
 * Single creative work with all components populated.
 *
 * `locale` selects the row; the content-manager answers a locale that has no
 * row yet with `data: {}`, which is returned as `work: null` so the caller can
 * tell "not translated yet" from "loaded". `meta.availableLocales` lists the
 * OTHER locale rows of the document with their status.
 *
 * Pass `null` as `documentId` to skip the request (a new work, or a tab that
 * is not active).
 */
export function useWork(documentId: string | null, locale?: string | null) {
  const { get } = useFetchClient()
  const [work, setWork] = useState<CreativeWork | null>(null)
  const [meta, setMeta] = useState<WorkMeta | null>(null)
  // The request the current `work` answers. Comparing it with the wanted
  // request keeps `isLoading` true on the very render a new document or locale
  // is asked for, so a caller never paints the previous row for one frame. A
  // refetch of the SAME request is silent: the form stays mounted.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const wantedKey = documentId ? `${documentId}|${locale ?? ""}` : null
  const latestKey = useRef(wantedKey)
  latestKey.current = wantedKey

  const fetchWork = useCallback(async () => {
    if (!documentId) {
      setWork(null)
      setMeta(null)
      setLoadedKey(null)
      return
    }

    const key = `${documentId}|${locale ?? ""}`
    setError(null)

    try {
      const response = await get<{ data: CreativeWork; meta?: WorkMeta }>(
        `${cmUrl(WORK_UID)}/${documentId}`,
        { params: { populate: WORK_POPULATE, ...(locale ? { locale } : {}) } }
      )
      // A newer request (another document or tab) superseded this one.
      if (latestKey.current !== key) return
      const loaded = response.data.data
      setWork(loaded && loaded.documentId ? loaded : null)
      setMeta(response.data.meta ?? null)
      setLoadedKey(key)
    } catch (err) {
      if (latestKey.current !== key) return
      setError(err instanceof Error ? err : new Error(String(err)))
      setWork(null)
      setMeta(null)
      setLoadedKey(key)
    }
  }, [get, documentId, locale])

  useEffect(() => {
    fetchWork()
  }, [fetchWork])

  const isLoading = wantedKey !== null && loadedKey !== wantedKey

  return { work, meta, isLoading, error, refetch: fetchWork }
}

/**
 * Locales configured in the i18n plugin, default first. The default locale is
 * read from `isDefault`, never assumed.
 */
export function useLocales() {
  const { get } = useFetchClient()
  const [locales, setLocales] = useState<LocaleInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await get<LocaleInfo[]>("/i18n/locales")
        const list = Array.isArray(response.data) ? response.data : []
        if (!cancelled) {
          setLocales(
            [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
          )
        }
      } catch {
        if (!cancelled) setLocales([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [get])

  const defaultLocale = locales.find((locale) => locale.isDefault)?.code ?? null

  return { locales, defaultLocale, isLoading }
}

/** Request config carrying the locale as a query parameter */
const localeConfig = (locale?: string | null) =>
  locale ? { params: { locale } } : undefined

/**
 * Documents a translation row of a work points at. Creating a locale row of a
 * work copies its non-localized `credits` and `cast`, whose person, credit-role
 * and character targets are localized, so each target needs a row in that
 * locale first or the server answers `locale "<code>" not found`.
 */
export interface TranslationTargets {
  persons: string[]
  roles: Array<{ documentId: string; name: string; slug?: string | null }>
  characters: Array<{ documentId: string; name: string }>
}

/** Pure: the distinct credited documents of a work, by kind. */
export function collectTranslationTargets(
  work: CreativeWork
): TranslationTargets {
  const persons = new Set<string>()
  const roles = new Map<
    string,
    { documentId: string; name: string; slug?: string | null }
  >()
  const characters = new Map<string, { documentId: string; name: string }>()

  for (const credit of work.credits ?? []) {
    if (credit.person?.documentId) persons.add(credit.person.documentId)
    const role = credit.creditRole
    if (role?.documentId && !roles.has(role.documentId)) {
      roles.set(role.documentId, {
        documentId: role.documentId,
        name: role.name,
        slug: role.slug ?? null,
      })
    }
  }
  for (const member of work.cast ?? []) {
    if (member.person?.documentId) persons.add(member.person.documentId)
    const character = member.character
    if (character?.documentId && !characters.has(character.documentId)) {
      characters.set(character.documentId, {
        documentId: character.documentId,
        name: character.name,
      })
    }
  }

  return {
    persons: [...persons],
    roles: [...roles.values()],
    characters: [...characters.values()],
  }
}

/** Page size of the "which targets already have this locale" lookups */
const TARGET_LOOKUP_CHUNK = 50

/**
 * Create / update / delete / publish mutations for creative works.
 *
 * The content-manager collection-types routes read the request body FLAT (the
 * entity itself). Wrapping it in `{ data }` makes the server drop the unknown
 * `data` key and save an empty document, so payloads are sent as they are.
 */
export function useWorkMutations() {
  const { get, post, put, del } = useFetchClient()
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
        const response = await post<{ data: CreativeWork }>(
          cmUrl(WORK_UID),
          data
        )
        return response.data.data
      }),
    [post, run]
  )

  const updateWork = useCallback(
    (documentId: string, data: Record<string, unknown>, locale?: string) =>
      run(async () => {
        const response = await put<{ data: CreativeWork }>(
          `${cmUrl(WORK_UID)}/${documentId}`,
          data,
          localeConfig(locale)
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
    (documentId: string, locale?: string) =>
      run(async () => {
        await post(
          `${cmUrl(WORK_UID)}/${documentId}/actions/publish`,
          {},
          localeConfig(locale)
        )
      }),
    [post, run]
  )

  const unpublishWork = useCallback(
    (documentId: string, locale?: string) =>
      run(async () => {
        await post(
          `${cmUrl(WORK_UID)}/${documentId}/actions/unpublish`,
          {},
          localeConfig(locale)
        )
      }),
    [post, run]
  )

  /**
   * A slug for a work, generated from its title by the content-manager's uid
   * generator (the server never generates one on its own).
   */
  const generateSlug = useCallback(
    async (title: string): Promise<string> => {
      const response = await post<{ data: string }>(
        "/content-manager/uid/generate",
        { contentTypeUID: WORK_UID, field: "slug", data: { title } }
      )
      const slug = response.data.data
      if (typeof slug !== "string" || slug.trim() === "") {
        throw new Error("SLUG_GENERATION_FAILED")
      }
      return slug
    },
    [post]
  )

  /**
   * Make a work translatable into `locale`: give every credited person,
   * credit-role and cast character a row in that locale (only the missing
   * ones). Each new row starts from the default-locale values: persons copy
   * their name on their own, roles and characters are named like the source.
   */
  const ensureTranslationTargets = useCallback(
    (source: CreativeWork, locale: string) =>
      run(async () => {
        const targets = collectTranslationTargets(source)

        const existingIds = async (uid: string, ids: string[]) => {
          const found = new Set<string>()
          for (let i = 0; i < ids.length; i += TARGET_LOOKUP_CHUNK) {
            const chunk = ids.slice(i, i + TARGET_LOOKUP_CHUNK)
            const response = await get<{
              results?: Array<{ documentId: string }>
            }>(cmUrl(uid), {
              params: {
                locale,
                page: 1,
                pageSize: TARGET_LOOKUP_CHUNK,
                filters: { documentId: { $in: chunk } },
              },
            })
            for (const row of response.data.results ?? []) {
              found.add(row.documentId)
            }
          }
          return found
        }

        const create = async (
          uid: string,
          documentId: string,
          body: Record<string, unknown>
        ) => {
          await put(`${cmUrl(uid)}/${documentId}`, body, localeConfig(locale))
        }

        const havePersons = await existingIds(PERSON_UID, targets.persons)
        for (const id of targets.persons) {
          if (!havePersons.has(id)) await create(PERSON_UID, id, {})
        }

        const haveRoles = await existingIds(
          CREDIT_ROLE_UID,
          targets.roles.map((role) => role.documentId)
        )
        for (const role of targets.roles) {
          if (haveRoles.has(role.documentId)) continue
          // The uid `slug` is not copied to a new locale row and is required.
          await create(CREDIT_ROLE_UID, role.documentId, {
            name: role.name,
            ...(role.slug ? { slug: role.slug } : {}),
          })
        }

        const haveCharacters = await existingIds(
          CHARACTER_UID,
          targets.characters.map((character) => character.documentId)
        )
        for (const character of targets.characters) {
          if (haveCharacters.has(character.documentId)) continue
          await create(CHARACTER_UID, character.documentId, {
            name: character.name,
          })
        }
      }),
    [get, put, run]
  )

  return {
    createWork,
    updateWork,
    deleteWork,
    publishWork,
    unpublishWork,
    generateSlug,
    ensureTranslationTargets,
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
