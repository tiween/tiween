/**
 * Teskerti.tn Adapter
 *
 * Crawls spectacles/plays from teskerti.tn
 * Uses AJAX API for listings and scrapes individual event pages for details.
 */

import * as cheerio from "cheerio"

import type {
  AdapterResult,
  CrawlError,
  CrawlOptions,
  RawPersonData,
  RawPlayData,
  SourceAdapter,
} from "../types.js"
import type { HttpClient } from "../utils/http.js"

import { createHttpClient } from "../utils/http.js"
import { cleanText, extractYear, parseDuration } from "../utils/text.js"

const BASE_URL = "https://teskerti.tn"
const CATEGORY_URL = `${BASE_URL}/category/spectacle`
const AJAX_URL = `${BASE_URL}/more/category/spectacle`
const ASSETS_BASE = "https://assets.teskerti.tn"

interface TeskertiListItem {
  url: string
  title: string
  imageUrl?: string
  venue?: string
  date?: string
}

export class TeskertiAdapter implements SourceAdapter {
  readonly name = "teskerti"
  readonly description = "Teskerti.tn - Tunisia's #1 E-Ticketing Platform"
  readonly baseUrl = BASE_URL

  private http: HttpClient
  private verbose: boolean
  private errors: CrawlError[] = []

  constructor(options?: CrawlOptions) {
    this.verbose = options?.verbose ?? false
    this.http = createHttpClient({
      minDelay: options?.delay ?? 2000,
      maxDelay: (options?.delay ?? 2000) + 3000,
      verbose: this.verbose,
    })
  }

  async crawl(options?: CrawlOptions): Promise<AdapterResult> {
    const startTime = Date.now()
    const maxPages = options?.maxPages ?? 10
    this.errors = []

    const plays: RawPlayData[] = []
    const persons: RawPersonData[] = []
    const seenUrls = new Set<string>()

    if (this.verbose) {
      console.log(`[Teskerti] Starting crawl (max ${maxPages} pages)`)
    }

    try {
      // First, get the initial page to understand the listing
      const listings = await this.fetchListings(maxPages)

      if (this.verbose) {
        console.log(`[Teskerti] Found ${listings.length} event listings`)
      }

      // Fetch details for each listing
      for (const listing of listings) {
        if (seenUrls.has(listing.url)) continue
        seenUrls.add(listing.url)

        try {
          const playData = await this.fetchEventDetails(listing)
          if (playData) {
            plays.push(playData)

            // Extract any persons mentioned
            if (playData.directors) {
              for (const name of playData.directors) {
                persons.push({ name, role: "director" })
              }
            }
            if (playData.cast) {
              for (const name of playData.cast) {
                persons.push({ name, role: "actor" })
              }
            }
          }
        } catch (error) {
          this.addError(
            "parse",
            `Failed to parse event: ${listing.url}`,
            listing.url,
            error
          )
        }
      }
    } catch (error) {
      this.addError("network", "Failed to fetch listings", CATEGORY_URL, error)
    }

    const duration = Date.now() - startTime

    if (this.verbose) {
      console.log(
        `[Teskerti] Crawl complete: ${plays.length} plays, ${persons.length} persons, ${this.errors.length} errors`
      )
    }

    return {
      source: this.name,
      plays,
      persons,
      errors: this.errors,
      stats: {
        totalPages: maxPages,
        totalPlays: plays.length,
        totalPersons: persons.length,
        duration,
      },
    }
  }

  /**
   * Fetch event listings from the category page
   */
  private async fetchListings(maxPages: number): Promise<TeskertiListItem[]> {
    const listings: TeskertiListItem[] = []

    // First, try to get initial page HTML
    const initialResponse = await this.http.fetch(CATEGORY_URL)
    const initialListings = this.parseListingsHtml(initialResponse.body)
    listings.push(...initialListings)

    if (this.verbose) {
      console.log(`[Teskerti] Initial page: ${initialListings.length} events`)
    }

    // Then try AJAX pagination
    let rowcount = initialListings.length
    let page = 1

    while (page < maxPages) {
      try {
        const ajaxUrl = `${AJAX_URL}?rowcount=${rowcount}&productTitle=&selectedSalle=&selectedDate=`
        const response = await this.http.fetch(ajaxUrl)

        // Try to parse JSON response
        let data: { data_html?: string; loadmore?: boolean }
        try {
          data = JSON.parse(response.body)
        } catch {
          // If not JSON, might be HTML
          const moreListings = this.parseListingsHtml(response.body)
          if (moreListings.length === 0) break
          listings.push(...moreListings)
          rowcount += moreListings.length
          page++
          continue
        }

        if (!data.data_html) break

        const moreListings = this.parseListingsHtml(data.data_html)
        if (moreListings.length === 0) break

        listings.push(...moreListings)
        rowcount += moreListings.length
        page++

        if (data.loadmore === false) break
      } catch (error) {
        if (this.verbose) {
          console.log(`[Teskerti] AJAX pagination stopped: ${error}`)
        }
        break
      }
    }

    return listings
  }

