/**
 * Output generator - creates seed-compatible JSON and reports
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import type {
  CrawlResult,
  NormalizedPerson,
  NormalizedPlay,
  SeedPerson,
  SeedPlay,
} from "../types.js"

import { getConfidenceLevel, getMissingFields } from "../utils/confidence.js"

// Get directory name in ESM-compatible way
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, "..", "output")

/**
 * Create output directory with timestamp
 */
export async function createOutputDir(timestamp?: string): Promise<string> {
  const ts = timestamp || new Date().toISOString().split("T")[0]
  const dir = path.join(OUTPUT_DIR, `${ts}-crawl`)

  await fs.mkdir(dir, { recursive: true })
  await fs.mkdir(path.join(dir, "raw"), { recursive: true })

  return dir
}

/**
 * Convert normalized play to seed format
 */
export function toSeedPlay(play: NormalizedPlay): SeedPlay {
  return {
    title: play.title,
    title_ar: play.title_ar,
    originalTitle: play.originalTitle,
    slug: play.slug,
    type: "play",
    synopsis: play.synopsis,
    synopsis_ar: play.synopsis_ar,
    duration: play.duration,
    releaseYear: play.releaseYear,
    directors: play.directors,
    cast: play.cast,
    poster: play.poster,
    _meta: {
      source: play.source,
      sourceUrl: play.sourceUrl,
      confidence: play.confidence,
      needsReview: play.needsReview,
      posterFileId: play.posterFileId,
    },
  }
}

/**
 * Convert normalized person to seed format
 */
export function toSeedPerson(person: NormalizedPerson): SeedPerson {
  return {
    name: person.name,
    name_ar: person.name_ar,
    slug: person.slug,
    type: person.type === "both" ? "actor" : person.type,
    nationality: person.nationality,
    biography: person.biography,
    biography_ar: person.biography_ar,
  }
}

/**
 * Write plays.json
 */
export async function writePlaysJson(
  dir: string,
  plays: NormalizedPlay[]
): Promise<void> {
  const seedPlays = plays.map(toSeedPlay)
  const filePath = path.join(dir, "plays.json")
  await fs.writeFile(filePath, JSON.stringify(seedPlays, null, 2), "utf-8")
}

/**
 * Write persons.json
 */
export async function writePersonsJson(
  dir: string,
  persons: NormalizedPerson[]
): Promise<void> {
  const seedPersons = persons.map(toSeedPerson)
  const filePath = path.join(dir, "persons.json")
  await fs.writeFile(filePath, JSON.stringify(seedPersons, null, 2), "utf-8")
}

/**
 * Write raw adapter data for debugging
 */
