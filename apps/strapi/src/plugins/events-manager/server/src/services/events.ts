import type { Core } from "@strapi/strapi"

import { createTrendingCache } from "../utils/trending-cache"

/**
 * Public read service for the events-manager plugin (Story 3.1a).
 *
 * Backs the public `content-api` GET routes. Document Service API only
 * (`strapi.documents(...)`) — never Entity Service, never raw SQL. Returns the
 * Strapi v5 response shape directly (`{ data, meta: { pagination } }`).
 *
 * NOTE: this is intentionally NOT the cross-plugin `public-api` facade. That
 * facade is the sanctioned ticketing -> events-manager inventory edge and is
 * left untouched; this service is the public HTTP read path.
 */

const PLUGIN_ID = "events-manager"
const EVENT_UID = `plugin::${PLUGIN_ID}.event` as const

/** MVP is cinema only — every public read is scoped to this category. */
export const MVP_CATEGORY = "movie_screening" as const

/** Upper bound on rows fetched for in-JS trending aggregation (see findTrending). */
const TRENDING_FETCH_CAP = 500

/**
 * TTL for the trending response cache (DW-19). Tens of seconds on purpose: long
 * enough to collapse a burst of identical requests onto one expensive
 * fetch+rank, short enough that trending never goes visibly stale. Reusing a
 * slightly-stale `startDateTime >= now` window within this window is the
 * intended stopgap tradeoff (hence `now` is excluded from the cache key).
 */
const TRENDING_CACHE_TTL_MS = 30_000

export type EventStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "rescheduled"

export interface FindEventsParams {
  page: number
  pageSize: number
  featured?: boolean
  eventStatus?: EventStatus
  startDate?: string
  endDate?: string
  /** City `documentId` — filters via `venue.cityRef.documentId` (Story 3.4). */
  city?: string
  /** Region `documentId` — filters via `venue.cityRef.region.documentId` (Story 3.4). */
  region?: string
  /** Venue `documentId` — filters via `venue.documentId` (Story 3.5). */
  venue?: string
  /**
   * Keyword search term (Story 3.6) — translated into a top-level `filters.$or`
   * of `$containsi` clauses across the event title, its screenings' movie
   * title/originalTitle/synopsis, and the venue name. AND-combines with the
   * other filters. Absent/blank ⇒ no keyword filter.
   */
  q?: string
  sort?: string
  locale?: string
}

export interface TrendingParams {
  page: number
  pageSize: number
  locale?: string
}

