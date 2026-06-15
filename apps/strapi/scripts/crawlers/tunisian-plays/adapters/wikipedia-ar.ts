/**
 * Arabic Wikipedia Adapter
 *
 * Crawls Tunisian plays from Arabic Wikipedia using the MediaWiki API.
 * Sources data from the category "تصنيف:مسرحيات تونسية"
 */

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
import { cleanText, extractYear } from "../utils/text.js"

const BASE_URL = "https://ar.wikipedia.org"
const API_URL = `${BASE_URL}/w/api.php`
const PLAY_CATEGORY = "تصنيف:مسرحيات_تونسية"

interface WikiCategoryMember {
  pageid: number
  ns: number
  title: string
}

interface WikiPage {
  pageid: number
  title: string
  extract?: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  categories?: Array<{ title: string }>
  revisions?: Array<{ slots?: { main?: { "*"?: string } }; content?: string }>
}

interface WikiInfobox {
  title?: string
  الاسم?: string
  المؤلف?: string
  المخرج?: string
  الممثلون?: string
  تاريخ?: string
  سنة?: string
  صورة?: string
}

export class WikipediaArAdapter implements SourceAdapter {
  readonly name = "wikipedia-ar"
  readonly description = "Arabic Wikipedia - Tunisian Plays Category"
  readonly baseUrl = BASE_URL

  private http: HttpClient
  private verbose: boolean
  private errors: CrawlError[] = []

  constructor(options?: CrawlOptions) {
    this.verbose = options?.verbose ?? false
    this.http = createHttpClient({
      minDelay: options?.delay ?? 1000,
      maxDelay: (options?.delay ?? 1000) + 2000,
      verbose: this.verbose,
    })
  }

  async crawl(options?: CrawlOptions): Promise<AdapterResult> {
    const startTime = Date.now()
    const maxPages = options?.maxPages ?? 100
    this.errors = []

    const plays: RawPlayData[] = []
    const persons: RawPersonData[] = []

    if (this.verbose) {
      console.log(
        `[Wikipedia-AR] Starting crawl from category: ${PLAY_CATEGORY}`
      )
    }

    try {
      const categoryMembers = await this.getCategoryMembers(maxPages)

      if (this.verbose) {
        console.log(
          `[Wikipedia-AR] Found ${categoryMembers.length} pages in category`
        )
      }

      for (const member of categoryMembers) {
        try {
          const playData = await this.getPageDetails(member.title)
          if (playData) {
            plays.push(playData)

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
          const url = `${BASE_URL}/wiki/${encodeURIComponent(member.title)}`
          this.addError(
            "parse",
            `Failed to parse page: ${member.title}`,
            url,
            error
          )
        }
      }
    } catch (error) {
      this.addError(
        "network",
        "Failed to fetch category members",
        API_URL,
        error
      )
    }

    const duration = Date.now() - startTime

    if (this.verbose) {
      console.log(
        `[Wikipedia-AR] Crawl complete: ${plays.length} plays, ${persons.length} persons, ${this.errors.length} errors`
      )
    }

    return {
      source: this.name,
      plays,
      persons,
      errors: this.errors,
      stats: {
        totalPages: plays.length,
        totalPlays: plays.length,
        totalPersons: persons.length,
        duration,
      },
    }
  }

  private async getCategoryMembers(
    limit: number
  ): Promise<WikiCategoryMember[]> {
    const members: WikiCategoryMember[] = []
    let continueToken: string | undefined

    do {
      const params = new URLSearchParams({
        action: "query",
        list: "categorymembers",
        cmtitle: PLAY_CATEGORY,
        cmlimit: Math.min(limit - members.length, 50).toString(),
        cmtype: "page",
        format: "json",
      })

      if (continueToken) {
        params.set("cmcontinue", continueToken)
      }

      const url = `${API_URL}?${params}`
      const response = await this.http.fetch(url)
      const data = JSON.parse(response.body)

      if (data.query?.categorymembers) {
        members.push(...data.query.categorymembers)
      }

      continueToken = data.continue?.cmcontinue
    } while (continueToken && members.length < limit)

    return members
  }

  private async getPageDetails(title: string): Promise<RawPlayData | null> {
    if (this.verbose) {
      console.log(`[Wikipedia-AR] Fetching: ${title}`)
    }

    const params = new URLSearchParams({
      action: "query",
      titles: title,
      prop: "extracts|pageimages|categories|revisions",
      exintro: "true",
      explaintext: "true",
      piprop: "thumbnail",
      pithumbsize: "500",
      rvprop: "content",
      rvslots: "main",
      format: "json",
    })

    const url = `${API_URL}?${params}`
    const response = await this.http.fetch(url)
    const data = JSON.parse(response.body)

    const pages = data.query?.pages
    if (!pages) return null

    const page: WikiPage = Object.values(pages)[0] as WikiPage
    if (!page || page.pageid === undefined || page.pageid < 0) return null

    const wikitext =
      page.revisions?.[0]?.slots?.main?.["*"] ||
      page.revisions?.[0]?.content ||
      ""
    const infobox = this.parseInfobox(wikitext)

    const year = extractYear(
      infobox.تاريخ || infobox.سنة || page.extract || title
    )

    const directors = this.parsePersonList(infobox.المخرج)
    const cast = this.parsePersonList(infobox.الممثلون)

    // Clean title - remove disambiguation
    let cleanTitle = title
      .replace(/\s*\(مسرحية(?:\s+تونسية)?\)\s*$/i, "")
      .trim()

    // Extract French title if present in the article
    const frenchTitleMatch = wikitext.match(
      /(?:بالفرنسية|فرنسية):\s*([^)|\]]+)/
    )
    const alternativeTitle = frenchTitleMatch
      ? frenchTitleMatch[1].trim()
      : undefined

