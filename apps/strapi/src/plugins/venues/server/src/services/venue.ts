import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "venues"
const VENUE_UID = `plugin::${PLUGIN_ID}.venue` as const
const PROPERTY_DEFINITION_UID =
  `plugin::${PLUGIN_ID}.property-definition` as const

/**
 * Upper bound on the localized property-definition re-read. Comfortably above
 * the seeded catalog (~17 definitions) and above `MAX_PROPERTIES` (100), so the
 * lookup can never come back SHORT and silently drop a label — a bound sized to
 * the id list is exactly the bug this constant exists to avoid.
 */
const PROPERTY_DEFINITION_LOOKUP_LIMIT = 500

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

/* -------------------------------------------------------------------------- */
/* Shared detail projections (story 7.2)                                       */
/* -------------------------------------------------------------------------- */

/** An uploaded file as the client needs it: enough to preview and to resubmit. */
export interface MediaRef {
  /** Upload file id — the value `PUT /venues/me` expects back for `logo`. */
  id: number
  url: string
  name?: string
  alternativeText?: string | null
  width?: number
  height?: number
}

/** `shared.geo-point` coordinates. */
export interface GeoPoint {
  latitude: number
  longitude: number
}

/** A property-definition as embedded in a venue's amenity list. */
export interface PropertyDefinitionRef {
  documentId: string
  name?: string
  slug?: string
  type?: string
  enumOptions?: unknown
}

/** One amenity value attached to a venue. */
export interface VenuePropertyValue {
  definition: PropertyDefinitionRef | null
  booleanValue?: boolean | null
  integerValue?: number | null
  stringValue?: string | null
  enumValue?: string | null
}

/** The venue's city, denormalized from `cityRef`. */
export interface VenueCityRef {
  documentId: string
  name?: string
  slug?: string
}

/**
 * The ONLY fields a public (unauthenticated) venue read exposes. `manager` and
 * `status` are absent by construction — this is a whitelist, not a blacklist,
 * so a future schema attribute cannot leak by being forgotten.
 */
export interface PublicVenue {
  documentId: string
  name: string
  slug?: string
  description?: string
  address?: string
  type?: VenueType
  phone?: string
  email?: string
  website?: string
  capacity?: number
  geo: GeoPoint | null
  logo: MediaRef | null
  images: MediaRef[]
  city: VenueCityRef | null
  properties: VenuePropertyValue[]
}

/**
 * Everything a venue detail projection reads. Shared by the public slug read
 * and the manager's own `/venues/me` read so the two can never drift.
 */
export const VENUE_DETAIL_POPULATE = {
  geo: true,
  logo: true,
  images: true,
  cityRef: true,
  properties: { populate: { definition: true } },
} as const

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

/** Project one populated upload file. Anything unusable becomes `null`. */
export function toMediaRef(value: unknown): MediaRef | null {
  const row = asRecord(value)
  if (!row) return null

  const id = optionalNumber(row.id)
  const url = optionalString(row.url)
  if (id === undefined || url === undefined) return null

  return {
    id,
    url,
    ...(optionalString(row.name) !== undefined
      ? { name: row.name as string }
      : {}),
    ...(typeof row.alternativeText === "string" || row.alternativeText === null
      ? { alternativeText: row.alternativeText as string | null }
      : {}),
    ...(optionalNumber(row.width) !== undefined
      ? { width: row.width as number }
      : {}),
    ...(optionalNumber(row.height) !== undefined
      ? { height: row.height as number }
      : {}),
  }
}

/** Project a multiple-media attribute, dropping entries that project to null. */
export function toMediaRefs(value: unknown): MediaRef[] {
  if (!Array.isArray(value)) return []
  return value
    .map(toMediaRef)
    .filter((media): media is MediaRef => media !== null)
}

/** Project `shared.geo-point`. Partial coordinates are treated as absent. */
export function toGeoPoint(value: unknown): GeoPoint | null {
  const row = asRecord(value)
  if (!row) return null

  const latitude = optionalNumber(row.latitude)
  const longitude = optionalNumber(row.longitude)
  if (latitude === undefined || longitude === undefined) return null

  return { latitude, longitude }
}

/** Project the `cityRef` relation. */
export function toCityRef(value: unknown): VenueCityRef | null {
  const row = asRecord(value)
  if (!row) return null

  const documentId = optionalString(row.documentId)
  if (documentId === undefined) return null

  return {
    documentId,
    ...(optionalString(row.name) !== undefined
      ? { name: row.name as string }
      : {}),
    ...(optionalString(row.slug) !== undefined
      ? { slug: row.slug as string }
      : {}),
  }
}

