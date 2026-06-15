"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import { useContributeForm } from "../context/ContributeFormContext"
import { STEP_NAMES, TOTAL_STEPS } from "../schemas/play-contribution"

interface WizardProgressProps {
  labels: {
    basics: string
    theatreDetails: string
    credits: string
    media: string
    review: string
  }
}

export function WizardProgress({ labels }: WizardProgressProps) {
  const { currentStep, completedSteps, canNavigateTo, goToStep } =
    useContributeForm()

  const stepLabels = [
    labels.basics,
    labels.theatreDetails,
    labels.credits,
    labels.media,
    labels.review,
  ]

  return (
    <nav aria-label="Progress" className="w-full">
      {/* Desktop: Horizontal stepper */}
      <ol className="hidden list-none items-center justify-between gap-2 md:flex">
        {STEP_NAMES.map((stepName, index) => {
          const isCompleted = completedSteps.has(index)
          const isCurrent = currentStep === index
          const isClickable = canNavigateTo(index)

          return (
            <li key={stepName} className="relative flex-1">
              <button
                type="button"
                onClick={() => isClickable && goToStep(index)}
                disabled={!isClickable}
                className={cn(
                  "group flex w-full flex-col items-center",
                  isClickable && "cursor-pointer",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Step indicator */}
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-200",
                    // Current step
                    isCurrent &&
                      "border-tiween-yellow bg-tiween-yellow text-tiween-green scale-110",
                    // Completed step
                    isCompleted &&
                      !isCurrent &&
                      "border-green-500 bg-green-500 text-white",
                    // Future step
                    !isCompleted &&
                      !isCurrent &&
                      "border-white/30 bg-transparent text-white/60",
                    // Hover on clickable
                    isClickable &&
                      !isCurrent &&
                      "group-hover:border-tiween-yellow/50 group-hover:scale-105"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>

                {/* Step label */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium transition-colors duration-200",
                    isCurrent && "text-tiween-yellow",
                    isCompleted && !isCurrent && "text-green-400",
                    !isCompleted && !isCurrent && "text-white/60"
                  )}
                >
                  {stepLabels[index]}
                </span>
              </button>

              {/* Connector line */}
              {index < TOTAL_STEPS - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-1/2 h-0.5 w-full -translate-y-1/2",
                    completedSteps.has(index) ? "bg-green-500" : "bg-white/20"
                  )}
                  style={{
                    left: "calc(50% + 24px)",
                    width: "calc(100% - 48px)",
                  }}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>

      {/* Mobile: Compact indicator */}
      <div className="md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-white">
            {stepLabels[currentStep]}
          </span>
          <span className="text-sm text-white/60">
            {currentStep + 1} / {TOTAL_STEPS}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="bg-tiween-yellow h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>

        {/* Step dots */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {STEP_NAMES.map((stepName, index) => {
            const isCompleted = completedSteps.has(index)
            const isCurrent = currentStep === index

            return (
              <button
                key={stepName}
                type="button"
                onClick={() => canNavigateTo(index) && goToStep(index)}
                disabled={!canNavigateTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-200",
                  isCurrent && "bg-tiween-yellow w-6",
                  isCompleted && !isCurrent && "w-2 bg-green-500",
                  !isCompleted && !isCurrent && "w-2 bg-white/30"
                )}
                aria-label={`Go to step ${index + 1}: ${stepLabels[index]}`}
                aria-current={isCurrent ? "step" : undefined}
              />
            )
          })}
        </div>
      </div>
    </nav>
  )
}
