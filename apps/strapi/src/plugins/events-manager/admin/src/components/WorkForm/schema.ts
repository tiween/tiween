/**
 * WorkForm schema
 *
 * Zod validation schema for the creative-work form, plus the mapping
 * between API entities and form values (and back to API payloads).
 */

import { z } from "zod"

import type { CreativeWork } from "../../hooks/useCreativeWorks"
import type { MediaAsset } from "../MediaInput"

const personRefSchema = z.object({
  id: z.number().optional(),
  documentId: z.string(),
  name: z.string(),
})

const creditRoleRefSchema = z.object({
  id: z.number().optional(),
  documentId: z.string(),
  name: z.string(),
  // Carried so the generic-role rule below can key on the vocabulary record
  // rather than on its (localized) display name.
  slug: z.string().nullish(),
})

/**
 * Slugs of the catch-all `credit-role` record. A credit pointing at it says
 * nothing on its own, so `customRole` has to carry the actual role name —
 * the same rule the pre-2C.3 `role === "other"` enum enforced.
 *
 * Strapi derives the slug from the (localized) `name`, and this project's
 * `defaultLocale` is `fr`, so the catch-all record is as likely to be created
 * as "Autre" (`autre`) as "Other" (`other`). Matching a set keeps the rule
 * firing either way instead of silently degrading to "customRole optional".
 */
export const GENERIC_CREDIT_ROLE_SLUGS = new Set(["other", "autre"])

export function isGenericCreditRole(slug: string | null | undefined): boolean {
  return typeof slug === "string" && GENERIC_CREDIT_ROLE_SLUGS.has(slug)
}

const characterRefSchema = z.object({
  id: z.number().optional(),
  documentId: z.string(),
  name: z.string(),
})

const mediaAssetSchema = z.custom<MediaAsset>((value) =>
  Boolean(value && typeof value === "object" && "url" in value)
)

/**
 * `creative-works.credit` — a crew contribution. Both `person` and
 * `creditRole` are required relations on the component schema; the form keeps
 * them nullable so legacy rows (saved before 2C.3) can load and be corrected.
 */
export const creditFormSchema = z
  .object({
    person: personRefSchema.nullable(),
    creditRole: creditRoleRefSchema.nullable(),
    customRole: z.string(),
    billing: z.number().int().min(1).max(999),
  })
  .superRefine((credit, ctx) => {
    if (!credit.person) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["person"],
        message: "required",
      })
    }
    if (!credit.creditRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditRole"],
        message: "required",
      })
    }
    if (
      isGenericCreditRole(credit.creditRole?.slug) &&
      !credit.customRole.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customRole"],
        message: "required",
      })
    }
  })

/**
 * `creative-works.cast` — an actor portraying a character. `person` is
 * required, `character` is an optional relation.
 */
export const castFormSchema = z
  .object({
    person: personRefSchema.nullable(),
    character: characterRefSchema.nullable(),
    billing: z.number().int().min(1).max(999),
  })
  .superRefine((castMember, ctx) => {
    if (!castMember.person) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["person"],
        message: "required",
      })
    }
  })

export const distinctionFormSchema = z.object({
  name: z.string().trim().min(1),
  edition: z.string(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 5),
  section: z.string(),
  category: z.string(),
  result: z.string(),
  awardName: z.string(),
})

export const theatreDetailsFormSchema = z.object({
  playType: z.string(),
  format: z.string(),
  actCount: z.number().int().min(1).nullable(),
  hasIntermission: z.boolean(),
  basedOn: z.string(),
  originalLanguage: z.string(),
  performedLanguages: z.array(z.string()),
  productionCompany: z.string(),
  premiereDate: z.string().nullable(),
  premiereVenueId: z.string().nullable(),
  isTourProduction: z.boolean(),
})

export const linkFormSchema = z.object({
  type: z.string().min(1),
  url: z.string().trim().min(1).url(),
  label: z.string(),
})

/**
 * Legacy `common.video.type` → `videoType`, used ONLY to seed the editor for
 * rows written before the split. Without it a legacy `CLIP`/`FULL_LENGTH` row
 * would load as `trailer` and be persisted as the work's public trailer on the
 * next save (`videoType === "trailer"` is what the client reads).
 */
const LEGACY_TYPE_TO_VIDEO_TYPE: Record<string, string> = {
  FULL_LENGTH: "full-length",
  TEASER: "teaser",
  CLIP: "clip",
}

/**
 * `common.video`. `videoType` is the authoritative field for consumers and the
 * only one the editor exposes. `legacyType` mirrors the retained legacy `type`
 * enum as a read-only passthrough so an existing value survives an edit
 * byte-identical (DW-11 human decision: keep both, document the split).
 */
export const videoFormSchema = z.object({
  url: z.string().trim().min(1).url(),
  legacyType: z.string().nullable(),
  videoType: z.string().min(1),
})

