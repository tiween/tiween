"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"

import type {
  ManagerVenue,
  PropertyCategoryEntry,
  VenueProfileUpdatePayload,
} from "@/features/venues/schemas/venue-profile"

import { PrivateStrapiClient } from "@/lib/strapi-api"

/**
 * Venue-manager profile data layer (Story 7.2).
 *
 * Every read and write goes through `PrivateStrapiClient` with
 * `{ useProxy: true }`, so the browser never sees the users-permissions JWT —
 * `/api/private-proxy` attaches it server-side and refuses any path missing
 * from `isStrapiEndpointAllowed`.
 *
 * QUERY KEYS ARE USER-SCOPED. `["venue-profile", userId]` — never a bare
 * `["venue-profile"]`: on a shared device the cache survives a sign-out/sign-in
 * pair, so a singleton key would hand the next manager the previous one's
 * venue. Same rule as the watchlist keys.
 */

/** Where the venue-profile endpoints live behind the Strapi api prefix. */
const VENUE_PROFILE_PATH = "/venues/venues/me"
const PROPERTY_DEFINITIONS_PATH = "/venues/venues/property-definitions"

/** A signed-out render has no id; it must not collide with a real user's key. */
const ANONYMOUS_SCOPE = "anonymous"

/** The locale union `AppLocalizedParams` accepts. */
type AppLocale = "ar" | "fr" | "en"

type UserScope = number | string

export const venueProfileKeys = {
  all: ["venue-profile"] as const,
  /** The manager's own venue. USER-SCOPED — see the module docstring. */
  detail: (userId: UserScope | undefined) =>
    ["venue-profile", userId ?? ANONYMOUS_SCOPE] as const,
  /** The amenity vocabulary, per user and locale. */
  propertyCatalog: (userId: UserScope | undefined, locale: string) =>
    [
      "venue-profile",
      userId ?? ANONYMOUS_SCOPE,
      "property-definitions",
      locale,
    ] as const,
}

/** A single entry of Strapi's `POST /upload` response array. */
interface UploadedFile {
  id: number
  url: string
}

/** Fetch the caller's own venue (`GET /venues/me`). */
export function useMyVenue() {
  const { data: session, status } = useSession()
  const userId = session?.user?.userId

  return useQuery({
    queryKey: venueProfileKeys.detail(userId),
    queryFn: async (): Promise<ManagerVenue | null> => {
      const response = await PrivateStrapiClient.fetchAPI(
        VENUE_PROFILE_PATH,
        undefined,
        { method: "GET" },
        { useProxy: true }
      )
      return (response as { data?: ManagerVenue }).data ?? null
    },
    enabled: status === "authenticated" && userId != null,
    // A 403 (not a venue manager) or 404 (no venue) is a terminal answer, not a
    // transient failure — retrying only delays the empty state.
    retry: false,
    staleTime: 60 * 1000,
  })
}

/** Fetch the amenity catalog (`GET /venues/property-definitions`). */
export function useVenuePropertyCatalog(locale: string, enabled = true) {
  const { data: session, status } = useSession()
  const userId = session?.user?.userId

  return useQuery({
    queryKey: venueProfileKeys.propertyCatalog(userId, locale),
    queryFn: async (): Promise<PropertyCategoryEntry[]> => {
      const response = await PrivateStrapiClient.fetchAPI(
        PROPERTY_DEFINITIONS_PATH,
        // `AppLocalizedParams` types `locale` as the app's locale union; the
        // caller has the active `useLocale()` string, which is that union at
        // runtime but `string` to the compiler.
        { locale: locale as AppLocale },
        { method: "GET" },
        { useProxy: true }
      )
      const data = (response as { data?: unknown }).data
      return Array.isArray(data) ? (data as PropertyCategoryEntry[]) : []
    },
    enabled: enabled && status === "authenticated" && userId != null,
    retry: false,
    // The seeded vocabulary changes about never; don't refetch it per mount.
    staleTime: 60 * 60 * 1000,
  })
}

export function useVenueProfileMutations() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user?.userId

  /**
   * `PUT /venues/me` with a PARTIAL body. The venue is resolved server-side
   * from the JWT, so there is no id to pass and none is accepted.
   */
  const updateVenueMutation = useMutation({
    mutationFn: async (
      payload: VenueProfileUpdatePayload
    ): Promise<ManagerVenue | null> => {
      const response = await PrivateStrapiClient.fetchAPI(
        VENUE_PROFILE_PATH,
        undefined,
        { body: JSON.stringify(payload), method: "PUT" },
        { useProxy: true }
      )
      return (response as { data?: ManagerVenue }).data ?? null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: venueProfileKeys.detail(userId),
      })
    },
  })

  /**
   * Upload one image FILE ONLY (no `ref`/`refId`/`field`) and return its id.
   *
   * Linking happens separately, through the self-scoped `PUT /venues/me`, so a
   * manager can never attach media to somebody else's venue by crafting an
   * upload. Same shape as the avatar upload in `useUser`.
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

  return { updateVenueMutation, uploadImageMutation }
}