export interface Pagination {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export interface ListResult {
  data: unknown[]
  meta: { pagination: Pagination }
}

/**
 * Card/hero browse populate for the list + trending reads (`findEvents`,
 * `findTrending`).
 *
 * Bounded to what the homepage curated slices need: each screening's `movie`
 * (creative-work) with its `poster`/`backdrop`/`genres` (so `toFilmHeroEvent`
 * can render the flagship hero — title/backdrop/poster/genres/year/duration)
 * and the venue's `cityRef.region` (so `generateEventJsonLd` emits a complete
 * `location.address` city/region). A relation populate through the event UID
 * only — never a foreign-UID `strapi.documents()` call, per the cross-plugin
 * rule.
 *
 * Deliberately distinct from and lighter than the deep `DETAIL_POPULATE`: it
 * omits `cast`/`credits`/`videos` (and each person's photo) so browse reads stay
 * bounded across large result sets. That deep graph is used ONLY by the
 * single-event `findEvent` detail read.
 */
const EVENT_POPULATE = {
  images: true,
  venue: {
    populate: {
      cityRef: { populate: { region: true } },
    },
  },
  screenings: {
    populate: {
      movie: {
        populate: {
          poster: true,
          backdrop: true,
          genres: true,
        },
      },
    },
  },
} as const

/**
 * Deep populate for the single-event detail read (`findEvent`, Story 3.7).
 *
 * The browse list keeps `EVENT_POPULATE` shallow for performance across large
 * result sets; only the single-event detail path pays for the deep graph a
 * detail page needs: each screening's `movie` (creative-work) with its poster/
 * backdrop/videos/genres and its cast/credit components (each resolving the
 * `person` — with photo — and the `character`/`creditRole` edge), plus the
 * venue's `cityRef.region` (address block) and `geo` (populated for the future
 * 3.8 map). This is a relation populate through the event UID only — never a
 * foreign-UID `strapi.documents()` call, per the cross-plugin rule.
 */
const DETAIL_POPULATE = {
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
} as const

function buildFilters(params: {
  featured?: boolean
  eventStatus?: EventStatus
  startDate?: string
  endDate?: string
  city?: string
  region?: string
  venue?: string
  q?: string
}): Record<string, unknown> {
  const filters: Record<string, unknown> = { category: MVP_CATEGORY }

  if (params.featured !== undefined) {
    filters.featured = params.featured
  }
  if (params.eventStatus) {
    filters.eventStatus = params.eventStatus
  } else {
    // No explicit status filter: exclude cancelled events from the default
    // public browse, mirroring the trending endpoint (a cancelled screening is
    // not a browsable listing). A caller can still request them explicitly via
    // `eventStatus=cancelled`.
    filters.eventStatus = { $ne: "cancelled" }
  }

  const range: Record<string, string> = {}
  if (params.startDate) range.$gte = params.startDate
  if (params.endDate) range.$lte = params.endDate
  if (Object.keys(range).length > 0) {
    filters.startDateTime = range
  }

  // Venue + location filter (Stories 3.4/3.5): one nested relation filter on the
  // event query — never a foreign-UID `strapi.documents()` call, per the
  // architecture's cross-plugin rule (precedented by search.ts). The venue axis
  // (`venue.documentId`, Story 3.5) and the location axis (`venue.cityRef`
  // [`.region`]`.documentId`, Story 3.4) both live under the SAME `filters.venue`
  // object, so they must be merged into one object and assigned once — a second
  // `filters.venue = {...}` would clobber the first. Any subset may apply (AND).
  // Absent/empty values contribute no filter (all venues / all areas).
  if (params.venue || params.city || params.region) {
    const venue: Record<string, unknown> = {}
    if (params.venue) venue.documentId = params.venue
    if (params.city || params.region) {
      const cityRef: Record<string, unknown> = {}
      if (params.city) cityRef.documentId = params.city
      if (params.region) cityRef.region = { documentId: params.region }
      venue.cityRef = cityRef
    }
    filters.venue = venue
  }

  // Keyword search (Story 3.6): one top-level `$or` of case-insensitive
  // substring matches across the event's real, populated relations — the event
  // `title`, its screenings' `movie` (creative-work) title/originalTitle/
  // synopsis, and the `venue` name. Assigned once as `filters.$or` so it
  // AND-combines with `category`/`eventStatus`/`startDateTime`/`venue` above
  // (never touching `filters.venue`). A relation filter on the event query —
  // never a foreign-UID `strapi.documents()` call. Absent/blank ⇒ no keyword
  // filter (the controller trims blank/whitespace to `undefined`).
  if (params.q) {
    filters.$or = [
      { title: { $containsi: params.q } },
      { screenings: { movie: { title: { $containsi: params.q } } } },
      { screenings: { movie: { originalTitle: { $containsi: params.q } } } },
      { screenings: { movie: { synopsis: { $containsi: params.q } } } },
      { venue: { name: { $containsi: params.q } } },
    ]
  }

  return filters
}

function pageCountOf(total: number, pageSize: number): number {
  return pageSize > 0 ? Math.ceil(total / pageSize) : 0
}

/** Sum ticketsSold across an event's populated screenings (0 when none). */
function sumTicketsSold(event: {
  screenings?: Array<{ ticketsSold?: number | null }> | null
}): number {
  const screenings = Array.isArray(event.screenings) ? event.screenings : []
  return screenings.reduce(
    (acc, s) => acc + (typeof s?.ticketsSold === "number" ? s.ticketsSold : 0),
    0
  )
}

const eventsService = ({ strapi }: { strapi: Core.Strapi }) => {
  // DW-19: one cache instance per service. Strapi memoizes the plugin service, so
  // this closure (and its cache) persists across requests in prod; each unit test
  // builds a fresh service ⇒ no cache state leaks between tests. Keyed by
  // `locale|page|pageSize`, never the per-request `now`.
  const trendingCache = createTrendingCache<ListResult>({
    ttlMs: TRENDING_CACHE_TTL_MS,
  })

  return {
    /**
     * List published cinema events with pagination, filtering and populate.
     * Only published rows (`status: "published"`), MVP category `movie_screening`.
     */
    async findEvents(params: FindEventsParams): Promise<ListResult> {
      const { page, pageSize, sort, locale } = params
      const filters = buildFilters(params)

      // `sort` is constrained to a controller-side allowlist (z.enum) before it
      // reaches here, so an arbitrary/invalid field can never hit the Document
      // Service (which would otherwise throw → 500). The Document Service query
      // types derive field names from the generated registry, which is excluded
      // from this project's tsc compilation, so the params objects are still cast
      // (mirroring the existing `count` cast style).
      const [data, total] = await Promise.all([
        strapi.documents(EVENT_UID).findMany({
          status: "published",
          locale,
          filters,
          sort: sort ?? "startDateTime:asc",
          populate: EVENT_POPULATE,
          start: (page - 1) * pageSize,
          limit: pageSize,
        } as never),
        strapi.documents(EVENT_UID).count({
          status: "published",
          locale,
          filters,
        } as never),
      ])

      return {
        data,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: pageCountOf(total, pageSize),
            total,
          },
        },
      }
    },

