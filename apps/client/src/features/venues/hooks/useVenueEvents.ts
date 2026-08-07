"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"

import type {
  CreativeWorkSearchEntry,
  ManagerEventDetail,
  VenueEventCreatePayload,
  VenueEventListEntry,
  VenueWorkCreatePayload,
} from "@/features/venues/schemas/venue-events"

import { PrivateStrapiClient } from "@/lib/strapi-api"

/**
 * Venue-manager event data layer (Story 7.3).
 *
 * Every read and write goes through `PrivateStrapiClient` with
 * `{ useProxy: true }` — `/api/private-proxy` attaches the users-permissions
 * JWT server-side and refuses any path missing from `isStrapiEndpointAllowed`.
 *
 * QUERY KEYS ARE USER-SCOPED (`["venue-events", userId, …]`) — never a bare
 * singleton: on a shared device the cache survives a sign-out/sign-in pair,
 * so a bare key would hand the next manager the previous one's events. Same
 * rule as the venue-profile and watchlist keys.
 */

/** Where the venue-events endpoints live behind the Strapi api prefix. */
const VENUE_EVENTS_PATH = "/events-manager/venue/events"
const WORK_SEARCH_PATH = "/events-manager/venue/creative-works/search"
const WORK_CREATE_PATH = "/events-manager/venue/creative-works"

/** A signed-out render has no id; it must not collide with a real user's key. */
const ANONYMOUS_SCOPE = "anonymous"

type UserScope = number | string

export const venueEventKeys = {
  all: ["venue-events"] as const,
  /** The manager's own event list. USER-SCOPED — see the module docstring. */
  list: (userId: UserScope | undefined) =>
    ["venue-events", userId ?? ANONYMOUS_SCOPE, "list"] as const,
  /** One event's draft-preview read. */
  detail: (userId: UserScope | undefined, documentId: string) =>
    ["venue-events", userId ?? ANONYMOUS_SCOPE, "detail", documentId] as const,
  /** A creative-work search page, per user and term. */
  workSearch: (userId: UserScope | undefined, query: string) =>
    ["venue-events", userId ?? ANONYMOUS_SCOPE, "work-search", query] as const,
}

/** A single entry of Strapi's `POST /upload` response array. */
interface UploadedFile {
  id: number
  url: string
}

/** Fetch the caller's own events (`GET /venue/events`). */
export function useMyEvents() {
  const { data: session, status } = useSession()
  const userId = session?.user?.userId

  return useQuery({
    queryKey: venueEventKeys.list(userId),
    queryFn: async (): Promise<VenueEventListEntry[]> => {
      const response = await PrivateStrapiClient.fetchAPI(
        VENUE_EVENTS_PATH,
        undefined,
        { method: "GET" },
        { useProxy: true }
      )
      const data = (response as { data?: unknown }).data
      return Array.isArray(data) ? (data as VenueEventListEntry[]) : []
    },
    enabled: status === "authenticated" && userId != null,
    // A 403 (not a manager) / 404 (no venue) is a terminal answer.
    retry: false,
    staleTime: 30 * 1000,
  })
}

/** Fetch one of the caller's events (`GET /venue/events/:documentId`). */
export function useMyEvent(documentId: string) {
  const { data: session, status } = useSession()
  const userId = session?.user?.userId

  return useQuery({
    queryKey: venueEventKeys.detail(userId, documentId),
    queryFn: async (): Promise<ManagerEventDetail | null> => {
      const response = await PrivateStrapiClient.fetchAPI(
        `${VENUE_EVENTS_PATH}/${documentId}`,
        undefined,
        { method: "GET" },
        { useProxy: true }
      )
      return (response as { data?: ManagerEventDetail }).data ?? null
    },
    enabled:
      status === "authenticated" && userId != null && documentId.length > 0,
    retry: false,
    staleTime: 30 * 1000,
  })
}

/** Minimum characters before the catalog search fires. */
export const WORK_SEARCH_MIN_CHARS = 2

/** Debounce window for the catalog search input. */
const WORK_SEARCH_DEBOUNCE_MS = 300

