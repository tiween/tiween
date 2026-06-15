/**
 * Confidence scoring for crawled plays
 */

import type { NormalizedPlay } from "../types.js"

interface ConfidenceWeights {
  title: number
  title_ar: number
  synopsis: number
  directors: number
  cast: number
  duration: number
  releaseYear: number
  poster: number
}

const DEFAULT_WEIGHTS: ConfidenceWeights = {
  title: 0.2, // Required field, high weight
  title_ar: 0.1, // Important for bilingual content
  synopsis: 0.15, // Provides context for users
  directors: 0.15, // Key metadata
  cast: 0.1, // Helpful but often incomplete
  duration: 0.1, // Nice to have
  releaseYear: 0.1, // Important for identification
  poster: 0.1, // Visual appeal
}

/**
 * Calculate confidence score for a normalized play
 * @param play The normalized play to score
 * @param weights Optional custom weights
 * @returns Score between 0 and 1
 */
export function calculateConfidence(
  play: Partial<NormalizedPlay>,
  weights: ConfidenceWeights = DEFAULT_WEIGHTS
): number {
  let score = 0

  // Title (required)
  if (play.title && play.title.trim().length > 0) {
    score += weights.title
  }

  // Arabic title
  if (play.title_ar && play.title_ar.trim().length > 0) {
    score += weights.title_ar
  }

  // Synopsis
  if (play.synopsis && play.synopsis.trim().length > 20) {
    score += weights.synopsis
  }

  // Directors (at least one)
  if (play.directors && play.directors.length > 0) {
    score += weights.directors
  }

  // Cast (at least one)
  if (play.cast && play.cast.length > 0) {
    score += weights.cast
  }

  // Duration
  if (play.duration && play.duration > 0) {
    score += weights.duration
  }

  // Release year
  if (
    play.releaseYear &&
    play.releaseYear > 1900 &&
    play.releaseYear <= new Date().getFullYear() + 1
  ) {
    score += weights.releaseYear
  }

  // Poster
  if (play.poster && play.poster.trim().length > 0) {
    score += weights.poster
  }

  // Ensure score is between 0 and 1
  return Math.min(1, Math.max(0, score))
}

/**
 * Determine if a play needs manual review based on confidence
 * @param confidence The confidence score
 * @param threshold The threshold below which review is needed
 */
export function needsReview(
  confidence: number,
  threshold: number = 0.5
): boolean {
  return confidence < threshold
}

/**
 * Get a human-readable confidence level
 */
export function getConfidenceLevel(
  confidence: number
): "high" | "medium" | "low" {
  if (confidence >= 0.8) return "high"
  if (confidence >= 0.5) return "medium"
  return "low"
}

/**
 * Get missing fields for a play
 */
export function getMissingFields(play: Partial<NormalizedPlay>): string[] {
  const missing: string[] = []

  if (!play.title || play.title.trim().length === 0) {
    missing.push("title")
  }
  if (!play.title_ar || play.title_ar.trim().length === 0) {
    missing.push("title_ar")
  }
  if (!play.synopsis || play.synopsis.trim().length < 20) {
    missing.push("synopsis")
  }
  if (!play.directors || play.directors.length === 0) {
    missing.push("directors")
  }
  if (!play.cast || play.cast.length === 0) {
    missing.push("cast")
  }
  if (!play.duration || play.duration <= 0) {
    missing.push("duration")
  }
  if (!play.releaseYear) {
    missing.push("releaseYear")
  }
  if (!play.poster || play.poster.trim().length === 0) {
    missing.push("poster")
  }

  return missing
}
