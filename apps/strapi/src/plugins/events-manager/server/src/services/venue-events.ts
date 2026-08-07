/**
 * Venue-manager event creation (Story 7.3).
 *
 * TENANT ISOLATION IS A LOOKUP, NOT A CHECK. Every method resolves the venue
 * via the venues facade by `manager: { id: user.id }` — no venue documentId is
 * ever accepted from a request. Events are read/published only when
 * `event.venue.documentId` equals the caller's venue; a foreign event answers
 * the same `EVENT_NOT_FOUND` as an absent one.
 *
 * CROSS-PLUGIN CALLS GO THROUGH FACADES ONLY:
 * `strapi.plugin("venues").service("public-api")` for the tenant identity and
 * `strapi.plugin("creative-works").service("public-api")` for the catalog —
 * never `strapi.documents()` with a foreign UID from here.
 *
 * DRAFT-FIRST. Events are created as drafts; every public read is pinned
 * `status: "published"`, so a draft is invisible everywhere until the manager
 * explicitly publishes. Publishing requires `venue.status === "approved"` and
 * CASCADES: the event in ALL locales, then each showtime (screenings and
 * performances are separate draftAndPublish documents — publishing the event
 * alone would render an event with zero showtimes).
 *
 * NO TICKETING SURFACE. Showtimes are created without price / tier / quantity
 * fields, so `price` and `ticketsAvailable` stay at their schema defaults.
 */
import type { Core } from "@strapi/strapi"
// Compile-time only (`import type`), so these do not create a runtime
// dependency edge (the runtime edge is the facade call + package.json).
import type { CreateWorkInput } from "../../../../creative-works/server/src/services/creative-work"
import type { ManagedVenueRef } from "../../../../venues/server/src/services/public-api"
import type {
  VenueEventCreateInput,
  VenueShowtimeInput,
} from "../validation/venue-events"

const PLUGIN_ID = "events-manager"
const EVENT_UID = `plugin::${PLUGIN_ID}.event` as const
const SCREENING_UID = `plugin::${PLUGIN_ID}.screening` as const
const PERFORMANCE_UID = `plugin::${PLUGIN_ID}.performance` as const

const VENUES_PLUGIN_ID = "venues"
const CREATIVE_WORKS_PLUGIN_ID = "creative-works"

/** Error code: the caller has the manager role but manages no venue. */
export const VENUE_NOT_FOUND = "VENUE_NOT_FOUND"
/** Error code: `creativeWorkId` matches no catalog entry. */
export const CREATIVE_WORK_NOT_FOUND = "CREATIVE_WORK_NOT_FOUND"
/** Error code: the event is absent OR belongs to another venue (same answer). */
export const EVENT_NOT_FOUND = "EVENT_NOT_FOUND"
/** Error code: `showtimes` was empty. */
export const EVENT_SHOWTIMES_REQUIRED = "EVENT_SHOWTIMES_REQUIRED"
/** Error code: `endDateTime` precedes `startDateTime`. */
export const EVENT_DATES_INVALID = "EVENT_DATES_INVALID"
/** Error code: a showtime falls outside the event's run-date window. */
export const SHOWTIME_OUTSIDE_EVENT_RANGE = "SHOWTIME_OUTSIDE_EVENT_RANGE"
/** Error code: publishing refused — the venue is not approved. */
export const VENUE_NOT_APPROVED = "VENUE_NOT_APPROVED"
/** Error code: the transactional event/showtime write failed. */
export const EVENT_CREATE_FAILED = "EVENT_CREATE_FAILED"
/** Error code: the publish cascade failed (logged loudly, never partial-silent). */
export const EVENT_PUBLISH_FAILED = "EVENT_PUBLISH_FAILED"
/** Error code: the catalog-entry creation failed. */
export const WORK_CREATE_FAILED = "WORK_CREATE_FAILED"

