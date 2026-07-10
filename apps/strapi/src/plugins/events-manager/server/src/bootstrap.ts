import type { Core } from "@strapi/strapi"

import { handleEventScheduleUpdate } from "./content-types/event/schedule-update-handler"

const EVENT_UID = "plugin::events-manager.event"

/**
 * Schedule-change detection (Story 5.6).
 *
 * An additive `event` DB lifecycle subscriber — NOT a business-logic edit. It
 * snapshots `startDateTime` + `eventStatus` before an update, compares after,
 * and on a notifiable delta resolves the affected creative-work ids and
 * delegates (cross-plugin, owner-emits) to `user-engagement`'s
 * `notification.notifyScheduleChange(...)`. Everything is try/catch'd so a
 * notification failure NEVER blocks or throws out of the event save (mirrors the
 * existing non-blocking email pattern).
 */
const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  // Snapshot of the pre-update time/status, keyed by row id, bridged from
  // `beforeUpdate` to `afterUpdate`.
  const prev = new Map<
    number,
    { startDateTime?: string; eventStatus?: string }
  >()

  strapi.db.lifecycles.subscribe({
    models: [EVENT_UID],
    async beforeUpdate(event: any) {
      try {
        const id = event.params?.where?.id
        if (id == null) return
        const cur = await strapi.db.query(EVENT_UID).findOne({
          where: { id },
          select: ["startDateTime", "eventStatus"],
        })
        if (cur) {
          prev.set(id, {
            startDateTime: cur.startDateTime,
            eventStatus: cur.eventStatus,
          })
        }
      } catch (err) {
        strapi.log.error(
          "[schedule-notification] beforeUpdate snapshot failed",
          err
        )
      }
    },
    async afterUpdate(event: any) {
      const id = event.params?.where?.id
      // Read + clear the snapshot unconditionally so the Map never leaks an
      // entry, whatever branch below early-returns on.
      const before = id != null ? prev.get(id) : undefined
      if (id != null) prev.delete(id)
      if (!before || id == null) return
      try {
        const row = await strapi.db.query(EVENT_UID).findOne({
          where: { id },
          populate: {
            screenings: { populate: { movie: true } },
            performances: { populate: { play: true } },
          },
        })
        if (!row) return
        // Delegate the decisions (draft-guard, id resolution, fan-out) to the
        // testable, self-catching handler.
        await handleEventScheduleUpdate({ strapi, before, row })
      } catch (err) {
        strapi.log.error("[schedule-notification] afterUpdate failed", err)
      }
    },
  })

  strapi.log.info("Events Manager plugin bootstrapped")
}

export default bootstrap
