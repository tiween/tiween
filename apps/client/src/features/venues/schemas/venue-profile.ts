import { z } from "zod"

import type { VenueType } from "./venue-registration"

import {
  isValidWebsiteUrl,
  MAX_IMAGES,
  VENUE_TYPES,
  WEBSITE_URL_MAX_LENGTH,
} from "./venue-registration"

/**
 * Venue Profile Management schemas (Story 7.2).
 *
 * Client mirror of
 * `apps/strapi/src/plugins/venues/server/src/validation/profile.ts` — SAME field
 * shapes, SAME SCREAMING_SNAKE error CODES — so one vocabulary crosses the wire
 * and `venues.profile.errors.<CODE>` translates both the locally-produced field
 * errors and any code relayed back by Strapi.
 *
 * Everything reusable is IMPORTED from `venue-registration.ts` (the media
 * limits, the website rule, the type enum). Re-declaring them here is how the
 * registration and profile surfaces would silently drift apart.
 *
 * Three shapes, on purpose:
 *  - {@link venueProfileFormSchema} is the FLAT shape react-hook-form binds to,
 *    where every field's Zod INPUT type equals its OUTPUT type (no
 *    `z.preprocess`, no type-changing `.transform`) — a schema whose parsed
 *    output differs from its input makes `useForm`/`zodResolver`/`AppForm`
 *    disagree about the bound type;
 *  - {@link venueProfileUpdateSchema} is the WIRE shape `PUT /venues/me`
 *    accepts; and
 *  - {@link toVenueProfileUpdatePayload} is the single conversion between them,
 *    emitting only the fields that actually CHANGED (the endpoint answers 400
 *    `NO_FIELDS_TO_UPDATE` on an empty body, and a full-object PUT would
 *    needlessly rewrite — and republish — untouched columns).
 */

export {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_TYPES_ATTR,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  VENUE_TYPES,
} from "./venue-registration"
export type { VenueType } from "./venue-registration"

/** The venue `status` enum. READ-ONLY for a manager — only Epic 9 moves it. */
export const VENUE_STATUSES = ["pending", "approved", "suspended"] as const

export type VenueStatus = (typeof VENUE_STATUSES)[number]

/** Upper bound on the amenity array (mirrors the backend). */
const MAX_PROPERTIES = 100

/** Max value the capacity field accepts (mirrors the backend). */
const MAX_CAPACITY = 1_000_000

/* -------------------------------------------------------------------------- */
/* Read model — the shapes GET /venues/me and GET /venues/by-slug return        */
/* -------------------------------------------------------------------------- */

/** An uploaded file: enough to preview it and to resubmit it by id. */
export interface VenueMediaRef {
  id: number
  url: string
  name?: string
  alternativeText?: string | null
  width?: number
  height?: number
}

/** `shared.geo-point` coordinates. */
export interface VenueGeoPoint {
  latitude: number
  longitude: number
}

/**
 * Wrap a longitude back into ±180.
 *
 * Leaflet does NOT clamp: panning past the date line keeps counting, so a pin
 * dropped one world-copy to the east reports e.g. `190.25`, which is the same
 * physical place as `-169.75` but fails both the form and the wire schema with
 * `VENUE_GEO_INVALID`. Since `geo` is set exclusively by dragging a pin, that
 * error has no field to render under and Save simply appears dead. Normalizing
 * at the point where the picker writes into the form removes the failure mode
 * instead of reporting it.
 */
export function normalizeLongitude(longitude: number): number {
  return ((longitude + 540) % 360) - 180
}

/** {@link normalizeLongitude}, applied to a coordinate pair. */
export function normalizeGeoPoint(geo: VenueGeoPoint): VenueGeoPoint {
  return {
    latitude: geo.latitude,
    longitude: normalizeLongitude(geo.longitude),
  }
}

/** A property-definition as embedded in a venue's amenity list. */
export interface VenuePropertyDefinitionRef {
  documentId: string
  name?: string
  slug?: string
  type?: string
  enumOptions?: unknown
}

/** One amenity value attached to a venue. */
export interface VenuePropertyValue {
  definition: VenuePropertyDefinitionRef | null
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
 * The public projection (`GET /venues/by-slug/:slug`). `manager` and `status`
 * are absent by construction — the backend whitelists, it does not blacklist.
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
  geo: VenueGeoPoint | null
  logo: VenueMediaRef | null
  images: VenueMediaRef[]
  city: VenueCityRef | null
  properties: VenuePropertyValue[]
}