    return {
      title: cleanTitle,
      alternativeTitle,
      description: page.extract ? cleanText(page.extract) : undefined,
      posterUrl:
        page.thumbnail?.source || this.extractImageFromInfobox(infobox.صورة),
      year,
      directors: directors.length > 0 ? directors : undefined,
      cast: cast.length > 0 ? cast : undefined,
      sourceUrl: `${BASE_URL}/wiki/${encodeURIComponent(title)}`,
      rawData: {
        infobox,
        categories: page.categories,
        wikitext,
        originalTitle: title,
      },
    }
  }

  private parseInfobox(wikitext: string): WikiInfobox {
    const infobox: WikiInfobox = {}

    // Match Arabic infobox patterns
    const infoboxMatch = wikitext.match(
      /\{\{(?:صندوق معلومات|Infobox)[^}]*\|([\s\S]*?)\}\}/i
    )
    if (!infoboxMatch) return infobox

    const content = infoboxMatch[1]
    const fieldRegex = /\|\s*([^=|]+?)\s*=\s*([^|]*?)(?=\||$)/g
    let match

    while ((match = fieldRegex.exec(content)) !== null) {
      const key = match[1].trim()
      const value = this.cleanWikitext(match[2])

      if (value) {
        switch (key) {
          case "الاسم":
          case "اسم":
          case "العنوان":
            infobox.الاسم = value
            break
          case "المؤلف":
          case "الكاتب":
            infobox.المؤلف = value
            break
          case "المخرج":
          case "إخراج":
            infobox.المخرج = value
            break
          case "الممثلون":
          case "بطولة":
          case "تمثيل":
            infobox.الممثلون = value
            break
          case "تاريخ":
          case "سنة":
          case "تاريخ_العرض":
            infobox.تاريخ = value
            break
          case "صورة":
            infobox.صورة = value
            break
        }
      }
    }

    return infobox
  }

  private cleanWikitext(text: string): string {
    return text
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
      .replace(/\{\{[^}]+\}\}/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/<ref[^>]*>.*?<\/ref>/gi, "")
      .replace(/<ref[^/]*\/>/gi, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  private parsePersonList(text: string | undefined): string[] {
    if (!text) return []

    return text
      .split(/[،,\n]/) // Arabic comma and regular comma
      .map((name) => this.cleanWikitext(name).trim())
      .filter((name) => name.length > 0 && name.length < 100)
  }

  private extractImageFromInfobox(
    imageName: string | undefined
  ): string | undefined {
    if (!imageName) return undefined

    const cleanName = imageName.replace(/^(?:ملف|File|Image):/i, "").trim()
    if (cleanName) {
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleanName)}`
    }

    return undefined
  }

  private addError(
    type: CrawlError["type"],
    message: string,
    url?: string,
    context?: unknown
  ): void {
    this.errors.push({ type, message, url, context })
    if (this.verbose) {
      console.error(`[Wikipedia-AR] Error (${type}): ${message}`)
    }
  }
}
