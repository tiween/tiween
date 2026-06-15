/**
 * Tunisian Plays Crawler - Type Definitions
 */

// ============================================
// Raw Data Types (from source websites)
// ============================================

export interface RawPlayData {
  /** Source-specific identifier */
  sourceId?: string
  /** Title as found on source (any language) */
  title: string
  /** Alternative title if present */
  alternativeTitle?: string
  /** Description/synopsis from source */
  description?: string
  /** Director name(s) as found */
  directors?: string[]
  /** Cast/actor names as found */
  cast?: string[]
  /** Poster image URL from source */
  posterUrl?: string
  /** Event/show dates if available */
  dates?: string[]
  /** Venue name */
  venue?: string
  /** Duration in minutes */
  duration?: number
  /** Year of production/release */
  year?: number
  /** Original source URL */
  sourceUrl: string
  /** Raw HTML or data for debugging */
  rawData?: unknown
}

export interface RawPersonData {
  /** Name as found on source */
  name: string
  /** Role (director, actor, etc.) */
  role?: string
  /** Photo URL if available */
  photoUrl?: string
  /** Biography if available */
  bio?: string
}

// ============================================
// Normalized Data Types (for output)
// ============================================

export interface NormalizedPlay {
  /** French title */
  title: string
  /** Arabic title */
  title_ar?: string
  /** Original title (usually Arabic for Tunisian plays) */
  originalTitle?: string
  /** URL-safe slug */
  slug: string
  /** Always "play" for this crawler */
  type: "play"
  /** French synopsis */
  synopsis?: string
  /** Arabic synopsis */
  synopsis_ar?: string
  /** Duration in minutes */
  duration?: number
  /** Year of production */
  releaseYear?: number
  /** Director slugs */
  directors: string[]
  /** Cast member slugs */
  cast: string[]
  /** ImageKit URL after upload (or source URL if upload skipped) */
  poster?: string
  /** ImageKit file ID for reference */
  posterFileId?: string
  /** Confidence score 0-1 */
  confidence: number
  /** Flag for manual review */
  needsReview: boolean
  /** Source attribution */
  source: string
  /** Original source URL */
  sourceUrl: string
  /** All source URLs if merged from multiple sources */
  sourceUrls?: string[]
}

export interface NormalizedPerson {
  /** Full name */
  name: string
  /** Arabic name if available */
  name_ar?: string
  /** URL-safe slug */
  slug: string
  /** Person type */
  type: "director" | "actor" | "both"
  /** Nationality */
  nationality?: string
  /** Biography (French) */
  biography?: string
  /** Biography (Arabic) */
  biography_ar?: string
  /** Photo URL (ImageKit or source) */
  photo?: string
}

// ============================================
// Crawl Result Types
// ============================================

export interface AdapterResult {
  /** Adapter name */
  source: string
  /** Raw plays found */
  plays: RawPlayData[]
  /** Raw persons found */
  persons: RawPersonData[]
  /** Errors encountered */
  errors: CrawlError[]
  /** Crawl statistics */
  stats: {
    totalPages: number
    totalPlays: number
    totalPersons: number
    duration: number
  }
}

export interface CrawlError {
  /** Error type */
  type: "network" | "parse" | "validation" | "upload"
  /** Error message */
  message: string
  /** URL that caused error */
  url?: string
  /** Additional context */
  context?: unknown
}

export interface CrawlResult {
  /** Normalized plays (deduplicated) */
  plays: NormalizedPlay[]
  /** Normalized persons (deduplicated) */
  persons: NormalizedPerson[]
  /** Crawl metadata */
  metadata: CrawlMetadata
}

export interface CrawlMetadata {
  /** ISO timestamp of crawl */
  crawledAt: string
  /** Sources that were crawled */
  sources: string[]
  /** Total plays found before dedup */
  totalFound: number
  /** Duplicates removed */
  duplicatesRemoved: number
  /** Plays flagged for review */
  needsReviewCount: number
  /** Image upload statistics */
  imageStats: {
    attempted: number
    succeeded: number
    failed: number
    skipped: number
  }
  /** Errors from all adapters */
  errors: CrawlError[]
  /** Duration in milliseconds */
  duration: number
}

// ============================================
// Adapter Interface
// ============================================

export interface SourceAdapter {
  /** Unique adapter name */
  readonly name: string
  /** Human-readable description */
  readonly description: string
  /** Base URL of the source */
  readonly baseUrl: string

  /**
   * Crawl the source and return raw data
   * @param options Crawl options
   */
  crawl(options?: CrawlOptions): Promise<AdapterResult>
}

export interface CrawlOptions {
  /** Maximum pages to crawl (for pagination) */
  maxPages?: number
  /** Delay between requests in ms */
  delay?: number
  /** Skip image downloading */
  skipImages?: boolean
  /** Verbose logging */
  verbose?: boolean
}

// ============================================
// ImageKit Types
// ============================================

export interface ImageKitConfig {
  publicKey: string
  privateKey: string
  urlEndpoint: string
}

export interface ImageUploadResult {
  success: boolean
  fileId?: string
  url?: string
  thumbnailUrl?: string
  error?: string
}

// ============================================
// Output Types (seed-compatible)
// ============================================

export interface SeedPlay {
  title: string
  title_ar?: string
  originalTitle?: string
  slug: string
  type: "play"
  synopsis?: string
  synopsis_ar?: string
  duration?: number
  releaseYear?: number
  directors: string[]
  cast: string[]
  poster?: string
  /** Additional metadata for review */
  _meta?: {
    source: string
    sourceUrl: string
    confidence: number
    needsReview: boolean
    posterFileId?: string
  }
}

export interface SeedPerson {
  name: string
  name_ar?: string
  slug: string
  type: "director" | "actor"
  nationality?: string
  biography?: string
  biography_ar?: string
}
