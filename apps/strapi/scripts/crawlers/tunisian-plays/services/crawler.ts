/**
 * Main crawler orchestrator
 */

import type {
  AdapterResult,
  CrawlMetadata,
  CrawlOptions,
  CrawlResult,
  NormalizedPerson,
  NormalizedPlay,
} from "../types.js"

import { getAdapter, getAdapterNames } from "../adapters/index.js"
import { deduplicatePersons, deduplicatePlays } from "../utils/dedup.js"
import { getImageKitConfig, ImageKitService } from "./imagekit.js"
import { normalizeAdapterResult } from "./normalizer.js"

export interface CrawlerOptions extends CrawlOptions {
  /** Specific sources to crawl (empty = all) */
  sources?: string[]
  /** Skip image uploads */
  skipImages?: boolean
}

export class Crawler {
  private options: CrawlerOptions
  private imageKitService: ImageKitService | null = null

  constructor(options: CrawlerOptions = {}) {
    this.options = options

    // Initialize ImageKit if not skipping images
    if (!options.skipImages) {
      const config = getImageKitConfig()
      if (config) {
        this.imageKitService = new ImageKitService(config, options.verbose)
      } else if (options.verbose) {
        console.log(
          "[Crawler] ImageKit not configured, images will not be uploaded"
        )
      }
    }
  }

  /**
   * Run the crawler
   */
  async crawl(): Promise<CrawlResult> {
    const startTime = Date.now()
    const verbose = this.options.verbose ?? false

    // Determine which adapters to use
    const sourceNames = this.options.sources?.length
      ? this.options.sources
      : getAdapterNames()

    if (verbose) {
      console.log(
        `[Crawler] Starting crawl with sources: ${sourceNames.join(", ")}`
      )
    }

    // Run all adapters
    const adapterResults: AdapterResult[] = []

    for (const sourceName of sourceNames) {
      const adapter = getAdapter(sourceName, this.options)
      if (!adapter) {
        console.warn(`[Crawler] Unknown source: ${sourceName}`)
        continue
      }

      if (verbose) {
        console.log(`\n[Crawler] Running adapter: ${adapter.name}`)
        console.log(`[Crawler] Description: ${adapter.description}`)
      }

      try {
        const result = await adapter.crawl(this.options)
        adapterResults.push(result)

        if (verbose) {
          console.log(
            `[Crawler] ${adapter.name} found ${result.plays.length} plays, ${result.persons.length} persons`
          )
        }
      } catch (error) {
        console.error(`[Crawler] Adapter ${sourceName} failed:`, error)
      }
    }

    // Normalize all results
    if (verbose) {
      console.log("\n[Crawler] Normalizing data...")
    }

    let allPlays: NormalizedPlay[] = []
    let allPersons: NormalizedPerson[] = []
    const allErrors = []

    for (const result of adapterResults) {
      const normalized = normalizeAdapterResult(result)
      allPlays.push(...normalized.plays)
      allPersons.push(...normalized.persons)
      allErrors.push(...result.errors)
    }

    const totalFound = allPlays.length

    if (verbose) {
      console.log(`[Crawler] Total plays before dedup: ${allPlays.length}`)
    }

    // Deduplicate
    const dedupPlays = deduplicatePlays(allPlays)
    allPlays = dedupPlays.plays

    const dedupPersons = deduplicatePersons(allPersons)
    allPersons = dedupPersons.persons

    if (verbose) {
      console.log(
        `[Crawler] After dedup: ${allPlays.length} plays (${dedupPlays.duplicatesRemoved} removed)`
      )
      console.log(
        `[Crawler] After dedup: ${allPersons.length} persons (${dedupPersons.duplicatesRemoved} removed)`
      )
    }

    // Upload images to ImageKit
    const imageStats = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    }

    if (this.imageKitService && !this.options.skipImages) {
      if (verbose) {
        console.log("\n[Crawler] Uploading images to ImageKit...")
      }

      for (const play of allPlays) {
        if (!play.poster) {
          imageStats.skipped++
          continue
        }

        // Skip if already an ImageKit URL
        if (
          play.poster.includes("imagekit.io") ||
          play.poster.includes("ik.imagekit.io")
        ) {
          imageStats.skipped++
          continue
        }

        imageStats.attempted++

        const result = await this.imageKitService.uploadPoster(
          play.poster,
          play.slug,
          play.source
        )

        if (result.success && result.url) {
          play.poster = result.url
          play.posterFileId = result.fileId
          imageStats.succeeded++
        } else {
          imageStats.failed++
          // Keep the original URL for manual handling
          allErrors.push({
            type: "upload" as const,
            message: result.error || "Unknown upload error",
            url: play.poster,
          })
        }
      }

      if (verbose) {
        console.log(
          `[Crawler] Image uploads: ${imageStats.succeeded}/${imageStats.attempted} succeeded`
        )
      }
    } else {
      imageStats.skipped = allPlays.filter((p) => p.poster).length
    }

    // Build metadata
    const metadata: CrawlMetadata = {
      crawledAt: new Date().toISOString(),
      sources: sourceNames,
      totalFound,
      duplicatesRemoved: dedupPlays.duplicatesRemoved,
      needsReviewCount: allPlays.filter((p) => p.needsReview).length,
      imageStats,
      errors: allErrors,
      duration: Date.now() - startTime,
    }

    if (verbose) {
      console.log(
        `\n[Crawler] Crawl complete in ${(metadata.duration / 1000).toFixed(1)}s`
      )
      console.log(
        `[Crawler] ${allPlays.length} plays, ${allPersons.length} persons`
      )
      console.log(`[Crawler] ${metadata.needsReviewCount} plays need review`)
    }

    return {
      plays: allPlays,
      persons: allPersons,
      metadata,
    }
  }
}

/**
 * Create and run crawler with options
 */
export async function runCrawler(
  options: CrawlerOptions = {}
): Promise<CrawlResult> {
  const crawler = new Crawler(options)
  return crawler.crawl()
}
