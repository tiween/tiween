/**
 * Zod schemas for the venues-plugin ADMIN CRUD API (Story 2D.2).
 *
 * ONE accepted-input source of truth for the six admin routes registered in
 * `../routes/index.ts`. Every issue `message` is a stable SCREAMING_SNAKE CODE
 * — never prose — reusing the vocabulary already established by
 * `./registration.ts` / `./profile.ts` so the admin form, the venue-manager
 * dashboard and the public application all translate the same strings.
 *
 * WHAT IS DELIBERATELY ABSENT from the write schemas: `documentId`, `events`
 * and `properties`. The first two are never client-writable; `properties`
 * (the repeatable `entity-properties.property-value` component) is owned by
 * story 2D.4 and is intentionally not editable through this surface yet — a
 * partial implementation here would let the admin form silently truncate a
 * venue's amenity list on every save.
 *
 * `status` IS accepted here but is stripped server-side for a caller without
 * the `plugin::venues.manage-all` capability (see `../services/venue-admin.ts`);
 * validation and authorization are separate concerns and the scoping decision
 * belongs with the data access, not with the shape check.
 */
import { z } from "zod"

import {
  isValidWebsiteUrl,
  WEBSITE_URL_MAX_LENGTH,
} from "../../../../../shared/website-url"
import { VENUE_TYPES } from "./registration"

/** The venue `status` enumeration (mirrors the content-type schema). */
export const VENUE_STATUSES = ["pending", "approved", "suspended"] as const
export type VenueStatus = (typeof VENUE_STATUSES)[number]

/** The list columns a caller may sort on. Anything else is a 400. */
export const VENUE_SORT_FIELDS = [
  "name",
  "type",
  "status",
  "capacity",
  "createdAt",
  "updatedAt",
] as const

/** Upper bound on how many photos one venue may reference (mirrors profile). */
const MAX_IMAGES = 10

/** Upper bound on one bulk-delete call — a UI page is 20 rows. */
export const MAX_BULK_DELETE = 100

/** Page-size ceiling: the admin table pages, it never dumps the table. */
const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20
/** A venue catalogue is never thousands of pages deep. */
const MAX_PAGE = 1000

/** A Strapi upload file id. Uploads happen before the venue save. */
const fileId = z.number().int().positive()

/** Blank / whitespace-only query values are treated as absent, never as a 400. */
const blankToUndefined = (v: unknown) =>
  typeof v === "string" ? v.trim() || undefined : v

/**
 * Blank / whitespace-only optional text CLEARS the field (`null`) rather than
 * being read as absent — an editor must be able to erase a phone number.
 * `undefined` (key omitted) still means "leave untouched"; the service only
 * writes keys that are present.
 */
const clearableText = (max: number, code: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
    z.string().max(max, code).nullable().optional()
  )

/** An opaque `documentId` — length-bounded, blank means "no value". */
const optionalDocumentId = z.preprocess(
  blankToUndefined,
  z.string().min(1).max(255).optional()
)

/**
 * `GET /admin/venues` query contract. NOT `.strict()`: unknown params (cache
 * busters, analytics keys) are stripped and ignored rather than rejected.
 */
export const venueAdminListQuerySchema = z.object({
  /** Matches `name` OR `address`, case-insensitively (AC 1). */
  search: z.preprocess(blankToUndefined, z.string().max(255).optional()),
  status: z.preprocess(
    blankToUndefined,
    z
      .enum(VENUE_STATUSES, {
        errorMap: () => ({ message: "VENUE_STATUS_INVALID" }),
      })
      .optional()
  ),
  type: z.preprocess(
    blankToUndefined,
    z
      .enum(VENUE_TYPES, {
        errorMap: () => ({ message: "VENUE_TYPE_INVALID" }),
      })
      .optional()
  ),
  /** `cityRef.documentId` scope. */
  city: optionalDocumentId,
  sortField: z.preprocess(
    blankToUndefined,
    z.enum(VENUE_SORT_FIELDS).default("name")
  ),
  sortOrder: z.preprocess(
    blankToUndefined,
    z.enum(["asc", "desc"]).default("asc")
  ),
  page: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().positive().max(MAX_PAGE).default(1)
  ),
  pageSize: z.preprocess(
    blankToUndefined,
    z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE)
  ),
})

