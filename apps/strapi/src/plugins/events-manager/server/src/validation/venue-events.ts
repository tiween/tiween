/**
 * Zod schemas for the venue-manager event-creation surface (Story 7.3).
 *
 * ONE accepted-input source of truth for `POST /venue/events` and
 * `POST /venue/creative-works`. Every issue `message` is a stable
 * SCREAMING_SNAKE CODE — the client mirror
 * (`apps/client/src/features/venues/schemas/venue-events.ts`) translates the
 * same vocabulary.
 *
 * NOT here: the matrix-pinned cross-field rules. `EVENT_SHOWTIMES_REQUIRED`,
 * `EVENT_DATES_INVALID` and `SHOWTIME_OUTSIDE_EVENT_RANGE` are pinned by the
 * I/O matrix as TOP-LEVEL `details.code` values, but everything `validate()`
 * rejects comes back as `VALIDATION_FAILED` with the code demoted to a
 * per-field issue — so those checks live in `services/venue-events.ts`, where
 * they can throw their own codes (the same split 7.2 used for
 * `NO_FIELDS_TO_UPDATE`).
 *
 * TENANT ISOLATION: there is NO venue field in either schema. The venue is
 * derived from the caller via the venues facade, never from the request, and
 * Zod strips unknown keys anyway.
 *
 * NO TICKETING SURFACE: no price, tier, quantity or sale-date field is
 * accepted anywhere below — the ticketing plugin is dormant in v1 and
 * `screening.price` / `ticketsAvailable` stay at their schema defaults.
 */
import { z } from "zod"

/** The `videoFormat` enum on the screening schema. */
export const SHOWTIME_VIDEO_FORMATS = [
  "standard",
  "threeD",
  "imax",
  "fourDX",
  "format70mm",
] as const

export type ShowtimeVideoFormat = (typeof SHOWTIME_VIDEO_FORMATS)[number]

/** The creative-work `type` enum (mirrors the creative-works schema). */
export const CREATIVE_WORK_TYPES = ["film", "play", "short-film"] as const

export type CreativeWorkTypeInput = (typeof CREATIVE_WORK_TYPES)[number]

/** Upper bound on showtimes per event — generous, but bounded. */
export const MAX_SHOWTIMES = 100

/** Upper bound on event images (mirrors the venues media limit). */
export const MAX_EVENT_IMAGES = 10

/** A parseable ISO datetime string. */
const isoDateTime = (code: string) =>
  z
    .string({ required_error: code, invalid_type_error: code })
    .trim()
    .min(1, code)
    .refine((value) => !Number.isNaN(Date.parse(value)), code)

/** Blank optional text is treated as absent (nothing to clear on creation). */
const optionalText = (max: number, code: string) =>
  z.preprocess(
    (v) =>
      typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v,
    z.string().max(max, code).optional()
  )

/** A Strapi upload file id (uploads happen before the create). */
const fileId = z.number().int().positive()

/**
 * One showtime row. Which optional fields are MEANINGFUL depends on the
 * selected work's type (`videoFormat`/`subtitleLanguage` for screenings,
 * `surtitleLanguage` for performances); the service persists only the fields
 * of the kind it creates, so a stray field is dropped, never stored.
 */
const showtimeSchema = z.object({
  startDateTime: isoDateTime("SHOWTIME_START_INVALID"),
  videoFormat: z
    .enum(SHOWTIME_VIDEO_FORMATS, {
      errorMap: () => ({ message: "SHOWTIME_FORMAT_INVALID" }),
    })
    .optional(),
  audioLanguage: optionalText(50, "SHOWTIME_LANGUAGE_TOO_LONG"),
  subtitleLanguage: optionalText(50, "SHOWTIME_LANGUAGE_TOO_LONG"),
  surtitleLanguage: optionalText(50, "SHOWTIME_LANGUAGE_TOO_LONG"),
})

/**
 * Declared explicitly rather than `z.infer`: the `z.preprocess` wrappers give
 * their keys an `unknown` input type, which degrades the inferred object to
 * all-optional and loses the required keys the service relies on.
 */
export interface VenueShowtimeInput {
  startDateTime: string
  videoFormat?: ShowtimeVideoFormat
  audioLanguage?: string
  subtitleLanguage?: string
  surtitleLanguage?: string
}

/**
 * `POST /venue/events`. `category` is deliberately ABSENT — it is derived
 * server-side from the creative work's `type`, never accepted from the client.
 * So are `slug` (generated service-side) and `eventStatus` (schema default).
 */
export const venueEventCreateSchema = z.object({
  creativeWorkId: z
    .string({ required_error: "CREATIVE_WORK_REQUIRED" })
    .trim()
    .min(1, "CREATIVE_WORK_REQUIRED")
    .max(255, "CREATIVE_WORK_REQUIRED"),
  title: z
    .string({ required_error: "EVENT_TITLE_REQUIRED" })
    .trim()
    .min(1, "EVENT_TITLE_REQUIRED")
    .max(200, "EVENT_TITLE_TOO_LONG"),
  description: optionalText(5000, "EVENT_DESCRIPTION_TOO_LONG"),
  startDateTime: isoDateTime("EVENT_DATES_INVALID"),
  endDateTime: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    isoDateTime("EVENT_DATES_INVALID").optional()
  ),
  featured: z.boolean().optional(),
  imageIds: z
    .array(fileId)
    .max(MAX_EVENT_IMAGES, "EVENT_IMAGES_TOO_MANY")
    .optional(),
  // `min(1)` is NOT enforced here on purpose — the matrix pins the empty list
  // at its own top-level code (`EVENT_SHOWTIMES_REQUIRED`), thrown by the
  // service. See the module docstring.
  showtimes: z
    .array(showtimeSchema)
    .max(MAX_SHOWTIMES, "EVENT_SHOWTIMES_TOO_MANY"),
})

/** See {@link VenueShowtimeInput} for why this is not `z.infer`. */
export interface VenueEventCreateInput {
  creativeWorkId: string
  title: string
  description?: string
  startDateTime: string
  endDateTime?: string
  featured?: boolean
  imageIds?: number[]
  showtimes: VenueShowtimeInput[]
}

/** `POST /venue/creative-works` — the minimal manager-created catalog entry. */
export const venueWorkCreateSchema = z.object({
  title: z
    .string({ required_error: "WORK_TITLE_REQUIRED" })
    .trim()
    .min(1, "WORK_TITLE_REQUIRED")
    .max(200, "WORK_TITLE_TOO_LONG"),
  type: z.enum(CREATIVE_WORK_TYPES, {
    errorMap: () => ({ message: "WORK_TYPE_INVALID" }),
  }),
  synopsis: optionalText(5000, "WORK_SYNOPSIS_TOO_LONG"),
  duration: z
    .number()
    .int("WORK_DURATION_INVALID")
    .positive("WORK_DURATION_INVALID")
    .max(6000, "WORK_DURATION_INVALID")
    .optional(),
  releaseYear: z
    .number()
    .int("WORK_YEAR_INVALID")
    .min(1888, "WORK_YEAR_INVALID")
    .max(2100, "WORK_YEAR_INVALID")
    .optional(),
  posterId: fileId.optional(),
})

/** See {@link VenueShowtimeInput} for why this is not `z.infer`. */
export interface VenueWorkCreateInput {
  title: string
  type: CreativeWorkTypeInput
  synopsis?: string
  duration?: number
  releaseYear?: number
  posterId?: number
}
