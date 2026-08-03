import { z } from "zod"

/**
 * Venue Registration Form Validation Schemas (Story 7.1).
 *
 * Mirrors the backend schema at
 * `apps/strapi/src/plugins/venues/server/src/validation/registration.ts` — SAME
 * field shapes, SAME SCREAMING_SNAKE error CODES — so one vocabulary crosses
 * the wire and `venues.register.errors.<CODE>` translates both the client-side
 * field errors and any code relayed back by the API route.
 *
 * Two schemas on purpose:
 *  - `venueRegistrationFormSchema` is the FLAT shape react-hook-form binds to
 *    (a form has no nested `venue` / `manager` objects), and
 *  - `venueRegistrationSchema` is the NESTED payload the API route validates
 *    and forwards to Strapi.
 * `toRegistrationPayload` is the single conversion between them.
 */

/** The venue schema's `type` enumeration (mirrors the Strapi content type). */
export const VENUE_TYPES = [
  "cinema",
  "theater",
  "cultural-center",
  "museum",
  "other",
] as const

export type VenueType = (typeof VENUE_TYPES)[number]

/** Locales the applicant confirmation email is written in. */
export const PREFERRED_LANGUAGES = ["ar", "fr", "en"] as const

/** Password policy — mirrors the backend (bcrypt caps at 72 bytes). */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

/**
 * bcrypt truncates at 72 BYTES, not 72 characters. `.max(72)` on the string
 * length lets a multi-byte password (accents, Arabic, emoji) exceed the byte
 * cap, after which every password sharing its first 72 bytes hashes
 * identically — a silent collision the user can never observe. Mirrors the
 * backend refine.
 */
const withinBcryptByteCap = (value: string) =>
  new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH

/** Upper bound on how many photos one application may reference. */
export const MAX_IMAGES = 10

/**
 * Media limits — SINGLE SOURCE for the form's pickers and the API route's
 * pre-upload checks. They were once declared in both places, which is how the
 * two silently drifted; the route now imports these.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Image mime types the picker and the route handler both accept. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

/** The `accept` attribute value for the logo/photos file inputs. */
export const ACCEPTED_IMAGE_TYPES_ATTR = ACCEPTED_IMAGE_TYPES.join(",")

/**
 * Canonical venue-website rule, mirroring
 * `apps/strapi/src/shared/website-url.ts` (which the venues plugin's DB
 * lifecycle enforces). It CANNOT be imported: that module lives in the Strapi
 * app, outside this package's build. It is duplicated verbatim instead, because
 * the alternative — Zod's `.url()` — accepts `ftp://…`, `javascript:…` and
 * `http://sub_domain.tn`, all of which the database then rejects. Anything this
 * schema lets through that the lifecycle refuses fails at venue-create time,
 * AFTER the manager account was provisioned: the applicant is rolled back and
 * gets an opaque 500 that correcting their input cannot fix.
 *
 * The scheme is spelled as a character class rather than an `i` flag because
 * the canonical pattern is compiled flagless by Strapi's entity validator; keep
 * the two byte-identical.
 */
export const WEBSITE_URL_PATTERN = String.raw`^$|^(?:[Hh][Tt][Tt][Pp][Ss]?)://(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}(?::\d{1,5})?(?:[/?#][^\s\x00-\x1F\x7F\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]*)?$`

const WEBSITE_URL_RE = new RegExp(WEBSITE_URL_PATTERN)

/** Upper bound mirrored by `maxLength` on the venue `website` attribute. */
export const WEBSITE_URL_MAX_LENGTH = 255

/**
 * Is `value` an acceptable venue website? `undefined` / `null` / `""` are valid
 * — the field is optional and must never become required.
 */
export function isValidWebsiteUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true
  if (typeof value !== "string") return false
  if (value.length > WEBSITE_URL_MAX_LENGTH) return false

  return WEBSITE_URL_RE.test(value)
}

/** A Strapi upload file id (produced by the route handler's upload step). */
const fileId = z.number().int().positive()

const optionalTrimmed = (max: number, code: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(max, code).optional()
  )

