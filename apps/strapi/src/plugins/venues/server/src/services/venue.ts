import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "venues"
const VENUE_UID = `plugin::${PLUGIN_ID}.venue` as const

/** Venue `type` enumeration (mirrors the content-type schema). */
export type VenueType =
  | "cinema"
  | "theater"
  | "cultural-center"
  | "museum"
  | "other"

/** Validated params accepted by {@link findVenuesForSelector}. */
export interface FindVenuesForSelectorParams {
  locale?: string
  type?: VenueType
  /** `cityRef.documentId` scope. */
  city?: string
  /** `cityRef.region.documentId` scope. */
  region?: string
  /** Force-add this venue to the page even when out of scope (active selection). */
  include?: string
  page: number
  pageSize: number
}

/** The only venue fields this route exposes. */
export interface SelectorVenue {
  documentId: string
  name: string
  type?: VenueType
  /** Denormalized from the populated `cityRef.name` (absent when unset). */
  city?: string
}

export interface SelectorResult {
  data: SelectorVenue[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

/** Minimal shape of a venue row read back from the Document Service. */
interface VenueRow {
  documentId: string
  name: string
  type?: VenueType
  status?: string
  cityRef?: { name?: string | null } | null
}

/** Only `cityRef.name` is needed — the picker renders the city beside the name. */
const SELECTOR_POPULATE = { cityRef: true } as const

/**
 * Approved-only filters for the picker, with the location axes merged into ONE
 * `cityRef` object so `city` + `region` AND-combine (a second `filters.cityRef`
 * assignment would clobber the first — same merge discipline the events service
 * uses for `filters.venue`).
 */
function buildSelectorFilters(params: {
  type?: VenueType
  city?: string
  region?: string
}): Record<string, unknown> {
  const filters: Record<string, unknown> = { status: { $eq: "approved" } }

  if (params.type) {
    filters.type = { $eq: params.type }
  }

  if (params.city || params.region) {
    const cityRef: Record<string, unknown> = {}
    if (params.city) cityRef.documentId = { $eq: params.city }
    if (params.region) cityRef.region = { documentId: { $eq: params.region } }
    filters.cityRef = cityRef
  }

  return filters
}

/** Project a raw venue row down to the four exposed selector fields. */
function toSelectorVenue(row: VenueRow): SelectorVenue {
  const city = row.cityRef?.name
  return {
    documentId: row.documentId,
    name: row.name,
    type: row.type,
    ...(typeof city === "string" && city.length > 0 ? { city } : {}),
  }
}

function pageCountOf(total: number, pageSize: number): number {
  return pageSize > 0 ? Math.ceil(total / pageSize) : 0
}

const venueService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find all venues with optional locale
   */
  async findVenues(locale?: string) {
    return strapi.documents(VENUE_UID).findMany({
      locale,
      sort: [{ name: "asc" }],
      populate: {
        geo: true,
      },
    })
  },

  /**
   * Find a single venue by documentId
   */
  async findVenue(documentId: string, locale?: string) {
    return strapi.documents(VENUE_UID).findOne({
      documentId,
      locale,
      populate: {
        geo: true,
        events: true,
      },
    })
  },

  /**
   * Venue picker feed (DW-24 / DW-25): approved-only, optionally scoped by
   * `type`/`city`/`region`, name-sorted, really paginated, with `cityRef`
   * populated so the UI can disambiguate same-named venues by city.
   *
   * `include` is an escape hatch for the user's ACTIVE selection (a venue whose
   * documentId came from the URL): when that venue is not already on the
   * returned page it is fetched separately and prepended, **even if it falls
   * outside the type/city/region scope**, so the trigger can label it. A
   * missing/unapproved `include` is silently ignored, and `include` never
   * inflates `total` (which stays the honest count of the scoped set).
   */
  async findVenuesForSelector(
    params: FindVenuesForSelectorParams
  ): Promise<SelectorResult> {
    const { locale, page, pageSize, include } = params
    const filters = buildSelectorFilters(params)

    // The Document Service query types derive field names from the generated
    // registry, which is excluded from this project's tsc compilation, so the
    // params objects are cast (mirroring the events service's `as never` style).
    const [rows, total] = await Promise.all([
      strapi.documents(VENUE_UID).findMany({
        locale,
        filters,
        sort: [{ name: "asc" }],
        populate: SELECTOR_POPULATE,
        start: (page - 1) * pageSize,
        limit: pageSize,
      } as never) as Promise<VenueRow[]>,
      strapi.documents(VENUE_UID).count({
        locale,
        filters,
      } as never) as Promise<number>,
    ])

    const data = (Array.isArray(rows) ? rows : []).map(toSelectorVenue)

    if (include && !data.some((v) => v.documentId === include)) {
      // Best-effort: the include is a convenience for labeling the active
      // selection, so a malformed id or an upstream failure must never discard
      // the page we already have (never a 404, never a 500 — the selection
      // simply stays unlabeled).
      let extra: VenueRow | null = null
      try {
        extra = (await strapi.documents(VENUE_UID).findOne({
          documentId: include,
          locale,
          populate: SELECTOR_POPULATE,
        } as never)) as VenueRow | null
      } catch (error) {
        strapi.log?.warn?.(
          `[venues:selector] include lookup failed for "${include}": ${error}`
        )
      }

      // Only an approved venue is labelable; anything else is ignored.
      if (extra && extra.status === "approved") {
        data.unshift(toSelectorVenue(extra))
      }
    }

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
})

export default venueService
