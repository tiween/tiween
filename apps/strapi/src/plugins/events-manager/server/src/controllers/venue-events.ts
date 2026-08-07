import { z } from "zod"

import type { Core } from "@strapi/strapi"

import { validate } from "../../../../../shared/validation"
import { listLocaleCodes } from "../services/venue-events"
import {
  venueEventCreateSchema,
  venueWorkCreateSchema,
} from "../validation/venue-events"

/**
 * Venue-manager event-creation endpoints (Story 7.3). All six routes OMIT
 * `config.auth` — which is how a content-api route is declared authenticated
 * and permission-checked (`auth: true` is not a valid value and throws at
 * boot, 7.2's lead review finding) — and carry the cross-plugin
 * `plugin::venues.is-venue-manager` policy. The venue itself is resolved from
 * `ctx.state.user` inside the service; nothing here ever reads a venue id from
 * the request.
 */

const PLUGIN_ID = "events-manager"

const localeQuerySchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z.string().min(1).max(20).optional()
)

/**
 * A `locale` off `ctx.query` is caller-controlled and flows into the Document
 * Service, so it is checked against the locales the i18n plugin actually has —
 * ENUMERATED, never a hardcoded list, so adding a locale to the deployment
 * needs no change here (the same rule the service's replication follows). An
 * unknown value is IGNORED (→ default locale), never a 400.
 */
async function parseLocale(
  strapi: Core.Strapi,
  value: unknown
): Promise<string | undefined> {
  const parsed = localeQuerySchema.safeParse(value)
  if (!parsed.success || parsed.data === undefined) return undefined

  const configured = await listLocaleCodes(strapi)
  return configured.includes(parsed.data) ? parsed.data : undefined
}

/** Blank / whitespace-only search terms are treated as "no query". */
const searchQuerySchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z.string().min(1).max(200).optional()
)

/**
 * Venue-events error CODE → HTTP status. Same discipline as the venues
 * controllers: an UNMAPPED code collapses to 500 `INTERNAL_ERROR` for the
 * client and is LOGGED here, so a raw Document Service failure stays
 * diagnosable instead of vanishing into a generic 500.
 */
const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  EVENT_SHOWTIMES_REQUIRED: 400,
  EVENT_DATES_INVALID: 400,
  SHOWTIME_OUTSIDE_EVENT_RANGE: 400,
  NOT_VENUE_MANAGER: 403,
  VENUE_NOT_FOUND: 404,
  EVENT_NOT_FOUND: 404,
  CREATIVE_WORK_NOT_FOUND: 404,
  VENUE_NOT_APPROVED: 409,
  EVENT_CREATE_FAILED: 500,
  EVENT_PUBLISH_FAILED: 500,
  WORK_CREATE_FAILED: 500,
}

/**
 * Uniform error envelope. Internal exception text is NEVER echoed — the client
 * translates the code — and per-field `issues` (themselves CODES) ride out
 * only for MAPPED codes, so a payload we deliberately refused to disclose
 * cannot leak through the field it was hidden from.
 */
function respondError(strapi: Core.Strapi, ctx: any, err: any): void {
  const code: string | undefined = err?.details?.code ?? err?.code
  const mappedStatus = code ? STATUS_BY_CODE[code] : undefined
  const status = mappedStatus ?? 500
  const issues = err?.details?.issues

  if (!mappedStatus) {
    strapi.log.error(
      `[events-manager:venue-events] unmapped error (code=${code ?? "none"}): ${
        err?.stack ?? err
      }`
    )
  }

  ctx.status = status
  ctx.body = {
    error: {
      status,
      name: "VenueEventsError",
      message: "Venue events request failed",
      details: {
        code: mappedStatus ? code : "INTERNAL_ERROR",
        ...(mappedStatus && Array.isArray(issues) ? { issues } : {}),
      },
    },
  }
}

const venueEventsController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** POST /venue/events — create a draft event + showtimes at the caller's venue. */
  async create(ctx: any) {
    try {
      const input = validate(venueEventCreateSchema, ctx.request?.body ?? {})
      const locale = await parseLocale(strapi, ctx.query?.locale)

      const event = await strapi
        .plugin(PLUGIN_ID)
        .service("venue-events")
        .createEvent(ctx.state.user, input, locale)

      ctx.status = 201
      ctx.body = { data: event }
    } catch (err) {
      respondError(strapi, ctx, err)
    }
  },

  /** GET /venue/events — the caller's own events, draft + published state. */
  async findMine(ctx: any) {
    try {
      const locale = await parseLocale(strapi, ctx.query?.locale)

      const events = await strapi
        .plugin(PLUGIN_ID)
        .service("venue-events")
        .listMine(ctx.state.user, locale)

      ctx.body = { data: events }
    } catch (err) {
      respondError(strapi, ctx, err)
    }
  },

  /** GET /venue/events/:documentId — the draft-preview read. */
  async findOne(ctx: any) {
    try {
      const documentId =
        typeof ctx.params?.documentId === "string" ? ctx.params.documentId : ""
      const locale = await parseLocale(strapi, ctx.query?.locale)

      const event = await strapi
        .plugin(PLUGIN_ID)
        .service("venue-events")
        .findMine(ctx.state.user, documentId, locale)

      ctx.body = { data: event }
    } catch (err) {
      respondError(strapi, ctx, err)
    }
  },

  /** POST /venue/events/:documentId/publish — the explicit publish cascade. */
  async publish(ctx: any) {
    try {
      const documentId =
        typeof ctx.params?.documentId === "string" ? ctx.params.documentId : ""

      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("venue-events")
        .publishEvent(ctx.state.user, documentId)

      ctx.body = { data: result }
    } catch (err) {
      respondError(strapi, ctx, err)
    }
  },

  /** GET /venue/creative-works/search?query=… — catalog search for the picker. */
  async searchCreativeWorks(ctx: any) {
    try {
      const parsed = searchQuerySchema.safeParse(ctx.query?.query)
      // A blank / absent / absurd query is an empty result, never a 400 — the
      // picker debounces and a race can legitimately send a cleared box.
      if (!parsed.success || parsed.data === undefined) {
        ctx.body = { data: [] }
        return
      }

      const works = await strapi
        .plugin(PLUGIN_ID)
        .service("venue-events")
        .searchCreativeWorks(ctx.state?.user, parsed.data)

      ctx.body = { data: works }
    } catch (err) {
      respondError(strapi, ctx, err)
    }
  },

  /** POST /venue/creative-works — create + publish a minimal catalog entry. */
  async createCreativeWork(ctx: any) {
    try {
      const input = validate(venueWorkCreateSchema, ctx.request?.body ?? {})
      const locale = await parseLocale(strapi, ctx.query?.locale)

      const work = await strapi
        .plugin(PLUGIN_ID)
        .service("venue-events")
        .createCreativeWork(ctx.state?.user, input, locale)

      ctx.status = 201
      ctx.body = { data: work }
    } catch (err) {
      respondError(strapi, ctx, err)
    }
  },
})

export default venueEventsController
