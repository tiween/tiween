"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Key, LogOut } from "lucide-react"
import { useTranslations } from "next-intl"

import { signOutAndClearCache } from "@/lib/sign-out"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/useUser"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { NotificationPreferences } from "./_components/NotificationPreferences"
import { ProfileForm } from "./_components/ProfileForm"
import { WatchlistSyncStatus } from "./_components/WatchlistSyncStatus"

export interface ProfilePageClientProps {
  locale: string
  regions: Array<{ id: string; name: string }>
  user: {
    id: number
    email: string
    name: string
  }
}

/**
 * ProfilePageClient - Profile management page
 *
 * Renders the routed, wired {@link ProfileForm} (name, avatar, language,
 * region, and the verified email-change sub-form) plus the change-password and
 * sign-out actions. All copy is localized via the `profile.*` next-intl
 * namespace.
 */
export function ProfilePageClient({
  locale,
  regions,
  user,
}: ProfilePageClientProps) {
  const t = useTranslations("profile")
  const router = useRouter()
  const isRTL = locale === "ar"

  // Drive the loading skeleton; the form itself also reads this query.
  const { isLoading: isLoadingProfile } = useCurrentUser(true)

  const handleSignOut = () => {
    signOutAndClearCache({ callbackUrl: `/${locale}` })
  }

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
        {isLoadingProfile ? (
          <ProfileFormSkeleton />
        ) : (
          <>
            <ProfileForm locale={locale} regions={regions} user={user} />

            <Separator className="my-6" />

            {/* Watchlist sync status (Story 5.5) */}
            <WatchlistSyncStatus />

            <Separator className="my-6" />

            {/* Email-notifications preference (Story 5.6) */}
            <NotificationPreferences />

            <Separator className="my-6" />

            {/* Additional Actions */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => router.push(`/${locale}/auth/notifications`)}
              >
                <Bell className="h-4 w-4" />
                {t("notifications.viewAll")}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => router.push(`/${locale}/auth/change-password`)}
              >
                <Key className="h-4 w-4" />
                {t("changePassword")}
              </Button>

              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                {t("signOut")}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/**
 * Loading skeleton for profile form
 */
function ProfileFormSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Avatar skeleton */}
      <div className="flex justify-center">
        <div className="bg-muted h-24 w-24 rounded-full" />
      </div>

      {/* Name field */}
      <div className="space-y-2">
        <div className="bg-muted h-4 w-20 rounded" />
        <div className="bg-muted h-10 w-full rounded" />
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <div className="bg-muted h-4 w-16 rounded" />
        <div className="bg-muted h-10 w-full rounded" />
      </div>

      {/* Language field */}
      <div className="space-y-2">
        <div className="bg-muted h-4 w-16 rounded" />
        <div className="bg-muted h-10 w-full rounded" />
      </div>

      {/* Button */}
      <div className="bg-muted h-10 w-full rounded" />
    </div>
  )
}

ProfilePageClient.displayName = "ProfilePageClient"
