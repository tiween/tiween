import { z } from "zod"

import type {
  StrapiEvent,
  StrapiScreening,
} from "@/features/events/types/strapi.types"

import { toTunisIsoInstant } from "@/lib/dates"

/**
 * Venue Event Creation schemas (Story 7.3).
 *
 * Client mirror of
 * `apps/strapi/src/plugins/events-manager/server/src/validation/venue-events.ts`
 * — SAME field shapes, SAME SCREAMING_SNAKE error CODES — so one vocabulary
 * crosses the wire and `venues.events.errors.<CODE>` translates both the
 * locally-produced field errors and any code relayed back by Strapi.
 *
 * Three shapes, on purpose (the 7.2 doctrine):
 *  - {@link venueEventFormSchema} is the FLAT shape react-hook-form binds to,
 *    where every field's Zod INPUT type equals its OUTPUT type (strings + `""`
 *    select sentinels, no type-changing transforms);
 *  - the WIRE payload ({@link VenueEventCreatePayload}) is what
 *    `POST /venue/events` accepts; and
 *  - {@link toVenueEventCreatePayload} is the single conversion between them.
 *    For CREATION the converter builds the FULL payload (there is no stored
 *    row to diff against).
 *
 * NO TICKETING SURFACE: no price / tier / quantity / sale-date field exists in
 * any shape below — the ticketing plugin is dormant in v1.
 */

export {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_TYPES_ATTR,
  MAX_IMAGE_BYTES,
} from "./venue-registration"

/** The screening `videoFormat` enum (mirrors the backend). */
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

export type CreativeWorkType = (typeof CREATIVE_WORK_TYPES)[number]

/** Work types that schedule SCREENINGS (the rest schedule performances). */
export function showtimeKindOf(
  type: CreativeWorkType
): "screening" | "performance" {
  return type === "play" ? "performance" : "screening"
}

/** Upper bound on event images (mirrors the backend). */
export const MAX_EVENT_IMAGES = 10

/** Upper bound on showtimes per event (mirrors the backend's `MAX_SHOWTIMES`). */
export const MAX_EVENT_SHOWTIMES = 100

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/* -------------------------------------------------------------------------- */
/* Read model — what the authenticated /venue/events reads return              */
/* -------------------------------------------------------------------------- */

/** One creative work as served by the search endpoint (picker feed). */
export interface CreativeWorkSearchEntry {
  documentId: string
  title?: string
  type?: string
  releaseYear?: number
  poster?: { url?: string } | null
}

/** One row of the manager's event list (draft + publication state). */
export interface VenueEventListEntry {
  documentId: string
  title?: string
  category?: string
  startDateTime?: string
  endDateTime?: string
  featured?: boolean
  createdAt?: string
  isPublished?: boolean
}

/**
 * The draft-preview read (`GET /venue/events/:documentId`): the same
 * DETAIL-shaped projection the public read serves (so it can feed the real
 * `EventDetailPage`), plus `performances` and `isPublished`.
 */
export interface ManagerEventDetail extends VenueEventListEntry {
  description?: string
  slug?: string
  images?: unknown[]
  venue?: Record<string, unknown> | null
  screenings?: StrapiScreening[]
  performances?: Array<Record<string, unknown>>
}

/**
 * Map the authenticated draft read to the `StrapiEvent` wire shape the
 * production `EventDetailPage` renders — the preview cannot drift from
 * reality because it IS the production renderer.
 *
 * A play's `performances` are re-expressed as screening-shaped showtimes
 * (`movie` ⇽ `play`) because the detail component reads `screenings` only; it
 * degrades gracefully without movie/screenings/venue either way.
 */
export function toPreviewStrapiEvent(detail: ManagerEventDetail): StrapiEvent {
  const performances = Array.isArray(detail.performances)
    ? detail.performances
    : []

  const performanceScreenings = performances.map((performance, index) => ({
    id: typeof performance.id === "number" ? performance.id : index,
    documentId:
      typeof performance.documentId === "string"
        ? performance.documentId
        : undefined,
    startDateTime:
      typeof performance.startDateTime === "string"
        ? performance.startDateTime
        : undefined,
    audioLanguage:
      typeof performance.audioLanguage === "string"
        ? performance.audioLanguage
        : undefined,
    movie: (performance.play ?? undefined) as StrapiScreening["movie"],
  })) as StrapiScreening[]

  const screenings = Array.isArray(detail.screenings) ? detail.screenings : []

  return {
    id: 0,
    documentId: detail.documentId,
    title: detail.title ?? "",
    slug: detail.slug ?? "",
    description: detail.description,
    category: detail.category as StrapiEvent["category"],
    startDateTime: detail.startDateTime,
    endDateTime: detail.endDateTime,
    screenings: screenings.length > 0 ? screenings : performanceScreenings,
    images: (detail.images ?? []) as StrapiEvent["images"],
    featured: detail.featured ?? false,
    createdAt: detail.createdAt ?? "",
    updatedAt: "",
    publishedAt: "",
    locale: "",
    venue: (detail.venue ?? undefined) as StrapiEvent["venue"],
  }
}