/** Project the repeatable `entity-properties.property-value` component. */
export function toPropertyValues(value: unknown): VenuePropertyValue[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry): VenuePropertyValue[] => {
    const row = asRecord(entry)
    if (!row) return []

    const definitionRow = asRecord(row.definition)
    const definitionId = definitionRow
      ? optionalString(definitionRow.documentId)
      : undefined

    const definition: PropertyDefinitionRef | null =
      definitionRow && definitionId !== undefined
        ? {
            documentId: definitionId,
            ...(optionalString(definitionRow.name) !== undefined
              ? { name: definitionRow.name as string }
              : {}),
            ...(optionalString(definitionRow.slug) !== undefined
              ? { slug: definitionRow.slug as string }
              : {}),
            ...(optionalString(definitionRow.type) !== undefined
              ? { type: definitionRow.type as string }
              : {}),
            ...(definitionRow.enumOptions !== undefined &&
            definitionRow.enumOptions !== null
              ? { enumOptions: definitionRow.enumOptions }
              : {}),
          }
        : null

    return [
      {
        definition,
        ...(row.booleanValue !== undefined
          ? { booleanValue: row.booleanValue as boolean | null }
          : {}),
        ...(row.integerValue !== undefined
          ? { integerValue: row.integerValue as number | null }
          : {}),
        ...(row.stringValue !== undefined
          ? { stringValue: row.stringValue as string | null }
          : {}),
        ...(row.enumValue !== undefined
          ? { enumValue: row.enumValue as string | null }
          : {}),
      },
    ]
  })
}

/**
 * Explicit public whitelist. `manager` (a users-permissions user carrying an
 * email and a password hash) and `status` NEVER appear, and no internal numeric
 * entity id is emitted — the only numeric ids that survive are upload file ids,
 * which the client needs to re-submit a media selection and which the upload
 * plugin already serves publicly.
 */
export function toPublicVenue(row: unknown): PublicVenue | null {
  const venue = asRecord(row)
  if (!venue) return null

  const documentId = optionalString(venue.documentId)
  const name = optionalString(venue.name)
  if (documentId === undefined || name === undefined) return null

  return {
    documentId,
    name,
    ...(optionalString(venue.slug) !== undefined
      ? { slug: venue.slug as string }
      : {}),
    ...(optionalString(venue.description) !== undefined
      ? { description: venue.description as string }
      : {}),
    ...(optionalString(venue.address) !== undefined
      ? { address: venue.address as string }
      : {}),
    ...(optionalString(venue.type) !== undefined
      ? { type: venue.type as VenueType }
      : {}),
    ...(optionalString(venue.phone) !== undefined
      ? { phone: venue.phone as string }
      : {}),
    ...(optionalString(venue.email) !== undefined
      ? { email: venue.email as string }
      : {}),
    ...(optionalString(venue.website) !== undefined
      ? { website: venue.website as string }
      : {}),
    ...(optionalNumber(venue.capacity) !== undefined
      ? { capacity: venue.capacity as number }
      : {}),
    geo: toGeoPoint(venue.geo),
    logo: toMediaRef(venue.logo),
    images: toMediaRefs(venue.images),
    city: toCityRef(venue.cityRef),
    properties: toPropertyValues(venue.properties),
  }
}

/**
 * Overlay the requested locale's `name` / `enumOptions` onto an already
 * projected amenity list.
 *
 * WHY THIS EXISTS: `property-definition` is a LOCALIZED content type,
 * `venue` is not. Populating `properties.definition` through a venue read
 * therefore always yields the DEFAULT-locale definition rows, so an Arabic or
 * French public page would render English amenity labels. The authenticated
 * catalog route (`services/property-catalog.ts`) forwards `locale` to its own
 * read and gets this right; the public slug read has to re-resolve.
 *
 * Deliberately FAIL-SOFT: a label is not worth a 500. If the second read fails
 * the default-locale labels stand and the failure is logged.
 *
 * Mutates `properties` in place — it is the freshly-built projection, never a
 * caller-owned object.
 */
