/**
 * Testable core of the `event` schedule-change lifecycle (Story 5.6).
 *
 * The DB lifecycle subscriber in `bootstrap.ts` is boot-level glue (snapshot →
 * re-fetch → delegate); this module holds the part with actual decisions so it
 * can be unit-tested without booting Strapi: the draft-guard, the id resolution,
 * and the cross-plugin delegation to `user-engagement`'s
 * `notification.notifyScheduleChange(...)`. Everything is wrapped in try/catch so
 * a notification/email failure NEVER propagates out of the event save.
 */
import type { Core } from "@strapi/strapi"

import { collectWatchedCreativeWorkIds } from "./lifecycle-utils"

/** Pre-update snapshot bridged from `beforeUpdate`. */
export interface EventScheduleSnapshot {
  startDateTime?: string
  eventStatus?: string
}

/**
 * Given the pre-update snapshot and the (re-fetched, populated) row, resolve the
 * watched creative-work ids and delegate to the user-engagement fan-out — but
 * ONLY for a published row (drafts must not notify; the `event` type is
 * draftAndPublish). Never throws.
 */
export async function handleEventScheduleUpdate({
  strapi,
  before,
  row,
}: {
  strapi: Core.Strapi
  before: EventScheduleSnapshot | undefined
  row: any
}): Promise<void> {
  try {
    if (!before || !row) return

    // Skip draft-only saves — the `event` content-type is draftAndPublish, so a
    // draft write (publishedAt null) must not notify watchers before publish.
    if (!row.publishedAt) return

    const ids = collectWatchedCreativeWorkIds(row)
    if (!ids.length) return

    await strapi
      .plugin("user-engagement")
      .service("notification")
      .notifyScheduleChange({
        eventDocumentId: row.documentId,
        eventTitle: row.title,
        category: row.category,
        creativeWorkDocumentIds: ids,
        oldStartDateTime: before.startDateTime,
        newStartDateTime: row.startDateTime,
        oldStatus: before.eventStatus,
        newStatus: row.eventStatus,
      })
  } catch (err) {
    strapi.log.error("[schedule-notification] fan-out failed", err)
  }
}
