/**
 * Deduplication utilities using fuzzy matching
 */

import { distance } from "fastest-levenshtein"

import type { NormalizedPerson, NormalizedPlay } from "../types.js"

import { generateSlug, normalizeForComparison } from "./text.js"

interface DuplicateMatch {
  index1: number
  index2: number
  similarity: number
  reason: string
}

/**
 * Calculate similarity between two strings (0-1)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeForComparison(str1)
  const norm2 = normalizeForComparison(str2)

  if (norm1 === norm2) return 1
  if (norm1.length === 0 || norm2.length === 0) return 0

  const maxLen = Math.max(norm1.length, norm2.length)
  const dist = distance(norm1, norm2)

  return 1 - dist / maxLen
}

/**
 * Check if two plays are likely duplicates
 */
export function areDuplicatePlays(
  play1: NormalizedPlay,
  play2: NormalizedPlay,
  threshold: number = 0.85
): { isDuplicate: boolean; similarity: number; reason: string } {
  // Exact slug match is always a duplicate
  if (play1.slug === play2.slug) {
    return { isDuplicate: true, similarity: 1, reason: "exact_slug_match" }
  }

  // Calculate title similarity
  const titleSimilarity = calculateSimilarity(play1.title, play2.title)

  // Check Arabic titles if both present
  let arabicSimilarity = 0
  if (play1.title_ar && play2.title_ar) {
    arabicSimilarity = calculateSimilarity(play1.title_ar, play2.title_ar)
  }

  const maxTitleSimilarity = Math.max(titleSimilarity, arabicSimilarity)

  // If titles are very similar
  if (maxTitleSimilarity >= threshold) {
    // Check if they have the same year (if both have years)
    if (play1.releaseYear && play2.releaseYear) {
      if (play1.releaseYear === play2.releaseYear) {
        return {
          isDuplicate: true,
          similarity: maxTitleSimilarity,
          reason: "title_and_year_match",
        }
      }
    }

    // Check if they share a director
    const sharedDirectors = play1.directors.filter((d) =>
      play2.directors.some((d2) => calculateSimilarity(d, d2) > 0.9)
    )

    if (sharedDirectors.length > 0) {
      return {
        isDuplicate: true,
        similarity: maxTitleSimilarity,
        reason: "title_and_director_match",
      }
    }

    // High title similarity alone might still be duplicate
    if (maxTitleSimilarity >= 0.95) {
      return {
        isDuplicate: true,
        similarity: maxTitleSimilarity,
        reason: "very_high_title_similarity",
      }
    }
  }

  return {
    isDuplicate: false,
    similarity: maxTitleSimilarity,
    reason: "no_match",
  }
}

/**
 * Find all duplicate pairs in a list of plays
 */
export function findDuplicatePlays(
  plays: NormalizedPlay[],
  threshold: number = 0.85
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = []

  for (let i = 0; i < plays.length; i++) {
    for (let j = i + 1; j < plays.length; j++) {
      const result = areDuplicatePlays(plays[i], plays[j], threshold)
      if (result.isDuplicate) {
        duplicates.push({
          index1: i,
          index2: j,
          similarity: result.similarity,
          reason: result.reason,
        })
      }
    }
  }

  return duplicates
}

/**
 * Merge two plays, keeping the most complete data
 */
export function mergePlays(
  play1: NormalizedPlay,
  play2: NormalizedPlay
): NormalizedPlay {
  // Calculate which play has more complete data
  const score1 = calculateCompleteness(play1)
  const score2 = calculateCompleteness(play2)

  const [primary, secondary] =
    score1 >= score2 ? [play1, play2] : [play2, play1]

  return {
    // Use primary's basic info
    title: primary.title || secondary.title,
    title_ar: primary.title_ar || secondary.title_ar,
    originalTitle: primary.originalTitle || secondary.originalTitle,
    slug: primary.slug,
    type: "play",
    synopsis: primary.synopsis || secondary.synopsis,
    synopsis_ar: primary.synopsis_ar || secondary.synopsis_ar,
    duration: primary.duration || secondary.duration,
    releaseYear: primary.releaseYear || secondary.releaseYear,

    // Merge arrays (unique values)
    directors: [...new Set([...primary.directors, ...secondary.directors])],
    cast: [...new Set([...primary.cast, ...secondary.cast])],

    // Prefer uploaded poster
    poster: primary.poster || secondary.poster,
    posterFileId: primary.posterFileId || secondary.posterFileId,

    // Merge confidence (take higher)
    confidence: Math.max(primary.confidence, secondary.confidence),
    needsReview: primary.needsReview && secondary.needsReview,

    // Track all sources
    source: primary.source,
    sourceUrl: primary.sourceUrl,
    sourceUrls: [
      ...(primary.sourceUrls || [primary.sourceUrl]),
      ...(secondary.sourceUrls || [secondary.sourceUrl]),
    ].filter((url, i, arr) => arr.indexOf(url) === i),
  }
}