export const workFormSchema = z.object({
  title: z.string().trim().min(1),
  originalTitle: z.string(),
  slug: z.string(),
  type: z.enum(["film", "short-film", "play"]),
  synopsis: z.string(),
  duration: z.number().int().min(1).nullable(),
  releaseYear: z.number().int().min(1880).max(2100).nullable(),
  rating: z.number().min(0).max(10).nullable(),
  ageRating: z.string(),
  genreIds: z.array(z.string()),
  credits: z.array(creditFormSchema),
  cast: z.array(castFormSchema),
  distinctions: z.array(distinctionFormSchema),
  theatreDetails: theatreDetailsFormSchema,
  tmdbId: z.number().int().nullable(),
  imdbId: z.string(),
  links: z.array(linkFormSchema),
  videos: z.array(videoFormSchema),
  poster: mediaAssetSchema.nullable(),
  backdrop: mediaAssetSchema.nullable(),
  photos: z.array(mediaAssetSchema),
})

export type WorkFormValues = z.infer<typeof workFormSchema>
export type CreditFormValues = z.infer<typeof creditFormSchema>
export type CastFormValues = z.infer<typeof castFormSchema>
export type VideoFormValues = z.infer<typeof videoFormSchema>
export type DistinctionFormValues = z.infer<typeof distinctionFormSchema>

/**
 * Billing order accepted by `creditFormSchema` / `castFormSchema`. The editors
 * clamp on input: neither row renders an error slot for billing, so an
 * out-of-range value would otherwise block the submit with nothing on screen.
 *
 * An empty input (`undefined`, i.e. the editor cleared the field to retype it)
 * is NOT a value to clamp — snapping it to a bound mid-edit would rewrite what
 * the user is typing. Callers keep the previous value in that case.
 */
export function clampBilling(value: number | undefined): number | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined
  }
  return Math.min(999, Math.max(1, Math.round(value)))
}

export const EMPTY_CREDIT: CreditFormValues = {
  person: null,
  creditRole: null,
  customRole: "",
  billing: 99,
}

export const EMPTY_CAST: CastFormValues = {
  person: null,
  character: null,
  billing: 99,
}

/** A brand-new video carries no legacy `type` — it is sent as null. */
export const EMPTY_VIDEO: VideoFormValues = {
  url: "",
  legacyType: null,
  videoType: "trailer",
}

export const EMPTY_DISTINCTION: DistinctionFormValues = {
  name: "",
  edition: "",
  year: new Date().getFullYear(),
  section: "",
  category: "",
  result: "selected",
  awardName: "",
}

export const DEFAULT_THEATRE_DETAILS: WorkFormValues["theatreDetails"] = {
  playType: "original",
  format: "full-length",
  actCount: null,
  hasIntermission: false,
  basedOn: "",
  originalLanguage: "",
  performedLanguages: [],
  productionCompany: "",
  premiereDate: null,
  premiereVenueId: null,
  isTourProduction: false,
}

export const DEFAULT_WORK_VALUES: WorkFormValues = {
  title: "",
  originalTitle: "",
  slug: "",
  type: "film",
  synopsis: "",
  duration: null,
  releaseYear: null,
  rating: null,
  ageRating: "",
  genreIds: [],
  credits: [],
  cast: [],
  distinctions: [],
  theatreDetails: DEFAULT_THEATRE_DETAILS,
  tmdbId: null,
  imdbId: "",
  links: [],
  videos: [],
  poster: null,
  backdrop: null,
  photos: [],
}