/* -------------------------------------------------------------------------- */
/* Wire payloads                                                              */
/* -------------------------------------------------------------------------- */

export interface VenueShowtimePayload {
  startDateTime: string
  videoFormat?: ShowtimeVideoFormat
  audioLanguage?: string
  subtitleLanguage?: string
  surtitleLanguage?: string
}

/** The `POST /venue/events` body. NO venue id — derived server-side. */
export interface VenueEventCreatePayload {
  creativeWorkId: string
  title: string
  description?: string
  startDateTime: string
  endDateTime?: string
  featured?: boolean
  imageIds?: number[]
  showtimes: VenueShowtimePayload[]
}

/** The `POST /venue/creative-works` body. */
export interface VenueWorkCreatePayload {
  title: string
  type: CreativeWorkType
  synopsis?: string
  duration?: number
  releaseYear?: number
  posterId?: number
}

/* -------------------------------------------------------------------------- */
/* Form schemas — the flat shapes react-hook-form binds to                     */
/* -------------------------------------------------------------------------- */

/** `""` while nothing is picked — the honest select-sentinel widening. */
export const VIDEO_FORMAT_UNSET = ""

export const VIDEO_FORMAT_FORM_VALUES = [
  ...SHOWTIME_VIDEO_FORMATS,
  VIDEO_FORMAT_UNSET,
] as const

export type VideoFormatFormValue = (typeof VIDEO_FORMAT_FORM_VALUES)[number]

const showtimeFormSchema = z.object({
  /** `YYYY-MM-DD` — the native date input's value. */
  date: z.string().regex(DATE_RE, "SHOWTIME_START_INVALID"),
  /** `HH:mm` — the native time input's value. */
  time: z.string().regex(TIME_RE, "SHOWTIME_START_INVALID"),
  videoFormat: z.enum(VIDEO_FORMAT_FORM_VALUES, {
    errorMap: () => ({ message: "SHOWTIME_FORMAT_INVALID" }),
  }),
  audioLanguage: z.string().trim().max(50, "SHOWTIME_LANGUAGE_TOO_LONG"),
  subtitleLanguage: z.string().trim().max(50, "SHOWTIME_LANGUAGE_TOO_LONG"),
  surtitleLanguage: z.string().trim().max(50, "SHOWTIME_LANGUAGE_TOO_LONG"),
})

export type ShowtimeFormValues = z.infer<typeof showtimeFormSchema>

/** A blank showtime row for `useFieldArray.append`. */
export function emptyShowtimeRow(): ShowtimeFormValues {
  return {
    date: "",
    time: "",
    videoFormat: VIDEO_FORMAT_UNSET,
    audioLanguage: "",
    subtitleLanguage: "",
    surtitleLanguage: "",
  }
}

/**
 * The creation form. Cross-field rules mirror the backend's service checks:
 * end date not before start (`EVENT_DATES_INVALID` on `endDate`), every
 * showtime day inside the run window (`SHOWTIME_OUTSIDE_EVENT_RANGE` on the
 * row's `date`).
 */
export const venueEventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "EVENT_TITLE_REQUIRED")
      .max(200, "EVENT_TITLE_TOO_LONG"),
    description: z.string().trim().max(5000, "EVENT_DESCRIPTION_TOO_LONG"),
    startDate: z.string().regex(DATE_RE, "EVENT_DATES_INVALID"),
    endDate: z
      .string()
      .refine((v) => v === "" || DATE_RE.test(v), "EVENT_DATES_INVALID"),
    featured: z.boolean(),
    showtimes: z
      .array(showtimeFormSchema)
      .min(1, "EVENT_SHOWTIMES_REQUIRED")
      .max(MAX_EVENT_SHOWTIMES, "EVENT_SHOWTIMES_TOO_MANY"),
  })
  .superRefine((values, ctx) => {
    if (!DATE_RE.test(values.startDate)) return

    if (
      values.endDate !== "" &&
      DATE_RE.test(values.endDate) &&
      values.endDate < values.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "EVENT_DATES_INVALID",
        path: ["endDate"],
      })
    }

    const lastDay = values.endDate !== "" ? values.endDate : values.startDate
    values.showtimes.forEach((showtime, index) => {
      if (!DATE_RE.test(showtime.date)) return
      if (showtime.date < values.startDate || showtime.date > lastDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SHOWTIME_OUTSIDE_EVENT_RANGE",
          path: ["showtimes", index, "date"],
        })
      }
    })
  })

