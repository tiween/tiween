"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { PrivateStrapiClient, PublicStrapiClient } from "@/lib/strapi-api"

/**
 * User profile data from Strapi
 */
export interface UserProfile {
  id: number
  documentId: string
  username: string
  email: string
  provider?: string
  confirmed: boolean
  blocked: boolean
  preferredLanguage?: "ar" | "fr" | "en"
  /** Global schedule-change email preference (Story 5.6); defaults to true. */
  emailNotificationsEnabled?: boolean
  defaultRegion?: string
  avatar?: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  }
  createdAt: string
  updatedAt: string
}

/**
 * Profile update payload
 */
export interface UpdateProfileData {
  username?: string
  preferredLanguage?: "ar" | "fr" | "en"
  /** Global schedule-change email preference (Story 5.6). */
  emailNotificationsEnabled?: boolean
  defaultRegion?: string
  /** Uploaded avatar file id (from POST /upload), linked self-scoped by the API. */
  avatar?: number
}

/** A single entry of Strapi's `POST /upload` response array. */
interface UploadedFile {
  id: number
  url: string
}

/**
 * Normalize the `defaultRegion` preference to its Strapi `documentId` string.
 *
 * `defaultRegion` is a `manyToOne` relation, so a populated `/users/me` response
 * surfaces it as a region object. The profile region select and the events
 * `region` URL param both key off the region `documentId`, so this flattens the
 * relation (or an already-flattened string) to that id, or `undefined` when it
 * is unset. It never leaks the raw relation object into `UserProfile`.
 */
export function extractRegionDocumentId(
  defaultRegion: unknown
): string | undefined {
  if (typeof defaultRegion === "string") return defaultRegion || undefined
  if (defaultRegion && typeof defaultRegion === "object") {
    const id = (defaultRegion as { documentId?: unknown }).documentId
    return typeof id === "string" ? id : undefined
  }
  return undefined
}

/**
 * Hook for fetching current user profile
 */
export function useCurrentUser(enabled: boolean = true) {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const response = await PrivateStrapiClient.fetchAPI(
        "/users/me",
        { populate: ["avatar", "defaultRegion"] },
        { method: "GET" },
        { useProxy: true }
      )
      return {
        ...(response as UserProfile),
        // Flatten the populated region relation to its `documentId` (or
        // `undefined`) so `UserProfile.defaultRegion` stays a plain string.
        defaultRegion: extractRegionDocumentId(
          (response as { defaultRegion?: unknown }).defaultRegion
        ),
      } as UserProfile
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })
}

export function useUserMutations() {
  const queryClient = useQueryClient()

  const registerMutation = useMutation({
    mutationFn: (values: {
      username: string
      email: string
      password: string
      firstName: string
      locale: string
    }) =>
      PrivateStrapiClient.fetchAPI(
        `/auth/local/register`,
        undefined,
        {
          body: JSON.stringify(values),
          method: "POST",
        },
        { omitUserAuthorization: true, useProxy: true }
      ),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (values: {
      currentPassword: string
      password: string
      passwordConfirmation: string
    }) => {
      return PrivateStrapiClient.fetchAPI(
        `/auth/change-password`,
        undefined,
        {
          body: JSON.stringify(values),
          method: "POST",
        },
        { useProxy: true }
      )
    },
  })

  const forgotPasswordMutation = useMutation({
    mutationFn: (values: { email: string }) => {
      return PrivateStrapiClient.fetchAPI(
        `/auth/forgot-password`,
        undefined,
        {
          body: JSON.stringify(values),
          method: "POST",
        },
        { omitUserAuthorization: true, useProxy: true }
      )
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (values: {
      password: string
      passwordConfirmation: string
      code: string
    }) => {
      return PublicStrapiClient.fetchAPI(
        `/auth/reset-password`,
        undefined,
        {
          body: JSON.stringify(values),
          method: "POST",
        },
        { useProxy: true }
      )
    },
  })

  /**
   * Update the current user's profile.
   *
   * Uses the self-scoped `PUT /api/users/me` endpoint (never `PUT /users/:id`):
   * the backend writes only the authenticated user's record and only the
   * whitelisted fields. `avatar` is the id returned by `uploadAvatarMutation`.
   */
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await PrivateStrapiClient.fetchAPI(
        `/users/me`,
        undefined,
        {
          body: JSON.stringify(data),
          method: "PUT",
        },
        { useProxy: true }
      )
      return response as UserProfile
    },
    onSuccess: () => {
      // Invalidate user query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["user", "me"] })
    },
  })

  /**
   * Upload an avatar image FILE ONLY (no `ref`/`refId`/`field`).
   *
   * Linking to the user is done separately by passing the returned file id into
   * `updateProfileMutation` (self-scoped), so a user can never attach media to
   * another user's entry. Returns the uploaded file id.
   */
  const uploadAvatarMutation = useMutation({
    mutationFn: async ({ file }: { file: File }): Promise<number> => {
      const formData = new FormData()
      formData.append("files", file)

      const response = await fetch("/api/private-proxy/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload avatar")
      }

      // Strapi's upload endpoint returns an array of uploaded files.
      const uploaded = (await response.json()) as UploadedFile[]
      const fileId = uploaded?.[0]?.id
      if (fileId == null) {
        throw new Error("Failed to upload avatar")
      }
      return fileId
    },
  })

  /**
   * Request a verified email change (Story 4.4).
   *
   * Stages a `pendingEmail` + single-use token server-side and emails the NEW
   * address a confirmation link. The live email is unchanged until confirmed.
   */
  const requestEmailChangeMutation = useMutation({
    mutationFn: (values: { email: string }) => {
      return PrivateStrapiClient.fetchAPI(
        `/auth/change-email`,
        undefined,
        {
          body: JSON.stringify(values),
          method: "POST",
        },
        { useProxy: true }
      )
    },
  })

  /**
   * Confirm a staged email change from the emailed link (public endpoint).
   */
  const confirmEmailChangeMutation = useMutation({
    mutationFn: (values: { code: string }) => {
      return PublicStrapiClient.fetchAPI(
        `/auth/confirm-email-change`,
        undefined,
        {
          body: JSON.stringify(values),
          method: "POST",
        },
        { useProxy: true }
      )
    },
  })

  return {
    registerMutation,
    changePasswordMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
    updateProfileMutation,
    uploadAvatarMutation,
    requestEmailChangeMutation,
    confirmEmailChangeMutation,
  }
}
