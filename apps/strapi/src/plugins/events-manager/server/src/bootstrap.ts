import type { Core } from "@strapi/strapi"
import type { Knex } from "knex"

import { handleEventScheduleUpdate } from "./content-types/event/schedule-update-handler"

const EVENT_UID = "plugin::events-manager.event"

const INVENTORY_TABLES = ["screenings", "performances"] as const

/**
 * Ensure the ticket-oversell backstop exists: a Postgres CHECK
 * (tickets_sold <= tickets_available) on both ticketed sub-event tables. This
 * is the "final RDBMS enforcer" for DW-3/DW-8 — the app-level atomic increment
 * in adjustInventory prevents oversell, and this constraint rejects any other
 * write path that would break the invariant.
 *
 * Runs in bootstrap (after db.schema.sync creates the tables) rather than a
 * database migration, because Strapi runs database/migrations BEFORE table
 * creation. Idempotent, Postgres-only, and NOT VALID so a database already
 * holding legacy oversold rows is not blocked (the constraint still enforces
 * every new insert/update).
 */
async function ensureInventoryCheckConstraint(
  strapi: Core.Strapi
): Promise<void> {
  const knex = strapi.db.connection as Knex
  const isPostgres =
    knex.client?.dialect === "postgresql" ||
    knex.client?.config?.client === "postgres"
  if (!isPostgres) return
  for (const table of INVENTORY_TABLES) {
    try {
      if (!(await knex.schema.hasTable(table))) continue
      const constraint = `chk_${table}_sold_lte_available`
      // Idempotent AND race-safe: swallow `duplicate_object` so concurrent
      // boots (rolling deploys / multiple instances) both succeed, without a
      // TOCTOU `pg_constraint` probe (which is also not schema-qualified). The
      // constraint name is a compile-time constant — no interpolation risk.
      // NOT VALID enforces every new insert/update while skipping the initial
      // full-table scan.
      await knex.raw(
        `DO $$
         BEGIN
           ALTER TABLE "${table}"
             ADD CONSTRAINT "${constraint}"
             CHECK (tickets_sold <= tickets_available) NOT VALID;
         EXCEPTION WHEN duplicate_object THEN NULL;
         END $$;`
      )
    } catch (err) {
      // Isolate per table: a failure adding the constraint on one table must
      // not prevent the other from being ensured on this boot.
      strapi.log.error(
        `[events-manager] failed to ensure CHECK constraint on ${table}`,
        err
      )
    }
  }
}

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
const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  // Install the RDBMS oversell backstop before serving traffic. Strapi awaits
  // plugin bootstrap, so awaiting here guarantees the CHECK constraint is
  // present before requests are handled; the try/catch keeps a DDL failure
  // non-fatal (the atomic increment already prevents oversell), so boot never
  // crashes on a constraint hiccup.
  try {
    await ensureInventoryCheckConstraint(strapi)
  } catch (err) {
    strapi.log.error(
      "[events-manager] failed to ensure ticket-inventory CHECK constraint",
      err
    )
  }

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
