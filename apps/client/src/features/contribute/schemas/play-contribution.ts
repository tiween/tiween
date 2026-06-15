import { z } from "zod"

/**
 * Play Contribution Form Validation Schemas
 *
 * Returns error CODES (not messages) for i18n translation in UI
 * Following project convention from registerSchema.ts
 */

// =============================================================================
// Enums (matching Strapi schema exactly)
// =============================================================================

export const PLAY_TYPES = [
  "original",
  "adaptation",
  "revival",
  "translation",
  "devised",
] as const

export const PLAY_FORMATS = [
  "full-length",
  "one-act",
  "monologue",
  "sketch",
  "musical",
  "opera",
  "dance",
] as const

export const ORIGINAL_LANGUAGES = [
  "arabic",
  "darija",
  "french",
  "english",
  "arabic-french",
  "other",
] as const

export const AGE_RATINGS = ["TP", "PG12", "PG16", "PG18"] as const

export const CREDIT_ROLES = [
  "director",
  "playwright",
  "screenwriter",
  "adaptor",
  "translator",
  "composer",
  "musical-director",
  "choreographer",
  "cast",
  "set-designer",
  "costume-designer",
  "lighting-designer",
  "sound-designer",
  "projection-designer",
  "stage-manager",
  "producer",
  "executive-producer",
  "cinematographer",
  "editor",
  "other",
] as const

// Theatre-specific roles (subset for plays)
export const THEATRE_ROLES = [
  "playwright",
  "director",
  "adaptor",
  "translator",
  "composer",
  "musical-director",
  "choreographer",
  "cast",
  "set-designer",
  "costume-designer",
  "lighting-designer",
  "sound-designer",
  "projection-designer",
  "stage-manager",
  "producer",
  "other",
] as const

export const LINK_TYPES = [
  "website",
  "facebook",
  "instagram",
  "youtube",
  "twitter",
  "tiktok",
  "linkedin",
  "vimeo",
  "spotify",
  "soundcloud",
  "whatsapp",
  "phone",
  "email",
  "imdb",
  "tmdb",
  "letterboxd",
  "allocine",
  "wikipedia",
  "maps",
  "booking",
  "other",
] as const

export const VIDEO_TYPES = ["FULL_LENGTH", "TEASER", "CLIP"] as const

export const DISTINCTION_RESULTS = [
  "selected",
  "nominated",
  "winner",
  "special-mention",
  "honorable-mention",
  "grand-prize",
] as const

export const INPUT_LANGUAGES = ["ar", "fr", "en"] as const

// =============================================================================
// Sub-schemas
// =============================================================================

/**
 * Person reference - can be existing (with documentId) or new (just name)
 */
export const personReferenceSchema = z.object({
  documentId: z.string().optional(),
  name: z.string().min(1, "PERSON_NAME_REQUIRED"),
  isNew: z.boolean().optional(),
  photo: z.string().optional(), // URL or uploaded file path for new persons
  nationality: z.string().optional(),
})

export type PersonReference = z.infer<typeof personReferenceSchema>

/**
 * Credit - links a person to the play with a role
 */
export const creditSchema = z.object({
  person: personReferenceSchema,
  role: z.enum(THEATRE_ROLES, {
    errorMap: () => ({ message: "ROLE_REQUIRED" }),
  }),
  character: z.string().optional(), // For cast members
  customRole: z.string().optional(), // When role is "other"
  billing: z.number().min(1).optional(),
})

export type Credit = z.infer<typeof creditSchema>

/**
 * Video link with type classification
 */
export const videoSchema = z.object({
  url: z.string().url("INVALID_VIDEO_URL"),
  type: z.enum(VIDEO_TYPES).optional(),
})

export type Video = z.infer<typeof videoSchema>

/**
 * External link (social media, website, etc.)
 */
export const linkSchema = z.object({
  url: z.string().url("INVALID_URL"),
  type: z.enum(LINK_TYPES),
  label: z.string().optional(),
})

export type Link = z.infer<typeof linkSchema>

/**
 * Distinction - awards, festival selections, nominations
 */
export const distinctionSchema = z.object({
  name: z.string().min(1, "FESTIVAL_NAME_REQUIRED"),
  edition: z.string().optional(),
  year: z
    .number()
    .min(1900, "YEAR_TOO_OLD")
    .max(new Date().getFullYear() + 1, "YEAR_IN_FUTURE"),
  section: z.string().optional(),
  category: z.string().optional(),
  result: z.enum(DISTINCTION_RESULTS).default("selected"),
  awardName: z.string().optional(),
})

export type Distinction = z.infer<typeof distinctionSchema>

// =============================================================================
// Step Schemas (for per-step validation)
// =============================================================================

/**
 * Step 1: Basics
 */
export const basicsStepSchema = z.object({
  title: z.string().min(1, "TITLE_REQUIRED").max(200, "TITLE_TOO_LONG"),
  originalTitle: z
    .string()
    .max(200, "TITLE_TOO_LONG")
    .optional()
    .or(z.literal("")),
  releaseYear: z
    .number()
    .min(1900, "YEAR_TOO_OLD")
    .max(new Date().getFullYear() + 1, "YEAR_IN_FUTURE")
    .optional()
    .nullable(),
  duration: z
    .number()
    .min(1, "DURATION_TOO_SHORT")
    .max(600, "DURATION_TOO_LONG")
    .optional()
    .nullable(),
  synopsis: z
    .string()
    .max(5000, "SYNOPSIS_TOO_LONG")
    .optional()
    .or(z.literal("")),
  ageRating: z.enum(AGE_RATINGS).optional().nullable(),
})

