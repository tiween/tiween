/**
 * Wikipedia Adapter
 *
 * Crawls Tunisian plays from French Wikipedia using the MediaWiki API.
 * Sources data from the category "Pièce de théâtre tunisienne"
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

const BASE_URL = "https://fr.wikipedia.org"
const API_URL = `${BASE_URL}/w/api.php`

// Primary category for plays
const PLAY_CATEGORY = "Catégorie:Pièce_de_théâtre_tunisienne"

// Secondary categories to search for plays mentioned in biographies
const PERSON_CATEGORIES = [
  "Catégorie:Dramaturge_tunisien",
  "Catégorie:Dramaturge_tunisienne",
  "Catégorie:Metteur_en_scène_tunisien",
]

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
  titre?: string
  auteur?: string
  metteurEnScene?: string
  mise_en_scène?: string
  réalisateur?: string
  acteurs?: string
  distribution?: string
  date?: string
  année?: string
  lieu?: string
  genre?: string
  durée?: string
  image?: string
}

interface PersonCredit {
  name: string
  role: string
  character?: string
}

interface ParsedCredits {
  directors: string[]
  writers: string[]
  cast: PersonCredit[]
  crew: PersonCredit[]
}

export class WikipediaAdapter implements SourceAdapter {
  readonly name = "wikipedia"
  readonly description = "French Wikipedia - Tunisian Plays Category"
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
    const seenPlayTitles = new Set<string>()

    if (this.verbose) {
      console.log(
        `[Wikipedia] Starting crawl from play category: ${PLAY_CATEGORY}`
      )
    }

    try {
      // 1. First, crawl the direct plays category
      const categoryMembers = await this.getCategoryMembers(
        PLAY_CATEGORY,
        maxPages
      )

      if (this.verbose) {
        console.log(
          `[Wikipedia] Found ${categoryMembers.length} pages in category`
        )
      }

      for (const member of categoryMembers) {
        try {
          const playData = await this.getPageDetails(member.title)
          if (playData) {
            plays.push(playData)

            // Extract persons from directors
            if (playData.directors) {
              for (const name of playData.directors) {
                persons.push({ name, role: "director" })
              }
            }

            // Extract persons from cast
            if (playData.cast) {
              for (const name of playData.cast) {
                persons.push({ name, role: "actor" })
              }
            }

            // Extract additional crew from rawData.credits
            const credits = playData.rawData?.credits as
              | ParsedCredits
              | undefined
            if (credits) {
              // Writers
              for (const name of credits.writers) {
                persons.push({ name, role: "writer" })
              }
              // Other crew (store role in rawData for context)
              for (const crew of credits.crew) {
                persons.push({
                  name: crew.name,
                  role: "crew",
                  rawData: { creditRole: crew.role },
                })
              }
            }
            // Track seen plays to avoid duplicates
            seenPlayTitles.add(playData.title.toLowerCase())
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

      // 2. Now crawl person categories to find more plays from biographies
      if (this.verbose) {
        console.log(
          `[Wikipedia] Searching person categories for additional plays...`
        )
      }

      for (const personCategory of PERSON_CATEGORIES) {
        try {
          const personMembers = await this.getCategoryMembers(
            personCategory,
            Math.min(maxPages, 30)
          )

          if (this.verbose) {
            console.log(
              `[Wikipedia] Found ${personMembers.length} persons in ${personCategory}`
            )
          }

          for (const member of personMembers) {
            try {
              const extractedPlays = await this.extractPlaysFromPersonPage(
                member.title
              )

              for (const play of extractedPlays) {
                // Skip if we already have this play
                if (seenPlayTitles.has(play.title.toLowerCase())) {
                  continue
                }
                seenPlayTitles.add(play.title.toLowerCase())
                plays.push(play)

                if (this.verbose) {
                  console.log(
                    `[Wikipedia] Found new play from ${member.title}: ${play.title}`
                  )
                }
              }
            } catch (error) {
              // Non-fatal: just skip this person
            }
          }
        } catch (error) {
          this.addError(
            "network",
            `Failed to fetch category: ${personCategory}`,
            API_URL,
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
        `[Wikipedia] Crawl complete: ${plays.length} plays, ${persons.length} persons, ${this.errors.length} errors`
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
    category: string,
    limit: number
  ): Promise<WikiCategoryMember[]> {
    const members: WikiCategoryMember[] = []
    let continueToken: string | undefined

    do {
      const params = new URLSearchParams({
        action: "query",
        list: "categorymembers",
        cmtitle: category,
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
      console.log(`[Wikipedia] Fetching: ${title}`)
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

    // Parse "Fiche technique" and "Distribution" sections from article body
    const credits = this.parseCreditsFromSections(wikitext)

    const year = extractYear(
      infobox.date || infobox.année || page.extract || title
    )

    // Combine infobox data with section data (sections take priority as they're more detailed)
    const infoboxDirectors = this.parsePersonList(
      infobox.metteurEnScene ||
        infobox.mise_en_scène ||
        infobox.réalisateur ||
        infobox.auteur
    )
    const directors =
      credits.directors.length > 0 ? credits.directors : infoboxDirectors

    const infoboxCast = this.parsePersonList(
      infobox.acteurs || infobox.distribution
    )
    const castNames =
      credits.cast.length > 0 ? credits.cast.map((c) => c.name) : infoboxCast

    return {
      title: infobox.titre || infobox.title || title,
      description: page.extract ? cleanText(page.extract) : undefined,
      posterUrl:
        page.thumbnail?.source || this.extractImageFromInfobox(infobox.image),
      year,
      duration: this.parseDuration(infobox.durée),
      directors: directors.length > 0 ? directors : undefined,
      cast: castNames.length > 0 ? castNames : undefined,
      sourceUrl: `${BASE_URL}/wiki/${encodeURIComponent(title)}`,
      rawData: {
        infobox,
        categories: page.categories,
        credits:
          credits.cast.length > 0 || credits.crew.length > 0
            ? credits
            : undefined,
        wikitext, // Full article text for AI enhancement
      },
    }
  }

  private parseInfobox(wikitext: string): WikiInfobox {
    const infobox: WikiInfobox = {}

    const infoboxMatch = wikitext.match(/\{\{Infobox[^}]*\|([\s\S]*?)\}\}/i)
    if (!infoboxMatch) return infobox

    const content = infoboxMatch[1]
    const fieldRegex = /\|\s*([^=|]+?)\s*=\s*([^|]*?)(?=\||$)/g
    let match

    while ((match = fieldRegex.exec(content)) !== null) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, "_")
      const value = this.cleanWikitext(match[2])

      if (value) {
        switch (key) {
          case "titre":
          case "title":
            infobox.titre = value
            break
          case "auteur":
          case "author":
            infobox.auteur = value
            break
          case "mise_en_scène":
          case "metteur_en_scène":
          case "réalisateur":
          case "director":
            infobox.metteurEnScene = value
            break
          case "acteurs":
          case "distribution":
          case "cast":
            infobox.acteurs = value
            break
          case "date":
          case "année":
          case "year":
            infobox.date = value
            break
          case "durée":
          case "duration":
            infobox.durée = value
            break
          case "image":
            infobox.image = value
            break
          case "genre":
            infobox.genre = value
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
      .split(/[,\n]/)
      .map((name) => this.cleanWikitext(name).trim())
      .filter((name) => name.length > 0 && name.length < 100)
  }

  private parseDuration(text: string | undefined): number | undefined {
    if (!text) return undefined

    const match = text.match(/(\d+)\s*(h|min|minutes?)/i)
    if (match) {
      const num = parseInt(match[1], 10)
      const unit = match[2].toLowerCase()
      return unit.startsWith("h") ? num * 60 : num
    }

    const plainMatch = text.match(/(\d+)/)
    if (plainMatch) {
      return parseInt(plainMatch[1], 10)
    }

    return undefined
  }

  private extractImageFromInfobox(
    imageName: string | undefined
  ): string | undefined {
    if (!imageName) return undefined

    const cleanName = imageName.replace(/^File:|^Image:/i, "").trim()
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
      console.error(`[Wikipedia] Error (${type}): ${message}`)
    }
  }

  /**
   * Parse "Fiche technique" and "Distribution" sections from wikitext
   */
  private parseCreditsFromSections(wikitext: string): ParsedCredits {
    const credits: ParsedCredits = {
      directors: [],
      writers: [],
      cast: [],
      crew: [],
    }

    // Parse "Fiche technique" section (technical credits)
    const ficheTechniqueMatch = wikitext.match(
      /==\s*Fiche technique\s*==\s*([\s\S]*?)(?===|$)/i
    )

    if (ficheTechniqueMatch) {
      const section = ficheTechniqueMatch[1]
      const lines = section
        .split("\n")
        .filter((line) => line.trim().startsWith("*"))

      for (const line of lines) {
        const credit = this.parseCreditLine(line)
        if (!credit) continue

        const roleLower = credit.role.toLowerCase()

        // Categorize by role
        if (
          roleLower.includes("mise en scène") ||
          roleLower.includes("réalisation")
        ) {
          credits.directors.push(credit.name)
        } else if (
          roleLower.includes("texte") ||
          roleLower.includes("dramaturgie") ||
          roleLower.includes("scénario") ||
          roleLower.includes("auteur")
        ) {
          credits.writers.push(credit.name)
        } else {
          credits.crew.push(credit)
        }
      }
    }

    // Parse "Distribution" section (cast)
    const distributionMatch = wikitext.match(
      /==\s*Distribution\s*==\s*([\s\S]*?)(?===|$)/i
    )

    if (distributionMatch) {
      const section = distributionMatch[1]
      const lines = section
        .split("\n")
        .filter((line) => line.trim().startsWith("*"))

      for (const line of lines) {
        const castMember = this.parseCastLine(line)
        if (castMember) {
          credits.cast.push(castMember)
        }
      }
    }

    return credits
  }

  /**
   * Parse a credit line like "* Texte, dramaturgie et mise en scène : Moncef Zahrouni"
   */
  private parseCreditLine(line: string): PersonCredit | null {
    // Remove bullet point and clean
    const cleaned = line.replace(/^\*\s*/, "").trim()

    // Match pattern "Role : Name" or "Role: Name"
    const match = cleaned.match(/^([^:]+?)\s*:\s*(.+)$/)
    if (!match) return null

    const role = this.cleanWikitext(match[1]).trim()
    const name = this.cleanWikitext(match[2]).trim()

    if (!role || !name || name.length > 100) return null

    return { name, role }
  }

  /**
   * Parse a cast line like "* Sonia Hedhili : Tina" or "* Amina Ben Doua : Stella, l'ange gardien"
   */
  private parseCastLine(line: string): PersonCredit | null {
    // Remove bullet point and clean
    const cleaned = line.replace(/^\*\s*/, "").trim()

    // Match pattern "Actor Name : Character" or just "Actor Name"
    const colonMatch = cleaned.match(/^([^:]+?)\s*:\s*(.+)$/)

    if (colonMatch) {
      const name = this.cleanWikitext(colonMatch[1]).trim()
      const character = this.cleanWikitext(colonMatch[2]).trim()

      if (!name || name.length > 100) return null

      return { name, role: "actor", character }
    }

    // No colon - just the name
    const name = this.cleanWikitext(cleaned).trim()
    if (!name || name.length > 100) return null

    return { name, role: "actor" }
  }

  /**
   * Extract plays mentioned in a person's Wikipedia page (playwright/director bio)
   */
  private async extractPlaysFromPersonPage(
    personTitle: string
  ): Promise<RawPlayData[]> {
    const plays: RawPlayData[] = []

    const params = new URLSearchParams({
      action: "query",
      titles: personTitle,
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      format: "json",
    })

    const url = `${API_URL}?${params}`
    const response = await this.http.fetch(url)
    const data = JSON.parse(response.body)

    const pages = data.query?.pages
    if (!pages) return plays

    const page = Object.values(pages)[0] as WikiPage
    if (!page || page.pageid === undefined || page.pageid < 0) return plays

    const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || ""

    // Look for "Théâtre" or "Pièces de théâtre" or "Œuvres" sections
    const theatreMatch = wikitext.match(
      /===?\s*(?:Théâtre|Pièces? de théâtre|Œuvres? théâtrales?|Mise en scène)\s*===?\s*([\s\S]*?)(?=\n==|$)/i
    )

    if (!theatreMatch) return plays

    const section = theatreMatch[1]
    const lines = section
      .split("\n")
      .filter((line) => line.trim().startsWith("*"))

    for (const line of lines) {
      const playInfo = this.parsePlayFromBioLine(line, personTitle)
      if (playInfo) {
        plays.push(playInfo)
      }
    }

    return plays
  }

  /**
   * Parse a play entry from a biography line
   * Examples:
   * - "* ''[[Otages (pièce de théâtre)|Otages]]'' (2006)"
   * - "* ''Hourya'' (2017) - monodrame"
   * - "* 2019 : ''TranstyX''"
   * - "* [[Famille (s)i je mens]] (2002)"
   */
  private parsePlayFromBioLine(
    line: string,
    personName: string
  ): RawPlayData | null {
    // Remove bullet and clean
    let cleaned = line.replace(/^\*\s*/, "").trim()

    // Skip lines that are just metadata or don't look like play entries
    if (cleaned.length < 3) return null

    // Extract year - either at start "2019 :" or at end "(2019)"
    let year: number | undefined

    // Pattern: "2019 : Title"
    const yearPrefixMatch = cleaned.match(/^(\d{4})\s*:\s*/)
    if (yearPrefixMatch) {
      year = parseInt(yearPrefixMatch[1], 10)
      cleaned = cleaned.replace(yearPrefixMatch[0], "")
    }

    // Pattern: "Title (2019)"
    const yearSuffixMatch = cleaned.match(/\((\d{4})\)/)
    if (yearSuffixMatch && !year) {
      year = parseInt(yearSuffixMatch[1], 10)
      cleaned = cleaned.replace(yearSuffixMatch[0], "")
    }

    // Extract title - look for ''Title'' or [[Title]]
    let title: string | undefined

    // Wiki link: [[Actual Title|Display Title]] or [[Title]]
    const linkMatch = cleaned.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/)
    if (linkMatch) {
      title = linkMatch[2] || linkMatch[1]
      title = title.replace(/\s*\(pièce de théâtre\)/i, "").trim()
    }

    // Italic: ''Title''
    if (!title) {
      const italicMatch = cleaned.match(/''([^']+)''/)
      if (italicMatch) {
        title = italicMatch[1].trim()
      }
    }

    // If no title found from wiki markup, try to use the remaining text
    // but only if it looks like a title (not just punctuation or metadata)
    if (!title) {
      // Clean remaining text
      const remaining = this.cleanWikitext(cleaned).trim()
      // Must have at least 2 chars and not be just a year or number
      if (
        remaining.length >= 2 &&
        !/^\d+$/.test(remaining) &&
        !/^[\s\-:,]+$/.test(remaining)
      ) {
        title = remaining
      }
    }

    // Validate title
    if (!title || title.length < 2 || title.length > 200) return null

    // Skip if title is just a year
    if (/^\d{4}$/.test(title)) return null

    // Skip if title looks like a person's name (likely a collaborator mention)
    // This is heuristic - names often have first+last pattern
    if (/^[A-Z][a-zéèêëàâäôöùûü]+\s+[A-Z][a-zéèêëàâäôöùûü]+$/.test(title)) {
      // Could be a name, skip unless it's clearly a play title
      // Names like "Ali Douagi" should be skipped
      return null
    }

    // Clean title
    title = this.cleanWikitext(title)

    // Final validation - skip common false positives
    const skipPatterns = [
      /^censur/i, // "censurée"
      /^\d+$/, // Just numbers
      /^La Presse/i, // Newspaper mentions
    ]

    for (const pattern of skipPatterns) {
      if (pattern.test(title)) return null
    }

    return {
      title,
      year,
      directors: [personName],
      sourceUrl: `${BASE_URL}/wiki/${encodeURIComponent(personName)}`,
      rawData: {
        extractedFrom: "biography",
        personName,
      },
    }
  }
}
