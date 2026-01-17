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
  defaultRegion?: string
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
        { populate: ["avatar"] },
        { method: "GET" },
        { useProxy: true }
      )
      return response as UserProfile
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
   * Update user profile
   * Uses PUT /api/users/:id endpoint
   */
  const updateProfileMutation = useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: number
      data: UpdateProfileData
    }) => {
      const response = await PrivateStrapiClient.fetchAPI(
        `/users/${userId}`,
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
   * Upload avatar image
   * Uses POST /api/upload endpoint with user link
   */
  const uploadAvatarMutation = useMutation({
    mutationFn: async ({ userId, file }: { userId: number; file: File }) => {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("ref", "plugin::users-permissions.user")
      formData.append("refId", String(userId))
      formData.append("field", "avatar")

      const response = await fetch("/api/private-proxy/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload avatar")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] })
    },
  })

  return {
    registerMutation,
    changePasswordMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
    updateProfileMutation,
    uploadAvatarMutation,
  }
}