/**
 * The manager's own view (`GET /venues/me`): the public projection plus the
 * READ-ONLY `status`. `geo`, `logo`, `images`, `city` and `properties` are
 * ALWAYS present (null / `[]`); every other optional key is ABSENT when unset,
 * never null.
 */
export interface ManagerVenue extends PublicVenue {
  status?: VenueStatus
}

/** One amenity the manager can set, as served by the catalog route. */
export interface PropertyDefinitionEntry {
  documentId: string
  name?: string
  slug?: string
  /** `boolean` | `integer` | `string` | `enum` — decides the rendered control. */
  type?: string
  description?: string
  icon?: string
  enumOptions?: unknown
  sortOrder: number
}

/** A group of amenities, as rendered by the editor. */
export interface PropertyCategoryEntry {
  documentId: string
  name?: string
  slug?: string
  icon?: string
  sortOrder: number
  /** Parent category SLUG (not an id), or `null` for a top-level group. */
  parent: string | null
  definitions: PropertyDefinitionEntry[]
}

/**
 * Narrow a definition's `type` to the four the editor can render. Anything else
 * (a definition seeded with an unknown type) yields `undefined` and is skipped
 * rather than rendered as an uncontrolled free-text box the backend would then
 * reject with `PROPERTY_VALUE_TYPE_MISMATCH`.
 */
export function propertyControlType(
  type: string | undefined
): "boolean" | "integer" | "string" | "enum" | undefined {
  return type === "boolean" ||
    type === "integer" ||
    type === "string" ||
    type === "enum"
    ? type
    : undefined
}

/** The `enumOptions` json column, narrowed to the string list the UI renders. */
export function propertyEnumOptions(enumOptions: unknown): string[] {
  return Array.isArray(enumOptions)
    ? enumOptions.filter((o): o is string => typeof o === "string")
    : []
}

/* -------------------------------------------------------------------------- */
/* Wire schema — the body PUT /venues/me accepts                               */
/* -------------------------------------------------------------------------- */

/** A Strapi upload file id (produced by the upload step). */
const fileId = z.number().int().positive()

/**
 * Blank text is CLEARING (`null`), not absent — a manager must be able to erase
 * a description or a phone number they no longer want published. Mirrors the
 * backend's `clearableText`.
 */
const clearableText = (max: number, code: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
    z.string().max(max, code).nullable().optional()
  )

const propertyValueSchema = z.object({
  definition: z
    .string({ required_error: "PROPERTY_DEFINITION_REQUIRED" })
    .trim()
    .min(1, "PROPERTY_DEFINITION_REQUIRED")
    .max(255, "PROPERTY_DEFINITION_REQUIRED"),
  booleanValue: z.boolean().nullable().optional(),
  integerValue: z
    .number()
    .int("PROPERTY_VALUE_TYPE_MISMATCH")
    .nullable()
    .optional(),
  stringValue: z
    .string()
    .max(255, "PROPERTY_VALUE_TOO_LONG")
    .nullable()
    .optional(),
  enumValue: z
    .string()
    .max(255, "PROPERTY_VALUE_TOO_LONG")
    .nullable()
    .optional(),
})

export type VenuePropertyValueInput = z.infer<typeof propertyValueSchema>

/**
 * The accepted `PUT /venues/me` body. `documentId`, `slug`, `manager`,
 * `status` and `events` are deliberately ABSENT: the venue is derived from the
 * caller's JWT, never from the request, and the backend strips them anyway.
 */
