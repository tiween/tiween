// Import the type from schema

// Local alias to avoid duplicate export
import type { PersonSearchResult as PersonSearchResultType } from "../schemas/person"
// Import Credit type
import type { Credit, PlayContributionData } from "../schemas/play-contribution"

/**
 * Contribute Feature Types
 */

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
} from "../schemas/play-contribution"

export type {
  CreatePersonData,
  PersonSearchResult,
  PersonSelection,
} from "../schemas/person"

// =============================================================================
// Wizard Types
// =============================================================================

export interface WizardStep {
  id: number
  name: string
  key: string
  isCompleted: boolean
  isActive: boolean
}

export interface WizardContextValue {
  // Current state
  currentStep: number
  completedSteps: Set<number>
  isDirty: boolean

  // Navigation
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  canGoNext: boolean
  canGoPrev: boolean
  canNavigateTo: (step: number) => boolean

  // Form data (aggregated from all steps)
  formData: Partial<PlayContributionData>
  updateFormData: (data: Partial<PlayContributionData>) => void

  // Step completion
  markStepCompleted: (step: number) => void
  markStepIncomplete: (step: number) => void

  // Draft management
  saveDraft: () => void
  loadDraft: () => boolean
  clearDraft: () => void
  lastSavedAt: Date | null

  // Submission
  isSubmitting: boolean
  submitError: string | null
  submitForm: () => Promise<void>
}

// =============================================================================
// API Types
// =============================================================================

export interface ContributeApiResponse {
  data?: {
    id: number
    documentId: string
  }
  error?: {
    message: string
    details?: unknown
  }
}

export interface PersonSearchResponse {
  data: PersonSearchResultType[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// =============================================================================
// UI Types
// =============================================================================

export interface StepProps {
  onValidationChange?: (isValid: boolean) => void
}

export interface CreditCardProps {
  credit: Credit
  index: number
  onUpdate: (index: number, credit: Credit) => void
  onRemove: (index: number) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

// =============================================================================
// i18n Label Types
// =============================================================================

export interface ContributeLabels {
  steps: {
    basics: string
    theatreDetails: string
    credits: string
    media: string
    review: string
  }
  fields: {
    title: string
    originalTitle: string
    synopsis: string
    releaseYear: string
    duration: string
    ageRating: string
    playType: string
    format: string
    actCount: string
    hasIntermission: string
    basedOn: string
    originalLanguage: string
    productionCompany: string
    premiereDate: string
    person: string
    role: string
    character: string
    poster: string
    videos: string
    links: string
    distinctions: string
    inputLanguage: string
    submitterEmail: string
    submitterName: string
    acceptTerms: string
  }
  buttons: {
    next: string
    previous: string
    submit: string
    saveDraft: string
    addCredit: string
    addVideo: string
    addLink: string
    addAward: string
    remove: string
    cancel: string
    createPerson: string
  }
  errors: Record<string, string>
  tooltips: {
    originalTitle: string
    basedOn: string
    inputLanguage: string
  }
  placeholders: {
    title: string
    synopsis: string
    searchPerson: string
    videoUrl: string
  }
  success: {
    title: string
    message: string
    submitAnother: string
  }
}
