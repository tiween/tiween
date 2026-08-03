/**
 * Zod schema for the venue-manager self-service profile update (Story 7.2).
 *
 * ONE accepted-input source of truth for `PUT /venues/me`. Every field is
 * optional (a partial update), and every issue `message` is a stable
 * SCREAMING_SNAKE CODE **reused verbatim** from `./registration.ts` so
 * registration and profile share a single vocabulary across the wire — the
 * client mirror (`apps/client/src/features/venues/schemas/venue-profile.ts`)
 * translates the same codes.
 *
 * TENANT ISOLATION: `documentId`, `slug`, `manager`, `status` and `events` are
 * deliberately absent from the object. Zod strips unknown keys, so a body
 * carrying them loses them here, before anything reaches the service — which
 * then rebuilds the Document Service payload from its own whitelist anyway
 * (belt and braces; see `services/venue-profile.ts`).
 *
 * NOT here: the "empty payload" rule. The matrix pins that failure at
 * `details.code = "NO_FIELDS_TO_UPDATE"`, but everything rejected by
 * `validate()` comes back as `VALIDATION_FAILED` with the code demoted to a
 * per-field issue. So the emptiness check lives in the service, where it can
 * throw its own code. A `.refine()` here would produce the wrong envelope.
 */
import { z } from "zod"

import {
  isValidWebsiteUrl,
  WEBSITE_URL_MAX_LENGTH,
} from "../../../../../shared/website-url"
import { VENUE_TYPES } from "./registration"

/** Upper bound on how many photos one venue may reference (mirrors registration). */
const MAX_IMAGES = 10

/** A Strapi upload file id. Uploads happen before the profile save. */
const fileId = z.number().int().positive()

/**
 * Blank / whitespace-only optional text is treated as CLEARING the field
 * (`null`), not as absent — a manager must be able to erase a description or a
 * phone number they no longer want published. `undefined` (key omitted) still
 * means "leave untouched"; the service only writes keys that are present.
 */
const clearableText = (max: number, code: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
    z.string().max(max, code).nullable().optional()
  )

/**
 * One amenity value. `definition` is a property-definition `documentId`; the
 * value lives in whichever of the four typed slots matches that definition's
 * `type`. The MATCH is not checkable here (it needs the definition record), so
 * the service resolves and type-checks each entry —
 * `PROPERTY_DEFINITION_UNKNOWN` / `PROPERTY_VALUE_TYPE_MISMATCH`.
 */
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

/** Upper bound on the amenity array — the seeded catalog is ~17 definitions. */
const MAX_PROPERTIES = 100

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
    .enum(VENUE_TYPES, {
      errorMap: () => ({ message: "VENUE_TYPE_INVALID" }),
    })
    .optional(),
  phone: clearableText(30, "VENUE_PHONE_TOO_LONG"),
  email: z
    .string()
    .trim()
    .min(1, "VENUE_EMAIL_REQUIRED")
    .email("VENUE_EMAIL_INVALID")
    .optional(),
  // `website` MUST use the canonical `isValidWebsiteUrl`, never Zod's `.url()`:
  // the two disagree (`.url()` accepts `ftp://…`, `javascript:…`,
  // `http://sub_domain.tn`) and the venues DB lifecycle rejects exactly those,
  // so a looser check here turns a fixable 400 into an opaque write failure.
  // A blank value clears the field.
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
    .max(1_000_000, "VENUE_CAPACITY_INVALID")
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

export type VenueProfileUpdateInput = z.infer<typeof venueProfileUpdateSchema>

/**
 * The exact key set the profile update may write. The service rebuilds its
 * Document Service payload from THIS list, so a key that slips past validation
 * still cannot reach the database.
 */
export const UPDATABLE_VENUE_FIELDS = [
  "name",
  "description",
  "address",
  "type",
  "phone",
  "email",
  "website",
  "capacity",
  "geo",
  "logo",
  "images",
  "properties",
] as const