export const venueProfileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "VENUE_NAME_REQUIRED")
    .max(200, "VENUE_NAME_TOO_LONG")
    .optional(),
  description: clearableText(5000, "VENUE_DESCRIPTION_TOO_LONG"),
  address: z
    .string()
    .trim()
    .min(1, "VENUE_ADDRESS_REQUIRED")
    .max(500, "VENUE_ADDRESS_TOO_LONG")
    .optional(),
  type: z
    .enum(VENUE_TYPES, { errorMap: () => ({ message: "VENUE_TYPE_INVALID" }) })
    .optional(),
  phone: clearableText(30, "VENUE_PHONE_TOO_LONG"),
  email: z
    .string()
    .trim()
    .min(1, "VENUE_EMAIL_REQUIRED")
    .email("VENUE_EMAIL_INVALID")
    .optional(),
  // `website` uses the CANONICAL `isValidWebsiteUrl`, never Zod's `.url()`:
  // the two disagree (`.url()` accepts `ftp://…`, `javascript:…`,
  // `http://sub_domain.tn`) and the venues DB lifecycle rejects exactly those,
  // so a looser check here turns a fixable 400 into an opaque write failure.
  website: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
    z
      .string()
      .max(WEBSITE_URL_MAX_LENGTH, "VENUE_WEBSITE_TOO_LONG")
      .refine(isValidWebsiteUrl, "VENUE_WEBSITE_INVALID")
      .nullable()
      .optional()
  ),
  capacity: z
    .number()
    .int("VENUE_CAPACITY_INVALID")
    .positive("VENUE_CAPACITY_INVALID")
    .max(MAX_CAPACITY, "VENUE_CAPACITY_INVALID")
    .nullable()
    .optional(),
  geo: z
    .object({
      latitude: z
        .number()
        .min(-90, "VENUE_GEO_INVALID")
        .max(90, "VENUE_GEO_INVALID"),
      longitude: z
        .number()
        .min(-180, "VENUE_GEO_INVALID")
        .max(180, "VENUE_GEO_INVALID"),
    })
    .nullable()
    .optional(),
  logo: fileId.nullable().optional(),
  images: z.array(fileId).max(MAX_IMAGES, "VENUE_IMAGES_TOO_MANY").optional(),
  properties: z
    .array(propertyValueSchema)
    .max(MAX_PROPERTIES, "VENUE_PROPERTIES_TOO_MANY")
    .optional(),
})

export type VenueProfileUpdatePayload = z.infer<typeof venueProfileUpdateSchema>

/* -------------------------------------------------------------------------- */
/* Form schema — the flat shape react-hook-form binds to                       */
/* -------------------------------------------------------------------------- */

/**
 * The venue `type` as the SELECT actually holds it: one of the enum members, or
 * `""` while nothing is picked. Modeled explicitly rather than laundered
 * through a cast — a venue whose `type` failed to populate really does reach
 * the form unset, and pretending otherwise only moved the lie into the types.
 */
export const VENUE_TYPE_UNSET = ""

export const VENUE_TYPE_FORM_VALUES = [
  ...VENUE_TYPES,
  VENUE_TYPE_UNSET,
] as const

/** `VenueType | ""` — the form-bound widening of the venue type enum. */
export type VenueTypeFormValue = (typeof VENUE_TYPE_FORM_VALUES)[number]

/**
 * Every field is a STRING (or the geo object the map picker writes) so the Zod
 * input and output types match — see the module docstring. `capacity` stays the
 * raw input string and is converted in {@link toVenueProfileUpdatePayload}.
 *
 * REQUIRED here means required on the wire too: `name`, `address`, `type` and
 * `email` are all non-nullable columns the backend keeps required-if-present,
 * so blanking one CANNOT be sent as a clear. The diff payload would silently
 * omit it and the manager would get a success toast over an unchanged public
 * page — hence a rendered field error instead. Every genuinely optional field
 * still accepts blank, which means "clear it".
 */