/** The nested payload the API route validates and forwards to Strapi. */
export const venueRegistrationSchema = z.object({
  venue: z.object({
    name: z
      .string({ required_error: "VENUE_NAME_REQUIRED" })
      .trim()
      .min(1, "VENUE_NAME_REQUIRED")
      .max(200, "VENUE_NAME_TOO_LONG"),
    description: optionalTrimmed(5000, "VENUE_DESCRIPTION_TOO_LONG"),
    address: z
      .string({ required_error: "VENUE_ADDRESS_REQUIRED" })
      .trim()
      .min(1, "VENUE_ADDRESS_REQUIRED")
      .max(500, "VENUE_ADDRESS_TOO_LONG"),
    type: z.enum(VENUE_TYPES, {
      errorMap: () => ({ message: "VENUE_TYPE_INVALID" }),
    }),
    phone: z
      .string({ required_error: "VENUE_PHONE_REQUIRED" })
      .trim()
      .min(1, "VENUE_PHONE_REQUIRED")
      .max(30, "VENUE_PHONE_TOO_LONG"),
    email: z
      .string({ required_error: "VENUE_EMAIL_REQUIRED" })
      .trim()
      .min(1, "VENUE_EMAIL_REQUIRED")
      .email("VENUE_EMAIL_INVALID"),
    // Validated with `isValidWebsiteUrl`, NOT Zod's `.url()` — see the pattern's
    // docstring above for why the laxer check is a rollback-and-opaque-500 bug.
    website: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() || undefined : v),
      z
        .string()
        .max(WEBSITE_URL_MAX_LENGTH, "VENUE_WEBSITE_TOO_LONG")
        .refine(isValidWebsiteUrl, "VENUE_WEBSITE_INVALID")
        .optional()
    ),
    capacity: z
      .number()
      .int("VENUE_CAPACITY_INVALID")
      .positive("VENUE_CAPACITY_INVALID")
      .max(1_000_000, "VENUE_CAPACITY_INVALID")
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
      .optional(),
    logo: fileId.optional(),
    images: z.array(fileId).max(MAX_IMAGES, "VENUE_IMAGES_TOO_MANY").optional(),
  }),
  manager: z.object({
    firstName: z
      .string({ required_error: "MANAGER_FIRST_NAME_REQUIRED" })
      .trim()
      .min(1, "MANAGER_FIRST_NAME_REQUIRED")
      .max(100, "MANAGER_FIRST_NAME_TOO_LONG"),
    lastName: z
      .string({ required_error: "MANAGER_LAST_NAME_REQUIRED" })
      .trim()
      .min(1, "MANAGER_LAST_NAME_REQUIRED")
      .max(100, "MANAGER_LAST_NAME_TOO_LONG"),
    email: z
      .string({ required_error: "MANAGER_EMAIL_REQUIRED" })
      .trim()
      .min(1, "MANAGER_EMAIL_REQUIRED")
      .email("MANAGER_EMAIL_INVALID"),
    password: z
      .string({ required_error: "MANAGER_PASSWORD_REQUIRED" })
      .min(PASSWORD_MIN_LENGTH, "MANAGER_PASSWORD_TOO_SHORT")
      .max(PASSWORD_MAX_LENGTH, "MANAGER_PASSWORD_TOO_LONG")
      .regex(/[A-Z]/, "MANAGER_PASSWORD_WEAK")
      .regex(/[a-z]/, "MANAGER_PASSWORD_WEAK")
      .regex(/\d/, "MANAGER_PASSWORD_WEAK")
      .refine(withinBcryptByteCap, "MANAGER_PASSWORD_TOO_LONG"),
    preferredLanguage: z.enum(PREFERRED_LANGUAGES).optional(),
  }),
})

export type VenueRegistrationPayload = z.infer<typeof venueRegistrationSchema>

/** Max value the capacity field accepts (mirrors the nested schema). */
const MAX_CAPACITY = 1_000_000

/**
 * The FLAT shape the form binds to. Files are not part of it: the logo and
 * photos are `File` objects held in component state and uploaded by the route
 * handler, which then injects the resulting ids into the nested payload.
 *
 * Every field's Zod INPUT type equals its OUTPUT type on purpose — no
 * `z.preprocess`, no type-changing `.transform`. react-hook-form binds one type
 * to the form, and a schema whose parsed output differs from its input makes
 * `useForm`/`zodResolver`/`AppForm` disagree about that type. `capacity` is
 * therefore kept as the STRING the input yields and converted to a number in
 * `toRegistrationPayload`, which is the one place the wire shape is built.
 */
export const venueRegistrationFormSchema = z
  .object({
    name: venueRegistrationSchema.shape.venue.shape.name,
    description: z
      .string()
      .trim()
      .max(5000, "VENUE_DESCRIPTION_TOO_LONG")
      .optional(),
    address: venueRegistrationSchema.shape.venue.shape.address,
    type: venueRegistrationSchema.shape.venue.shape.type,
    phone: venueRegistrationSchema.shape.venue.shape.phone,
    venueEmail: venueRegistrationSchema.shape.venue.shape.email,
    // A blank website means "not provided"; a present one must satisfy the
    // CANONICAL rule (`isValidWebsiteUrl`), the same one the database enforces.
    // Zod's `.url()` was laxer than the DB and let `ftp://`, `javascript:` and
    // underscore hosts through to a post-provisioning 500.
    website: z
      .string()
      .trim()
      .max(WEBSITE_URL_MAX_LENGTH, "VENUE_WEBSITE_TOO_LONG")
      .optional()
      .refine((v) => isValidWebsiteUrl(v), {
        message: "VENUE_WEBSITE_INVALID",
      }),
    capacity: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) =>
          !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= MAX_CAPACITY),
        { message: "VENUE_CAPACITY_INVALID" }
      ),
    firstName: venueRegistrationSchema.shape.manager.shape.firstName,
    lastName: venueRegistrationSchema.shape.manager.shape.lastName,
    managerEmail: venueRegistrationSchema.shape.manager.shape.email,
    password: venueRegistrationSchema.shape.manager.shape.password,
    passwordConfirmation: z.string({
      required_error: "PASSWORD_CONFIRMATION_REQUIRED",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PASSWORD_MISMATCH",
        path: ["passwordConfirmation"],
      })
    }
  })

