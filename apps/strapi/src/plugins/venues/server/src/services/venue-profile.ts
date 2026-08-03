/**
 * Venue-manager self-service profile (Story 7.2).
 *
 * TENANT ISOLATION IS A LOOKUP, NOT A CHECK. Both operations resolve the venue
 * by `manager: { id: user.id }`. There is no code path in which a documentId,
 * slug or manager id taken from the request reaches the Document Service, so
 * there is no ownership comparison to get wrong. The same shape the
 * `user-engagement` watchlist controllers use.
 *
 * PUBLISH-ON-SAVE, CONDITIONED ON `status`. `documents().update()` writes the
 * DRAFT only, so an approved venue's edits would never reach the public page
 * (which is pinned to `status: "published"` — 7.1's data-leak fix). Hence:
 * always update the draft, then `publish()` only when the venue's `status`
 * enum says `approved`, and the publish is non-fatal — losing the republish
 * must never turn a saved edit into an error the manager would answer by
 * saving again.
 *
 * WHAT SKIPPING THE REPUBLISH DOES AND DOES NOT DO. It keeps a `pending`
 * venue's edits out of the published copy, so a never-published venue stays
 * invisible. It is NOT a takedown: nothing here (or anywhere) unpublishes an
 * ALREADY-published venue when it is later suspended, so the public read owns
 * that gate — `findVenueBySlug` filters `status: { $ne: "suspended" }` on top
 * of the publication gate. Do not read the skip below as "a suspended venue is
 * invisible"; it is invisible because of that filter.
 */
import type { Core } from "@strapi/strapi"
import type {
  VenueProfileUpdateInput,
  VenuePropertyValueInput,
} from "../validation/profile"
import type {
  GeoPoint,
  MediaRef,
  VenueCityRef,
  VenuePropertyValue,
  VenueType,
} from "./venue"

import { UPDATABLE_VENUE_FIELDS } from "../validation/profile"
import {
  toCityRef,
  toGeoPoint,
  toMediaRef,
  toMediaRefs,
  toPropertyValues,
  VENUE_DETAIL_POPULATE,
} from "./venue"

const PLUGIN_ID = "venues"
const VENUE_UID = `plugin::${PLUGIN_ID}.venue` as const
const PROPERTY_DEFINITION_UID =
  `plugin::${PLUGIN_ID}.property-definition` as const

/**
 * Upper bound on the amenity-definition lookup. Comfortably above the schema's
 * `MAX_PROPERTIES` (100) and the seeded catalog (~17), so the read can never
 * come back short of the ids it was asked for. Sizing it to `ids.length`
 * instead is what turns a short read into a bogus `PROPERTY_DEFINITION_UNKNOWN`
 * that rejects an entirely valid save.
 */
const PROPERTY_DEFINITION_LOOKUP_LIMIT = 500

/** Error code: the caller has the manager role but manages no venue. */
export const VENUE_NOT_FOUND = "VENUE_NOT_FOUND"
/** Error code: `PUT /venues/me` carried no writable field. */
export const NO_FIELDS_TO_UPDATE = "NO_FIELDS_TO_UPDATE"
/** Error code: a `properties` entry names a definition that does not exist. */
export const PROPERTY_DEFINITION_UNKNOWN = "PROPERTY_DEFINITION_UNKNOWN"
/** Error code: a `properties` value does not match its definition's `type`. */
export const PROPERTY_VALUE_TYPE_MISMATCH = "PROPERTY_VALUE_TYPE_MISMATCH"
/** Error code: the Document Service write itself failed. */
export const VENUE_PROFILE_UPDATE_FAILED = "VENUE_PROFILE_UPDATE_FAILED"

/** Attach a stable error CODE to a thrown Error (mirrors `registration.ts`). */
function codedError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code })
}

/** The authenticated caller, narrowed to what this service actually uses. */
export interface VenueManagerUser {
  id: number | string
}

/**
 * The manager's own view of their venue. Same whitelist as the public
 * projection plus `status`, which the dashboard renders READ-ONLY (only a platform admin
 * transitions it — Epic 9). `manager` is still never emitted: the caller
 * already knows who they are, and echoing the relation would re-expose the
 * users-permissions record the public projection exists to hide.
 */