export type VenueAdminListQuery = z.infer<typeof venueAdminListQuerySchema>

/**
 * The conventional latitude limit of the Web Mercator projection
 * (`atan(sinh(π))`), mirroring `admin/src/components/MapPicker/geocode.ts`.
 *
 * Bounded here rather than at ±90° for a concrete reason: beyond this band the
 * projection diverges, so the admin's map picker cannot place a pin for the
 * point — an editor handed such a row (a bad geocoder answer, an imported
 * value) would see an empty canvas and have no way to correct it. Every venue
 * this platform serves is thousands of kilometres from the band's edge.
 */
const MERCATOR_MAX_LATITUDE = 85.05112878

/**
 * `geo` — the venue's ONLY coordinate source (`shared.geo-point`). The admin
 * form never offers raw decimal entry (AC 4); these bounds exist so a bad
 * geocoder response cannot write a nonsense point.
 */
const geoSchema = z
  .object({
    latitude: z
      .number()
      .min(-MERCATOR_MAX_LATITUDE, "VENUE_GEO_INVALID")
      .max(MERCATOR_MAX_LATITUDE, "VENUE_GEO_INVALID"),
    longitude: z
      .number()
      .min(-180, "VENUE_GEO_INVALID")
      .max(180, "VENUE_GEO_INVALID"),
  })
  .nullable()
  .optional()

/**
 * The fields shared by create and update. Kept as a raw shape object so
 * `.partial()` can be applied to the update variant without re-declaring
 * anything (one rule, two schemas — they cannot drift).
 */
const venueWritableShape = {
  name: z
    .string({ required_error: "VENUE_NAME_REQUIRED" })
    .trim()
    .min(1, "VENUE_NAME_REQUIRED")
    .max(200, "VENUE_NAME_TOO_LONG"),
  // A uid attribute: lowercase alphanumerics and hyphens. Generated from `name`
  // by the form until the editor edits it, so a bad value is a deliberate one.
  slug: z.preprocess(
    (v) =>
      typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v,
    z
      .string()
      .max(200, "VENUE_SLUG_INVALID")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "VENUE_SLUG_INVALID")
      .optional()
  ),
  description: clearableText(5000, "VENUE_DESCRIPTION_TOO_LONG"),
  address: clearableText(500, "VENUE_ADDRESS_TOO_LONG"),
  /** `cityRef` is written as a `documentId`; `null` clears the relation. */
  cityRef: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
    z.string().max(255, "VENUE_CITY_INVALID").nullable().optional()
  ),
  geo: geoSchema,
  phone: clearableText(30, "VENUE_PHONE_TOO_LONG"),
  email: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
    z.string().email("VENUE_EMAIL_INVALID").nullable().optional()
  ),
  // `website` MUST use the canonical `isValidWebsiteUrl`, never Zod's `.url()`:
  // the two disagree (`.url()` accepts `ftp://…`, `javascript:…`) and the
  // venues DB lifecycle rejects exactly those, so a looser check here turns a
  // fixable 400 into an opaque write failure.
  website: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
    z
      .string()
      .max(WEBSITE_URL_MAX_LENGTH, "VENUE_WEBSITE_TOO_LONG")
      .refine(isValidWebsiteUrl, "VENUE_WEBSITE_INVALID")
      .nullable()
      .optional()
  ),
  // `required_error`/`invalid_type_error` cannot be combined with a custom
  // `errorMap` in Zod 3, so the map itself distinguishes the two cases: an
  // ABSENT type is a form omission the editor can fix ("VENUE_TYPE_REQUIRED"),
  // a present-but-unknown one is a stale client ("VENUE_TYPE_INVALID").
  type: z.enum(VENUE_TYPES, {
    errorMap: (issue) => ({
      message:
        issue.code === "invalid_type"
          ? "VENUE_TYPE_REQUIRED"
          : "VENUE_TYPE_INVALID",
    }),
  }),
  status: z
    .enum(VENUE_STATUSES, {
      errorMap: () => ({ message: "VENUE_STATUS_INVALID" }),
    })
    .optional(),
  capacity: z
    .number()
    .int("VENUE_CAPACITY_INVALID")
    .positive("VENUE_CAPACITY_INVALID")
    .max(1_000_000, "VENUE_CAPACITY_INVALID")
    .nullable()
    .optional(),
  /**
   * The venue's owner — a `plugin::users-permissions.user` **numeric id**, the
   * same form `services/registration.ts` writes (`manager: user.id`), or `null`
   * to unlink. WRITABLE BY `manage-all` CALLERS ONLY: it is the field the whole
   * tenant boundary keys off, so a scoped caller able to set it could hand
   * itself another tenant's venue (or orphan its own).
   */
  manager: z
    .number()
    .int()
    .positive("VENUE_MANAGER_INVALID")
    .nullable()
    .optional(),
  logo: fileId.nullable().optional(),
  images: z.array(fileId).max(MAX_IMAGES, "VENUE_IMAGES_TOO_MANY").optional(),
} as const

