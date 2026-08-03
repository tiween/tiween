/**
 * Amenity catalog read (Story 7.2).
 *
 * The venue-profile form renders one control per property definition, grouped
 * by category and typed by the definition's `type`. That vocabulary is seeded
 * by `services/seed.ts` (`PROPERTY_CATEGORIES` / `PROPERTY_DEFINITIONS`) and is
 * otherwise only reachable through the admin panel, so the manager surface
 * needs its own read.
 *
 * Both content types have `draftAndPublish: false`, so there is no publication
 * state to gate on — unlike the venue reads, an omitted `status` here is not a
 * leak. They ARE localized, hence the optional `locale`.
 *
 * The projection is a whitelist: no numeric ids, and nothing beyond what the
 * editor renders.
 */
import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "venues"
const PROPERTY_CATEGORY_UID = `plugin::${PLUGIN_ID}.property-category` as const

/** Upper bound on the catalog read — the seeded vocabulary is ~7 categories. */
const MAX_CATEGORIES = 200

/** One amenity the manager can set on their venue. */
export interface PropertyDefinitionEntry {
  documentId: string
  name?: string
  slug?: string
  /** `boolean` | `integer` | `string` | `enum` — decides the rendered control. */
  type?: string
  description?: string
  icon?: string
  enumOptions?: unknown
  sortOrder: number
}

/** A group of amenities, as rendered by the editor. */
export interface PropertyCategoryEntry {
  documentId: string
  name?: string
  slug?: string
  icon?: string
  sortOrder: number
  /** Parent category SLUG (not an id), or `null` for a top-level group. */
  parent: string | null
  definitions: PropertyDefinitionEntry[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function sortOrderOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function toDefinition(value: unknown): PropertyDefinitionEntry | null {
  const row = asRecord(value)
  if (!row) return null

  const documentId = optionalString(row.documentId)
  if (documentId === undefined) return null

  return {
    documentId,
    ...(optionalString(row.name) !== undefined
      ? { name: row.name as string }
      : {}),
    ...(optionalString(row.slug) !== undefined
      ? { slug: row.slug as string }
      : {}),
    ...(optionalString(row.type) !== undefined
      ? { type: row.type as string }
      : {}),
    ...(optionalString(row.description) !== undefined
      ? { description: row.description as string }
      : {}),
    ...(optionalString(row.icon) !== undefined
      ? { icon: row.icon as string }
      : {}),
    ...(row.enumOptions !== undefined && row.enumOptions !== null
      ? { enumOptions: row.enumOptions }
      : {}),
    sortOrder: sortOrderOf(row.sortOrder),
  }
}

function toCategory(value: unknown): PropertyCategoryEntry | null {
  const row = asRecord(value)
  if (!row) return null

  const documentId = optionalString(row.documentId)
  if (documentId === undefined) return null

  const parent = asRecord(row.parent)

  const definitions = (Array.isArray(row.properties) ? row.properties : [])
    .map(toDefinition)
    .filter((d): d is PropertyDefinitionEntry => d !== null)
    // Definitions carry their own `sortOrder` within a category; the relation
    // read gives no ordering guarantee, so sort here rather than trusting it.
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return {
    documentId,
    ...(optionalString(row.name) !== undefined
      ? { name: row.name as string }
      : {}),
    ...(optionalString(row.slug) !== undefined
      ? { slug: row.slug as string }
      : {}),
    ...(optionalString(row.icon) !== undefined
      ? { icon: row.icon as string }
      : {}),
    sortOrder: sortOrderOf(row.sortOrder),
    parent: parent ? optionalString(parent.slug) ?? null : null,
    definitions,
  }
}

const propertyCatalogService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Every amenity category with its definitions, `sortOrder`-ascending.
   * Categories with no definitions are dropped — the editor has nothing to
   * render for them, and the seeded parents ("Facilities") only exist to group
   * their children.
   */
  async listPropertyCatalog(locale?: string): Promise<PropertyCategoryEntry[]> {
    const rows = await strapi.documents(PROPERTY_CATEGORY_UID).findMany({
      locale,
      sort: [{ sortOrder: "asc" }, { name: "asc" }],
      limit: MAX_CATEGORIES,
      populate: { properties: true, parent: true },
    } as never)

    return (Array.isArray(rows) ? rows : [])
      .map(toCategory)
      .filter((c): c is PropertyCategoryEntry => c !== null)
      .filter((c) => c.definitions.length > 0)
  },
})

export default propertyCatalogService
