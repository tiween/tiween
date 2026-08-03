"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { ReactNode } from "react"
import type { PlayContributionData, WizardContextValue } from "../types"

import {
  basicsStepSchema,
  creditsStepSchema,
  mediaStepSchema,
  migrateDraftVideoType,
  reviewStepSchema,
  STEP_NAMES,
  theatreDetailsStepSchema,
  TOTAL_STEPS,
} from "../schemas/play-contribution"

const DRAFT_STORAGE_KEY = "tiween:contribute:play:draft"
const AUTOSAVE_DELAY = 2000 // 2 seconds

// Default empty form data
const getDefaultFormData = (): Partial<PlayContributionData> => ({
  title: "",
  originalTitle: "",
  releaseYear: undefined,
  duration: undefined,
  synopsis: "",
  ageRating: undefined,
  playType: undefined,
  format: undefined,
  actCount: undefined,
  hasIntermission: false,
  basedOn: "",
  originalLanguage: undefined,
  productionCompany: "",
  premiereDate: "",
  credits: [],
  poster: "",
  photos: [],
  videos: [],
  links: [],
  distinctions: [],
  genres: [],
  inputLanguage: undefined,
  submitterEmail: "",
  submitterName: "",
})

// Step validation schemas map
const stepSchemas = {
  basics: basicsStepSchema,
  theatreDetails: theatreDetailsStepSchema,
  credits: creditsStepSchema,
  media: mediaStepSchema,
  review: reviewStepSchema,
} as const

const ContributeFormContext = createContext<WizardContextValue | null>(null)

interface ContributeFormProviderProps {
  children: ReactNode
  onSubmitSuccess?: (documentId: string) => void
}