/**
 * Debounced catalog search (`GET /venue/creative-works/search?query=…`),
 * enabled from {@link WORK_SEARCH_MIN_CHARS} characters.
 */
export function useCreativeWorkSearch(query: string) {
  const { data: session, status } = useSession()
  const userId = session?.user?.userId

  const trimmed = query.trim()
  const [debounced, setDebounced] = React.useState(trimmed)

  React.useEffect(() => {
    const handle = setTimeout(
      () => setDebounced(trimmed),
      WORK_SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(handle)
  }, [trimmed])

  return useQuery({
    queryKey: venueEventKeys.workSearch(userId, debounced),
    queryFn: async (): Promise<CreativeWorkSearchEntry[]> => {
      const response = await PrivateStrapiClient.fetchAPI(
        WORK_SEARCH_PATH,
        { query: debounced },
        { method: "GET" },
        { useProxy: true }
      )
      const data = (response as { data?: unknown }).data
      return Array.isArray(data) ? (data as CreativeWorkSearchEntry[]) : []
    },
    enabled:
      status === "authenticated" &&
      userId != null &&
      debounced.length >= WORK_SEARCH_MIN_CHARS,
    retry: false,
    staleTime: 60 * 1000,
  })
}

export function useVenueEventMutations() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user?.userId

  /** `POST /venue/events` — the venue is resolved server-side from the JWT. */
  const createEventMutation = useMutation({
    mutationFn: async (
      payload: VenueEventCreatePayload
    ): Promise<ManagerEventDetail | null> => {
      const response = await PrivateStrapiClient.fetchAPI(
        VENUE_EVENTS_PATH,
        undefined,
        { body: JSON.stringify(payload), method: "POST" },
        { useProxy: true }
      )
      return (response as { data?: ManagerEventDetail }).data ?? null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueEventKeys.list(userId) })
    },
  })

  /** `POST /venue/creative-works` — a minimal published catalog entry. */
  const createWorkMutation = useMutation({
    mutationFn: async (
      payload: VenueWorkCreatePayload
    ): Promise<CreativeWorkSearchEntry | null> => {
      const response = await PrivateStrapiClient.fetchAPI(
        WORK_CREATE_PATH,
        undefined,
        { body: JSON.stringify(payload), method: "POST" },
        { useProxy: true }
      )
      return (response as { data?: CreativeWorkSearchEntry }).data ?? null
    },
    onSuccess: () => {
      // Every cached search term is now stale: the work the manager just
      // created must be findable if they clear the picker and search again.
      queryClient.invalidateQueries({
        queryKey: [...venueEventKeys.all, userId ?? ANONYMOUS_SCOPE],
        predicate: (query) => query.queryKey[2] === "work-search",
      })
    },
  })

  /** `POST /venue/events/:documentId/publish` — the explicit publish. */
  const publishEventMutation = useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const response = await PrivateStrapiClient.fetchAPI(
        `${VENUE_EVENTS_PATH}/${documentId}/publish`,
        undefined,
        { method: "POST" },
        { useProxy: true }
      )
      return (response as { data?: { documentId: string } }).data ?? null
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: venueEventKeys.list(userId) })
      queryClient.invalidateQueries({
        queryKey: venueEventKeys.detail(userId, variables.documentId),
      })
    },
  })

  /**
   * Upload one image FILE ONLY (no `ref`/`refId`/`field`) and return its id.
   * Linking happens through the tenant-scoped event create, so a manager can
   * never attach media to somebody else's event by crafting an upload. Same
   * shape as the venue-profile upload.
   */
  const uploadImageMutation = useMutation({
    mutationFn: async ({ file }: { file: File }): Promise<number> => {
      const formData = new FormData()
      formData.append("files", file)

      const response = await fetch("/api/private-proxy/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("UPLOAD_FAILED")
      }

      const uploaded = (await response.json()) as UploadedFile[]
      const fileId = uploaded?.[0]?.id
      if (fileId == null) {
        throw new Error("UPLOAD_FAILED")
      }
      return fileId
    },
  })

  return {
    createEventMutation,
    createWorkMutation,
    publishEventMutation,
    uploadImageMutation,
  }
}
