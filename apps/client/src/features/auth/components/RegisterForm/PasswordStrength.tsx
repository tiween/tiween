"use client"

import * as React from "react"

import type { PasswordStrength } from "./registerSchema"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

import { getPasswordStrength } from "./registerSchema"

/**
 * Localized labels for PasswordStrength
 */
export interface PasswordStrengthLabels {
  weak: string
  medium: string
  strong: string
}

const defaultLabels: PasswordStrengthLabels = {
  weak: "Faible",
  medium: "Moyen",
  strong: "Fort",
}

export interface PasswordStrengthIndicatorProps {
  /** The password to evaluate */
  password: string
  /** Localized labels */
  labels?: PasswordStrengthLabels
  /** Additional class names */
  className?: string
}

/**
 * Maps strength levels to progress values
 */
const strengthProgressMap: Record<PasswordStrength, number> = {
  weak: 33,
  medium: 66,
  strong: 100,
}

/**
 * Maps strength levels to indicator colors
 */
const strengthColorMap: Record<PasswordStrength, string> = {
  weak: "[&>[role=progressbar]]:bg-destructive",
  medium: "[&>[role=progressbar]]:bg-warning",
  strong: "[&>[role=progressbar]]:bg-success",
}

/**
 * Maps strength levels to text colors
 */
const strengthTextColorMap: Record<PasswordStrength, string> = {
  weak: "text-destructive",
  medium: "text-warning",
  strong: "text-success",
}

/**
 * PasswordStrengthIndicator - Visual password strength meter
 *
 * Features:
 * - Progress bar showing strength level
 * - Color-coded feedback (red/yellow/green)
 * - Localized strength labels
 * - Full RTL support
 *
 * @example
 * ```tsx
 * <PasswordStrengthIndicator
 *   password={password}
 *   labels={{ weak: "Weak", medium: "Medium", strong: "Strong" }}
 * />
 * ```
 */
export function PasswordStrengthIndicator({
  password,
  labels = defaultLabels,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password)
  const progress = strengthProgressMap[strength]
  const colorClass = strengthColorMap[strength]
  const textColorClass = strengthTextColorMap[strength]

  // Don't show indicator if password is empty
  if (!password) {
    return null
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Progress value={progress} className={cn("h-1.5", colorClass)} />
      <p className={cn("text-xs font-medium", textColorClass)}>
        {labels[strength]}
      </p>
    </div>
  )
}

PasswordStrengthIndicator.displayName = "PasswordStrengthIndicator"