export type BasicsStepData = z.infer<typeof basicsStepSchema>

/**
 * Step 2: Theatre Details
 */
export const theatreDetailsStepSchema = z.object({
  playType: z.enum(PLAY_TYPES, {
    errorMap: () => ({ message: "PLAY_TYPE_REQUIRED" }),
  }),
  format: z.enum(PLAY_FORMATS, {
    errorMap: () => ({ message: "FORMAT_REQUIRED" }),
  }),
  actCount: z.number().min(1, "ACT_COUNT_INVALID").optional().nullable(),
  hasIntermission: z.boolean().optional(),
  basedOn: z.string().optional().or(z.literal("")), // For adaptations
  originalLanguage: z.enum(ORIGINAL_LANGUAGES).optional().nullable(),
  productionCompany: z.string().optional().or(z.literal("")),
  premiereDate: z.string().optional().or(z.literal("")), // ISO date string
})

export type TheatreDetailsStepData = z.infer<typeof theatreDetailsStepSchema>

/**
 * Step 3: Credits
 */
export const creditsStepSchema = z
  .object({
    credits: z.array(creditSchema).min(1, "AT_LEAST_ONE_CREDIT_REQUIRED"),
  })
  .refine(
    (data) => {
      // At least one playwright or director required
      return data.credits.some((c) =>
        ["playwright", "director"].includes(c.role)
      )
    },
    {
      message: "PLAYWRIGHT_OR_DIRECTOR_REQUIRED",
      path: ["credits"],
    }
  )

export type CreditsStepData = z.infer<typeof creditsStepSchema>

/**
 * Step 4: Media & Links
 */
export const mediaStepSchema = z.object({
  // Poster can be uploaded file ID or external URL
  poster: z
    .string()
    .min(1, "POSTER_REQUIRED")
    .refine(
      (val) => {
        // Either a valid URL or an uploaded file path
        try {
          new URL(val)
          return true
        } catch {
          // Check if it looks like an upload path or file ID
          return val.length > 0
        }
      },
      { message: "INVALID_POSTER" }
    )
    .optional()
    .or(z.literal("")),
  photos: z.array(z.string()).optional(),
  videos: z.array(videoSchema).optional(),
  links: z.array(linkSchema).optional(),
  distinctions: z.array(distinctionSchema).optional(),
  genres: z.array(z.string()).optional(), // Genre document IDs
})

export type MediaStepData = z.infer<typeof mediaStepSchema>

/**
 * Step 5: Review & Submit
 */
export const reviewStepSchema = z.object({
  inputLanguage: z.enum(INPUT_LANGUAGES, {
    errorMap: () => ({ message: "INPUT_LANGUAGE_REQUIRED" }),
  }),
  submitterEmail: z
    .string()
    .email("INVALID_EMAIL")
    .optional()
    .or(z.literal("")),
  submitterName: z.string().optional().or(z.literal("")),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "TERMS_REQUIRED" }),
  }),
})

export type ReviewStepData = z.infer<typeof reviewStepSchema>

// =============================================================================
// Combined Schema (for final submission)
// =============================================================================

export const playContributionSchema = z.object({
  // Step 1: Basics
  title: z.string().min(1, "TITLE_REQUIRED").max(200, "TITLE_TOO_LONG"),
  originalTitle: z.string().max(200).optional(),
  releaseYear: z.number().min(1900).max(2030).optional().nullable(),
  duration: z.number().min(1).max(600).optional().nullable(),
  synopsis: z.string().max(5000).optional(),
  ageRating: z.enum(AGE_RATINGS).optional().nullable(),

  // Step 2: Theatre Details
  playType: z.enum(PLAY_TYPES),
  format: z.enum(PLAY_FORMATS),
  actCount: z.number().min(1).optional().nullable(),
  hasIntermission: z.boolean().optional(),
  basedOn: z.string().optional(),
  originalLanguage: z.enum(ORIGINAL_LANGUAGES).optional().nullable(),
  productionCompany: z.string().optional(),
  premiereDate: z.string().optional(),

  // Step 3: Credits
  credits: z.array(creditSchema).min(1),

  // Step 4: Media & Links
  poster: z.string().optional(),
  photos: z.array(z.string()).optional(),
  videos: z.array(videoSchema).optional(),
  links: z.array(linkSchema).optional(),
  distinctions: z.array(distinctionSchema).optional(),
  genres: z.array(z.string()).optional(),

  // Step 5: Submitter info
  inputLanguage: z.enum(INPUT_LANGUAGES),
  submitterEmail: z.string().email().optional(),
  submitterName: z.string().optional(),
})

export type PlayContributionData = z.infer<typeof playContributionSchema>

// =============================================================================
// Form State Type (with all steps combined)
// =============================================================================

export interface PlayContributionFormState {
  // Step data
  basics: BasicsStepData
  theatreDetails: TheatreDetailsStepData
  credits: CreditsStepData
  media: MediaStepData
  review: ReviewStepData

  // Wizard state
  currentStep: number
  completedSteps: number[]
  isDirty: boolean
}

export const STEP_NAMES = [
  "basics",
  "theatreDetails",
  "credits",
  "media",
  "review",
] as const

export type StepName = (typeof STEP_NAMES)[number]

export const TOTAL_STEPS = STEP_NAMES.length