export const venueProfileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "VENUE_NAME_REQUIRED")
    .max(200, "VENUE_NAME_TOO_LONG"),
  description: z.string().trim().max(5000, "VENUE_DESCRIPTION_TOO_LONG"),
  address: z
    .string()
    .trim()
    .min(1, "VENUE_ADDRESS_REQUIRED")
    .max(500, "VENUE_ADDRESS_TOO_LONG"),
  // The refine is a plain boolean predicate on purpose (never a type guard):
  // narrowing the OUTPUT to `VenueType` would make the schema's input and
  // output types disagree, which is exactly what `useForm`/`zodResolver` cannot
  // bind to.
  type: z
    .enum(VENUE_TYPE_FORM_VALUES, {
      errorMap: () => ({ message: "VENUE_TYPE_INVALID" }),
    })
    // The return type is annotated so TS 5.5's inferred type predicates do NOT
    // narrow the refine into `value is VenueType`: that would make the schema's
    // OUTPUT type drop `""` while its input keeps it, and `useForm` /
    // `zodResolver` / `AppForm` would then disagree about the bound field type.
    .refine((value): boolean => value !== VENUE_TYPE_UNSET, {
      message: "VENUE_TYPE_INVALID",
    }),
  phone: z.string().trim().max(30, "VENUE_PHONE_TOO_LONG"),
  // REQUIRED: the wire has no `null` for `email`, so a blanked one would be
  // dropped from the diff and reported as a successful save. See the schema's
  // docstring.
  email: z
    .string()
    .trim()
    .min(1, "VENUE_EMAIL_REQUIRED")
    .refine((v) => z.string().email().safeParse(v).success, {
      message: "VENUE_EMAIL_INVALID",
    }),
  website: z
    .string()
    .trim()
    .max(WEBSITE_URL_MAX_LENGTH, "VENUE_WEBSITE_TOO_LONG")
    .refine((v) => isValidWebsiteUrl(v), { message: "VENUE_WEBSITE_INVALID" }),
  capacity: z
    .string()
    .trim()
    .refine(
      (v) =>
        !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= MAX_CAPACITY),
      { message: "VENUE_CAPACITY_INVALID" }
    ),
  geo: z
    .object({
      latitude: z
        .number()
        .min(-90, "VENUE_GEO_INVALID")
        .max(90, "VENUE_GEO_INVALID"),
      longitude: z
        .number()
        .min(-180, "VENUE_GEO_INVALID")
        .max(180, "VENUE_GEO_INVALID"),
    })
    .nullable(),
})

export type VenueProfileFormValues = z.infer<typeof venueProfileFormSchema>

/** Seed the form from the venue the API returned. Absent keys become `""`. */
export function toVenueProfileFormValues(
  venue: ManagerVenue
): VenueProfileFormValues {
  return {
    name: venue.name ?? "",
    description: venue.description ?? "",
    address: venue.address ?? "",
    // A venue with no `type` cannot happen through registration, but the field
    // must still have a DEFINED default or the Radix select flips from
    // uncontrolled to controlled on the first pick — hence the honest
    // `VenueType | ""` union rather than a cast.
    type: venue.type ?? VENUE_TYPE_UNSET,
    phone: venue.phone ?? "",
    email: venue.email ?? "",
    website: venue.website ?? "",
    capacity: venue.capacity != null ? String(venue.capacity) : "",
    geo: venue.geo ?? null,
  }
}

/** Media / amenity changes folded in alongside the text fields on submit. */
export interface VenueProfileUpdateExtras {
  /** New logo file id, or `null` to detach the current one. */
  logo?: number | null
  /**
   * Replacement photo id list — omit to leave the current photos alone, `[]` to
   * remove all of them (the array is a REPLACEMENT on the wire).
   */
  images?: number[]
  /** Amenity values, when the manager touched the editor. */
  properties?: VenuePropertyValueInput[]
}

/** Empty string / absent are the same "unset" for a text column. */
function sameText(current: string | undefined, next: string): boolean {
  return (current ?? "") === next
}

function sameGeo(
  current: VenueGeoPoint | null,
  next: VenueGeoPoint | null
): boolean {
  if (current === null || next === null) return current === next
  return (
    current.latitude === next.latitude && current.longitude === next.longitude
  )
}

/**
 * Fold the flat form values into the PARTIAL wire payload, keeping only what
 * actually changed against `current`.
 *
 * A blank optional field whose stored value was non-empty becomes `null`
 * (clear); a blank field that was already unset is omitted entirely, so merely
 * opening and re-saving the form does not rewrite every column.
 */
export function toVenueProfileUpdatePayload(
  values: VenueProfileFormValues,
  current: ManagerVenue,
  extras: VenueProfileUpdateExtras = {}
): VenueProfileUpdatePayload {
  const payload: VenueProfileUpdatePayload = {}

  if (!sameText(current.name, values.name)) payload.name = values.name
  if (!sameText(current.address, values.address))
    payload.address = values.address
  if (values.type && current.type !== values.type) payload.type = values.type

  if (!sameText(current.description, values.description)) {
    payload.description = values.description === "" ? null : values.description
  }
  if (!sameText(current.phone, values.phone)) {
    payload.phone = values.phone === "" ? null : values.phone
  }
  if (!sameText(current.website, values.website)) {
    payload.website = values.website === "" ? null : values.website
  }
  // `email` has no `null` on the wire (the backend keeps it required-if-present),
  // so a blank one is never sent. The form schema rejects a blanked email
  // outright, so this guard is belt-and-braces for direct callers.
  if (!sameText(current.email, values.email) && values.email !== "") {
    payload.email = values.email
  }

  const currentCapacity =
    current.capacity != null ? String(current.capacity) : ""
  if (currentCapacity !== values.capacity) {
    payload.capacity = values.capacity === "" ? null : Number(values.capacity)
  }

  if (!sameGeo(current.geo, values.geo)) payload.geo = values.geo

  if (extras.logo !== undefined) payload.logo = extras.logo
  if (extras.images !== undefined) payload.images = extras.images
  if (extras.properties !== undefined) payload.properties = extras.properties

  return payload
}