export function ContributeFormProvider({
  children,
  onSubmitSuccess,
}: ContributeFormProviderProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isDirty, setIsDirty] = useState(false)

  // Form data
  const [formData, setFormData] =
    useState<Partial<PlayContributionData>>(getDefaultFormData)

  // Draft management
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ==========================================================================
  // Draft persistence
  // ==========================================================================

  const saveDraft = useCallback(() => {
    try {
      const draftData = {
        formData,
        completedSteps: Array.from(completedSteps),
        currentStep,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData))
      setLastSavedAt(new Date())
    } catch (error) {
      console.error("Failed to save draft:", error)
    }
  }, [formData, completedSteps, currentStep])

  const loadDraft = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!saved) return false

      const {
        formData: savedData,
        completedSteps: savedSteps,
        currentStep: savedStep,
        savedAt,
      } = JSON.parse(saved)

      // Drafts are stored unversioned, so one saved before the video
      // vocabulary switch (DW-10) still carries the legacy enum values.
      setFormData({
        ...savedData,
        // Array.isArray, not truthiness: a corrupt `videos` would otherwise
        // throw inside .map, get caught below, and discard the user's entire
        // draft over one bad field.
        ...(Array.isArray(savedData?.videos)
          ? {
              videos: savedData.videos.map(
                (video: { url: string; type?: string }) => ({
                  ...video,
                  type: migrateDraftVideoType(video.type),
                })
              ),
            }
          : {}),
      })
      setCompletedSteps(new Set(savedSteps))
      setCurrentStep(savedStep)
      setLastSavedAt(new Date(savedAt))
      setDraftLoaded(true)
      return true
    } catch (error) {
      console.error("Failed to load draft:", error)
      return false
    }
  }, [])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setFormData(getDefaultFormData())
      setCompletedSteps(new Set())
      setCurrentStep(0)
      setLastSavedAt(null)
      setIsDirty(false)
    } catch (error) {
      console.error("Failed to clear draft:", error)
    }
  }, [])

  // Auto-save when form data changes
  useEffect(() => {
    if (!isDirty) return

    const timer = setTimeout(() => {
      saveDraft()
    }, AUTOSAVE_DELAY)

    return () => clearTimeout(timer)
  }, [formData, isDirty, saveDraft])

  // Load draft on mount
  useEffect(() => {
    if (!draftLoaded) {
      loadDraft()
    }
  }, [draftLoaded, loadDraft])

  // ==========================================================================
  // Form data management
  // ==========================================================================

  const updateFormData = useCallback((data: Partial<PlayContributionData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
    setIsDirty(true)
  }, [])

  // ==========================================================================
  // Step validation
  // ==========================================================================

  const validateStep = useCallback(
    (step: number): boolean => {
      const stepName = STEP_NAMES[step]
      if (!stepName) return false
      const schema = stepSchemas[stepName]

      // Extract step-specific data from formData
      let stepData: Record<string, unknown> = {}

      switch (stepName) {
        case "basics":
          stepData = {
            title: formData.title,
            originalTitle: formData.originalTitle,
            releaseYear: formData.releaseYear,
            duration: formData.duration,
            synopsis: formData.synopsis,
            ageRating: formData.ageRating,
          }
          break
        case "theatreDetails":
          stepData = {
            playType: formData.playType,
            format: formData.format,
            actCount: formData.actCount,
            hasIntermission: formData.hasIntermission,
            basedOn: formData.basedOn,
            originalLanguage: formData.originalLanguage,
            productionCompany: formData.productionCompany,
            premiereDate: formData.premiereDate,
          }
          break
        case "credits":
          stepData = {
            credits: formData.credits,
          }
          break
        case "media":
          stepData = {
            poster: formData.poster,
            photos: formData.photos,
            videos: formData.videos,
            links: formData.links,
            distinctions: formData.distinctions,
            genres: formData.genres,
          }
          break
        case "review":
          stepData = {
            inputLanguage: formData.inputLanguage,
            submitterEmail: formData.submitterEmail,
            submitterName: formData.submitterName,
            acceptTerms: true, // Will be validated in the review step component
          }
          break
      }

      const result = schema.safeParse(stepData)
      return result.success
    },
    [formData]
  )

  // ==========================================================================
  // Navigation
  // ==========================================================================

  const canNavigateTo = useCallback(
    (step: number): boolean => {
      if (step < 0 || step >= TOTAL_STEPS) return false
      if (step <= currentStep) return true // Can always go back
      // Can only go forward if current step is valid
      return validateStep(currentStep)
    },
    [currentStep, validateStep]
  )

  const goToStep = useCallback(
    (step: number) => {
      if (canNavigateTo(step)) {
        setCurrentStep(step)
      }
    },
    [canNavigateTo]
  )

  const nextStep = useCallback(() => {
    // Validation is handled by the step component via onStepValidate callback.
    // We don't re-validate here because the context's formData may lag behind
    // React Hook Form state due to async useEffect syncing.
    if (currentStep < TOTAL_STEPS - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]))
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const canGoNext = useMemo(() => currentStep < TOTAL_STEPS - 1, [currentStep])

  const canGoPrev = useMemo(() => currentStep > 0, [currentStep])

  // ==========================================================================
  // Step completion
  // ==========================================================================

  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]))
  }, [])

  const markStepIncomplete = useCallback((step: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev)
      newSet.delete(step)
      return newSet
    })
  }, [])

  // ==========================================================================
  // Form submission
  // ==========================================================================

  const submitForm = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/contribute/play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: formData,
          inputLanguage: formData.inputLanguage,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || "SUBMISSION_FAILED")
      }

      // Clear draft on success
      clearDraft()

      // Notify parent
      if (onSubmitSuccess && result.data?.documentId) {
        onSubmitSuccess(result.data.documentId)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SUBMISSION_FAILED"
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, clearDraft, onSubmitSuccess])

  // ==========================================================================
  // Context value
  // ==========================================================================

  const value: WizardContextValue = useMemo(
    () => ({
      currentStep,
      completedSteps,
      isDirty,
      goToStep,
      nextStep,
      prevStep,
      canGoNext,
      canGoPrev,
      canNavigateTo,
      formData,
      updateFormData,
      markStepCompleted,
      markStepIncomplete,
      saveDraft,
      loadDraft,
      clearDraft,
      lastSavedAt,
      isSubmitting,
      submitError,
      submitForm,
    }),
    [
      currentStep,
      completedSteps,
      isDirty,
      goToStep,
      nextStep,
      prevStep,
      canGoNext,
      canGoPrev,
      canNavigateTo,
      formData,
      updateFormData,
      markStepCompleted,
      markStepIncomplete,
      saveDraft,
      loadDraft,
      clearDraft,
      lastSavedAt,
      isSubmitting,
      submitError,
      submitForm,
    ]
  )

  return (
    <ContributeFormContext.Provider value={value}>
      {children}
    </ContributeFormContext.Provider>
  )
}

export function useContributeForm(): WizardContextValue {
  const context = useContext(ContributeFormContext)
  if (!context) {
    throw new Error(
      "useContributeForm must be used within a ContributeFormProvider"
    )
  }
  return context
}