/** Maps a fetched creative-work entity into form values */
export function workToFormValues(work: CreativeWork): WorkFormValues {
  return {
    title: work.title ?? "",
    originalTitle: work.originalTitle ?? "",
    slug: work.slug ?? "",
    type: work.type,
    synopsis: work.synopsis ?? "",
    duration: work.duration ?? null,
    releaseYear: work.releaseYear ?? null,
    rating: work.rating ?? null,
    ageRating: work.ageRating ?? "",
    genreIds: (work.genres ?? []).map((genre) => genre.documentId),
    credits: (work.credits ?? []).map((credit) => ({
      person: credit.person
        ? {
            id: credit.person.id,
            documentId: credit.person.documentId,
            name: credit.person.name,
          }
        : null,
      creditRole: credit.creditRole
        ? {
            id: credit.creditRole.id,
            documentId: credit.creditRole.documentId,
            name: credit.creditRole.name,
            slug: credit.creditRole.slug ?? null,
          }
        : null,
      customRole: credit.customRole ?? "",
      billing: credit.billing ?? 99,
    })),
    cast: (work.cast ?? []).map((castMember) => ({
      person: castMember.person
        ? {
            id: castMember.person.id,
            documentId: castMember.person.documentId,
            name: castMember.person.name,
          }
        : null,
      character: castMember.character
        ? {
            id: castMember.character.id,
            documentId: castMember.character.documentId,
            name: castMember.character.name,
          }
        : null,
      billing: castMember.billing ?? 99,
    })),
    distinctions: (work.distinctions ?? []).map((distinction) => ({
      name: distinction.name ?? "",
      edition: distinction.edition ?? "",
      year: distinction.year ?? new Date().getFullYear(),
      section: distinction.section ?? "",
      category: distinction.category ?? "",
      result: distinction.result ?? "selected",
      awardName: distinction.awardName ?? "",
    })),
    theatreDetails: work.theatreDetails
      ? {
          playType: work.theatreDetails.playType ?? "original",
          format: work.theatreDetails.format ?? "full-length",
          actCount: work.theatreDetails.actCount ?? null,
          hasIntermission: Boolean(work.theatreDetails.hasIntermission),
          basedOn: work.theatreDetails.basedOn ?? "",
          originalLanguage: work.theatreDetails.originalLanguage ?? "",
          performedLanguages: Array.isArray(
            work.theatreDetails.performedLanguages
          )
            ? work.theatreDetails.performedLanguages
            : [],
          productionCompany: work.theatreDetails.productionCompany ?? "",
          premiereDate: work.theatreDetails.premiereDate ?? null,
          premiereVenueId:
            work.theatreDetails.premiereVenue?.documentId ?? null,
          isTourProduction: Boolean(work.theatreDetails.isTourProduction),
        }
      : DEFAULT_THEATRE_DETAILS,
    tmdbId: work.externalIds?.tmdbId ?? null,
    imdbId: work.externalIds?.imdbId ?? "",
    links: (work.links ?? []).map((link) => ({
      type: link.type ?? "website",
      url: link.url ?? "",
      label: link.label ?? "",
    })),
    videos: (work.videos ?? []).map((video) => ({
      url: video.url ?? "",
      // read-only passthrough of the legacy enum, never edited
      legacyType: video.type ?? null,
      videoType:
        video.videoType ??
        (video.type ? LEGACY_TYPE_TO_VIDEO_TYPE[video.type] : undefined) ??
        "trailer",
    })),
    poster: work.poster ?? null,
    backdrop: work.backdrop ?? null,
    photos: work.photos ?? [],
  }
}

const orNull = (value: string) => (value.trim() ? value.trim() : null)

/** Maps validated form values to a content-manager payload */
export function workToApiPayload(
  values: WorkFormValues
): Record<string, unknown> {
  const isPlay = values.type === "play"
  const details = values.theatreDetails

  return {
    title: values.title.trim(),
    originalTitle: orNull(values.originalTitle),
    slug: orNull(values.slug),
    type: values.type,
    synopsis: orNull(values.synopsis),
    duration: values.duration,
    releaseYear: values.releaseYear,
    rating: values.rating,
    ageRating: values.ageRating || null,
    genres: values.genreIds,
    credits: values.credits.map((credit) => ({
      person: credit.person?.documentId ?? null,
      creditRole: credit.creditRole?.documentId ?? null,
      // `customRole` only labels the catch-all role. Sending it alongside a
      // named role would persist a contradiction ("Director" / "Producer"),
      // which is why the pre-2C.3 code nulled it outside the generic case.
      customRole: isGenericCreditRole(credit.creditRole?.slug)
        ? orNull(credit.customRole)
        : null,
      billing: credit.billing,
    })),
    cast: values.cast.map((castMember) => ({
      person: castMember.person?.documentId ?? null,
      character: castMember.character?.documentId ?? null,
      billing: castMember.billing,
    })),
    distinctions: values.distinctions.map((distinction) => ({
      name: distinction.name.trim(),
      edition: orNull(distinction.edition),
      year: distinction.year,
      section: orNull(distinction.section),
      category: orNull(distinction.category),
      result: distinction.result || null,
      awardName: orNull(distinction.awardName),
    })),
    theatreDetails: isPlay
      ? {
          playType: details.playType || null,
          format: details.format || null,
          actCount: details.actCount,
          hasIntermission: details.hasIntermission,
          basedOn: orNull(details.basedOn),
          originalLanguage: details.originalLanguage || null,
          performedLanguages: details.performedLanguages,
          productionCompany: orNull(details.productionCompany),
          premiereDate: details.premiereDate,
          premiereVenue: details.premiereVenueId,
          isTourProduction: details.isTourProduction,
        }
      : null,
    externalIds:
      values.tmdbId !== null || values.imdbId.trim()
        ? { tmdbId: values.tmdbId, imdbId: orNull(values.imdbId) }
        : null,
    links: values.links.map((link) => ({
      type: link.type,
      url: link.url.trim(),
      label: orNull(link.label),
    })),
    videos: values.videos.map((video) => ({
      url: video.url.trim(),
      // legacy enum echoed back exactly as loaded (null for new videos)
      type: video.legacyType ?? null,
      videoType: video.videoType || null,
    })),
    poster: values.poster?.id ?? null,
    backdrop: values.backdrop?.id ?? null,
    photos: values.photos.map((photo) => photo.id),
  }
}