export interface ManagerVenue {
  documentId: string
  name: string
  slug?: string
  description?: string
  address?: string
  type?: VenueType
  status?: string
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

/** Explicit whitelist — see {@link ManagerVenue}. */
export function toManagerVenue(row: unknown): ManagerVenue | null {
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
    ...(optionalString(venue.status) !== undefined
      ? { status: venue.status as string }
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

/** Minimal shape the service needs off the raw draft row. */
interface VenueDraftRow {
  documentId: string
  status?: string
}

/**
 * Type-check one amenity entry against its definition and return the component
 * payload to persist. Exactly ONE typed slot survives per entry — sending
 * `integerValue` on a `boolean` definition is the matrix's mismatch row, and
 * silently keeping both slots would store a value the editor can never show.
 */
function toPropertyComponent(
  entry: VenuePropertyValueInput,
  definition: { documentId: string; type?: string; enumOptions?: unknown }
): Record<string, unknown> {
  const base = { definition: definition.documentId }

  switch (definition.type) {
    case "boolean": {
      const value = entry.booleanValue
      if (typeof value !== "boolean" && value !== null) {
        throw codedError(
          "Property value type mismatch",
          PROPERTY_VALUE_TYPE_MISMATCH
        )
      }
      return { ...base, booleanValue: value }
    }
    case "integer": {
      const value = entry.integerValue
      if (
        !(typeof value === "number" && Number.isInteger(value)) &&
        value !== null
      ) {
        throw codedError(
          "Property value type mismatch",
          PROPERTY_VALUE_TYPE_MISMATCH
        )
      }
      return { ...base, integerValue: value }
    }
    case "string": {
      const value = entry.stringValue
      if (typeof value !== "string" && value !== null) {
        throw codedError(
          "Property value type mismatch",
          PROPERTY_VALUE_TYPE_MISMATCH
        )
      }
      return { ...base, stringValue: value }
    }
    case "enum": {
      const value = entry.enumValue
      if (typeof value !== "string" && value !== null) {
        throw codedError(
          "Property value type mismatch",
          PROPERTY_VALUE_TYPE_MISMATCH
        )
      }
      // An out-of-catalog option is the same class of failure as a wrong slot:
      // a value the editor cannot render. Only enforced when the definition
      // actually declares options.
      const options = definition.enumOptions
      if (
        typeof value === "string" &&
        Array.isArray(options) &&
        options.length > 0 &&
        !options.includes(value)
      ) {
        throw codedError(
          "Property value type mismatch",
          PROPERTY_VALUE_TYPE_MISMATCH
        )
      }
      return { ...base, enumValue: value }
    }
    default:
      // A definition whose `type` is missing or unrecognized cannot be
      // validated, so nothing is accepted for it.
      throw codedError(
        "Property value type mismatch",
        PROPERTY_VALUE_TYPE_MISMATCH
      )
  }
}

const venueProfileService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * The caller's own venue DRAFT — the row `PUT /venues/me` writes, so the form
   * always renders what a save would modify (an approved venue's published
   * copy can lag behind by an edit).
   */
  async findVenueDraftForManager(
    user: VenueManagerUser
  ): Promise<VenueDraftRow | null> {
    const row = await strapi.documents(VENUE_UID).findFirst({
      filters: { manager: { id: { $eq: user.id } } },
      status: "draft",
      populate: VENUE_DETAIL_POPULATE,
    } as never)

    return (row as VenueDraftRow | null) ?? null
  },

  /** `GET /venues/me`. 404 (`VENUE_NOT_FOUND`) when the manager has no venue. */
  async getMyVenue(user: VenueManagerUser): Promise<ManagerVenue> {
    const row = await this.findVenueDraftForManager(user)

    const projected = row ? toManagerVenue(row) : null
    if (!projected) {
      throw codedError("Venue not found", VENUE_NOT_FOUND)
    }

    return projected
  },

  /**
   * Resolve every referenced property definition in ONE read, then type-check
   * each entry. An unknown documentId is a 400 (`PROPERTY_DEFINITION_UNKNOWN`)
   * rather than a silently dropped amenity.
   *
   * DUPLICATES ARE REJECTED, not merged. `properties` is a repeatable
   * component and this list REPLACES the stored one wholesale, so two entries
   * naming the same definition would persist two component rows for one
   * amenity — permanently, since every later read/edit round-trips both and the
   * editor renders one control per definition. There is no correct
   * reconciliation (which of the two values wins is not knowable), so the save
   * is refused with `PROPERTY_VALUE_TYPE_MISMATCH`.
   *
   * THE READ IS NOT BOUNDED BY THE ID COUNT. A `limit: ids.length` makes any
   * short read (a filter that matched fewer rows for any reason) report a
   * perfectly valid amenity as `PROPERTY_DEFINITION_UNKNOWN` and reject the
   * whole save. The limit is a generous constant instead, and every id is
   * asserted to have resolved before anything is built.
   */
  async buildPropertiesPayload(
    entries: VenuePropertyValueInput[]
  ): Promise<Record<string, unknown>[]> {
    if (entries.length === 0) return []

    const ids: string[] = []
    const seen = new Set<string>()
    for (const entry of entries) {
      if (seen.has(entry.definition)) {
        throw codedError(
          "Duplicate property definition",
          PROPERTY_VALUE_TYPE_MISMATCH
        )
      }
      seen.add(entry.definition)
      ids.push(entry.definition)
    }

    const definitions = (await strapi
      .documents(PROPERTY_DEFINITION_UID)
      .findMany({
        filters: { documentId: { $in: ids } },
        limit: PROPERTY_DEFINITION_LOOKUP_LIMIT,
      } as never)) as {
      documentId: string
      type?: string
      enumOptions?: unknown
    }[]

    const byId = new Map(
      (Array.isArray(definitions) ? definitions : []).map((d) => [
        d.documentId,
        d,
      ])
    )

    // Explicit completeness check: a partial read must not be mistaken for a
    // caller error about ONE amenity — either every referenced definition
    // resolved or nothing is written.
    if (ids.some((id) => !byId.has(id))) {
      throw codedError(
        "Property definition unknown",
        PROPERTY_DEFINITION_UNKNOWN
      )
    }

    return entries.map((entry) => {
      const definition = byId.get(entry.definition)
      if (!definition) {
        throw codedError(
          "Property definition unknown",
          PROPERTY_DEFINITION_UNKNOWN
        )
      }
      return toPropertyComponent(entry, definition)
    })
  },

  /**
   * `PUT /venues/me`. See the module docstring for the isolation and publish
   * rules. `status`, `slug`, `manager`, `events` and `documentId` are absent
   * from {@link UPDATABLE_VENUE_FIELDS}, so even a key that survived validation
   * cannot be written.
   */
  async updateMyVenue(
    user: VenueManagerUser,
    input: VenueProfileUpdateInput
  ): Promise<ManagerVenue> {
    const venue = await this.findVenueDraftForManager(user)
    if (!venue) {
      throw codedError("Venue not found", VENUE_NOT_FOUND)
    }

    // Rebuild the payload from the whitelist rather than forwarding `input`.
    const data: Record<string, unknown> = {}
    for (const field of UPDATABLE_VENUE_FIELDS) {
      const value = (input as Record<string, unknown>)[field]
      if (value === undefined) continue
      if (field === "properties") continue
      data[field] = value
    }

    if (input.properties !== undefined) {
      data.properties = await this.buildPropertiesPayload(input.properties)
    }

    // The matrix pins the empty payload at its OWN code, so it cannot be a Zod
    // refine (everything `validate()` rejects is `VALIDATION_FAILED`).
    if (Object.keys(data).length === 0) {
      throw codedError("No fields to update", NO_FIELDS_TO_UPDATE)
    }

    let updated: unknown
    try {
      updated = await strapi.documents(VENUE_UID).update({
        documentId: venue.documentId,
        data,
        populate: VENUE_DETAIL_POPULATE,
      } as never)
    } catch (err) {
      strapi.log.error(
        `[venues:profile] venue update failed for ${venue.documentId}: ${err}`
      )
      throw codedError(
        "Venue profile update failed",
        VENUE_PROFILE_UPDATE_FAILED
      )
    }

    // Only an APPROVED venue is republished; a pending/suspended one keeps its
    // edits in the draft. For a `pending` venue that is the whole story (it was
    // never published). For a `suspended` one it is NOT — an earlier publish
    // survives this call, and the public gate is `findVenueBySlug`'s
    // `status: { $ne: "suspended" }` filter.
    if (venue.status === "approved") {
      try {
        await strapi.documents(VENUE_UID).publish({
          documentId: venue.documentId,
        } as never)
      } catch (err) {
        // Non-fatal by design: the draft IS saved, and failing the request here
        // would tell the manager their edit was lost when it was not.
        strapi.log.error(
          `[venues:profile] publish after profile update failed for ${venue.documentId}: ${err}`
        )
      }
    }

    const projected = toManagerVenue(updated)
    if (!projected) {
      strapi.log.error(
        `[venues:profile] update returned an unprojectable row for ${venue.documentId}`
      )
      throw codedError(
        "Venue profile update failed",
        VENUE_PROFILE_UPDATE_FAILED
      )
    }

    return projected
  },
})

export default venueProfileService
