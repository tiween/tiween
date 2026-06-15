/**
 * Contribute Feature Schemas
 */

export {
  // Play contribution schemas
  playContributionSchema,
  basicsStepSchema,
  theatreDetailsStepSchema,
  creditsStepSchema,
  mediaStepSchema,
  reviewStepSchema,

  // Sub-schemas
  creditSchema,
  personReferenceSchema,
  videoSchema,
  linkSchema,
  distinctionSchema,

  // Enums
  PLAY_TYPES,
  PLAY_FORMATS,
  ORIGINAL_LANGUAGES,
  AGE_RATINGS,
  CREDIT_ROLES,
  THEATRE_ROLES,
  LINK_TYPES,
  VIDEO_TYPES,
  DISTINCTION_RESULTS,
  INPUT_LANGUAGES,

  // Constants
  STEP_NAMES,
  TOTAL_STEPS,
} from "./play-contribution"

export type {
  PlayContributionData,
  PlayContributionFormState,
  BasicsStepData,
  TheatreDetailsStepData,
  CreditsStepData,
  MediaStepData,
  ReviewStepData,
  Credit,
  PersonReference,
  Video,
  Link,
  Distinction,
  StepName,
} from "./play-contribution"

export { createPersonSchema } from "./person"
export type {
  CreatePersonData,
  PersonSearchResult,
  PersonSelection,
} from "./person"
