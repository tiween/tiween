import { z } from "zod"

import type { Core } from "@strapi/strapi"

import { validate } from "../../../../../shared/validation"
import { venueRegistrationSchema } from "../validation/registration"

const PLUGIN_ID = "venues"

/** Upper bound on the selector page — the picker searches client-side. */
const MAX_SELECTOR_PAGE_SIZE = 200
const DEFAULT_SELECTOR_PAGE_SIZE = 100
/** Upper bound on `page`: a venue catalogue is never thousands of pages deep. */
const MAX_SELECTOR_PAGE = 100

/** Blank / whitespace-only query values are treated as absent, never as a 400. */
const blankToUndefined = (v: unknown) =>
  typeof v === "string" ? v.trim() || undefined : v

/**
 * An opaque, locale-stable `documentId` filter value. An empty or
 * whitespace-only string (`?city=`, `?include=%20`) is trimmed to `undefined`
 * so it is ignored — a blank param means "no filter" (200), never a 400 — while
 * a present value must be non-empty and is length-bounded.
 * (Mirrors the events-manager controller precedent.)
 */
const optionalDocumentId = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z.string().min(1).max(255).optional()
)

/** The venue schema's `type` enumeration. */
const VENUE_TYPES = [
  "cinema",
  "theater",
  "cultural-center",
  "museum",
  "other",
] as const

/**
 * `GET /venues/selector` query contract. Deliberately NOT `.strict()`: unknown
 * query params (cache busters, analytics keys) are stripped and ignored rather
 * than turned into a 400. Only the keys below are consumed.
 */
const selectorQuerySchema = z.object({
  locale: z.string().min(2).max(10).optional(),
  // A blank `?type=` means "no type filter"; a present-but-unknown value is a
  // 400 rather than a silently-empty listing.
  type: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.enum(VENUE_TYPES).optional()
  ),
  city: optionalDocumentId,
  region: optionalDocumentId,
  include: optionalDocumentId,
  // Blank (`?page=`, `?pageSize=`) is trimmed to `undefined` so the default
  // applies — same "a blank param means absent" convention the other params
  // follow — while a present-but-invalid value is a 400. `page` is capped low:
  // this is an unauthenticated route and each request pairs a deep `OFFSET`
  // with a full `count()`; the picker itself only ever asks for page 1.
  page: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().positive().max(MAX_SELECTOR_PAGE).default(1)
  ),
  pageSize: z.preprocess(
    blankToUndefined,
    z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_SELECTOR_PAGE_SIZE)
      .default(DEFAULT_SELECTOR_PAGE_SIZE)
  ),
})

const venueController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * GET /venues
   * Returns all venues
   */
  async findVenues(ctx) {
    const { locale } = ctx.query
    const venues = await strapi
      .plugin(PLUGIN_ID)
      .service("venue")
      .findVenues(locale)

    ctx.body = {
      data: venues,
      meta: {
        pagination: {
          total: venues.length,
        },
      },
    }
  },

  /**
   * GET /venues/selector
   * Venue picker feed (DW-24 / DW-25): approved-only, optionally scoped by
   * `type`/`city`/`region`, paginated, with the venue's city denormalized from
   * the populated `cityRef`. Registered BEFORE `/venues/:documentId` so
   * `selector` is not read as a documentId.
   */
  async findVenuesForSelector(ctx: any) {
    const parsed = selectorQuerySchema.safeParse(ctx.query ?? {})
    if (!parsed.success) {
      return ctx.badRequest("INVALID_QUERY")
    }

    ctx.body = await strapi
      .plugin(PLUGIN_ID)
      .service("venue")
      .findVenuesForSelector(parsed.data)
  },

  /**
   * GET /venues/:documentId
   * Returns a single venue by documentId
   */
  async findVenue(ctx) {
    const { documentId } = ctx.params
    const { locale } = ctx.query

    const venue = await strapi
      .plugin(PLUGIN_ID)
      .service("venue")
      .findVenue(documentId, locale)

    if (!venue) {
      return ctx.notFound("Venue not found")
    }

    ctx.body = {
      data: venue,
      meta: {},
    }
  },
})

const seedController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async seedVenues(ctx) {
    try {
      const results = await strapi
        .plugin(PLUGIN_ID)
        .service("seed")
        .seedVenues()

      ctx.body = {
        success: true,
        message: "Venues seeded successfully",
        data: results,
      }
    } catch (error) {
      strapi.log.error("[venues:seed] Error seeding venues:", error)
      ctx.throw(500, "Failed to seed venues")
    }
  },
})

/**
 * Map a registration error CODE to an HTTP status; unknown codes → 500.
 * (Mirrors the `STATUS_BY_CODE` + `respondError` envelope in
 * `plugins/ticketing/server/src/controllers/order.ts`.)
 */
const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_FAILED: 400,
  EMAIL_ALREADY_REGISTERED: 409,
  VENUE_MANAGER_ROLE_MISSING: 500,
  VENUE_REGISTRATION_FAILED: 500,
}

/**
 * Emit a uniform Strapi error envelope carrying the SCREAMING_SNAKE code in
 * `error.details.code`. Internal exception text is NEVER echoed — the client
 * translates the code, so a static message is safe for mapped and unmapped
 * errors alike. Per-field validation issues (themselves CODES) are forwarded so
 * the form can attach them to fields.
 *
 * Two properties are load-bearing and easy to lose:
 *
 * 1. An UNMAPPED error is collapsed to 500 `INTERNAL_ERROR` for the client but
 *    LOGGED here. Collapsing silently is how a raw DB failure (a lost race on
 *    the users unique index, a driver error) reaches the applicant as a generic
 *    500 with no trace anywhere — undiagnosable from either side.
 * 2. `issues` is forwarded only for MAPPED codes. Emitting per-field issues
 *    alongside a code we deliberately refused to disclose contradicts the
 *    collapse: the payload the client is not supposed to see rides out in the
 *    field it was hidden from.
 */
function respondError(strapi: Core.Strapi, ctx: any, err: any): void {
  const code: string | undefined = err?.details?.code ?? err?.code
  const mappedStatus = code ? STATUS_BY_CODE[code] : undefined
  const status = mappedStatus ?? 500
  const issues = err?.details?.issues

  if (!mappedStatus) {
    strapi.log.error(
      `[venues:registration] unmapped registration error (code=${
        code ?? "none"
      }): ${err?.stack ?? err}`
    )
  }

  ctx.status = status
  ctx.body = {
    error: {
      status,
      name: "VenueRegistrationError",
      message: "Venue registration failed",
      details: {
        code: mappedStatus ? code : "INTERNAL_ERROR",
        ...(mappedStatus && Array.isArray(issues) ? { issues } : {}),
      },
    },
  }
}

const registrationController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * POST /venues/register — public, unauthenticated venue application
   * (Story 7.1). Creates a blocked `venue-manager` user plus a `pending`,
   * unpublished venue linked as its `manager`, then fires two best-effort
   * notification emails.
   */
  async register(ctx: any) {
    try {
      const input = validate(venueRegistrationSchema, ctx.request?.body ?? {})

      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("registration")
        .registerVenue(input)

      ctx.status = 201
      ctx.body = { data: result }
    } catch (err) {
      respondError(strapi, ctx, err)
    }
  },
})

export default {
  venue: venueController,
  registration: registrationController,
  seed: seedController,
}
