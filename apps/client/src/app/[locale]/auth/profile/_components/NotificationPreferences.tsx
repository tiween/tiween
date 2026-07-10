"use client"

import { Bell } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { useCurrentUser, useUserMutations } from "@/hooks/useUser"

/**
 * NotificationPreferences — the email-notifications toggle on the profile
 * (settings) page (Story 5.6).
 *
 * Reads the current `emailNotificationsEnabled` preference (default `true` when
 * unset) from {@link useCurrentUser} and persists a flip through the self-scoped
 * `PUT /users/me` path (`updateProfileMutation`), which invalidates
 * `["user","me"]`. In-app notifications are governed separately by the per-item
 * watchlist `notifyChanges`; this flag governs only email delivery.
 *
 * The toggle is a self-contained accessible switch (`role="switch"` +
 * `aria-checked`); RTL is automatic. All copy resolves from the `profile`
 * namespace.
 */
export function NotificationPreferences() {
  const t = useTranslations("profile")
  const { data: user, isLoading } = useCurrentUser()
  const { updateProfileMutation } = useUserMutations()

  // Default ON when the preference is unset (matches the backend default).
  const enabled = user?.emailNotificationsEnabled !== false

  // Disable the switch until the profile has loaded — a click before `user` is
  // known would write based on the assumed default rather than the stored value.
  const isDisabled = updateProfileMutation.isPending || isLoading || !user

  const handleToggle = () => {
    if (isDisabled) return
    updateProfileMutation.mutate({ emailNotificationsEnabled: !enabled })
  }

  return (
    <section className="space-y-3" aria-label={t("notifications.title")}>
      <div className="flex items-center gap-2">
        <Bell className="text-muted-foreground h-4 w-4" />
        <h2 className="text-foreground text-sm font-semibold">
          {t("notifications.title")}
        </h2>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-foreground text-sm font-medium">
            {t("notifications.emailLabel")}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("notifications.emailDescription")}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t("notifications.emailLabel")}
          disabled={isDisabled}
          onClick={handleToggle}
          className={cn(
            "focus-visible:ring-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            enabled ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "bg-background inline-block h-5 w-5 transform rounded-full shadow-sm transition-transform",
              enabled
                ? "ltr:translate-x-5 rtl:-translate-x-5"
                : "ltr:translate-x-0.5 rtl:-translate-x-0.5"
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </section>
  )
}

NotificationPreferences.displayName = "NotificationPreferences"