async function localizePropertyDefinitions(
  strapi: Core.Strapi,
  properties: VenuePropertyValue[],
  locale: string
): Promise<void> {
  const ids = Array.from(
    new Set(
      properties
        .map((p) => p.definition?.documentId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  )
  if (ids.length === 0) return

  let rows: unknown
  try {
    rows = await strapi.documents(PROPERTY_DEFINITION_UID).findMany({
      filters: { documentId: { $in: ids } },
      locale,
      limit: PROPERTY_DEFINITION_LOOKUP_LIMIT,
    } as never)
  } catch (error) {
    strapi.log?.warn?.(
      `[venues] localized property-definition lookup failed for locale "${locale}": ${error}`
    )
    return
  }

  const byId = new Map<string, Record<string, unknown>>()
  for (const row of Array.isArray(rows) ? rows : []) {
    const record = asRecord(row)
    const documentId = record ? optionalString(record.documentId) : undefined
    if (record && documentId !== undefined) byId.set(documentId, record)
  }

  for (const property of properties) {
    const documentId = property.definition?.documentId
    const localized = documentId ? byId.get(documentId) : undefined
    if (!property.definition || !localized) continue

    const name = optionalString(localized.name)
    if (name !== undefined) property.definition.name = name
    if (localized.enumOptions !== undefined && localized.enumOptions !== null) {
      property.definition.enumOptions = localized.enumOptions
    }
  }
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
   * Find all venues with optional locale.
   *
   * `status: "published"` is LOAD-BEARING, not decoration. `GET /venues` is
   * `auth: false`, and `@strapi/core`'s `defaultToDraft` makes an omitted
   * `status` mean **draft** — so without this every anonymously-created venue
   * application (story 7.1 inserts them as drafts carrying the applicant's
   * phone, email and address) would be world-readable. Registration never
   * publishes; the seed does. Gating on the publication state rather than the
   * `status` ENUM is deliberate: `SEED_VENUES` never sets that enum, so an
   * `approved`-enum filter here would return nothing at all.
   */
  async findVenues(locale?: string) {
    return strapi.documents(VENUE_UID).findMany({
      locale,
      status: "published",
      sort: [{ name: "asc" }],
      populate: {
        geo: true,
      },
    })
  },

  /**
   * Find a single venue by documentId. `status: "published"` for the same
   * reason as {@link findVenues} — this route is public and an omitted status
   * would resolve to the DRAFT document.
   */
  async findVenue(documentId: string, locale?: string) {
    return strapi.documents(VENUE_UID).findOne({
      documentId,
      locale,
      status: "published",
      populate: {
        geo: true,
        events: true,
      },
    })
  },

  /**
   * Public venue page read by `slug` (Story 7.2). Added ALONGSIDE the three
   * readers above rather than by touching them: 7.1's review pinned their
   * `status` params to close a data leak, and that pin must not regress.
   *
   * TWO INDEPENDENT GATES, both load-bearing:
   *
   * 1. `status: "published"` (the PUBLICATION state). The route is
   *    `auth: false` and an omitted status resolves to the DRAFT document,
   *    i.e. exactly the anonymously-created applications carrying the
   *    applicant's phone, email and address.
   * 2. `filters.status: { $ne: "suspended" }` (the ENUM). Nothing anywhere
   *    unpublishes a venue when it is suspended — `updateMyVenue` merely skips
   *    the republish — so an already-published venue that is later suspended
   *    would otherwise stay fully public forever. The gate is a `$ne` and NOT
   *    `$eq: "approved"` on purpose: `SEED_VENUES` never sets that enum
   *    (DW-211), so an approved-only filter would empty the public page for
   *    every seeded venue.
   *
   * What that combination means precisely: a SUSPENDED venue 404s and an
   * unpublished (`pending`) venue 404s, but only the enum gate is a positive
   * takedown — a suspended slug is indistinguishable from an unknown one only
   * because both return the same `VENUE_NOT_FOUND`, not because the row is
   * unreachable.
   *
   * Returns the WHITELISTED projection, never the raw row.
   */
  async findVenueBySlug(
    slug: string,
    locale?: string
  ): Promise<PublicVenue | null> {
    const row = await strapi.documents(VENUE_UID).findFirst({
      filters: { slug: { $eq: slug }, status: { $ne: "suspended" } },
      locale,
      status: "published",
      populate: VENUE_DETAIL_POPULATE,
    } as never)

    const projected = row ? toPublicVenue(row) : null
    if (!projected) return null

    // Amenity LABELS live on `property-definition`, which IS localized, while
    // `venue` is not — so the populated `properties.definition` above always
    // comes back in the DEFAULT locale regardless of `locale`. Re-resolve the
    // referenced definitions in the requested locale and overlay their labels
    // (same read `services/property-catalog.ts` uses for the authenticated
    // catalog route).
    if (locale) {
      await localizePropertyDefinitions(strapi, projected.properties, locale)
    }

    return projected
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