/* -------------------------------------------------------------------------- */
/* Error vocabulary                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Every error CODE this flow can surface, backend codes included. The UI maps
 * each to `venues.profile.errors.<CODE>`; keeping the list here means a new
 * code cannot be added without a translation existing for it (the schema test
 * pins the set against the catalogs).
 */
export const VENUE_PROFILE_ERROR_CODES = [
  // Field validation — shared verbatim with registration.
  "VENUE_NAME_REQUIRED",
  "VENUE_NAME_TOO_LONG",
  "VENUE_DESCRIPTION_TOO_LONG",
  "VENUE_ADDRESS_REQUIRED",
  "VENUE_ADDRESS_TOO_LONG",
  "VENUE_TYPE_INVALID",
  "VENUE_PHONE_TOO_LONG",
  "VENUE_EMAIL_REQUIRED",
  "VENUE_EMAIL_INVALID",
  "VENUE_WEBSITE_INVALID",
  "VENUE_WEBSITE_TOO_LONG",
  "VENUE_CAPACITY_INVALID",
  "VENUE_GEO_INVALID",
  "VENUE_IMAGES_TOO_MANY",
  "VENUE_PROPERTIES_TOO_MANY",
  "PROPERTY_DEFINITION_REQUIRED",
  "PROPERTY_VALUE_TOO_LONG",
  // Media pre-flight — enforced by the picker before anything is uploaded.
  "IMAGE_TOO_LARGE",
  "IMAGE_TYPE_INVALID",
  "IMAGES_TOO_MANY",
  // Backend outcomes (`details.code` on the error envelope).
  "VALIDATION_FAILED",
  "NO_FIELDS_TO_UPDATE",
  "PROPERTY_DEFINITION_UNKNOWN",
  "PROPERTY_VALUE_TYPE_MISMATCH",
  "NOT_VENUE_MANAGER",
  "VENUE_NOT_FOUND",
  "VENUE_PROFILE_UPDATE_FAILED",
  "UPLOAD_FAILED",
  "INTERNAL_ERROR",
] as const

export type VenueProfileErrorCode = (typeof VENUE_PROFILE_ERROR_CODES)[number]

/** Is `code` one this UI has a translation for? */
export function isVenueProfileErrorCode(
  code: unknown
): code is VenueProfileErrorCode {
  return (
    typeof code === "string" &&
    (VENUE_PROFILE_ERROR_CODES as readonly string[]).includes(code)
  )
}

/**
 * Pull the stable CODE out of whatever the Strapi client threw.
 *
 * `BaseStrapiClient` rejects with `new Error(JSON.stringify(appError))`, where
 * `appError.details` is the backend's `error.details` — i.e.
 * `{ code, issues? }`. A per-field `VALIDATION_FAILED` therefore still carries
 * its issues, but the toast only ever renders the top-level code: an unknown
 * one collapses to `INTERNAL_ERROR` rather than leaking raw text at the user.
 */
export function extractVenueProfileErrorCode(
  error: unknown
): VenueProfileErrorCode {
  if (!(error instanceof Error)) return "INTERNAL_ERROR"

  let parsed: unknown
  try {
    parsed = JSON.parse(error.message)
  } catch {
    return isVenueProfileErrorCode(error.message)
      ? error.message
      : "INTERNAL_ERROR"
  }

  if (typeof parsed !== "object" || parsed === null) return "INTERNAL_ERROR"
  const details = (parsed as { details?: unknown }).details
  if (typeof details !== "object" || details === null) return "INTERNAL_ERROR"

  const code = (details as { code?: unknown }).code
  return isVenueProfileErrorCode(code) ? code : "INTERNAL_ERROR"
}