/** `POST /admin/venues` — `name` and `type` are the two required fields (AC 3). */
export const venueAdminCreateSchema = z.object(venueWritableShape)

/**
 * `PUT /admin/venues/:documentId` — every field optional. An EMPTY payload is
 * not rejected here: the matrix pins that at its own `NO_FIELDS_TO_UPDATE`
 * code, and everything `validate()` rejects collapses to `VALIDATION_FAILED`,
 * so the emptiness check lives in the service.
 */
export const venueAdminUpdateSchema = z.object(venueWritableShape).partial()

export type VenueAdminCreateInput = z.infer<typeof venueAdminCreateSchema>
export type VenueAdminUpdateInput = z.infer<typeof venueAdminUpdateSchema>

/** `POST /admin/venues/bulk-delete`. */
export const venueAdminBulkDeleteSchema = z.object({
  documentIds: z
    .array(
      z.string().min(1, "VENUE_ID_REQUIRED").max(255, "VENUE_ID_REQUIRED"),
      {
        required_error: "VENUE_IDS_REQUIRED",
        invalid_type_error: "VENUE_IDS_REQUIRED",
      }
    )
    .min(1, "VENUE_IDS_REQUIRED")
    .max(MAX_BULK_DELETE, "VENUE_IDS_TOO_MANY"),
})

export type VenueAdminBulkDeleteInput = z.infer<
  typeof venueAdminBulkDeleteSchema
>

/**
 * The exact key set a write may touch. The service rebuilds its Document
 * Service payload from THIS list, so a key that slips past validation still
 * cannot reach the database.
 */
export const WRITABLE_VENUE_FIELDS = [
  "name",
  "slug",
  "description",
  "address",
  "cityRef",
  "geo",
  "phone",
  "email",
  "website",
  "type",
  "status",
  "capacity",
  "manager",
  "logo",
  "images",
] as const

/**
 * The fields ONLY a `plugin::venues.manage-all` caller may write.
 *
 * - `status`: AC 7 — a Venue Manager sees a READ-ONLY status field, and the UI
 *   gate is convenience; this list is the boundary. A scoped caller must not be
 *   able to approve its own venue.
 * - `manager`: the tenant key itself. A scoped caller able to reassign it could
 *   hand itself another tenant's venue, or orphan its own beyond recovery.
 *
 * `services/venue-admin.ts` does not merely drop these for a scoped caller — it
 * REFUSES the write (`VENUE_FORBIDDEN`), so "you may not do that" is never
 * reported as "nothing to save".
 */
export const PRIVILEGED_VENUE_FIELDS = ["status", "manager"] as const

/** The subset a caller WITHOUT `plugin::venues.manage-all` may write. */
export const SCOPED_WRITABLE_VENUE_FIELDS = WRITABLE_VENUE_FIELDS.filter(
  (field) => !(PRIVILEGED_VENUE_FIELDS as readonly string[]).includes(field)
)