export type VenueEventFormValues = z.infer<typeof venueEventFormSchema>

/** Default values for a fresh creation form. */
export function emptyVenueEventFormValues(): VenueEventFormValues {
  return {
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    featured: false,
    showtimes: [emptyShowtimeRow()],
  }
}

/**
 * `YYYY-MM-DD` + `HH:mm` → ISO instant, read as TUNISIAN wall-clock time.
 *
 * The form's day comparisons above are plain `YYYY-MM-DD` strings, and the
 * backend re-checks the run window in `Africa/Tunis` — resolving these inputs
 * in the browser's zone instead would make the two disagree at the day
 * boundary, so a same-day evening showtime the form accepted would come back
 * `SHOWTIME_OUTSIDE_EVENT_RANGE`.
 */
function toIsoInstant(date: string, time: string): string {
  return toTunisIsoInstant(date, time)
}

/**
 * Fold the form values into the FULL wire payload. Optional blanks are OMITTED
 * (nothing to clear on creation). Showtime fields are narrowed by the selected
 * work's kind: `videoFormat`/`subtitleLanguage` ride only on screenings,
 * `surtitleLanguage` only on performances — the backend drops strays anyway,
 * but the wire should say what it means.
 */
export function toVenueEventCreatePayload(
  values: VenueEventFormValues,
  work: { documentId: string; type: CreativeWorkType },
  extras: { imageIds?: number[] } = {}
): VenueEventCreatePayload {
  const kind = showtimeKindOf(work.type)

  return {
    creativeWorkId: work.documentId,
    title: values.title,
    ...(values.description !== "" ? { description: values.description } : {}),
    startDateTime: toIsoInstant(values.startDate, "00:00"),
    ...(values.endDate !== ""
      ? { endDateTime: toIsoInstant(values.endDate, "23:59") }
      : {}),
    featured: values.featured,
    ...(extras.imageIds !== undefined && extras.imageIds.length > 0
      ? { imageIds: extras.imageIds }
      : {}),
    showtimes: values.showtimes.map((showtime) => ({
      startDateTime: toIsoInstant(showtime.date, showtime.time),
      ...(kind === "screening"
        ? {
            ...(showtime.videoFormat !== VIDEO_FORMAT_UNSET
              ? { videoFormat: showtime.videoFormat as ShowtimeVideoFormat }
              : {}),
            ...(showtime.subtitleLanguage !== ""
              ? { subtitleLanguage: showtime.subtitleLanguage }
              : {}),
          }
        : {
            ...(showtime.surtitleLanguage !== ""
              ? { surtitleLanguage: showtime.surtitleLanguage }
              : {}),
          }),
      ...(showtime.audioLanguage !== ""
        ? { audioLanguage: showtime.audioLanguage }
        : {}),
    })),
  }
}

/* Work-creation dialog form. */

export const WORK_TYPE_UNSET = ""

export const WORK_TYPE_FORM_VALUES = [
  ...CREATIVE_WORK_TYPES,
  WORK_TYPE_UNSET,
] as const

export type WorkTypeFormValue = (typeof WORK_TYPE_FORM_VALUES)[number]

export const venueWorkFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "WORK_TITLE_REQUIRED")
    .max(200, "WORK_TITLE_TOO_LONG"),
  type: z
    .enum(WORK_TYPE_FORM_VALUES, {
      errorMap: () => ({ message: "WORK_TYPE_INVALID" }),
    })
    // Annotated `boolean` so TS's inferred type predicates cannot narrow the
    // output and desync it from the input (the 7.2 lesson).
    .refine((value): boolean => value !== WORK_TYPE_UNSET, {
      message: "WORK_TYPE_INVALID",
    }),
  synopsis: z.string().trim().max(5000, "WORK_SYNOPSIS_TOO_LONG"),
  duration: z
    .string()
    .trim()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 6000),
      {
        message: "WORK_DURATION_INVALID",
      }
    ),
  releaseYear: z
    .string()
    .trim()
    .refine(
      (v) =>
        !v || (/^\d{4}$/.test(v) && Number(v) >= 1888 && Number(v) <= 2100),
      { message: "WORK_YEAR_INVALID" }
    ),
})