export async function writeRawData(
  dir: string,
  sourceName: string,
  data: unknown
): Promise<void> {
  const filePath = path.join(dir, "raw", `${sourceName}.json`)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

/**
 * Generate markdown report
 */
export function generateReport(result: CrawlResult): string {
  const { plays, persons, metadata } = result

  const lines: string[] = [
    "# Tunisian Plays Crawl Report",
    "",
    `**Crawled At:** ${metadata.crawledAt}`,
    `**Duration:** ${(metadata.duration / 1000).toFixed(1)}s`,
    `**Sources:** ${metadata.sources.join(", ")}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total Plays Found | ${metadata.totalFound} |`,
    `| After Deduplication | ${plays.length} |`,
    `| Duplicates Removed | ${metadata.duplicatesRemoved} |`,
    `| Needs Review | ${metadata.needsReviewCount} |`,
    `| Persons Extracted | ${persons.length} |`,
    "",
  ]

  // Image stats
  lines.push("## Image Upload Statistics", "")
  lines.push(`| Status | Count |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Attempted | ${metadata.imageStats.attempted} |`)
  lines.push(`| Succeeded | ${metadata.imageStats.succeeded} |`)
  lines.push(`| Failed | ${metadata.imageStats.failed} |`)
  lines.push(`| Skipped | ${metadata.imageStats.skipped} |`)
  lines.push("")

  // Plays by confidence
  const highConfidence = plays.filter(
    (p) => getConfidenceLevel(p.confidence) === "high"
  )
  const mediumConfidence = plays.filter(
    (p) => getConfidenceLevel(p.confidence) === "medium"
  )
  const lowConfidence = plays.filter(
    (p) => getConfidenceLevel(p.confidence) === "low"
  )

  lines.push("## Plays by Confidence", "")
  lines.push(`### High Confidence (${highConfidence.length})`, "")
  if (highConfidence.length > 0) {
    for (const play of highConfidence.slice(0, 10)) {
      lines.push(
        `- **${play.title}** (${play.releaseYear || "N/A"}) - ${(play.confidence * 100).toFixed(0)}%`
      )
    }
    if (highConfidence.length > 10) {
      lines.push(`- ... and ${highConfidence.length - 10} more`)
    }
  } else {
    lines.push("_None_")
  }
  lines.push("")

  lines.push(`### Medium Confidence (${mediumConfidence.length})`, "")
  if (mediumConfidence.length > 0) {
    for (const play of mediumConfidence.slice(0, 10)) {
      const missing = getMissingFields(play)
      lines.push(
        `- **${play.title}** - ${(play.confidence * 100).toFixed(0)}% (missing: ${missing.join(", ")})`
      )
    }
    if (mediumConfidence.length > 10) {
      lines.push(`- ... and ${mediumConfidence.length - 10} more`)
    }
  } else {
    lines.push("_None_")
  }
  lines.push("")

  lines.push(`### Low Confidence - Needs Review (${lowConfidence.length})`, "")
  if (lowConfidence.length > 0) {
    for (const play of lowConfidence) {
      const missing = getMissingFields(play)
      lines.push(`- [ ] **${play.title}**`)
      lines.push(`  - Confidence: ${(play.confidence * 100).toFixed(0)}%`)
      lines.push(`  - Missing: ${missing.join(", ")}`)
      lines.push(`  - Source: [${play.source}](${play.sourceUrl})`)
    }
  } else {
    lines.push("_None_")
  }
  lines.push("")

  // Persons
  lines.push("## Extracted Persons", "")
  const directors = persons.filter(
    (p) => p.type === "director" || p.type === "both"
  )
  const actors = persons.filter((p) => p.type === "actor" || p.type === "both")

  lines.push(`### Directors (${directors.length})`, "")
  if (directors.length > 0) {
    for (const person of directors.slice(0, 20)) {
      lines.push(
        `- ${person.name}${person.name_ar ? ` (${person.name_ar})` : ""}`
      )
    }
    if (directors.length > 20) {
      lines.push(`- ... and ${directors.length - 20} more`)
    }
  } else {
    lines.push("_None extracted_")
  }
  lines.push("")

  lines.push(`### Actors (${actors.length})`, "")
  if (actors.length > 0) {
    for (const person of actors.slice(0, 20)) {
      lines.push(
        `- ${person.name}${person.name_ar ? ` (${person.name_ar})` : ""}`
      )
    }
    if (actors.length > 20) {
      lines.push(`- ... and ${actors.length - 20} more`)
    }
  } else {
    lines.push("_None extracted_")
  }
  lines.push("")

  // Errors
  if (metadata.errors.length > 0) {
    lines.push("## Errors", "")
    for (const error of metadata.errors) {
      lines.push(`- **${error.type}**: ${error.message}`)
      if (error.url) {
        lines.push(`  - URL: ${error.url}`)
      }
    }
    lines.push("")
  }

  // Next steps
  lines.push("## Next Steps", "")
  lines.push("1. Review low-confidence plays above and fill in missing data")
  lines.push(
    "2. Check ImageKit `/crawled/plays/triage/` folder for uploaded posters"
  )
  lines.push("3. Move approved images to production folder")
  lines.push("4. Copy approved entries from `plays.json` to seed data")
  lines.push("5. Copy new persons from `persons.json` to seed data")
  lines.push("")

  return lines.join("\n")
}

/**
 * Write the report file
 */
export async function writeReport(
  dir: string,
  result: CrawlResult
): Promise<void> {
  const report = generateReport(result)
  const filePath = path.join(dir, "report.md")
  await fs.writeFile(filePath, report, "utf-8")
}

/**
 * Write all output files
 */
export async function writeAllOutput(
  result: CrawlResult,
  rawData?: Record<string, unknown>
): Promise<string> {
  const dir = await createOutputDir()

  await writePlaysJson(dir, result.plays)
  await writePersonsJson(dir, result.persons)
  await writeReport(dir, result)

  // Write raw data if provided
  if (rawData) {
    for (const [source, data] of Object.entries(rawData)) {
      await writeRawData(dir, source, data)
    }
  }

  return dir
}