  /**
   * Parse listings HTML to extract event links
   */
  private parseListingsHtml(html: string): TeskertiListItem[] {
    const $ = cheerio.load(html)
    const listings: TeskertiListItem[] = []

    // Look for event cards/links
    // Common patterns: .card, .event-card, article, .product-item
    $('a[href*="/evenement/"]').each((_, el) => {
      const $el = $(el)
      const href = $el.attr("href")
      if (!href) return

      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`

      // Skip if already seen
      if (listings.some((l) => l.url === url)) return

      // Try to get title from various locations
      const title =
        $el.find("h2, h3, h4, .title, .event-title").first().text() ||
        $el.attr("title") ||
        $el.text()

      // Try to get image
      const img = $el.find("img").first()
      let imageUrl = img.attr("src") || img.attr("data-src")
      if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = imageUrl.startsWith("/")
          ? `${ASSETS_BASE}${imageUrl}`
          : `${ASSETS_BASE}/${imageUrl}`
      }

      // Try to get venue
      const venue = $el.find(".venue, .location, .lieu").first().text()

      // Try to get date
      const date = $el.find(".date, .event-date").first().text()

      listings.push({
        url,
        title: cleanText(title),
        imageUrl,
        venue: venue ? cleanText(venue) : undefined,
        date: date ? cleanText(date) : undefined,
      })
    })

    return listings
  }

  /**
   * Fetch and parse individual event details
   */
  private async fetchEventDetails(
    listing: TeskertiListItem
  ): Promise<RawPlayData | null> {
    if (this.verbose) {
      console.log(`[Teskerti] Fetching event: ${listing.url}`)
    }

    const response = await this.http.fetch(listing.url)
    const $ = cheerio.load(response.body)

    // Extract title
    const title =
      $("h1").first().text() || $("h2").first().text() || listing.title

    if (!title || title.trim().length === 0) {
      return null
    }

    // Extract description/synopsis
    let description =
      $('.description, .synopsis, .about, [class*="description"]')
        .first()
        .text() ||
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content")

    if (description) {
      description = cleanText(description)
    }

    // Extract poster image
    let posterUrl =
      listing.imageUrl ||
      $('meta[property="og:image"]').attr("content") ||
      $(".event-image img, .poster img, .main-image img").first().attr("src")

    if (posterUrl && !posterUrl.startsWith("http")) {
      posterUrl = posterUrl.startsWith("/")
        ? `${ASSETS_BASE}${posterUrl}`
        : `${ASSETS_BASE}/${posterUrl}`
    }

    // Extract venue
    const venue =
      listing.venue ||
      $('.venue, .location, .lieu, [class*="venue"], [class*="location"]')
        .first()
        .text() ||
      $("address").first().text()

    // Extract dates
    const dates: string[] = []
    $('[class*="date"], .schedule, time').each((_, el) => {
      const text = $(el).text().trim()
      if (text) dates.push(text)
    })
    // Also look for date in listing
    if (listing.date) dates.push(listing.date)

    // Try to extract year
    const year =
      dates.length > 0
        ? extractYear(dates.join(" "))
        : extractYear($("body").text())

    // Extract duration
    let duration: number | undefined
    const durationText = $("body")
      .text()
      .match(/(\d+)\s*(heures?|h|min|minutes?)/i)
    if (durationText) {
      duration = parseDuration(durationText[0])
    }

    // Try to extract directors/artists
    const directors: string[] = []
    const cast: string[] = []

    // Look for common patterns
    $('[class*="director"], [class*="realisateur"], [class*="metteur"]').each(
      (_, el) => {
        const name = cleanText($(el).text())
        if (name && !directors.includes(name)) {
          directors.push(name)
        }
      }
    )

    $(
      '[class*="artist"], [class*="acteur"], [class*="performer"], [class*="cast"]'
    ).each((_, el) => {
      const name = cleanText($(el).text())
      if (name && !cast.includes(name)) {
        cast.push(name)
      }
    })

    return {
      title: cleanText(title),
      description,
      posterUrl,
      venue: venue ? cleanText(venue) : undefined,
      dates: dates.filter((d) => d.length > 0),
      duration,
      year,
      directors: directors.length > 0 ? directors : undefined,
      cast: cast.length > 0 ? cast : undefined,
      sourceUrl: listing.url,
    }
  }

  /**
   * Add an error to the errors list
   */
  private addError(
    type: CrawlError["type"],
    message: string,
    url?: string,
    context?: unknown
  ): void {
    this.errors.push({ type, message, url, context })
    if (this.verbose) {
      console.error(`[Teskerti] Error (${type}): ${message}`)
    }
  }
}
