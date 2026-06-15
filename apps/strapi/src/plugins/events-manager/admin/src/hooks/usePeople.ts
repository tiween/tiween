/**
 * People Hooks
 *
 * Data access for plugin::creative-works.person through the
 * content-manager API, plus the reverse "credited works" lookup.
 */

import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

import type { MediaAsset } from "../components/MediaInput"
import type { CreativeWork, ExternalIds, LinkItem } from "./useCreativeWorks"
import type { Pagination } from "./useVenuesEnhanced"

import { PERSON_UID, WORK_UID } from "./useCreativeWorks"

const cmUrl = (uid: string) => `/content-manager/collection-types/${uid}`

export interface Person {
  id: number
  documentId: string
  name: string
  slug?: string | null
  bio?: string | null
  photo?: MediaAsset | null
  birthDate?: string | null
  nationality?: string | null
  roles?: string[] | null
  links?: LinkItem[]
  externalIds?: ExternalIds | null
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

interface ListResponse<T> {
  results: T[]
  pagination: Pagination
}

export interface UsePeopleListOptions {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
}

/** Paginated, searchable list of people */
export function usePeopleList(options: UsePeopleListOptions = {}) {
  const { page = 1, pageSize = 20, search = "", sort = "name:asc" } = options

  const { get } = useFetchClient()
  const [people, setPeople] = useState<Person[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    pageCount: 0,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPeople = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await get<ListResponse<Person>>(cmUrl(PERSON_UID), {
        params: {
          page,
          pageSize,
          sort,
          populate: ["photo"],
          filters: search ? { name: { $containsi: search } } : undefined,
        },
      })

      setPeople(response.data.results ?? [])
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setPeople([])
    } finally {
      setIsLoading(false)
    }
  }, [get, page, pageSize, search, sort])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  return { people, pagination, isLoading, error, refetch: fetchPeople }
}

/** Single person with components populated */
export function usePerson(documentId: string | null) {
  const { get } = useFetchClient()
  const [person, setPerson] = useState<Person | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(documentId))
  const [error, setError] = useState<Error | null>(null)

  const fetchPerson = useCallback(async () => {
    if (!documentId) {
      setPerson(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await get<{ data: Person }>(
        `${cmUrl(PERSON_UID)}/${documentId}`,
        { params: { populate: ["photo", "links", "externalIds"] } }
      )
      setPerson(response.data.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setPerson(null)
    } finally {
      setIsLoading(false)
    }
  }, [get, documentId])

  useEffect(() => {
    fetchPerson()
  }, [fetchPerson])

  return { person, isLoading, error, refetch: fetchPerson }
}

/** Create / update / delete / publish mutations for people */
export function usePersonMutations() {
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

  const createPerson = useCallback(
    (data: Record<string, unknown>) =>
      run(async () => {
        const response = await post<{ data: Person }>(cmUrl(PERSON_UID), {
          data,
        })
        return response.data.data
      }),
    [post, run]
  )

  const updatePerson = useCallback(
    (documentId: string, data: Record<string, unknown>) =>
      run(async () => {
        const response = await put<{ data: Person }>(
          `${cmUrl(PERSON_UID)}/${documentId}`,
          { data }
        )
        return response.data.data
      }),
    [put, run]
  )

  const deletePerson = useCallback(
    (documentId: string) =>
      run(async () => {
        await del(`${cmUrl(PERSON_UID)}/${documentId}`)
      }),
    [del, run]
  )

  const publishPerson = useCallback(
    (documentId: string) =>
      run(async () => {
        await post(`${cmUrl(PERSON_UID)}/${documentId}/actions/publish`)
      }),
    [post, run]
  )

  return { createPerson, updatePerson, deletePerson, publishPerson, isLoading }
}

/**
 * Works a person is credited on.
 *
 * Credits are embedded components on creative-work (no inverse relation),
 * so this filters works whose credits component points at the person.
 */
export function usePersonWorks(documentId: string | null) {
  const { get } = useFetchClient()
  const [works, setWorks] = useState<CreativeWork[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!documentId) {
      setWorks([])
      return
    }

    let cancelled = false

    const fetchWorks = async () => {
      setIsLoading(true)
      try {
        const response = await get<ListResponse<CreativeWork>>(
          cmUrl(WORK_UID),
          {
            params: {
              page: 1,
              pageSize: 50,
              sort: "releaseYear:desc",
              populate: ["credits", "credits.person"],
              filters: {
                credits: { person: { documentId: { $eq: documentId } } },
              },
            },
          }
        )
        if (!cancelled) {
          setWorks(response.data.results ?? [])
        }
      } catch {
        if (!cancelled) {
          setWorks([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchWorks()
    return () => {
      cancelled = true
    }
  }, [get, documentId])

  return { works, isLoading }
}
