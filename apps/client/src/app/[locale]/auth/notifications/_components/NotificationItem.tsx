"use client"

import { useLocale, useTranslations } from "next-intl"

import type { ScheduleNotification } from "@/features/notifications/hooks/useNotifications"

import { formatDate, formatRelativeTime, formatTime } from "@/lib/dates"
import { cn } from "@/lib/utils"

export interface NotificationItemProps {
  notification: ScheduleNotification
}

/**
 * NotificationItem — presentational render of one schedule-change notification
 * (Story 5.6).
 *
 * Shows the localized change-type headline, the old→new time (or a cancellation
 * announcement), a `formatRelativeTime` "X ago" stamp, and an unread dot when
 * the row is not yet read. Dates use `lib/dates.ts` (already Western-numeral for
 * Arabic). Fully self-contained from the denormalized row — no join.
 */
export function NotificationItem({ notification }: NotificationItemProps) {
  const t = useTranslations("notifications")
  const locale = useLocale()

  const { changeType, oldDateTime, newDateTime, eventTitle, read, createdAt } =
    notification

  const headline = t(`changeType.${changeType}`, { title: eventTitle })

  // Guard against an unparseable datetime so the row never renders a literal
  // "Invalid Date" (consistent with `lib/dates.ts`, which returns "" for absent
  // values but would echo dayjs's "Invalid Date" for a malformed one).
  const isValidDateTime = (value: string | null): value is string =>
    !!value && !Number.isNaN(new Date(value).getTime())

  const oldLabel = isValidDateTime(oldDateTime)
    ? `${formatDate(oldDateTime, locale)} ${formatTime(oldDateTime)}`
    : null
  const newLabel = isValidDateTime(newDateTime)
    ? `${formatDate(newDateTime, locale)} ${formatTime(newDateTime)}`
    : null

  // A non-cancelled change only has a real "new time" when it is valid AND
  // distinct from the old one. Otherwise we show a "to be confirmed" line rather
  // than a lone struck-through old time (which reads as a removal).
  const hasDistinctNewTime = !!newLabel && newDateTime !== oldDateTime

  return (
    <article
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        read ? "bg-background" : "bg-muted/40"
      )}
    >
      {/* Unread dot */}
      <span
        className={cn(
          "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
          read ? "bg-transparent" : "bg-primary"
        )}
        aria-label={read ? undefined : t("unread")}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-foreground text-sm font-medium">{headline}</p>

        {changeType === "cancelled" ? (
          <p className="text-muted-foreground text-sm">
            {oldLabel ? t("wasScheduledFor", { time: oldLabel }) : null}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            {oldLabel && (
              <span className="line-through">{oldLabel}</span>
            )}
            {hasDistinctNewTime ? (
              <>
                {oldLabel ? <span aria-hidden="true"> → </span> : null}
                <span className="text-foreground">{newLabel}</span>
              </>
            ) : (
              <>
                {oldLabel ? <span> </span> : null}
                <span className="text-foreground">
                  {t("newTimeToBeConfirmed")}
                </span>
              </>
            )}
          </p>
        )}

        <p className="text-muted-foreground text-xs">
          {formatRelativeTime(createdAt, locale)}
        </p>
      </div>
    </article>
  )
}

NotificationItem.displayName = "NotificationItem"
