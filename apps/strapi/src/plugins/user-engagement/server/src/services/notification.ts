import type { Core } from "@strapi/strapi"
import type { ScheduleChangeType, SupportedLocale } from "./notification-emails"

import { buildScheduleChangeEmail } from "./notification-emails"

const PLUGIN_ID = "user-engagement"
const WATCHLIST_UID = `plugin::${PLUGIN_ID}.user-watchlist`
const NOTIFICATION_UID = `plugin::${PLUGIN_ID}.schedule-notification`

/**
 * Pure derivation of the notifiable schedule change (Story 5.6) — the tested
 * core of change detection.
 *
 * Mapping (order matters):
 *  - status transition INTO `cancelled` ⇒ `cancelled` (newDateTime null)
 *  - status transition INTO `postponed` / `rescheduled` ⇒ that type
 *  - status unchanged but `startDateTime` changed (both present, not equal)
 *    ⇒ `showtime_changed`
 *  - otherwise ⇒ `null` (no notification — a no-op / irrelevant edit)
 */
export function deriveScheduleChange({
  oldStartDateTime,
  newStartDateTime,
  oldStatus,
  newStatus,
}: {
  oldStartDateTime?: string | null
  newStartDateTime?: string | null
  oldStatus?: string | null
  newStatus?: string | null
}): {
  changeType: ScheduleChangeType
  oldDateTime: string | null
  newDateTime: string | null
} | null {
  if (newStatus !== oldStatus && newStatus === "cancelled") {
    return {
      changeType: "cancelled",
      oldDateTime: oldStartDateTime ?? null,
      newDateTime: null,
    }
  }
  if (
    newStatus !== oldStatus &&
    (newStatus === "postponed" || newStatus === "rescheduled")
  ) {
    return {
      changeType: newStatus,
      oldDateTime: oldStartDateTime ?? null,
      newDateTime: newStartDateTime ?? null,
    }
  }
  // Any change OUT of a cancelled event that is not itself a transition into
  // postponed/rescheduled (handled above) must NOT emit a "showtime changed"
  // notification — editing the time of a still-cancelled event (the event is
  // off) and reinstatement (cancelled→scheduled) are both intentionally out of
  // scope. Guard before the showtime_changed fallthrough so a reinstatement
  // that also moves the time does not leak a spurious `showtime_changed`.
  if (oldStatus === "cancelled") {
    return null
  }
  if (
    oldStartDateTime &&
    newStartDateTime &&
    oldStartDateTime !== newStartDateTime
  ) {
    return {
      changeType: "showtime_changed",
      oldDateTime: oldStartDateTime,
      newDateTime: newStartDateTime,
    }
  }
  return null
}

/** Normalize a locale-ish value to a supported email locale. Falls back to "fr". */
function normalizeLocale(value: unknown): SupportedLocale {
  if (value == null) return "fr"
  const base = String(value).toLowerCase().split("-")[0]
  return base === "ar" || base === "en" ? base : "fr"
}

export interface NotifyScheduleChangePayload {
  eventDocumentId: string
  eventTitle: string
  category?: string
  creativeWorkDocumentIds: string[]
  oldStartDateTime?: string | null
  newStartDateTime?: string | null
  oldStatus?: string | null
  newStatus?: string | null
}