export type VenueWorkFormValues = z.infer<typeof venueWorkFormSchema>

export function emptyVenueWorkFormValues(): VenueWorkFormValues {
  return {
    title: "",
    type: WORK_TYPE_UNSET,
    synopsis: "",
    duration: "",
    releaseYear: "",
  }
}

export function toVenueWorkCreatePayload(
  values: VenueWorkFormValues,
  extras: { posterId?: number } = {}
): VenueWorkCreatePayload {
  return {
    title: values.title,
    type: values.type as CreativeWorkType,
    ...(values.synopsis !== "" ? { synopsis: values.synopsis } : {}),
    ...(values.duration !== "" ? { duration: Number(values.duration) } : {}),
    ...(values.releaseYear !== ""
      ? { releaseYear: Number(values.releaseYear) }
      : {}),
    ...(extras.posterId !== undefined ? { posterId: extras.posterId } : {}),
  }
}

/* -------------------------------------------------------------------------- */
/* Error vocabulary                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Every error CODE this flow can surface, backend codes included. The UI maps
 * each to `venues.events.errors.<CODE>`; the schema test pins the set against
 * the catalogs so a new code cannot ship without a translation.
 */
export const VENUE_EVENT_ERROR_CODES = [
  // Field validation — shared verbatim with the backend schemas.
  "CREATIVE_WORK_REQUIRED",
  "EVENT_TITLE_REQUIRED",
  "EVENT_TITLE_TOO_LONG",
  "EVENT_DESCRIPTION_TOO_LONG",
  "EVENT_DATES_INVALID",
  "EVENT_SHOWTIMES_REQUIRED",
  "EVENT_SHOWTIMES_TOO_MANY",
  "EVENT_IMAGES_TOO_MANY",
  "SHOWTIME_START_INVALID",
  "SHOWTIME_FORMAT_INVALID",
  "SHOWTIME_LANGUAGE_TOO_LONG",
  "SHOWTIME_OUTSIDE_EVENT_RANGE",
  "WORK_TITLE_REQUIRED",
  "WORK_TITLE_TOO_LONG",
  "WORK_TYPE_INVALID",
  "WORK_SYNOPSIS_TOO_LONG",
  "WORK_DURATION_INVALID",
  "WORK_YEAR_INVALID",
  // Media pre-flight — enforced by the picker before anything is uploaded.
  "IMAGE_TOO_LARGE",
  "IMAGE_TYPE_INVALID",
  "IMAGES_TOO_MANY",
  // Backend outcomes (`details.code` on the error envelope).
  "VALIDATION_FAILED",
  "NOT_VENUE_MANAGER",
  "VENUE_NOT_FOUND",
  "EVENT_NOT_FOUND",
  "CREATIVE_WORK_NOT_FOUND",
  "VENUE_NOT_APPROVED",
  "EVENT_CREATE_FAILED",
  "EVENT_PUBLISH_FAILED",
  "WORK_CREATE_FAILED",
  "UPLOAD_FAILED",
  "INTERNAL_ERROR",
] as const

export type VenueEventErrorCode = (typeof VENUE_EVENT_ERROR_CODES)[number]

/** Is `code` one this UI has a translation for? */
export function isVenueEventErrorCode(
  code: unknown
): code is VenueEventErrorCode {
  return (
    typeof code === "string" &&
    (VENUE_EVENT_ERROR_CODES as readonly string[]).includes(code)
  )
}

/**
 * Pull the stable CODE out of whatever the Strapi client threw (same envelope
 * contract as `extractVenueProfileErrorCode`): `BaseStrapiClient` rejects with
 * `new Error(JSON.stringify(appError))` where `appError.details` is the
 * backend's `{ code, issues? }`. An unknown code collapses to `INTERNAL_ERROR`
 * rather than leaking raw text at the user.
 */
export function extractVenueEventErrorCode(
  error: unknown
): VenueEventErrorCode {
  if (!(error instanceof Error)) return "INTERNAL_ERROR"

  let parsed: unknown
  try {
    parsed = JSON.parse(error.message)
  } catch {
    return isVenueEventErrorCode(error.message)
      ? error.message
      : "INTERNAL_ERROR"
  }

  if (typeof parsed !== "object" || parsed === null) return "INTERNAL_ERROR"
  const details = (parsed as { details?: unknown }).details
  if (typeof details !== "object" || details === null) return "INTERNAL_ERROR"

  const code = (details as { code?: unknown }).code
  return isVenueEventErrorCode(code) ? code : "INTERNAL_ERROR"
}
