"use client"

import { useCallback, useEffect, useState } from "react"

import type { PlayContributionData } from "../schemas/play-contribution"

const DRAFT_STORAGE_KEY = "tiween:contribute:play:draft"

interface DraftData {
  formData: Partial<PlayContributionData>
  completedSteps: number[]
  currentStep: number
  savedAt: string
}

interface UseLocalDraftReturn {
  lastSavedAt: Date | null
  saveDraft: (data: DraftData) => void
  loadDraft: () => DraftData | null
  clearDraft: () => void
  hasDraft: boolean
}

/**
 * Hook for managing local draft persistence in localStorage
 *
 * Features:
 * - Auto-loads draft on mount
 * - Saves draft with timestamp
 * - Clears draft on explicit call
 * - Handles localStorage errors gracefully
 */
export function useLocalDraft(): UseLocalDraftReturn {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as DraftData
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is a browser-only API, so the draft cannot be read during (SSR) render; a mount effect is the only place this state can be seeded.
        setLastSavedAt(new Date(parsed.savedAt))
        setHasDraft(true)
      }
    } catch {
      // Ignore errors - draft might be corrupted
    }
  }, [])

  const saveDraft = useCallback((data: DraftData) => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data))
      setLastSavedAt(new Date(data.savedAt))
      setHasDraft(true)
    } catch (error) {
      console.error("Failed to save draft:", error)
    }
  }, [])

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!saved) return null

      const parsed = JSON.parse(saved) as DraftData
      setLastSavedAt(new Date(parsed.savedAt))
      setHasDraft(true)
      return parsed
    } catch (error) {
      console.error("Failed to load draft:", error)
      return null
    }
  }, [])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setLastSavedAt(null)
      setHasDraft(false)
    } catch (error) {
      console.error("Failed to clear draft:", error)
    }
  }, [])

  return {
    lastSavedAt,
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
  }
}

/**
 * Format the last saved time in a human-readable way
 */
export function formatLastSaved(date: Date, locale: string = "en"): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  // Use Intl.RelativeTimeFormat for localized output
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  if (diffMins < 1) {
    return rtf.format(0, "minute") // "now" in most locales
  }
  if (diffMins < 60) {
    return rtf.format(-diffMins, "minute")
  }

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    return rtf.format(-diffHours, "hour")
  }

  const diffDays = Math.floor(diffHours / 24)
  return rtf.format(-diffDays, "day")
}
