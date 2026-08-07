import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "venues"

/**
 * Public API facade — the ONLY sanctioned cross-plugin entry point for the
 * venues plugin (architecture amendment D8, rules R3/R4). Other plugins call
 * `strapi.plugin("venues").service("public-api")`; internal services
 * (`venue`, `seed`) are private by convention.
 */
/**
 * The tenant identity another plugin may resolve for an authenticated venue
 * manager: enough to scope a write to the caller's own venue and to gate
 * publication on the approval status — nothing more.
 */
export interface ManagedVenueRef {
  documentId: string
  status?: string
  name?: string
}

const publicApiService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find a single venue by documentId. Typed passthrough to the internal
   * venue service.
   */
  async findVenue(documentId: string, locale?: string) {
    return strapi
      .plugin(PLUGIN_ID)
      .service("venue")
      .findVenue(documentId, locale)
  },

  /**
   * Resolve the venue MANAGED BY `userId`, or `null` (Story 7.3).
   *
   * The sanctioned way for events-manager to derive the tenant from the
   * caller: the venue is LOOKED UP by `manager: { id: userId }` (the same
   * lookup-not-check shape as `venue-profile.findVenueDraftForManager`), so no
   * venue id taken from a request ever selects the row. The DRAFT row is read
   * because it always exists and carries the `status` enum the publish gate
   * needs.
   */
  async findVenueForManager(
    userId: number | string
  ): Promise<ManagedVenueRef | null> {
    const row = (await strapi
      .plugin(PLUGIN_ID)
      .service("venue-profile")
      .findVenueDraftForManager({ id: userId })) as {
      documentId?: string
      status?: string
      name?: string
    } | null

    if (!row || typeof row.documentId !== "string") return null

    return {
      documentId: row.documentId,
      ...(typeof row.status === "string" ? { status: row.status } : {}),
      ...(typeof row.name === "string" ? { name: row.name } : {}),
    }
  },
})

export default publicApiService
