"use client"

import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { useContributeForm } from "../context/ContributeFormContext"
import { TOTAL_STEPS } from "../schemas/play-contribution"

interface WizardNavigationProps {
  labels: {
    next: string
    previous: string
    saveDraft: string
    submit: string
  }
  onStepValidate?: () => boolean
}

export function WizardNavigation({
  labels,
  onStepValidate,
}: WizardNavigationProps) {
  const {
    currentStep,
    canGoPrev,
    nextStep,
    prevStep,
    saveDraft,
    lastSavedAt,
    isSubmitting,
    submitForm,
  } = useContributeForm()

  const isLastStep = currentStep === TOTAL_STEPS - 1

  const handleNext = () => {
    // If parent provides validation callback, check it first
    if (onStepValidate && !onStepValidate()) {
      return
    }
    nextStep()
  }

  const handleSubmit = async () => {
    // If parent provides validation callback, check it first
    if (onStepValidate && !onStepValidate()) {
      return
    }
    await submitForm()
  }

  // Format last saved time
  const formatLastSaved = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "just now"
    if (diffMins === 1) return "1 min ago"
    if (diffMins < 60) return `${diffMins} mins ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return "1 hour ago"
    return `${diffHours} hours ago`
  }

  return (
    <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
      {/* Save draft status */}
      {lastSavedAt && (
        <p className="text-center text-xs text-white/50">
          Draft saved {formatLastSaved(lastSavedAt)}
        </p>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        {/* Previous button */}
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={!canGoPrev || isSubmitting}
          className={cn(
            "gap-2",
            !canGoPrev && "invisible" // Keep space but hide
          )}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          <span className="hidden sm:inline">{labels.previous}</span>
        </Button>

        {/* Save draft button (center) */}
        <Button
          type="button"
          variant="ghost"
          onClick={saveDraft}
          disabled={isSubmitting}
          className="gap-2 text-white/60 hover:text-white"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.saveDraft}</span>
        </Button>

        {/* Next / Submit button */}
        {isLastStep ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-tiween-yellow text-tiween-green hover:bg-tiween-yellow/90 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              labels.submit
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-tiween-yellow text-tiween-green hover:bg-tiween-yellow/90 gap-2"
          >
            <span>{labels.next}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        )}
      </div>
    </div>
  )
}
