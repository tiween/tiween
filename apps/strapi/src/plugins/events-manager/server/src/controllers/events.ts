import { z } from "zod"

import type { Core } from "@strapi/strapi"

/**
 * Public read controllers for the events-manager plugin (Story 3.1a).
 *
 * All query input is validated with Zod. On validation failure we return a
 * `ctx.badRequest` with an error CODE (never prose, never a 500). Responses are
 * the Strapi v5 shape produced by the `events` service, set directly on
 * `ctx.body` with no transformation layer.
 */

const PLUGIN_ID = "events-manager"

const MAX_PAGE_SIZE = 100

/** ISO 8601 datetime string (e.g. `2026-07-05T00:00:00.000Z`). */
const isoDatetime = z.string().datetime({ offset: true })

/**
 * Allowlisted `sort` values. The raw value is forwarded to the Document Service,
 * which throws on an unknown field/relation — that would surface as an uncaught
 * 500. Constraining to an enum means any other value is rejected as a 400
 * `INVALID_QUERY` instead (a hard acceptance criterion).
 */
const SORTABLE = [
  "startDateTime:asc",
  "startDateTime:desc",
  "title:asc",
  "title:desc",
] as const

// Schemas are deliberately NOT `.strict()`: unknown query params (cache
// busters, analytics keys, a client's default params) are stripped and ignored
// rather than turned into a 400. Only the keys below are consumed.
const listQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().max(10_000).default(1),
    pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(25),
    featured: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
    eventStatus: z
      .enum(["scheduled", "cancelled", "postponed", "rescheduled"])
      .optional(),
    startDate: isoDatetime.optional(),
    endDate: isoDatetime.optional(),
    sort: z.enum(SORTABLE).optional(),
    locale: z.string().min(2).max(10).optional(),
  })
  .refine((q) => !q.startDate || !q.endDate || q.startDate <= q.endDate, {
    message: "startDate must be on or before endDate",
  })

const trendingQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10_000).default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(25),
  locale: z.string().min(2).max(10).optional(),
})

const eventsController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /events — list published cinema events (v5 shape + pagination).
   */
  async findEvents(ctx: any) {
    const parsed = listQuerySchema.safeParse(ctx.query ?? {})
    if (!parsed.success) {
      return ctx.badRequest("INVALID_QUERY")
    }

    const result = await strapi
      .plugin(PLUGIN_ID)
      .service("events")
      .findEvents(parsed.data)

    ctx.body = result
  },

  /**
   * GET /events/trending — upcoming events ranked by summed ticketsSold desc.
   * Registered BEFORE `/events/:documentId` so `trending` is not read as an id.
   */
  async findTrending(ctx: any) {
    const parsed = trendingQuerySchema.safeParse(ctx.query ?? {})
    if (!parsed.success) {
      return ctx.badRequest("INVALID_QUERY")
    }

    const result = await strapi
      .plugin(PLUGIN_ID)
      .service("events")
      .findTrending(parsed.data)

    ctx.body = result
  },

  /**
   * GET /events/:documentId — single published cinema event.
   */
  async findEvent(ctx: any) {
    const { documentId } = ctx.params
    const locale =
      typeof ctx.query?.locale === "string" ? ctx.query.locale : undefined

    const event = await strapi
      .plugin(PLUGIN_ID)
      .service("events")
      .findEvent(documentId, locale)

    if (!event) {
      return ctx.notFound("EVENT_NOT_FOUND")
    }

    ctx.body = { data: event, meta: {} }
  },
})

export default eventsController
