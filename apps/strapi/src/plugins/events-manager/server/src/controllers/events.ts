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
 * An opaque, locale-stable `documentId` filter value (Story 3.4 city/region,
 * Story 3.5 venue).
 * An empty or whitespace-only string (`?region=`, `?region=%20`) is trimmed to
 * `undefined` so it is ignored — the I/O contract treats a blank location param
 * as "no location filter" (200), never a 400 — while a present value must be
 * non-empty and is length-bounded (a documentId is short; reject absurd input).
 */
const optionalDocumentId = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z.string().min(1).max(255).optional()
)

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
    // Location filters (Story 3.4): opaque, locale-stable `documentId`s threaded
    // into a nested `venue.cityRef[.region].documentId` relation filter by the
    // service. Absent/empty ⇒ no location filter (empty is stripped, not a 400).
    city: optionalDocumentId,
    region: optionalDocumentId,
    // Venue filter (Story 3.5): an opaque, locale-stable `documentId` threaded
    // into a `venue.documentId` relation filter, merged with city/region under
    // the same `filters.venue` object. Absent/empty ⇒ no venue filter.
    venue: optionalDocumentId,
    sort: z.enum(SORTABLE).optional(),
    locale: z.string().min(2).max(10).optional(),
  })
  .refine(
    // Compare instants, not strings. `isoDatetime` allows a timezone offset, so
    // a lexical compare of the raw strings misorders mixed-offset ranges (e.g.
    // `...T12:00:00+05:00` is 07:00Z, earlier than `...T09:00:00+00:00`, yet
    // sorts lexically after it). Parse to epoch ms before comparing.
    (q) =>
      !q.startDate ||
      !q.endDate ||
      new Date(q.startDate).getTime() <= new Date(q.endDate).getTime(),
    { message: "startDate must be on or before endDate" }
  )

// `locale` is validated identically on every read path (list/trending/detail):
// a 2–10 char string, stripped when absent. It is NOT checked against the set
// of configured locales here — an unconfigured-but-well-formed locale yields an
// empty/default-locale read from the Document Service, never a thrown 500.
const localeParam = z.string().min(2).max(10).optional()

const trendingQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10_000).default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(25),
  locale: localeParam,
})

// Detail route (`/events/:documentId`) only consumes `locale`; validate it with
// the same guard the list/trending routes use instead of reading it raw.
const detailQuerySchema = z.object({ locale: localeParam })

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
    const parsed = detailQuerySchema.safeParse(ctx.query ?? {})
    if (!parsed.success) {
      return ctx.badRequest("INVALID_QUERY")
    }

    const { documentId } = ctx.params

    const event = await strapi
      .plugin(PLUGIN_ID)
      .service("events")
      .findEvent(documentId, parsed.data.locale)

    if (!event) {
      return ctx.notFound("EVENT_NOT_FOUND")
    }

    ctx.body = { data: event, meta: {} }
  },
})

export default eventsController
