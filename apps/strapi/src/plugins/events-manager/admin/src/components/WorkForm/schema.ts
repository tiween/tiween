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

const mediaAssetSchema = z.custom<MediaAsset>((value) =>
  Boolean(value && typeof value === "object" && "url" in value)
)

export const creditFormSchema = z
  .object({
    person: personRefSchema.nullable(),
    role: z.string().min(1),
    character: z.string(),
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
    if (credit.role === "other" && !credit.customRole.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customRole"],
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

export const videoFormSchema = z.object({
  url: z.string().trim().min(1).url(),
  type: z.string(),
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
export type DistinctionFormValues = z.infer<typeof distinctionFormSchema>

export const EMPTY_CREDIT: CreditFormValues = {
  person: null,
  role: "cast",
  character: "",
  customRole: "",
  billing: 99,
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
      role: credit.role ?? "cast",
      character: credit.character ?? "",
      customRole: credit.customRole ?? "",
      billing: credit.billing ?? 99,
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
      type: video.type ?? "TEASER",
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
      person: credit.person?.documentId,
      role: credit.role,
      character: credit.role === "cast" ? orNull(credit.character) : null,
      customRole: credit.role === "other" ? orNull(credit.customRole) : null,
      billing: credit.billing,
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
      type: video.type || null,
    })),
    poster: values.poster?.id ?? null,
    backdrop: values.backdrop?.id ?? null,
    photos: values.photos.map((photo) => photo.id),
  }
}