/**
 * Calculate data completeness score
 */
function calculateCompleteness(play: NormalizedPlay): number {
  let score = 0
  if (play.title) score += 2
  if (play.title_ar) score += 2
  if (play.synopsis) score += 1
  if (play.synopsis_ar) score += 1
  if (play.directors.length > 0) score += 2
  if (play.cast.length > 0) score += 1
  if (play.duration) score += 1
  if (play.releaseYear) score += 1
  if (play.poster) score += 2
  if (play.posterFileId) score += 1 // Prefer uploaded images
  return score
}

/**
 * Deduplicate a list of plays
 */
export function deduplicatePlays(
  plays: NormalizedPlay[],
  threshold: number = 0.85
): { plays: NormalizedPlay[]; duplicatesRemoved: number } {
  if (plays.length === 0) {
    return { plays: [], duplicatesRemoved: 0 }
  }

  const result: NormalizedPlay[] = []
  const merged = new Set<number>()

  for (let i = 0; i < plays.length; i++) {
    if (merged.has(i)) continue

    let current = plays[i]

    // Find all duplicates of current play
    for (let j = i + 1; j < plays.length; j++) {
      if (merged.has(j)) continue

      const dupResult = areDuplicatePlays(current, plays[j], threshold)
      if (dupResult.isDuplicate) {
        current = mergePlays(current, plays[j])
        merged.add(j)
      }
    }

    result.push(current)
  }

  return {
    plays: result,
    duplicatesRemoved: plays.length - result.length,
  }
}

/**
 * Check if two persons are likely the same
 */
export function areSamePerson(
  person1: NormalizedPerson,
  person2: NormalizedPerson,
  threshold: number = 0.9
): boolean {
  // Exact slug match
  if (person1.slug === person2.slug) return true

  // Name similarity
  const nameSimilarity = calculateSimilarity(person1.name, person2.name)
  if (nameSimilarity >= threshold) return true

  // Arabic name similarity
  if (person1.name_ar && person2.name_ar) {
    const arabicSimilarity = calculateSimilarity(
      person1.name_ar,
      person2.name_ar
    )
    if (arabicSimilarity >= threshold) return true
  }

  return false
}

/**
 * Deduplicate a list of persons
 */
export function deduplicatePersons(
  persons: NormalizedPerson[],
  threshold: number = 0.9
): { persons: NormalizedPerson[]; duplicatesRemoved: number } {
  if (persons.length === 0) {
    return { persons: [], duplicatesRemoved: 0 }
  }

  const result: NormalizedPerson[] = []
  const seen = new Map<string, NormalizedPerson>()

  for (const person of persons) {
    let isDuplicate = false

    for (const [, existing] of seen) {
      if (areSamePerson(person, existing, threshold)) {
        // Merge: keep most complete
        if (person.name_ar && !existing.name_ar) {
          existing.name_ar = person.name_ar
        }
        if (person.biography && !existing.biography) {
          existing.biography = person.biography
        }
        if (person.photo && !existing.photo) {
          existing.photo = person.photo
        }
        if (person.type === "both" || existing.type !== person.type) {
          existing.type = "both"
        }
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) {
      seen.set(person.slug, person)
      result.push(person)
    }
  }

  return {
    persons: result,
    duplicatesRemoved: persons.length - result.length,
  }
}
