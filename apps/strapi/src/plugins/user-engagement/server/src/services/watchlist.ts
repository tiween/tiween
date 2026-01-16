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
   * Get user's watchlist
   */
  async getUserWatchlist(userId: string) {
    return strapi.documents(WATCHLIST_UID).findMany({
      filters: { user: { documentId: userId } } as any,
      populate: ["creativeWork"],
      sort: { addedAt: "desc" },
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