/** The set of coded errors this service throws (rethrown untouched by wraps). */
const KNOWN_CODES = new Set([
  VENUE_NOT_FOUND,
  CREATIVE_WORK_NOT_FOUND,
  EVENT_NOT_FOUND,
  EVENT_SHOWTIMES_REQUIRED,
  EVENT_DATES_INVALID,
  SHOWTIME_OUTSIDE_EVENT_RANGE,
  VENUE_NOT_APPROVED,
  EVENT_CREATE_FAILED,
  EVENT_PUBLISH_FAILED,
  WORK_CREATE_FAILED,
])

/** Attach a stable error CODE to a thrown Error (mirrors venues' services). */
function codedError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code })
}

function codeOf(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code
  return typeof code === "string" ? code : undefined
}

/** The authenticated caller, narrowed to what this service actually uses. */
export interface VenueManagerUser {
  id: number | string
}

/** Showtime kind, derived from the creative work's `type`. */
export type ShowtimeKind = "screening" | "performance"

/**
 * `category` is DERIVED from the creative work's `type`, never accepted from
 * the client. The same map selects the showtime kind: films get screenings,
 * plays get performances. `concert`/`exhibition` are NOT creatable here — the
 * creative-work model cannot represent them.
 */
const KIND_BY_WORK_TYPE: Record<
  string,
  { category: "movie_screening" | "theater_performance"; kind: ShowtimeKind }
> = {
  film: { category: "movie_screening", kind: "screening" },
  "short-film": { category: "movie_screening", kind: "screening" },
  play: { category: "theater_performance", kind: "performance" },
}

/**
 * Kebab-case slug + short uniqueness suffix, generated service-side because
 * the event schema's `slug` uid has no `targetField`. A title that yields no
 * ASCII (an Arabic-only title) falls back to `event`.
 */
