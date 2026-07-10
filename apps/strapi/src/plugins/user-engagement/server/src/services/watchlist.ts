import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "user-engagement"
const WATCHLIST_UID = `plugin::${PLUGIN_ID}.user-watchlist`

const watchlistService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Add a creative work to user's watchlist
   */
  async add(userId: string, creativeWorkId: string) {
    // Check if already in watchlist
    const existing = await strapi.documents(WATCHLIST_UID).findMany({
      filters: {
        user: { documentId: userId },
        creativeWork: { documentId: creativeWorkId },
      } as any,
    })

    if (existing.length > 0) {
      return existing[0]
    }

    return strapi.documents(WATCHLIST_UID).create({
      data: {
        user: userId,
        creativeWork: creativeWorkId,
        addedAt: new Date().toISOString(),
        notifyChanges: true,
      } as any,
    })
  },

  /**
   * Remove from watchlist
   */
  async remove(userId: string, creativeWorkId: string) {
    const items = await strapi.documents(WATCHLIST_UID).findMany({
      filters: {
        user: { documentId: userId },
        creativeWork: { documentId: creativeWorkId },
      } as any,
    })

    if (items.length > 0) {
      await strapi.documents(WATCHLIST_UID).delete({
        documentId: items[0].documentId,
      })
      return true
    }

    return false
  },

  /**
   * Get user's watchlist, enriched with each saved creative-work's next/last
   * screening date + venue (Story 5.3).
   *
   * The enrichment is the first sanctioned `user-engagement -> events-manager`
   * cross-plugin edge: it reaches events-manager ONLY through the named
   * `public-api` facade (`strapi.plugin("events-manager").service("public-api")`)
   * — never a foreign-UID Document Service call from here. Wrapped in try/catch
   * so an events-manager fault degrades gracefully: the list still returns
   * (rows with all-null enrichment) instead of a 500.
   */
  async getUserWatchlist(userId: string) {
    const rows = await strapi.documents(WATCHLIST_UID).findMany({
      filters: { user: { documentId: userId } } as any,
      populate: ["creativeWork"],
      sort: { addedAt: "desc" },
    })

    const ids = rows
      .map((row: any) => row.creativeWork?.documentId)
      .filter(Boolean) as string[]

    let enrichment: Record<
      string,
      {
        nextScreeningDate: string | null
        lastScreeningDate: string | null
        venueName: string | null
      }
    > = {}

    if (ids.length > 0) {
      try {
        enrichment = await strapi
          .plugin("events-manager")
          .service("public-api")
          .findScreeningInfoByMovies(ids, new Date().toISOString())
      } catch (error) {
        strapi.log.error(
          `[user-engagement] watchlist enrichment failed: ${error}`
        )
        enrichment = {}
      }
    }

    return rows.map((row: any) => {
      const info = enrichment[row.creativeWork?.documentId] ?? {}
      return {
        ...row,
        nextScreeningDate: info.nextScreeningDate ?? null,
        lastScreeningDate: info.lastScreeningDate ?? null,
        venueName: info.venueName ?? null,
      }
    })
  },

  /**
   * Check if item is in watchlist
   */
  async isInWatchlist(userId: string, creativeWorkId: string) {
    const items = await strapi.documents(WATCHLIST_UID).findMany({
      filters: {
        user: { documentId: userId },
        creativeWork: { documentId: creativeWorkId },
      } as any,
    })

    return items.length > 0
  },

  /**
   * Toggle watchlist item
   */
  async toggle(userId: string, creativeWorkId: string) {
    const isIn = await this.isInWatchlist(userId, creativeWorkId)

    if (isIn) {
      await this.remove(userId, creativeWorkId)
      return { added: false }
    } else {
      await this.add(userId, creativeWorkId)
      return { added: true }
    }
  },
})

export default watchlistService
