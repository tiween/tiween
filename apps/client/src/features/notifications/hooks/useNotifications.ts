"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"

import { PrivateStrapiClient } from "@/lib/strapi-api"

/**
 * Schedule-change notification snapshot from Strapi (Story 5.6). Self-contained
 * — every field the UI renders is denormalized on the row, so no join is needed.
 */
export interface ScheduleNotification {
  id: number
  documentId: string
  changeType: "showtime_changed" | "cancelled" | "postponed" | "rescheduled"
  oldDateTime: string | null
  newDateTime: string | null
  eventTitle: string
  eventDocumentId: string
  creativeWorkDocumentId: string | null
  read: boolean
  createdAt: string
}

/**
 * Unread-count poll cadence (Story 5.6). Schedule changes are far rarer than
 * watchlist edits (5.5's 5s), so the badge polls on a slower 60s cadence while
 * online; react-query pauses it in a hidden tab and offline.
 */
export const NOTIFICATION_POLL_MS = 60000

/**
 * Pure, unit-testable poll gate: poll every {@link NOTIFICATION_POLL_MS} ms when
 * online, `false` (no polling) when offline. Mirrors 5.5's
 * `watchlistRefetchInterval`.
 */
export function notificationRefetchInterval(online: boolean): number | false {
  return online ? NOTIFICATION_POLL_MS : false
}

/**
 * Query key factory for notification queries (mirrors `watchlistKeys`).
 */
export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
}

/**
 * Fetch the caller's schedule-change notifications, newest-first.
 */
export function useNotifications() {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const response = await PrivateStrapiClient.fetchAPI(
        "/user-engagement/notifications",
        undefined,
        { method: "GET" },
        { useProxy: true }
      )
      return (response.data || []) as ScheduleNotification[]
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  })
}

/**
 * Polled unread-notification count for the Account-tab badge (Story 5.6).
 * Gated on auth and online; paused in hidden tabs; refetches on reconnect.
 */
export function useUnreadNotificationCount() {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await PrivateStrapiClient.fetchAPI(
        "/user-engagement/notifications/unread-count",
        undefined,
        { method: "GET" },
        { useProxy: true }
      )
      return (response as { count: number }).count ?? 0
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    // Poll every 60s while online so the badge stays fresh; paused in hidden
    // tabs and offline, complemented by react-query's refetch-on-reconnect.
    refetchInterval: () =>
      notificationRefetchInterval(
        typeof navigator !== "undefined" ? navigator.onLine : true
      ),
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
  })
}

/**
 * Mark all the caller's notifications read (fired when the notifications page
 * opens). Invalidates both the list and the unread-count so the badge clears.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await PrivateStrapiClient.fetchAPI(
        "/user-engagement/notifications/read-all",
        undefined,
        { method: "PUT" },
        { useProxy: true }
      )
      return response as { updated: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      })
    },
  })
}