export type VenueRegistrationFormValues = z.infer<
  typeof venueRegistrationFormSchema
>

/**
 * Fold the flat form values (plus the uploaded file ids and the applicant's
 * active locale) into the nested payload the API route accepts.
 */
export function toRegistrationPayload(
  values: VenueRegistrationFormValues,
  extras: {
    preferredLanguage?: (typeof PREFERRED_LANGUAGES)[number]
    logo?: number
    images?: number[]
  } = {}
): VenueRegistrationPayload {
  return {
    venue: {
      name: values.name,
      description: values.description || undefined,
      address: values.address,
      type: values.type,
      phone: values.phone,
      email: values.venueEmail,
      website: values.website || undefined,
      // The form holds the capacity as the raw input string; the wire wants a
      // number (or nothing at all).
      capacity: values.capacity ? Number(values.capacity) : undefined,
      logo: extras.logo,
      images:
        extras.images && extras.images.length > 0 ? extras.images : undefined,
    },
    manager: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.managerEmail,
      password: values.password,
      preferredLanguage: extras.preferredLanguage,
    },
  }
}

/**
 * Every error CODE this flow can surface, backend codes included. The UI maps
 * each to `venues.register.errors.<CODE>`; keeping the list here means a new
 * code cannot be added without a translation existing for it (the schema test
 * pins the set).
 */
export const VENUE_REGISTRATION_ERROR_CODES = [
  // Client + server field validation
  "VENUE_NAME_REQUIRED",
  "VENUE_NAME_TOO_LONG",
  "VENUE_DESCRIPTION_TOO_LONG",
  "VENUE_ADDRESS_REQUIRED",
  "VENUE_ADDRESS_TOO_LONG",
  "VENUE_TYPE_INVALID",
  "VENUE_PHONE_REQUIRED",
  "VENUE_PHONE_TOO_LONG",
  "VENUE_EMAIL_REQUIRED",
  "VENUE_EMAIL_INVALID",
  "VENUE_WEBSITE_INVALID",
  "VENUE_WEBSITE_TOO_LONG",
  "VENUE_CAPACITY_INVALID",
  "VENUE_GEO_INVALID",
  "VENUE_IMAGES_TOO_MANY",
  // Media pre-flight — enforced by BOTH the picker and the API route. An
  // unacceptable file is REJECTED, never silently dropped: this is a one-shot
  // form, so skipping a file and answering 201 loses the applicant's media
  // behind a success message they have no reason to doubt.
  "IMAGE_TOO_LARGE",
  "IMAGE_TYPE_INVALID",
  "IMAGES_TOO_MANY",
  "MANAGER_FIRST_NAME_REQUIRED",
  "MANAGER_FIRST_NAME_TOO_LONG",
  "MANAGER_LAST_NAME_REQUIRED",
  "MANAGER_LAST_NAME_TOO_LONG",
  "MANAGER_EMAIL_REQUIRED",
  "MANAGER_EMAIL_INVALID",
  "MANAGER_PASSWORD_REQUIRED",
  "MANAGER_PASSWORD_TOO_SHORT",
  "MANAGER_PASSWORD_TOO_LONG",
  "MANAGER_PASSWORD_WEAK",
  "PASSWORD_CONFIRMATION_REQUIRED",
  "PASSWORD_MISMATCH",
  // Route-handler / backend outcomes
  "VALIDATION_FAILED",
  "EMAIL_ALREADY_REGISTERED",
  "VENUE_MANAGER_ROLE_MISSING",
  "VENUE_REGISTRATION_FAILED",
  "RATE_LIMIT_EXCEEDED",
  "RECAPTCHA_REQUIRED",
  "RECAPTCHA_FAILED",
  "UPLOAD_FAILED",
  "INTERNAL_ERROR",
] as const

export type VenueRegistrationErrorCode =
  (typeof VENUE_REGISTRATION_ERROR_CODES)[number]