const notificationService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Per-watcher, deduped, preference-gated fan-out (Story 5.6).
   *
   * Finds `user-watchlist` rows whose `creativeWork.documentId` is in
   * `creativeWorkDocumentIds` AND `notifyChanges === true`, dedupes by user (a
   * user watching several works for one event gets ONE notification), creates a
   * self-contained `schedule-notification` row per user, and sends a localized
   * Brevo email ONLY when that user's `emailNotificationsEnabled !== false`. An
   * email throw is caught and logged — it never blocks the other watchers.
   */
  async notifyScheduleChange(
    payload: NotifyScheduleChangePayload
  ): Promise<{ created: number }> {
    const change = deriveScheduleChange({
      oldStartDateTime: payload.oldStartDateTime,
      newStartDateTime: payload.newStartDateTime,
      oldStatus: payload.oldStatus,
      newStatus: payload.newStatus,
    })

    if (!change || payload.creativeWorkDocumentIds.length === 0) {
      return { created: 0 }
    }

    const watchers = await strapi.documents(WATCHLIST_UID).findMany({
      filters: {
        creativeWork: {
          documentId: { $in: payload.creativeWorkDocumentIds },
        },
        notifyChanges: true,
      } as any,
      populate: ["user", "creativeWork"],
      // Unbounded page so a popular work's watchers are NOT silently capped by
      // the default page size (config `defaultLimit: 25`): mirrors `listForUser`
      // / `markAllRead`. Without this, the 26th+ opted-in watcher would get
      // neither an in-app notification nor an email.
      pagination: { limit: -1 },
    })

    // Dedupe by user documentId — a user watching several works on the same
    // event gets exactly ONE notification. Keep the first matched work id.
    const byUser = new Map<
      string,
      { user: any; creativeWorkDocumentId: string | null }
    >()
    for (const row of watchers as any[]) {
      const user = row.user
      const userId = user?.documentId
      if (!userId || byUser.has(userId)) continue
      byUser.set(userId, {
        user,
        creativeWorkDocumentId: row.creativeWork?.documentId ?? null,
      })
    }

    let created = 0
    for (const [userId, { user, creativeWorkDocumentId }] of byUser) {
      // Each watcher's create + email is isolated: one failure is logged and
      // the loop continues so the remaining watchers still get notified. `created`
      // is only incremented on a successful create.
      try {
        // Best-effort idempotency (mirrors the watchlist dedup): the `event` is
        // draftAndPublish + i18n-localized, so a single logical publish can fire
        // `afterUpdate` several times (per-locale / draft→published row writes).
        // Skip creating a duplicate (and re-emailing) when an equivalent
        // notification already exists for this user — same event, changeType, and
        // old/new time. A tight concurrent race is acceptable (no DB constraint).
        const existing = await strapi.documents(NOTIFICATION_UID).findMany({
          filters: {
            user: { documentId: userId },
            eventDocumentId: payload.eventDocumentId,
            changeType: change.changeType,
            oldDateTime: change.oldDateTime,
            newDateTime: change.newDateTime,
          } as any,
          pagination: { limit: 1 },
        })
        if (Array.isArray(existing) && existing.length > 0) {
          continue
        }

        await strapi.documents(NOTIFICATION_UID).create({
          data: {
            user: userId,
            changeType: change.changeType,
            oldDateTime: change.oldDateTime,
            newDateTime: change.newDateTime,
            eventTitle: payload.eventTitle,
            eventDocumentId: payload.eventDocumentId,
            creativeWorkDocumentId,
            read: false,
          } as any,
        })
        created += 1

        // Email is additionally gated on the global `emailNotificationsEnabled`
        // preference (default true → only a stored `false` opts out).
        if (user.emailNotificationsEnabled !== false && user.email) {
          try {
            const locale = normalizeLocale(user.preferredLanguage)
            const { subject, html } = buildScheduleChangeEmail(locale, {
              eventTitle: payload.eventTitle,
              changeType: change.changeType,
              oldDateTime: change.oldDateTime,
              newDateTime: change.newDateTime,
            })
            await strapi.plugins["email"].services.email.send({
              to: user.email,
              subject,
              html,
            })
          } catch (err) {
            strapi.log.error(
              `[schedule-notification] email send failed for user ${userId}: ${err}`
            )
          }
        }
      } catch (err) {
        strapi.log.error(
          `[schedule-notification] notification create failed for user ${userId}: ${err}`
        )
      }
    }

    return { created }
  },

  /**
   * List the caller's notifications, newest-first. Self-scoped by user
   * documentId (the controller passes `ctx.state.user.documentId`).
   *
   * Fetches with an explicit unbounded page (`limit: -1`) so the list is NOT
   * silently capped by the default page size: `unreadCount` (via `count`) and
   * `markAllRead` (`limit: -1`) already cover every unread row, so a capped
   * list would let "mark all read" clear rows the user could never see.
   */
  async listForUser(userId: string) {
    return strapi.documents(NOTIFICATION_UID).findMany({
      filters: { user: { documentId: userId } } as any,
      sort: { createdAt: "desc" },
      pagination: { limit: -1 },
    })
  },

  /**
   * Count the caller's unread notifications. Uses the Document Service `count`
   * so the badge is NEVER silently capped by the default page size (a
   * `findMany().length` would undercount once a user passes one page of unread
   * rows).
   */
  async unreadCount(userId: string): Promise<number> {
    return strapi.documents(NOTIFICATION_UID).count({
      filters: { user: { documentId: userId }, read: false } as any,
    })
  },

  /**
   * Mark all the caller's unread notifications read. Returns the number updated.
   * Fetches ALL unread rows with an explicit unbounded page (`limit: -1`) — the
   * default page size would otherwise leave later unread rows untouched, so the
   * badge would never fully clear.
   */
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const rows = await strapi.documents(NOTIFICATION_UID).findMany({
      filters: { user: { documentId: userId }, read: false } as any,
      pagination: { limit: -1 },
    })

    // Each update is isolated (mirrors the fan-out): a single row's failure is
    // logged and the loop continues so the remaining rows are still marked read
    // and the request never 500s — otherwise one bad row would leave the badge
    // stuck and the rest of the user's notifications unread.
    let updated = 0
    for (const row of rows as any[]) {
      try {
        await strapi.documents(NOTIFICATION_UID).update({
          documentId: row.documentId,
          data: { read: true } as any,
        })
        updated += 1
      } catch (err) {
        strapi.log.error(
          `[schedule-notification] mark-read failed for ${row.documentId}: ${err}`
        )
      }
    }

    return { updated }
  },
})

export default notificationService