    /**
     * Fetch a single published cinema event by documentId (null when absent).
     *
     * Document Service `findOne` cannot filter by field, so the MVP cinema scope
     * (`category = movie_screening`) is enforced after the fetch: a non-cinema
     * event is treated as not-found, keeping the detail endpoint consistent with
     * the list endpoint (both are cinema-only).
     */
    async findEvent(documentId: string, locale?: string) {
      const event = await strapi.documents(EVENT_UID).findOne({
        documentId,
        status: "published",
        locale,
        populate: DETAIL_POPULATE,
      } as never)

      if (
        !event ||
        (event as { category?: string }).category !== MVP_CATEGORY
      ) {
        return null
      }

      return event
    },

    /**
     * Trending = upcoming published cinema events ranked by
     * `sum(screening.ticketsSold)` desc.
     *
     * Strapi REST/Document Service cannot sort by a related aggregate, so we fetch
     * the upcoming window with screenings populated, sum in JS, sort desc, then
     * paginate. Events with no screenings sum to 0 (kept, ranked last).
     *
     * The fetch is bounded by `TRENDING_FETCH_CAP` and ordered by `startDateTime`
     * so the window is deterministic (the cap truncates the *furthest-out* events,
     * not an arbitrary set). Cancelled events are excluded — a cancelled show is
     * not "trending". Ties on summed sales are broken by `documentId` so
     * pagination is stable across requests. NOTE: at large scale the cap-then-rank
     * approach can miss a top seller beyond the cap; a DB-side rollup is the
     * proper long-term fix (see deferred-work.md).
     *
     * DW-19: the whole fetch+rank+paginate body is wrapped in a short-TTL,
     * single-flight cache keyed by `locale|page|pageSize` (never the per-request
     * `now`). A warm key returns without touching the Document Service; concurrent
     * cold-key callers collapse onto one compute. This is the primary
     * exhaustion mitigation (a per-IP rate limit is the secondary one on the route).
     */
    async findTrending(params: TrendingParams): Promise<ListResult> {
      const { page, pageSize, locale } = params

      // `encodeURIComponent(locale)` keeps the `|` field separator un-collidable:
      // a crafted locale can never bleed into the page/pageSize fields of the key.
      const cacheKey = `${encodeURIComponent(locale ?? "")}|${page}|${pageSize}`

      return trendingCache.getOrCompute(cacheKey, async () => {
        // `now` is per-compute (deliberately excluded from the cache key): within a
        // TTL we intentionally reuse a slightly-stale upcoming window.
        const now = new Date().toISOString()

        const events = await strapi.documents(EVENT_UID).findMany({
          status: "published",
          locale,
          filters: {
            category: MVP_CATEGORY,
            eventStatus: { $ne: "cancelled" },
            startDateTime: { $gte: now },
          },
          sort: "startDateTime:asc",
          populate: EVENT_POPULATE,
          limit: TRENDING_FETCH_CAP,
        } as never)

        // Observability for the silent-truncation risk: when the fetch fills the
        // cap, a top seller beyond it may be dropped. Surface it so operators can
        // see the stopgap straining — the durable DB-side rollup (deferred) is the
        // real fix.
        if (events.length >= TRENDING_FETCH_CAP) {
          strapi.log.warn(
            `[events-manager] findTrending hit TRENDING_FETCH_CAP (${TRENDING_FETCH_CAP}) rows; ` +
              `top sellers beyond the cap may be dropped. The DW-19 durable DB-side ` +
              `aggregate rollup (sort by materialized ticketsSold total) is the fix.`
          )
        }

        const ranked = [...events].sort((a, b) => {
          const diff = sumTicketsSold(b as never) - sumTicketsSold(a as never)
          if (diff !== 0) return diff
          // Stable secondary key so equal-sales events keep a fixed order across
          // requests (otherwise they could duplicate/skip across page boundaries).
          const aId = String((a as { documentId?: string }).documentId ?? "")
          const bId = String((b as { documentId?: string }).documentId ?? "")
          return aId.localeCompare(bId)
        })

        const total = ranked.length
        const start = (page - 1) * pageSize
        const data = ranked.slice(start, start + pageSize)

        return {
          data,
          meta: {
            pagination: {
              page,
              pageSize,
              pageCount: pageCountOf(total, pageSize),
              total,
            },
          },
        }
      })
    },
  }
}

export default eventsService
