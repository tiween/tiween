import { z } from "zod"

import type { Core } from "@strapi/strapi"

import { sanitizeTicketTiersResult } from "../utils/sanitize-public"

/**
 * Public read controller for a sub-event's ticket tiers (Story 6.1).
 *
 * Validates the `documentId` route param and the optional `kind` query with
 * Zod. On invalid input it returns `ctx.badRequest("INVALID_PARAMS")` — an
 * error CODE, never prose, never a 500. A missing sub-event maps to
 * `ctx.notFound("SUB_EVENT_NOT_FOUND")`. The success body is the Strapi v5
 * `{ data, meta }` shape set directly on `ctx.body` with no transformation.
 */

const PLUGIN_ID = "events-manager"

const paramsSchema = z.object({
  documentId: z.string().min(1).max(255),
})

const querySchema = z.object({
  kind: z.enum(["screening", "performance"]).optional(),
})

const ticketTiersController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /showtimes/:documentId/ticket-tiers — a sub-event's ticket tiers with
   * computed availability. Public (`auth: false`).
   */
  async findTicketTiers(ctx: any) {
    const parsedParams = paramsSchema.safeParse(ctx.params ?? {})
    const parsedQuery = querySchema.safeParse(ctx.query ?? {})

    if (!parsedParams.success || !parsedQuery.success) {
      return ctx.badRequest("INVALID_PARAMS")
    }

    const result = await strapi
      .plugin(PLUGIN_ID)
      .service("ticket-tiers")
      .findSubEventTicketTiers(
        parsedParams.data.documentId,
        parsedQuery.data.kind
      )

    if (!result) {
      return ctx.notFound("SUB_EVENT_NOT_FOUND")
    }

    ctx.body = { data: sanitizeTicketTiersResult(result), meta: {} }
  },
})

export default ticketTiersController
