"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import {
  useMarkAllNotificationsRead,
  useNotifications,
} from "@/features/notifications/hooks/useNotifications"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"

import { NotificationItem } from "./_components/NotificationItem"

export interface NotificationsPageClientProps {
  locale: string
}

/**
 * NotificationsPageClient — the `/auth/notifications` list (Story 5.6).
 *
 * Renders all four async surfaces: a skeleton while loading, an inline error on
 * failure, an `EmptyState` (Bell + discovery CTA) when empty, and the newest-
 * first list on success. Marks all notifications read once on mount so the
 * Account-tab badge clears when the page is opened.
 */
export function NotificationsPageClient({
  locale,
}: NotificationsPageClientProps) {
  const t = useTranslations("notifications")
  const router = useRouter()
  const isRTL = locale === "ar"

  const { data: notifications, isLoading, isError } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()

  // Fire mark-all-read exactly once on mount so the badge clears on open — but
  // only when there is actually at least one unread notification, to avoid a
  // needless write every time the page opens. Waits for the list to load, then
  // resolves the fire-once guard whether or not it fired.
  const { mutate: markAll } = markAllRead
  const firedRef = React.useRef(false)
  React.useEffect(() => {
    if (firedRef.current) return
    if (!notifications) return
    firedRef.current = true
    const hasUnread = notifications.some((n) => !n.read)
    if (hasUnread) markAll()
  }, [notifications, markAll])

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label={t("back")}
          >
            <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
          </Button>
          <h1 className="text-foreground text-lg font-semibold">
            {t("title")}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 py-6">
        {isLoading ? (
          <NotificationsSkeleton />
        ) : isError ? (
          <p className="text-destructive py-8 text-center text-sm" role="alert">
            {t("error")}
          </p>
        ) : !notifications || notifications.length === 0 ? (
          <EmptyState
            variant="custom"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            illustration={
              <div className="bg-muted rounded-full p-4">
                <Bell
                  className="text-muted-foreground h-8 w-8"
                  aria-hidden="true"
                />
              </div>
            }
            primaryAction={{
              label: t("emptyAction"),
              onClick: () => router.push(`/${locale}`),
            }}
          />
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => (
              <li key={notification.documentId}>
                <NotificationItem notification={notification} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

/** Loading skeleton for the notifications list. */
function NotificationsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-lg border p-4">
          <div className="bg-muted mt-1.5 h-2 w-2 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-4 w-3/4 rounded" />
            <div className="bg-muted h-3 w-1/2 rounded" />
            <div className="bg-muted h-3 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

NotificationsPageClient.displayName = "NotificationsPageClient"
