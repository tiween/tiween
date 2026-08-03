/**
 * Zod schema for the public venue-registration payload (Story 7.1).
 *
 * Consumed via the shared `validate()` helper (src/shared/validation.ts), so a
 * failure surfaces as a Strapi `ValidationError` carrying
 * `details.code = "VALIDATION_FAILED"` plus the per-field issues below.
 *
 * Every issue `message` is a stable SCREAMING_SNAKE CODE, never prose — the
 * client translates it (project-context error rule). The client-side mirror
 * lives in `apps/client/src/features/venues/schemas/venue-registration.ts` and
 * MUST use the same vocabulary.
 */
import { z } from "zod"

import {
  isValidWebsiteUrl,
  WEBSITE_URL_MAX_LENGTH,
} from "../../../../../shared/website-url"

/** The venue schema's `type` enumeration (mirrors the content-type). */
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

/** Password policy — mirrors the client auth policy (bcrypt caps at 72 bytes). */
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 72

/**
 * bcrypt truncates at 72 BYTES, not 72 characters. A `.max(72)` on the string
 * length lets a multi-byte password (accents, Arabic, emoji) exceed the byte
 * cap, and every password sharing its first 72 bytes then hashes identically —
 * a silent collision the user can never see. Check the encoded length too.
 */
const withinBcryptByteCap = (value: string) =>
  new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH

/** Upper bound on how many photos one application may reference. */
const MAX_IMAGES = 10

/** A Strapi upload file id. Uploads happen before registration. */
const fileId = z.number().int().positive()

/** Blank / whitespace-only optional text is treated as absent, never a 400. */
const optionalText = (max: number, code: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(max, code).optional()
  )

export const venueRegistrationSchema = z.object({
  venue: z.object({
    name: z
      .string({ required_error: "VENUE_NAME_REQUIRED" })
      .trim()
      .min(1, "VENUE_NAME_REQUIRED")
      .max(200, "VENUE_NAME_TOO_LONG"),
    description: optionalText(5000, "VENUE_DESCRIPTION_TOO_LONG"),
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
    // `website` MUST be validated with the canonical `isValidWebsiteUrl`, not
    // Zod's `.url()`. The two disagree: `.url()` accepts `ftp://…`,
    // `javascript:…` and `http://sub_domain.tn`, all of which the venues plugin's
    // DB lifecycle (`../bootstrap.ts` → `src/shared/website-url.ts`) rejects.
    // Accepting them here would let the venue `create` throw AFTER the manager
    // account was provisioned — the compensating delete fires and the applicant
    // gets an opaque 500 they can never recover from by fixing their input. A
    // blank value still means "not provided".
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

export type VenueRegistrationInput = z.infer<typeof venueRegistrationSchema>
