/**
 * Normalizer service - transforms raw crawled data to normalized format
 */

import type {
  AdapterResult,
  NormalizedPerson,
  NormalizedPlay,
  RawPersonData,
  RawPlayData,
} from "../types.js"

import { calculateConfidence, needsReview } from "../utils/confidence.js"
import {
  cleanText,
  detectLanguage,
  generateSlug,
  isArabic,
  isPrimarilyArabic,
} from "../utils/text.js"

/**
 * Normalize a raw play to the standard format
 */
export function normalizePlay(
  raw: RawPlayData,
  sourceName: string
): NormalizedPlay {
  // Determine title languages
  let title = raw.title
  let title_ar: string | undefined
  let originalTitle: string | undefined

  if (raw.title) {
    const lang = detectLanguage(raw.title)
    if (lang === "ar") {
      title_ar = raw.title
      title = raw.alternativeTitle || raw.title
      originalTitle = raw.title
    } else {
      title = raw.title
      if (raw.alternativeTitle && isPrimarilyArabic(raw.alternativeTitle)) {
        title_ar = raw.alternativeTitle
        originalTitle = raw.alternativeTitle
      }
    }
  }

  // Generate slug
  const slug = generateSlug(title || title_ar || "untitled")

  // Determine synopsis languages
  let synopsis: string | undefined
  let synopsis_ar: string | undefined

  if (raw.description) {
    const lang = detectLanguage(raw.description)
    if (lang === "ar") {
      synopsis_ar = cleanText(raw.description)
    } else {
      synopsis = cleanText(raw.description)
    }
  }

  // Normalize directors to slugs
  const directors = (raw.directors || []).map((name) => generateSlug(name))

  // Normalize cast to slugs
  const cast = (raw.cast || []).map((name) => generateSlug(name))

  // Build normalized play
  const play: NormalizedPlay = {
    title: title || "Sans titre",
    title_ar,
    originalTitle,
    slug,
    type: "play",
    synopsis,
    synopsis_ar,
    duration: raw.duration,
    releaseYear: raw.year,
    directors,
    cast,
    poster: raw.posterUrl,
    confidence: 0, // Will be calculated
    needsReview: false, // Will be calculated
    source: sourceName,
    sourceUrl: raw.sourceUrl,
  }

  // Calculate confidence
  play.confidence = calculateConfidence(play)
  play.needsReview = needsReview(play.confidence)

  return play
}

/**
 * Normalize a raw person to the standard format
 */
export function normalizePerson(raw: RawPersonData): NormalizedPerson {
  let name = raw.name
  let name_ar: string | undefined

  // Detect if name is Arabic
  if (isPrimarilyArabic(raw.name)) {
    name_ar = raw.name
    // Keep the same for slug generation
  }

  const slug = generateSlug(name)

  // Determine type
  let type: "director" | "actor" | "both" = "actor"
  if (raw.role) {
    const roleLower = raw.role.toLowerCase()
    if (
      roleLower.includes("director") ||
      roleLower.includes("réalisateur") ||
      roleLower.includes("metteur")
    ) {
      type = "director"
    } else if (
      roleLower.includes("actor") ||
      roleLower.includes("acteur") ||
      roleLower.includes("comédien")
    ) {
      type = "actor"
    }
  }

  return {
    name,
    name_ar,
    slug,
    type,
    nationality: "Tunisienne", // Default assumption for this crawler
    biography: raw.bio,
    photo: raw.photoUrl,
  }
}

/**
 * Normalize all plays from an adapter result
 */
export function normalizePlays(result: AdapterResult): NormalizedPlay[] {
  return result.plays.map((raw) => normalizePlay(raw, result.source))
}

/**
 * Normalize all persons from an adapter result
 */
export function normalizePersons(result: AdapterResult): NormalizedPerson[] {
  return result.persons.map((raw) => normalizePerson(raw))
}

/**
 * Normalize an entire adapter result
 */
export function normalizeAdapterResult(result: AdapterResult): {
  plays: NormalizedPlay[]
  persons: NormalizedPerson[]
} {
  return {
    plays: normalizePlays(result),
    persons: normalizePersons(result),
  }
}
