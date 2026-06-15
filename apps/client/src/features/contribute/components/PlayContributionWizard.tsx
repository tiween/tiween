"use client"

import { useCallback, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, CheckCircle2, Plus } from "lucide-react"

import type { ContributeLabels } from "../types"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import {
  ContributeFormProvider,
  useContributeForm,
} from "../context/ContributeFormContext"
import { BasicsStep } from "./steps/BasicsStep"
import { CreditsStep } from "./steps/CreditsStep"
import { MediaStep } from "./steps/MediaStep"
import { ReviewStep } from "./steps/ReviewStep"
import { TheatreDetailsStep } from "./steps/TheatreDetailsStep"
import { WizardNavigation } from "./WizardNavigation"
import { WizardProgress } from "./WizardProgress"

interface PlayContributionWizardProps {
  labels: ContributeLabels
  onSuccess?: () => void
}

// Step animation variants
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
  }),
}

function WizardContent({ labels, onSuccess }: PlayContributionWizardProps) {
  const { currentStep, submitError, isSubmitting } = useContributeForm()
  const [direction, setDirection] = useState(0)
  const [isSuccess, setIsSuccess] = useState(false)
  const stepValidateRef = useRef<(() => boolean) | null>(null)

  // Track step changes for animation direction
  const prevStepRef = useRef(currentStep)
  if (prevStepRef.current !== currentStep) {
    setDirection(currentStep > prevStepRef.current ? 1 : -1)
    prevStepRef.current = currentStep
  }

  const handleSuccess = useCallback(() => {
    setIsSuccess(true)
    onSuccess?.()
  }, [onSuccess])

  const handleStepValidate = useCallback((): boolean => {
    if (stepValidateRef.current) {
      return stepValidateRef.current()
    }
    return true
  }, [])

  const handleStartNew = useCallback(() => {
    setIsSuccess(false)
    // Context will reset via clearDraft
  }, [])

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-6 py-12 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">
            {labels.success.title}
          </h2>
          <p className="max-w-md text-white/70">{labels.success.message}</p>
        </div>
        <Button
          onClick={handleStartNew}
          className="bg-tiween-yellow text-tiween-green hover:bg-tiween-yellow/90 gap-2"
        >
          <Plus className="h-4 w-4" />
          {labels.success.submitAnother}
        </Button>
      </motion.div>
    )
  }

  // Step components
  const steps = [
    <BasicsStep
      key="basics"
      labels={labels}
      onValidateRef={(fn) => (stepValidateRef.current = fn)}
    />,
    <TheatreDetailsStep
      key="theatreDetails"
      labels={labels}
      onValidateRef={(fn) => (stepValidateRef.current = fn)}
    />,
    <CreditsStep
      key="credits"
      labels={labels}
      onValidateRef={(fn) => (stepValidateRef.current = fn)}
    />,
    <MediaStep
      key="media"
      labels={labels}
      onValidateRef={(fn) => (stepValidateRef.current = fn)}
    />,
    <ReviewStep
      key="review"
      labels={labels}
      onValidateRef={(fn) => (stepValidateRef.current = fn)}
      onSuccess={handleSuccess}
    />,
  ]

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <WizardProgress labels={labels.steps} />

      {/* Error display */}
      {submitError && (
        <Alert
          variant="destructive"
          className="border-red-500/50 bg-red-500/10"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {labels.errors[submitError] || submitError}
          </AlertDescription>
        </Alert>
      )}

      {/* Step content with animation */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full"
          >
            {steps[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <WizardNavigation
        labels={labels.buttons}
        onStepValidate={handleStepValidate}
      />
    </div>
  )
}

export function PlayContributionWizard(props: PlayContributionWizardProps) {
  return (
    <ContributeFormProvider>
      <WizardContent {...props} />
    </ContributeFormProvider>
  )
}