export function generateEventSlug(title: string): string {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "event"
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`
}

/**
 * Run-date windows are Tunisian wall-clock days, not UTC days. Events happen
 * at the venue, and the client sends the manager's wall clock resolved in this
 * same zone — comparing in UTC would reject a legitimate evening showtime on a
 * single-day event (`00:00` Tunis is the previous UTC day).
 */
export const EVENT_TIMEZONE = "Africa/Tunis"

const DAY_FORMATTER = new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", {
  timeZone: EVENT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** The `Africa/Tunis` calendar day (`YYYY-MM-DD`) of a parseable ISO datetime. */
function venueDayOf(isoDateTime: string): string {
  return DAY_FORMATTER.format(new Date(Date.parse(isoDateTime)))
}

/**
 * The matrix-pinned cross-field rules, thrown with their OWN codes (they must
 * surface as top-level `details.code`, so they cannot be Zod refines — see
 * `validation/venue-events.ts`). Range is checked at DAY granularity in
 * `Africa/Tunis` (see {@link EVENT_TIMEZONE}): a showtime before the
 * `startDateTime` day or after the `endDateTime` day (the start day when no
 * end is set) is refused.
 */
export function assertEventDatesAndShowtimes(input: {
  startDateTime: string
  endDateTime?: string
  showtimes: readonly VenueShowtimeInput[]
}): void {
  if (input.showtimes.length === 0) {
    throw codedError(
      "At least one showtime is required",
      EVENT_SHOWTIMES_REQUIRED
    )
  }

  const startTs = Date.parse(input.startDateTime)
  if (input.endDateTime !== undefined) {
    const endTs = Date.parse(input.endDateTime)
    if (endTs < startTs) {
      throw codedError(
        "endDateTime precedes startDateTime",
        EVENT_DATES_INVALID
      )
    }
  }

  const firstDay = venueDayOf(input.startDateTime)
  const lastDay = input.endDateTime ? venueDayOf(input.endDateTime) : firstDay
  for (const showtime of input.showtimes) {
    const day = venueDayOf(showtime.startDateTime)
    if (day < firstDay || day > lastDay) {
      throw codedError(
        "Showtime outside the event's run dates",
        SHOWTIME_OUTSIDE_EVENT_RANGE
      )
    }
  }
}

/**
 * Enumerate the configured i18n locale codes from the i18n plugin — never a
 * hardcoded list (see the Boundaries: localized fields are replicated to ALL
 * configured locales so the event is visible to AR/FR/EN readers alike).
 */
export async function listLocaleCodes(strapi: Core.Strapi): Promise<string[]> {
  const rows = (await strapi.plugin("i18n").service("locales").find()) as
    | Array<{ code?: unknown }>
    | undefined
  return (Array.isArray(rows) ? rows : [])
    .map((row) => row?.code)
    .filter((code): code is string => typeof code === "string")
}

/**
 * The manager's draft-preview projection. Mirrors the public detail read's
 * `DETAIL_POPULATE` (`services/events.ts`) — the preview page renders the SAME
 * production detail component, so the shapes must match — plus `performances`
 * (the public reader is cinema-first; the preview must show a play's showtimes
 * too) and the `venue` block the ownership check reads.
 */
const MANAGER_DETAIL_POPULATE = {
  images: true,
  venue: {
    populate: {
      cityRef: { populate: { region: true } },
      geo: true,
    },
  },
  screenings: {
    populate: {
      movie: {
        populate: {
          poster: true,
          backdrop: true,
          videos: true,
          genres: true,
          cast: {
            populate: {
              person: { populate: { photo: true } },
              character: true,
            },
          },
          credits: {
            populate: {
              person: { populate: { photo: true } },
              creditRole: true,
            },
          },
        },
      },
    },
  },
  performances: {
    populate: {
      play: {
        populate: {
          poster: true,
          backdrop: true,
          videos: true,
          genres: true,
          cast: {
            populate: {
              person: { populate: { photo: true } },
              character: true,
            },
          },
          credits: {
            populate: {
              person: { populate: { photo: true } },
              creditRole: true,
            },
          },
        },
      },
    },
  },
} as const

/** Minimal shapes read off Document Service rows. */
interface EventRow {
  documentId: string
  venue?: { documentId?: string } | null
  screenings?: Array<{ documentId?: string } | null> | null
  performances?: Array<{ documentId?: string } | null> | null
  [key: string]: unknown
}

interface WorkRow {
  documentId: string
  title?: string
  type?: string
  releaseYear?: number
  poster?: unknown
}

const venueEventsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Resolve the caller's venue via the venues facade, or throw VENUE_NOT_FOUND. */
  async requireVenue(user: VenueManagerUser): Promise<ManagedVenueRef> {
    const venue = (await strapi
      .plugin(VENUES_PLUGIN_ID)
      .service("public-api")
      .findVenueForManager(user.id)) as ManagedVenueRef | null

    if (!venue) {
      throw codedError("Venue not found", VENUE_NOT_FOUND)
    }
    return venue
  },

  /**
   * `POST /venue/events`. Creates the draft event AND its showtimes atomically
   * (one `strapi.db.transaction`), with the localized fields replicated to
   * every other configured locale. Returns the created event's preview
   * projection.
   */
  async createEvent(
    user: VenueManagerUser,
    input: VenueEventCreateInput,
    locale?: string
  ) {
    const venue = await this.requireVenue(user)

    const work = (await strapi
      .plugin(CREATIVE_WORKS_PLUGIN_ID)
      .service("public-api")
      .findWork(input.creativeWorkId)) as WorkRow | null
    if (!work) {
      throw codedError("Creative work not found", CREATIVE_WORK_NOT_FOUND)
    }

    const mapping = KIND_BY_WORK_TYPE[work.type ?? ""]
    if (!mapping) {
      // A catalog entry whose `type` this surface cannot schedule (should not
      // happen: the enum is film|play|short-film).
      throw codedError("Creative work not schedulable", CREATIVE_WORK_NOT_FOUND)
    }

    assertEventDatesAndShowtimes(input)

    const allLocales = await listLocaleCodes(strapi)
    const slug = generateEventSlug(input.title)

    let createdId: string
    try {
      createdId = await strapi.db.transaction(async () => {
        const created = (await strapi.documents(EVENT_UID).create({
          data: {
            title: input.title,
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            category: mapping.category,
            startDateTime: input.startDateTime,
            ...(input.endDateTime !== undefined
              ? { endDateTime: input.endDateTime }
              : {}),
            featured: input.featured ?? false,
            ...(input.imageIds !== undefined ? { images: input.imageIds } : {}),
            slug,
            venue: venue.documentId,
          },
          ...(locale ? { locale } : {}),
          status: "draft",
        } as never)) as { documentId: string; locale?: string }

        // Replicate the localized fields VERBATIM to the other configured
        // locales so the event is findable in every locale (translation
        // quality is a later editorial concern).
        const writtenLocale = locale ?? created.locale
        for (const other of allLocales) {
          if (other === writtenLocale) continue
          await strapi.documents(EVENT_UID).update({
            documentId: created.documentId,
            locale: other,
            data: {
              title: input.title,
              ...(input.description !== undefined
                ? { description: input.description }
                : {}),
            },
          } as never)
        }

        // Showtime kind follows the work type. NO price / tickets fields —
        // the schema defaults stand (dormant ticketing, Story 3.12).
        const subEventUid =
          mapping.kind === "screening" ? SCREENING_UID : PERFORMANCE_UID
        let order = 1
        for (const showtime of input.showtimes) {
          const common = {
            event: created.documentId,
            order: order++,
            startDateTime: showtime.startDateTime,
            ...(showtime.audioLanguage !== undefined
              ? { audioLanguage: showtime.audioLanguage }
              : {}),
          }
          const data =
            mapping.kind === "screening"
              ? {
                  ...common,
                  movie: work.documentId,
                  videoFormat: showtime.videoFormat ?? "standard",
                  ...(showtime.subtitleLanguage !== undefined
                    ? { subtitleLanguage: showtime.subtitleLanguage }
                    : {}),
                }
              : {
                  ...common,
                  play: work.documentId,
                  ...(showtime.surtitleLanguage !== undefined
                    ? { surtitleLanguage: showtime.surtitleLanguage }
                    : {}),
                }

          await strapi.documents(subEventUid).create({ data } as never)
        }

        return created.documentId
      })
    } catch (err) {
      const code = codeOf(err)
      if (code && KNOWN_CODES.has(code)) throw err
      strapi.log.error(
        `[events-manager:venue-events] event create failed for venue ${venue.documentId}: ${
          (err as Error)?.stack ?? err
        }`
      )
      throw codedError("Event creation failed", EVENT_CREATE_FAILED)
    }

    return this.findMine(user, createdId, locale)
  },

  /**
   * `GET /venue/events` — the manager's own events (drafts AND their
   * publication state), newest first. Draft rows always exist for a
   * draftAndPublish type, so the DRAFT list is the complete list; the
   * published ids are read separately to derive `isPublished`.
   */
  async listMine(user: VenueManagerUser, locale?: string) {
    const venue = await this.requireVenue(user)

    const filters = { venue: { documentId: { $eq: venue.documentId } } }

    const [drafts, published] = await Promise.all([
      strapi.documents(EVENT_UID).findMany({
        status: "draft",
        ...(locale ? { locale } : {}),
        filters,
        sort: "createdAt:desc",
        populate: { images: true },
        limit: 200,
      } as never) as Promise<EventRow[]>,
      strapi.documents(EVENT_UID).findMany({
        status: "published",
        ...(locale ? { locale } : {}),
        filters,
        fields: ["documentId"],
        limit: 200,
      } as never) as Promise<Array<{ documentId: string }>>,
    ])

    const publishedIds = new Set(
      (Array.isArray(published) ? published : []).map((row) => row.documentId)
    )

    return (Array.isArray(drafts) ? drafts : []).map((event) => ({
      ...event,
      isPublished: publishedIds.has(event.documentId),
    }))
  },

  /**
   * `GET /venue/events/:documentId` — the draft-preview read. Ownership is a
   * venue match on the populated row; a foreign event and an absent one answer
   * the same `EVENT_NOT_FOUND` (indistinguishable by design).
   */
  async findMine(user: VenueManagerUser, documentId: string, locale?: string) {
    const venue = await this.requireVenue(user)

    const event = (await strapi.documents(EVENT_UID).findOne({
      documentId,
      status: "draft",
      ...(locale ? { locale } : {}),
      populate: MANAGER_DETAIL_POPULATE,
    } as never)) as EventRow | null

    if (!event || event.venue?.documentId !== venue.documentId) {
      throw codedError("Event not found", EVENT_NOT_FOUND)
    }

    const publishedRow = (await strapi.documents(EVENT_UID).findOne({
      documentId,
      status: "published",
      fields: ["documentId"],
    } as never)) as { documentId: string } | null

    return { ...event, isPublished: publishedRow != null }
  },

  /**
   * `POST /venue/events/:documentId/publish`. Gated on
   * `venue.status === "approved"` (`VENUE_NOT_APPROVED` otherwise, 409), then
   * CASCADES.
   *
   * SHOWTIMES ARE PUBLISHED FIRST, THE EVENT LAST, and the order is
   * load-bearing: the public detail populate only runs under a published event
   * root, so a published showtime under a still-draft event is invisible,
   * whereas a published event whose showtimes never made it renders an event
   * with no dates. Publishing the event last means a mid-cascade failure
   * leaves nothing public at all — `EVENT_PUBLISH_FAILED` with the event still
   * a draft, retryable — instead of a live but empty event.
   */
  async publishEvent(user: VenueManagerUser, documentId: string) {
    const venue = await this.requireVenue(user)

    const event = (await strapi.documents(EVENT_UID).findOne({
      documentId,
      status: "draft",
      populate: {
        venue: { fields: ["documentId"] },
        screenings: { fields: ["documentId"] },
        performances: { fields: ["documentId"] },
      },
    } as never)) as EventRow | null

    if (!event || event.venue?.documentId !== venue.documentId) {
      throw codedError("Event not found", EVENT_NOT_FOUND)
    }

    if (venue.status !== "approved") {
      throw codedError("Venue not approved", VENUE_NOT_APPROVED)
    }

    try {
      for (const screening of event.screenings ?? []) {
        if (!screening?.documentId) continue
        await strapi.documents(SCREENING_UID).publish({
          documentId: screening.documentId,
        } as never)
      }
      for (const performance of event.performances ?? []) {
        if (!performance?.documentId) continue
        await strapi.documents(PERFORMANCE_UID).publish({
          documentId: performance.documentId,
        } as never)
      }

      // Last: until this lands, nothing above is publicly reachable.
      await strapi.documents(EVENT_UID).publish({
        documentId,
        locale: "*",
      } as never)
    } catch (err) {
      strapi.log.error(
        `[events-manager:venue-events] publish cascade failed for event ${documentId}: ${
          (err as Error)?.stack ?? err
        }`
      )
      throw codedError("Event publish failed", EVENT_PUBLISH_FAILED)
    }

    return { documentId, isPublished: true }
  },

  /**
   * `GET /venue/creative-works/search` — catalog search through the
   * creative-works facade, projected to what the picker renders.
   */
  async searchCreativeWorks(query: string, limit = 20) {
    const rows = (await strapi
      .plugin(CREATIVE_WORKS_PLUGIN_ID)
      .service("public-api")
      .searchWorks(query, limit)) as WorkRow[] | null

    return (Array.isArray(rows) ? rows : []).map((row) => ({
      documentId: row.documentId,
      title: row.title,
      type: row.type,
      releaseYear: row.releaseYear,
      poster: row.poster ?? null,
    }))
  },

  /**
   * `POST /venue/creative-works` — create AND publish a catalog entry through
   * the creative-works facade (catalog data, not a venue announcement).
   */
  async createCreativeWork(input: CreateWorkInput, locale?: string) {
    try {
      return await strapi
        .plugin(CREATIVE_WORKS_PLUGIN_ID)
        .service("public-api")
        .createWork(input, locale)
    } catch (err) {
      strapi.log.error(
        `[events-manager:venue-events] creative-work create failed: ${
          (err as Error)?.stack ?? err
        }`
      )
      throw codedError("Creative work creation failed", WORK_CREATE_FAILED)
    }
  },
})

export default venueEventsService
